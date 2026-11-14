import { nextReviewAction } from "./nextAction";
import { age, dateKey, localDate, isActive, reasons, sortQueue } from "./rules";
import type { Rules, Snapshot, WorkOrder } from "./types";
export type ActionReason =
  | "urgent"
  | "pending"
  | "aged"
  | "unassigned"
  | "no_change";
export type ActionFocus = "all" | ActionReason | "scheduled";
export interface ObservationPair {
  previous: Snapshot;
  current: Snapshot;
}
export interface ActionRecommendation {
  key: ActionReason;
  title: string;
  fact: string;
  recommendation: string;
}
export interface ActionItem {
  order: WorkOrder;
  recommendations: ActionRecommendation[];
}
export const actionLabels: Record<ActionReason, string> = {
  urgent: "Source urgent",
  pending: "Pending owner approval",
  aged: "Aging maintenance",
  unassigned: "Vendor assignment missing",
  no_change: "No relevant change observed",
};
export function noChangeEvidence(
  w: WorkOrder,
  pair: ObservationPair | null,
  r: Rules,
): string | null {
  if (!pair || !isActive(w)) return null;
  const { previous: a, current: b } = pair,
    ad = a.datasets.find((d) => d.datasetType === "workOrders"),
    bd = b.datasets.find((d) => d.datasetType === "workOrders");
  if (
    !ad ||
    !bd ||
    a.sourceMode !== b.sourceMode ||
    a.sourceMode === "demo" ||
    ad.sourceAccountId !== bd.sourceAccountId ||
    ad.reportScope.comparisonKey !== bd.reportScope.comparisonKey ||
    ad.sourceTimezone !== bd.sourceTimezone ||
    a.schemaVersion !== b.schemaVersion ||
    a.mappingVersion !== b.mappingVersion
  )
    return null;
  const before = a.workOrders.find((o) => o.id === w.id),
    current = b.workOrders.find((o) => o.id === w.id);
  if (!before || !current || JSON.stringify(current) !== JSON.stringify(w))
    return null;
  const hours = (Date.parse(b.importedAt) - Date.parse(a.importedAt)) / 3600000;
  if (!Number.isFinite(hours) || hours < r.noObservedChangeDays * 24)
    return null;
  for (const row of [before, w]) {
    if (
      !isActive(row) ||
      row.priority === "unknown" ||
      row.approvalState === "unknown" ||
      row.vendorAssignmentState === "unknown" ||
      !dateKey(row.createdAt, r.timezone)
    )
      return null;
    for (const key of [
      "status",
      "priority",
      "approvalState",
      "vendorAssignmentState",
    ])
      if (!["present", "explicitly_absent"].includes(row.fieldCoverage[key]))
        return null;
  }
  if (
    dateKey(before.createdAt, r.timezone)! >
      localDate(a.importedAt, r.timezone)! ||
    dateKey(w.createdAt, r.timezone)! > localDate(b.importedAt, r.timezone)!
  )
    return null;
  const fields: (keyof WorkOrder)[] = [
    "status",
    "priority",
    "vendorId",
    "vendorAssignmentState",
    "approvalState",
    "createdAt",
    "completedAt",
    "sourceUpdatedAt",
  ];
  if (
    fields.some(
      (field) =>
        JSON.stringify(before[field] ?? null) !==
        JSON.stringify(w[field] ?? null),
    )
  )
    return null;
  if (JSON.stringify(before.fieldCoverage) !== JSON.stringify(w.fieldCoverage))
    return null;
  return `No relevant normalized change observed between loads at ${a.importedAt} and ${b.importedAt} (${r.noObservedChangeDays}+ elapsed days). This does not establish inactivity in Rentvine.`;
}
export function actionRecommendations(
  w: WorkOrder,
  reference: string,
  r: Rules,
  pair: ObservationPair | null = null,
): ActionRecommendation[] {
  const recs: ActionRecommendation[] = reasons(w, reference, r).map((key) => {
    switch (key) {
      case "urgent":
        return {
          key,
          title: actionLabels.urgent,
          fact: "The source priority is urgent on a known active record.",
          recommendation:
            "Review promptly and verify the current situation in Rentvine. This rule does not declare an emergency.",
        };
      case "pending":
        return {
          key,
          title: actionLabels.pending,
          fact: "The source approval state is explicitly pending on a known active record. Approval waiting duration is unavailable.",
          recommendation:
            "Review the request in Rentvine and consider contacting the owner for a decision.",
        };
      case "aged":
        return {
          key,
          title: actionLabels.aged,
          fact: `Known active age is ${age(w, reference, r)} calendar days at ${reference}, strictly over the proposed ${r.agingNudgeDays}-day threshold.`,
          recommendation: nextReviewAction(w, reference, r),
        };
      default:
        return {
          key: "unassigned",
          title: actionLabels.unassigned,
          fact: "The source explicitly reports no assigned vendor on a known active record.",
          recommendation:
            "Review the work order and select an appropriate vendor in Rentvine if needed. This dashboard cannot assign vendors.",
        };
    }
  });
  const observed = noChangeEvidence(w, pair, r);
  if (observed)
    recs.push({
      key: "no_change",
      title: actionLabels.no_change,
      fact: observed,
      recommendation: nextReviewAction(w, reference, r),
    });
  return recs;
}
export function actionQueue(
  rows: WorkOrder[],
  reference: string,
  r: Rules,
  pair: ObservationPair | null = null,
): ActionItem[] {
  const seen = new Set<string>();
  return sortQueue(rows, reference, r)
    .filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    })
    .map((order) => ({
      order,
      recommendations: actionRecommendations(order, reference, r, pair),
    }))
    .filter((item) => item.recommendations.length > 0);
}
export function actionKpis(items: ActionItem[], r: Rules) {
  return [
    {
      key: "all" as const,
      title: "Requiring follow-up",
      value: items.length,
      criterion:
        "Unique eligible work orders; multiple reasons are deduplicated.",
    },
    {
      key: "aged" as const,
      title: `Older than ${r.agingNudgeDays} days`,
      value: items.filter((i) =>
        i.recommendations.some((v) => v.key === "aged"),
      ).length,
      criterion: `Known active, valid age strictly > ${r.agingNudgeDays} calendar days.`,
    },
    {
      key: "pending" as const,
      title: "Pending owner approvals",
      value: items.filter((i) =>
        i.recommendations.some((v) => v.key === "pending"),
      ).length,
      criterion:
        "Known active with explicit pending approval; no waiting-time claim.",
    },
    {
      key: "unassigned" as const,
      title: "Without an assigned vendor",
      value: items.filter((i) =>
        i.recommendations.some((v) => v.key === "unassigned"),
      ).length,
      criterion:
        "Known active and explicitly unassigned; unknown coverage excluded.",
    },
    {
      key: "scheduled" as const,
      title: "Scheduled review",
      value: null,
      criterion:
        "Unavailable: no verified appointment/schedule fields are supplied.",
    },
  ];
}
export function filterActionQueue(items: ActionItem[], focus: ActionFocus) {
  return focus === "all"
    ? items
    : items.filter((item) =>
        item.recommendations.some((reason) => reason.key === focus),
      );
}
