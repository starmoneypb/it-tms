package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Port               int
	DatabaseURL        string
	JWTSecret          string
	CORSAllowedOrigins string
	UploadDir          string
	SecureCookies      bool
}

func Load() Config {
	port, _ := strconv.Atoi(get("PORT", "8080"))
	secure := strings.ToLower(get("SECURE_COOKIES", "false")) == "true"

	return Config{
		Port:               port,
		DatabaseURL:        get("DATABASE_URL", ""),
		JWTSecret:          get("JWT_SECRET", ""),
		CORSAllowedOrigins: get("CORS_ALLOWED_ORIGINS", "http://localhost:3000"),
		UploadDir:          get("UPLOAD_DIR", "uploads"),
		SecureCookies:      secure,
	}
}

func get(key, def string) string {
	if v := viper.GetString(key); v != "" {
		return v
	}
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}