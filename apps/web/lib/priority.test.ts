import { describe, expect, it } from 'vitest'
import { computePriority } from "./priority";

describe("priority examples", () => {
  it("should calculate priorities correctly", () => {
    // Red flag should give P0 with 10 points
    expect(computePriority({ redFlags: { outage: true }, impact: {}, urgency: "none" }).priority).toBe("P0");
    expect(computePriority({ redFlags: { outage: true }, impact: {}, urgency: "none" }).final).toBe(10);
    
    // P0 example - maximum score without red flag (10)
    expect(computePriority({ redFlags: {}, impact: { lostRevenue: true, coreProcesses: true, dataLoss: true }, urgency: "<=48h" }).priority).toBe("P0");
    expect(computePriority({ redFlags: {}, impact: { lostRevenue: true, coreProcesses: true, dataLoss: true }, urgency: "<=48h" }).final).toBe(10);
    
    // P1 example - high score (8-9)
    expect(computePriority({ redFlags: {}, impact: { lostRevenue: true, coreProcesses: true }, urgency: "<=48h" }).priority).toBe("P1");
    expect(computePriority({ redFlags: {}, impact: { lostRevenue: true, coreProcesses: true }, urgency: "<=48h" }).final).toBe(8);
    
    // P2 example - medium score (5-7)
    expect(computePriority({ redFlags: {}, impact: { lostRevenue: true, coreProcesses: true }, urgency: "8-30d" }).priority).toBe("P2");
    expect(computePriority({ redFlags: {}, impact: { lostRevenue: true, coreProcesses: true }, urgency: "8-30d" }).final).toBe(6);
    
    // P3 example - low score (0-4)
    expect(computePriority({ redFlags: {}, impact: { lostRevenue: true }, urgency: ">=31d" }).priority).toBe("P3");
    expect(computePriority({ redFlags: {}, impact: { lostRevenue: true }, urgency: ">=31d" }).final).toBe(3);
    
    // Test red flag ignores impact/urgency
    const redFlagResult = computePriority({ redFlags: { paymentsFailing: true }, impact: { lostRevenue: true }, urgency: "<=48h" });
    expect(redFlagResult.priority).toBe("P0");
    expect(redFlagResult.final).toBe(10);
    expect(redFlagResult.impact).toBe(0);
    expect(redFlagResult.urgency).toBe(0);
  });
});