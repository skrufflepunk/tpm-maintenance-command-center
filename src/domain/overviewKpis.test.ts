import { describe, it, expect } from "vitest";
import { overviewKpis } from "./overviewKpis";
import { demoSnapshot } from "../data/demo";
import { defaultRules } from "../config/rules";
import type { WorkOrder } from "./types";
const reference = "2026-11-13T14:00:00Z";
const cards = (rows: WorkOrder[] = demoSnapshot.workOrders, ref = reference) =>
  overviewKpis(rows, ref, defaultRules);
describe("Overview KPI cohorts", () => {
  it("uses the actual scoped demo records and report month", () => {
    const k = cards();
    expect(k.map((c) => c.value)).toEqual([14, 3, 7, 4, 76 / 6]);
    expect(k[3].scope).toContain("2026-11");
    expect(k[4].rows).toHaveLength(6);
    expect(k[4].unit).toBe("calendar days");
  });
  it("returns zero counts and unavailable mean for an empty scope", () => {
    expect(cards([]).map((c) => c.value)).toEqual([0, 0, 0, 0, null]);
  });
  it("does not mix precision or include invalid/inverted completion pairs", () => {
    const base = {
      ...demoSnapshot.workOrders[4],
      createdAt: { value: "2026-11-01", precision: "date" as const },
      completedAt: { value: "2026-11-03", precision: "date" as const },
    };
    const inverted = {
      ...base,
      id: "invalid",
      completedAt: { value: "2026-10-31", precision: "date" as const },
    };
    expect(cards([base, inverted])[4].value).toBe(2);
    expect(cards([inverted])[4].value).toBeNull();
    const instant = {
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
    };
    expect(cards([instant])[4].value).toBe(1.5);
    expect(cards([base, instant])[4].value).toBeNull();
  });
  it("excludes missing, prior-month and future completion dates; invalid month is unavailable", () => {
    const base = demoSnapshot.workOrders[4];
    const row = (value: string | null) => ({
      ...base,
      completedAt: value ? { value, precision: "date" as const } : null,
    });
    expect(cards([row(null)])[3].value).toBeNull();
    expect(
      cards([
        row("2026-10-31"),
        row("2026-11-01"),
        row("2026-11-14"),
        row("invalid"),
      ])[3].value,
    ).toBe(1);
    expect(cards([base], "invalid")[3].value).toBeNull();
  });
  it("uses portfolio timezone for month boundaries and synchronizes configured aging thresholds", () => {
    const base = {
      ...demoSnapshot.workOrders[4],
      completedAt: {
        value: "2026-11-01T01:00:00Z",
        precision: "instant" as const,
      },
    };
    expect(cards([base])[3].value).toBe(0);
    const k = overviewKpis(demoSnapshot.workOrders, reference, {
      ...defaultRules,
      agingNudgeDays: 30,
    });
    expect(k[2].title).toBe("Over 30 Days Old");
    expect(k[2].value).toBe(3);
    expect(cards([demoSnapshot.workOrders[2]])[2].value).toBe(0);
  });
});
