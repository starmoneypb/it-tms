export type PriorityInput = {
  redFlags: {
    outage?: boolean;
    paymentsFailing?: boolean;
    securityBreach?: boolean;
    nonCompliance?: boolean;
  };
  impact: {
    lawNonCompliance?: boolean;
    severeSecurity?: boolean;
    paymentAbnormal?: boolean;
    lostRevenue?: boolean;
    noWorkaround?: boolean;
  };
  urgency: "<=48h" | "3-7d" | "8-30d" | ">=31d" | "none";
};

export function computePriority(input: PriorityInput) {
  const red =
    !!input.redFlags?.outage ||
    !!input.redFlags?.paymentsFailing ||
    !!input.redFlags?.securityBreach ||
    !!input.redFlags?.nonCompliance;

  // New additive scoring system - higher impact = higher score
  // Start from 0 and add points for each checked item
  let impact = 0;
  if (input.impact?.lawNonCompliance) impact += 5;  // Highest importance: +5
  if (input.impact?.severeSecurity) impact += 5;   // Highest importance: +5
  if (input.impact?.paymentAbnormal) impact += 5;  // Highest importance: +5
  if (input.impact?.lostRevenue) impact += 3;      // Medium importance: +3
  if (input.impact?.noWorkaround) impact += 2;     // Lower importance: +2
  // Max impact: 20

  // Urgency scoring - more urgent = higher score
  const urgency =
    input.urgency === "<=48h" ? 5 :   // Most urgent: +5
    input.urgency === "3-7d" ? 3 :    // High urgency: +3
    input.urgency === "8-30d" ? 2 :   // Medium urgency: +2
    input.urgency === ">=31d" ? 1 :   // Low urgency: +1
    0;                                // No urgency: 0
  // Max urgency: 5

  // Calculate base final score
  let final = impact + urgency;
  
  // Red Flag scoring - 5 points each (additive)
  if (red) {
    // Count active red flags
    let redFlagCount = 0;
    if (input.redFlags?.outage) redFlagCount++;
    if (input.redFlags?.paymentsFailing) redFlagCount++;
    if (input.redFlags?.securityBreach) redFlagCount++;
    if (input.redFlags?.nonCompliance) redFlagCount++;
    
    // Each red flag adds +5 points (more critical = higher score)
    final += redFlagCount * 5;
  }
  // Max red flag bonus: 20
  // Overall maximum score: 20 (impact) + 5 (urgency) + 20 (red flags) = 45

  // Priority determination based on additive 0-45 scale
  // Higher scores = Higher priority
  const priority = 
    red || final >= 35 ? "P0" :      // Most critical (35+ or red flag)
    final >= 25 ? "P1" :             // High priority (25-34 range)
    final >= 10 ? "P2" : "P3";       // Medium priority (10-24 range), P3 for < 10

  return { 
    redFlag: red, 
    impact,        // Direct value (0-20 range)
    urgency,       // Direct value (0-5 range)
    final,         // Direct value (0-45 range)
    priority 
  };
}