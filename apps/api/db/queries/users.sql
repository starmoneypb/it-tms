-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: CreateUser :exec
INSERT INTO users (name, email, role, password_hash) VALUES ($1,$2,$3,$4);