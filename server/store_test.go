package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func TestStoreSeedsAndReloadsExistingRuntimeData(t *testing.T) {
	initial := standardTestIssues()[:2]
	store, seedPath, dataPath := newTestStore(t, initial)
	if len(store.FilterAll(Filter{})) != 2 {
		t.Fatalf("expected two seeded issues")
	}
	if _, err := os.Stat(dataPath); err != nil {
		t.Fatalf("runtime data was not created: %v", err)
	}

	replacement := standardTestIssues()[2:3]
	seedData, err := os.ReadFile(seedPath)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(seedPath, mustJSON(t, replacement), 0o600); err != nil {
		t.Fatal(err)
	}
	reloaded, err := NewStore(seedPath, dataPath)
	if err != nil {
		t.Fatal(err)
	}
	if got := len(reloaded.FilterAll(Filter{})); got != 2 {
		t.Fatalf("runtime data should not be overwritten by seed, got %d", got)
	}
	if len(seedData) == 0 {
		t.Fatal("seed unexpectedly empty")
	}
}

func TestStoreListFiltersPaginationAndAggregates(t *testing.T) {
	store, _, _ := newTestStore(t, standardTestIssues())

	result := store.List(Filter{Priority: PriorityHigh, Page: 1, PageSize: 1})
	if result.Total != 2 || len(result.Items) != 1 || result.Items[0].ID != "#001" {
		t.Fatalf("unexpected high-priority result: %+v", result)
	}
	if result.Aggregates.High != 2 || result.Aggregates.ByPriority[PriorityHigh] != 2 {
		t.Fatalf("aggregates must use filtered data: %+v", result.Aggregates)
	}
	if result.Aggregates.ByStatus[StatusOpen] != 1 ||
		result.Aggregates.ByStatus[StatusInProgress] != 1 {
		t.Fatalf("unexpected status aggregates: %+v", result.Aggregates.ByStatus)
	}

	from := mustTime("2026-10-29T00:00:00Z")
	to := mustTime("2026-10-31T00:00:00Z")
	dateResult := store.List(Filter{CreatedFrom: from, CreatedTo: to, Page: 1, PageSize: 10})
	if dateResult.Total != 2 {
		t.Fatalf("unexpected date-filter total: %d", dateResult.Total)
	}

	queryResult := store.List(Filter{Query: "泵", Scene: "泵房区", Page: 1, PageSize: 10})
	if queryResult.Total != 2 {
		t.Fatalf("unexpected text/scene filter total: %d", queryResult.Total)
	}

	pageTwo := store.List(Filter{Page: 2, PageSize: 2})
	if pageTwo.Total != 5 || len(pageTwo.Items) != 2 || pageTwo.Items[0].ID != "#003" {
		t.Fatalf("unexpected pagination result: %+v", pageTwo)
	}
}

func TestStoreCRUDStatusAuditAndPersistence(t *testing.T) {
	store, _, dataPath := newTestStore(t, standardTestIssues()[:1])
	store.now = func() time.Time { return mustTime("2026-10-29T08:00:00Z") }

	created, err := store.Create(CreateIssueRequest{
		Title:      "新发现问题",
		Desc:       "用于验证创建与持久化",
		Scene:      "管道区",
		Pos:        &Position{X: 1, Y: 2, Z: 3},
		Assignee:   "维修组",
		DeviceCode: "PIPE-TEST",
	}, "alice")
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.ID != "#002" || created.Status != StatusOpen || created.AuditLogs[0].User != "alice" {
		t.Fatalf("unexpected created issue: %+v", created)
	}
	if _, err := store.Get("#002"); err != nil {
		t.Fatalf("Get created: %v", err)
	}

	title := "更新后的问题"
	priority := PriorityLow
	updated, err := store.Update("#002", UpdateIssueRequest{
		Title: &title, Priority: &priority,
	}, "bob")
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Title != title || updated.Priority != priority || len(updated.AuditLogs) != 2 {
		t.Fatalf("unexpected updated issue: %+v", updated)
	}

	statusUpdated, err := store.UpdateStatus("#002", StatusResolved, "carol")
	if err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	if statusUpdated.Status != StatusResolved || len(statusUpdated.AuditLogs) != 3 {
		t.Fatalf("unexpected status update: %+v", statusUpdated)
	}

	reloaded, err := NewStore("unused-seed.json", dataPath)
	if err != nil {
		t.Fatalf("reload persisted data: %v", err)
	}
	persisted, err := reloaded.Get("#002")
	if err != nil || persisted.Status != StatusResolved || len(persisted.AuditLogs) != 3 {
		t.Fatalf("persisted issue mismatch: %+v, %v", persisted, err)
	}

	if err := store.Delete("#002"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := store.Get("#002"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found after delete, got %v", err)
	}
	if err := store.Delete("#999"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found for missing delete, got %v", err)
	}
}

func TestStoreIDHighWaterMarkPersistsAfterDeleteAndRestart(t *testing.T) {
	store, _, dataPath := newTestStore(t, standardTestIssues()[:2])
	store.now = func() time.Time { return mustTime("2026-10-30T08:00:00Z") }

	created, err := store.Create(CreateIssueRequest{
		Title: "待删除的最大编号问题",
		Scene: "其他",
		Pos:   &Position{X: 1, Y: 2, Z: 3},
	}, "id-test")
	if err != nil {
		t.Fatal(err)
	}
	if created.ID != "#003" {
		t.Fatalf("expected #003, got %s", created.ID)
	}
	if err := store.Delete(created.ID); err != nil {
		t.Fatal(err)
	}

	reloaded, err := NewStore("unused-seed.json", dataPath)
	if err != nil {
		t.Fatal(err)
	}
	next, err := reloaded.Create(CreateIssueRequest{
		Title: "重启后创建的问题",
		Scene: "其他",
		Pos:   &Position{X: 2, Y: 3, Z: 4},
	}, "id-test")
	if err != nil {
		t.Fatal(err)
	}
	if next.ID != "#004" {
		t.Fatalf("deleted #003 was reused or high-water mark was lost: got %s", next.ID)
	}
}

func TestStoreLoadsLegacyArrayWithoutOverwriting(t *testing.T) {
	dir := t.TempDir()
	legacyIssues := []Issue{
		testIssue("#001", "旧记录一", PriorityHigh, StatusOpen, "泵房区", mustTime("2026-10-28T01:00:00Z")),
		testIssue("#010", "旧记录十", PriorityLow, StatusOpen, "其他", mustTime("2026-10-28T02:00:00Z")),
	}
	seedPath, dataPath := writeIssueSeed(t, dir, legacyIssues)
	before, err := os.ReadFile(seedPath)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(dataPath, before, 0o600); err != nil {
		t.Fatal(err)
	}

	store, err := NewStore(seedPath, dataPath)
	if err != nil {
		t.Fatal(err)
	}
	afterLoad, err := os.ReadFile(dataPath)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(before, afterLoad) {
		t.Fatal("legacy runtime data was overwritten during load")
	}
	created, err := store.Create(CreateIssueRequest{
		Title: "兼容后新增",
		Scene: "其他",
		Pos:   &Position{X: 3, Y: 2, Z: 1},
	}, "legacy-test")
	if err != nil {
		t.Fatal(err)
	}
	if created.ID != "#011" {
		t.Fatalf("legacy high-water mark was not preserved: got %s", created.ID)
	}
}

func TestStoreDoesNotAdvanceStateWhenPersistenceFails(t *testing.T) {
	store, _, _ := newTestStore(t, standardTestIssues()[:1])
	before := len(store.FilterAll(Filter{}))
	beforeNextID := store.nextID

	blockerDir := t.TempDir()
	blocker := filepath.Join(blockerDir, "not-a-directory")
	if err := os.WriteFile(blocker, []byte("x"), 0o600); err != nil {
		t.Fatal(err)
	}
	store.dataPath = filepath.Join(blocker, "issues.json")

	_, err := store.Create(CreateIssueRequest{
		Title: "不应成功的问题",
		Scene: "其他",
		Pos:   &Position{},
	}, "failure-test")
	if err == nil {
		t.Fatal("expected persistence failure")
	}
	if got := len(store.FilterAll(Filter{})); got != before {
		t.Fatalf("in-memory issues changed after persistence failure: %d -> %d", before, got)
	}
	if store.nextID != beforeNextID {
		t.Fatalf("next ID changed after persistence failure: %d -> %d", beforeNextID, store.nextID)
	}
}

func TestStoreBatchOperationsAreAtomic(t *testing.T) {
	store, _, _ := newTestStore(t, standardTestIssues()[:3])

	updated, err := store.BatchUpdateStatus([]string{"#001", "#002"}, StatusResolved, "batch-actor")
	if err != nil || updated != 2 {
		t.Fatalf("BatchUpdateStatus = %d, %v", updated, err)
	}
	first, _ := store.Get("#001")
	if first.Status != StatusResolved || first.AuditLogs[len(first.AuditLogs)-1].User != "batch-actor" {
		t.Fatalf("batch status audit missing: %+v", first)
	}

	if _, err := store.BatchUpdateStatus([]string{"#003", "#999"}, StatusOpen, "batch-actor"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected missing batch status error, got %v", err)
	}
	third, _ := store.Get("#003")
	if third.Status != StatusResolved {
		t.Fatal("batch status partially changed records despite missing ID")
	}

	deleted, err := store.BatchDelete([]string{"#001", "#002"})
	if err != nil || deleted != 2 {
		t.Fatalf("BatchDelete = %d, %v", deleted, err)
	}
	if _, err := store.BatchDelete([]string{"#003", "#999"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected missing batch delete error, got %v", err)
	}
	if _, err := store.Get("#003"); err != nil {
		t.Fatal("batch delete partially deleted records despite missing ID")
	}
}

func TestStoreConcurrentAccess(t *testing.T) {
	store, _, _ := newTestStore(t, standardTestIssues()[:1])
	const writers = 20
	errorsChannel := make(chan error, writers*2)
	var wait sync.WaitGroup

	for index := 0; index < writers; index++ {
		wait.Add(2)
		go func(number int) {
			defer wait.Done()
			_, err := store.Create(CreateIssueRequest{
				Title: "并发创建 " + string(rune('A'+number)),
				Scene: "其他",
				Pos:   &Position{X: float64(number)},
			}, "concurrent-writer")
			errorsChannel <- err
		}(index)
		go func() {
			defer wait.Done()
			_ = store.List(Filter{Page: 1, PageSize: 100})
			errorsChannel <- nil
		}()
	}
	wait.Wait()
	close(errorsChannel)
	for err := range errorsChannel {
		if err != nil {
			t.Fatalf("concurrent operation failed: %v", err)
		}
	}
	all := store.FilterAll(Filter{})
	if len(all) != writers+1 {
		t.Fatalf("expected %d records, got %d", writers+1, len(all))
	}
	ids := make(map[string]struct{}, len(all))
	for _, issue := range all {
		if _, exists := ids[issue.ID]; exists {
			t.Fatalf("duplicate ID after concurrent writes: %s", issue.ID)
		}
		ids[issue.ID] = struct{}{}
	}
}

func mustJSON(t *testing.T, value any) []byte {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal JSON: %v", err)
	}
	return data
}
