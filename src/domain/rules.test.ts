import { describe, expect, it } from "vitest";
import { defaultRules, validateRules } from "../config/rules";
import { demoSnapshot } from "../data/demo";
import {
  age,
  bucket,
  bucketLabels,
  completionStats,
  dateKey,
  emptyFilters,
  freshness,
  matchesReason,
  selectOrders,
  sortQueue,
} from "./rules";
import type { WorkOrder } from "./types";
const reference = "2026-11-13T14:00:00Z";
const base: WorkOrder = {
  ...demoSnapshot.workOrders[0],
  id: "test:a",
  createdAt: { value: "2026-11-06", precision: "date" },
  vendorAssignmentState: "unassigned",
  fieldCoverage: { vendorAssignmentState: "explicitly_absent" },
  priority: "normal",
  approvalState: "not_required",
  status: "open",
};
describe("calendar aging and eligibility", () => {
  it.each([
    ["2026-11-13", 0, 0, false],
    ["2026-11-06", 7, 0, false],
    ["2026-11-05", 8, 1, true],
    ["2026-10-30", 14, 1, true],
    ["2026-10-29", 15, 2, true],
    ["2026-10-14", 30, 2, true],
    ["2026-10-13", 31, 3, true],
  ] as const)("handles boundary %s", (value, days, index, nudge) => {
    const w = { ...base, createdAt: { value, precision: "date" as const } };
    expect(age(w, reference, defaultRules)).toBe(days);
    expect(bucket(w, reference, defaultRules)).toBe(
      bucketLabels(defaultRules)[index],
    );
    expect(matchesReason(w, "aged", reference, defaultRules)).toBe(nudge);
  });
  it("preserves unknown, invalid, future, terminal and unknown-status values", () => {
    for (const value of [
      null,
      { value: "2026-02-30", precision: "date" as const },
      { value: "bad", precision: "date" as const },
      { value: "2026-11-14", precision: "date" as const },
    ])
      expect(
        age({ ...base, createdAt: value }, reference, defaultRules),
      ).toBeNull();
    for (const status of ["completed", "cancelled", "unknown"] as const) {
      const w = { ...base, status };
      expect(age(w, reference, defaultRules)).toBeNull();
      expect(matchesReason(w, "unassigned", reference, defaultRules)).toBe(
        false,
      );
    }
  });
  it("uses portfolio calendar dates for offset timestamps and rejects offset-free timestamps", () => {
    expect(
      dateKey(
        { value: "2026-11-07T01:00:00Z", precision: "instant" },
        defaultRules.timezone,
      ),
    ).toBe("2026-11-06");
    expect(
      dateKey(
        { value: "2026-11-07T01:00:00", precision: "instant" },
        defaultRules.timezone,
      ),
    ).toBeNull();
    expect(
      dateKey({ value: "2026-11-06", precision: "date" }, "Pacific/Auckland"),
    ).toBe("2026-11-06");
  });
  it("does not turn missing vendor coverage or unmatched assigned IDs into unassigned", () => {
    expect(matchesReason(base, "unassigned", reference, defaultRules)).toBe(
      true,
    );
    expect(
      matchesReason(
        { ...base, vendorAssignmentState: "unknown" },
        "unassigned",
        reference,
        defaultRules,
      ),
    ).toBe(false);
    expect(
      matchesReason(
        {
          ...base,
          fieldCoverage: { vendorAssignmentState: "column_unavailable" },
        },
        "unassigned",
        reference,
        defaultRules,
      ),
    ).toBe(false);
    expect(
      matchesReason(
        { ...base, vendorAssignmentState: "assigned", vendorId: "unmatched" },
        "unassigned",
        reference,
        defaultRules,
      ),
    ).toBe(false);
  });
  it("uses explicit approval and source urgency only on active records", () => {
    expect(
      matchesReason(
        { ...base, approvalState: "unknown" },
        "pending",
        reference,
        defaultRules,
      ),
    ).toBe(false);
    expect(
      matchesReason(
        { ...base, priority: "high" },
        "urgent",
        reference,
        defaultRules,
      ),
    ).toBe(false);
    expect(
      matchesReason(
        { ...base, priority: "urgent", status: "completed" },
        "urgent",
        reference,
        defaultRules,
      ),
    ).toBe(false);
  });
});
describe("shared selectors and queue", () => {
  it("combines filter families with AND and same-family values with OR", () => {
    const f = {
      ...emptyFilters,
      status: ["open", "in_progress"],
      property: ["demo:p:0"],
    };
    const rows = selectOrders(demoSnapshot, f, defaultRules, reference);
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every(
        (w) =>
          ["open", "in_progress"].includes(w.status) &&
          w.propertyId === "demo:p:0",
      ),
    ).toBe(true);
    expect(
      selectOrders(
        demoSnapshot,
        { ...f, query: "not present" },
        defaultRules,
        reference,
      ),
    ).toHaveLength(0);
    expect(
      selectOrders(
        demoSnapshot,
        { ...emptyFilters, query: "jUNIPER" },
        defaultRules,
        reference,
      ),
    ).toHaveLength(8);
  });
  it("excludes unknown dates from date ranges and supports unknown selections", () => {
    const rows = selectOrders(
      demoSnapshot,
      { ...emptyFilters, createdFrom: "2026-11-01", createdTo: "2026-11-06" },
      defaultRules,
      reference,
    );
    expect(rows.length).toBe(6);
    expect(
      selectOrders(
        demoSnapshot,
        { ...emptyFilters, status: ["unknown"] },
        defaultRules,
        reference,
      ),
    ).toHaveLength(2);
    expect(
      selectOrders(
        demoSnapshot,
        { ...emptyFilters, vendor: ["unknown"] },
        defaultRules,
        reference,
      ),
    ).toHaveLength(4);
    expect(
      selectOrders(
        demoSnapshot,
        { ...emptyFilters, bucket: ["Unknown age"] },
        defaultRules,
        reference,
      ),
    ).toHaveLength(1);
  });
  it("sorts by reason, descending age, then stable ID, with unknown age last", () => {
    const rows = [
      { ...base, id: "b" },
      { ...base, id: "a" },
      { ...base, id: "urgent", priority: "urgent" as const, createdAt: null },
      { ...base, id: "unknown-age", createdAt: null },
    ];
    expect(sortQueue(rows, reference, defaultRules).map((w) => w.id)).toEqual([
      "urgent",
      "a",
      "b",
      "unknown-age",
    ]);
    expect(rows[0].id).toBe("b");
  });
});
describe("completion duration, configuration and freshness", () => {
  it("keeps calendar and elapsed durations separate and excludes invalid or mixed pairs", () => {
    const w = { ...base, status: "completed" as const };
    const rows = [
      {
        ...w,
        completedAt: { value: "2026-11-06", precision: "date" as const },
      },
      {
        ...w,
        completedAt: { value: "2026-11-08", precision: "date" as const },
      },
      {
        ...w,
        completedAt: { value: "2026-11-05", precision: "date" as const },
      },
      {
        ...w,
        completedAt: {
          value: "2026-11-08T00:00:00Z",
          precision: "instant" as const,
        },
      },
      { ...w, createdAt: null },
      {
        ...w,
        createdAt: {
          value: "2026-11-01T00:00:00Z",
          precision: "instant" as const,
        },
        completedAt: {
          value: "2026-11-02T12:00:00Z",
          precision: "instant" as const,
        },
      },
    ];
    const stats = completionStats(rows, defaultRules.timezone);
    expect(stats.date).toEqual({ n: 2, mean: 1, median: 1 });
    expect(stats.instant.mean).toBe(1.5);
    expect(stats.excluded).toBe(3);
    expect(completionStats([], defaultRules.timezone).date.mean).toBeNull();
  });
  it("validates thresholds and strictly increasing bucket boundaries", () => {
    expect(() =>
      validateRules({ ...defaultRules, agingBucketBoundaries: [7, 7, 30] }),
    ).toThrow();
    expect(() =>
      validateRules({ ...defaultRules, timezone: "Invalid/Zone" }),
    ).toThrow();
    expect(() =>
      validateRules({ ...defaultRules, agingNudgeDays: -1 }),
    ).toThrow();
  });
  it("does not report fresh source data from a recent import of an old report", () => {
    expect(freshness("2026-11-01T00:00:00Z", reference, reference, 24)).toBe(
      "Source stale",
    );
    expect(freshness(null, reference, reference, 24)).toBe(
      "Receipt only within threshold",
    );
    expect(freshness("bad", reference, reference, 24)).toBe(
      "Unknown freshness",
    );
  });
});

it("respects a configured queue reason order", () => {
  const rules = validateRules({
    ...defaultRules,
    queueReasonOrder: ["unassigned", "aged", "pending", "urgent"],
  });
  const urgent = {
    ...base,
    id: "urgent",
    priority: "urgent" as const,
    vendorAssignmentState: "assigned" as const,
  };
  expect(sortQueue([urgent, base], reference, rules).map((w) => w.id)).toEqual([
    base.id,
    urgent.id,
  ]);
  expect(() =>
    validateRules({
      ...rules,
      queueReasonOrder: ["urgent", "pending", "aged", "unassigned", "urgent"],
    }),
  ).toThrow();
  expect(
    dateKey(
      { value: "2026-02-30T12:00:00Z", precision: "instant" },
      rules.timezone,
    ),
  ).toBeNull();
});
