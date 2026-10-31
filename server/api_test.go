package main

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"
)

func newTestAPI(t *testing.T, issues []Issue) (http.Handler, *Store) {
	t.Helper()
	store, _, _ := newTestStore(t, issues)
	return NewAPI(store, DefaultAllowedOrigins()), store
}

func TestHealthAndNotFound(t *testing.T) {
	handler, _ := newTestAPI(t, standardTestIssues()[:1])
	response := requestJSON(t, handler, http.MethodGet, "/api/health", nil, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("health status = %d, body = %s", response.Code, response.Body.String())
	}
	var health map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &health); err != nil {
		t.Fatal(err)
	}
	if health["status"] != "ok" {
		t.Fatalf("unexpected health response: %v", health)
	}

	missing := requestJSON(t, handler, http.MethodGet, "/api/issues/%23999", nil, nil)
	if missing.Code != http.StatusNotFound {
		t.Fatalf("missing issue status = %d", missing.Code)
	}
	envelope := decodeResponse[errorEnvelope](t, missing)
	if envelope.Error.Code != "NOT_FOUND" || envelope.Error.Fields == nil {
		t.Fatalf("unexpected error envelope: %+v", envelope)
	}
}

func TestAPIListFilterPaginationAndValidation(t *testing.T) {
	handler, _ := newTestAPI(t, standardTestIssues())

	response := requestJSON(t, handler, http.MethodGet,
		"/api/issues?priority=HIGH&page=1&pageSize=1", nil, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("list status = %d: %s", response.Code, response.Body.String())
	}
	result := decodeResponse[ListResult](t, response)
	if result.Total != 2 || len(result.Items) != 1 || result.Aggregates.High != 2 {
		t.Fatalf("unexpected API list result: %+v", result)
	}

	dateResponse := requestJSON(t, handler, http.MethodGet,
		"/api/issues?createdFrom=2026-10-29&createdTo=2026-10-31&pageSize=10", nil, nil)
	dateResult := decodeResponse[ListResult](t, dateResponse)
	if dateResult.Total != 3 {
		t.Fatalf("unexpected date filter total: %d", dateResult.Total)
	}

	for _, path := range []string{
		"/api/issues?priority=URGENT",
		"/api/issues?status=unknown",
		"/api/issues?page=0",
		"/api/issues?pageSize=101",
		"/api/issues?createdFrom=2026-10-31&createdTo=2026-10-30",
	} {
		invalid := requestJSON(t, handler, http.MethodGet, path, nil, nil)
		if invalid.Code != http.StatusBadRequest {
			t.Fatalf("%s status = %d, body = %s", path, invalid.Code, invalid.Body.String())
		}
	}
}

func TestAPICreateUpdateStatusDeleteAndAudit(t *testing.T) {
	handler, _ := newTestAPI(t, standardTestIssues()[:1])
	headers := map[string]string{"X-Actor": "api-tester"}

	response := requestJSON(t, handler, http.MethodPost, "/api/issues", CreateIssueRequest{
		Title: "API 新问题",
		Desc:  "通过 HTTP 创建",
		Scene: "配电室",
		Pos:   &Position{X: 1, Y: 2, Z: 3},
	}, headers)
	if response.Code != http.StatusCreated {
		t.Fatalf("create status = %d: %s", response.Code, response.Body.String())
	}
	created := decodeResponse[Issue](t, response)
	if created.ID != "#002" || created.AuditLogs[0].User != "api-tester" || created.CreatedAt.Location().String() != "UTC" {
		t.Fatalf("unexpected created issue: %+v", created)
	}

	detail := requestJSON(t, handler, http.MethodGet, "/api/issues/%23002", nil, nil)
	if detail.Code != http.StatusOK {
		t.Fatalf("detail status = %d", detail.Code)
	}

	title := "API 更新问题"
	update := requestJSON(t, handler, http.MethodPatch, "/api/issues/%23002",
		UpdateIssueRequest{Title: &title}, headers)
	if update.Code != http.StatusOK {
		t.Fatalf("update status = %d: %s", update.Code, update.Body.String())
	}
	updated := decodeResponse[Issue](t, update)
	if updated.Title != title || len(updated.AuditLogs) != 2 {
		t.Fatalf("unexpected update result: %+v", updated)
	}

	status := requestJSON(t, handler, http.MethodPatch, "/api/issues/%23002/status",
		StatusRequest{Status: StatusResolved}, headers)
	if status.Code != http.StatusOK {
		t.Fatalf("status update = %d: %s", status.Code, status.Body.String())
	}
	statusIssue := decodeResponse[Issue](t, status)
	if statusIssue.Status != StatusResolved || len(statusIssue.AuditLogs) != 3 {
		t.Fatalf("unexpected status result: %+v", statusIssue)
	}

	deleteResponse := requestJSON(t, handler, http.MethodDelete, "/api/issues/%23002", nil, headers)
	if deleteResponse.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d: %s", deleteResponse.Code, deleteResponse.Body.String())
	}
	missing := requestJSON(t, handler, http.MethodDelete, "/api/issues/%23002", nil, headers)
	if missing.Code != http.StatusNotFound {
		t.Fatalf("missing delete status = %d", missing.Code)
	}
}

func TestAPICreateIdempotencyAndConflict(t *testing.T) {
	handler, _ := newTestAPI(t, standardTestIssues()[:1])
	headers := map[string]string{
		"X-Actor":         "idempotency-api",
		"Idempotency-Key": "api-create-20261030-001",
	}
	payload := CreateIssueRequest{
		Title: "幂等 API 问题",
		Scene: "泵房区",
		Pos:   &Position{X: 2, Y: 1, Z: 4},
	}

	first := requestJSON(
		t,
		handler,
		http.MethodPost,
		"/api/issues",
		payload,
		headers,
	)
	second := requestJSON(
		t,
		handler,
		http.MethodPost,
		"/api/issues",
		payload,
		headers,
	)
	if first.Code != http.StatusCreated || second.Code != http.StatusCreated {
		t.Fatalf(
			"idempotent statuses = %d, %d",
			first.Code,
			second.Code,
		)
	}
	firstIssue := decodeResponse[Issue](t, first)
	secondIssue := decodeResponse[Issue](t, second)
	if firstIssue.ID != secondIssue.ID {
		t.Fatalf("idempotent IDs differ: %s vs %s", firstIssue.ID, secondIssue.ID)
	}
	if second.Header().Get("Idempotency-Replayed") != "true" {
		t.Fatalf("replayed response header is missing")
	}

	list := requestJSON(
		t,
		handler,
		http.MethodGet,
		"/api/issues?page=1&pageSize=100",
		nil,
		nil,
	)
	result := decodeResponse[ListResult](t, list)
	if result.Total != 2 {
		t.Fatalf("idempotent request created %d records, want 2 total", result.Total)
	}

	payload.Title = "不同内容的幂等问题"
	conflict := requestJSON(
		t,
		handler,
		http.MethodPost,
		"/api/issues",
		payload,
		headers,
	)
	if conflict.Code != http.StatusConflict {
		t.Fatalf(
			"idempotency conflict status = %d, body = %s",
			conflict.Code,
			conflict.Body.String(),
		)
	}
	envelope := decodeResponse[errorEnvelope](t, conflict)
	if envelope.Error.Code != "IDEMPOTENCY_CONFLICT" {
		t.Fatalf("unexpected idempotency conflict: %+v", envelope.Error)
	}
}

func TestAPIRejectsInvalidIdempotencyKey(t *testing.T) {
	handler, _ := newTestAPI(t, standardTestIssues()[:1])
	response := requestJSON(
		t,
		handler,
		http.MethodPost,
		"/api/issues",
		CreateIssueRequest{
			Title: "非法幂等键",
			Scene: "其他",
			Pos:   &Position{},
		},
		map[string]string{"Idempotency-Key": "contains space"},
	)
	if response.Code != http.StatusBadRequest {
		t.Fatalf(
			"invalid idempotency key status = %d",
			response.Code,
		)
	}
}

func TestAPIIdempotentReplayAfterDelete(t *testing.T) {
	handler, store := newTestAPI(t, standardTestIssues()[:1])
	headers := map[string]string{
		"X-Actor":         "delete-replay-api",
		"Idempotency-Key": "delete-replay-key",
	}
	payload := CreateIssueRequest{
		Title: "删除后仍可幂等重放",
		Scene: "泵房区",
		Pos:   &Position{X: 3, Y: 1, Z: 4},
	}

	createdResponse := requestJSON(
		t,
		handler,
		http.MethodPost,
		"/api/issues",
		payload,
		headers,
	)
	created := decodeResponse[Issue](t, createdResponse)
	if createdResponse.Code != http.StatusCreated {
		t.Fatalf("create status = %d", createdResponse.Code)
	}

	deleted := requestJSON(
		t,
		handler,
		http.MethodDelete,
		"/api/issues/"+created.ID,
		nil,
		headers,
	)
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d", deleted.Code)
	}
	if _, err := store.Get(created.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("deleted issue lookup = %v, want not found", err)
	}

	replayedResponse := requestJSON(
		t,
		handler,
		http.MethodPost,
		"/api/issues",
		payload,
		headers,
	)
	replayed := decodeResponse[Issue](t, replayedResponse)
	if replayedResponse.Code != http.StatusCreated ||
		replayed.ID != created.ID ||
		replayedResponse.Header().Get("Idempotency-Replayed") != "true" {
		t.Fatalf(
			"delete/replay mismatch: status=%d id=%s header=%s",
			replayedResponse.Code,
			replayed.ID,
			replayedResponse.Header().Get("Idempotency-Replayed"),
		)
	}
	if got := len(store.FilterAll(Filter{})); got != 1 {
		t.Fatalf("replay recreated deleted issue: count=%d", got)
	}
}

func TestAPIBatchOperations(t *testing.T) {
	handler, _ := newTestAPI(t, standardTestIssues()[:3])
	headers := map[string]string{"X-Actor": "batch-api"}

	response := requestJSON(t, handler, http.MethodPost, "/api/issues/batch-status",
		BatchStatusRequest{IDs: []string{"#001", "#002"}, Status: StatusResolved}, headers)
	if response.Code != http.StatusOK {
		t.Fatalf("batch status = %d: %s", response.Code, response.Body.String())
	}
	count := decodeResponse[map[string]int](t, response)
	if count["updated"] != 2 {
		t.Fatalf("unexpected batch count: %v", count)
	}

	missing := requestJSON(t, handler, http.MethodPost, "/api/issues/batch-status",
		BatchStatusRequest{IDs: []string{"#003", "#999"}, Status: StatusOpen}, headers)
	if missing.Code != http.StatusNotFound {
		t.Fatalf("missing batch status = %d", missing.Code)
	}

	deleteResponse := requestJSON(t, handler, http.MethodPost, "/api/issues/batch-delete",
		BatchDeleteRequest{IDs: []string{"#001", "#002"}}, headers)
	if deleteResponse.Code != http.StatusOK {
		t.Fatalf("batch delete = %d: %s", deleteResponse.Code, deleteResponse.Body.String())
	}
}

func TestAPIValidationAndCORS(t *testing.T) {
	handler, _ := newTestAPI(t, standardTestIssues()[:1])

	invalid := requestJSON(t, handler, http.MethodPost, "/api/issues", map[string]any{
		"title":    "",
		"priority": "URGENT",
		"status":   "CLOSED",
		"scene":    "",
	}, nil)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid create status = %d", invalid.Code)
	}
	envelope := decodeResponse[errorEnvelope](t, invalid)
	if envelope.Error.Code != "VALIDATION_ERROR" || len(envelope.Error.Fields) < 4 {
		t.Fatalf("unexpected validation error: %+v", envelope)
	}

	preflight := requestJSON(t, handler, http.MethodOptions, "/api/issues", nil,
		map[string]string{"Origin": "http://localhost:5173"})
	if preflight.Code != http.StatusNoContent ||
		preflight.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Fatalf("unexpected preflight: %d %v", preflight.Code, preflight.Header())
	}
	if !strings.Contains(
		preflight.Header().Get("Access-Control-Allow-Headers"),
		"Idempotency-Key",
	) {
		t.Fatalf("preflight must allow Idempotency-Key")
	}

	forbidden := requestJSON(t, handler, http.MethodGet, "/api/health", nil,
		map[string]string{"Origin": "https://example.com"})
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("forbidden origin status = %d", forbidden.Code)
	}
}

func TestAPIExportCSVUsesFilters(t *testing.T) {
	handler, _ := newTestAPI(t, standardTestIssues())
	response := requestJSON(t, handler, http.MethodGet,
		"/api/issues/export.csv?priority=HIGH", nil, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("CSV status = %d: %s", response.Code, response.Body.String())
	}
	if !strings.HasPrefix(response.Header().Get("Content-Type"), "text/csv") {
		t.Fatalf("unexpected content type: %s", response.Header().Get("Content-Type"))
	}
	reader := csv.NewReader(strings.NewReader(response.Body.String()))
	rows, err := reader.ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 3 {
		t.Fatalf("expected header + 2 filtered rows, got %d", len(rows))
	}
	if rows[1][0] != "#001" || rows[2][0] != "#004" {
		t.Fatalf("unexpected exported IDs: %v", []string{rows[1][0], rows[2][0]})
	}
}
