package priority

import "testing"

func TestPriority(t *testing.T) {
	// Red flag wins - any red flag gives P0 with score 10
	out := Compute(PriorityInput{ RedFlags: struct {
		Outage          bool `json:"outage"`
		PaymentsFailing bool `json:"paymentsFailing"`
		SecurityBreach  bool `json:"securityBreach"`
		NonCompliance   bool `json:"nonCompliance"`
	}{Outage: true}})
	if out.Priority != "P0" || out.Final != 10 {
		t.Fatalf("expected P0/10, got %s/%d", out.Priority, out.Final)
	}

	// P0 example - maximum score without red flag (impact + urgency = 10)
	var in PriorityInput
	in.Impact.LostRevenue = true // +2
	in.Impact.CoreProcesses = true // +2
	in.Impact.DataLoss = true // +2 (total 6)
	in.Urgency = "<=48h" // +4 => 10 total (capped at 10)
	out = Compute(in)
	if out.Priority != "P0" || out.Final != 10 {
		t.Fatalf("expected P0/10, got %s/%d", out.Priority, out.Final)
	}

	// P1 example - high score (8-9)
	in = PriorityInput{}
	in.Impact.LostRevenue = true // +2
	in.Impact.CoreProcesses = true // +2 (total 4)
	in.Urgency = "<=48h" // +4 => 8 total
	out = Compute(in)
	if out.Priority != "P1" || out.Final != 8 {
		t.Fatalf("expected P1/8, got %s/%d", out.Priority, out.Final)
	}

	// P2 example - medium score (5-7)
	in = PriorityInput{}
	in.Impact.LostRevenue = true // +2
	in.Impact.CoreProcesses = true // +2 (total 4)
	in.Urgency = "8-30d" // +2 => 6 total
	out = Compute(in)
	if out.Priority != "P2" || out.Final != 6 {
		t.Fatalf("expected P2/6, got %s/%d", out.Priority, out.Final)
	}

	// P3 example - low score (0-4)
	in = PriorityInput{}
	in.Impact.LostRevenue = true // +2
	in.Urgency = ">=31d" // +1 => 3 total
	out = Compute(in)
	if out.Priority != "P3" || out.Final != 3 {
		t.Fatalf("expected P3/3, got %s/%d", out.Priority, out.Final)
	}

	// Test red flag ignores impact/urgency
	in = PriorityInput{}
	in.RedFlags.PaymentsFailing = true // Red flag = 10 points
	in.Impact.LostRevenue = true // Should be ignored
	in.Urgency = "<=48h" // Should be ignored
	out = Compute(in)
	if out.Priority != "P0" || out.Final != 10 || out.Impact != 0 || out.Urgency != 0 {
		t.Fatalf("expected P0/10 with impact 0, urgency 0, got %s/%d with impact %d, urgency %d", out.Priority, out.Final, out.Impact, out.Urgency)
	}
}