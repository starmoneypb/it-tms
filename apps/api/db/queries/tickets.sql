-- name: CreateTicket :one
INSERT INTO tickets (created_by, initial_type, status, title, description, details, impact_score, urgency_score, final_score, red_flag, priority)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
RETURNING *;

-- name: ListTickets :many
SELECT * FROM tickets ORDER BY 
	CASE priority 
		WHEN 'P0' THEN 0 
		WHEN 'P1' THEN 1 
		WHEN 'P2' THEN 2 
		WHEN 'P3' THEN 3 
		ELSE 4 
	END ASC, 
	updated_at DESC, 
	effort_score ASC 
LIMIT $1 OFFSET $2;

-- name: GetTicket :one
SELECT * FROM tickets WHERE id=$1;

-- name: UpdateTicket :exec
UPDATE tickets SET title=COALESCE($2,title), description=COALESCE($3,description), details=COALESCE($4,details), updated_at=NOW() WHERE id=$1;

-- name: AssignTicket :exec
UPDATE tickets SET assignee_id=$2, updated_at=NOW() WHERE id=$1;

-- name: ChangeStatus :exec
UPDATE tickets SET status=$2, updated_at=NOW() WHERE id=$1;

-- name: UpdateTicketFields :exec
UPDATE tickets SET 
  initial_type=COALESCE($2,initial_type),
  resolved_type=COALESCE($3,resolved_type),
  priority=COALESCE($4,priority),
  impact_score=COALESCE($5,impact_score),
  urgency_score=COALESCE($6,urgency_score),
  final_score=COALESCE($7,final_score),
  red_flag=COALESCE($8,red_flag),
  updated_at=NOW() 
WHERE id=$1;