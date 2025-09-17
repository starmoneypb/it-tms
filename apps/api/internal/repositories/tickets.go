package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/it-tms/apps/api/internal/models"
)

type TicketRepo struct{ pool *pgxpool.Pool }

func (r *TicketRepo) Create(ctx context.Context, t *models.Ticket) error {
	details, _ := json.Marshal(t.Details)
	row := r.pool.QueryRow(ctx, `INSERT INTO tickets 
		(created_by, contact_email, contact_phone, initial_type, status, title, description, details, impact_score, urgency_score, final_score, red_flag, priority) 
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, code, created_at, updated_at`,
		t.CreatedBy, t.ContactEmail, t.ContactPhone, t.InitialType, t.Status, t.Title, t.Description, details, t.ImpactScore, t.UrgencyScore, t.FinalScore, t.RedFlag, t.Priority,
	)
	return row.Scan(&t.ID, &t.Code, &t.CreatedAt, &t.UpdatedAt)
}

type TicketFilters struct {
	Status     string
	Priority   string
	AssigneeID string
	CreatedBy  string
	Query      string
}

func (r *TicketRepo) List(ctx context.Context, f TicketFilters, offset, limit int) ([]models.Ticket, int64, error) {
	clauses := []string{"1=1"}
	args := []any{}
	arg := 1
	if f.Status != "" {
		clauses = append(clauses, fmt.Sprintf("status = $%d", arg)); args = append(args, f.Status); arg++
	}
	if f.Priority != "" {
		clauses = append(clauses, fmt.Sprintf("priority = $%d", arg)); args = append(args, f.Priority); arg++
	}
	if f.AssigneeID != "" {
		clauses = append(clauses, fmt.Sprintf("assignee_id = $%d", arg)); args = append(args, f.AssigneeID); arg++
	}
	if f.CreatedBy != "" {
		clauses = append(clauses, fmt.Sprintf("created_by = $%d", arg)); args = append(args, f.CreatedBy); arg++
	}
	if f.Query != "" {
		clauses = append(clauses, fmt.Sprintf("to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $%d)", arg))
		args = append(args, f.Query); arg++
	}

	where := strings.Join(clauses, " AND ")
	sql := fmt.Sprintf(`SELECT id, code, created_by, contact_email, contact_phone, initial_type, resolved_type, status, title, description, details, impact_score, urgency_score, final_score, red_flag, priority, assignee_id, created_at, updated_at, closed_at
	        FROM tickets WHERE %s ORDER BY created_at DESC OFFSET $%d LIMIT $%d`, where, arg, arg+1)
	args = append(args, offset, limit)

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil { return nil, 0, err }
	defer rows.Close()

	items := []models.Ticket{}
	for rows.Next() {
		var t models.Ticket
		var details []byte
		err := rows.Scan(&t.ID, &t.Code, &t.CreatedBy, &t.ContactEmail, &t.ContactPhone, &t.InitialType, &t.ResolvedType, &t.Status, &t.Title, &t.Description, &details, &t.ImpactScore, &t.UrgencyScore, &t.FinalScore, &t.RedFlag, &t.Priority, &t.AssigneeID, &t.CreatedAt, &t.UpdatedAt, &t.ClosedAt)
		if err != nil { return nil, 0, err }
		json.Unmarshal(details, &t.Details)
		items = append(items, t)
	}

	// total
	countArgs := args[:len(args)-2] // Remove offset and limit from args
	var total int64
	if len(countArgs) == 0 {
		row := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tickets`)
		if err := row.Scan(&total); err != nil { return nil, 0, err }
	} else {
		row := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tickets WHERE `+where, countArgs...)
		if err := row.Scan(&total); err != nil { return nil, 0, err }
	}

	return items, total, nil
}

func (r *TicketRepo) GetByID(ctx context.Context, id string) (models.Ticket, error) {
	var t models.Ticket
	var details []byte
	row := r.pool.QueryRow(ctx, `SELECT id, code, created_by, contact_email, contact_phone, initial_type, resolved_type, status, title, description, details, impact_score, urgency_score, final_score, red_flag, priority, assignee_id, created_at, updated_at, closed_at FROM tickets WHERE id=$1`, id)
	if err := row.Scan(&t.ID, &t.Code, &t.CreatedBy, &t.ContactEmail, &t.ContactPhone, &t.InitialType, &t.ResolvedType, &t.Status, &t.Title, &t.Description, &details, &t.ImpactScore, &t.UrgencyScore, &t.FinalScore, &t.RedFlag, &t.Priority, &t.AssigneeID, &t.CreatedAt, &t.UpdatedAt, &t.ClosedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return t, ErrNotFound }
		return t, err
	}
	json.Unmarshal(details, &t.Details)
	return t, nil
}

func (r *TicketRepo) GetWithRelations(ctx context.Context, id string) (models.Ticket, []models.Comment, []models.Attachment, error) {
	var t models.Ticket
	var details []byte
	row := r.pool.QueryRow(ctx, `SELECT id, code, created_by, contact_email, contact_phone, initial_type, resolved_type, status, title, description, details, impact_score, urgency_score, final_score, red_flag, priority, assignee_id, created_at, updated_at, closed_at FROM tickets WHERE id=$1`, id)
	if err := row.Scan(&t.ID, &t.Code, &t.CreatedBy, &t.ContactEmail, &t.ContactPhone, &t.InitialType, &t.ResolvedType, &t.Status, &t.Title, &t.Description, &details, &t.ImpactScore, &t.UrgencyScore, &t.FinalScore, &t.RedFlag, &t.Priority, &t.AssigneeID, &t.CreatedAt, &t.UpdatedAt, &t.ClosedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return t, nil, nil, ErrNotFound }
		return t, nil, nil, err
	}
	json.Unmarshal(details, &t.Details)

	comments := []models.Comment{}
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.ticket_id, c.author_id, u.name, u.role, c.body, c.created_at 
		FROM comments c
		LEFT JOIN users u ON c.author_id = u.id
		WHERE c.ticket_id=$1 
		ORDER BY c.created_at ASC`, id)
	if err == nil {
		for rows.Next() {
			var c models.Comment
			rows.Scan(&c.ID, &c.TicketID, &c.AuthorID, &c.AuthorName, &c.AuthorRole, &c.Body, &c.CreatedAt)
			comments = append(comments, c)
		}
		rows.Close()
	}

	atts := []models.Attachment{}
	r2, err := r.pool.Query(ctx, `SELECT id, ticket_id, filename, mime, size, path, created_at FROM attachments WHERE ticket_id=$1 ORDER BY created_at ASC`, id)
	if err == nil {
		for r2.Next() {
			var a models.Attachment
			r2.Scan(&a.ID, &a.TicketID, &a.Filename, &a.MIME, &a.Size, &a.Path, &a.CreatedAt)
			atts = append(atts, a)
		}
		r2.Close()
	}

	// Fetch assignees
	assignees := []models.User{}
	r3, err := r.pool.Query(ctx, `
		SELECT u.id, u.name, u.email, u.role, u.profile_picture, u.created_at, u.updated_at
		FROM ticket_assignments ta
		JOIN users u ON ta.assignee_id = u.id
		WHERE ta.ticket_id=$1 
		ORDER BY ta.assigned_at ASC`, id)
	if err == nil {
		for r3.Next() {
			var u models.User
			r3.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.ProfilePicture, &u.CreatedAt, &u.UpdatedAt)
			assignees = append(assignees, u)
		}
		r3.Close()
	}
	t.Assignees = assignees

	return t, comments, atts, nil
}

func (r *TicketRepo) Update(ctx context.Context, id string, title, description *string, details map[string]any) error {
	if title == nil && description == nil && details == nil {
		return nil
	}
	set := []string{}
	args := []any{}
	arg := 1
	if title != nil {
		set = append(set, fmt.Sprintf("title=$%d", arg))
		args = append(args, *title); arg++
	}
	if description != nil {
		set = append(set, fmt.Sprintf("description=$%d", arg))
		args = append(args, *description); arg++
	}
	if details != nil {
		b, _ := json.Marshal(details)
		set = append(set, fmt.Sprintf("details=$%d", arg))
		args = append(args, b); arg++
	}
	args = append(args, id)
	sql := fmt.Sprintf("UPDATE tickets SET %s, updated_at=NOW() WHERE id=$%d", strings.Join(set, ","), arg)
	_, err := r.pool.Exec(ctx, sql, args...)
	return err
}

func (r *TicketRepo) Assign(ctx context.Context, id string, assigneeID *string) error {
	_, err := r.pool.Exec(ctx, `UPDATE tickets SET assignee_id=$1, updated_at=NOW() WHERE id=$2`, assigneeID, id)
	return err
}

func (r *TicketRepo) ChangeStatus(ctx context.Context, id string, status models.TicketStatus) error {
	now := time.Now()
	var closedAt *time.Time
	if status == models.StatusCompleted || status == models.StatusCanceled {
		closedAt = &now
	}
	_, err := r.pool.Exec(ctx, `UPDATE tickets SET status=$1, closed_at=$2, updated_at=NOW() WHERE id=$3`, status, closedAt, id)
	return err
}

func (r *TicketRepo) UpdateTicketFields(ctx context.Context, id string, initialType *models.TicketInitialType, resolvedType *models.TicketResolvedType, priority *models.TicketPriority, impactScore, urgencyScore, finalScore *int32, redFlag *bool) error {
	args := []any{id}
	set := []string{}
	arg := 2
	
	if initialType != nil {
		set = append(set, fmt.Sprintf("initial_type=$%d", arg))
		args = append(args, *initialType)
		arg++
	}
	if resolvedType != nil {
		set = append(set, fmt.Sprintf("resolved_type=$%d", arg))
		args = append(args, *resolvedType)
		arg++
	}
	if priority != nil {
		set = append(set, fmt.Sprintf("priority=$%d", arg))
		args = append(args, *priority)
		arg++
	}
	if impactScore != nil {
		set = append(set, fmt.Sprintf("impact_score=$%d", arg))
		args = append(args, *impactScore)
		arg++
	}
	if urgencyScore != nil {
		set = append(set, fmt.Sprintf("urgency_score=$%d", arg))
		args = append(args, *urgencyScore)
		arg++
	}
	if finalScore != nil {
		set = append(set, fmt.Sprintf("final_score=$%d", arg))
		args = append(args, *finalScore)
		arg++
	}
	if redFlag != nil {
		set = append(set, fmt.Sprintf("red_flag=$%d", arg))
		args = append(args, *redFlag)
		arg++
	}
	
	if len(set) == 0 {
		return nil
	}
	
	sql := fmt.Sprintf("UPDATE tickets SET %s, updated_at=NOW() WHERE id=$1", strings.Join(set, ","))
	_, err := r.pool.Exec(ctx, sql, args...)
	return err
}

func (r *TicketRepo) AddComment(ctx context.Context, id string, authorID *string, body string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO comments (ticket_id, author_id, body) VALUES ($1,$2,$3)`, id, authorID, body)
	return err
}

func (r *TicketRepo) AddAttachment(ctx context.Context, id, filename, mime string, size int64, path string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO attachments (ticket_id, filename, mime, size, path) VALUES ($1,$2,$3,$4,$5)`, id, filename, mime, size, path)
	return err
}

func (r *TicketRepo) Classify(ctx context.Context, id string, resolved models.TicketResolvedType) error {
	// only classify Issue Report
	row := r.pool.QueryRow(ctx, `SELECT initial_type FROM tickets WHERE id=$1`, id)
	var initial string
	if err := row.Scan(&initial); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return ErrNotFound }
		return err
	}
	if initial != string(models.InitialIssueReport) {
		return errors.New("only ISSUE_REPORT can be classified")
	}
	_, err := r.pool.Exec(ctx, `UPDATE tickets SET resolved_type=$1, updated_at=NOW() WHERE id=$2`, resolved, id)
	return err
}

// Multi-assignee methods
func (r *TicketRepo) AssignUsers(ctx context.Context, ticketID string, assigneeIDs []string, assignedBy *string) error {
	if len(assigneeIDs) == 0 {
		return nil
	}
	
	// Insert new assignments
	for _, assigneeID := range assigneeIDs {
		_, err := r.pool.Exec(ctx, `
			INSERT INTO ticket_assignments (ticket_id, assignee_id, assigned_by) 
			VALUES ($1, $2, $3)
			ON CONFLICT (ticket_id, assignee_id) DO NOTHING`, 
			ticketID, assigneeID, assignedBy)
		if err != nil {
			return err
		}
	}
	
	// Update ticket timestamp
	_, err := r.pool.Exec(ctx, `UPDATE tickets SET updated_at=NOW() WHERE id=$1`, ticketID)
	return err
}

func (r *TicketRepo) UnassignUsers(ctx context.Context, ticketID string, assigneeIDs []string) error {
	if len(assigneeIDs) == 0 {
		return nil
	}
	
	// Build placeholders for IN clause
	placeholders := make([]string, len(assigneeIDs))
	args := []any{ticketID}
	for i, assigneeID := range assigneeIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, assigneeID)
	}
	
	sql := fmt.Sprintf(`DELETE FROM ticket_assignments WHERE ticket_id=$1 AND assignee_id IN (%s)`, 
		strings.Join(placeholders, ","))
	
	_, err := r.pool.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}
	
	// Update ticket timestamp
	_, err = r.pool.Exec(ctx, `UPDATE tickets SET updated_at=NOW() WHERE id=$1`, ticketID)
	return err
}

func (r *TicketRepo) GetAssignees(ctx context.Context, ticketID string) ([]models.User, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id, u.name, u.email, u.role, u.profile_picture, u.created_at, u.updated_at
		FROM ticket_assignments ta
		JOIN users u ON ta.assignee_id = u.id
		WHERE ta.ticket_id=$1 
		ORDER BY ta.assigned_at ASC`, ticketID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var assignees []models.User
	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.ProfilePicture, &u.CreatedAt, &u.UpdatedAt)
		if err != nil {
			return nil, err
		}
		assignees = append(assignees, u)
	}
	
	return assignees, nil
}