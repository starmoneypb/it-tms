package websocket

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/rs/zerolog/log"

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
	conn   *websocket.Conn
	userID *string // nil for anonymous users
	send   chan []byte
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Info().Str("userID", func() string {
				if client.userID != nil {
					return *client.userID
				}
				return "anonymous"
			}()).Msg("WebSocket client connected")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Info().Str("userID", func() string {
				if client.userID != nil {
					return *client.userID
				}
				return "anonymous"
			}()).Msg("WebSocket client disconnected")

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					delete(h.clients, client)
					close(client.send)
				}
			}
			h.mu.RUnlock()
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

	data, err := json.Marshal(notification)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal ticket created notification")
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		// Skip sending to the creator
		if creatorID != nil && client.userID != nil && *client.userID == *creatorID {
			continue
		}

		select {
		case client.send <- data:
		default:
			// Client's send channel is full, remove it
			delete(h.clients, client)
			close(client.send)
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

	data, err := json.Marshal(notification)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal ticket assigned notification")
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		// Only send to the assigned user
		if client.userID != nil && *client.userID == assignedUserID {
			select {
			case client.send <- data:
			default:
				// Client's send channel is full, remove it
				delete(h.clients, client)
				close(client.send)
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

	data, err := json.Marshal(notification)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal ticket unassigned notification")
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		// Only send to the unassigned user
		if client.userID != nil && *client.userID == unassignedUserID {
			select {
			case client.send <- data:
			default:
				// Client's send channel is full, remove it
				delete(h.clients, client)
				close(client.send)
			}
		}
	}
}

func (h *Hub) HandleWebSocket(c *websocket.Conn, userID *string) {
	client := &Client{
		conn:   c,
		userID: userID,
		send:   make(chan []byte, 256),
	}

	h.register <- client

	// Start goroutines for reading and writing
	go client.writePump(h)
	go client.readPump(h)
}

func (c *Client) readPump(h *Hub) {
	defer func() {
		h.unregister <- c
		c.conn.Close()
	}()

	// Set initial read deadline to 70 seconds (longer than ping interval)
	c.conn.SetReadDeadline(time.Now().Add(70 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		// Reset read deadline when pong is received
		c.conn.SetReadDeadline(time.Now().Add(70 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Error().Err(err).Msg("WebSocket read error")
			}
			break
		}
	}
}

func (c *Client) writePump(h *Hub) {
	// Send ping every 30 seconds to keep connection alive
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Error().Err(err).Msg("WebSocket write error")
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Error().Err(err).Msg("WebSocket ping error")
				return
			}
		}
	}
}
