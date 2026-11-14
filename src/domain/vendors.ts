import { actionQueue } from "./actions";
import type { ObservationPair } from "./actions";
import { age, completionStats, isActive } from "./rules";
import type {
  DatasetProvenance,
  Rules,
  Snapshot,
  Vendor,
  WorkOrder,
} from "./types";

export interface VendorDirectory {
  id: string;
  sourceMode: "demo" | "csv" | "api";
  vendors: Vendor[];
  categories: { id: string; label: string }[];
  dataset: DatasetProvenance;
  /** Explicit confirmation that vendor IDs share the work-order namespace. */
  verifiedIdentifiers: boolean;
}
/** References are opaque. Never decode/split an unresolved ID or infer a source identity. */
export function vendorReferenceLabel(
  w: WorkOrder,
  directory: VendorDirectory | null,
  compatible: boolean,
) {
  if (w.vendorAssignmentState === "unassigned") return "Explicitly unassigned";
  if (w.vendorAssignmentState === "unknown" || !w.vendorId)
    return "Unknown assignment";
  const vendor = compatible
    ? directory?.vendors.find(
        (v) => v.id === w.vendorId && v.sourceAccountId === w.sourceAccountId,
      )
    : null;
  return (
    vendor?.displayName ||
    `Vendor reference ${vendor?.sourceId ?? w.vendorId} · name unavailable`
  );
}
export function demoDirectory(snapshot: Snapshot): VendorDirectory {
  return {
    id: snapshot.id,
    sourceMode: "demo",
    vendors: snapshot.vendors,
    categories: snapshot.categories,
    dataset: snapshot.datasets.find((d) => d.datasetType === "vendors")!,
    verifiedIdentifiers: true,
  };
}
export function joinCompatible(
  directory: VendorDirectory | null,
  snapshot: Snapshot,
) {
  const data = snapshot.datasets.find((d) => d.datasetType === "workOrders");
  return !!(
    directory &&
    data &&
    directory.verifiedIdentifiers &&
    directory.sourceMode === snapshot.sourceMode &&
    directory.dataset.sourceAccountId === data.sourceAccountId
  );
}
export interface VendorMetrics {
  vendor: Vendor;
  rows: WorkOrder[];
  assigned: number | null;
  active: number | null;
  completed: number | null;
  aged: number | null;
  followups: ReturnType<typeof actionQueue>;
  duration: ReturnType<typeof completionStats>;
  average: number | null;
  durationBasis: string;
  workload: { label: string; count: number }[];
}
export function vendorMetrics(
  vendor: Vendor,
  snapshot: Snapshot,
  compatible: boolean,
  reference: string,
  rules: Rules,
  pair: ObservationPair | null = null,
): VendorMetrics {
  const rows = compatible
    ? snapshot.workOrders.filter(
        (w) =>
          w.sourceAccountId === vendor.sourceAccountId &&
          w.vendorId === vendor.id &&
          w.vendorAssignmentState === "assigned",
      )
    : [];
  const duration = completionStats(rows, rules.timezone),
    mixed = duration.date.n > 0 && duration.instant.n > 0;
  const workload = new Map<string, number>();
  rows.filter(isActive).forEach((w) => {
    const name =
      snapshot.categories.find((c) => c.id === w.categoryId)?.label ??
      "Unknown category";
    workload.set(name, (workload.get(name) ?? 0) + 1);
  });
  return {
    vendor,
    rows,
    assigned: compatible ? rows.length : null,
    active: compatible ? rows.filter(isActive).length : null,
    completed: compatible
      ? rows.filter((w) => w.status === "completed").length
      : null,
    aged: compatible
      ? rows.filter(
          (w) => (age(w, reference, rules) ?? -1) > rules.agingNudgeDays,
        ).length
      : null,
    followups: actionQueue(rows, reference, rules, pair),
    duration,
    average:
      compatible && !mixed
        ? duration.date.n
          ? duration.date.mean
          : duration.instant.mean
        : null,
    durationBasis: mixed
      ? "Mixed precision; see separate cohorts"
      : duration.date.n
        ? "calendar days"
        : "elapsed days",
    workload: [...workload]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
/** Index once so large vendor files do not scan the entire report for every vendor. */
export function directoryMetrics(
  directory: VendorDirectory,
  snapshot: Snapshot,
  reference: string,
  rules: Rules,
  pair: ObservationPair | null = null,
) {
  const compatible = joinCompatible(directory, snapshot);
  const grouped = new Map<string, WorkOrder[]>();
  if (compatible)
    for (const order of snapshot.workOrders) {
      if (order.vendorId && order.vendorAssignmentState === "assigned") {
        const bucket = grouped.get(order.vendorId) ?? [];
        bucket.push(order);
        grouped.set(order.vendorId, bucket);
      }
    }
  return directory.vendors.map((vendor) =>
    vendorMetrics(
      vendor,
      { ...snapshot, workOrders: grouped.get(vendor.id) ?? [] },
      compatible,
      reference,
      rules,
      pair,
    ),
  );
}
export interface VendorFilters {
  query: string;
  specialty: string;
  status: string;
  workload: string;
  followup: string;
}
export const emptyVendorFilters: VendorFilters = {
  query: "",
  specialty: "",
  status: "",
  workload: "",
  followup: "",
};
export function filterVendors(
  metrics: VendorMetrics[],
  filters: VendorFilters,
  directory: VendorDirectory,
) {
  const q = filters.query.trim().toLocaleLowerCase();
  return metrics.filter((m) => {
    const v = m.vendor;
    const specialtyNames = v.categories.map(
      (id) => directory.categories.find((c) => c.id === id)?.label ?? id,
    );
    return (
      (!q ||
        [
          v.displayName,
          v.sourceId,
          v.vendorType,
          v.businessEmail,
          v.businessPhone,
          v.state,
          ...specialtyNames,
        ].some((s) => s?.toLocaleLowerCase().includes(q))) &&
      (!filters.specialty ||
        (filters.specialty === "unknown"
          ? !v.categories.length
          : v.categories.includes(filters.specialty))) &&
      (!filters.status ||
        (filters.status === "unknown"
          ? v.active === null
          : v.active === (filters.status === "active"))) &&
      (!filters.workload ||
        (filters.workload === "unknown"
          ? m.active === null
          : m.active !== null &&
            (filters.workload === "open" ? m.active > 0 : m.active === 0))) &&
      (!filters.followup ||
        (filters.followup === "unknown"
          ? m.assigned === null
          : m.assigned !== null &&
            (filters.followup === "yes"
              ? m.followups.length > 0
              : m.followups.length === 0)))
    );
  });
}
export type VendorSort =
  | "name"
  | "id"
  | "type"
  | "active"
  | "assigned"
  | "open"
  | "completed"
  | "average"
  | "followups";
export function sortVendors(
  metrics: VendorMetrics[],
  key: VendorSort,
  direction: 1 | -1,
) {
  const value = (m: VendorMetrics): string | number | null =>
    ({
      name: m.vendor.displayName || null,
      id: m.vendor.sourceId,
      type: m.vendor.vendorType ?? null,
      active: m.vendor.active === null ? null : Number(m.vendor.active),
      assigned: m.assigned,
      open: m.active,
      completed: m.completed,
      average: m.average,
      followups: m.assigned === null ? null : m.followups.length,
    })[key];
  return [...metrics].sort((a, b) => {
    const av = value(a),
      bv = value(b);
    if (av === null && bv !== null) return 1;
    if (bv === null && av !== null) return -1;
    const result =
      av === null || bv === null
        ? 0
        : typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
    return result * direction || a.vendor.id.localeCompare(b.vendor.id);
  });
}
export function vendorKpis(metrics: VendorMetrics[], compatible: boolean) {
  const unknownActive = metrics.filter((m) => m.vendor.active === null).length;
  return {
    total: metrics.length,
    active:
      metrics.length && unknownActive === metrics.length
        ? null
        : metrics.filter((m) => m.vendor.active === true).length,
    unknownActive,
    withOpen: compatible
      ? metrics.filter((m) => (m.active ?? 0) > 0).length
      : null,
    agedOrders: compatible
      ? metrics.reduce((n, m) => n + (m.aged ?? 0), 0)
      : null,
    followupVendors: compatible
      ? metrics.filter((m) => m.followups.length > 0).length
      : null,
  };
}
