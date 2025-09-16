package main

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/it-tms/apps/api/internal/models"
)

func main() {
	dburl := env("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/it_tms?sslmode=disable")
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dburl)
	if err != nil { panic(err) }
	defer pool.Close()

	fmt.Println("Seeding users...")
	users := []struct{
		Name, Email, Role, Password string
	}{
		{"Manager", "manager@example.com", "Manager", "Password!1"},
		{"Supervisor", "supervisor@example.com", "Supervisor", "Password!1"},
		{"User", "user@example.com", "User", "Password!1"},
	}
	for _, u := range users {
		hash, _ := bcrypt.GenerateFromPassword([]byte(u.Password), 12)
		_, _ = pool.Exec(ctx, `INSERT INTO users (name, email, role, password_hash) 
								VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
			u.Name, u.Email, u.Role, string(hash))
	}

	fmt.Println("Seeding tickets...")
	// Fetch user ids
	type usr struct{ id, email string }
	all := []usr{}
	rows, _ := pool.Query(ctx, `SELECT id, email FROM users`)
	for rows.Next() { var u usr; rows.Scan(&u.id, &u.email); all = append(all, u) }
	rows.Close()

	initials := []models.TicketInitialType{
		models.InitialIssueReport,
		models.InitialChangeRequestNormal,
		models.InitialServiceDataCorrection,
		models.InitialServiceDataExtraction,
		models.InitialServiceAdvisory,
		models.InitialServiceGeneral,
	}
	statuses := []models.TicketStatus{
		models.StatusPending, models.StatusInProgress, models.StatusCompleted,
	}
	prios := []models.TicketPriority{models.PriorityP0, models.PriorityP1, models.PriorityP2, models.PriorityP3}

	rand.Seed(time.Now().UnixNano())
	for i := 0; i < 24; i++ {
		init := initials[rand.Intn(len(initials))]
		status := statuses[rand.Intn(len(statuses))]
		prio := prios[rand.Intn(len(prios))]
		createdBy := all[rand.Intn(len(all))].id

		// Ensure some P0
		red := prio == models.PriorityP0
		title := fmt.Sprintf("Sample Ticket %d", i+1)
		desc := "Auto-seeded ticket to demo the dashboard and flows."
		_, err := pool.Exec(ctx, `INSERT INTO tickets (created_by, initial_type, status, title, description, details, impact_score, urgency_score, final_score, red_flag, priority, updated_at)
			VALUES ($1,$2,$3,$4,$5,'{}',3,2,5,$6,$7, NOW() - ($8 || ' hours')::interval)`, createdBy, init, status, title, desc, red, prio, fmt.Sprintf("%d", i))
		if err != nil { fmt.Println("ticket insert:", err) }
	}
	fmt.Println("Seed complete.")
}

func env(k, d string) string {
	if v, ok := os.LookupEnv(k); ok { return v }
	return d
}