package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"

	"github.com/it-tms/apps/api/internal/http/handlers"
	"github.com/it-tms/apps/api/internal/http/middleware"
	"github.com/it-tms/apps/api/pkg/config"
	"github.com/it-tms/apps/api/pkg/logger"
)

func main() {
	// Load env
	viper.AutomaticEnv()
	cfg := config.Load()

	// Logger
	logger.Init()
	log.Info().Msg("Starting IT-TMS API")

	// DB
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create db pool")
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("failed to ping db")
	}

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "IT-TMS API",
		ServerHeader: "it-tms-api",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": fiber.Map{"code": "SERVER_ERROR", "message": err.Error()}})
		},
	})

	// Middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSAllowedOrigins,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Initialize handlers
	h := handlers.New(pool, cfg)

	// Health endpoint
	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"time":   time.Now(),
		})
	})

	// API v1 routes
	v1 := app.Group("/api/v1")

	// Auth routes
	auth := v1.Group("/auth")
	auth.Post("/sign-in", h.SignIn)
	auth.Post("/sign-out", h.SignOut)
	auth.Post("/sign-up", h.SignUp)

	// Optional auth routes (for anonymous access)
	v1.Get("/me", middleware.AuthOptional(cfg.JWTSecret), h.Me)
	v1.Post("/tickets", middleware.AuthOptional(cfg.JWTSecret), h.TicketsCreate)
	v1.Get("/tickets", middleware.AuthOptional(cfg.JWTSecret), h.TicketsList)
	v1.Get("/tickets/:id", middleware.AuthOptional(cfg.JWTSecret), h.TicketsDetail)
	v1.Post("/tickets/:id/attachments", middleware.AuthOptional(cfg.JWTSecret), h.TicketsUploadAttachments)
	v1.Get("/metrics/summary", h.MetricsSummary)
	v1.Get("/rankings", h.GetUserRankings)
	v1.Post("/priority/compute", h.PriorityCompute)

	// Protected routes (require authentication)
	protected := v1.Group("/", middleware.AuthRequired(cfg.JWTSecret))
	protected.Patch("/profile", h.ProfileUpdate)
	protected.Post("/profile/picture", h.ProfilePictureUpload)
	protected.Get("/users/search", h.UsersSearch)
	protected.Patch("/tickets/:id", h.TicketsUpdate)
	protected.Patch("/tickets/:id/fields", h.TicketsUpdateFields)
	protected.Post("/tickets/:id/assign", h.TicketsAssign)
	protected.Delete("/tickets/:id/assign", h.TicketsUnassign)
	protected.Post("/tickets/:id/status", h.TicketsStatus)
	protected.Post("/tickets/:id/comments", h.TicketsAddComment)
	protected.Post("/tickets/:id/comments/:commentId/attachments", h.CommentsUploadAttachments)
	
	// Download routes (require auth with redirect for browser requests)
	signInURL := cfg.WebAppURL + "/sign-in"
	v1.Get("/attachments/:attachmentId/download", middleware.AuthRequiredWithRedirect(cfg.JWTSecret, signInURL), h.DownloadAttachment)
	v1.Get("/comment-attachments/:attachmentId/download", middleware.AuthRequiredWithRedirect(cfg.JWTSecret, signInURL), h.DownloadCommentAttachment)

	// Admin routes (require Supervisor or Manager roles)
	admin := v1.Group("/", middleware.RequireSupervisorOrManager(cfg.JWTSecret))
	admin.Post("/tickets/:id/classify", h.TicketsClassify)
	admin.Put("/tickets/:id/red-flags", h.TicketsUpdateRedFlags)
	admin.Put("/tickets/:id/impact-assessment", h.TicketsUpdateImpactAssessment)
	admin.Put("/tickets/:id/urgency-timeline", h.TicketsUpdateUrgencyTimeline)

	// Static file serving - protected with authentication
	app.Get("/uploads/*", middleware.AuthRequiredWithRedirect(cfg.JWTSecret, signInURL), func(c *fiber.Ctx) error {
		// Extract the file path after /uploads/
		filePath := c.Params("*")
		fullPath := filepath.Join(cfg.UploadDir, filePath)
		
		// Security check: ensure the path is within the upload directory
		uploadDir, _ := filepath.Abs(cfg.UploadDir)
		requestedPath, _ := filepath.Abs(fullPath)
		if !strings.HasPrefix(requestedPath, uploadDir) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code": "FORBIDDEN", "message": "access denied"}})
		}
		
		return c.SendFile(fullPath)
	})
	
	// Swagger UI
	app.Static("/swagger", "./public")
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Redirect("/swagger/swagger.html")
	})

	port := cfg.Port
	if port == 0 {
		port = 8080
	}
	addr := fmt.Sprintf(":%d", port)
	log.Info().Int("port", port).Msg("listening")
	if err := app.Listen(addr); err != nil {
		log.Error().Err(err).Msg("server exited")
		os.Exit(1)
	}
}