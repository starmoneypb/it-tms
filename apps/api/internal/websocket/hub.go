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
	conn    *websocket.Conn
	userID  *string // nil for anonymous users
	room    string  // room name for targeted notifications
	send    chan Notification
	hub     *Hub
	closed  bool
	mu      sync.Mutex
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

// safeCloseSend safely closes the client's send channel
func (c *Client) safeCloseSend() {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if !c.closed {
		c.closed = true
		close(c.send)
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
				client.safeCloseSend()
				
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
					client.safeCloseSend()
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// HandleWebSocket handles WebSocket connections
func (h *Hub) HandleWebSocket(c *websocket.Conn) {
	// Create client
	client := &Client{
		conn:   c,
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
	client.readPump()
}

func (c *Client) readPump() {
	c.mu.Lock()
	shouldUnregister := !c.closed
	c.mu.Unlock()

	defer func() {
		if shouldUnregister {
			c.hub.unregister <- c
		}
		c.conn.Close()
	}()

	// Set read message size limit
	c.conn.SetReadLimit(512)

	for {
		messageType, messageData, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Error().Err(err).Msg("WebSocket read error")
			} else {
				log.Info().Msg("WebSocket client disconnected normally")
			}
			break
		}

		// Only handle text messages
		if messageType == websocket.TextMessage {
			var message struct {
				Type   string `json:"type"`
				UserID string `json:"userId"`
			}

			if err := json.Unmarshal(messageData, &message); err != nil {
				log.Error().Err(err).Msg("Failed to parse WebSocket message")
				continue
			}

			// Handle join message
			if message.Type == "join" && message.UserID != "" {
				// Update client info
				c.userID = &message.UserID
				c.room = message.UserID
				
				// Add to room without re-registering
				c.hub.mu.Lock()
				roomName := *c.userID
				if c.hub.rooms[roomName] == nil {
					c.hub.rooms[roomName] = make(map[*Client]bool)
				}
				c.hub.rooms[roomName][c] = true
				c.hub.mu.Unlock()
				
				log.Info().
					Str("userID", message.UserID).
					Msg("WebSocket client joined user room")
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case notification, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Send notification as JSON
			message := map[string]interface{}{
				"type": "notification",
				"data": notification,
			}
			
			data, err := json.Marshal(message)
			if err != nil {
				log.Error().Err(err).Msg("Failed to marshal notification")
				continue
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Error().Err(err).Msg("WebSocket write error")
				return
			}

		case <-ticker.C:
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
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