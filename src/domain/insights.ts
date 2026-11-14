import {
  age,
  bucket,
  bucketLabels,
  completionStats,
  dateKey,
  isActive,
  label,
  localDate,
  matchesReason,
} from "./rules";
import type { Rules, Snapshot, SourceDate, WorkOrder } from "./types";
export interface InsightFilters {
  property: string;
  vendor: string;
  category: string;
  dateBasis: "created" | "completed";
  from: string;
  to: string;
}
export const emptyInsightFilters: InsightFilters = {
  property: "",
  vendor: "",
  category: "",
  dateBasis: "created",
  from: "",
  to: "",
};
export function knownProperty(w: WorkOrder, snapshot: Snapshot) {
  return snapshot.properties.find(
    (p) => p.id === w.propertyId && p.sourceAccountId === w.sourceAccountId,
  );
}
export function propertyClassifier(snapshot: Snapshot) {
  const index = new Map(snapshot.properties.map((p) => [p.id, p]));
  return (w: WorkOrder) => {
    const p = w.propertyId ? index.get(w.propertyId) : null;
    return p && p.sourceAccountId === w.sourceAccountId ? p.id : "unknown";
  };
}
export const propertyKey = (w: WorkOrder, snapshot: Snapshot) =>
  knownProperty(w, snapshot)?.id ?? "unknown";
export const assignmentKey = (w: WorkOrder) =>
  w.vendorAssignmentState === "unassigned"
    ? "unassigned"
    : w.vendorAssignmentState === "unknown"
      ? "unknown"
      : (w.vendorId ?? "unknown");
export function validDateRange(f: InsightFilters) {
  return (
    (!f.from || !!dateKey({ value: f.from, precision: "date" }, "UTC")) &&
    (!f.to || !!dateKey({ value: f.to, precision: "date" }, "UTC")) &&
    (!f.from || !f.to || f.from <= f.to)
  );
}
export function selectInsightRows(
  snapshot: Snapshot,
  f: InsightFilters,
  rules: Rules,
) {
  if (!validDateRange(f)) return [];
  const classify = propertyClassifier(snapshot);
  return snapshot.workOrders.filter((w) => {
    const d = dateKey(
      f.dateBasis === "created" ? w.createdAt : w.completedAt,
      rules.timezone,
    );
    return (
      (!f.property || classify(w) === f.property) &&
      (!f.vendor || assignmentKey(w) === f.vendor) &&
      (!f.category || (w.categoryId ?? "unknown") === f.category) &&
      (!(f.from || f.to) ||
        ((f.dateBasis !== "completed" || w.status === "completed") &&
          !!d &&
          (!f.from || d >= f.from) &&
          (!f.to || d <= f.to)))
    );
  });
}
export function maintenanceStats(
  rows: WorkOrder[],
  reference: string,
  rules: Rules,
) {
  const active = rows.filter(isActive),
    duration = completionStats(rows, rules.timezone);
  const mixed = duration.date.n > 0 && duration.instant.n > 0,
    cohort = duration.date.n ? duration.date : duration.instant;
  return {
    total: rows.length,
    open: active.length,
    completed: rows.filter((w) => w.status === "completed").length,
    aged: rows.filter((w) => matchesReason(w, "aged", reference, rules)).length,
    pending: rows.filter((w) => matchesReason(w, "pending", reference, rules))
      .length,
    unassigned: rows.filter((w) =>
      matchesReason(w, "unassigned", reference, rules),
    ).length,
    unknownStatus: rows.filter((w) => w.status === "unknown").length,
    unknownAge: active.filter((w) => age(w, reference, rules) === null).length,
    unknownApproval: active.filter((w) => w.approvalState === "unknown").length,
    unknownAssignment: active.filter(
      (w) => w.vendorAssignmentState === "unknown",
    ).length,
    duration,
    mean: mixed ? null : cohort.mean,
    median: mixed ? null : cohort.median,
    mixed,
    n: duration.date.n + duration.instant.n,
    durationBasis: duration.date.n ? "calendar days" : "elapsed days",
  };
}
export interface Breakdown {
  key: string;
  label: string;
  rows: WorkOrder[];
}
export function breakdown(
  rows: WorkOrder[],
  key: (w: WorkOrder) => string,
  name: (key: string) => string,
): Breakdown[] {
  const groups = new Map<string, WorkOrder[]>();
  rows.forEach((w) => {
    const id = key(w),
      list = groups.get(id) ?? [];
    list.push(w);
    groups.set(id, list);
  });
  return [...groups]
    .map(([key, rows]) => ({ key, label: name(key), rows }))
    .sort(
      (a, b) => b.rows.length - a.rows.length || a.key.localeCompare(b.key),
    );
}
export function categoryBreakdown(rows: WorkOrder[], snapshot: Snapshot) {
  return breakdown(
    rows,
    (w) => w.categoryId ?? "unknown",
    (id) =>
      snapshot.categories.find((c) => c.id === id)?.label ?? "Unknown category",
  );
}
export function ageBreakdown(
  rows: WorkOrder[],
  reference: string,
  rules: Rules,
): Breakdown[] {
  return bucketLabels(rules).map((name) => ({
    key: name,
    label: `${name}${name === "Unknown age" ? "" : " days"}`,
    rows: rows.filter((w) => bucket(w, reference, rules) === name),
  }));
}
export function approvalBreakdown(rows: WorkOrder[]): Breakdown[] {
  return ["pending", "approved", "not_required", "unknown"].map((key) => ({
    key,
    label: label(key),
    rows: rows.filter((w) => isActive(w) && w.approvalState === key),
  }));
}
export function assignmentBreakdown(rows: WorkOrder[]): Breakdown[] {
  return ["assigned", "unassigned", "unknown"].map((key) => ({
    key,
    label: key === "unassigned" ? "Explicitly unassigned" : label(key),
    rows: rows.filter((w) => isActive(w) && w.vendorAssignmentState === key),
  }));
}
export function dateAtOrBefore(
  date: SourceDate | null,
  reference: string,
  timezone: string,
) {
  const key = dateKey(date, timezone),
    end = localDate(reference, timezone);
  return !!(
    key &&
    end &&
    key <= end &&
    (date!.precision !== "instant" ||
      Date.parse(date!.value) <= Date.parse(reference))
  );
}
export interface MonthActivity {
  month: string;
  created: WorkOrder[];
  completed: WorkOrder[];
}
export function monthlyActivity(
  rows: WorkOrder[],
  reference: string,
  timezone: string,
  from = "",
  to = "",
) {
  const months = new Map<string, MonthActivity>();
  let excludedCreated = 0,
    excludedCompleted = 0;
  for (const w of rows)
    for (const series of ["created", "completed"] as const) {
      if (series === "completed" && w.status !== "completed") continue;
      const date = series === "created" ? w.createdAt : w.completedAt;
      if (!dateAtOrBefore(date, reference, timezone)) {
        if (series === "created") excludedCreated++;
        else excludedCompleted++;
        continue;
      }
      const key = dateKey(date, timezone)!;
      if ((from && key < from) || (to && key > to)) continue;
      const month = key.slice(0, 7),
        item = months.get(month) ?? { month, created: [], completed: [] };
      item[series].push(w);
      months.set(month, item);
    }
  return {
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    excludedCreated,
    excludedCompleted,
  };
}

export function observedBacklog(
  pair: import("./actions").ObservationPair | null,
  filters: InsightFilters,
  rules: Rules,
) {
  if (!pair) return null;
  const { previous: a, current: b } = pair,
    ad = a.datasets.find((d) => d.datasetType === "workOrders"),
    bd = b.datasets.find((d) => d.datasetType === "workOrders");
  if (
    !ad ||
    !bd ||
    a.sourceMode === "demo" ||
    a.sourceMode !== b.sourceMode ||
    a.schemaVersion !== b.schemaVersion ||
    a.mappingVersion !== b.mappingVersion ||
    ad.sourceAccountId !== bd.sourceAccountId ||
    ad.reportScope.comparisonKey !== bd.reportScope.comparisonKey ||
    ad.sourceTimezone !== bd.sourceTimezone ||
    !Number.isFinite(Date.parse(a.importedAt)) ||
    !Number.isFinite(Date.parse(b.importedAt)) ||
    Date.parse(b.importedAt) <= Date.parse(a.importedAt) ||
    !validDateRange(filters)
  )
    return null;
  return [a, b].map((snapshot) => {
    const data = snapshot.datasets.find((d) => d.datasetType === "workOrders")!,
      rows = selectInsightRows(snapshot, filters, {
        ...rules,
        timezone: data.sourceTimezone,
      });
    return {
      loadedAt: snapshot.importedAt,
      reportAsOf: data.reportAsOf,
      open: rows.filter(isActive).length,
      unknown: rows.filter((w) => w.status === "unknown").length,
    };
  });
}
