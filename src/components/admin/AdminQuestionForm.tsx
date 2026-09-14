import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Upload, UploadCloud, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useApp } from '@/context/AppContext';
import { api, errorMessage } from '@/lib/api';
import { ExamType, SkillType } from '@/lib/types';
import { AuthoredQuestionDetail, QuestionTypeSpec, useQuestionTypes } from '@/lib/hooks/useAdminQuestions';

interface BlankDraft {
  answer: string;
  choices: string;
}

const SELECT = 'h-9 w-full rounded-xl border border-input bg-card px-3 text-xs';
const MAX_OPTIONS = 10;

const splitList = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

export default function AdminQuestionForm({
  skill,
  questionId,
  onSaved,
  onCancel,
}: {
  skill: SkillType;
  questionId?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const { activeExam } = useApp();
  const { types, error: typesError } = useQuestionTypes();

  const [exam, setExam] = useState<ExamType>(activeExam);
  const [typeId, setTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [contextPassage, setContextPassage] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [figureData, setFigureData] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correct, setCorrect] = useState<number[]>([]);
  const [blanks, setBlanks] = useState<BlankDraft[]>([{ answer: '', choices: '' }]);
  const [modelAnswer, setModelAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [prepSeconds, setPrepSeconds] = useState(0);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(0);
  const [points, setPoints] = useState(0);
  const [tags, setTags] = useState('');
  const [publish, setPublish] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Please choose an image under 5 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please select an image file (PNG, JPG, WebP, SVG, GIF).');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/admin/questions/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
        toast.success('Diagram image uploaded', 'Image uploaded successfully from your device.');
        return;
      }
      throw new Error('Upload failed');
    } catch {
      // Fallback to client-side data URL
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
        toast.success('Diagram image loaded', 'Image loaded from your device.');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(questionId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const available = useMemo(
    () => types.filter(type => type.skill === skill && type.exam === exam),
    [types, skill, exam],
  );
  const spec = available.find(type => type.typeId === typeId);
  const isChoice = spec?.answer === 'single' || spec?.answer === 'multiple';

  const applyType = (next: QuestionTypeSpec | undefined) => {
    setTypeId(next?.typeId ?? '');
    setPrompt(next?.prompt ?? '');
    setPrepSeconds(next?.prepSeconds ?? 0);
    setTimeLimitSeconds(next?.timeLimitSeconds ?? 0);
    setPoints(next?.points ?? 0);
    setCorrect([]);
    setFieldErrors({});
  };

  useEffect(() => {
    if (!questionId) return;

    let cancelled = false;
    setLoading(true);
    api
      .get<{ question: AuthoredQuestionDetail }>(`/admin/questions/${questionId}`)
      .then(({ question }) => {
        if (cancelled) return;
        setExam(question.exam);
        setTypeId(question.typeId);
        setTitle(question.title);
        setPrompt(question.prompt);
        setContextPassage(question.contextPassage);
        setAudioTranscript(question.audioTranscript);
        setAudioUrl(question.audioUrl);
        setImageUrl(question.imageUrl);
        setFigureData(question.figureData);
        if (question.options.length > 0) setOptions(question.options);
        setCorrect(
          question.correctAnswers
            .map(answer => question.options.indexOf(answer))
            .filter(index => index >= 0)
            .sort((a, b) => a - b),
        );
        if (question.blanks.length > 0) {
          setBlanks(
            question.blanks.map(blank => ({
              answer: blank.correctAnswer,
              choices: (blank.options ?? []).join(', '),
            })),
          );
        }
        setModelAnswer(question.modelAnswer);
        setExplanation(question.explanation);
        setDifficulty(question.difficulty);
        setPrepSeconds(question.prepTimeSeconds);
        setTimeLimitSeconds(question.timeLimitSeconds);
        setPoints(question.points);
        setTags(question.tags.join(', '));
        setPublish(question.isPublished);
        setLoadError(null);
      })
      .catch(err => {
        if (!cancelled) setLoadError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [questionId]);

  useEffect(() => {
    if (loading || available.length === 0) return;
    if (!spec) applyType(available[0]);
  }, [available, loading]);

  const setOption = (index: number, value: string) =>
    setOptions(current => current.map((option, i) => (i === index ? value : option)));

  const removeOption = (index: number) => {
    setOptions(current => current.filter((_, i) => i !== index));
    setCorrect(current => current.filter(i => i !== index).map(i => (i > index ? i - 1 : i)));
  };

  const toggleCorrect = (index: number) =>
    setCorrect(current => {
      if (spec?.answer !== 'multiple') return [index];
      return current.includes(index) ? current.filter(i => i !== index) : [...current, index].sort((a, b) => a - b);
    });

  const setBlank = (index: number, patch: Partial<BlankDraft>) =>
    setBlanks(current => current.map((blank, i) => (i === index ? { ...blank, ...patch } : blank)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!spec || saving || loading) return;

    setSaving(true);
    setFieldErrors({});
    try {
      const body = {
        exam,
        typeId: spec.typeId,
        title,
        prompt,
        contextPassage,
        audioTranscript,
        audioUrl,
        imageUrl,
        figureData,
        options: isChoice ? options : [],
        correctAnswers: isChoice ? correct.map(index => options[index]) : [],
        blanks:
          spec.answer === 'blanks'
            ? blanks.map(blank => ({ correctAnswer: blank.answer, options: splitList(blank.choices) }))
            : [],
        modelAnswer,
        explanation,
        difficulty,
        prepTimeSeconds: prepSeconds,
        timeLimitSeconds,
        points,
        tags: splitList(tags),
        publish,
      };
      if (questionId) {
        await api.put(`/admin/questions/${questionId}`, body);
      } else {
        await api.post('/admin/questions', body);
      }
      toast.success(
        questionId ? 'Question updated' : publish ? 'Question published' : 'Question saved as a draft',
        `${spec.typeName} · ${exam}`,
      );
      onSaved();
    } catch (err) {
      const fields = (err as { body?: { error?: { fields?: Record<string, string> } } })?.body?.error?.fields;
      if (fields) setFieldErrors(fields);
      toast.error(questionId ? 'Could not update the question' : 'Could not save the question', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 pb-16">
      <div className="border-b border-border pb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {questionId ? `Edit ${skill} question` : `New ${skill} question`}
          </h1>
          <CardDescription className="text-xs">
            Learners only see it once it is published.
          </CardDescription>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="font-bold text-xs h-8">
          Back to bank
        </Button>
      </div>

      {typesError && (
        <Card className="p-4 text-xs text-rose-600">Could not load the task types: {typesError}</Card>
      )}

      {loadError && (
        <Card className="p-4 text-xs text-rose-600">Could not load the question: {loadError}</Card>
      )}

      {loading ? (
        <Card className="p-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading the question…
        </Card>
      ) : (
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Exam" error={fieldErrors.exam}>
            <select value={exam} onChange={e => setExam(e.target.value as ExamType)} className={SELECT}>
              <option value="IELTS">IELTS</option>
              <option value="PTE">PTE</option>
            </select>
          </Field>
          <Field label="Task type" error={fieldErrors.typeId} className="lg:col-span-2">
            <select
              value={typeId}
              onChange={e => applyType(available.find(type => type.typeId === e.target.value))}
              className={SELECT}
            >
              {available.map(type => (
                <option key={type.typeId} value={type.typeId}>
                  {type.typeName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Difficulty" error={fieldErrors.difficulty}>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={SELECT}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
        </div>

        <Field label="Title" error={fieldErrors.title}>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="University tuition fees" />
        </Field>

        <Field label="Instructions the learner sees" error={fieldErrors.prompt}>
          <Textarea rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} className="text-xs" />
        </Field>

        {spec?.passage && (
          <Field
            label={skill === 'speaking' ? 'Text the learner reads aloud' : 'Passage the learner summarises'}
            optional={spec.passage === 'optional'}
            error={fieldErrors.contextPassage}
          >
            <Textarea
              rows={6}
              value={contextPassage}
              onChange={e => setContextPassage(e.target.value)}
              className="text-xs"
            />
          </Field>
        )}

        {spec?.audio && (
          <div className="space-y-3">
            <Field
              label={spec.answer === 'dictation' ? 'Sentence the learner hears (this is also the answer)' : 'Audio script'}
              optional={spec.audio === 'optional'}
              error={fieldErrors.audioTranscript}
            >
              <Textarea
                rows={spec.answer === 'dictation' ? 2 : 5}
                value={audioTranscript}
                onChange={e => setAudioTranscript(e.target.value)}
                className="text-xs"
              />
            </Field>
            <Field label="Recording URL" optional error={fieldErrors.audioUrl}>
              <Input
                value={audioUrl}
                onChange={e => setAudioUrl(e.target.value)}
                placeholder="https://…/recording.mp3"
              />
            </Field>
            <p className="-mt-1 text-[11px] text-muted-foreground">
              Without a recording, the learner&apos;s browser reads the script aloud.
            </p>
          </div>
        )}

        {spec?.image && (
          <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>Diagram / Question Image</span>
                {spec.image === 'optional' && <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>}
              </span>
              {imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageUrl('')}
                  className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>

            {fieldErrors.imageUrl && <p className="text-[11px] text-rose-600">{fieldErrors.imageUrl}</p>}

            {/* Hidden native file input for computer browsing */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
              }}
            />

            {imageUrl ? (
              <div className="space-y-3">
                <div className="relative mx-auto max-w-lg overflow-hidden rounded-xl border border-border bg-muted/20 p-2 sm:p-3 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Diagram preview"
                    className="max-h-64 max-w-full rounded-lg object-contain shadow-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <span className="text-[11px] font-mono text-muted-foreground truncate max-w-xs">
                    {imageUrl.startsWith('data:') ? 'Embedded image (data URL)' : imageUrl}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs font-bold gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Change image from device</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImageFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border/80 hover:border-primary/50 hover:bg-muted/40 bg-muted/10'
                }`}
              >
                {uploadingImage ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs font-bold text-foreground">Uploading diagram image from computer…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Click to upload diagram image from your computer
                      </p>
                      <p className="text-[11px] text-muted-foreground">or drag and drop here</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                      PNG, JPG, WebP, SVG, or GIF (max 5 MB)
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible toggle for manual URL */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowUrlInput(prev => !prev)}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                {showUrlInput ? 'Hide image URL input' : 'Or enter an image URL directly'}
              </button>
              {showUrlInput && (
                <div className="pt-2">
                  <Input
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://…/diagram.png"
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {spec?.figure && (
          <Field
            label="What the figure shows, for the evaluator"
            optional={spec.figure === 'optional'}
            error={fieldErrors.figureData}
          >
            <Textarea
              rows={4}
              value={figureData}
              onChange={e => setFigureData(e.target.value)}
              placeholder="Write out the figure's data, e.g. each line's value by year. Learners never see this."
              className="text-xs"
            />
          </Field>
        )}

        {isChoice && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-foreground">
              Options — mark {spec?.answer === 'multiple' ? 'every correct one' : 'the correct one'}
            </span>
            {fieldErrors.options && <p className="text-[11px] text-rose-600">{fieldErrors.options}</p>}
            {fieldErrors.correctAnswers && <p className="text-[11px] text-rose-600">{fieldErrors.correctAnswers}</p>}
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type={spec?.answer === 'multiple' ? 'checkbox' : 'radio'}
                  name="correct-option"
                  checked={correct.includes(index)}
                  onChange={() => toggleCorrect(index)}
                  aria-label={`Option ${String.fromCharCode(65 + index)} is correct`}
                  className="accent-primary h-4 w-4 shrink-0"
                />
                <span className="shrink-0 w-6 h-6 rounded-md bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20">
                  {String.fromCharCode(65 + index)}
                </span>
                <Input value={option} onChange={e => setOption(index, e.target.value)} />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-muted-foreground hover:text-rose-600"
                    aria-label={`Remove option ${String.fromCharCode(65 + index)}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {options.length < MAX_OPTIONS && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOptions(current => [...current, ''])}
                className="text-xs font-bold h-7"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add option
              </Button>
            )}
          </div>
        )}

        {spec?.answer === 'blanks' && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-foreground">Blanks and their answers</span>
            <p className="text-[11px] text-muted-foreground">
              Number the gaps in the instructions — (1), (2) … Blank 1 answers gap (1). Leave choices empty for a typed
              answer.
            </p>
            {fieldErrors.blanks && <p className="text-[11px] text-rose-600">{fieldErrors.blanks}</p>}
            {blanks.map((blank, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-bold text-primary w-14">Blank {index + 1}</span>
                <Input
                  value={blank.answer}
                  onChange={e => setBlank(index, { answer: e.target.value })}
                  placeholder="Answer"
                />
                <Input
                  value={blank.choices}
                  onChange={e => setBlank(index, { choices: e.target.value })}
                  placeholder="Choices, comma separated (optional)"
                />
                {blanks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setBlanks(current => current.filter((_, i) => i !== index))}
                    className="text-muted-foreground hover:text-rose-600"
                    aria-label={`Remove blank ${index + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBlanks(current => [...current, { answer: '', choices: '' }])}
              className="text-xs font-bold h-7"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add blank
            </Button>
          </div>
        )}

        {spec?.answer === 'rubric' && (
          <Field label="Model answer" optional>
            <Textarea rows={4} value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} className="text-xs" />
          </Field>
        )}

        <Field label="Explanation shown after answering" optional>
          <Input value={explanation} onChange={e => setExplanation(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {skill === 'speaking' && (
            <Field label="Preparation (seconds)" error={fieldErrors.prepTimeSeconds}>
              <Input
                type="number"
                min={0}
                value={prepSeconds}
                onChange={e => setPrepSeconds(Number(e.target.value))}
              />
            </Field>
          )}
          <Field label="Time limit (seconds)" error={fieldErrors.timeLimitSeconds}>
            <Input
              type="number"
              min={1}
              value={timeLimitSeconds}
              onChange={e => setTimeLimitSeconds(Number(e.target.value))}
            />
          </Field>
          <Field label="Points" error={fieldErrors.points}>
            <Input type="number" min={1} value={points} onChange={e => setPoints(Number(e.target.value))} />
          </Field>
          <Field label="Tags (comma separated)" optional>
            <Input value={tags} onChange={e => setTags(e.target.value)} />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={publish}
              onChange={e => setPublish(e.target.checked)}
              className="accent-primary h-3.5 w-3.5"
            />
            Publish now
          </label>
          <Button type="submit" disabled={saving || !spec} className="font-bold text-xs rounded-full h-9 px-5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
            {questionId ? 'Save changes' : 'Save question'}
          </Button>
        </div>
      </Card>
      )}
    </form>
  );
}

function Field({
  label,
  error,
  optional,
  className = '',
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-[11px] font-bold text-foreground">
        {label}
        {optional && <span className="font-medium text-muted-foreground"> (optional)</span>}
      </span>
      {children}
      {error && <span className="block text-[11px] text-rose-600">{error}</span>}
    </label>
  );
}
