package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// User struct for seeding
type usr struct{ id, email, name, role string }

func main() {
	dburl := env("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/it_tms?sslmode=disable")
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dburl)
	if err != nil { panic(err) }
	defer pool.Close()

	fmt.Println("Clearing existing users...")
	_, _ = pool.Exec(ctx, `DELETE FROM users`)
	
	fmt.Println("Seeding users...")
	users := []struct{
		Name, Email, Role, Password string
	}{
		// Thai users as requested
		{"พิชญ์ชาญ ลาวัณย์เสถียร", "peachchan@demo.com", "Manager", "Password!1"},
		{"สาโรจน์ สรรเสริญ", "saroge@demo.com", "Supervisor", "Password!1"},
		{"มานิตย์ ขวัญยืน", "manit@demo.com", "User", "Password!1"},
		{"ณัชชา มะลิวัลย์", "natcha@demo.com", "User", "Password!1"},
		{"แพรวพรรณ ศักดิ์ติมงคล", "praewpan@demo.com", "User", "Password!1"},
		{"อิสรา ขวัญนัทธี", "isara@demo.com", "User", "Password!1"},
		{"สิริพรภา แฝงนาคำ", "siripornpa@demo.com", "User", "Password!1"},
		{"ธีรัช นาคสุทธิ์", "teerat@demo.com", "User", "Password!1"},
	}
	for _, u := range users {
		hash, _ := bcrypt.GenerateFromPassword([]byte(u.Password), 12)
		_, _ = pool.Exec(ctx, `INSERT INTO users (name, email, role, password_hash) 
								VALUES ($1,$2,$3,$4)`,
			u.Name, u.Email, u.Role, string(hash))
	}

	// Clear existing tickets and related data
	fmt.Println("Clearing existing tickets...")
	_, _ = pool.Exec(ctx, `DELETE FROM user_scores`)
	_, _ = pool.Exec(ctx, `DELETE FROM audit_logs`)
	_, _ = pool.Exec(ctx, `DELETE FROM comment_attachments`)
	_, _ = pool.Exec(ctx, `DELETE FROM comments`)
	_, _ = pool.Exec(ctx, `DELETE FROM ticket_assignments`)
	_, _ = pool.Exec(ctx, `DELETE FROM attachments`)
	_, _ = pool.Exec(ctx, `DELETE FROM tickets`)
	
	fmt.Println("Ticket seeding disabled - starting with zero tickets for testing")
	// Note: All ticket creation logic has been disabled per user request
	// Only users will be seeded, no tickets will be created
}

func env(k, d string) string {
	if v, ok := os.LookupEnv(k); ok { return v }
	return d
}