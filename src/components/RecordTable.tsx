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
            <th>Work order / summary</th>
            <th>Property</th>
            <th>Status</th>
            <th>Age</th>
            <th>Follow-up reasons</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
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
                {reasons(w, reference, rules)
                  .map((r) => reasonNames[r])
                  .join(" · ") || "No eligible follow-up"}
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
