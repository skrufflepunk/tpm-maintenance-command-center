import type { ReviewSettings } from "../config/reviewSettings";
import {
  categoryBreakdown,
  maintenanceStats,
  propertyClassifier,
} from "./insights";
import type { Property, Rules, Snapshot, WorkOrder } from "./types";
export type PropertySignal =
  | "volume"
  | "aging"
  | "approval"
  | "unassigned"
  | "repeated";
export const signalLabels: Record<PropertySignal, string> = {
  volume: "High observed volume",
  aging: "Multiple aging orders",
  approval: "Pending approvals",
  unassigned: "Unassigned maintenance",
  repeated: "Repeated categories",
};
export interface PropertyMetrics {
  key: string;
  property: Property | null;
  name: string;
  rows: WorkOrder[];
  stats: ReturnType<typeof maintenanceStats>;
  signals: PropertySignal[];
  categories: ReturnType<typeof categoryBreakdown>;
  repeated: ReturnType<typeof categoryBreakdown>;
}
export function propertyMetrics(
  snapshot: Snapshot,
  rows: WorkOrder[],
  reference: string,
  rules: Rules,
  settings: ReviewSettings,
): PropertyMetrics[] {
  const groups = new Map<string, WorkOrder[]>(),
    classify = propertyClassifier(snapshot),
    propertyIndex = new Map(snapshot.properties.map((p) => [p.id, p]));
  rows.forEach((w) => {
    const key = classify(w),
      group = groups.get(key) ?? [];
    group.push(w);
    groups.set(key, group);
  });
  const keys = [
    ...snapshot.properties.map((p) => p.id),
    ...(snapshot.workOrders.some((w) => classify(w) === "unknown")
      ? ["unknown"]
      : []),
  ];
  return keys.map((key) => {
    const property = propertyIndex.get(key) ?? null,
      records = groups.get(key) ?? [],
      stats = maintenanceStats(records, reference, rules),
      categories = categoryBreakdown(records, snapshot);
    const repeated = categories.filter(
      (c) =>
        c.key !== "unknown" && c.rows.length >= settings.repeatedCategoryOrders,
    );
    const signals: PropertySignal[] = [];
    if (stats.total >= settings.highVolumeOrders) signals.push("volume");
    if (stats.aged >= settings.multipleAgedOrders) signals.push("aging");
    if (stats.pending >= settings.pendingApprovals) signals.push("approval");
    if (stats.unassigned >= settings.unassignedOrders)
      signals.push("unassigned");
    if (repeated.length) signals.push("repeated");
    return {
      key,
      property,
      name: property?.displayName ?? "Unknown property",
      rows: records,
      stats,
      signals,
      categories,
      repeated,
    };
  });
}
export type PropertySort =
  | "name"
  | "total"
  | "open"
  | "completed"
  | "aged"
  | "pending"
  | "unassigned"
  | "mean";
export function filterProperties(
  metrics: PropertyMetrics[],
  query: string,
  signal: PropertySignal | "",
  workload: string,
) {
  const q = query.trim().toLowerCase();
  return metrics.filter(
    (m) =>
      (!q ||
        `${m.name} ${m.property?.sourceId ?? ""} ${m.property?.permittedAddress ?? ""}`
          .toLowerCase()
          .includes(q)) &&
      (!signal || m.signals.includes(signal)) &&
      (!workload ||
        (workload === "open" ? m.stats.open > 0 : m.stats.open === 0)),
  );
}
export function sortProperties(
  metrics: PropertyMetrics[],
  key: PropertySort,
  direction: 1 | -1,
) {
  const value = (m: PropertyMetrics): string | number | null =>
    key === "name" ? m.name : m.stats[key];
  return [...metrics].sort((a, b) => {
    const av = value(a),
      bv = value(b);
    if (av === null || bv === null)
      return av === bv ? a.key.localeCompare(b.key) : av === null ? 1 : -1;
    return (
      (typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv))) * direction ||
      a.key.localeCompare(b.key)
    );
  });
}
