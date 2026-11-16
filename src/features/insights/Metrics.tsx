import type { maintenanceStats } from "../../domain/insights";
import { metricValue } from "../../domain/format";
export function DurationEvidence({
  stats,
}: {
  stats: ReturnType<typeof maintenanceStats>;
}) {
  return (
    <>
      <p className="insight-note">
        {stats.mixed
          ? "Mixed date precision: no combined mean or median. "
          : ""}
        {stats.duration.excluded} completed records excluded for missing,
        invalid, inverted or incompatible date pairs. These are observed
        durations, not response times or quality ratings.
      </p>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Completion duration cohorts"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Date basis</th>
              <th scope="col">Mean</th>
              <th scope="col">Median</th>
              <th scope="col">Eligible sample</th>
            </tr>
          </thead>
          <tbody>
            {(["date", "instant"] as const).map((key) => (
              <tr key={key}>
                <th scope="row">
                  {key === "date"
                    ? "Calendar-date pairs"
                    : "Elapsed timestamp pairs"}
                </th>
                <td>
                  {metricValue(stats.duration[key].mean, 1)}
                  {stats.duration[key].n ? " days" : ""}
                </td>
                <td>
                  {metricValue(stats.duration[key].median, 1)}
                  {stats.duration[key].n ? " days" : ""}
                </td>
                <td>n={stats.duration[key].n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function CoverageNote({
  stats,
}: {
  stats: ReturnType<typeof maintenanceStats>;
}) {
  return (
    <p className="insight-note">
      {stats.unknownStatus} unknown statuses excluded from active/completed
      counts · {stats.unknownAge} active ages unknown · {stats.unknownApproval}{" "}
      active approval states unknown · {stats.unknownAssignment} active
      assignment states unknown.
    </p>
  );
}
