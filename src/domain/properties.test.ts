import { it, expect } from "vitest";
import { demoSnapshot } from "../data/demo";
import { defaultRules } from "../config/rules";
import { defaultReviewSettings } from "../config/reviewSettings";
import {
  filterProperties,
  propertyMetrics,
  sortProperties,
} from "./properties";
const ref = "2026-11-13T14:00:00Z",
  r = defaultRules;
it("preserves all property entities and Unknown group, with reconciled record counts", () => {
  const groups = propertyMetrics(
    demoSnapshot,
    demoSnapshot.workOrders,
    ref,
    r,
    defaultReviewSettings,
  );
  expect(groups).toHaveLength(4);
  expect(groups.reduce((n, m) => n + m.stats.total, 0)).toBe(24);
  expect(groups.reduce((n, m) => n + m.stats.open, 0)).toBe(14);
  expect(groups.find((m) => m.key === "unknown")?.stats.total).toBe(1);
  const zero = propertyMetrics(demoSnapshot, [], ref, r, defaultReviewSettings);
  expect(zero).toHaveLength(4);
  expect(zero.every((m) => m.stats.total === 0 && m.stats.mean === null)).toBe(
    true,
  );
});
it("uses configurable observed-volume/aging/approval/unassigned/repeated-category thresholds", () => {
  const groups = propertyMetrics(
    demoSnapshot,
    demoSnapshot.workOrders,
    ref,
    r,
    {
      ...defaultReviewSettings,
      highVolumeOrders: 8,
      repeatedCategoryOrders: 2,
    },
  );
  const juniper = groups.find((m) => m.key === "demo:p:0")!;
  expect(juniper.signals).toEqual(
    expect.arrayContaining(["volume", "aging", "approval", "repeated"]),
  );
  expect(
    juniper.repeated.every((c) => c.rows.length >= 2 && c.key !== "unknown"),
  ).toBe(true);
  const strict = propertyMetrics(
    demoSnapshot,
    demoSnapshot.workOrders,
    ref,
    r,
    {
      ...defaultReviewSettings,
      highVolumeOrders: 100,
      multipleAgedOrders: 100,
      pendingApprovals: 100,
      unassignedOrders: 100,
      repeatedCategoryOrders: 100,
    },
  );
  expect(strict.every((m) => !m.signals.length)).toBe(true);
});
it("supports directory search/signals/workload and typed stable sorting with unknown means last", () => {
  const groups = propertyMetrics(
    demoSnapshot,
    demoSnapshot.workOrders,
    ref,
    r,
    defaultReviewSettings,
  );
  expect(filterProperties(groups, "JUNIPER", "aging", "open")).toHaveLength(1);
  expect(filterProperties(groups, "", "", "none").map((m) => m.key)).toEqual([
    "unknown",
  ]);
  for (const direction of [1, -1] as const)
    expect(
      sortProperties(groups, "mean", direction)
        .slice(-2)
        .every((m) => m.stats.mean === null),
    ).toBe(true);
  expect(sortProperties(groups, "total", -1)[0].stats.total).toBe(8);
});
it("does not invent addresses, recurring failures or directory entries for unmatched property IDs", () => {
  const s = structuredClone(demoSnapshot);
  s.workOrders = [{ ...s.workOrders[0], propertyId: "missing-id" }];
  const groups = propertyMetrics(
      s,
      s.workOrders,
      ref,
      r,
      defaultReviewSettings,
    ),
    unknown = groups.find((m) => m.key === "unknown")!;
  expect(unknown.property).toBeNull();
  expect(unknown.repeated).toEqual([]);
  expect(
    groups
      .filter((m) => m.property)
      .every((m) => m.property!.permittedAddress === undefined),
  ).toBe(true);
});
