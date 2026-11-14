import type {
  Filters,
  Reason,
  Rules,
  Snapshot,
  SourceDate,
  WorkOrder,
} from "./types";
export const emptyFilters: Filters = {
  query: "",
  property: [],
  status: [],
  vendor: [],
  category: [],
  priority: [],
  createdFrom: "",
  createdTo: "",
  bucket: [],
};
export const label = (s: string) =>
  s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export function localDate(value: string, timezone: string): string | null {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function dateKey(
  date: SourceDate | null,
  timezone: string,
): string | null {
  if (!date) return null;
  if (date.precision === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return null;
    const d = new Date(date.value + "T00:00:00Z");
    return Number.isFinite(d.getTime()) &&
      d.toISOString().slice(0, 10) === date.value
      ? date.value
      : null;
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      date.value,
    ) ||
    !dateKey({ value: date.value.slice(0, 10), precision: "date" }, timezone)
  )
    return null;
  return localDate(date.value, timezone);
}
export const isActive = (w: WorkOrder) =>
  ["open", "in_progress", "on_hold"].includes(w.status);
export function age(
  w: WorkOrder,
  reference: string,
  rules: Rules,
): number | null {
  if (!isActive(w)) return null;
  const start = dateKey(w.createdAt, rules.timezone),
    end = localDate(reference, rules.timezone);
  if (!start || !end) return null;
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  return days >= 0 ? days : null;
}
export const bucketLabels = (r: Rules) => {
  const [a, b, c] = r.agingBucketBoundaries;
  return [
    `0–${a}`,
    `${a + 1}–${b}`,
    `${b + 1}–${c}`,
    `${c + 1}+`,
    "Unknown age",
  ];
};
export function bucket(
  w: WorkOrder,
  reference: string,
  r: Rules,
): string | null {
  if (!isActive(w)) return null;
  const n = age(w, reference, r),
    labels = bucketLabels(r);
  return n === null
    ? labels[4]
    : labels[
        r.agingBucketBoundaries.findIndex((b) => n <= b) === -1
          ? 3
          : r.agingBucketBoundaries.findIndex((b) => n <= b)
      ];
}
export function matchesReason(
  w: WorkOrder,
  reason: Reason,
  reference: string,
  r: Rules,
): boolean {
  if (reason === "completed") return w.status === "completed";
  if (!isActive(w)) return false;
  switch (reason) {
    case "active":
      return true;
    case "urgent":
      return w.priority === "urgent";
    case "pending":
      return w.approvalState === "pending";
    case "aged": {
      const n = age(w, reference, r);
      return n !== null && n > r.agingNudgeDays;
    }
    case "unassigned":
      return (
        w.vendorAssignmentState === "unassigned" &&
        w.fieldCoverage.vendorAssignmentState === "explicitly_absent"
      );
  }
}
export function reasons(w: WorkOrder, reference: string, r: Rules): Reason[] {
  return r.queueReasonOrder.filter((reason) =>
    matchesReason(w, reason, reference, r),
  );
}
export function sortQueue(rows: WorkOrder[], reference: string, r: Rules) {
  const rank = (w: WorkOrder) => {
    const first = reasons(w, reference, r)[0];
    return first
      ? r.queueReasonOrder.indexOf(first as (typeof r.queueReasonOrder)[number])
      : 4;
  };
  return [...rows].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (age(b, reference, r) ?? -1) - (age(a, reference, r) ?? -1) ||
      a.id.localeCompare(b.id),
  );
}
export function selectOrders(
  snapshot: Snapshot,
  f: Filters,
  r: Rules,
  reference: string,
) {
  const includes = (list: string[], value: string | null) =>
    !list.length || list.includes(value ?? "unknown");
  return snapshot.workOrders.filter((w) => {
    const property =
      snapshot.properties.find((p) => p.id === w.propertyId)?.displayName ??
      "Unknown property";
    const key = dateKey(w.createdAt, r.timezone);
    return (
      `${w.number} ${w.summaryRedacted ?? ""} ${property}`
        .toLowerCase()
        .includes(f.query.toLowerCase()) &&
      includes(f.property, w.propertyId) &&
      includes(f.status, w.status) &&
      includes(
        f.vendor,
        w.vendorAssignmentState === "unknown"
          ? "unknown"
          : w.vendorAssignmentState === "unassigned"
            ? "unassigned"
            : w.vendorId,
      ) &&
      includes(f.category, w.categoryId) &&
      includes(f.priority, w.priority) &&
      (!f.createdFrom || (key !== null && key >= f.createdFrom)) &&
      (!f.createdTo || (key !== null && key <= f.createdTo)) &&
      includes(f.bucket, bucket(w, reference, r))
    );
  });
}
export function completionStats(rows: WorkOrder[], timezone: string) {
  const completed = rows.filter((w) => w.status === "completed");
  const groups: Record<"date" | "instant", number[]> = {
    date: [],
    instant: [],
  };
  let excluded = 0;
  for (const w of completed) {
    if (
      !w.createdAt ||
      !w.completedAt ||
      w.createdAt.precision !== w.completedAt.precision ||
      !dateKey(w.createdAt, timezone) ||
      !dateKey(w.completedAt, timezone)
    ) {
      excluded++;
      continue;
    }
    const precision = w.createdAt.precision;
    const n =
      (Date.parse(w.completedAt.value) - Date.parse(w.createdAt.value)) /
      86400000;
    if (!Number.isFinite(n) || n < 0) {
      excluded++;
      continue;
    }
    groups[precision].push(n);
  }
  const stats = (values: number[]) => {
    const v = [...values].sort((a, b) => a - b);
    return {
      n: v.length,
      mean: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null,
      median: v.length
        ? (v[Math.floor((v.length - 1) / 2)] +
            v[Math.ceil((v.length - 1) / 2)]) /
          2
        : null,
    };
  };
  return { date: stats(groups.date), instant: stats(groups.instant), excluded };
}
export function freshness(
  reportAsOf: string | null,
  importedAt: string,
  now: string,
  threshold: number,
) {
  const value = reportAsOf ?? importedAt;
  const hours = (Date.parse(now) - Date.parse(value)) / 3600000;
  if (!Number.isFinite(hours) || hours < 0) return "Unknown freshness";
  return `${reportAsOf ? "Source" : "Receipt only"} ${hours > threshold ? "stale" : "within threshold"}`;
}
