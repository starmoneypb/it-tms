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
	return c.JSON(h.envelope(fiber.Map{
		"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role,
	}))
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

	// RBAC: Anonymous can only create Issue Report
	if role == "Anonymous" && body.InitialType != models.InitialIssueReport {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"anonymous can only open issue reports"}})
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

func (h *Handlers) TicketsUpdate(c *fiber.Ctx) error {
	id := c.Params("id")
	var body TicketUpdateReq
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fiber.Map{"code":"BAD_REQUEST","message":"invalid payload"}})
	}
	ctx := context.Background()
	// Ownership or elevated role enforced inside repo/service (simplified here)
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	var userID *string
	if userClaims != nil {
		if sid, ok := userClaims["sub"].(string); ok { userID = &sid }
	}
	if err := h.repo.Tickets.Update(ctx, id, body.Title, body.Description, body.Details); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"update failed"}})
	}
	h.repo.Audits.Insert(ctx, id, userID, "update_ticket", nil, body)
	return c.JSON(h.envelope(fiber.Map{"id": id}))
}

type AssignReq struct {
	AssigneeID *string `json:"assigneeId"`
	Self       bool    `json:"self"`
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
	role, _ := userClaims["role"].(string)
	userID, _ := userClaims["sub"].(string)

	// Users can self-assign only
	if body.Self {
		body.AssigneeID = &userID
	} else if role == "User" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"only supervisors/managers can assign others"}})
	}

	ctx := context.Background()
	if err := h.repo.Tickets.Assign(ctx, id, body.AssigneeID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"assign failed"}})
	}
	h.repo.Audits.Insert(ctx, id, &userID, "assign", nil, body)
	return c.JSON(h.envelope(fiber.Map{"id": id, "assigneeId": body.AssigneeID}))
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
	ctx := context.Background()
	if err := h.repo.Tickets.ChangeStatus(ctx, id, body.Status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fiber.Map{"code":"SERVER_ERROR","message":"status change failed"}})
	}
	userClaims, _ := c.Locals("user").(jwt.MapClaims)
	var userID *string
	if userClaims != nil {
		if sid, ok := userClaims["sub"].(string); ok { userID = &sid }
	}
	h.repo.Audits.Insert(ctx, id, userID, "status_change", nil, body.Status)
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