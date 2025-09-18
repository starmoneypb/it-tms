package models

import "time"

type Ticket struct {
	ID                     string             `json:"id"`
	Code                   int32              `json:"code"`
	CreatedBy              *string            `json:"createdBy,omitempty"`
	ContactEmail           *string            `json:"contactEmail,omitempty"`
	ContactPhone           *string            `json:"contactPhone,omitempty"`
	InitialType            TicketInitialType  `json:"initialType"`
	ResolvedType           *TicketResolvedType `json:"resolvedType,omitempty"`
	Status                 TicketStatus       `json:"status"`
	Title                  string             `json:"title"`
	Description            string             `json:"description"`
	Details                map[string]any     `json:"details"`
	ImpactScore            int32              `json:"impactScore"`
	UrgencyScore           int32              `json:"urgencyScore"`
	FinalScore             int32              `json:"finalScore"`
	RedFlag                bool               `json:"redFlag"`
	Priority               TicketPriority     `json:"priority"`
	AssigneeID             *string            `json:"assigneeId,omitempty"` // Deprecated: use Assignees
	Assignees              []User             `json:"assignees,omitempty"`
	LatestComment          *string            `json:"latestComment,omitempty"`
	RedFlagsData           map[string]any     `json:"redFlagsData,omitempty"`
	ImpactAssessmentData   map[string]any     `json:"impactAssessmentData,omitempty"`
	UrgencyTimelineData    map[string]any     `json:"urgencyTimelineData,omitempty"`
	CreatedAt              time.Time          `json:"createdAt"`
	UpdatedAt              time.Time          `json:"updatedAt"`
	ClosedAt               *time.Time         `json:"closedAt,omitempty"`
}

type Comment struct {
	ID                string              `json:"id"`
	TicketID          string              `json:"ticketId"`
	AuthorID          *string             `json:"authorId,omitempty"`
	AuthorName        *string             `json:"authorName,omitempty"`
	AuthorRole        *string             `json:"authorRole,omitempty"`
	Body              string              `json:"body"`
	IsSystemGenerated bool                `json:"isSystemGenerated"`
	CreatedAt         time.Time           `json:"createdAt"`
	Attachments       []CommentAttachment `json:"attachments,omitempty"`
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

type UserScore struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	TicketID  string    `json:"ticketId"`
	Points    float64   `json:"points"`
	AwardedAt time.Time `json:"awardedAt"`
}

type UserRanking struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	Role             string  `json:"role"`
	TotalPoints      float64 `json:"totalPoints"`
	TicketsCompleted int     `json:"ticketsCompleted"`
	Rank             int     `json:"rank"`
}

type CommentAttachment struct {
	ID        string    `json:"id"`
	CommentID string    `json:"commentId"`
	Filename  string    `json:"filename"`
	MIME      string    `json:"mime"`
	Size      int64     `json:"size"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"createdAt"`
}

type TicketAssignment struct {
	ID         string    `json:"id"`
	TicketID   string    `json:"ticketId"`
	AssigneeID string    `json:"assigneeId"`
	AssignedAt time.Time `json:"assignedAt"`
	AssignedBy *string   `json:"assignedBy,omitempty"`
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