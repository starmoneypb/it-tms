package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/it-tms/apps/api/internal/http/middleware"
	"github.com/it-tms/apps/api/internal/models"
	"github.com/it-tms/apps/api/internal/priority"
	"github.com/it-tms/apps/api/internal/repositories"
	"github.com/it-tms/apps/api/pkg/config"
)

type Handlers struct {
	cfg  config.Config
	pool *pgxpool.Pool
	repo *repositories.Repo
}

func New(pool *pgxpool.Pool, cfg config.Config) *Handlers {
	return &Handlers{cfg: cfg, pool: pool, repo: repositories.New(pool)}
}

func (h *Handlers) envelope(data any) any {
	return fiber.Map{"data": data}
}

func (h *Handlers) error(code int, codeStr, msg string, details any) error {
	return fiber.NewError(code, msg)
}

// -------------------- Auth --------------------

type SignInReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SignUpReq struct {
	Name     string      `json:"name"`
	Email    string      `json:"email"`
	Password string      `json:"password"`
	Role     models.Role `json:"role"`
}

func (h *Handlers) issueJWT(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"role":  user.Role,
		"exp":   time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString([]byte(h.cfg.JWTSecret))
}

func (h *Handlers) setAuthCookie(c *fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    token,
		HTTPOnly: true,
		Secure:   h.cfg.SecureCookies,
		Path:     "/",
		SameSite: "Lax",
		MaxAge:   7 * 24 * 3600,
	})
}

func (h *Handlers) SignIn(c *fiber.Ctx) error {
	var body SignInReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	ctx := context.Background()
	user, err := h.repo.Users.GetByEmail(ctx, body.Email)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"invalid credentials"}})
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)) != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"invalid credentials"}})
	}
	tok, err := h.issueJWT(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"failed to sign token"}})
	}
	h.setAuthCookie(c, tok)
	return c.JSON(h.envelope(fiber.Map{"token": tok}))
}

func (h *Handlers) SignUp(c *fiber.Ctx) error {
	var body SignUpReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), 12)
	u := models.User{
		Name: body.Name, Email: body.Email, Role: body.Role, PasswordHash: string(hash),
	}
	ctx := context.Background()
	if err := h.repo.Users.Create(ctx, u); err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": fiber.Map{"code":"CONFLICT","message":"email already exists"}})
	}
	// Sign in immediately
	user, _ := h.repo.Users.GetByEmail(ctx, body.Email)
	tok, _ := h.issueJWT(user)
	h.setAuthCookie(c, tok)
	return c.Status(fiber.StatusCreated).JSON(h.envelope(fiber.Map{"token": tok}))
}

func (h *Handlers) Me(c *fiber.Ctx) error {
	claims, _ := c.Locals("user").(jwt.MapClaims)
	if claims == nil {
		return c.JSON(h.envelope(fiber.Map{"role": "Anonymous"}))
	}
	id, _ := claims["sub"].(string)
	ctx := context.Background()
	user, err := h.repo.Users.GetByID(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": fiber.Map{"code":"NOT_FOUND","message":"user not found"}})
	}
	
	// Convert profile picture path to URL
	var profilePictureURL *string
	if user.ProfilePicture != nil && *user.ProfilePicture != "" {
		filename := filepath.Base(*user.ProfilePicture)
		url := fmt.Sprintf("/uploads/%s", filename)
		profilePictureURL = &url
	}
	
	return c.JSON(h.envelope(fiber.Map{
		"id": user.ID, 
		"name": user.Name, 
		"email": user.Email, 
		"role": user.Role,
		"profilePicture": profilePictureURL,
	}))
}

// -------------------- Users --------------------

func (h *Handlers) UsersSearch(c *fiber.Ctx) error {
	// Only authenticated users can search for other users
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	if userClaims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"authentication required"}})
	}
	
	query := c.Query("q", "")
	roleFilter := c.Query("role", "")
	limit := 20 // Default limit
	
	var roles []string
	if roleFilter != "" {
		roles = []string{roleFilter}
	}
	
	ctx := context.Background()
	users, err := h.repo.Users.Search(ctx, query, roles, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"search failed"}})
	}
	
	// Convert profile picture paths to URLs and remove password hashes
	var result []fiber.Map
	for _, user := range users {
		var profilePictureURL *string
		if user.ProfilePicture != nil && *user.ProfilePicture != "" {
			filename := filepath.Base(*user.ProfilePicture)
			url := fmt.Sprintf("/uploads/%s", filename)
			profilePictureURL = &url
		}
		
		result = append(result, fiber.Map{
			"id": user.ID,
			"name": user.Name,
			"email": user.Email,
			"role": user.Role,
			"profilePicture": profilePictureURL,
		})
	}
	
	return c.JSON(h.envelope(result))
}

// -------------------- Priority --------------------

func (h *Handlers) PriorityCompute(c *fiber.Ctx) error {
	var input priority.PriorityInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	out := priority.Compute(input)
	return c.JSON(h.envelope(out))
}

// -------------------- Tickets --------------------

type TicketCreateReq struct {
	Title        string                 `json:"title"`
	Description  string                 `json:"description"`
	InitialType  models.TicketInitialType `json:"initialType"`
	Details      map[string]any         `json:"details"`
	ContactEmail *string                `json:"contactEmail"`
	ContactPhone *string                `json:"contactPhone"`
	PriorityInput *priority.PriorityInput `json:"priorityInput"`
}

func (h *Handlers) TicketsCreate(c *fiber.Ctx) error {
	var body TicketCreateReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	var createdBy *string
	role := "Anonymous"
	if userClaims != nil {
		role, _ = userClaims["role"].(string)
		if id, ok := userClaims["sub"].(string); ok {
			createdBy = &id
		}
	}

	// RBAC Enforcement based on requirements matrix
	switch role {
	case "Anonymous":
		// Anonymous can only create Issue Reports and must provide contact info
		if body.InitialType != models.InitialIssueReport {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"anonymous can only open issue reports"}})
		}
		if body.ContactEmail == nil || *body.ContactEmail == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"contact email required for anonymous users"}})
		}
	case "User":
		// Users can create all types except Emergency Change and Data Correction
		if body.InitialType == models.InitialChangeRequestNormal ||
		   body.InitialType == models.InitialServiceDataExtraction ||
		   body.InitialType == models.InitialServiceAdvisory ||
		   body.InitialType == models.InitialServiceGeneral {
			// Allowed
		} else {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"insufficient permissions for this ticket type"}})
		}
	case "Supervisor", "Manager":
		// Supervisors and Managers can create all types
		// No restrictions
	default:
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"invalid role"}})
	}

	impact, urgency, final, red, prio := 0,0,0,false, models.PriorityP3
	if body.PriorityInput != nil {
		p := priority.Compute(*body.PriorityInput)
		impact, urgency, final = p.Impact, p.Urgency, p.Final
		red = p.RedFlag
		prio = models.TicketPriority(p.Priority)
	}

	t := models.Ticket{
		CreatedBy: createdBy,
		ContactEmail: body.ContactEmail,
		ContactPhone: body.ContactPhone,
		InitialType: body.InitialType,
		Status: models.StatusPending,
		Title: body.Title,
		Description: body.Description,
		Details: body.Details,
		ImpactScore: int32(impact),
		UrgencyScore: int32(urgency),
		FinalScore: int32(final),
		RedFlag: red,
		Priority: prio,
	}
	ctx := context.Background()
	if err := h.repo.Tickets.Create(ctx, &t); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"failed to create"}})
	}
	h.repo.Audits.Insert(ctx, t.ID, createdBy, "create_ticket", nil, t)
	return c.Status(fiber.StatusCreated).JSON(h.envelope(t))
}

func (h *Handlers) TicketsList(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))
	if pageSize <= 0 { pageSize = 20 }
	if pageSize > 100 { pageSize = 100 }
	offset := (page - 1) * pageSize

	filters := repositories.TicketFilters{
		Status:      c.Query("status"),
		Priority:    c.Query("priority"),
		AssigneeID:  c.Query("assigneeId"),
		CreatedBy:   c.Query("createdBy"),
		Query:       c.Query("q"),
	}

	ctx := context.Background()
	items, total, err := h.repo.Tickets.List(ctx, filters, offset, pageSize)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"failed to list"}})
	}
	return c.JSON(fiber.Map{
		"data": items,
		"page": page,
		"pageSize": pageSize,
		"total": total,
		"totalPages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

func (h *Handlers) TicketsDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()
	t, comments, atts, err := h.repo.Tickets.GetWithRelations(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": fiber.Map{"code":"NOT_FOUND","message":"ticket not found"}})
	}
	return c.JSON(h.envelope(fiber.Map{
		"ticket": t,
		"comments": comments,
		"attachments": atts,
	}))
}

type TicketUpdateReq struct {
	Title       *string                `json:"title"`
	Description *string                `json:"description"`
	Details     map[string]any         `json:"details"`
}

type TicketFieldsUpdateReq struct {
	InitialType  *models.TicketInitialType  `json:"initialType"`
	ResolvedType  *models.TicketResolvedType `json:"resolvedType"`
	Priority      *models.TicketPriority     `json:"priority"`
	ImpactScore   *int32                     `json:"impactScore"`
	UrgencyScore  *int32                     `json:"urgencyScore"`
	FinalScore    *int32                     `json:"finalScore"`
	RedFlag       *bool                     `json:"redFlag"`
}

func (h *Handlers) TicketsUpdate(c *fiber.Ctx) error {
	id := c.Params("id")
	var body TicketUpdateReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	if userClaims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"authentication required"}})
	}
	
	userID, role, _ := middleware.GetUserFromContext(c)
	
	ctx := context.Background()
	
	// Get current ticket for comparison and ownership check
	ticket, err := h.repo.Tickets.GetByID(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": fiber.Map{"code":"NOT_FOUND","message":"ticket not found"}})
	}
	
	// Check ownership: Users can only edit their own tickets, Supervisors/Managers can edit any
	if role == "User" {
		if ticket.CreatedBy == nil || *ticket.CreatedBy != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"can only edit your own tickets"}})
		}
	}
	
	// Track changes for automatic comment generation
	var changes []string
	if body.Title != nil && *body.Title != ticket.Title {
		changes = append(changes, fmt.Sprintf("Title changed from \"%s\" to \"%s\"", ticket.Title, *body.Title))
	}
	if body.Description != nil && *body.Description != ticket.Description {
		changes = append(changes, "Description was updated")
	}
	
	if err := h.repo.Tickets.Update(ctx, id, body.Title, body.Description, body.Details); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"update failed"}})
	}
	
	// Add automatic comment if there were changes
	if len(changes) > 0 {
		commentBody := fmt.Sprintf("🔧 Ticket updated by %s:\n\n%s", role, strings.Join(changes, "\n"))
		h.repo.Tickets.AddComment(ctx, id, &userID, commentBody)
	}
	
	h.repo.Audits.Insert(ctx, id, &userID, "update_ticket", nil, body)
	return c.JSON(h.envelope(fiber.Map{"id": id}))
}

func (h *Handlers) TicketsUpdateFields(c *fiber.Ctx) error {
	id := c.Params("id")
	var body TicketFieldsUpdateReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	if userClaims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"authentication required"}})
	}
	
	userID, role, _ := middleware.GetUserFromContext(c)
	
	// Only Supervisor and Manager can update ticket fields
	if role != "Supervisor" && role != "Manager" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"only supervisors and managers can update ticket fields"}})
	}
	
	ctx := context.Background()
	
	// Get current ticket for comparison
	ticket, err := h.repo.Tickets.GetByID(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": fiber.Map{"code":"NOT_FOUND","message":"ticket not found"}})
	}
	
	// Track changes for automatic comment generation
	var changes []string
	if body.InitialType != nil && *body.InitialType != ticket.InitialType {
		changes = append(changes, fmt.Sprintf("Initial Type changed from \"%s\" to \"%s\"", ticket.InitialType, *body.InitialType))
	}
	if body.ResolvedType != nil && (ticket.ResolvedType == nil || *body.ResolvedType != *ticket.ResolvedType) {
		if ticket.ResolvedType == nil {
			changes = append(changes, fmt.Sprintf("Resolved Type set to \"%s\"", *body.ResolvedType))
		} else {
			changes = append(changes, fmt.Sprintf("Resolved Type changed from \"%s\" to \"%s\"", *ticket.ResolvedType, *body.ResolvedType))
		}
	}
	if body.Priority != nil && *body.Priority != ticket.Priority {
		changes = append(changes, fmt.Sprintf("Priority changed from \"%s\" to \"%s\"", ticket.Priority, *body.Priority))
	}
	if body.ImpactScore != nil && *body.ImpactScore != ticket.ImpactScore {
		changes = append(changes, fmt.Sprintf("Impact Score changed from %d to %d", ticket.ImpactScore, *body.ImpactScore))
	}
	if body.UrgencyScore != nil && *body.UrgencyScore != ticket.UrgencyScore {
		changes = append(changes, fmt.Sprintf("Urgency Score changed from %d to %d", ticket.UrgencyScore, *body.UrgencyScore))
	}
	if body.FinalScore != nil && *body.FinalScore != ticket.FinalScore {
		changes = append(changes, fmt.Sprintf("Final Score changed from %d to %d", ticket.FinalScore, *body.FinalScore))
	}
	if body.RedFlag != nil && *body.RedFlag != ticket.RedFlag {
		if *body.RedFlag {
			changes = append(changes, "🚨 Red Flag was set")
		} else {
			changes = append(changes, "Red Flag was cleared")
		}
	}
	
	if err := h.repo.Tickets.UpdateTicketFields(ctx, id, body.InitialType, body.ResolvedType, body.Priority, body.ImpactScore, body.UrgencyScore, body.FinalScore, body.RedFlag); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"update failed"}})
	}
	
	// Add automatic comment if there were changes
	if len(changes) > 0 {
		commentBody := fmt.Sprintf("⚙️ Ticket fields updated by %s:\n\n%s", role, strings.Join(changes, "\n"))
		h.repo.Tickets.AddComment(ctx, id, &userID, commentBody)
	}
	
	h.repo.Audits.Insert(ctx, id, &userID, "update_ticket_fields", nil, body)
	return c.JSON(h.envelope(fiber.Map{"id": id}))
}

type AssignReq struct {
	AssigneeID  *string  `json:"assigneeId"`  // Deprecated: use AssigneeIDs
	AssigneeIDs []string `json:"assigneeIds"` // New: support multiple assignees
	Self        bool     `json:"self"`
}

type UnassignReq struct {
	AssigneeIDs []string `json:"assigneeIds"`
}

func (h *Handlers) TicketsAssign(c *fiber.Ctx) error {
	id := c.Params("id")
	var body AssignReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	if userClaims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"auth required"}})
	}
	
	userID, role, _ := middleware.GetUserFromContext(c)
	ctx := context.Background()
	
	// Get current assignees for comparison
	currentAssignees, err := h.repo.Tickets.GetAssignees(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"failed to get current assignees"}})
	}
	
	// Determine which users to assign
	var assigneeIDs []string
	
	if body.Self {
		assigneeIDs = []string{userID}
	} else if len(body.AssigneeIDs) > 0 {
		// Users can only self-assign
		if role == "User" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"only supervisors/managers can assign others"}})
		}
		assigneeIDs = body.AssigneeIDs
	} else if body.AssigneeID != nil {
		// Backward compatibility with single assignee
		if role == "User" && *body.AssigneeID != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"only supervisors/managers can assign others"}})
		}
		assigneeIDs = []string{*body.AssigneeID}
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"no assignees specified"}})
	}
	
	// Assign users
	if err := h.repo.Tickets.AssignUsers(ctx, id, assigneeIDs, &userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"assign failed"}})
	}
	
	// Get updated assignees and user names for comment
	newAssignees, err := h.repo.Tickets.GetAssignees(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"failed to get updated assignees"}})
	}
	
	// Generate assignment comment
	var assignmentChanges []string
	
	// Find newly assigned users
	currentAssigneeMap := make(map[string]bool)
	for _, assignee := range currentAssignees {
		currentAssigneeMap[assignee.ID] = true
	}
	
	for _, assignee := range newAssignees {
		if !currentAssigneeMap[assignee.ID] {
			assignmentChanges = append(assignmentChanges, fmt.Sprintf("✅ Assigned to %s (%s)", assignee.Name, assignee.Role))
		}
	}
	
	// Add automatic comment if there were changes
	if len(assignmentChanges) > 0 {
		commentBody := fmt.Sprintf("👤 Assignment updated by %s:\n\n%s", role, strings.Join(assignmentChanges, "\n"))
		h.repo.Tickets.AddComment(ctx, id, &userID, commentBody)
	}
	
	h.repo.Audits.Insert(ctx, id, &userID, "assign", nil, body)
	return c.JSON(h.envelope(fiber.Map{"id": id, "assignees": newAssignees}))
}

func (h *Handlers) TicketsUnassign(c *fiber.Ctx) error {
	id := c.Params("id")
	var body UnassignReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	if userClaims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"auth required"}})
	}
	
	userID, role, _ := middleware.GetUserFromContext(c)
	
	// Only Supervisors and Managers can unassign others
	if role == "User" {
		// Users can only unassign themselves
		body.AssigneeIDs = []string{userID}
	}
	
	ctx := context.Background()
	
	// Get current assignees for comment generation
	currentAssignees, err := h.repo.Tickets.GetAssignees(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"failed to get current assignees"}})
	}
	
	// Find users being unassigned for comment
	var unassignmentChanges []string
	for _, assignee := range currentAssignees {
		for _, unassigneeID := range body.AssigneeIDs {
			if assignee.ID == unassigneeID {
				unassignmentChanges = append(unassignmentChanges, fmt.Sprintf("❌ Unassigned %s (%s)", assignee.Name, assignee.Role))
				break
			}
		}
	}
	
	// Unassign users
	if err := h.repo.Tickets.UnassignUsers(ctx, id, body.AssigneeIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"unassign failed"}})
	}
	
	// Get updated assignees
	newAssignees, err := h.repo.Tickets.GetAssignees(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"failed to get updated assignees"}})
	}
	
	// Add automatic comment if there were changes
	if len(unassignmentChanges) > 0 {
		commentBody := fmt.Sprintf("👤 Assignment updated by %s:\n\n%s", role, strings.Join(unassignmentChanges, "\n"))
		h.repo.Tickets.AddComment(ctx, id, &userID, commentBody)
	}
	
	h.repo.Audits.Insert(ctx, id, &userID, "unassign", nil, body)
	return c.JSON(h.envelope(fiber.Map{"id": id, "assignees": newAssignees}))
}

type StatusReq struct {
	Status models.TicketStatus `json:"status"`
}

func (h *Handlers) TicketsStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var body StatusReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	if userClaims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"authentication required"}})
	}
	
	userID, role, _ := middleware.GetUserFromContext(c)
	ctx := context.Background()
	
	// Get current ticket for comparison and ownership check
	ticket, err := h.repo.Tickets.GetByID(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": fiber.Map{"code":"NOT_FOUND","message":"ticket not found"}})
	}
	
	// Check ownership for cancellation: Users can only cancel their own tickets
	if body.Status == models.StatusCanceled && role == "User" {
		if ticket.CreatedBy == nil || *ticket.CreatedBy != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"can only cancel your own tickets"}})
		}
	}
	
	// Track status change for automatic comment generation
	var statusChangeComment string
	if body.Status != ticket.Status {
		statusChangeComment = fmt.Sprintf("🔄 Status changed from \"%s\" to \"%s\" by %s", ticket.Status, body.Status, role)
	}
	
	if err := h.repo.Tickets.ChangeStatus(ctx, id, body.Status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"status change failed"}})
	}
	
	// Add automatic comment if status changed
	if statusChangeComment != "" {
		h.repo.Tickets.AddComment(ctx, id, &userID, statusChangeComment)
	}
	
	h.repo.Audits.Insert(ctx, id, &userID, "status_change", nil, body.Status)
	return c.JSON(h.envelope(fiber.Map{"id": id, "status": body.Status}))
}

type CommentReq struct {
	Body string `json:"body"`
}

func (h *Handlers) TicketsAddComment(c *fiber.Ctx) error {
	id := c.Params("id")
	var body CommentReq
	if err := c.BodyParser(&body); err != nil || strings.TrimSpace(body.Body) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid comment"}})
	}
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	var userID *string
	if userClaims != nil {
		if sid, ok := userClaims["sub"].(string); ok { userID = &sid }
	}
	ctx := context.Background()
	if err := h.repo.Tickets.AddComment(ctx, id, userID, body.Body); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"add comment failed"}})
	}
	h.repo.Audits.Insert(ctx, id, userID, "add_comment", nil, body.Body)
	return c.Status(fiber.StatusCreated).JSON(h.envelope(fiber.Map{"ok": true}))
}

// -------------------- Attachments --------------------

var allowedMimes = map[string]struct{}{
	"image/jpeg": {}, "image/png": {}, "application/pdf": {}, "text/plain": {},
}

const maxUploadSize = 10 * 1024 * 1024 // 10MB

func (h *Handlers) TicketsUploadAttachments(c *fiber.Ctx) error {
	id := c.Params("id")
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid form"}})
	}
	files := form.File["files"]
	if len(files) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"no files"}})
	}
	ctx := context.Background()
	res := []any{}
	for _, fh := range files {
		if fh.Size > maxUploadSize {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"file too large"}})
		}
		// Rely on client-provided content-type, better to sniff in prod
		mime := fh.Header.Get("Content-Type")
		if _, ok := allowedMimes[mime]; !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"mime not allowed"}})
		}
		path, err := h.saveUpload(fh)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"save failed"}})
		}
		if err := h.repo.Tickets.AddAttachment(ctx, id, fh.Filename, mime, fh.Size, path); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"db failed"}})
		}
		res = append(res, fiber.Map{"filename": fh.Filename})
	}
	return c.Status(fiber.StatusCreated).JSON(h.envelope(res))
}

func (h *Handlers) saveUpload(fh *multipart.FileHeader) (string, error) {
	f, err := fh.Open()
	if err != nil { return "", err }
	defer f.Close()
	// naive secure filename
	name := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(fh.Filename))
	dst := filepath.Join(h.cfg.UploadDir, name)
	os.MkdirAll(h.cfg.UploadDir, 0o755)
	out, err := os.Create(dst)
	if err != nil { return "", err }
	defer out.Close()
	if _, err := io.Copy(out, f); err != nil { return "", err }
	return dst, nil
}

// Signed URL (HMAC) generator
func (h *Handlers) signPath(p string, exp time.Time) string {
	mac := hmac.New(sha256.New, []byte(h.cfg.JWTSecret))
	io.WriteString(mac, p)
	io.WriteString(mac, "|")
	io.WriteString(mac, strconv.FormatInt(exp.Unix(), 10))
	return hex.EncodeToString(mac.Sum(nil))
}

// -------------------- Profile --------------------

type ProfileUpdateReq struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (h *Handlers) ProfileUpdate(c *fiber.Ctx) error {
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	if userClaims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"authentication required"}})
	}
	
	userID, ok := userClaims["sub"].(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"invalid user"}})
	}

	var body ProfileUpdateReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}

	ctx := context.Background()
	user, err := h.repo.Users.UpdateProfile(ctx, userID, body.Name, body.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"update failed"}})
	}

	return c.JSON(h.envelope(user))
}

func (h *Handlers) ProfilePictureUpload(c *fiber.Ctx) error {
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	if userClaims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"authentication required"}})
	}
	
	userID, ok := userClaims["sub"].(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"invalid user"}})
	}

	file, err := c.FormFile("profilePicture")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"no file uploaded"}})
	}

	// Validate file type
	if !strings.HasPrefix(file.Header.Get("Content-Type"), "image/") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"file must be an image"}})
	}

	// Validate file size (5MB limit)
	if file.Size > 5*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"file too large (max 5MB)"}})
	}

	// Save file
	path, err := h.saveUpload(file)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"upload failed"}})
	}

	// Update user profile picture in database
	ctx := context.Background()
	_, err = h.repo.Users.UpdateProfilePicture(ctx, userID, path)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"update failed"}})
	}

	// Convert file path to URL path for the web app
	filename := filepath.Base(path)
	profilePictureURL := fmt.Sprintf("/uploads/%s", filename)

	return c.JSON(h.envelope(fiber.Map{"profilePicture": profilePictureURL}))
}

// -------------------- Classification --------------------

type ClassifyReq struct {
	ResolvedType models.TicketResolvedType `json:"resolvedType"`
}

func (h *Handlers) TicketsClassify(c *fiber.Ctx) error {
	id := c.Params("id")
	var body ClassifyReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	if body.ResolvedType != models.ResolvedEmergencyChange && body.ResolvedType != models.ResolvedDataCorrection {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid resolvedType"}})
	}
	ctx := context.Background()
	if err := h.repo.Tickets.Classify(ctx, id, body.ResolvedType); err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": fiber.Map{"code":"NOT_FOUND","message":"ticket not found"}})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"classify failed"}})
	}
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	var userID *string
	if userClaims != nil {
		if sid, ok := userClaims["sub"].(string); ok { userID = &sid }
	}
	h.repo.Audits.Insert(ctx, id, userID, "classify", nil, body)
	return c.JSON(h.envelope(fiber.Map{"id": id, "resolvedType": body.ResolvedType}))
}

// -------------------- Metrics --------------------

func (h *Handlers) MetricsSummary(c *fiber.Ctx) error {
	ctx := context.Background()
	data, err := h.repo.Metrics.Summary(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"metrics failed"}})
	}
	return c.JSON(h.envelope(data))
}