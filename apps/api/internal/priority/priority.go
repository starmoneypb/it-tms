package priority

type PriorityOutput struct {
	Impact   int  `json:"impact"`
	Urgency  int  `json:"urgency"`
	Final    int  `json:"final"`
	RedFlag  bool `json:"redFlag"`
	Priority string `json:"priority"`
}

type PriorityInput struct {
	RedFlags struct {
		Outage          bool `json:"outage"`
		PaymentsFailing bool `json:"paymentsFailing"`
		SecurityBreach  bool `json:"securityBreach"`
		NonCompliance   bool `json:"nonCompliance"`
	} `json:"redFlags"`
	Impact struct {
		LostRevenue      bool `json:"lostRevenue"`
		CoreProcesses    bool `json:"coreProcesses"`
		DataLoss         bool `json:"dataLoss"`
	} `json:"impact"`
	Urgency string `json:"urgency"` // "<=48h" | "3-7d" | "8-30d" | ">=31d" | "none"
}

func Compute(p PriorityInput) PriorityOutput {
	red := p.RedFlags.Outage || p.RedFlags.PaymentsFailing || p.RedFlags.SecurityBreach || p.RedFlags.NonCompliance

	// New positive scoring system (0-10 scale)
	// Red Flags: 0/10 - If any red flag is selected, immediately get full 10 points
	var final int
	impact := 0
	urgency := 0
	
	if red {
		// If any red flag is selected, score is immediately 10
		final = 10
	} else {
		// Impact: 0/6 - Multiple selections allowed, 2 points each, max 6 points
		if p.Impact.LostRevenue { impact += 2 }      // Company loses revenue opportunities
		if p.Impact.CoreProcesses { impact += 2 }    // Core business processes disrupted
		if p.Impact.DataLoss { impact += 2 }         // Data loss/corruption/duplication
		if impact > 6 { impact = 6 }  // Cap at maximum 6 points

		// Urgency: 0/4 - Single selection only
		switch p.Urgency {
		case "<=48h":
			urgency = 4  // Deadline ≤48 hours
		case "3-7d":
			urgency = 3  // Deadline 3-7 days
		case "8-30d":
			urgency = 2  // Deadline 8-30 days
		case ">=31d":
			urgency = 1  // Deadline ≥31 days
		default:
			urgency = 0  // No deadline
		}

		// Calculate final score (max 10: 6 impact + 4 urgency)
		final = impact + urgency
		if final > 10 { final = 10 }  // Cap at maximum 10 points
	}

	// Determine priority based on score ranges
	priority := "P3"
	if red || final == 10 {
		priority = "P0"  // Red flag or maximum score (10)
	} else if final >= 8 {
		priority = "P1"  // High score (8-9)
	} else if final >= 5 {
		priority = "P2"  // Medium score (5-7)
	}
	// P3 for low scores (0-4)

	return PriorityOutput{
		Impact:   impact,
		Urgency:  urgency,
		Final:    final,
		RedFlag:  red,
		Priority: priority,
	}
}