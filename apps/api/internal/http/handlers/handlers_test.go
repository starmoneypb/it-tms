package handlers

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/it-tms/apps/api/internal/http/middleware"
	"github.com/it-tms/apps/api/pkg/config"
)

func setupTestApp() (*fiber.App, *Handlers) {
	// Mock config
	cfg := config.Config{
		JWTSecret: "test-secret",
		DatabaseURL: "postgres://test:test@localhost:5432/test",
	}

	// Create mock pool (in real tests, you'd use a test database)
	pool := &pgxpool.Pool{}
	h := New(pool, cfg)

	app := fiber.New()
	app.Use(middleware.AuthOptional(cfg.JWTSecret))
	
	// Test routes
	app.Post("/api/v1/tickets", h.TicketsCreate)
	app.Patch("/api/v1/tickets/:id", middleware.AuthRequired(cfg.JWTSecret), h.TicketsUpdate)
	app.Patch("/api/v1/tickets/:id/fields", middleware.AuthRequired(cfg.JWTSecret), h.TicketsUpdateFields)
	app.Post("/api/v1/tickets/:id/status", middleware.AuthRequired(cfg.JWTSecret), h.TicketsStatus)

	return app, h
}

func TestRBAC_TicketCreation(t *testing.T) {
	app, _ := setupTestApp()

	tests := []struct {
		name           string
		userRole       string
		ticketType     string
		contactEmail   string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Anonymous can create Issue Report with contact email",
			userRole:       "Anonymous",
			ticketType:     "ISSUE_REPORT",
			contactEmail:   "test@example.com",
			expectedStatus: 201,
		},
		{
			name:           "Anonymous cannot create Issue Report without contact email",
			userRole:       "Anonymous",
			ticketType:     "ISSUE_REPORT",
			contactEmail:   "",
			expectedStatus: 400,
			expectedError:  "contact email required for anonymous users",
		},
		{
			name:           "Anonymous cannot create other ticket types",
			userRole:       "Anonymous",
			ticketType:     "CHANGE_REQUEST_NORMAL",
			contactEmail:   "test@example.com",
			expectedStatus: 403,
			expectedError:  "anonymous can only open issue reports",
		},
		{
			name:           "User can create Normal Change",
			userRole:       "User",
			ticketType:     "CHANGE_REQUEST_NORMAL",
			contactEmail:   "",
			expectedStatus: 201,
		},
		{
			name:           "User cannot create Data Correction",
			userRole:       "User",
			ticketType:     "SERVICE_REQUEST_DATA_CORRECTION",
			contactEmail:   "",
			expectedStatus: 403,
			expectedError:  "insufficient permissions for this ticket type",
		},
		{
			name:           "Supervisor can create Data Correction",
			userRole:       "Supervisor",
			ticketType:     "SERVICE_REQUEST_DATA_CORRECTION",
			contactEmail:   "",
			expectedStatus: 201,
		},
		{
			name:           "Manager can create Data Correction",
			userRole:       "Manager",
			ticketType:     "SERVICE_REQUEST_DATA_CORRECTION",
			contactEmail:   "",
			expectedStatus: 201,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"title":       "Test Ticket",
				"description": "Test Description",
				"initialType": tt.ticketType,
				"details":     map[string]interface{}{},
			}

			if tt.contactEmail != "" {
				payload["contactEmail"] = tt.contactEmail
			}

			body, _ := json.Marshal(payload)
			req := httptest.NewRequest("POST", "/api/v1/tickets", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			// Add user context if not anonymous
			if tt.userRole != "Anonymous" {
				req.Header.Set("Authorization", "Bearer test-token")
			}

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedStatus, resp.StatusCode)

			if tt.expectedError != "" {
				var result map[string]interface{}
				json.NewDecoder(resp.Body).Decode(&result)
				assert.Contains(t, result["error"], tt.expectedError)
			}
		})
	}
}

func TestRBAC_Middleware(t *testing.T) {
	cfg := config.Config{JWTSecret: "test-secret"}
	
	tests := []struct {
		name           string
		roles          []string
		userRole       string
		expectedStatus int
	}{
		{
			name:           "RequireAnyRole allows Supervisor",
			roles:          []string{"Supervisor", "Manager"},
			userRole:       "Supervisor",
			expectedStatus: 200,
		},
		{
			name:           "RequireAnyRole allows Manager",
			roles:          []string{"Supervisor", "Manager"},
			userRole:       "Manager",
			expectedStatus: 200,
		},
		{
			name:           "RequireAnyRole denies User",
			roles:          []string{"Supervisor", "Manager"},
			userRole:       "User",
			expectedStatus: 403,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(middleware.RequireAnyRole(cfg.JWTSecret, tt.roles))
			app.Get("/test", func(c *fiber.Ctx) error {
				return c.JSON(map[string]string{"status": "ok"})
			})

			req := httptest.NewRequest("GET", "/test", nil)
			req.Header.Set("Authorization", "Bearer test-token")

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedStatus, resp.StatusCode)
		})
	}
}

func TestRBAC_TicketFieldsUpdate(t *testing.T) {
	app, _ := setupTestApp()

	tests := []struct {
		name           string
		userRole       string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "User cannot update ticket fields",
			userRole:       "User",
			expectedStatus: 403,
			expectedError:  "only supervisors and managers can update ticket fields",
		},
		{
			name:           "Supervisor can update ticket fields",
			userRole:       "Supervisor",
			expectedStatus: 200,
		},
		{
			name:           "Manager can update ticket fields",
			userRole:       "Manager",
			expectedStatus: 200,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"priority": "P1",
				"redFlag": true,
			}

			body, _ := json.Marshal(payload)
			req := httptest.NewRequest("PATCH", "/api/v1/tickets/test-id/fields", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer test-token")

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedStatus, resp.StatusCode)

			if tt.expectedError != "" {
				var result map[string]interface{}
				json.NewDecoder(resp.Body).Decode(&result)
				assert.Contains(t, result["error"], tt.expectedError)
			}
		})
	}
}
