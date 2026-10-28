package main

import (
	"fmt"
	"math"
	"strings"
	"time"
	"unicode/utf8"
)

type Priority string

const (
	PriorityHigh   Priority = "HIGH"
	PriorityMedium Priority = "MEDIUM"
	PriorityLow    Priority = "LOW"
)

type IssueStatus string

const (
	StatusOpen       IssueStatus = "OPEN"
	StatusInProgress IssueStatus = "IN_PROGRESS"
	StatusResolved   IssueStatus = "RESOLVED"
)

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type AuditLog struct {
	Time   time.Time `json:"time"`
	User   string    `json:"user"`
	Action string    `json:"action"`
}

type Issue struct {
	ID            string      `json:"id"`
	Title         string      `json:"title"`
	Desc          string      `json:"desc"`
	Priority      Priority    `json:"priority"`
	Status        IssueStatus `json:"status"`
	Scene         string      `json:"scene"`
	Pos           Position    `json:"pos"`
	CreatedAt     time.Time   `json:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt"`
	Screenshot    string      `json:"screenshot"`
	Reporter      string      `json:"reporter"`
	Assignee      string      `json:"assignee"`
	DeviceCode    string      `json:"deviceCode"`
	SeverityScore int         `json:"severityScore"`
	AuditLogs     []AuditLog  `json:"auditLogs"`
}

type CreateIssueRequest struct {
	Title         string      `json:"title"`
	Desc          string      `json:"desc"`
	Priority      Priority    `json:"priority"`
	Status        IssueStatus `json:"status"`
	Scene         string      `json:"scene"`
	Pos           *Position   `json:"pos"`
	Screenshot    string      `json:"screenshot"`
	Reporter      string      `json:"reporter"`
	Assignee      string      `json:"assignee"`
	DeviceCode    string      `json:"deviceCode"`
	SeverityScore *int        `json:"severityScore"`
}

type UpdateIssueRequest struct {
	Title         *string      `json:"title"`
	Desc          *string      `json:"desc"`
	Priority      *Priority    `json:"priority"`
	Status        *IssueStatus `json:"status"`
	Scene         *string      `json:"scene"`
	Pos           *Position    `json:"pos"`
	Screenshot    *string      `json:"screenshot"`
	Reporter      *string      `json:"reporter"`
	Assignee      *string      `json:"assignee"`
	DeviceCode    *string      `json:"deviceCode"`
	SeverityScore *int         `json:"severityScore"`
}

type StatusRequest struct {
	Status IssueStatus `json:"status"`
}

type BatchStatusRequest struct {
	IDs    []string    `json:"ids"`
	Status IssueStatus `json:"status"`
}

type BatchDeleteRequest struct {
	IDs []string `json:"ids"`
}

type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string {
	return "request fields are invalid"
}

func validPriority(value Priority) bool {
	return value == PriorityHigh || value == PriorityMedium || value == PriorityLow
}

func validStatus(value IssueStatus) bool {
	return value == StatusOpen || value == StatusInProgress || value == StatusResolved
}

func validPosition(value Position) bool {
	return !math.IsNaN(value.X) && !math.IsInf(value.X, 0) &&
		!math.IsNaN(value.Y) && !math.IsInf(value.Y, 0) &&
		!math.IsNaN(value.Z) && !math.IsInf(value.Z, 0)
}

func checkText(fields map[string]string, name, value string, required bool, maxRunes int) string {
	value = strings.TrimSpace(value)
	if required && value == "" {
		fields[name] = "不能为空"
	} else if utf8.RuneCountInString(value) > maxRunes {
		fields[name] = fmt.Sprintf("长度不能超过 %d 个字符", maxRunes)
	}
	return value
}

func normalizeCreateRequest(req CreateIssueRequest) (CreateIssueRequest, error) {
	fields := make(map[string]string)
	req.Title = checkText(fields, "title", req.Title, true, 200)
	req.Desc = checkText(fields, "desc", req.Desc, false, 5000)
	req.Scene = checkText(fields, "scene", req.Scene, true, 120)
	req.Screenshot = checkText(fields, "screenshot", req.Screenshot, false, 2048)
	req.Reporter = checkText(fields, "reporter", req.Reporter, false, 200)
	req.Assignee = checkText(fields, "assignee", req.Assignee, false, 200)
	req.DeviceCode = checkText(fields, "deviceCode", req.DeviceCode, false, 200)

	if req.Priority == "" {
		req.Priority = PriorityHigh
	} else if !validPriority(req.Priority) {
		fields["priority"] = "必须是 HIGH、MEDIUM 或 LOW"
	}
	if req.Status == "" {
		req.Status = StatusOpen
	} else if !validStatus(req.Status) {
		fields["status"] = "必须是 OPEN、IN_PROGRESS 或 RESOLVED"
	}
	if req.Pos == nil {
		fields["pos"] = "坐标不能为空"
	} else if !validPosition(*req.Pos) {
		fields["pos"] = "x、y、z 必须是有限数字"
	}
	if req.SeverityScore == nil {
		score := defaultSeverity(req.Priority)
		req.SeverityScore = &score
	} else if *req.SeverityScore < 0 || *req.SeverityScore > 100 {
		fields["severityScore"] = "必须在 0 到 100 之间"
	}
	if req.Screenshot == "" {
		req.Screenshot = "/assets/unity-inspect-evidence.png"
	}
	if req.Reporter == "" {
		req.Reporter = "operator"
	}
	if req.Assignee == "" {
		req.Assignee = "待分派"
	}

	if len(fields) > 0 {
		return req, &ValidationError{Fields: fields}
	}
	return req, nil
}

func validateUpdateRequest(req *UpdateIssueRequest) error {
	fields := make(map[string]string)
	if req.Title != nil {
		value := checkText(fields, "title", *req.Title, true, 200)
		req.Title = &value
	}
	if req.Desc != nil {
		value := checkText(fields, "desc", *req.Desc, false, 5000)
		req.Desc = &value
	}
	if req.Scene != nil {
		value := checkText(fields, "scene", *req.Scene, true, 120)
		req.Scene = &value
	}
	if req.Screenshot != nil {
		value := checkText(fields, "screenshot", *req.Screenshot, false, 2048)
		req.Screenshot = &value
	}
	if req.Reporter != nil {
		value := checkText(fields, "reporter", *req.Reporter, false, 200)
		req.Reporter = &value
	}
	if req.Assignee != nil {
		value := checkText(fields, "assignee", *req.Assignee, false, 200)
		req.Assignee = &value
	}
	if req.DeviceCode != nil {
		value := checkText(fields, "deviceCode", *req.DeviceCode, false, 200)
		req.DeviceCode = &value
	}
	if req.Priority != nil && !validPriority(*req.Priority) {
		fields["priority"] = "必须是 HIGH、MEDIUM 或 LOW"
	}
	if req.Status != nil && !validStatus(*req.Status) {
		fields["status"] = "必须是 OPEN、IN_PROGRESS 或 RESOLVED"
	}
	if req.Pos != nil && !validPosition(*req.Pos) {
		fields["pos"] = "x、y、z 必须是有限数字"
	}
	if req.SeverityScore != nil && (*req.SeverityScore < 0 || *req.SeverityScore > 100) {
		fields["severityScore"] = "必须在 0 到 100 之间"
	}

	if len(fields) == 0 && req.Title == nil && req.Desc == nil && req.Priority == nil &&
		req.Status == nil && req.Scene == nil && req.Pos == nil && req.Screenshot == nil &&
		req.Reporter == nil && req.Assignee == nil && req.DeviceCode == nil &&
		req.SeverityScore == nil {
		fields["_request"] = "至少需要提供一个可更新字段"
	}
	if len(fields) > 0 {
		return &ValidationError{Fields: fields}
	}
	return nil
}

func validateStoredIssues(issues []Issue) error {
	seen := make(map[string]struct{}, len(issues))
	for index, issue := range issues {
		fields := make(map[string]string)
		issue.Title = checkText(fields, "title", issue.Title, true, 200)
		issue.Desc = checkText(fields, "desc", issue.Desc, false, 5000)
		issue.Scene = checkText(fields, "scene", issue.Scene, true, 120)
		if strings.TrimSpace(issue.ID) == "" {
			fields["id"] = "不能为空"
		}
		if !validPriority(issue.Priority) {
			fields["priority"] = "无效的优先级"
		}
		if !validStatus(issue.Status) {
			fields["status"] = "无效的状态"
		}
		if !validPosition(issue.Pos) {
			fields["pos"] = "坐标必须是有限数字"
		}
		if issue.CreatedAt.IsZero() || issue.UpdatedAt.IsZero() {
			fields["timestamps"] = "createdAt 和 updatedAt 不能为空"
		}
		if issue.SeverityScore < 0 || issue.SeverityScore > 100 {
			fields["severityScore"] = "必须在 0 到 100 之间"
		}
		if _, exists := seen[issue.ID]; exists {
			fields["id"] = "存在重复 ID"
		}
		if len(fields) > 0 {
			return fmt.Errorf("seed issue %d: %w", index, &ValidationError{Fields: fields})
		}
		seen[issue.ID] = struct{}{}
	}
	return nil
}

func defaultSeverity(priority Priority) int {
	switch priority {
	case PriorityHigh:
		return 85
	case PriorityMedium:
		return 60
	default:
		return 35
	}
}
