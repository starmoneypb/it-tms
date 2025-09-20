package repositories

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MetricsRepo struct{ pool *pgxpool.Pool }

type MetricsSummary struct {
	InProgressToday    []TicketSummary     `json:"inProgressToday"`
	StatusCounts       map[string]int      `json:"statusCounts"`
	CategoryCounts     map[string]int      `json:"categoryCounts"`
	PriorityCounts     map[string]int      `json:"priorityCounts"`
	IssueReportCounts  map[string]int      `json:"issueReportCounts"`
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
	return r.SummaryWithDateFilter(ctx, nil, nil)
}

func (r *MetricsRepo) SummaryWithDateFilter(ctx context.Context, month *int, year *int) (MetricsSummary, error) {
	var res MetricsSummary
	res.StatusCounts = map[string]int{}
	res.CategoryCounts = map[string]int{}
	res.PriorityCounts = map[string]int{}
	res.IssueReportCounts = map[string]int{}
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
		ORDER BY 
			CASE t.priority 
				WHEN 'P0' THEN 0 
				WHEN 'P1' THEN 1 
				WHEN 'P2' THEN 2 
				WHEN 'P3' THEN 3 
				ELSE 4 
			END ASC, 
			t.updated_at DESC, 
			t.effort_score ASC 
		LIMIT 20`)
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

	// Build date filter condition
	dateFilter := ""
	var args []interface{}
	if year != nil {
		if month != nil {
			// Both month and year filtering
			dateFilter = " WHERE EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2"
			args = []interface{}{*month, *year}
		} else {
			// Year-only filtering
			dateFilter = " WHERE EXTRACT(YEAR FROM created_at) = $1"
			args = []interface{}{*year}
		}
	}

	// Status counts
	r.countIntoWithDateFilter(ctx, `SELECT status, COUNT(*) FROM tickets`+dateFilter+` GROUP BY status`, args, res.StatusCounts)
	// Category (by resolved_type if available, otherwise initial_type)
	r.countIntoWithDateFilter(ctx, `SELECT COALESCE(resolved_type::text, initial_type::text), COUNT(*) FROM tickets`+dateFilter+` GROUP BY COALESCE(resolved_type::text, initial_type::text)`, args, res.CategoryCounts)
	// Priority counts
	r.countIntoWithDateFilter(ctx, `SELECT priority, COUNT(*) FROM tickets`+dateFilter+` GROUP BY priority`, args, res.PriorityCounts)

	// Issue Report counts breakdown
	issueReportDateFilter := ""
	issueReportArgs := []interface{}{}
	if year != nil {
		if month != nil {
			// Both month and year filtering
			issueReportDateFilter = " AND EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2"
			issueReportArgs = []interface{}{*month, *year}
		} else {
			// Year-only filtering
			issueReportDateFilter = " AND EXTRACT(YEAR FROM created_at) = $1"
			issueReportArgs = []interface{}{*year}
		}
	}
	
	r.countIntoWithDateFilter(ctx, `
		SELECT 
			CASE 
				WHEN status = 'canceled' THEN 'Rejected'
				WHEN resolved_type IS NULL THEN 'Unclassified'
				WHEN resolved_type = 'DATA_CORRECTION' THEN 'Data Correction'
				WHEN resolved_type = 'EMERGENCY_CHANGE' THEN 'Emergency Change'
				ELSE 'Other'
			END as classification,
			COUNT(*)
		FROM tickets
		WHERE initial_type = 'ISSUE_REPORT'`+issueReportDateFilter+`
		GROUP BY 
			CASE 
				WHEN status = 'canceled' THEN 'Rejected'
				WHEN resolved_type IS NULL THEN 'Unclassified'
				WHEN resolved_type = 'DATA_CORRECTION' THEN 'Data Correction'
				WHEN resolved_type = 'EMERGENCY_CHANGE' THEN 'Emergency Change'
				ELSE 'Other'
			END`, issueReportArgs, res.IssueReportCounts)

	return res, nil
}

func (r *MetricsRepo) countInto(ctx context.Context, sql string, target map[string]int) {
	r.countIntoWithDateFilter(ctx, sql, nil, target)
}

func (r *MetricsRepo) countIntoWithDateFilter(ctx context.Context, sql string, args []interface{}, target map[string]int) {
	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil { return }
	for rows.Next() {
		var key string
		var cnt int
		rows.Scan(&key, &cnt)
		target[key] = cnt
	}
	rows.Close()
}

type UserPerformanceStats struct {
	InProgressCount     int     `json:"inProgressCount"`
	CompletedCount      int     `json:"completedCount"`
	TotalSystemInProgress int   `json:"totalSystemInProgress"`
	TotalSystemCompleted  int   `json:"totalSystemCompleted"`
	ParticipationRateInProgress float64 `json:"participationRateInProgress"`
	ParticipationRateCompleted  float64 `json:"participationRateCompleted"`
	EffortScoreCurrentMonth   int     `json:"effortScoreCurrentMonth"`
	EffortScorePreviousMonth  int     `json:"effortScorePreviousMonth"`
	EffortScoreGrowthRate     float64 `json:"effortScoreGrowthRate"`
}

func (r *MetricsRepo) GetUserPerformanceStats(ctx context.Context, userID string) (UserPerformanceStats, error) {
	var stats UserPerformanceStats
	
	// Get user's in progress tickets count
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT t.id)
		FROM tickets t
		JOIN ticket_assignments ta ON t.id = ta.ticket_id
		WHERE ta.assignee_id = $1 AND t.status = 'in_progress'
	`, userID).Scan(&stats.InProgressCount)
	if err != nil {
		return stats, err
	}
	
	// Get user's completed tickets count
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT t.id)
		FROM tickets t
		JOIN ticket_assignments ta ON t.id = ta.ticket_id
		WHERE ta.assignee_id = $1 AND t.status = 'completed'
	`, userID).Scan(&stats.CompletedCount)
	if err != nil {
		return stats, err
	}
	
	// Get total system in progress tickets count
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM tickets
		WHERE status = 'in_progress'
	`).Scan(&stats.TotalSystemInProgress)
	if err != nil {
		return stats, err
	}
	
	// Get total system completed tickets count
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM tickets
		WHERE status = 'completed'
	`).Scan(&stats.TotalSystemCompleted)
	if err != nil {
		return stats, err
	}
	
	// Calculate participation rates
	if stats.TotalSystemInProgress > 0 {
		stats.ParticipationRateInProgress = float64(stats.InProgressCount) / float64(stats.TotalSystemInProgress) * 100
	}
	if stats.TotalSystemCompleted > 0 {
		stats.ParticipationRateCompleted = float64(stats.CompletedCount) / float64(stats.TotalSystemCompleted) * 100
	}
	
	// Get current month effort score (completed tickets only)
	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(t.effort_score), 0)
		FROM tickets t
		JOIN ticket_assignments ta ON t.id = ta.ticket_id
		WHERE ta.assignee_id = $1 
		AND t.status = 'completed'
		AND DATE_TRUNC('month', t.updated_at) = DATE_TRUNC('month', CURRENT_DATE)
	`, userID).Scan(&stats.EffortScoreCurrentMonth)
	if err != nil {
		return stats, err
	}
	
	// Get previous month effort score (completed tickets only)
	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(t.effort_score), 0)
		FROM tickets t
		JOIN ticket_assignments ta ON t.id = ta.ticket_id
		WHERE ta.assignee_id = $1 
		AND t.status = 'completed'
		AND DATE_TRUNC('month', t.updated_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
	`, userID).Scan(&stats.EffortScorePreviousMonth)
	if err != nil {
		return stats, err
	}
	
	// Calculate growth rate
	if stats.EffortScorePreviousMonth > 0 {
		stats.EffortScoreGrowthRate = (float64(stats.EffortScoreCurrentMonth - stats.EffortScorePreviousMonth) / float64(stats.EffortScorePreviousMonth)) * 100
	} else if stats.EffortScoreCurrentMonth > 0 {
		// If previous month was 0 but current month has score, it's 100% growth
		stats.EffortScoreGrowthRate = 100.0
	} else {
		// Both months are 0, no growth
		stats.EffortScoreGrowthRate = 0.0
	}
	
	return stats, nil
}