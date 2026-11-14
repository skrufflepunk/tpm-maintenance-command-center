import { metricValue } from "../../domain/format";
import { useState } from "react";
import { Panel } from "../../components/ui";
import { useWorkspace } from "../../data/workspace/context";
import type { VendorMetrics } from "../../domain/vendors";
import { vendorScorecard } from "../../domain/vendorScorecard";
import { paginate } from "../../domain/explorer";
import { ReviewSettings } from "../insights/ReviewSettings";
const labels = {
  completed: "Completed",
  duration: "Mean duration",
  open: "Known active",
  followups: "Follow-up orders",
  timeliness: "Appointment timeliness",
  ratings: "Ratings",
};
export function VendorScorecard({
  metrics,
  compatible,
}: {
  metrics: VendorMetrics[];
  compatible: boolean;
}) {
  const { reviewSettings } = useWorkspace(),
    [open, setOpen] = useState(false),
    [page, setPage] = useState(1);
  const paged = paginate(metrics, page, 10);
  return (
    <>
      <Panel
        title="Vendor performance scorecard"
        eyebrow="CONFIGURABLE EVIDENCE · NO QUALITY SCORE"
        action={
          <button className="outline-button" onClick={() => setOpen(true)}>
            Scorecard settings
          </button>
        }
      >
        <p className="insight-note">
          Current directory filters and selected work-order report. Minimum
          eligible completion sample: {reviewSettings.minimumCompletionSample}.
          Numerical quality score: Unavailable — no approved scoring
          methodology. Work-order age is not vendor response time.
        </p>
        {!compatible && (
          <p className="vendor-caution">
            Workload evidence unavailable without a verified source
            relationship.
          </p>
        )}
        <div
          className="table-scroll insight-scorecard"
          tabIndex={0}
          role="region"
          aria-label="Vendor scorecard measurements"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Vendor / report coverage</th>
                {reviewSettings.scorecardMeasures.map((key) => (
                  <th key={key} scope="col">
                    {labels[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((m) => {
                const values = vendorScorecard(m, reviewSettings);
                return (
                  <tr key={m.vendor.id}>
                    <td>
                      {m.vendor.displayName || "Name not recorded"}
                      <small>
                        {m.vendor.sourceId} ·{" "}
                        {m.assigned === null
                          ? "Join unavailable"
                          : `${m.assigned} associated report records`}{" "}
                        · {m.rows.filter((w) => w.status === "unknown").length}{" "}
                        unknown statuses
                      </small>
                    </td>
                    {reviewSettings.scorecardMeasures.map((key) => (
                      <td key={key}>
                        {key === "ratings"
                          ? "Not rated"
                          : key === "timeliness"
                            ? "Unavailable"
                            : metricValue(
                                values[key],
                                key === "duration" ? 1 : 0,
                              )}
                        <small>
                          {key === "duration"
                            ? `${values.durationNote}; ${values.excluded} excluded`
                            : key === "timeliness"
                              ? "No verified appointment timestamps"
                              : key === "ratings"
                                ? "No reviewed rating/count/scale data"
                                : "Observed report cohort only"}
                        </small>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!metrics.length && (
          <p className="empty-inline">
            No vendors in this directory filter scope.
          </p>
        )}
        {paged.pages > 1 && (
          <div className="pagination">
            <span>
              Scorecard page {paged.page} of {paged.pages}
            </span>
            <button
              className="outline-button"
              disabled={paged.page === 1}
              onClick={() => setPage(paged.page - 1)}
            >
              Previous scorecard vendors
            </button>
            <button
              className="outline-button"
              disabled={paged.page === paged.pages}
              onClick={() => setPage(paged.page + 1)}
            >
              Next scorecard vendors
            </button>
          </div>
        )}
      </Panel>
      {open && <ReviewSettings onClose={() => setOpen(false)} />}
    </>
  );
}
