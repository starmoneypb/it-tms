package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog/log"
)

func getTokenFromReq(c *fiber.Ctx) string {
	// Cookie first
	if tok := c.Cookies("token"); tok != "" {
		return tok
	}
	// Authorization header
	auth := c.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

func AuthOptional(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tok := getTokenFromReq(c)
		if tok == "" {
			return c.Next()
		}
		claims := jwt.MapClaims{}
		parsed, err := jwt.ParseWithClaims(tok, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err == nil && parsed.Valid {
			c.Locals("user", claims)
		}
		return c.Next()
	}
}

func AuthRequired(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tok := getTokenFromReq(c)
		if tok == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code": "UNAUTHORIZED", "message": "missing token"}})
		}
		claims := jwt.MapClaims{}
		parsed, err := jwt.ParseWithClaims(tok, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !parsed.Valid {
			log.Warn().Err(err).Msg("invalid token")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code": "UNAUTHORIZED", "message": "invalid token"}})
		}
		// exp check
		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().After(time.Unix(int64(exp), 0)) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code": "UNAUTHORIZED", "message": "token expired"}})
			}
		}
		c.Locals("user", claims)
		return c.Next()
	}
}

func RequireAnyRole(secret string, roles []string) fiber.Handler {
	roleSet := map[string]struct{}{}
	for _, r := range roles { roleSet[r] = struct{}{} }
	return func(c *fiber.Ctx) error {
		// This includes AuthRequired behavior
		if err := AuthRequired(secret)(c); err != nil {
			return err
		}
		val := c.Locals("user")
		if val == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code":"UNAUTHORIZED","message":"no user"}})
		}
		claims := val.(jwt.MapClaims)
		role, _ := claims["role"].(string)
		if _, ok := roleSet[role]; !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fiber.Map{"code":"FORBIDDEN","message":"insufficient role"}})
		}
		return c.Next()
	}
}