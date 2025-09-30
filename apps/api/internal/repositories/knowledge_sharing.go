package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/it-tms/apps/api/internal/models"
)

type KnowledgeSharingRepo struct {
	pool    *pgxpool.Pool
	userRepo *UserRepo
}

func NewKnowledgeSharingRepo(pool *pgxpool.Pool, userRepo *UserRepo) *KnowledgeSharingRepo {
	return &KnowledgeSharingRepo{
		pool:    pool,
		userRepo: userRepo,
	}
}

// Create creates a new knowledge sharing document
func (r *KnowledgeSharingRepo) Create(ctx context.Context, doc *models.KnowledgeSharingDocument) error {
	// Create the document
	row := r.pool.QueryRow(ctx, `
		INSERT INTO knowledge_sharing_documents (title, content, view_count)
		VALUES ($1, $2, 0)
		RETURNING id, created_at, updated_at`,
		doc.Title, doc.Content,
	)
	
	return row.Scan(&doc.ID, &doc.CreatedAt, &doc.UpdatedAt)
}

// GetByID retrieves a knowledge sharing document by ID
func (r *KnowledgeSharingRepo) GetByID(ctx context.Context, id string, userID *string) (*models.KnowledgeSharingDocument, error) {
	var doc models.KnowledgeSharingDocument
	var likeCount int
	var isLiked bool

	query := `
		SELECT 
			d.id, d.title, d.content, d.view_count, d.created_at, d.updated_at,
			COALESCE(like_count.count, 0) as like_count,
			CASE WHEN user_like.id IS NOT NULL THEN true ELSE false END as is_liked
		FROM knowledge_sharing_documents d
		LEFT JOIN (
			SELECT document_id, COUNT(*) as count
			FROM knowledge_sharing_likes
			GROUP BY document_id
		) like_count ON d.id = like_count.document_id
		LEFT JOIN knowledge_sharing_likes user_like ON d.id = user_like.document_id AND user_like.user_id = $2
		WHERE d.id = $1`

	args := []interface{}{id}
	if userID != nil {
		args = append(args, *userID)
	} else {
		args = append(args, nil)
	}

	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&doc.ID, &doc.Title, &doc.Content, &doc.ViewCount, &doc.CreatedAt, &doc.UpdatedAt,
		&likeCount, &isLiked,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("document not found")
		}
		return nil, err
	}

	doc.LikeCount = likeCount
	doc.IsLiked = isLiked

	// Load contributors
	contributors, err := r.GetContributors(ctx, id)
	if err != nil {
		return nil, err
	}
	if contributors == nil {
		contributors = []models.User{}
	}
	doc.Contributors = contributors

	// Set permissions based on contributors or Manager/Supervisor role
	if userID != nil {
		isContributor := r.isContributor(ctx, id, *userID)
		hasManagerOrSupervisorRole := r.hasManagerOrSupervisorRole(ctx, *userID)
		
		doc.CanEdit = isContributor || hasManagerOrSupervisorRole
		doc.CanDelete = isContributor || hasManagerOrSupervisorRole
		
	}

	return &doc, nil
}

// List retrieves knowledge sharing documents with filtering
func (r *KnowledgeSharingRepo) List(ctx context.Context, filters models.KnowledgeSharingFilters, userID *string) ([]models.KnowledgeSharingDocument, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	// Base query
	query := `
		SELECT 
			d.id, d.title, d.content, d.view_count, d.created_at, d.updated_at,
			COALESCE(like_count.count, 0) as like_count,
			CASE WHEN user_like.id IS NOT NULL THEN true ELSE false END as is_liked
		FROM knowledge_sharing_documents d
		LEFT JOIN (
			SELECT document_id, COUNT(*) as count
			FROM knowledge_sharing_likes
			GROUP BY document_id
		) like_count ON d.id = like_count.document_id
		LEFT JOIN knowledge_sharing_likes user_like ON d.id = user_like.document_id AND user_like.user_id = $` + fmt.Sprintf("%d", argIndex)

	if userID != nil {
		args = append(args, *userID)
	} else {
		args = append(args, nil)
	}
	argIndex++

	// Add filters
	if filters.Query != "" {
		conditions = append(conditions, fmt.Sprintf("(d.title ILIKE $%d OR d.content ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+filters.Query+"%")
		argIndex++
	}

	if filters.ContributorID != "" {
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM knowledge_sharing_contributors c WHERE c.document_id = d.id AND c.user_id = $%d)", argIndex))
		args = append(args, filters.ContributorID)
		argIndex++
	}

	// All documents are published (no draft functionality)

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add sorting
	switch filters.SortBy {
	case "oldest":
		query += " ORDER BY d.created_at ASC"
	case "popular":
		query += " ORDER BY (d.view_count + COALESCE(like_count.count, 0)) DESC, d.created_at DESC"
	case "likes":
		query += " ORDER BY COALESCE(like_count.count, 0) DESC, d.created_at DESC"
	case "views":
		query += " ORDER BY d.view_count DESC, d.created_at DESC"
	default: // "newest"
		query += " ORDER BY d.created_at DESC"
	}

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filters.Limit)
		argIndex++
	}

	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filters.Offset)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var documents []models.KnowledgeSharingDocument
	for rows.Next() {
		var doc models.KnowledgeSharingDocument
		var likeCount int
		var isLiked bool

		err := rows.Scan(
			&doc.ID, &doc.Title, &doc.Content, &doc.ViewCount, &doc.CreatedAt, &doc.UpdatedAt,
			&likeCount, &isLiked,
		)
		if err != nil {
			return nil, err
		}

		doc.LikeCount = likeCount
		doc.IsLiked = isLiked

		// Load contributors for each document
		contributors, err := r.GetContributors(ctx, doc.ID)
		if err != nil {
			return nil, err
		}
		if contributors == nil {
			contributors = []models.User{}
		}
		doc.Contributors = contributors

		// Set permissions based on contributors or Manager/Supervisor role
		if userID != nil {
			isContributor := r.isContributor(ctx, doc.ID, *userID)
			hasManagerOrSupervisorRole := r.hasManagerOrSupervisorRole(ctx, *userID)
			
			doc.CanEdit = isContributor || hasManagerOrSupervisorRole
			doc.CanDelete = isContributor || hasManagerOrSupervisorRole
		}

		documents = append(documents, doc)
	}

	return documents, rows.Err()
}

// Update updates a knowledge sharing document
func (r *KnowledgeSharingRepo) Update(ctx context.Context, doc *models.KnowledgeSharingDocument) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE knowledge_sharing_documents 
		SET title = $1, content = $2, updated_at = NOW()
		WHERE id = $3`,
		doc.Title, doc.Content, doc.ID,
	)
	return err
}

// Delete deletes a knowledge sharing document
func (r *KnowledgeSharingRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM knowledge_sharing_documents WHERE id = $1`, id)
	return err
}

// GetContributors retrieves contributors for a document
func (r *KnowledgeSharingRepo) GetContributors(ctx context.Context, documentID string) ([]models.User, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id, u.name, u.email, u.role, u.profile_picture
		FROM knowledge_sharing_contributors c
		JOIN users u ON c.user_id = u.id
		WHERE c.document_id = $1
		ORDER BY c.added_at ASC`,
		documentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contributors []models.User
	for rows.Next() {
		var user models.User
		var profilePicture *string
		err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &profilePicture)
		if err != nil {
			return nil, err
		}
		user.ProfilePicture = profilePicture
		contributors = append(contributors, user)
	}

	if contributors == nil {
		contributors = []models.User{}
	}
	return contributors, rows.Err()
}

// AddContributor adds a contributor to a document
func (r *KnowledgeSharingRepo) AddContributor(ctx context.Context, documentID, userID, addedBy string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO knowledge_sharing_contributors (document_id, user_id, added_by)
		VALUES ($1, $2, $3)
		ON CONFLICT (document_id, user_id) DO NOTHING`,
		documentID, userID, addedBy,
	)
	return err
}

// RemoveContributor removes a contributor from a document
func (r *KnowledgeSharingRepo) RemoveContributor(ctx context.Context, documentID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM knowledge_sharing_contributors 
		WHERE document_id = $1 AND user_id = $2`,
		documentID, userID,
	)
	return err
}

// isContributor checks if a user is a contributor to a document
func (r *KnowledgeSharingRepo) isContributor(ctx context.Context, documentID, userID string) bool {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM knowledge_sharing_contributors 
		WHERE document_id = $1 AND user_id = $2`,
		documentID, userID,
	).Scan(&count)
	
	
	return err == nil && count > 0
}

// hasManagerOrSupervisorRole checks if a user has Manager or Supervisor role
func (r *KnowledgeSharingRepo) hasManagerOrSupervisorRole(ctx context.Context, userID string) bool {
	var role string
	err := r.pool.QueryRow(ctx, `
		SELECT role FROM users WHERE id = $1`,
		userID,
	).Scan(&role)
	
	if err != nil {
		return false
	}
	
	return role == "Manager" || role == "Supervisor"
}

// LikeDocument adds a like to a document
func (r *KnowledgeSharingRepo) LikeDocument(ctx context.Context, documentID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO knowledge_sharing_likes (document_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT (document_id, user_id) DO NOTHING`,
		documentID, userID,
	)
	return err
}

// UnlikeDocument removes a like from a document
func (r *KnowledgeSharingRepo) UnlikeDocument(ctx context.Context, documentID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM knowledge_sharing_likes 
		WHERE document_id = $1 AND user_id = $2`,
		documentID, userID,
	)
	return err
}

// IncrementViewCount increments the view count for a document (only if user hasn't viewed it before)
func (r *KnowledgeSharingRepo) IncrementViewCount(ctx context.Context, documentID, userID string, ipAddress, userAgent string) error {
	// First, try to insert a new view record
	_, err := r.pool.Exec(ctx, `
		INSERT INTO knowledge_sharing_views (document_id, user_id, ip_address, user_agent)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (document_id, user_id) DO NOTHING`,
		documentID, userID, ipAddress, userAgent,
	)
	
	if err != nil {
		return err
	}
	
	// Update the view_count column with the accurate count
	_, err = r.pool.Exec(ctx, `
		UPDATE knowledge_sharing_documents 
		SET view_count = (
			SELECT COUNT(DISTINCT user_id) 
			FROM knowledge_sharing_views 
			WHERE document_id = $1
		)
		WHERE id = $1`,
		documentID,
	)
	
	return err
}

