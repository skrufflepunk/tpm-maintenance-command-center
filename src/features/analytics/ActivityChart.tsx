import { useState } from "react";
import type { MonthActivity } from "../../domain/insights";
import type { WorkOrder } from "../../domain/types";
export function ActivityChart({
  months,
  onSelect,
}: {
  months: MonthActivity[];
  onSelect: (title: string, rows: WorkOrder[]) => void;
}) {
  const [recent, setRecent] = useState(12);
  const visible = months.slice(-recent),
    max = Math.max(
      1,
      ...visible.flatMap((m) => [m.created.length, m.completed.length]),
    );
  return (
    <>
      {!months.length ? (
        <p className="empty-inline">
          Unavailable: no eligible dated creation or completion records in this
          event window.
        </p>
      ) : (
        <>
          <div className="activity-legend">
            <span>
              <i />
              Created
            </span>
            <span>
              <i />
              Completed
            </span>
          </div>
          <div
            className="activity-chart"
            role="group"
            aria-label="Created and completed monthly chart"
          >
            {visible.map((m) => (
              <div key={m.month} className="activity-month">
                <div className="activity-bars">
                  {(["created", "completed"] as const).map((series) => (
                    <button
                      key={series}
                      className={`activity-bar ${series}`}
                      style={{
                        height: `${Math.max(5, (m[series].length / max) * 120)}px`,
                      }}
                      aria-label={`${series === "created" ? "Created" : "Completed"} ${m.month}: ${m[series].length} work orders`}
                      onClick={() =>
                        onSelect(
                          `${series === "created" ? "Created" : "Completed"} in ${m.month}`,
                          m[series],
                        )
                      }
                    >
                      <span>{m[series].length}</span>
                    </button>
                  ))}
                </div>
                <strong>{m.month}</strong>
              </div>
            ))}
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Monthly activity data"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Observed month</th>
                  <th scope="col">Created</th>
                  <th scope="col">Completed</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">{m.month}</th>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          onSelect(`Created in ${m.month}`, m.created)
                        }
                      >
                        {m.created.length} records
                      </button>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          onSelect(`Completed in ${m.month}`, m.completed)
                        }
                      >
                        {m.completed.length} records
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {months.length > recent && (
            <button
              className="text-button"
              onClick={() => setRecent((n) => n + 12)}
            >
              Show 12 more observed months
            </button>
          )}
          <p className="insight-note">
            Observed calendar-month event counts within the selected record
            cohort and date window; no months or backlog history are
            synthesized. A zero is no matching event in this report, not proof
            of no portfolio activity. Latest {visible.length} observed months
            shown.
          </p>
        </>
      )}
    </>
  );
}
