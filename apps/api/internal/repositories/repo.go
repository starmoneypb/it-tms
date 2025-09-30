package repositories

import "github.com/jackc/pgx/v5/pgxpool"

type Repo struct {
	Users                    *UserRepo
	Tickets                  *TicketRepo
	Audits                   *AuditRepo
	Metrics                  *MetricsRepo
	UserScores               *UserScoresRepo
	KnowledgeSharing         *KnowledgeSharingRepo
	KnowledgeSharingScores   *KnowledgeSharingScoresRepo
}

func New(pool *pgxpool.Pool) *Repo {
	userRepo := &UserRepo{pool: pool}
	return &Repo{
		Users:                    userRepo,
		Tickets:                  &TicketRepo{pool: pool, userRepo: userRepo},
		Audits:                   &AuditRepo{pool: pool},
		Metrics:                  &MetricsRepo{pool: pool},
		UserScores:               &UserScoresRepo{pool: pool},
		KnowledgeSharing:         NewKnowledgeSharingRepo(pool, userRepo),
		KnowledgeSharingScores:   &KnowledgeSharingScoresRepo{pool: pool},
	}
}