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

	impact := 0
	if p.Impact.LawNonCompliance { impact += 4 }
	if p.Impact.SevereSecurity { impact += 4 }
	if p.Impact.PaymentAbnormal { impact += 4 }
	if p.Impact.LostRevenue { impact += 2 }
	if p.Impact.NoWorkaround { impact += 1 }
	if impact > 7 { impact = 7 }

	urgency := 0
	switch p.Urgency {
	case "<=48h":
		urgency = 3
	case "3-7d":
		urgency = 2
	case "8-30d":
		urgency = 1
	default:
		urgency = 0
	}

	final := impact + urgency
	if final > 10 { final = 10 }

	priority := "P3"
	if red || final >= 9 {
		priority = "P0"
	} else if final >= 6 {
		priority = "P1"
	} else if final >= 3 {
		priority = "P2"
	}

	return PriorityOutput{
		Impact: impact, Urgency: urgency, Final: final, RedFlag: red, Priority: priority,
	}
}