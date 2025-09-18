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
		LawNonCompliance bool `json:"lawNonCompliance"`
		SevereSecurity   bool `json:"severeSecurity"`
		PaymentAbnormal  bool `json:"paymentAbnormal"`
		LostRevenue      bool `json:"lostRevenue"`
		NoWorkaround     bool `json:"noWorkaround"`
	} `json:"impact"`
	Urgency string `json:"urgency"` // "<=48h" | "3-7d" | "8-30d" | ">=31d" | "none"
}

func Compute(p PriorityInput) PriorityOutput {
	red := p.RedFlags.Outage || p.RedFlags.PaymentsFailing || p.RedFlags.SecurityBreach || p.RedFlags.NonCompliance

	// New negative scoring system - higher impact = more negative score
	// Rearranged by original importance weights (4,4,4,2,1)
	impact := 0
	if p.Impact.LawNonCompliance { impact -= 5 }  // Highest importance: -5
	if p.Impact.SevereSecurity { impact -= 5 }   // Highest importance: -5  
	if p.Impact.PaymentAbnormal { impact -= 5 }  // Highest importance: -5
	if p.Impact.LostRevenue { impact -= 3 }      // Medium importance: -3
	if p.Impact.NoWorkaround { impact -= 2 }     // Lower importance: -2
	// Max impact: -20

	// Urgency scoring - more urgent = more negative
	urgency := 0
	switch p.Urgency {
	case "<=48h":
		urgency = -5  // Most urgent
	case "3-7d":
		urgency = -3  // High urgency
	case "8-30d":
		urgency = -2  // Medium urgency
	default:
		urgency = 0   // No urgency
	}
	// Max urgency: -5

	// Calculate base final score
	final := impact + urgency
	
	// Red Flag scoring - 5 points each as requested
	redFlagBonus := 0
	if red {
		redFlagCount := 0
		if p.RedFlags.Outage { redFlagCount++ }
		if p.RedFlags.PaymentsFailing { redFlagCount++ }
		if p.RedFlags.SecurityBreach { redFlagCount++ }
		if p.RedFlags.NonCompliance { redFlagCount++ }
		
		// Each red flag adds -5 points (more critical = more negative)
		redFlagBonus = redFlagCount * -5
		final += redFlagBonus
	}
	// Max red flag bonus: -20
	// Overall maximum score: -20 (impact) + -5 (urgency) + -20 (red flags) = -45
	// Adjust to end at exactly 0: add 45 to final
	final += 45

	// Priority determination based on new negative scale (higher negative = higher priority)
	// Adjusted thresholds for new 0-45 scale
	priority := "P3"
	if red || final <= 10 {      // Most critical (0-10 range)
		priority = "P0"
	} else if final <= 20 {      // High priority (11-20 range)
		priority = "P1"
	} else if final <= 35 {      // Medium priority (21-35 range)
		priority = "P2"
	}
	// P3 for final > 35 (low priority)

	return PriorityOutput{
		Impact: impact + 20, Urgency: urgency + 5, Final: final, RedFlag: red, Priority: priority,
	}
}