package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

func RequestLogger(c *fiber.Ctx) error {
	start := time.Now()
	err := c.Next()
	dur := time.Since(start)
	log.Info().
		Str("id", c.GetRespHeader(fiber.HeaderXRequestID)).
		Str("method", c.Method()).
		Str("path", c.Path()).
		Int("status", c.Response().StatusCode()).
		Str("ip", c.IP()).
		Dur("duration", dur).
		Msg("request")
	return err
}