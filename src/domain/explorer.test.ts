import { expect, it } from "vitest";
import { demoSnapshot } from "../data/demo";
import { defaultRules } from "../config/rules";
import { paginate, sortExplorer } from "./explorer";
import { emptyFilters, selectOrders } from "./rules";
const reference = "2026-11-13T14:00:00Z";
it("sorts typed ages and dates with nulls last in both directions without mutation", () => {
  for (const key of ["age", "created"] as const)
    for (const direction of [1, -1] as const) {
      const rows = sortExplorer(
        demoSnapshot.workOrders,
        key,
        direction,
        demoSnapshot,
        defaultRules,
        reference,
      );
      expect(rows.at(-1)!.createdAt).toBeNull();
      expect(new Set(rows.map((w) => w.id)).size).toBe(24);
    }
  expect(demoSnapshot.workOrders[0].number).toBe("DEMO-1001");
});
it("combines shared filters and explicit approval without inferring missing coverage", () => {
  const rows = selectOrders(
    demoSnapshot,
    { ...emptyFilters, status: ["open"], property: ["demo:p:0"] },
    defaultRules,
    reference,
  ).filter((w) => w.approvalState === "pending");
  expect(rows.map((w) => w.number)).toEqual(["DEMO-1001"]);
});
it("paginates, clamps empty/removed pages and preserves stable order", () => {
  const rows = demoSnapshot.workOrders;
  expect(paginate(rows, 2, 10).rows[0]).toEqual(rows[10]);
  expect(paginate(rows, 9, 10).page).toBe(3);
  expect(paginate([], 3, 10)).toEqual({ page: 1, pages: 1, rows: [] });
});

it("sorts mixed-precision creation dates by portfolio calendar date without inventing a date-only time", () => {
  const base = demoSnapshot.workOrders[0];
  const date = {
    ...base,
    id: "date",
    createdAt: { value: "2026-11-13", precision: "date" as const },
  };
  const previousLocalDay = {
    ...base,
    id: "instant",
    createdAt: { value: "2026-11-13T02:00:00Z", precision: "instant" as const },
  };
  expect(
    sortExplorer(
      [date, previousLocalDay],
      "created",
      1,
      demoSnapshot,
      defaultRules,
      reference,
    ).map((w) => w.id),
  ).toEqual(["instant", "date"]);
});
