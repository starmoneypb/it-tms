export type PriorityInput = {
  redFlags: {
    outage?: boolean;
    paymentsFailing?: boolean;
    securityBreach?: boolean;
    nonCompliance?: boolean;
  };
  impact: {
    lostRevenue?: boolean;
    coreProcesses?: boolean;
    dataLoss?: boolean;
  };
  urgency: "<=48h" | "3-7d" | "8-30d" | ">=31d" | "none";
};

export function computePriority(input: PriorityInput) {
  const red =
    !!input.redFlags?.outage ||
    !!input.redFlags?.paymentsFailing ||
    !!input.redFlags?.securityBreach ||
    !!input.redFlags?.nonCompliance;

  // New positive scoring system (0-10 scale)
  // Red Flags: 0/10 - If any red flag is selected, immediately get full 10 points
  let final = 0;
  let impact = 0;
  let urgency = 0;
  
  if (red) {
    // If any red flag is selected, score is immediately 10
    final = 10;
  } else {
    // Impact: 0/6 - Multiple selections allowed, 2 points each, max 6 points
    if (input.impact?.lostRevenue) impact += 2;      // Company loses revenue opportunities
    if (input.impact?.coreProcesses) impact += 2;    // Core business processes disrupted
    if (input.impact?.dataLoss) impact += 2;         // Data loss/corruption/duplication
    if (impact > 6) impact = 6;  // Cap at maximum 6 points

    // Urgency: 0/4 - Single selection only
    urgency =
      input.urgency === "<=48h" ? 4 :   // Deadline ≤48 hours
      input.urgency === "3-7d" ? 3 :    // Deadline 3-7 days
      input.urgency === "8-30d" ? 2 :   // Deadline 8-30 days
      input.urgency === ">=31d" ? 1 :   // Deadline ≥31 days
      0;                                // No deadline

    // Calculate final score (max 10: 6 impact + 4 urgency)
    final = impact + urgency;
    if (final > 10) final = 10;  // Cap at maximum 10 points
  }

  // Determine priority based on score ranges
  const priority =
    red || final === 10 ? "P0" :  // Red flag or maximum score (10)
    final >= 8 ? "P1" :           // High score (8-9)
    final >= 5 ? "P2" : "P3";    // Medium score (5-7), P3 for low scores (0-4)

  return { 
    redFlag: red, 
    impact,
    urgency,
    final,
    priority 
  };
}