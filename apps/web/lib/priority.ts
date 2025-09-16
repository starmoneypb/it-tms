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

  let impact = 0;
  if (input.impact?.lawNonCompliance) impact += 4;
  if (input.impact?.severeSecurity) impact += 4;
  if (input.impact?.paymentAbnormal) impact += 4;
  if (input.impact?.lostRevenue) impact += 2;
  if (input.impact?.noWorkaround) impact += 1;
  impact = Math.min(7, impact);

  const urgency =
    input.urgency === "<=48h" ? 3 :
    input.urgency === "3-7d" ? 2 :
    input.urgency === "8-30d" ? 1 : 0;

  const final = Math.min(10, impact + urgency);
  const priority = red || final >= 9 ? "P0" : final >= 6 ? "P1" : final >= 3 ? "P2" : "P3";
  return { redFlag: red, impact, urgency, final, priority };
}