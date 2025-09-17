package repositories

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MetricsRepo struct{ pool *pgxpool.Pool }

type MetricsSummary struct {
	InProgressToday []TicketSummary     `json:"inProgressToday"`
	StatusCounts    map[string]int      `json:"statusCounts"`
	CategoryCounts  map[string]int      `json:"categoryCounts"`
	PriorityCounts  map[string]int      `json:"priorityCounts"`
}

type TicketSummary struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Priority     string    `json:"priority"`
	AssigneeID   *string   `json:"assigneeId"`
	AssigneeName *string   `json:"assigneeName"`
	UpdatedAt    time.Time `json:"updatedAt"`
	LatestComment *string  `json:"latestComment"`
}

func (r *MetricsRepo) Summary(ctx context.Context) (MetricsSummary, error) {
	var res MetricsSummary
	res.StatusCounts = map[string]int{}
	res.CategoryCounts = map[string]int{}
	res.PriorityCounts = map[string]int{}

	// In progress today with enhanced data
	rows, err := r.pool.Query(ctx, `
		SELECT 
			t.id, 
			t.title, 
			t.priority, 
			t.assignee_id,
			u.name as assignee_name,
			t.updated_at,
			(SELECT c.body FROM comments c WHERE c.ticket_id = t.id ORDER BY c.created_at DESC LIMIT 1) as latest_comment
		FROM tickets t
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.status='in_progress' AND DATE(t.updated_at)=CURRENT_DATE 
		ORDER BY t.updated_at DESC LIMIT 20`)
	if err == nil {
		for rows.Next() {
			var ticket TicketSummary
			var latestComment *string
			rows.Scan(&ticket.ID, &ticket.Title, &ticket.Priority, &ticket.AssigneeID, &ticket.AssigneeName, &ticket.UpdatedAt, &latestComment)
			ticket.LatestComment = latestComment
			res.InProgressToday = append(res.InProgressToday, ticket)
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

func (r *MetricsRepo) countInto(ctx context.Context, sql string, target map[string]int) {
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return }
	for rows.Next() {
		var key string
		var cnt int
		rows.Scan(&key, &cnt)
		target[key] = cnt
	}
	rows.Close()
}