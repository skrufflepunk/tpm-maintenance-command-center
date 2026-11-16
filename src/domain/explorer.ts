import { age, dateKey } from "./rules";
import type { Rules, Snapshot, WorkOrder } from "./types";
export type ExplorerSort =
  | "number"
  | "property"
  | "summary"
  | "status"
  | "vendor"
  | "created"
  | "age"
  | "approval"
  | "priority"
  | "category";
export function sortExplorer(
  rows: WorkOrder[],
  key: ExplorerSort,
  direction: 1 | -1,
  snapshot: Snapshot,
  rules: Rules,
  reference: string,
) {
  const value = (w: WorkOrder): string | number | null => {
    switch (key) {
      case "property":
        return (
          snapshot.properties.find((p) => p.id === w.propertyId)?.displayName ??
          null
        );
      case "summary":
        return w.summaryRedacted;
      case "vendor":
        return (
          snapshot.vendors.find((v) => v.id === w.vendorId)?.displayName ??
          w.vendorId
        );
      case "created":
        return dateKey(w.createdAt, rules.timezone);
      case "age":
        return age(w, reference, rules);
      case "approval":
        return w.approvalState === "unknown" ? null : w.approvalState;
      case "priority":
        return w.priority === "unknown" ? null : w.priority;
      case "category":
        return (
          snapshot.categories.find((c) => c.id === w.categoryId)?.label ?? null
        );
      default:
        return w[key] === "unknown" ? null : w[key];
    }
  };
  return [...rows].sort((a, b) => {
    const av = value(a),
      bv = value(b);
    if (av === null || bv === null)
      return av === bv ? a.id.localeCompare(b.id) : av === null ? 1 : -1;
    if (
      key === "created" &&
      av === bv &&
      a.createdAt?.precision === "instant" &&
      b.createdAt?.precision === "instant"
    )
      return (
        (Date.parse(a.createdAt.value) - Date.parse(b.createdAt.value)) *
          direction || a.id.localeCompare(b.id)
      );
    return (
      (typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true })) *
        direction || a.id.localeCompare(b.id)
    );
  });
}
export function paginate<T>(rows: T[], requested: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.max(1, Math.min(requested, pages));
  return { page, pages, rows: rows.slice((page - 1) * size, page * size) };
}
