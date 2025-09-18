package main

import (
	"fmt"
	"net/http"
	"time"
	
	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()
	
	// Test endpoint registration
	app.Get("/api/v1/rankings", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"data": []fiber.Map{
				{"id": "test", "name": "Test User", "totalPoints": 100.0, "rank": 1},
			},
		})
	})
	
	// Start server in background
	go func() {
		app.Listen(":8081")
	}()
	
	// Wait for server to start
	time.Sleep(2 * time.Second)
	
	// Test the endpoint
	resp, err := http.Get("http://localhost:8081/api/v1/rankings")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer resp.Body.Close()
	
	fmt.Printf("Status: %d\n", resp.StatusCode)
	if resp.StatusCode == 200 {
		fmt.Println("✅ Endpoint registration works correctly")
	} else {
		fmt.Println("❌ Endpoint registration issue")
	}
}
