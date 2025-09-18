package main

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/it-tms/apps/api/internal/models"
	"github.com/it-tms/apps/api/internal/priority"
)

// User struct for seeding
type usr struct{ id, email, name, role string }

func main() {
	dburl := env("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/it_tms?sslmode=disable")
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dburl)
	if err != nil { panic(err) }
	defer pool.Close()

	fmt.Println("Seeding users...")
	users := []struct{
		Name, Email, Role, Password string
	}{
		// Management Team
		{"Sarah Johnson", "sarah.johnson@techcorp.com", "Manager", "Password!1"},
		{"Michael Chen", "michael.chen@techcorp.com", "Manager", "Password!1"},
		
		// Supervisors
		{"Emily Rodriguez", "emily.rodriguez@techcorp.com", "Supervisor", "Password!1"},
		{"David Kim", "david.kim@techcorp.com", "Supervisor", "Password!1"},
		{"Lisa Thompson", "lisa.thompson@techcorp.com", "Supervisor", "Password!1"},
		
		// Regular Users
		{"Alex Martinez", "alex.martinez@techcorp.com", "User", "Password!1"},
		{"Jessica Wong", "jessica.wong@techcorp.com", "User", "Password!1"},
		{"Ryan O'Connor", "ryan.oconnor@techcorp.com", "User", "Password!1"},
		{"Priya Patel", "priya.patel@techcorp.com", "User", "Password!1"},
		{"James Wilson", "james.wilson@techcorp.com", "User", "Password!1"},
		{"Maria Garcia", "maria.garcia@techcorp.com", "User", "Password!1"},
		{"Kevin Zhang", "kevin.zhang@techcorp.com", "User", "Password!1"},
		
		// Legacy test users (for backward compatibility)
		{"Manager", "manager@example.com", "Manager", "Password!1"},
		{"Supervisor", "supervisor@example.com", "Supervisor", "Password!1"},
		{"User", "user@example.com", "User", "Password!1"},
	}
	for _, u := range users {
		hash, _ := bcrypt.GenerateFromPassword([]byte(u.Password), 12)
		_, _ = pool.Exec(ctx, `INSERT INTO users (name, email, role, password_hash) 
								VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
			u.Name, u.Email, u.Role, string(hash))
	}

	// Clear existing tickets and related data
	fmt.Println("Clearing existing tickets...")
	_, _ = pool.Exec(ctx, `DELETE FROM user_scores`)
	_, _ = pool.Exec(ctx, `DELETE FROM audit_logs`)
	_, _ = pool.Exec(ctx, `DELETE FROM comment_attachments`)
	_, _ = pool.Exec(ctx, `DELETE FROM comments`)
	_, _ = pool.Exec(ctx, `DELETE FROM ticket_assignments`)
	_, _ = pool.Exec(ctx, `DELETE FROM attachments`)
	_, _ = pool.Exec(ctx, `DELETE FROM tickets`)
	
	fmt.Println("Seeding realistic tickets...")
	// Fetch user ids with roles
	all := []usr{}
	managers := []usr{}
	supervisors := []usr{}
	regularUsers := []usr{}
	
	rows, _ := pool.Query(ctx, `SELECT id, email, name, role FROM users`)
	for rows.Next() { 
		var u usr
		rows.Scan(&u.id, &u.email, &u.name, &u.role)
		all = append(all, u)
		switch u.role {
		case "Manager":
			managers = append(managers, u)
		case "Supervisor":
			supervisors = append(supervisors, u)
		case "User":
			regularUsers = append(regularUsers, u)
		}
	}
	rows.Close()

	rand.Seed(time.Now().UnixNano())
	
	// Create realistic ticket scenarios
	tickets := createRealisticTickets()
	
	for i, ticket := range tickets {
		// Calculate realistic priority based on the scenario
		priorityInput := ticket.PriorityInput
		priorityResult := priority.Compute(priorityInput)
		
		// Select appropriate creator based on ticket type
		var creator usr
		if ticket.InitialType == models.InitialIssueReport {
			creator = regularUsers[rand.Intn(len(regularUsers))]
		} else if ticket.InitialType == models.InitialChangeRequestNormal {
			if rand.Float32() < 0.7 {
				seniorStaff := append(supervisors, managers...)
				creator = seniorStaff[rand.Intn(len(seniorStaff))]
			} else {
				creator = regularUsers[rand.Intn(len(regularUsers))]
			}
		} else {
			creator = all[rand.Intn(len(all))]
		}
		
		// Calculate creation time (spread over last 30 days)
		hoursAgo := rand.Intn(720) // 0-30 days ago
		createdAt := time.Now().Add(time.Duration(-hoursAgo) * time.Hour)
		
		// Insert ticket with enhanced scoring data
		var ticketID string
		err := pool.QueryRow(ctx, `
			INSERT INTO tickets (
				created_by, initial_type, status, title, description, details, 
				impact_score, urgency_score, final_score, red_flag, priority,
				red_flags_data, impact_assessment_data, urgency_timeline_data,
				created_at, updated_at
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
			RETURNING id`,
			creator.id, ticket.InitialType, ticket.Status, ticket.Title, ticket.Description, "{}",
			priorityResult.Impact, priorityResult.Urgency, priorityResult.Final, priorityResult.RedFlag, priorityResult.Priority,
			ticket.RedFlagsData, ticket.ImpactAssessmentData, ticket.UrgencyTimelineData,
			createdAt, createdAt.Add(time.Duration(rand.Intn(hoursAgo/2)) * time.Hour),
		).Scan(&ticketID)
		
		if err != nil {
			fmt.Printf("Error inserting ticket %d: %v\n", i+1, err)
			continue
		}
		
		// Assign tickets realistically
		if ticket.Status != models.StatusPending {
			assignees := selectAssignees(ticket, regularUsers, supervisors, managers)
			for _, assignee := range assignees {
				_, _ = pool.Exec(ctx, `
					INSERT INTO ticket_assignments (ticket_id, assignee_id, assigned_at, assigned_by)
					VALUES ($1, $2, $3, $4)`,
					ticketID, assignee.id, createdAt.Add(time.Duration(rand.Intn(24)) * time.Hour), creator.id)
			}
			
			// Award points for completed tickets
			if ticket.Status == models.StatusCompleted && len(assignees) > 0 {
				pointsPerAssignee := float64(priorityResult.Final) / float64(len(assignees))
				for _, assignee := range assignees {
					_, _ = pool.Exec(ctx, `
						INSERT INTO user_scores (user_id, ticket_id, points, awarded_at)
						VALUES ($1, $2, $3, $4)`,
						assignee.id, ticketID, pointsPerAssignee, 
						createdAt.Add(time.Duration(rand.Intn(hoursAgo)) * time.Hour))
				}
			}
		}
		
		// Add realistic comments
		addRealisticComments(ctx, pool, ticketID, ticket, creator, all)
	}
	
	fmt.Printf("Seeded %d realistic tickets with proper scoring!\n", len(tickets))
}

func env(k, d string) string {
	if v, ok := os.LookupEnv(k); ok { return v }
	return d
}

// Ticket template for seeding
type TicketTemplate struct {
	Title                  string
	Description            string
	InitialType            models.TicketInitialType
	Status                 models.TicketStatus
	PriorityInput          priority.PriorityInput
	RedFlagsData          string
	ImpactAssessmentData  string
	UrgencyTimelineData   string
}

func createRealisticTickets() []TicketTemplate {
	return []TicketTemplate{
		// Critical P0 tickets with red flags
		{
			Title: "Production Payment Gateway Down - Customer Transactions Failing",
			Description: "Our main payment gateway has been unresponsive for the past 2 hours. Customers are unable to complete purchases, and we're receiving numerous complaints. This is affecting our entire e-commerce platform and causing significant revenue loss.",
			InitialType: models.InitialIssueReport,
			Status: models.StatusCompleted,
			PriorityInput: priority.PriorityInput{
				RedFlags: struct {
					Outage          bool `json:"outage"`
					PaymentsFailing bool `json:"paymentsFailing"`
					SecurityBreach  bool `json:"securityBreach"`
					NonCompliance   bool `json:"nonCompliance"`
				}{Outage: true, PaymentsFailing: true},
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{PaymentAbnormal: true, LostRevenue: true, NoWorkaround: true},
				Urgency: "<=48h",
			},
			RedFlagsData: `{"criticalIssues": {"outage": true, "paymentsFailing": true}, "description": "Critical system outage affecting payment processing"}`,
			ImpactAssessmentData: `{"impacts": {"paymentAbnormal": true, "lostRevenue": true, "noWorkaround": true}, "score": 12, "description": "Severe impact on revenue and customer experience"}`,
			UrgencyTimelineData: `{"timeline": "<=48h", "score": 5, "description": "Immediate resolution required"}`,
		},
		{
			Title: "Security Breach Detected - Unauthorized Database Access",
			Description: "Our security monitoring system has detected unauthorized access attempts to our customer database. Immediate investigation and remediation required. Potentially compromised user data includes email addresses and encrypted passwords.",
			InitialType: models.InitialIssueReport,
			Status: models.StatusInProgress,
			PriorityInput: priority.PriorityInput{
				RedFlags: struct {
					Outage          bool `json:"outage"`
					PaymentsFailing bool `json:"paymentsFailing"`
					SecurityBreach  bool `json:"securityBreach"`
					NonCompliance   bool `json:"nonCompliance"`
				}{SecurityBreach: true, NonCompliance: true},
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{LawNonCompliance: true, SevereSecurity: true, NoWorkaround: true},
				Urgency: "<=48h",
			},
			RedFlagsData: `{"criticalIssues": {"securityBreach": true, "nonCompliance": true}, "description": "Data breach with potential GDPR implications"}`,
			ImpactAssessmentData: `{"impacts": {"lawNonCompliance": true, "severeSecurity": true, "noWorkaround": true}, "score": 12, "description": "Legal compliance and security vulnerability"}`,
			UrgencyTimelineData: `{"timeline": "<=48h", "score": 5, "description": "Immediate containment required"}`,
		},
		
		// High priority P1 tickets
		{
			Title: "Email Service Intermittent Failures - Customer Notifications Delayed",
			Description: "Our email notification service is experiencing intermittent failures. Approximately 30% of customer emails (order confirmations, password resets, etc.) are being delayed or not delivered. This affects customer communication and user experience.",
			InitialType: models.InitialIssueReport,
			Status: models.StatusCompleted,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{LostRevenue: true, NoWorkaround: true},
				Urgency: "<=48h",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "No immediate red flags, but customer impact"}`,
			ImpactAssessmentData: `{"impacts": {"lostRevenue": true, "noWorkaround": true}, "score": 5, "description": "Customer communication disruption"}`,
			UrgencyTimelineData: `{"timeline": "<=48h", "score": 5, "description": "Customer experience priority"}`,
		},
		{
			Title: "Database Performance Degradation - Query Response Times Increased",
			Description: "Database query response times have increased by 300% over the past 24 hours. Application performance is noticeably slower, and some operations are timing out. Investigation shows high CPU usage on the database server.",
			InitialType: models.InitialIssueReport,
			Status: models.StatusInProgress,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{LostRevenue: true},
				Urgency: "3-7d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Performance issue requiring optimization"}`,
			ImpactAssessmentData: `{"impacts": {"lostRevenue": true}, "score": 3, "description": "Performance impact on user experience"}`,
			UrgencyTimelineData: `{"timeline": "3-7d", "score": 3, "description": "Needs resolution within a week"}`,
		},
		
		// Medium priority P2 tickets
		{
			Title: "User Interface Bug - Shopping Cart Items Disappearing",
			Description: "Users are reporting that items occasionally disappear from their shopping carts when navigating between pages. This appears to be a session management issue affecting approximately 5% of users. Workaround available by refreshing the page.",
			InitialType: models.InitialIssueReport,
			Status: models.StatusPending,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{LostRevenue: true},
				Urgency: "8-30d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "UI bug with workaround available"}`,
			ImpactAssessmentData: `{"impacts": {"lostRevenue": true}, "score": 3, "description": "Minor revenue impact with workaround"}`,
			UrgencyTimelineData: `{"timeline": "8-30d", "score": 2, "description": "Can be scheduled for next sprint"}`,
		},
		{
			Title: "Mobile App - Push Notifications Not Working on iOS",
			Description: "Push notifications are not working correctly on iOS devices running version 16.0 and above. Android notifications work fine. This affects user engagement and order status updates for iOS users.",
			InitialType: models.InitialIssueReport,
			Status: models.StatusInProgress,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{NoWorkaround: true},
				Urgency: "8-30d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Platform-specific notification issue"}`,
			ImpactAssessmentData: `{"impacts": {"noWorkaround": true}, "score": 2, "description": "iOS user experience impact"}`,
			UrgencyTimelineData: `{"timeline": "8-30d", "score": 2, "description": "Needs iOS development resources"}`,
		},
		
		// Service requests
		{
			Title: "New Feature Request - Customer Wishlist Functionality",
			Description: "Multiple customers have requested the ability to save items to a wishlist for future purchase. This would improve user engagement and provide marketing opportunities. Requires database schema changes and UI development.",
			InitialType: models.InitialServiceGeneral,
			Status: models.StatusPending,
			PriorityInput: priority.PriorityInput{
				Urgency: ">=31d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Feature enhancement request"}`,
			ImpactAssessmentData: `{"impacts": {}, "score": 0, "description": "Enhancement for user experience"}`,
			UrgencyTimelineData: `{"timeline": ">=31d", "score": 0, "description": "Feature for future release"}`,
		},
		{
			Title: "Data Export Request - Q4 Sales Analytics",
			Description: "Finance team requires comprehensive sales data export for Q4 2024 analysis. Need to extract transaction data, customer demographics, and product performance metrics. Data should be formatted for Excel analysis.",
			InitialType: models.InitialServiceDataExtraction,
			Status: models.StatusCompleted,
			PriorityInput: priority.PriorityInput{
				Urgency: "3-7d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Routine data extraction request"}`,
			ImpactAssessmentData: `{"impacts": {}, "score": 0, "description": "Business intelligence requirement"}`,
			UrgencyTimelineData: `{"timeline": "3-7d", "score": 3, "description": "Quarterly reporting deadline"}`,
		},
		
		// Change requests
		{
			Title: "Infrastructure Upgrade - Migrate to New Cloud Provider",
			Description: "Plan and execute migration from current cloud infrastructure to AWS for better performance and cost optimization. This includes database migration, application deployment, DNS updates, and SSL certificate management.",
			InitialType: models.InitialChangeRequestNormal,
			Status: models.StatusInProgress,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{LostRevenue: true},
				Urgency: "8-30d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Planned infrastructure migration"}`,
			ImpactAssessmentData: `{"impacts": {"lostRevenue": true}, "score": 3, "description": "Potential downtime during migration"}`,
			UrgencyTimelineData: `{"timeline": "8-30d", "score": 2, "description": "Planned maintenance window"}`,
		},
		{
			Title: "Security Enhancement - Implement Two-Factor Authentication",
			Description: "Implement 2FA for all user accounts to enhance security posture. This includes SMS and authenticator app support, backup codes, and admin controls for enforcement. Required for SOC2 compliance.",
			InitialType: models.InitialChangeRequestNormal,
			Status: models.StatusCompleted,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{SevereSecurity: true},
				Urgency: "3-7d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Security enhancement for compliance"}`,
			ImpactAssessmentData: `{"impacts": {"severeSecurity": true}, "score": 5, "description": "Security improvement for compliance"}`,
			UrgencyTimelineData: `{"timeline": "3-7d", "score": 3, "description": "Compliance deadline approaching"}`,
		},
		
		// Additional realistic scenarios
		{
			Title: "API Rate Limiting Issues - Third-party Integration Failures",
			Description: "Our integration with the shipping provider API is hitting rate limits during peak hours, causing order fulfillment delays. Need to implement proper retry logic and consider upgrading to a higher tier plan.",
			InitialType: models.InitialIssueReport,
			Status: models.StatusPending,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{LostRevenue: true},
				Urgency: "3-7d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Third-party API integration issue"}`,
			ImpactAssessmentData: `{"impacts": {"lostRevenue": true}, "score": 3, "description": "Order fulfillment impact"}`,
			UrgencyTimelineData: `{"timeline": "3-7d", "score": 3, "description": "Customer satisfaction impact"}`,
		},
		{
			Title: "Customer Data Correction - Duplicate Account Merge",
			Description: "Customer John Smith (customer ID: 12345) has accidentally created multiple accounts and needs them merged. This includes order history, loyalty points, and personal information consolidation while maintaining data integrity.",
			InitialType: models.InitialServiceDataCorrection,
			Status: models.StatusCompleted,
			PriorityInput: priority.PriorityInput{
				Urgency: "3-7d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Customer service data correction"}`,
			ImpactAssessmentData: `{"impacts": {}, "score": 0, "description": "Individual customer account issue"}`,
			UrgencyTimelineData: `{"timeline": "3-7d", "score": 3, "description": "Customer service priority"}`,
		},
		{
			Title: "Performance Optimization - Image Loading Speed Improvement",
			Description: "Product images are loading slowly on mobile devices, affecting user experience and potentially impacting conversion rates. Need to implement lazy loading, WebP format support, and CDN optimization.",
			InitialType: models.InitialChangeRequestNormal,
			Status: models.StatusInProgress,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{LostRevenue: true},
				Urgency: "8-30d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Performance optimization initiative"}`,
			ImpactAssessmentData: `{"impacts": {"lostRevenue": true}, "score": 3, "description": "Mobile user experience improvement"}`,
			UrgencyTimelineData: `{"timeline": "8-30d", "score": 2, "description": "Performance improvement project"}`,
		},
		{
			Title: "Compliance Advisory - GDPR Data Retention Policy Update",
			Description: "Legal team requires guidance on updating our data retention policies to ensure GDPR compliance. Need to review current data storage practices, implement automated deletion processes, and update privacy policies.",
			InitialType: models.InitialServiceAdvisory,
			Status: models.StatusPending,
			PriorityInput: priority.PriorityInput{
				Impact: struct {
					LawNonCompliance bool `json:"lawNonCompliance"`
					SevereSecurity   bool `json:"severeSecurity"`
					PaymentAbnormal  bool `json:"paymentAbnormal"`
					LostRevenue      bool `json:"lostRevenue"`
					NoWorkaround     bool `json:"noWorkaround"`
				}{LawNonCompliance: true},
				Urgency: "8-30d",
			},
			RedFlagsData: `{"criticalIssues": {}, "description": "Legal compliance advisory"}`,
			ImpactAssessmentData: `{"impacts": {"lawNonCompliance": true}, "score": 5, "description": "Regulatory compliance requirement"}`,
			UrgencyTimelineData: `{"timeline": "8-30d", "score": 2, "description": "Compliance review timeline"}`,
		},
	}
}

func selectAssignees(ticket TicketTemplate, regularUsers, supervisors, managers []usr) []usr {
	var assignees []usr
	
	// Assign based on priority and type
	switch ticket.PriorityInput.RedFlags.Outage || ticket.PriorityInput.RedFlags.PaymentsFailing || ticket.PriorityInput.RedFlags.SecurityBreach || ticket.PriorityInput.RedFlags.NonCompliance {
	case true: // Red flag tickets get senior staff
		if len(managers) > 0 {
			assignees = append(assignees, managers[rand.Intn(len(managers))])
		}
		if len(supervisors) > 0 && rand.Float32() < 0.7 {
			assignees = append(assignees, supervisors[rand.Intn(len(supervisors))])
		}
	default:
		// Regular tickets get appropriate staff
		switch ticket.InitialType {
		case models.InitialChangeRequestNormal:
			if len(supervisors) > 0 {
				assignees = append(assignees, supervisors[rand.Intn(len(supervisors))])
			}
		case models.InitialServiceDataCorrection, models.InitialServiceDataExtraction:
			if len(regularUsers) > 0 {
				assignees = append(assignees, regularUsers[rand.Intn(len(regularUsers))])
			}
		default:
			// Random assignment for other types
			allStaff := append(append(regularUsers, supervisors...), managers...)
			if len(allStaff) > 0 {
				assignees = append(assignees, allStaff[rand.Intn(len(allStaff))])
			}
		}
	}
	
	// Sometimes add additional assignees for complex tickets
	if len(assignees) > 0 && rand.Float32() < 0.3 {
		allStaff := append(regularUsers, supervisors...)
		if len(allStaff) > 0 {
			additional := allStaff[rand.Intn(len(allStaff))]
			// Avoid duplicates
			duplicate := false
			for _, existing := range assignees {
				if existing.id == additional.id {
					duplicate = true
					break
				}
			}
			if !duplicate {
				assignees = append(assignees, additional)
			}
		}
	}
	
	return assignees
}

func addRealisticComments(ctx context.Context, pool *pgxpool.Pool, ticketID string, ticket TicketTemplate, creator usr, allUsers []usr) {
	comments := []string{}
	
	// Add comments based on ticket status and type
	switch ticket.Status {
	case models.StatusCompleted:
		comments = []string{
			"I'll investigate this issue right away.",
			"Found the root cause - implementing fix now.",
			"Fix deployed and tested. Monitoring for any issues.",
			"Issue resolved. All systems are functioning normally.",
		}
	case models.StatusInProgress:
		comments = []string{
			"Looking into this issue now.",
			"Initial investigation shows this might be related to the recent deployment.",
			"Working on a solution. Will update soon.",
		}
	case models.StatusPending:
		if rand.Float32() < 0.5 {
			comments = []string{
				"Thanks for reporting this. We'll investigate and get back to you.",
			}
		}
	}
	
	// Add comments with realistic timing
	for i, comment := range comments {
		var authorID *string
		if i == 0 {
			// First comment might be from creator or assignee
			if rand.Float32() < 0.3 {
				authorID = &creator.id
			} else if len(allUsers) > 0 {
				author := allUsers[rand.Intn(len(allUsers))]
				authorID = &author.id
			}
		} else {
			// Subsequent comments from various users
			if len(allUsers) > 0 {
				author := allUsers[rand.Intn(len(allUsers))]
				authorID = &author.id
			}
		}
		
		// Add comment with realistic timing
		hoursAgo := rand.Intn(24 * (len(comments) - i)) // More recent comments are closer to now
		commentTime := time.Now().Add(time.Duration(-hoursAgo) * time.Hour)
		
		_, _ = pool.Exec(ctx, `
			INSERT INTO comments (ticket_id, author_id, body, created_at, is_system_generated)
			VALUES ($1, $2, $3, $4, $5)`,
			ticketID, authorID, comment, commentTime, false)
	}
}