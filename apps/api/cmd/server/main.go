package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"

	"github.com/it-tms/apps/api/internal/http/handlers"
	"github.com/it-tms/apps/api/internal/http/middleware"
	"github.com/it-tms/apps/api/internal/storage"
	wshub "github.com/it-tms/apps/api/internal/websocket"
	"github.com/it-tms/apps/api/pkg/config"
	"github.com/it-tms/apps/api/pkg/logger"
)

func main() {
	// Load env
	viper.AutomaticEnv()
	cfg := config.Load()

	// Logger
	logger.Init()
	log.Info().Msg("Starting UniSight API")

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

	// Initialize Google Cloud Storage service
	var storageService *storage.StorageService
	if cfg.GCSBucketName != "" && cfg.GCSProjectID != "" {
		var err error
		// Check if credentials are provided via environment variable
		if credentialsJSON := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"); credentialsJSON != "" {
			storageService, err = storage.NewStorageServiceWithCredentials(cfg.GCSBucketName, cfg.GCSProjectID, credentialsJSON)
		} else {
			// Use default credentials (service account key file or metadata service)
			storageService, err = storage.NewStorageService(cfg.GCSBucketName, cfg.GCSProjectID)
		}
		if err != nil {
			log.Fatal().Err(err).Msg("failed to initialize GCS storage service")
		}
		defer storageService.Close()
		log.Info().Msg("GCS storage service initialized")
	} else {
		log.Warn().Msg("GCS configuration missing - file uploads will fail")
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
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,Upgrade,Connection,Sec-WebSocket-Key,Sec-WebSocket-Version,Sec-WebSocket-Extensions",
		AllowCredentials: true,
	}))

	// Initialize WebSocket hub
	wsHub := wshub.NewHub()
	go wsHub.Run()

	// Initialize handlers
	h := handlers.New(pool, cfg, storageService, wsHub)

	// Health endpoint
	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"time":   time.Now(),
		})
	})

	// WebSocket route
	app.Use("/ws", func(c *fiber.Ctx) error {
		// Log WebSocket upgrade attempts
		log.Info().
			Str("method", c.Method()).
			Str("path", c.Path()).
			Str("userAgent", c.Get("User-Agent")).
			Str("origin", c.Get("Origin")).
			Bool("isWebSocketUpgrade", websocket.IsWebSocketUpgrade(c)).
			Msg("WebSocket upgrade attempt")
		
		// IsWebSocketUpgrade returns true if the client
		// requested upgrade to the WebSocket protocol.
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// Allowed WS origins (comma-separated via env: e.g., "https://unisight.dev,https://www.unisight.dev,http://localhost:3000")
	allowedWSOrigins := viper.GetString("WS_ALLOWED_ORIGINS")
	// Fallback defaults if env is empty
	if allowedWSOrigins == "" {
		allowedWSOrigins = "https://unisight.dev,https://www.unisight.dev,http://localhost:3000,http://localhost:8000"
	}

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		// Get user ID from query parameter (for authenticated users)
		var userID *string
		if uid := c.Query("userId"); uid != "" {
			userID = &uid
		}
		
		// Log successful WebSocket upgrade
		log.Info().
			Str("userID", func() string {
				if userID != nil {
					return *userID
				}
				return "anonymous"
			}()).
			Str("remoteAddr", c.RemoteAddr().String()).
			Msg("WebSocket connection established")
		
		wsHub.HandleWebSocket(c, userID)
	}, websocket.Config{
		// Ensure upgrade is allowed for known origins (prevents 403/426 due to origin checks)
		CheckOrigin: func(ctx *fiber.Ctx) bool {
			origin := ctx.Get("Origin")
			if origin == "" {
				return true
			}
			for _, o := range strings.Split(allowedWSOrigins, ",") {
				if strings.TrimSpace(o) == origin {
					return true
				}
			}
			return false
		},
		// Reasonable handshake timeout
		HandshakeTimeout: 10 * time.Second,
		// Compression is safe with modern browsers; can help large notifications
		EnableCompression: true,
	}))

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
	protected.Get("/profile/performance", h.GetUserPerformanceStats)
	protected.Get("/users/search", h.UsersSearch)
	protected.Patch("/tickets/:id", h.TicketsUpdate)
	protected.Patch("/tickets/:id/fields", h.TicketsUpdateFields)
	protected.Post("/tickets/:id/assign", h.TicketsAssign)
	protected.Delete("/tickets/:id/assign", h.TicketsUnassign)
	protected.Post("/tickets/:id/status", h.TicketsStatus)
	protected.Post("/tickets/:id/comments", h.TicketsAddComment)
	protected.Get("/tickets/:id/comments", h.TicketsGetComments)
	protected.Post("/tickets/:id/comments/:commentId/attachments", h.CommentsUploadAttachments)
	
	// Download routes (require auth with redirect for browser requests)
	signInURL := cfg.WebAppURL + "/sign-in"
	v1.Get("/attachments/:attachmentId/download", middleware.AuthRequiredWithRedirect(cfg.JWTSecret, signInURL), h.DownloadAttachment)
	v1.Get("/comment-attachments/:attachmentId/download", middleware.AuthRequiredWithRedirect(cfg.JWTSecret, signInURL), h.DownloadCommentAttachment)
	
	// Profile picture download (public access for images)
	v1.Get("/profile-pictures/:profilePictureId/download", h.DownloadProfilePicture)

	// Admin routes (require Supervisor or Manager roles)
	admin := v1.Group("/", middleware.RequireSupervisorOrManager(cfg.JWTSecret))
	admin.Post("/tickets/:id/classify", h.TicketsClassify)
	admin.Put("/tickets/:id/red-flags", h.TicketsUpdateRedFlags)
	admin.Put("/tickets/:id/impact-assessment", h.TicketsUpdateImpactAssessment)
	admin.Put("/tickets/:id/urgency-timeline", h.TicketsUpdateUrgencyTimeline)
	admin.Post("/tickets/:id/effort", h.TicketsUpdateEffort)
	
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