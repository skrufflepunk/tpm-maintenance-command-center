import { useState } from "react";
import { paginate, sortExplorer } from "../../domain/explorer";
import { age, isActive, label } from "../../domain/rules";
import type { Rules, Snapshot, WorkOrder } from "../../domain/types";
import type { VendorDirectory } from "../../domain/vendors";
import { resolvedVendorLabel } from "./workspace";
export function InsightRecords({
  title,
  rows,
  snapshot,
  rules,
  reference,
  directory,
  compatible,
  onOpen,
}: {
  title: string;
  rows: WorkOrder[];
  snapshot: Snapshot;
  rules: Rules;
  reference: string;
  directory: VendorDirectory | null;
  compatible: boolean;
  onOpen: (id: string) => void;
}) {
  const [requested, setRequested] = useState(1),
    [sort, setSort] = useState<"created" | "number" | "age">("created");
  const sorted = sortExplorer(
      rows,
      sort,
      sort === "number" ? 1 : -1,
      snapshot,
      rules,
      reference,
    ),
    paged = paginate(sorted, requested, 10);
  return (
    <section className="insight-records" aria-label={title}>
      <div className="insight-record-heading">
        <h3>{title}</h3>
        <label>
          {title} sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort);
              setRequested(1);
            }}
          >
            <option value="created">Newest creation date first</option>
            <option value="number">Work-order number</option>
            <option value="age">Oldest active age first</option>
          </select>
        </label>
      </div>
      {!rows.length ? (
        <p className="empty-inline">No work orders in this scope.</p>
      ) : (
        <>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={`${title} table`}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Work order / issue</th>
                  <th scope="col">Property / status</th>
                  <th scope="col">Vendor / approval</th>
                  <th scope="col">Available dates / age</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <button
                        className="record-link"
                        onClick={() => onOpen(w.id)}
                      >
                        {w.number}
                      </button>
                      <p>{w.summaryRedacted ?? "Issue unavailable"}</p>
                    </td>
                    <td>
                      {snapshot.properties.find(
                        (p) =>
                          p.id === w.propertyId &&
                          p.sourceAccountId === w.sourceAccountId,
                      )?.displayName ?? "Unknown property"}
                      <small className={`badge status-${w.status}`}>
                        {label(w.status)}
                      </small>
                    </td>
                    <td>
                      {resolvedVendorLabel(w, directory, compatible)}
                      <small>Approval: {label(w.approvalState)}</small>
                    </td>
                    <td>
                      Created: {w.createdAt?.value ?? "Unknown"}
                      <small>
                        Completed: {w.completedAt?.value ?? "Unknown"}
                      </small>
                      <small>
                        {isActive(w)
                          ? age(w, reference, rules) === null
                            ? "Active age unknown"
                            : `${age(w, reference, rules)} calendar days old`
                          : "Active age not applicable"}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {rows.length} report records · Page {paged.page} of {paged.pages}
            </span>
            <button
              className="outline-button"
              disabled={paged.page === 1}
              onClick={() => setRequested(paged.page - 1)}
            >
              Previous records
            </button>
            <button
              className="outline-button"
              disabled={paged.page === paged.pages}
              onClick={() => setRequested(paged.page + 1)}
            >
              Next records
            </button>
          </div>
        </>
      )}
    </section>
  );
}
