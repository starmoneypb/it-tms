package repositories

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MetricsRepo struct{ pool *pgxpool.Pool }

type MetricsSummary struct {
	InProgressToday []map[string]any    `json:"inProgressToday"`
	StatusCounts    map[string]int64    `json:"statusCounts"`
	CategoryCounts  map[string]int64    `json:"categoryCounts"`
	PriorityCounts  map[string]int64    `json:"priorityCounts"`
}

func (r *MetricsRepo) Summary(ctx context.Context) (MetricsSummary, error) {
	var res MetricsSummary
	res.StatusCounts = map[string]int64{}
	res.CategoryCounts = map[string]int64{}
	res.PriorityCounts = map[string]int64{}

	// In progress today
	rows, err := r.pool.Query(ctx, `SELECT id, title, assignee_id FROM tickets WHERE status='in_progress' AND DATE(updated_at)=CURRENT_DATE ORDER BY updated_at DESC LIMIT 20`)
	if err == nil {
		for rows.Next() {
			var id, title string
			var assignee *string
			rows.Scan(&id, &title, &assignee)
			res.InProgressToday = append(res.InProgressToday, map[string]any{
				"id": id, "title": title, "assigneeId": assignee,
			})
		}
		rows.Close()
	}

	// Status counts
	r.countInto(ctx, `SELECT status, COUNT(*) FROM tickets GROUP BY status`, res.StatusCounts)
	// Category (by initial_type)
	r.countInto(ctx, `SELECT initial_type, COUNT(*) FROM tickets GROUP BY initial_type`, res.CategoryCounts)
	// Priority counts
	r.countInto(ctx, `SELECT priority, COUNT(*) FROM tickets GROUP BY priority`, res.PriorityCounts)

	return res, nil
}

func (r *MetricsRepo) countInto(ctx context.Context, sql string, target map[string]int64) {
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return }
	for rows.Next() {
		var key string
		var cnt int64
		rows.Scan(&key, &cnt)
		target[key] = cnt
	}
	rows.Close()
}