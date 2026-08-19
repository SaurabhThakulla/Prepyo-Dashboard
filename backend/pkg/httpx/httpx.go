// Package httpx holds the request/response conventions every handler follows.
//
// Success:  {"success": true,  ...payload}
// Failure:  {"success": false, "error": {"code": "not_found", "message": "..."}}
//
// The code is a stable string the frontend can branch on. The message is for
// humans and may change wording at any time. Provider or database errors are
// never passed through to the client.
package httpx

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
)

// Error codes. Add to this list rather than inventing codes at a call site.
const (
	CodeBadRequest     = "bad_request"
	CodeValidation     = "validation_failed"
	CodeUnauthorized   = "unauthorized"
	CodeForbidden      = "forbidden"
	CodeNotFound       = "not_found"
	CodeConflict       = "conflict"
	CodeLimitReached   = "limit_reached"
	CodeAIUnavailable  = "ai_unavailable"
	CodeInternal       = "internal_error"
	CodeTooManyRequest = "too_many_requests"
)

// maxBodyBytes caps request bodies. Speaking uploads go to object storage
// through their own path, so no JSON body needs to be larger than this.
const maxBodyBytes = 1 << 20 // 1 MiB

type errorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// JSON writes a success response. Payload keys are merged with "success": true.
func JSON(w http.ResponseWriter, status int, payload map[string]any) {
	body := make(map[string]any, len(payload)+1)
	body["success"] = true
	for k, v := range payload {
		body[k] = v
	}
	write(w, status, body)
}

// Error writes a failure response.
func Error(w http.ResponseWriter, status int, code, message string) {
	write(w, status, map[string]any{
		"success": false,
		"error":   errorBody{Code: code, Message: message},
	})
}

// ValidationError reports which fields were rejected and why.
func ValidationError(w http.ResponseWriter, fields map[string]string) {
	write(w, http.StatusUnprocessableEntity, map[string]any{
		"success": false,
		"error": errorBody{
			Code:    CodeValidation,
			Message: "Some fields need attention.",
			Fields:  fields,
		},
	})
}

// Internal logs the real cause and returns a generic message. Use it for
// anything the caller cannot act on: database failures, encoding bugs, and so
// on. The client never sees the underlying error text.
func Internal(w http.ResponseWriter, log *slog.Logger, op string, err error) {
	log.Error("request failed", "op", op, "error", err)
	Error(w, http.StatusInternalServerError, CodeInternal, "Something went wrong on our side. Please try again.")
}

// Decode reads a JSON body into dst. It rejects unknown fields so a typo in a
// client payload fails loudly instead of being silently ignored.
func Decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		Error(w, http.StatusBadRequest, CodeBadRequest, decodeMessage(err))
		return false
	}
	// A second value in the body means the client sent something we did not
	// expect; treat it as malformed rather than reading only the first.
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		Error(w, http.StatusBadRequest, CodeBadRequest, "Request body must contain a single JSON object.")
		return false
	}
	return true
}

func decodeMessage(err error) string {
	var syntaxErr *json.SyntaxError
	var typeErr *json.UnmarshalTypeError
	var maxBytesErr *http.MaxBytesError

	switch {
	case errors.As(err, &syntaxErr):
		return fmt.Sprintf("Request body contains malformed JSON at position %d.", syntaxErr.Offset)
	case errors.As(err, &typeErr):
		return fmt.Sprintf("Field %q has the wrong type.", typeErr.Field)
	case errors.As(err, &maxBytesErr):
		return "Request body is too large."
	case errors.Is(err, io.EOF):
		return "Request body is empty."
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		field := strings.TrimPrefix(err.Error(), "json: unknown field ")
		return fmt.Sprintf("Unexpected field %s.", field)
	default:
		return "Request body could not be read."
	}
}

func write(w http.ResponseWriter, status int, body map[string]any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	// The status line is already sent, so a failure here can only be logged by
	// the caller's middleware. Encoding a map of plain values does not fail in
	// practice.
	_ = json.NewEncoder(w).Encode(body)
}
