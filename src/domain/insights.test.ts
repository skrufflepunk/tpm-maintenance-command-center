import { describe, it, expect } from "vitest";
import { demoSnapshot } from "../data/demo";
import { defaultRules } from "../config/rules";
import {
  ageBreakdown,
  approvalBreakdown,
  assignmentBreakdown,
  categoryBreakdown,
  emptyInsightFilters,
  maintenanceStats,
  monthlyActivity,
  observedBacklog,
  selectInsightRows,
  validDateRange,
} from "./insights";
const ref = "2026-11-13T14:00:00Z",
  r = defaultRules;
describe("source-qualified analytics cohorts", () => {
  it("reconciles current cohorts, completion statistics and coverage to prior phases", () => {
    const rows = selectInsightRows(demoSnapshot, emptyInsightFilters, r),
      s = maintenanceStats(rows, ref, r);
    expect(s).toMatchObject({
      total: 24,
      open: 14,
      completed: 6,
      aged: 7,
      pending: 3,
      unassigned: 1,
      unknownStatus: 2,
      unknownAge: 1,
      n: 6,
    });
    expect(s.mean).toBeCloseTo(12.666666);
    expect(s.median).toBe(12);
    expect(
      ageBreakdown(rows, ref, r).reduce((n, g) => n + g.rows.length, 0),
    ).toBe(s.open);
    expect(approvalBreakdown(rows).reduce((n, g) => n + g.rows.length, 0)).toBe(
      s.open,
    );
    expect(
      assignmentBreakdown(rows).reduce((n, g) => n + g.rows.length, 0),
    ).toBe(s.open);
    expect(
      categoryBreakdown(rows, demoSnapshot).reduce(
        (n, g) => n + g.rows.length,
        0,
      ),
    ).toBe(24);
  });
  it("combines property/vendor/category/date filters and preserves missing dates without a range", () => {
    expect(
      selectInsightRows(
        demoSnapshot,
        {
          ...emptyInsightFilters,
          property: "demo:p:0",
          vendor: "demo:v:0",
          category: "cat:3",
        },
        r,
      ).map((w) => w.number),
    ).toEqual(["DEMO-1004", "DEMO-1016"]);
    expect(
      selectInsightRows(
        demoSnapshot,
        { ...emptyInsightFilters, from: "2026-11-01", to: "2026-11-06" },
        r,
      ),
    ).toHaveLength(6);
    const completed = selectInsightRows(
      demoSnapshot,
      { ...emptyInsightFilters, dateBasis: "completed", from: "2026-11-01" },
      r,
    );
    expect(completed).toHaveLength(4);
    expect(completed.every((w) => w.status === "completed")).toBe(true);
    expect(
      selectInsightRows(demoSnapshot, emptyInsightFilters, r),
    ).toHaveLength(24);
    expect(
      selectInsightRows(
        demoSnapshot,
        { ...emptyInsightFilters, vendor: "unknown" },
        r,
      ).every((w) => w.vendorAssignmentState === "unknown"),
    ).toBe(true);
  });
  it("routes unresolved and cross-account property relationships into Unknown", () => {
    const s = structuredClone(demoSnapshot);
    s.workOrders[0].propertyId = "unresolved";
    s.workOrders[1].sourceAccountId = "other-account";
    const rows = selectInsightRows(
      s,
      { ...emptyInsightFilters, property: "unknown" },
      r,
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((w) => w.id)).toContain(s.workOrders[1].id);
  });
  it("rejects invalid/inverted ranges and excludes missing completion dates from ranged cohorts", () => {
    for (const f of [
      { ...emptyInsightFilters, from: "2026-02-30" },
      { ...emptyInsightFilters, from: "2026-11-10", to: "2026-11-01" },
    ]) {
      expect(validDateRange(f)).toBe(false);
      expect(selectInsightRows(demoSnapshot, f, r)).toEqual([]);
    }
    const s = structuredClone(demoSnapshot);
    s.workOrders = [
      {
        ...s.workOrders[0],
        status: "open",
        completedAt: { value: "2026-11-01", precision: "date" },
      },
    ];
    expect(
      selectInsightRows(
        s,
        { ...emptyInsightFilters, dateBasis: "completed", from: "2026-11-01" },
        r,
      ),
    ).toEqual([]);
  });
  it("keeps mean and median unavailable for empty/invalid/mixed completion cohorts", () => {
    expect(maintenanceStats([], ref, r)).toMatchObject({
      mean: null,
      median: null,
      n: 0,
    });
    const base = {
      ...demoSnapshot.workOrders[0],
      status: "completed" as const,
    };
    const rows = [
      {
        ...base,
        createdAt: { value: "2026-11-01", precision: "date" as const },
        completedAt: { value: "2026-11-03", precision: "date" as const },
      },
      {
        ...base,
        id: "instant",
        createdAt: {
          value: "2026-11-01T00:00:00Z",
          precision: "instant" as const,
        },
        completedAt: {
          value: "2026-11-02T12:00:00Z",
          precision: "instant" as const,
        },
      },
      { ...base, id: "invalid", createdAt: null },
    ];
    const s = maintenanceStats(rows, ref, r);
    expect(s).toMatchObject({ mean: null, median: null, mixed: true, n: 2 });
    expect(s.duration.date).toMatchObject({ mean: 2, median: 2, n: 1 });
    expect(s.duration.instant).toMatchObject({ mean: 1.5, median: 1.5, n: 1 });
    expect(s.duration.excluded).toBe(1);
  });
});
describe("observed event series and retained backlog history", () => {
  it("groups actual dates in source timezone, excludes future/invalid events and invents no empty months", () => {
    const base = demoSnapshot.workOrders[0];
    const rows = [
      {
        ...base,
        createdAt: {
          value: "2026-03-01T00:30:00Z",
          precision: "instant" as const,
        },
      },
      {
        ...base,
        id: "other",
        status: "completed" as const,
        createdAt: null,
        completedAt: { value: "2026-05-04", precision: "date" as const },
      },
      {
        ...base,
        id: "future",
        createdAt: { value: "2027-01-01", precision: "date" as const },
      },
      {
        ...base,
        id: "invalid",
        createdAt: { value: "bad", precision: "date" as const },
      },
    ];
    const series = monthlyActivity(rows, ref, "America/Los_Angeles");
    expect(series.months.map((m) => m.month)).toEqual(["2026-02", "2026-05"]);
    expect(series.months[0].created).toHaveLength(1);
    expect(series.months[1].completed).toHaveLength(1);
    expect(series.excludedCreated).toBe(3);
    expect(
      monthlyActivity(
        rows,
        ref,
        r.timezone,
        "2026-05-01",
        "2026-05-31",
      ).months.map((m) => m.month),
    ).toEqual(["2026-05"]);
  });
  it("counts completion events only from completed status and permits valid events without valid duration pairs", () => {
    const row = {
      ...demoSnapshot.workOrders[0],
      createdAt: null,
      completedAt: { value: "2026-11-01", precision: "date" as const },
    };
    expect(monthlyActivity([row], ref, r.timezone).months).toEqual([]);
    const result = monthlyActivity(
      [{ ...row, status: "completed" }],
      ref,
      r.timezone,
    );
    expect(result.months[0].completed).toHaveLength(1);
    expect(maintenanceStats([{ ...row, status: "completed" }], ref, r).n).toBe(
      0,
    );
  });
  it("shows only compatible actual load observations; first/demo/incompatible histories remain unavailable", () => {
    expect(observedBacklog(null, emptyInsightFilters, r)).toBeNull();
    const a = {
        ...structuredClone(demoSnapshot),
        sourceMode: "csv" as const,
        importedAt: "2026-11-01T10:00:00Z",
      },
      b = {
        ...structuredClone(demoSnapshot),
        sourceMode: "csv" as const,
        importedAt: "2026-11-02T10:00:00Z",
      };
    expect(
      observedBacklog({ previous: a, current: b }, emptyInsightFilters, r)?.map(
        (p) => p.open,
      ),
    ).toEqual([14, 14]);
    b.workOrders[0].status = "completed";
    expect(
      observedBacklog({ previous: a, current: b }, emptyInsightFilters, r)?.map(
        (p) => p.open,
      ),
    ).toEqual([14, 13]);
    b.datasets[0].reportScope.comparisonKey = "different";
    expect(
      observedBacklog({ previous: a, current: b }, emptyInsightFilters, r),
    ).toBeNull();
    expect(
      observedBacklog(
        { previous: demoSnapshot, current: demoSnapshot },
        emptyInsightFilters,
        r,
      ),
    ).toBeNull();
  });
});
