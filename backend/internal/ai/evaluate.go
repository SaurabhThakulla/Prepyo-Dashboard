package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/prepyo/backend/internal/models"
)

// WritingPromptVersion is stamped on every stored evaluation. Change it
// whenever the prompt below changes, so old feedback stays traceable to the
// wording that produced it.
const WritingPromptVersion = "writing.v1"

// EvaluationVersion is the shape of the JSON contract, stored alongside each
// result so a later reader knows how to interpret it.
const EvaluationVersion = "v1"

type WritingRequest struct {
	Exam        models.ExamType
	TaskName    string
	Prompt      string
	LearnerText string
	// MinScore and MaxScore come from the exam version, so PTE is validated
	// against 10-90 and IELTS against 0-9.
	MinScore float64
	MaxScore float64
}

// evaluationPayload mirrors the JSON the model is told to return. It is
// deliberately separate from models.Evaluation: the model fills this, and only
// validated fields are copied across.
type evaluationPayload struct {
	Summary        string   `json:"summary"`
	Strengths      []string `json:"strengths"`
	Weaknesses     []string `json:"weaknesses"`
	EstimatedScore struct {
		Value      *float64 `json:"value"`
		Confidence string   `json:"confidence"`
	} `json:"estimatedScore"`
	Criteria []struct {
		Name     string  `json:"name"`
		Score    float64 `json:"score"`
		MaxScore float64 `json:"maxScore"`
		Feedback string  `json:"feedback"`
	} `json:"criteria"`
	SentenceFeedback []struct {
		Original    string `json:"original"`
		Correction  string `json:"correction"`
		IssueType   string `json:"issueType"`
		Explanation string `json:"explanation"`
	} `json:"sentenceFeedback"`
}

// EvaluateWriting returns qualitative feedback and an estimated score.
//
// The estimate is a practice estimate. Neither this package nor its callers
// present it as an official Pearson or IELTS result.
func (g *Gateway) EvaluateWriting(ctx context.Context, req WritingRequest) (models.Evaluation, Usage, error) {
	messages := []chatMessage{
		{Role: "system", Content: writingSystemPrompt(req)},
		{Role: "user", Content: writingUserPrompt(req)},
	}

	raw, usage, err := g.complete(ctx, g.models.Writing, WritingPromptVersion, messages, true)
	if err != nil {
		return models.Evaluation{}, Usage{}, err
	}

	var payload evaluationPayload
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		g.log.Error("ai returned unparseable json", "model", g.models.Writing, "error", err)
		return models.Evaluation{}, usage, ErrBadOutput
	}

	evaluation, err := validateWriting(payload, req)
	if err != nil {
		g.log.Error("ai output failed validation", "model", g.models.Writing, "error", err)
		return models.Evaluation{}, usage, ErrBadOutput
	}
	return evaluation, usage, nil
}

// validateWriting checks the model's reply before any of it is stored.
//
// Anything out of range is rejected outright rather than clamped: a score the
// model could not produce correctly is not one to guess at.
func validateWriting(p evaluationPayload, req WritingRequest) (models.Evaluation, error) {
	if strings.TrimSpace(p.Summary) == "" {
		return models.Evaluation{}, fmt.Errorf("summary is empty")
	}

	confidence := strings.ToLower(strings.TrimSpace(p.EstimatedScore.Confidence))
	switch confidence {
	case "low", "medium", "high":
	case "":
		confidence = "low"
	default:
		return models.Evaluation{}, fmt.Errorf("unknown confidence %q", p.EstimatedScore.Confidence)
	}

	score := p.EstimatedScore.Value
	if score != nil {
		if *score < req.MinScore || *score > req.MaxScore {
			return models.Evaluation{}, fmt.Errorf("score %.2f outside %.1f-%.1f", *score, req.MinScore, req.MaxScore)
		}
	}

	criteria := make([]models.EvaluationCriterion, 0, len(p.Criteria))
	for _, c := range p.Criteria {
		if strings.TrimSpace(c.Name) == "" || c.MaxScore <= 0 {
			continue
		}
		if c.Score < 0 || c.Score > c.MaxScore {
			return models.Evaluation{}, fmt.Errorf("criterion %q scored %.2f of %.2f", c.Name, c.Score, c.MaxScore)
		}
		criteria = append(criteria, models.EvaluationCriterion{
			Name:     c.Name,
			Score:    c.Score,
			MaxScore: c.MaxScore,
			Feedback: c.Feedback,
		})
	}

	// Sentence feedback must quote text the learner actually wrote. Dropping
	// unmatched entries stops the model from "correcting" invented sentences,
	// which is confusing and makes the whole report look untrustworthy.
	haystack := normaliseSpace(req.LearnerText)
	sentences := make([]models.SentenceFeedback, 0, len(p.SentenceFeedback))
	for _, s := range p.SentenceFeedback {
		quoted := normaliseSpace(s.Original)
		if quoted == "" || !strings.Contains(haystack, quoted) {
			continue
		}
		sentences = append(sentences, models.SentenceFeedback{
			Original:    s.Original,
			Correction:  s.Correction,
			IssueType:   s.IssueType,
			Explanation: s.Explanation,
		})
	}

	return models.Evaluation{
		Exam:              req.Exam,
		Skill:             models.SkillWriting,
		EvaluationVersion: EvaluationVersion,
		EstimatedScore:    score,
		ScoreConfidence:   confidence,
		Summary:           strings.TrimSpace(p.Summary),
		Criteria:          criteria,
		Strengths:         trimAll(p.Strengths),
		Weaknesses:        trimAll(p.Weaknesses),
		SentenceFeedback:  sentences,
	}, nil
}

func writingSystemPrompt(req WritingRequest) string {
	var b strings.Builder
	b.WriteString("You are an experienced ")
	b.WriteString(string(req.Exam))
	b.WriteString(" writing examiner giving practice feedback to a learner in Nepal.\n\n")
	b.WriteString("Rules:\n")
	b.WriteString("- Judge only the text the learner wrote. Never quote or invent a sentence they did not write.\n")
	b.WriteString("- Every entry in sentenceFeedback must copy an exact sentence from the learner's text into `original`.\n")
	b.WriteString("- If the response is too short or off-topic to judge, set estimatedScore.value to null and say so in the summary.\n")
	b.WriteString(fmt.Sprintf("- estimatedScore.value must be on the %s scale, between %.1f and %.1f.\n",
		req.Exam, req.MinScore, req.MaxScore))
	b.WriteString("- Set estimatedScore.confidence to low, medium or high based on how much evidence the response gives you.\n")
	b.WriteString("- Use the published assessment criteria for this exam. Do not invent weightings.\n\n")
	b.WriteString(`Reply with JSON only, in this shape:
{
  "summary": "two or three sentences",
  "estimatedScore": {"value": 7.0, "confidence": "medium"},
  "criteria": [{"name": "...", "score": 7.0, "maxScore": 9.0, "feedback": "..."}],
  "strengths": ["..."],
  "weaknesses": ["..."],
  "sentenceFeedback": [{"original": "...", "correction": "...", "issueType": "grammar", "explanation": "..."}]
}`)
	return b.String()
}

func writingUserPrompt(req WritingRequest) string {
	return fmt.Sprintf("Task: %s\n\nPrompt:\n%s\n\nLearner's response:\n%s",
		req.TaskName, req.Prompt, req.LearnerText)
}

// normaliseSpace collapses runs of whitespace so a quote that differs only in
// line breaks still matches the learner's text.
func normaliseSpace(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

func trimAll(items []string) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
