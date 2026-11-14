import { useState } from "react";
import type { ObservationPair } from "../../domain/actions";
import { propertyClassifier } from "../../domain/insights";
import { label } from "../../domain/rules";
import { paginate } from "../../domain/explorer";
export function PriorPropertyEvidence({
  pair,
  propertyId,
  onOpen,
}: {
  pair: ObservationPair | null;
  propertyId: string;
  onOpen: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  if (!pair)
    return (
      <p className="insight-note">
        Prior property observation: Unavailable — no retained compatible
        previous report. Complete source event history remains unavailable.
      </p>
    );
  const classify = propertyClassifier(pair.previous),
    prior = pair.previous.workOrders.filter((w) => classify(w) === propertyId),
    currentIds = new Set(pair.current.workOrders.map((w) => w.id)),
    paged = paginate(prior, page, 10);
  return (
    <details className="prior-property-evidence">
      <summary>
        Retained prior property observation ({prior.length} records)
      </summary>
      <p className="insight-note">
        Observed at load {pair.previous.importedAt}; source report as of{" "}
        {pair.previous.datasets.find((d) => d.datasetType === "workOrders")
          ?.reportAsOf ?? "Unknown"}
        . Previous records below are separate evidence and never enter current
        KPI totals. Missing current rows are not inferred closed or deleted.
      </p>
      {!prior.length ? (
        <p className="empty-inline">
          No property records were observed in the retained prior report.
        </p>
      ) : (
        <>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Prior property observation table"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Prior work order</th>
                  <th scope="col">Prior source state</th>
                  <th scope="col">Prior supplied dates</th>
                  <th scope="col">Current observation</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((w) => (
                  <tr key={w.id}>
                    <th scope="row">
                      {w.number}
                      <small>{w.summaryRedacted ?? "Issue unavailable"}</small>
                    </th>
                    <td>
                      {label(w.status)}
                      <small>Approval: {label(w.approvalState)}</small>
                    </td>
                    <td>
                      Created: {w.createdAt?.value ?? "Unknown"}
                      <small>
                        Completed: {w.completedAt?.value ?? "Unknown"}
                      </small>
                    </td>
                    <td>
                      {currentIds.has(w.id) ? (
                        <button
                          className="text-button"
                          onClick={() => onOpen(w.id)}
                        >
                          Open current Explorer record
                        </button>
                      ) : (
                        "Not observed in current report; current state unavailable."
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paged.pages > 1 && (
            <div className="pagination">
              <span>
                Prior observation page {paged.page} of {paged.pages}
              </span>
              <button
                className="outline-button"
                disabled={paged.page === 1}
                onClick={() => setPage(paged.page - 1)}
              >
                Previous prior records
              </button>
              <button
                className="outline-button"
                disabled={paged.page === paged.pages}
                onClick={() => setPage(paged.page + 1)}
              >
                Next prior records
              </button>
            </div>
          )}
        </>
      )}
    </details>
  );
}
