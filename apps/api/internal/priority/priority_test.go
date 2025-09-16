package priority

import "testing"

func TestPriority(t *testing.T) {
	// Red flag wins
	out := Compute(PriorityInput{ RedFlags: struct {
		Outage          bool `json:"outage"`
		PaymentsFailing bool `json:"paymentsFailing"`
		SecurityBreach  bool `json:"securityBreach"`
		NonCompliance   bool `json:"nonCompliance"`
	}{Outage: true}})
	if out.Priority != "P0" {
		t.Fatalf("expected P0, got %s", out.Priority)
	}

	// P1 example
	var in PriorityInput
	in.Impact.SevereSecurity = true // +4
	in.Urgency = "3-7d" // +2 => 6
	out = Compute(in)
	if out.Priority != "P1" || out.Final != 6 {
		t.Fatalf("expected P1/6, got %s/%d", out.Priority, out.Final)
	}

	// P2 example
	in = PriorityInput{}
	in.Impact.LostRevenue = true // +2
	in.Urgency = "8-30d"         // +1 => 3
	out = Compute(in)
	if out.Priority != "P2" || out.Final != 3 {
		t.Fatalf("expected P2/3, got %s/%d", out.Priority, out.Final)
	}

	// P3 example
	in = PriorityInput{}
	in.Urgency = ">=31d"
	out = Compute(in)
	if out.Priority != "P3" || out.Final != 0 {
		t.Fatalf("expected P3/0, got %s/%d", out.Priority, out.Final)
	}
}