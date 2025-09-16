package repositories

import "github.com/jackc/pgx/v5/pgxpool"

type Repo struct {
	Users   *UserRepo
	Tickets *TicketRepo
	Audits  *AuditRepo
	Metrics *MetricsRepo
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{
		Users:   &UserRepo{pool: pool},
		Tickets: &TicketRepo{pool: pool},
		Audits:  &AuditRepo{pool: pool},
		Metrics: &MetricsRepo{pool: pool},
	}
}