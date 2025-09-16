package repositories

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/it-tms/apps/api/internal/models"
)

var ErrNotFound = errors.New("not found")

type UserRepo struct{ pool *pgxpool.Pool }

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (models.User, error) {
	row := r.pool.QueryRow(ctx, `SELECT id, name, email, role, password_hash, created_at, updated_at FROM users WHERE email=$1`, email)
	var u models.User
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return u, ErrNotFound }
		return u, err
	}
	return u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (models.User, error) {
	row := r.pool.QueryRow(ctx, `SELECT id, name, email, role, password_hash, created_at, updated_at FROM users WHERE id=$1`, id)
	var u models.User
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return u, ErrNotFound }
		return u, err
	}
	return u, nil
}

func (r *UserRepo) Create(ctx context.Context, u models.User) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO users (name, email, role, password_hash) VALUES ($1,$2,$3,$4)`, u.Name, u.Email, u.Role, u.PasswordHash)
	return err
}