package websocket

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"

	"github.com/it-tms/apps/api/internal/models"
)

type NotificationType string

const (
	NotificationTicketCreated   NotificationType = "ticket_created"
	NotificationTicketAssigned  NotificationType = "ticket_assigned"
	NotificationTicketUnassigned NotificationType = "ticket_unassigned"
)

type Notification struct {
	Type      NotificationType `json:"type"`
	TicketID  string          `json:"ticketId"`
	Ticket    *models.Ticket  `json:"ticket,omitempty"`
	Message   string          `json:"message"`
	Timestamp time.Time       `json:"timestamp"`
	// For assignment notifications
	AssignedUserID   *string `json:"assignedUserId,omitempty"`
	UnassignedUserID *string `json:"unassignedUserId,omitempty"`
}

type Client struct {
	conn    *websocket.Conn
	userID  *string // nil for anonymous users
	room    string  // room name for targeted notifications
	send    chan Notification
	hub     *Hub
}

type Hub struct {
	clients    map[*Client]bool // registered clients
	broadcast  chan Notification
	register   chan *Client
	unregister chan *Client
	rooms      map[string]map[*Client]bool // room -> clients mapping
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan Notification),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		rooms:      make(map[string]map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			
			// Add to room if userID is specified
			if client.userID != nil {
				roomName := *client.userID
				if h.rooms[roomName] == nil {
					h.rooms[roomName] = make(map[*Client]bool)
				}
				h.rooms[roomName][client] = true
				
				log.Info().
					Str("userID", *client.userID).
					Msg("WebSocket client joined user room")
			}
			h.mu.Unlock()
			
			log.Info().Msg("WebSocket client registered")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				
				// Remove from room if userID is specified
				if client.userID != nil {
					roomName := *client.userID
					if room, exists := h.rooms[roomName]; exists {
						delete(room, client)
						if len(room) == 0 {
							delete(h.rooms, roomName)
						}
					}
					
					log.Info().
						Str("userID", *client.userID).
						Msg("WebSocket client left user room")
				}
			}
			h.mu.Unlock()
			
			log.Info().Msg("WebSocket client unregistered")

		case notification := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- notification:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// HandleWebSocket handles WebSocket connections
func (h *Hub) HandleWebSocket(c *fiber.Ctx) error {
	// Upgrade the connection to WebSocket
	conn, err := websocket.Accept(c.Response().BodyWriter(), c.Request(), &websocket.AcceptOptions{
		InsecureSkipVerify: false, // Use secure defaults
		OriginPatterns:     []string{"*"}, // Configure this properly in production
	})
	if err != nil {
		log.Error().Err(err).Msg("Failed to upgrade connection to WebSocket")
		return err
	}
	defer conn.Close(websocket.StatusInternalError, "closing connection")

	// Create client
	client := &Client{
		conn:   conn,
		userID: nil, // Will be set when user joins
		room:   "",
		send:   make(chan Notification, 256),
		hub:    h,
	}

	// Register client
	h.register <- client
	defer func() {
		h.unregister <- client
	}()

	// Start goroutine to handle client messages
	go client.writePump()
	
	// Handle client messages
	return client.readPump()
}

func (c *Client) readPump() error {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close(websocket.StatusNormalClosure, "")
	}()

	// Set read deadline
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var message struct {
			Type   string `json:"type"`
			UserID string `json:"userId"`
		}

		err := wsjson.Read(context.Background(), c.conn, &message)
		if err != nil {
			if websocket.CloseStatus(err) == websocket.StatusNormalClosure ||
				websocket.CloseStatus(err) == websocket.StatusGoingAway {
				log.Info().Msg("WebSocket client disconnected normally")
			} else {
				log.Error().Err(err).Msg("WebSocket read error")
			}
			break
		}

		// Handle join message
		if message.Type == "join" && message.UserID != "" {
			c.userID = &message.UserID
			c.room = message.UserID
			
			// Re-register with room
			c.hub.unregister <- c
			c.hub.register <- c
			
			log.Info().
				Str("userID", message.UserID).
				Msg("WebSocket client joined user room")
		}
	}

	return nil
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close(websocket.StatusNormalClosure, "")
	}()

	for {
		select {
		case notification, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(context.Background(), websocket.MessageClose, websocket.FormatCloseMessage(websocket.StatusNormalClosure, ""))
				return
			}

			// Send notification as JSON
			err := wsjson.Write(context.Background(), c.conn, map[string]interface{}{
				"type": "notification",
				"data": notification,
			})
			if err != nil {
				log.Error().Err(err).Msg("WebSocket write error")
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.Ping(context.Background()); err != nil {
				log.Error().Err(err).Msg("WebSocket ping error")
				return
			}
		}
	}
}

// NotifyTicketCreated sends notification to all connected clients except the creator
func (h *Hub) NotifyTicketCreated(ticket *models.Ticket, creatorID *string) {
	notification := Notification{
		Type:      NotificationTicketCreated,
		TicketID:  ticket.ID,
		Ticket:    ticket,
		Message:   "New ticket created",
		Timestamp: time.Now(),
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	// Broadcast to all connected clients except the creator
	for client := range h.clients {
		// Skip sending to the creator
		if creatorID != nil && client.userID != nil && *client.userID == *creatorID {
			continue
		}

		select {
		case client.send <- notification:
		default:
			close(client.send)
			delete(h.clients, client)
		}
	}
}

// NotifyTicketAssigned sends notification to the specific assigned user
func (h *Hub) NotifyTicketAssigned(ticketID string, assignedUserID string, ticket *models.Ticket) {
	notification := Notification{
		Type:           NotificationTicketAssigned,
		TicketID:       ticketID,
		Ticket:         ticket,
		Message:        "You have been assigned to a ticket",
		Timestamp:      time.Now(),
		AssignedUserID: &assignedUserID,
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	// Send to specific user room
	if room, exists := h.rooms[assignedUserID]; exists {
		for client := range room {
			select {
			case client.send <- notification:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
}

// NotifyTicketUnassigned sends notification to the specific unassigned user
func (h *Hub) NotifyTicketUnassigned(ticketID string, unassignedUserID string, ticket *models.Ticket) {
	notification := Notification{
		Type:             NotificationTicketUnassigned,
		TicketID:         ticketID,
		Ticket:           ticket,
		Message:          "You have been unassigned from a ticket",
		Timestamp:        time.Now(),
		UnassignedUserID: &unassignedUserID,
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	// Send to specific user room
	if room, exists := h.rooms[unassignedUserID]; exists {
		for client := range room {
			select {
			case client.send <- notification:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
}