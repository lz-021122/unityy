package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

var ErrNotFound = errors.New("issue not found")
var ErrIdempotencyConflict = errors.New("idempotency key conflict")

const IdempotencyTTL = 24 * time.Hour

type Filter struct {
	Query       string
	Priority    Priority
	Status      IssueStatus
	Scene       string
	CreatedFrom time.Time
	CreatedTo   time.Time
	Page        int
	PageSize    int
}

type Aggregates struct {
	Total      int                 `json:"total"`
	High       int                 `json:"high"`
	InProgress int                 `json:"inProgress"`
	Resolved   int                 `json:"resolved"`
	ByPriority map[Priority]int    `json:"byPriority"`
	ByStatus   map[IssueStatus]int `json:"byStatus"`
	ByScene    map[string]int      `json:"byScene"`
}

type ListResult struct {
	Items      []Issue    `json:"items"`
	Page       int        `json:"page"`
	PageSize   int        `json:"pageSize"`
	Total      int        `json:"total"`
	Aggregates Aggregates `json:"aggregates"`
}

type Store struct {
	mu          sync.RWMutex
	issues      []Issue
	nextID      int
	idempotency map[string]idempotencyRecord
	dataPath    string
	now         func() time.Time
}

type persistedState struct {
	Version     int                          `json:"version"`
	NextID      int                          `json:"nextId"`
	Issues      []Issue                      `json:"issues"`
	Idempotency map[string]idempotencyRecord `json:"idempotency,omitempty"`
}

type idempotencyRecord struct {
	RequestHash string    `json:"requestHash"`
	CreatedAt   time.Time `json:"createdAt"`
	Response    Issue     `json:"response"`
}

func NewStore(seedPath, dataPath string) (*Store, error) {
	now := func() time.Time { return time.Now().UTC().Truncate(time.Second) }
	data, err := os.ReadFile(dataPath)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, fmt.Errorf("read runtime data: %w", err)
	}

	fromSeed := errors.Is(err, os.ErrNotExist)
	if fromSeed {
		data, err = os.ReadFile(seedPath)
		if err != nil {
			return nil, fmt.Errorf("read seed data: %w", err)
		}
	}

	issues, nextID, idempotency, _, err := decodeIssueData(data)
	if err != nil {
		return nil, fmt.Errorf("decode issue data: %w", err)
	}
	if issues == nil {
		issues = []Issue{}
	}
	if err := validateStoredIssues(issues); err != nil {
		return nil, fmt.Errorf("validate issue data: %w", err)
	}

	if nextID <= maxNumericID(issues) {
		nextID = maxNumericID(issues) + 1
	}
	if nextID < 1 {
		nextID = 1
	}
	if idempotency == nil {
		idempotency = map[string]idempotencyRecord{}
	}
	store := &Store{
		issues:      issues,
		nextID:      nextID,
		idempotency: idempotency,
		dataPath:    dataPath,
		now:         now,
	}
	store.pruneExpiredIdempotencyLocked(store.now())
	if fromSeed {
		if err := store.persistAtomic(issues, nextID, idempotency); err != nil {
			return nil, fmt.Errorf("initialize runtime data: %w", err)
		}
	}
	return store, nil
}

func (s *Store) List(filter Filter) ListResult {
	s.mu.RLock()
	defer s.mu.RUnlock()

	filtered, aggregates := s.filterLocked(filter)
	page := filter.Page
	pageSize := filter.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 5
	}
	start := (page - 1) * pageSize
	if start > len(filtered) {
		start = len(filtered)
	}
	end := start + pageSize
	if end > len(filtered) {
		end = len(filtered)
	}

	items := make([]Issue, 0, end-start)
	for _, issue := range filtered[start:end] {
		items = append(items, cloneIssue(issue))
	}
	return ListResult{
		Items:      items,
		Page:       page,
		PageSize:   pageSize,
		Total:      aggregates.Total,
		Aggregates: aggregates,
	}
}

func (s *Store) FilterAll(filter Filter) []Issue {
	s.mu.RLock()
	defer s.mu.RUnlock()
	filtered, _ := s.filterLocked(filter)
	items := make([]Issue, 0, len(filtered))
	for _, issue := range filtered {
		items = append(items, cloneIssue(issue))
	}
	return items
}

func (s *Store) Get(id string) (Issue, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, issue := range s.issues {
		if issue.ID == id {
			return cloneIssue(issue), nil
		}
	}
	return Issue{}, ErrNotFound
}

func (s *Store) Create(req CreateIssueRequest, actor string) (Issue, error) {
	issue, _, err := s.CreateIdempotent(req, actor, "")
	return issue, err
}

func (s *Store) CreateIdempotent(
	req CreateIssueRequest,
	actor string,
	key string,
) (Issue, bool, error) {
	normalized, err := normalizeCreateRequest(req)
	if err != nil {
		return Issue{}, false, err
	}
	requestHash, err := hashCreateRequest(normalized, actor)
	if err != nil {
		return Issue{}, false, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now().UTC()
	s.pruneExpiredIdempotencyLocked(now)
	if key != "" {
		if record, exists := s.idempotency[key]; exists {
			if record.RequestHash != requestHash {
				return Issue{}, false, ErrIdempotencyConflict
			}
			return cloneIssue(record.Response), true, nil
		}
	}

	issue := Issue{
		ID:            fmt.Sprintf("#%03d", s.nextID),
		Title:         normalized.Title,
		Desc:          normalized.Desc,
		Priority:      normalized.Priority,
		Status:        normalized.Status,
		Scene:         normalized.Scene,
		Pos:           *normalized.Pos,
		CreatedAt:     now,
		UpdatedAt:     now,
		Screenshot:    normalized.Screenshot,
		Reporter:      normalized.Reporter,
		Assignee:      normalized.Assignee,
		DeviceCode:    normalized.DeviceCode,
		SeverityScore: *normalized.SeverityScore,
		AuditLogs: []AuditLog{{
			Time:   now,
			User:   actor,
			Action: "创建并录入问题",
		}},
	}
	candidate := make([]Issue, 0, len(s.issues)+1)
	candidate = append(candidate, issue)
	candidate = append(candidate, s.issues...)
	nextID := s.nextID + 1
	idempotency := cloneIdempotency(s.idempotency)
	if key != "" {
		idempotency[key] = idempotencyRecord{
			RequestHash: requestHash,
			CreatedAt:   now,
			Response:    cloneIssue(issue),
		}
	}
	if err := s.persistAtomic(candidate, nextID, idempotency); err != nil {
		return Issue{}, false, err
	}
	s.issues = candidate
	s.nextID = nextID
	s.idempotency = idempotency
	return cloneIssue(issue), false, nil
}

func (s *Store) Update(id string, req UpdateIssueRequest, actor string) (Issue, error) {
	if err := validateUpdateRequest(&req); err != nil {
		return Issue{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	index := s.indexLocked(id)
	if index < 0 {
		return Issue{}, ErrNotFound
	}

	updated := cloneIssue(s.issues[index])
	statusChanged := false
	if req.Title != nil {
		updated.Title = *req.Title
	}
	if req.Desc != nil {
		updated.Desc = *req.Desc
	}
	if req.Priority != nil {
		updated.Priority = *req.Priority
	}
	if req.Status != nil {
		statusChanged = updated.Status != *req.Status
		updated.Status = *req.Status
	}
	if req.Scene != nil {
		updated.Scene = *req.Scene
	}
	if req.Pos != nil {
		updated.Pos = *req.Pos
	}
	if req.Screenshot != nil {
		updated.Screenshot = *req.Screenshot
	}
	if req.Reporter != nil {
		updated.Reporter = *req.Reporter
	}
	if req.Assignee != nil {
		updated.Assignee = *req.Assignee
	}
	if req.DeviceCode != nil {
		updated.DeviceCode = *req.DeviceCode
	}
	if req.SeverityScore != nil {
		updated.SeverityScore = *req.SeverityScore
	}

	now := s.now().UTC()
	updated.UpdatedAt = now
	action := "更新问题工况详情"
	if statusChanged {
		action = "状态变更至 " + string(updated.Status)
	}
	updated.AuditLogs = append(updated.AuditLogs, AuditLog{
		Time: now, User: actor, Action: action,
	})

	candidate := cloneIssues(s.issues)
	candidate[index] = updated
	if err := s.persistAtomic(candidate, s.nextID, s.idempotency); err != nil {
		return Issue{}, err
	}
	s.issues = candidate
	return cloneIssue(updated), nil
}

func (s *Store) UpdateStatus(id string, status IssueStatus, actor string) (Issue, error) {
	if !validStatus(status) {
		return Issue{}, &ValidationError{Fields: map[string]string{
			"status": "必须是 OPEN、IN_PROGRESS 或 RESOLVED",
		}}
	}

	req := UpdateIssueRequest{Status: &status}
	return s.Update(id, req, actor)
}

func (s *Store) BatchUpdateStatus(ids []string, status IssueStatus, actor string) (int, error) {
	if !validStatus(status) {
		return 0, &ValidationError{Fields: map[string]string{
			"status": "必须是 OPEN、IN_PROGRESS 或 RESOLVED",
		}}
	}
	if len(ids) == 0 {
		return 0, &ValidationError{Fields: map[string]string{
			"ids": "至少需要一个问题 ID",
		}}
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	indices, err := s.requiredIndicesLocked(ids)
	if err != nil {
		return 0, err
	}
	now := s.now().UTC()
	candidate := cloneIssues(s.issues)
	for _, index := range indices {
		candidate[index].Status = status
		candidate[index].UpdatedAt = now
		candidate[index].AuditLogs = append(candidate[index].AuditLogs, AuditLog{
			Time: now, User: actor, Action: "批量状态变更至 " + string(status),
		})
	}
	if err := s.persistAtomic(candidate, s.nextID, s.idempotency); err != nil {
		return 0, err
	}
	s.issues = candidate
	return len(indices), nil
}

func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	index := s.indexLocked(id)
	if index < 0 {
		return ErrNotFound
	}
	candidate := make([]Issue, 0, len(s.issues)-1)
	candidate = append(candidate, cloneIssues(s.issues[:index])...)
	candidate = append(candidate, cloneIssues(s.issues[index+1:])...)
	if err := s.persistAtomic(candidate, s.nextID, s.idempotency); err != nil {
		return err
	}
	s.issues = candidate
	return nil
}

func (s *Store) BatchDelete(ids []string) (int, error) {
	if len(ids) == 0 {
		return 0, &ValidationError{Fields: map[string]string{
			"ids": "至少需要一个问题 ID",
		}}
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	indices, err := s.requiredIndicesLocked(ids)
	if err != nil {
		return 0, err
	}
	remove := make(map[int]struct{}, len(indices))
	for _, index := range indices {
		remove[index] = struct{}{}
	}
	candidate := make([]Issue, 0, len(s.issues)-len(remove))
	for index, issue := range s.issues {
		if _, deleted := remove[index]; !deleted {
			candidate = append(candidate, cloneIssue(issue))
		}
	}
	if err := s.persistAtomic(candidate, s.nextID, s.idempotency); err != nil {
		return 0, err
	}
	s.issues = candidate
	return len(remove), nil
}

func (s *Store) filterLocked(filter Filter) ([]Issue, Aggregates) {
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	filtered := make([]Issue, 0, len(s.issues))
	aggregates := Aggregates{
		ByPriority: map[Priority]int{
			PriorityHigh: 0, PriorityMedium: 0, PriorityLow: 0,
		},
		ByStatus: map[IssueStatus]int{
			StatusOpen: 0, StatusInProgress: 0, StatusResolved: 0,
		},
		ByScene: map[string]int{
			"泵房区": 0, "配电室": 0, "管道区": 0, "其他": 0,
		},
	}

	for _, issue := range s.issues {
		if query != "" {
			haystack := strings.ToLower(issue.ID + " " + issue.Title + " " + issue.Desc + " " + issue.Scene)
			if !strings.Contains(haystack, query) {
				continue
			}
		}
		if filter.Priority != "" && issue.Priority != filter.Priority {
			continue
		}
		if filter.Status != "" && issue.Status != filter.Status {
			continue
		}
		if filter.Scene != "" && !strings.EqualFold(issue.Scene, filter.Scene) {
			continue
		}
		if !filter.CreatedFrom.IsZero() && issue.CreatedAt.Before(filter.CreatedFrom) {
			continue
		}
		if !filter.CreatedTo.IsZero() && !issue.CreatedAt.Before(filter.CreatedTo) {
			continue
		}

		filtered = append(filtered, issue)
		aggregates.Total++
		aggregates.ByPriority[issue.Priority]++
		aggregates.ByStatus[issue.Status]++
		aggregates.ByScene[issue.Scene]++
		if issue.Priority == PriorityHigh {
			aggregates.High++
		}
		if issue.Status == StatusInProgress {
			aggregates.InProgress++
		}
		if issue.Status == StatusResolved {
			aggregates.Resolved++
		}
	}
	return filtered, aggregates
}

func (s *Store) indexLocked(id string) int {
	for index, issue := range s.issues {
		if issue.ID == id {
			return index
		}
	}
	return -1
}

func (s *Store) requiredIndicesLocked(ids []string) ([]int, error) {
	seen := make(map[string]struct{}, len(ids))
	indices := make([]int, 0, len(ids))
	for _, id := range ids {
		if _, duplicated := seen[id]; duplicated {
			continue
		}
		seen[id] = struct{}{}
		index := s.indexLocked(id)
		if index < 0 {
			return nil, fmt.Errorf("%w: %s", ErrNotFound, id)
		}
		indices = append(indices, index)
	}
	sort.Ints(indices)
	return indices, nil
}

func (s *Store) persistAtomic(
	issues []Issue,
	nextID int,
	idempotency map[string]idempotencyRecord,
) error {
	if err := os.MkdirAll(filepath.Dir(s.dataPath), 0o750); err != nil {
		return fmt.Errorf("create data directory: %w", err)
	}
	state := persistedState{
		Version:     1,
		NextID:      nextID,
		Issues:      issues,
		Idempotency: idempotency,
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("encode issues: %w", err)
	}
	data = append(data, '\n')

	temp, err := os.CreateTemp(filepath.Dir(s.dataPath), ".issues-*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary data file: %w", err)
	}
	tempName := temp.Name()
	defer os.Remove(tempName)

	if err := temp.Chmod(0o600); err != nil {
		temp.Close()
		return fmt.Errorf("secure temporary data file: %w", err)
	}
	if _, err := temp.Write(data); err != nil {
		temp.Close()
		return fmt.Errorf("write temporary data file: %w", err)
	}
	if err := temp.Sync(); err != nil {
		temp.Close()
		return fmt.Errorf("sync temporary data file: %w", err)
	}
	if err := temp.Close(); err != nil {
		return fmt.Errorf("close temporary data file: %w", err)
	}
	if err := os.Rename(tempName, s.dataPath); err != nil {
		return fmt.Errorf("replace data file: %w", err)
	}
	return nil
}

func decodeIssueData(
	data []byte,
) ([]Issue, int, map[string]idempotencyRecord, bool, error) {
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 {
		return nil, 0, nil, false, errors.New("issue data is empty")
	}
	switch trimmed[0] {
	case '[':
		var issues []Issue
		if err := json.Unmarshal(trimmed, &issues); err != nil {
			return nil, 0, nil, true, err
		}
		return issues, maxNumericID(issues) + 1, nil, true, nil
	case '{':
		var state persistedState
		if err := json.Unmarshal(trimmed, &state); err != nil {
			return nil, 0, nil, false, err
		}
		if state.Version != 1 {
			return nil, 0, nil, false, fmt.Errorf(
				"unsupported issue data version %d",
				state.Version,
			)
		}
		return state.Issues, state.NextID, state.Idempotency, false, nil
	default:
		return nil, 0, nil, false, errors.New(
			"issue data must be a JSON array or object",
		)
	}
}

func hashCreateRequest(req CreateIssueRequest, actor string) (string, error) {
	data, err := json.Marshal(struct {
		Request CreateIssueRequest `json:"request"`
		Actor   string             `json:"actor"`
	}{
		Request: req,
		Actor:   actor,
	})
	if err != nil {
		return "", fmt.Errorf("encode idempotent request: %w", err)
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}

func (s *Store) pruneExpiredIdempotencyLocked(now time.Time) {
	for key, record := range s.idempotency {
		if record.RequestHash == "" ||
			record.Response.ID == "" ||
			!now.Before(record.CreatedAt.Add(IdempotencyTTL)) {
			delete(s.idempotency, key)
		}
	}
}

func cloneIdempotency(
	source map[string]idempotencyRecord,
) map[string]idempotencyRecord {
	cloned := make(map[string]idempotencyRecord, len(source))
	for key, record := range source {
		record.Response = cloneIssue(record.Response)
		cloned[key] = record
	}
	return cloned
}

func maxNumericID(issues []Issue) int {
	maxID := 0
	for _, issue := range issues {
		if !strings.HasPrefix(issue.ID, "#") {
			continue
		}
		if value, err := strconv.Atoi(strings.TrimPrefix(issue.ID, "#")); err == nil && value > maxID {
			maxID = value
		}
	}
	return maxID
}

func cloneIssue(issue Issue) Issue {
	issue.AuditLogs = append([]AuditLog(nil), issue.AuditLogs...)
	return issue
}

func cloneIssues(issues []Issue) []Issue {
	cloned := make([]Issue, len(issues))
	for index, issue := range issues {
		cloned[index] = cloneIssue(issue)
	}
	return cloned
}
