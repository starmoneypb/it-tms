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

type AssigneeSummary struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	ProfilePicture *string `json:"profilePicture"`
}

type TicketSummary struct {
	ID            string            `json:"id"`
	Title         string            `json:"title"`
	Priority      string            `json:"priority"`
	AssigneeID    *string           `json:"assigneeId"`    // Deprecated: for backward compatibility
	AssigneeName  *string           `json:"assigneeName"`  // Deprecated: for backward compatibility
	Assignees     []AssigneeSummary `json:"assignees"`     // New: detailed assignee info
	UpdatedAt     time.Time         `json:"updatedAt"`
	LatestComment *string           `json:"latestComment"`
}

func (r *MetricsRepo) Summary(ctx context.Context) (MetricsSummary, error) {
	var res MetricsSummary
	res.StatusCounts = map[string]int{}
	res.CategoryCounts = map[string]int{}
	res.PriorityCounts = map[string]int{}
	res.InProgressToday = []TicketSummary{} // Initialize as empty slice to avoid null

	// In progress tickets (all currently active ones, not just updated today)
	rows, err := r.pool.Query(ctx, `
		SELECT 
			t.id, 
			t.title, 
			t.priority, 
			t.assignee_id,
			u.name as assignee_name,
			t.updated_at,
			(SELECT c.body FROM comments c WHERE c.ticket_id = t.id ORDER BY c.created_at DESC LIMIT 1) as latest_comment,
			(SELECT STRING_AGG(au.name, ', ' ORDER BY au.name) 
			 FROM ticket_assignments ta 
			 JOIN users au ON ta.assignee_id = au.id 
			 WHERE ta.ticket_id = t.id) as assignee_names
		FROM tickets t
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.status='in_progress'
		ORDER BY t.updated_at DESC LIMIT 20`)
	if err != nil {
		// Log error but continue with empty slice
		return res, err
	}
	for rows.Next() {
		var ticket TicketSummary
		var latestComment *string
		var assigneeNames *string
		err := rows.Scan(&ticket.ID, &ticket.Title, &ticket.Priority, &ticket.AssigneeID, &ticket.AssigneeName, &ticket.UpdatedAt, &latestComment, &assigneeNames)
		if err != nil {
			continue // Skip this row if scan fails
		}
		ticket.LatestComment = latestComment
		
		// Use new assignee names if available, fallback to old single assignee
		if assigneeNames != nil && *assigneeNames != "" {
			ticket.AssigneeName = assigneeNames
		}
		
		// Fetch detailed assignee information
		assigneeRows, assigneeErr := r.pool.Query(ctx, `
			SELECT u.id, u.name, u.profile_picture
			FROM ticket_assignments ta
			JOIN users u ON ta.assignee_id = u.id
			WHERE ta.ticket_id = $1
			ORDER BY u.name ASC`, ticket.ID)
		
		if assigneeErr == nil {
			for assigneeRows.Next() {
				var assignee AssigneeSummary
				assigneeRows.Scan(&assignee.ID, &assignee.Name, &assignee.ProfilePicture)
				ticket.Assignees = append(ticket.Assignees, assignee)
			}
			assigneeRows.Close()
		}
		
		// If no new assignees found but there's a legacy assignee, add it
		if len(ticket.Assignees) == 0 && ticket.AssigneeID != nil && ticket.AssigneeName != nil {
			legacyAssignee := AssigneeSummary{
				ID:   *ticket.AssigneeID,
				Name: *ticket.AssigneeName,
			}
			// Try to get profile picture for legacy assignee
			var profilePicture *string
			profileRow := r.pool.QueryRow(ctx, `SELECT profile_picture FROM users WHERE id = $1`, *ticket.AssigneeID)
			profileRow.Scan(&profilePicture)
			legacyAssignee.ProfilePicture = profilePicture
			ticket.Assignees = append(ticket.Assignees, legacyAssignee)
		}
		
		res.InProgressToday = append(res.InProgressToday, ticket)
	}
	rows.Close()

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