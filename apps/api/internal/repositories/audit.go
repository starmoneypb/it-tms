package repositories

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditRepo struct{ pool *pgxpool.Pool }

func (r *AuditRepo) Insert(ctx context.Context, ticketID string, actorID *string, action string, before, after any) error {
	var b []byte
	if after != nil {
		b, _ = json.Marshal(after)
	}
	_, err := r.pool.Exec(ctx, `INSERT INTO audit_logs (ticket_id, actor_id, action, after) VALUES ($1,$2,$3,$4)`, ticketID, actorID, action, b)
	return err
}