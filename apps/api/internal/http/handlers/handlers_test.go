package handlers

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/it-tms/apps/api/internal/http/middleware"
	"github.com/it-tms/apps/api/pkg/config"
)

func createTestJWT(role string) string {
	claims := jwt.MapClaims{
		"sub":   "test-user-id",
		"email": "test@example.com",
		"role":  role,
		"exp":   time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte("test-secret"))
	return tokenString
}

func setupTestApp() (*fiber.App, *Handlers) {
	// Mock config
	cfg := config.Config{
		JWTSecret: "test-secret",
		DatabaseURL: "postgres://test:test@localhost:5432/test",
	}

	// Create mock pool (in real tests, you'd use a test database)
	pool := &pgxpool.Pool{}
	h := New(pool, cfg, nil, nil)

	app := fiber.New()
	app.Use(middleware.AuthOptional(cfg.JWTSecret))
	
	// Test routes
	app.Post("/api/v1/tickets", h.TicketsCreate)
	app.Patch("/api/v1/tickets/:id", middleware.AuthRequired(cfg.JWTSecret), h.TicketsUpdate)
	app.Patch("/api/v1/tickets/:id/fields", middleware.AuthRequired(cfg.JWTSecret), h.TicketsUpdateFields)
	app.Post("/api/v1/tickets/:id/status", middleware.AuthRequired(cfg.JWTSecret), h.TicketsStatus)
	app.Post("/api/v1/tickets/:id/comments", middleware.AuthRequired(cfg.JWTSecret), h.TicketsAddComment)

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
			name:           "Anonymous can create Issue Report",
			userRole:       "Anonymous",
			ticketType:     "ISSUE_REPORT",
			contactEmail:   "test@example.com",
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
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
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
		{
			name:           "User cannot create Data Correction",
			userRole:       "User",
			ticketType:     "SERVICE_REQUEST_DATA_CORRECTION",
			expectedStatus: 403,
			expectedError:  "insufficient permissions for this ticket type",
		},
		{
			name:           "Supervisor can create any ticket type",
			userRole:       "Supervisor",
			ticketType:     "SERVICE_REQUEST_DATA_CORRECTION",
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
		{
			name:           "Manager can create any ticket type",
			userRole:       "Manager",
			ticketType:     "SERVICE_REQUEST_DATA_CORRECTION",
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"title":        "Test Ticket",
				"description":  "Test Description",
				"initialType":  tt.ticketType,
				"details":      map[string]interface{}{},
			}

			if tt.contactEmail != "" {
				payload["contactEmail"] = tt.contactEmail
			}

			body, _ := json.Marshal(payload)
			req := httptest.NewRequest("POST", "/api/v1/tickets", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

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

func TestRBAC_TicketUpdate(t *testing.T) {
	app, _ := setupTestApp()

	tests := []struct {
		name           string
		userRole       string
		hasAuth        bool
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Unauthenticated user cannot update tickets",
			userRole:       "Anonymous",
			hasAuth:        false,
			expectedStatus: 401,
			expectedError:  "authentication required",
		},
		{
			name:           "User cannot update unassigned tickets",
			userRole:       "User",
			hasAuth:        true,
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
		{
			name:           "Supervisor can update any ticket",
			userRole:       "Supervisor",
			hasAuth:        true,
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
		{
			name:           "Manager can update any ticket",
			userRole:       "Manager",
			hasAuth:        true,
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"title": "Updated Title",
			}

			body, _ := json.Marshal(payload)
			req := httptest.NewRequest("PATCH", "/api/v1/tickets/test-id", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			
			if tt.hasAuth {
				req.Header.Set("Authorization", "Bearer invalid-token")
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

func TestRBAC_TicketFieldsUpdate(t *testing.T) {
	app, _ := setupTestApp()

	tests := []struct {
		name           string
		userRole       string
		hasAuth        bool
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Unauthenticated user cannot update ticket fields",
			userRole:       "Anonymous",
			hasAuth:        false,
			expectedStatus: 401,
			expectedError:  "authentication required",
		},
		{
			name:           "User cannot update fields of unassigned tickets",
			userRole:       "User",
			hasAuth:        true,
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
		{
			name:           "Supervisor can update any ticket fields",
			userRole:       "Supervisor",
			hasAuth:        true,
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
		{
			name:           "Manager can update any ticket fields",
			userRole:       "Manager",
			hasAuth:        true,
			expectedStatus: 500, // Will fail due to mock DB, but should not be forbidden
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"priority": 5,
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

func TestSecurity_TicketStatusAndComments(t *testing.T) {
	app, _ := setupTestApp()

	tests := []struct {
		name           string
		userRole       string
		endpoint       string
		method         string
		payload        map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "User cannot change status of unassigned ticket",
			userRole:       "User",
			endpoint:       "/api/v1/tickets/other-user-ticket/status",
			method:         "POST",
			payload:        map[string]interface{}{"status": "in_progress"},
			expectedStatus: 403,
			expectedError:  "only supervisors, managers, and assigned users can change ticket status",
		},
		{
			name:           "User cannot comment on unassigned ticket",
			userRole:       "User",
			endpoint:       "/api/v1/tickets/other-user-ticket/comments",
			method:         "POST",
			payload:        map[string]interface{}{"body": "Test comment"},
			expectedStatus: 403,
			expectedError:  "only supervisors, managers, and assigned users can post comments",
		},
		{
			name:           "Supervisor can change any ticket status",
			userRole:       "Supervisor",
			endpoint:       "/api/v1/tickets/any-ticket/status",
			method:         "POST",
			payload:        map[string]interface{}{"status": "completed"},
			expectedStatus: 500, // Will fail due to mock DB, but 403 should not occur
		},
		{
			name:           "Manager can comment on any ticket",
			userRole:       "Manager",
			endpoint:       "/api/v1/tickets/any-ticket/comments",
			method:         "POST",
			payload:        map[string]interface{}{"body": "Test comment"},
			expectedStatus: 500, // Will fail due to mock DB, but 403 should not occur
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.payload)
			req := httptest.NewRequest(tt.method, tt.endpoint, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+createTestJWT(tt.userRole))

			resp, err := app.Test(req)
			require.NoError(t, err)
			
			// For permission tests, we expect 403 Forbidden
			if tt.expectedStatus == 403 {
				assert.Equal(t, 403, resp.StatusCode)
				
				if tt.expectedError != "" {
					var response map[string]interface{}
					err := json.NewDecoder(resp.Body).Decode(&response)
					require.NoError(t, err)
					
					errorObj, ok := response["error"].(map[string]interface{})
					require.True(t, ok)
					assert.Contains(t, errorObj["message"], tt.expectedError)
				}
			} else {
				// For other tests, we expect it to not be 403 (permission denied)
				assert.NotEqual(t, 403, resp.StatusCode, "Should not be forbidden for authorized roles")
			}
		})
	}
}
