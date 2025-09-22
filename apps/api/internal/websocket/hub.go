package websocket

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	socketio "github.com/googollee/go-socket.io"

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
	socket  socketio.Conn
	userID  *string // nil for anonymous users
	room    string  // room name for targeted notifications
}

type Hub struct {
	server  *socketio.Server
	clients map[string]*Client // socket ID -> client mapping
	mu      sync.RWMutex
}

func NewHub() *Hub {
	server := socketio.NewServer(nil)
	
	hub := &Hub{
		server:  server,
		clients: make(map[string]*Client),
	}

	// Set up Socket.IO event handlers
	server.OnConnect("/", func(s socketio.Conn) error {
		log.Info().Str("socketID", s.ID()).Msg("Socket.IO client connected")
		return nil
	})

	server.OnEvent("/", "join", func(s socketio.Conn, userID string) {
		hub.mu.Lock()
		defer hub.mu.Unlock()
		
		client := &Client{
			socket: s,
			userID: &userID,
			room:   userID,
		}
		hub.clients[s.ID()] = client
		
		// Join user-specific room for targeted notifications
		s.Join(userID)
		
		log.Info().
			Str("socketID", s.ID()).
			Str("userID", userID).
			Msg("Socket.IO client joined user room")
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		hub.mu.Lock()
		defer hub.mu.Unlock()
		
		if client, exists := hub.clients[s.ID()]; exists {
			if client.userID != nil {
				log.Info().
					Str("socketID", s.ID()).
					Str("userID", *client.userID).
					Str("reason", reason).
					Msg("Socket.IO client disconnected")
			} else {
				log.Info().
					Str("socketID", s.ID()).
					Str("reason", reason).
					Msg("Socket.IO anonymous client disconnected")
			}
			delete(hub.clients, s.ID())
		}
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		log.Error().Err(e).Str("socketID", s.ID()).Msg("Socket.IO error")
	})

	return hub
}

func (h *Hub) Run() {
	// Socket.IO server will be served by the main HTTP server
	// No need to start a separate server
}

func (h *Hub) GetServer() *socketio.Server {
	return h.server
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

	// Broadcast to all connected clients except the creator
	for _, client := range h.clients {
		// Skip sending to the creator
		if creatorID != nil && client.userID != nil && *client.userID == *creatorID {
			continue
		}

		client.socket.Emit("notification", string(data))
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

	// Send to specific user room
	h.server.BroadcastToRoom("/", assignedUserID, "notification", string(data))
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

	// Send to specific user room
	h.server.BroadcastToRoom("/", unassignedUserID, "notification", string(data))
}