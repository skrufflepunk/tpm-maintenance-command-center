import { describe, it, expect } from "vitest";
import { demoSnapshot } from "../data/demo";
import { defaultRules } from "../config/rules";
import {
  actionQueue,
  actionKpis,
  actionRecommendations,
  filterActionQueue,
  noChangeEvidence,
} from "./actions";
import type { ObservationPair } from "./actions";
import type { WorkOrder } from "./types";
const reference = "2026-11-13T14:00:00Z";
const base: WorkOrder = {
  ...demoSnapshot.workOrders[0],
  priority: "normal",
  approvalState: "not_required",
  vendorAssignmentState: "assigned",
  vendorId: "assigned-id",
  createdAt: { value: "2026-11-06", precision: "date" },
  fieldCoverage: {
    status: "present",
    priority: "present",
    approvalState: "present",
    vendorAssignmentState: "present",
  },
};
describe("action eligibility and shared counts", () => {
  it("deduplicates records, retains every applicable reason, and reconciles the demo KPIs", () => {
    const items = actionQueue(demoSnapshot.workOrders, reference, defaultRules);
    expect(actionKpis(items, defaultRules).map((k) => k.value)).toEqual([
      9,
      7,
      3,
      1,
      null,
    ]);
    expect(items[0].order.number).toBe("DEMO-1010");
    expect(items[1].order.number).toBe("DEMO-1001");
    expect(items[1].recommendations.map((r) => r.key)).toEqual([
      "urgent",
      "pending",
    ]);
    expect(actionQueue([base, base], reference, defaultRules)).toHaveLength(0);
    const urgent = { ...base, priority: "urgent" as const };
    expect(actionQueue([urgent, urgent], reference, defaultRules)).toHaveLength(
      1,
    );
  });
  it("keeps terminal/unknown-status records and absent assignment evidence out of the queue", () => {
    for (const status of ["completed", "cancelled", "unknown"] as const)
      expect(
        actionQueue(
          [
            {
              ...base,
              status,
              priority: "urgent",
              approvalState: "pending",
              vendorAssignmentState: "unassigned",
            },
          ],
          reference,
          defaultRules,
        ),
      ).toHaveLength(0);
    expect(
      actionQueue(
        [
          {
            ...base,
            createdAt: null,
            vendorId: null,
            vendorAssignmentState: "unknown",
            approvalState: "unknown",
          },
        ],
        reference,
        defaultRules,
      ),
    ).toHaveLength(0);
    expect(
      actionRecommendations(
        {
          ...base,
          vendorId: null,
          vendorAssignmentState: "unassigned",
          fieldCoverage: { vendorAssignmentState: "column_unavailable" },
        },
        reference,
        defaultRules,
      ),
    ).toHaveLength(0);
  });
  it("uses strict calendar aging and configurable ordering, with known ages before unknown ages", () => {
    expect(actionRecommendations(base, reference, defaultRules)).toHaveLength(
      0,
    );
    const aged = {
      ...base,
      id: "aged",
      createdAt: { value: "2026-11-05", precision: "date" as const },
    };
    expect(actionRecommendations(aged, reference, defaultRules)[0].key).toBe(
      "aged",
    );
    expect(
      actionRecommendations(aged, reference, {
        ...defaultRules,
        agingNudgeDays: 30,
      }),
    ).toHaveLength(0);
    const pending = {
      ...base,
      id: "pending",
      approvalState: "pending" as const,
      createdAt: null,
    };
    const r = {
      ...defaultRules,
      queueReasonOrder: [
        "aged",
        "pending",
        "urgent",
        "unassigned",
      ] as typeof defaultRules.queueReasonOrder,
    };
    expect(
      actionQueue([pending, aged], reference, r).map((i) => i.order.id),
    ).toEqual(["aged", "pending"]);
  });
  it("filters by a reason without dropping multiple reasons or inventing scheduled data", () => {
    const items = actionQueue(demoSnapshot.workOrders, reference, defaultRules);
    expect(filterActionQueue(items, "pending")).toHaveLength(3);
    expect(filterActionQueue(items, "urgent")).toHaveLength(2);
    expect(filterActionQueue(items, "scheduled")).toEqual([]);
    expect(filterActionQueue(items, "all")).toEqual(items);
    expect(actionKpis([], defaultRules).map((k) => k.value)).toEqual([
      0,
      0,
      0,
      0,
      null,
    ]);
  });
  it("keeps recommendations qualified and gives supporting evidence", () => {
    const recs = actionRecommendations(
      {
        ...base,
        priority: "urgent",
        approvalState: "pending",
        vendorAssignmentState: "unassigned",
        vendorId: null,
        fieldCoverage: { vendorAssignmentState: "explicitly_absent" },
        createdAt: { value: "2026-10-01", precision: "date" },
      },
      reference,
      defaultRules,
    );
    expect(recs).toHaveLength(4);
    expect(
      recs.every((r) => r.fact.length > 10 && r.recommendation.length > 10),
    ).toBe(true);
    expect(recs[0].recommendation).toContain("does not declare an emergency");
    expect(JSON.stringify(recs)).not.toMatch(
      /ignored|missed an appointment|failed to respond/i,
    );
  });
});
function pair(): ObservationPair {
  const row = {
    ...structuredClone(base),
    createdAt: { value: "2026-10-01", precision: "date" as const },
  };
  return {
    previous: {
      ...structuredClone(demoSnapshot),
      sourceMode: "csv",
      importedAt: "2026-11-01T10:00:00Z",
      workOrders: [structuredClone(row)],
    },
    current: {
      ...structuredClone(demoSnapshot),
      sourceMode: "csv",
      importedAt: "2026-11-04T10:00:00Z",
      workOrders: [structuredClone(row)],
    },
  };
}
describe("conservative observed-unchanged eligibility", () => {
  it("requires comparable loads spanning the full configurable interval", () => {
    const p = pair();
    expect(
      noChangeEvidence(p.current.workOrders[0], p, defaultRules),
    ).toContain("does not establish inactivity");
    expect(
      actionRecommendations(
        p.current.workOrders[0],
        reference,
        defaultRules,
        p,
      ).some((r) => r.key === "no_change"),
    ).toBe(true);
    p.current.importedAt = "2026-11-04T09:59:59Z";
    expect(
      noChangeEvidence(p.current.workOrders[0], p, defaultRules),
    ).toBeNull();
  });
  it("rejects missing history, incompatible scope, changed values, future/inverted clocks and unknown coverage", () => {
    expect(noChangeEvidence(base, null, defaultRules)).toBeNull();
    for (const change of [
      (p: ObservationPair) => {
        p.current.datasets[0].reportScope.comparisonKey = "different";
      },
      (p: ObservationPair) => {
        p.current.mappingVersion = "different";
      },
      (p: ObservationPair) => {
        p.current.workOrders[0].priority = "high";
      },
      (p: ObservationPair) => {
        p.current.workOrders[0].fieldCoverage.approvalState =
          "column_unavailable";
      },
      (p: ObservationPair) => {
        p.current.workOrders[0].approvalState = "unknown";
      },
      (p: ObservationPair) => {
        p.current.importedAt = "2026-10-01T00:00:00Z";
      },
      (p: ObservationPair) => {
        p.previous.workOrders = [];
      },
    ]) {
      const p = pair();
      change(p);
      expect(
        noChangeEvidence(p.current.workOrders[0], p, defaultRules),
      ).toBeNull();
    }
  });
});
