package models

type Role string
type TicketStatus string
type TicketInitialType string
type TicketResolvedType string
type TicketPriority string

const (
	RoleAnonymous  Role = "Anonymous"
	RoleUser       Role = "User"
	RoleSupervisor Role = "Supervisor"
	RoleManager    Role = "Manager"
)

const (
	StatusPending    TicketStatus = "pending"
	StatusInProgress TicketStatus = "in_progress"
	StatusCompleted  TicketStatus = "completed"
	StatusCanceled   TicketStatus = "canceled"
)

const (
	InitialIssueReport               TicketInitialType = "ISSUE_REPORT"
	InitialChangeRequestNormal       TicketInitialType = "CHANGE_REQUEST_NORMAL"
	InitialServiceDataCorrection     TicketInitialType = "SERVICE_REQUEST_DATA_CORRECTION"
	InitialServiceDataExtraction     TicketInitialType = "SERVICE_REQUEST_DATA_EXTRACTION"
	InitialServiceAdvisory           TicketInitialType = "SERVICE_REQUEST_ADVISORY"
	InitialServiceGeneral            TicketInitialType = "SERVICE_REQUEST_GENERAL"
)

const (
	ResolvedEmergencyChange TicketResolvedType = "EMERGENCY_CHANGE"
	ResolvedDataCorrection  TicketResolvedType = "DATA_CORRECTION"
)

const (
	PriorityP0 TicketPriority = "P0"
	PriorityP1 TicketPriority = "P1"
	PriorityP2 TicketPriority = "P2"
	PriorityP3 TicketPriority = "P3"
)