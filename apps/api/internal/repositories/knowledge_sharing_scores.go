package repositories

import (
	"context"
	"database/sql"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/it-tms/apps/api/internal/models"
)

type KnowledgeSharingScoresRepo struct{ pool *pgxpool.Pool }

// AwardPoints awards points to a user for knowledge sharing likes
func (r *KnowledgeSharingScoresRepo) AwardPoints(ctx context.Context, userID, documentID string, points float64) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO knowledge_sharing_scores (user_id, document_id, points) 
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, document_id) 
		DO UPDATE SET points = $3, awarded_at = NOW()`,
		userID, documentID, points)
	return err
}

// RemovePoints removes points for a user from a specific document
func (r *KnowledgeSharingScoresRepo) RemovePoints(ctx context.Context, userID, documentID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM knowledge_sharing_scores WHERE user_id = $1 AND document_id = $2`, userID, documentID)
	return err
}

// RemoveAllPointsForDocument removes all points awarded for a specific document
func (r *KnowledgeSharingScoresRepo) RemoveAllPointsForDocument(ctx context.Context, documentID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM knowledge_sharing_scores WHERE document_id = $1`, documentID)
	return err
}

// GetUserTotalKnowledgePoints gets total knowledge sharing points for a specific user
func (r *KnowledgeSharingScoresRepo) GetUserTotalKnowledgePoints(ctx context.Context, userID string) (float64, error) {
	var totalPoints sql.NullFloat64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(points), 0) as total_points
		FROM knowledge_sharing_scores 
		WHERE user_id = $1`, userID).Scan(&totalPoints)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}

	return totalPoints.Float64, nil
}

// GetDocumentPointsDistribution gets current points distribution for a document
func (r *KnowledgeSharingScoresRepo) GetDocumentPointsDistribution(ctx context.Context, documentID string) ([]models.KnowledgeSharingScore, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, document_id, points, awarded_at
		FROM knowledge_sharing_scores 
		WHERE document_id = $1
		ORDER BY awarded_at DESC`, documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scores []models.KnowledgeSharingScore
	for rows.Next() {
		var s models.KnowledgeSharingScore
		if err := rows.Scan(&s.ID, &s.UserID, &s.DocumentID, &s.Points, &s.AwardedAt); err != nil {
			return nil, err
		}
		scores = append(scores, s)
	}

	return scores, rows.Err()
}

// DistributePoints distributes points evenly among contributors for a document
func (r *KnowledgeSharingScoresRepo) DistributePoints(ctx context.Context, documentID string, totalPoints float64, userIDs []string) error {
	if len(userIDs) == 0 {
		return errors.New("no contributors provided")
	}

	// Deduplicate contributor IDs to make sure points are distributed evenly
	uniqueContributorIDs := make([]string, 0, len(userIDs))
	seen := make(map[string]struct{}, len(userIDs))
	for _, userID := range userIDs {
		if userID == "" {
			continue
		}
		if _, exists := seen[userID]; exists {
			continue
		}
		seen[userID] = struct{}{}
		uniqueContributorIDs = append(uniqueContributorIDs, userID)
	}

	if len(uniqueContributorIDs) == 0 {
		return errors.New("no contributors provided")
	}

	// Remove existing points for this document first
	if err := r.RemoveAllPointsForDocument(ctx, documentID); err != nil {
		return err
	}

	// Calculate points per user
	pointsPerUser := totalPoints / float64(len(uniqueContributorIDs))

	// Award points to each contributor
	for _, userID := range uniqueContributorIDs {
		if err := r.AwardPoints(ctx, userID, documentID, pointsPerUser); err != nil {
			return err
		}
	}

	return nil
}
