package models

import "time"

type Ticket struct {
	ID           string             `json:"id"`
	Code         int32              `json:"code"`
	CreatedBy    *string            `json:"createdBy,omitempty"`
	ContactEmail *string            `json:"contactEmail,omitempty"`
	ContactPhone *string            `json:"contactPhone,omitempty"`
	InitialType  TicketInitialType  `json:"initialType"`
	ResolvedType *TicketResolvedType `json:"resolvedType,omitempty"`
	Status       TicketStatus       `json:"status"`
	Title        string             `json:"title"`
	Description  string             `json:"description"`
	Details      map[string]any     `json:"details"`
	ImpactScore  int32              `json:"impactScore"`
	UrgencyScore int32              `json:"urgencyScore"`
	FinalScore   int32              `json:"finalScore"`
	RedFlag      bool               `json:"redFlag"`
	Priority     TicketPriority     `json:"priority"`
	AssigneeID   *string            `json:"assigneeId,omitempty"`
	CreatedAt    time.Time          `json:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt"`
	ClosedAt     *time.Time         `json:"closedAt,omitempty"`
}

type Comment struct {
	ID        string    `json:"id"`
	TicketID  string    `json:"ticketId"`
	AuthorID  *string   `json:"authorId,omitempty"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
}

type Attachment struct {
	ID        string    `json:"id"`
	TicketID  string    `json:"ticketId"`
	Filename  string    `json:"filename"`
	MIME      string    `json:"mime"`
	Size      int64     `json:"size"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"createdAt"`
}

type AuditLog struct {
	ID        string    `json:"id"`
	TicketID  string    `json:"ticketId"`
	ActorID   *string   `json:"actorId,omitempty"`
	Action    string    `json:"action"`
	Before    any       `json:"before,omitempty"`
	After     any       `json:"after,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}