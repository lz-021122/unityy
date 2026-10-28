package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func mustTime(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		panic(err)
	}
	return parsed
}

func testIssue(id, title string, priority Priority, status IssueStatus, scene string, created time.Time) Issue {
	return Issue{
		ID:            id,
		Title:         title,
		Desc:          title + " 的演示描述",
		Priority:      priority,
		Status:        status,
		Scene:         scene,
		Pos:           Position{X: 1.25, Y: 2.5, Z: -3.75},
		CreatedAt:     created,
		UpdatedAt:     created,
		Screenshot:    "/assets/unity-inspect-evidence.png",
		Reporter:      "测试巡检员",
		Assignee:      "测试处理人",
		DeviceCode:    "TEST-" + id,
		SeverityScore: 70,
		AuditLogs: []AuditLog{{
			Time:   created,
			User:   "测试巡检员",
			Action: "创建测试问题",
		}},
	}
}

func standardTestIssues() []Issue {
	base := mustTime("2026-10-28T00:00:00Z")
	return []Issue{
		testIssue("#001", "泵房法兰渗漏", PriorityHigh, StatusOpen, "泵房区", base),
		testIssue("#002", "电机温度异常", PriorityMedium, StatusInProgress, "配电室", base.Add(24*time.Hour)),
		testIssue("#003", "管道支架松动", PriorityLow, StatusResolved, "管道区", base.Add(48*time.Hour)),
		testIssue("#004", "泵体异常振动", PriorityHigh, StatusInProgress, "泵房区", base.Add(72*time.Hour)),
		testIssue("#005", "地面积水", PriorityMedium, StatusResolved, "其他", base.Add(96*time.Hour)),
	}
}

func writeIssueSeed(t *testing.T, dir string, issues []Issue) (string, string) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o750); err != nil {
		t.Fatalf("create test dir: %v", err)
	}
	seedPath := filepath.Join(dir, "seed_issues.json")
	dataPath := filepath.Join(dir, "issues.json")
	data, err := json.MarshalIndent(issues, "", "  ")
	if err != nil {
		t.Fatalf("marshal seed: %v", err)
	}
	if err := os.WriteFile(seedPath, append(data, '\n'), 0o600); err != nil {
		t.Fatalf("write seed: %v", err)
	}
	return seedPath, dataPath
}

func newTestStore(t *testing.T, issues []Issue) (*Store, string, string) {
	t.Helper()
	seedPath, dataPath := writeIssueSeed(t, t.TempDir(), issues)
	store, err := NewStore(seedPath, dataPath)
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	return store, seedPath, dataPath
}

func requestJSON(t *testing.T, handler http.Handler, method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	var payload []byte
	var err error
	if body != nil {
		payload, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
	}
	request := httptest.NewRequest(method, path, bytes.NewReader(payload))
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		request.Header.Set(key, value)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func decodeResponse[T any](t *testing.T, response *httptest.ResponseRecorder) T {
	t.Helper()
	var result T
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode response %q: %v", response.Body.String(), err)
	}
	return result
}
