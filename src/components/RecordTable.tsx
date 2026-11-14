import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import type { Snapshot, Rules, WorkOrder } from "../domain/types";
import { age, isActive, label, reasons } from "../domain/rules";
import { reasonNames } from "../domain/labels";
export function RecordTable({
  rows,
  snapshot,
  rules,
  reference,
  onSelect,
}: {
  rows: WorkOrder[];
  snapshot: Snapshot;
  rules: Rules;
  reference: string;
  onSelect: (w: WorkOrder) => void;
}) {
  const [sort, setSort] = useState<{
    key: "number" | "property" | "status" | "age";
    direction: 1 | -1;
  } | null>(null);
  const value = (w: WorkOrder, key: NonNullable<typeof sort>["key"]) =>
    key === "age"
      ? age(w, reference, rules)
      : key === "property"
        ? (snapshot.properties.find((p) => p.id === w.propertyId)
            ?.displayName ?? null)
        : key === "status" && w.status === "unknown"
          ? null
          : w[key as "number" | "status"];
  const ordered = sort
    ? [...rows].sort((a, b) => {
        const av = value(a, sort.key),
          bv = value(b, sort.key);
        if (av === null || bv === null)
          return av === bv ? a.id.localeCompare(b.id) : av === null ? 1 : -1;
        return (
          (typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), undefined, {
                numeric: true,
              })) * sort.direction || a.id.localeCompare(b.id)
        );
      })
    : rows;
  const heading = (key: NonNullable<typeof sort>["key"], text: string) => (
    <th
      aria-sort={
        sort?.key === key
          ? sort.direction === 1
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        className="sort-button"
        onClick={() =>
          setSort({
            key,
            direction: sort?.key === key && sort.direction === 1 ? -1 : 1,
          })
        }
      >
        {text} <span aria-hidden="true">↕</span>
      </button>
    </th>
  );
  return rows.length ? (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Supporting work orders"
    >
      <table>
        <thead>
          <tr>
            {heading("number", "Work order / summary")}
            {heading("property", "Property")}
            {heading("status", "Status")}
            {heading("age", "Age")}
            <th>Vendor</th>
            <th>Next action · read-only</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((w) => (
            <tr key={w.id}>
              <td>
                <button className="record-link" onClick={() => onSelect(w)}>
                  {w.number} <ArrowUpRight size={12} />
                </button>
                <span className="cell-secondary">
                  {w.summaryRedacted ?? "Unknown summary"}
                </span>
              </td>
              <td>
                {snapshot.properties.find((p) => p.id === w.propertyId)
                  ?.displayName ?? "Unknown property"}
              </td>
              <td>
                <span className={`badge ${w.status}`}>{label(w.status)}</span>
              </td>
              <td>
                {isActive(w)
                  ? age(w, reference, rules) === null
                    ? "Unknown"
                    : `${age(w, reference, rules)} days`
                  : "Not applicable"}
              </td>
              <td>
                {snapshot.vendors.find((v) => v.id === w.vendorId)
                  ?.displayName ??
                  (w.vendorAssignmentState === "unassigned"
                    ? "Explicitly unassigned"
                    : "Unknown")}
              </td>
              <td>
                <button className="next-action" onClick={() => onSelect(w)}>
                  Review details
                </button>
                <span className="cell-secondary">
                  {reasons(w, reference, rules)
                    .map((r) => reasonNames[r])
                    .join(" · ") || "No eligible follow-up"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">
      <Search size={24} />
      <h3>No matching results</h3>
      <p>Adjust or clear filters to see more fictional work orders.</p>
    </div>
  );
}
