package repositories

import (
	"context"
	"database/sql"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/it-tms/apps/api/internal/models"
)

type UserScoresRepo struct{ pool *pgxpool.Pool }

// AwardPoints awards points to a user for completing a ticket
func (r *UserScoresRepo) AwardPoints(ctx context.Context, userID, ticketID string, points float64) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_scores (user_id, ticket_id, points) 
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, ticket_id) 
		DO UPDATE SET points = $3, awarded_at = NOW()`,
		userID, ticketID, points)
	return err
}

// RemovePoints removes points for a user from a specific ticket (when ticket is reopened or assignees change)
func (r *UserScoresRepo) RemovePoints(ctx context.Context, userID, ticketID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM user_scores WHERE user_id = $1 AND ticket_id = $2`, userID, ticketID)
	return err
}

// RemoveAllPointsForTicket removes all points awarded for a specific ticket
func (r *UserScoresRepo) RemoveAllPointsForTicket(ctx context.Context, ticketID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM user_scores WHERE ticket_id = $1`, ticketID)
	return err
}

// GetUserRankings returns top N users by total points
func (r *UserScoresRepo) GetUserRankings(ctx context.Context, limit int) ([]models.UserRanking, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, email, role, total_points, tickets_completed, rank
		FROM user_rankings 
		ORDER BY total_points DESC, name ASC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rankings []models.UserRanking
	for rows.Next() {
		var r models.UserRanking
		var totalPoints sql.NullFloat64
		var ticketsCompleted sql.NullInt32
		var rank sql.NullInt32

		if err := rows.Scan(&r.ID, &r.Name, &r.Email, &r.Role, &totalPoints, &ticketsCompleted, &rank); err != nil {
			return nil, err
		}

		r.TotalPoints = totalPoints.Float64
		r.TicketsCompleted = int(ticketsCompleted.Int32)
		r.Rank = int(rank.Int32)
		rankings = append(rankings, r)
	}

	return rankings, rows.Err()
}

// GetUserTotalPoints gets total points for a specific user
func (r *UserScoresRepo) GetUserTotalPoints(ctx context.Context, userID string) (float64, error) {
	var totalPoints sql.NullFloat64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(points), 0) as total_points
		FROM user_scores 
		WHERE user_id = $1`, userID).Scan(&totalPoints)
	
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	
	return totalPoints.Float64, nil
}

// GetTicketPointsDistribution gets current points distribution for a ticket
func (r *UserScoresRepo) GetTicketPointsDistribution(ctx context.Context, ticketID string) ([]models.UserScore, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, ticket_id, points, awarded_at
		FROM user_scores 
		WHERE ticket_id = $1
		ORDER BY awarded_at DESC`, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scores []models.UserScore
	for rows.Next() {
		var s models.UserScore
		if err := rows.Scan(&s.ID, &s.UserID, &s.TicketID, &s.Points, &s.AwardedAt); err != nil {
			return nil, err
		}
		scores = append(scores, s)
	}

	return scores, rows.Err()
}

// DistributePoints distributes points evenly among multiple assignees for a completed ticket
func (r *UserScoresRepo) DistributePoints(ctx context.Context, ticketID string, totalPoints float64, assigneeIDs []string) error {
	if len(assigneeIDs) == 0 {
		return errors.New("no assignees provided")
	}

	// Remove existing points for this ticket first
	if err := r.RemoveAllPointsForTicket(ctx, ticketID); err != nil {
		return err
	}

	// Calculate points per assignee
	pointsPerAssignee := totalPoints / float64(len(assigneeIDs))

	// Award points to each assignee
	for _, assigneeID := range assigneeIDs {
		if err := r.AwardPoints(ctx, assigneeID, ticketID, pointsPerAssignee); err != nil {
			return err
		}
	}

	return nil
}
