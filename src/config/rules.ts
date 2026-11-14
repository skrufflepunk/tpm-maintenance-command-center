import type { Rules } from "../domain/types";
export function validateRules(r: Rules): Rules {
  new Intl.DateTimeFormat("en", { timeZone: r.timezone });
  const nums = [
    r.agingNudgeDays,
    r.noObservedChangeDays,
    r.staleAfterHours,
    ...r.agingBucketBoundaries,
  ];
  if (
    nums.some((n) => !Number.isInteger(n) || n < 0) ||
    r.staleAfterHours === 0 ||
    r.noObservedChangeDays === 0 ||
    !r.agingBucketBoundaries.every((n, i, a) => i === 0 || n > a[i - 1])
  )
    throw new Error(
      "Rule values must be nonnegative integers with increasing age boundaries and positive freshness/history intervals.",
    );
  if (
    r.queueReasonOrder.length !== 4 ||
    new Set(r.queueReasonOrder).size !== 4 ||
    !["urgent", "pending", "aged", "unassigned"].every((reason) =>
      r.queueReasonOrder.includes(
        reason as (typeof r.queueReasonOrder)[number],
      ),
    )
  )
    throw new Error(
      "Queue order must contain each eligible reason exactly once.",
    );
  return r;
}
// Illustrative demo timezone and proposed thresholds, not approved operational settings.
export const defaultRules = validateRules({
  rulesVersion: "demo-1",
  timezone: "America/Mexico_City",
  agingNudgeDays: 7,
  agingBucketBoundaries: [7, 14, 30],
  noObservedChangeDays: 3,
  staleAfterHours: 24,
  queueReasonOrder: ["urgent", "pending", "aged", "unassigned"],
});
