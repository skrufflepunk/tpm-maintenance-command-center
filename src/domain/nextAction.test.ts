import { it, expect } from "vitest";
import { demoSnapshot } from "../data/demo";
import { defaultRules } from "../config/rules";
import { completionStatusConflict, nextReviewAction } from "./nextAction";
import { actionQueue } from "./actions";
import { followUpTemplate } from "./messageTemplates";
import { vendorTemplate } from "./vendorTemplates";
const ref = "2026-11-13T14:00:00Z",
  r = defaultRules;
it("tailors follow-up wording to verified approval and assignment states without changing eligibility", () => {
  const base = { ...demoSnapshot.workOrders[9], priority: "normal" as const };
  expect(nextReviewAction(base, ref, r)).toContain("vendor status update");
  expect(
    nextReviewAction({ ...base, approvalState: "pending" }, ref, r),
  ).toContain("owner");
  expect(
    nextReviewAction(
      { ...base, vendorAssignmentState: "unknown", vendorId: null },
      ref,
      r,
    ),
  ).toContain("verify assignment coverage");
  expect(
    nextReviewAction(
      {
        ...base,
        vendorAssignmentState: "unassigned",
        fieldCoverage: { vendorAssignmentState: "explicitly_absent" },
      },
      ref,
      r,
    ),
  ).toContain("vendor options");
  expect(actionQueue(demoSnapshot.workOrders, ref, r)).toHaveLength(9);
});
it("flags only supplied valid nonfuture completion dates on active statuses, with verification-only drafts", () => {
  const base = {
    ...demoSnapshot.workOrders[9],
    completedAt: { value: "2026-11-12", precision: "date" as const },
  };
  expect(completionStatusConflict(base, ref, r.timezone)).toBe(true);
  expect(nextReviewAction(base, ref, r)).toContain("whether closure is needed");
  expect(nextReviewAction(base, ref, r)).toContain("date alone does not prove");
  expect(followUpTemplate(base, demoSnapshot, "vendor")).toContain(
    "still listed as active",
  );
  expect(vendorTemplate(base, demoSnapshot, "status")).toContain("help verify");
  for (const changed of [
    { ...base, status: "completed" as const },
    { ...base, completedAt: null },
    {
      ...base,
      completedAt: { value: "2027-01-01", precision: "date" as const },
    },
    { ...base, completedAt: { value: "bad", precision: "date" as const } },
  ])
    expect(completionStatusConflict(changed, ref, r.timezone)).toBe(false);
  const recent = {
    ...base,
    priority: "normal" as const,
    approvalState: "not_required" as const,
    createdAt: { value: "2026-11-13", precision: "date" as const },
  };
  expect(actionQueue([recent], ref, r)).toEqual([]); // No new eligibility rule was silently added.
});
it("uses the supplied pending approval state in vendor drafts without inventing waiting time or decisions", () => {
  const text = vendorTemplate(
    { ...demoSnapshot.workOrders[9], approvalState: "pending" },
    demoSnapshot,
    "estimate",
  );
  expect(text).toContain("owner approval as pending");
  expect(text).not.toMatch(
    /overdue|ignored|approved yesterday|missed|unresponsive/,
  );
});
