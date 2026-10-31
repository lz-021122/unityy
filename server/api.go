package main

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type api struct {
	store          *Store
	allowedOrigins map[string]struct{}
}

type errorEnvelope struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields"`
}

func NewAPI(store *Store, allowedOrigins []string) http.Handler {
	origins := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origins[origin] = struct{}{}
	}
	service := &api{store: store, allowedOrigins: origins}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", service.handleHealth)
	mux.HandleFunc("GET /api/issues/export.csv", service.handleExportCSV)
	mux.HandleFunc("GET /api/issues", service.handleListIssues)
	mux.HandleFunc("POST /api/issues", service.handleCreateIssue)
	mux.HandleFunc("POST /api/issues/batch-status", service.handleBatchStatus)
	mux.HandleFunc("POST /api/issues/batch-delete", service.handleBatchDelete)
	mux.HandleFunc("GET /api/issues/{id}", service.handleGetIssue)
	mux.HandleFunc("PATCH /api/issues/{id}/status", service.handleUpdateStatus)
	mux.HandleFunc("PATCH /api/issues/{id}", service.handleUpdateIssue)
	mux.HandleFunc("DELETE /api/issues/{id}", service.handleDeleteIssue)
	mux.HandleFunc("/", service.handleNotFound)

	return service.withCORS(mux)
}

func (a *api) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   a.store.now().UTC(),
	})
}

func (a *api) handleListIssues(w http.ResponseWriter, r *http.Request) {
	filter, err := parseFilter(r, true)
	if err != nil {
		writeRequestError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a.store.List(filter))
}

func (a *api) handleGetIssue(w http.ResponseWriter, r *http.Request) {
	issue, err := a.store.Get(r.PathValue("id"))
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, issue)
}

func (a *api) handleCreateIssue(w http.ResponseWriter, r *http.Request) {
	actor, err := actorFrom(r)
	if err != nil {
		writeRequestError(w, err)
		return
	}
	idempotencyKey, err := idempotencyKeyFrom(r)
	if err != nil {
		writeRequestError(w, err)
		return
	}
	var req CreateIssueRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeRequestError(w, validationRequestError("_request", err.Error()))
		return
	}
	issue, replayed, err := a.store.CreateIdempotent(
		req,
		actor,
		idempotencyKey,
	)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	if replayed {
		w.Header().Set("Idempotency-Replayed", "true")
	}
	writeJSON(w, http.StatusCreated, issue)
}

func (a *api) handleUpdateIssue(w http.ResponseWriter, r *http.Request) {
	actor, err := actorFrom(r)
	if err != nil {
		writeRequestError(w, err)
		return
	}
	var req UpdateIssueRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeRequestError(w, validationRequestError("_request", err.Error()))
		return
	}
	issue, err := a.store.Update(r.PathValue("id"), req, actor)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, issue)
}

func (a *api) handleUpdateStatus(w http.ResponseWriter, r *http.Request) {
	actor, err := actorFrom(r)
	if err != nil {
		writeRequestError(w, err)
		return
	}
	var req StatusRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeRequestError(w, validationRequestError("_request", err.Error()))
		return
	}
	issue, err := a.store.UpdateStatus(r.PathValue("id"), req.Status, actor)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, issue)
}

func (a *api) handleBatchStatus(w http.ResponseWriter, r *http.Request) {
	actor, err := actorFrom(r)
	if err != nil {
		writeRequestError(w, err)
		return
	}
	var req BatchStatusRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeRequestError(w, validationRequestError("_request", err.Error()))
		return
	}
	updated, err := a.store.BatchUpdateStatus(req.IDs, req.Status, actor)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"updated": updated})
}

func (a *api) handleDeleteIssue(w http.ResponseWriter, r *http.Request) {
	if err := a.store.Delete(r.PathValue("id")); err != nil {
		writeStoreError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *api) handleBatchDelete(w http.ResponseWriter, r *http.Request) {
	var req BatchDeleteRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeRequestError(w, validationRequestError("_request", err.Error()))
		return
	}
	deleted, err := a.store.BatchDelete(req.IDs)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"deleted": deleted})
}

func (a *api) handleExportCSV(w http.ResponseWriter, r *http.Request) {
	filter, err := parseFilter(r, false)
	if err != nil {
		writeRequestError(w, err)
		return
	}
	issues := a.store.FilterAll(filter)

	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	header := []string{
		"id", "title", "desc", "priority", "status", "scene",
		"posX", "posY", "posZ", "createdAt", "updatedAt", "screenshot",
		"reporter", "assignee", "deviceCode", "severityScore",
	}
	if err := writer.Write(header); err != nil {
		writeStoreError(w, err)
		return
	}
	for _, issue := range issues {
		row := []string{
			issue.ID,
			issue.Title,
			issue.Desc,
			string(issue.Priority),
			string(issue.Status),
			issue.Scene,
			strconv.FormatFloat(issue.Pos.X, 'f', -1, 64),
			strconv.FormatFloat(issue.Pos.Y, 'f', -1, 64),
			strconv.FormatFloat(issue.Pos.Z, 'f', -1, 64),
			issue.CreatedAt.UTC().Format(time.RFC3339),
			issue.UpdatedAt.UTC().Format(time.RFC3339),
			issue.Screenshot,
			issue.Reporter,
			issue.Assignee,
			issue.DeviceCode,
			strconv.Itoa(issue.SeverityScore),
		}
		if err := writer.Write(row); err != nil {
			writeStoreError(w, err)
			return
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		writeStoreError(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="unity-inspect-issues.csv"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(buffer.Bytes())
}

func parseFilter(r *http.Request, includePagination bool) (Filter, error) {
	query := r.URL.Query()
	fields := make(map[string]string)
	filter := Filter{
		Query:    strings.TrimSpace(query.Get("query")),
		Priority: Priority(strings.ToUpper(strings.TrimSpace(query.Get("priority")))),
		Status: IssueStatus(strings.ToUpper(strings.ReplaceAll(
			strings.TrimSpace(query.Get("status")), "-", "_",
		))),
		Scene:    strings.TrimSpace(query.Get("scene")),
		Page:     1,
		PageSize: 5,
	}
	if len([]rune(filter.Query)) > 500 {
		fields["query"] = "长度不能超过 500 个字符"
	}
	if filter.Priority != "" && !validPriority(filter.Priority) {
		fields["priority"] = "必须是 HIGH、MEDIUM 或 LOW"
	}
	if filter.Status != "" && !validStatus(filter.Status) {
		fields["status"] = "必须是 OPEN、IN_PROGRESS 或 RESOLVED"
	}
	if len([]rune(filter.Scene)) > 120 {
		fields["scene"] = "长度不能超过 120 个字符"
	}

	if includePagination {
		if rawPage := strings.TrimSpace(query.Get("page")); rawPage != "" {
			page, err := strconv.Atoi(rawPage)
			if err != nil || page < 1 {
				fields["page"] = "必须是大于等于 1 的整数"
			} else {
				filter.Page = page
			}
		}
		if rawPageSize := strings.TrimSpace(query.Get("pageSize")); rawPageSize != "" {
			pageSize, err := strconv.Atoi(rawPageSize)
			if err != nil || pageSize < 1 || pageSize > 100 {
				fields["pageSize"] = "必须是 1 到 100 之间的整数"
			} else {
				filter.PageSize = pageSize
			}
		}
	}

	var err error
	filter.CreatedFrom, err = parseDateBound(query.Get("createdFrom"), false)
	if err != nil {
		fields["createdFrom"] = err.Error()
	}
	filter.CreatedTo, err = parseDateBound(query.Get("createdTo"), true)
	if err != nil {
		fields["createdTo"] = err.Error()
	}
	if !filter.CreatedFrom.IsZero() && !filter.CreatedTo.IsZero() &&
		!filter.CreatedFrom.Before(filter.CreatedTo) {
		fields["createdRange"] = "createdFrom 必须早于 createdTo"
	}
	if len(fields) > 0 {
		return Filter{}, &ValidationError{Fields: fields}
	}
	return filter, nil
}

func parseDateBound(value string, endOfDay bool) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, nil
	}
	if date, err := time.Parse("2006-01-02", value); err == nil {
		if endOfDay {
			return date.AddDate(0, 0, 1), nil
		}
		return date, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, errors.New("必须是 YYYY-MM-DD 或 RFC 3339 时间")
	}
	return parsed.UTC(), nil
}

func actorFrom(r *http.Request) (string, error) {
	actor := strings.TrimSpace(r.Header.Get("X-Actor"))
	if actor == "" {
		return "operator", nil
	}
	if len([]rune(actor)) > 100 {
		return "", &ValidationError{Fields: map[string]string{
			"X-Actor": "长度不能超过 100 个字符",
		}}
	}
	return actor, nil
}

func idempotencyKeyFrom(r *http.Request) (string, error) {
	key := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if key == "" {
		return "", nil
	}
	if len([]rune(key)) > 128 {
		return "", &ValidationError{Fields: map[string]string{
			"Idempotency-Key": "长度不能超过 128 个字符",
		}}
	}
	for _, value := range key {
		isLetter := value >= 'a' && value <= 'z' ||
			value >= 'A' && value <= 'Z'
		isDigit := value >= '0' && value <= '9'
		isSeparator := value == '-' || value == '_' ||
			value == '.' || value == ':'
		if !isLetter && !isDigit && !isSeparator {
			return "", &ValidationError{Fields: map[string]string{
				"Idempotency-Key": "只能包含字母、数字、连字符、下划线、句点或冒号",
			}}
		}
	}
	return key, nil
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("JSON 请求体无效: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("JSON 请求体只能包含一个对象")
	}
	return nil
}

func validationRequestError(field, message string) error {
	return &ValidationError{Fields: map[string]string{field: message}}
}

func writeRequestError(w http.ResponseWriter, err error) {
	var validation *ValidationError
	if errors.As(err, &validation) {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "请求字段不合法", validation.Fields)
		return
	}
	writeError(w, http.StatusBadRequest, "BAD_REQUEST", "请求不合法", nil)
}

func writeStoreError(w http.ResponseWriter, err error) {
	var validation *ValidationError
	switch {
	case errors.As(err, &validation):
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "请求字段不合法", validation.Fields)
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, "NOT_FOUND", "问题记录不存在", nil)
	case errors.Is(err, ErrIdempotencyConflict):
		writeError(
			w,
			http.StatusConflict,
			"IDEMPOTENCY_CONFLICT",
			"相同 Idempotency-Key 不能用于不同请求内容",
			nil,
		)
	default:
		log.Printf("request failed: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "服务端处理失败", nil)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string, fields map[string]string) {
	if fields == nil {
		fields = map[string]string{}
	}
	writeJSON(w, status, errorEnvelope{Error: apiError{
		Code: code, Message: message, Fields: fields,
	}})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write JSON response: %v", err)
	}
}

func (a *api) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		origin := strings.TrimSpace(r.Header.Get("Origin"))
		if origin != "" {
			if _, allowed := a.allowedOrigins[origin]; !allowed {
				writeError(w, http.StatusForbidden, "CORS_FORBIDDEN", "请求来源不在允许列表中", nil)
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set(
				"Access-Control-Allow-Headers",
				"Content-Type, X-Actor, Idempotency-Key",
			)
			w.Header().Set("Access-Control-Max-Age", "600")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *api) handleNotFound(w http.ResponseWriter, _ *http.Request) {
	writeError(w, http.StatusNotFound, "NOT_FOUND", "接口不存在", nil)
}
