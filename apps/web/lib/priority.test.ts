import { computePriority } from "./priority";

test("priority examples", () => {
  expect(computePriority({ redFlags: { outage: true }, impact: {}, urgency: "none" }).priority).toBe("P0");
  expect(computePriority({ redFlags: {}, impact: { severeSecurity: true }, urgency: "3-7d" }).priority).toBe("P1");
  expect(computePriority({ redFlags: {}, impact: { lostRevenue: true }, urgency: "8-30d" }).priority).toBe("P2");
  expect(computePriority({ redFlags: {}, impact: {}, urgency: ">=31d" }).priority).toBe("P3");
});