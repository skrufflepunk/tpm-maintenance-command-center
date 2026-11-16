import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../data/demo";
import { defaultRules } from "../config/rules";
import { actionQueue } from "./actions";
import {
  demoDirectory,
  emptyVendorFilters,
  filterVendors,
  joinCompatible,
  sortVendors,
  vendorKpis,
  vendorReferenceLabel,
  vendorMetrics,
} from "./vendors";
import type { VendorDirectory } from "./vendors";
const reference = "2026-11-13T14:00:00Z",
  r = defaultRules;
const directory = () => demoDirectory(structuredClone(demoSnapshot));
const metrics = () =>
  directory().vendors.map((v) =>
    vendorMetrics(v, demoSnapshot, true, reference, r),
  );
describe("vendor workload and source integrity", () => {
  it("counts only explicitly assigned ID-related work orders, preserving terminal/unknown status distinctions", () => {
    const m = metrics();
    expect(m.map((x) => x.assigned)).toEqual([5, 5, 5]);
    expect(m.map((x) => x.active)).toEqual([3, 3, 3]);
    expect(m.map((x) => x.completed)).toEqual([2, 2, 0]);
    expect(vendorKpis(m, true)).toMatchObject({
      total: 3,
      active: null,
      unknownActive: 3,
      withOpen: 3,
      agedOrders: 5,
      followupVendors: 2,
    });
    const expected = actionQueue(demoSnapshot.workOrders, reference, r).filter(
      (i) => i.order.vendorAssignmentState === "assigned",
    );
    expect(
      m
        .flatMap((x) => x.followups)
        .map((i) => i.order.id)
        .sort(),
    ).toEqual(expected.map((i) => i.order.id).sort());
  });
  it("requires mode, account and verified namespace; names never join", () => {
    const d = directory();
    expect(joinCompatible(d, demoSnapshot)).toBe(true);
    for (const altered of [
      { ...d, sourceMode: "csv" as const },
      { ...d, verifiedIdentifiers: false },
      { ...d, dataset: { ...d.dataset, sourceAccountId: "other" } },
    ])
      expect(joinCompatible(altered, demoSnapshot)).toBe(false);
    const v = {
      ...d.vendors[0],
      id: "different-id",
      displayName: d.vendors[0].displayName,
    };
    expect(vendorMetrics(v, demoSnapshot, true, reference, r).assigned).toBe(0);
    const m = vendorMetrics(d.vendors[0], demoSnapshot, false, reference, r);
    expect(m.active).toBeNull();
    expect(m.average).toBeNull();
    expect(m.followups).toEqual([]);
  });
  it("uses strict configurable calendar aging and never invents assignment dates", () => {
    const s = structuredClone(demoSnapshot),
      v = s.vendors[0];
    s.workOrders = [
      {
        ...s.workOrders[0],
        vendorId: v.id,
        vendorAssignmentState: "assigned",
        createdAt: { value: "2026-11-06", precision: "date" },
      },
    ];
    expect(vendorMetrics(v, s, true, reference, r).aged).toBe(0);
    expect(
      vendorMetrics(v, s, true, reference, { ...r, agingNudgeDays: 6 }).aged,
    ).toBe(1);
    s.workOrders[0].createdAt = null;
    expect(vendorMetrics(v, s, true, reference, r).aged).toBe(0);
  });
  it("calculates valid completion cohorts without mixing precision or cancelled records", () => {
    const s = structuredClone(demoSnapshot),
      v = s.vendors[0],
      base = {
        ...s.workOrders[0],
        vendorId: v.id,
        vendorAssignmentState: "assigned" as const,
        status: "completed" as const,
      };
    s.workOrders = [
      {
        ...base,
        id: "a",
        createdAt: { value: "2026-11-01", precision: "date" },
        completedAt: { value: "2026-11-03", precision: "date" },
      },
      {
        ...base,
        id: "b",
        createdAt: { value: "2026-11-01T00:00:00Z", precision: "instant" },
        completedAt: { value: "2026-11-02T12:00:00Z", precision: "instant" },
      },
      { ...base, id: "c", createdAt: null },
      {
        ...base,
        id: "d",
        createdAt: { value: "2026-11-04", precision: "date" },
        completedAt: { value: "2026-11-03", precision: "date" },
      },
      { ...base, id: "e", status: "cancelled" },
    ];
    const m = vendorMetrics(v, s, true, reference, r);
    expect(m.completed).toBe(4);
    expect(m.average).toBeNull();
    expect(m.duration.date.mean).toBe(2);
    expect(m.duration.instant.mean).toBe(1.5);
    expect(m.duration.excluded).toBe(2);
  });
});
describe("vendor directory interactions", () => {
  it("searches names, IDs, types, supplied specialties and contacts without inferred specialties", () => {
    const d = directory(),
      m = metrics();
    expect(
      filterVendors(m, { ...emptyVendorFilters, query: "FIELDworks" }, d)
        .length,
    ).toBe(1);
    expect(
      filterVendors(m, { ...emptyVendorFilters, query: "hvac" }, d)[0].vendor
        .sourceId,
    ).toBe("v-2");
    m[0].vendor.categories = [];
    m[0].vendor.displayName = "Plumbing name only";
    expect(
      filterVendors(m, { ...emptyVendorFilters, specialty: "cat:0" }, d),
    ).toEqual([]);
    expect(
      filterVendors(m, { ...emptyVendorFilters, specialty: "unknown" }, d)
        .length,
    ).toBe(1);
  });
  it("combines active, workload and follow-up filters; missing states remain unknown", () => {
    const d = directory(),
      m = metrics();
    m[0].vendor.active = true;
    m[1].vendor.active = false;
    expect(
      filterVendors(
        m,
        {
          ...emptyVendorFilters,
          status: "active",
          followup: "yes",
          workload: "open",
        },
        d,
      ).map((m) => m.vendor.sourceId),
    ).toEqual(["v-0"]);
    expect(
      filterVendors(m, { ...emptyVendorFilters, status: "unknown" }, d).map(
        (m) => m.vendor.sourceId,
      ),
    ).toEqual(["v-2"]);
    expect(
      filterVendors(m, { ...emptyVendorFilters, followup: "no" }, d).map(
        (m) => m.vendor.sourceId,
      ),
    ).toEqual(["v-1"]);
  });
  it("sorts known values first in either direction and breaks ties by stable ID", () => {
    const m = metrics();
    expect(sortVendors(m, "average", 1).map((x) => x.vendor.sourceId)).toEqual([
      "v-1",
      "v-0",
      "v-2",
    ]);
    expect(sortVendors(m, "average", -1).map((x) => x.vendor.sourceId)).toEqual(
      ["v-0", "v-1", "v-2"],
    );
    expect(
      sortVendors(m, "assigned", -1).map((x) => x.vendor.sourceId),
    ).toEqual(["v-0", "v-1", "v-2"]);
  });
  it("does not pretend unknown vendor state is inactive or an unavailable join is zero", () => {
    const d = directory(),
      m = d.vendors.map((v) =>
        vendorMetrics(v, demoSnapshot, false, reference, r),
      );
    expect(vendorKpis(m, false)).toMatchObject({
      active: null,
      withOpen: null,
      agedOrders: null,
      followupVendors: null,
    });
    expect(
      filterVendors(m, { ...emptyVendorFilters, workload: "none" }, d),
    ).toEqual([]);
    expect(
      filterVendors(m, { ...emptyVendorFilters, workload: "unknown" }, d),
    ).toHaveLength(3);
    expect(
      d.vendors.every(
        (v) =>
          v.businessEmail === undefined &&
          v.liabilityInsuranceExpiration === undefined,
      ),
    ).toBe(true);
  });
  it("retains multiple independently supplied specialties", () => {
    const d: VendorDirectory = directory();
    d.vendors[0].categories = ["cat:0", "cat:1"];
    const m = d.vendors.map((v) =>
      vendorMetrics(v, demoSnapshot, true, reference, r),
    );
    expect(
      filterVendors(m, { ...emptyVendorFilters, specialty: "cat:1" }, d),
    ).toHaveLength(2);
    expect(m[0].vendor.categories).toEqual(["cat:0", "cat:1"]);
  });
});

it("preserves opaque unmatched references without URI decoding or invented identifiers", () => {
  const w = {
    ...demoSnapshot.workOrders[9],
    vendorId: "opaque:reference:%invalid:part",
    vendorAssignmentState: "assigned" as const,
  };
  expect(vendorReferenceLabel(w, null, false)).toBe(
    "Vendor reference opaque:reference:%invalid:part · name unavailable",
  );
  expect(
    vendorReferenceLabel(
      { ...w, vendorAssignmentState: "unknown" },
      null,
      false,
    ),
  ).toBe("Unknown assignment");
  expect(
    vendorReferenceLabel(
      { ...w, vendorAssignmentState: "unassigned" },
      null,
      false,
    ),
  ).toBe("Explicitly unassigned");
});
it("uses vendor names only under verified relationships and the same scoped identity/account", () => {
  const d = directory(),
    w = {
      ...demoSnapshot.workOrders[9],
      vendorAssignmentState: "assigned" as const,
    };
  expect(vendorReferenceLabel(w, d, true)).toBe("Demo Fieldworks");
  expect(vendorReferenceLabel(w, d, false)).not.toContain("Demo Fieldworks");
  expect(
    vendorReferenceLabel({ ...w, sourceAccountId: "different" }, d, true),
  ).not.toContain("Demo Fieldworks");
});
