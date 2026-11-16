import { metricValue } from "../../domain/format";
import { useState } from "react";
import { Panel } from "../../components/ui";
import type { PropertyMetrics, PropertySort } from "../../domain/properties";
import { sortProperties } from "../../domain/properties";
import type { VendorMetrics, VendorSort } from "../../domain/vendors";
import { sortVendors } from "../../domain/vendors";
import { paginate } from "../../domain/explorer";
export function PropertyComparison({
  metrics,
}: {
  metrics: PropertyMetrics[];
}) {
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState<PropertySort>("name"),
    [page, setPage] = useState(1);
  const filtered = metrics.filter((m) =>
      m.name.toLowerCase().includes(query.toLowerCase()),
    ),
    paged = paginate(
      sortProperties(filtered, sort, sort === "name" ? 1 : -1),
      page,
      10,
    );
  return (
    <Panel
      title="Property comparison"
      eyebrow="EQUAL FILTER CONTEXT · OBSERVED RECORDS"
    >
      <div className="comparison-controls">
        <label>
          Find comparison properties
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Compare properties by
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as PropertySort);
              setPage(1);
            }}
          >
            {(
              [
                ["name", "Property name"],
                ["total", "Report volume"],
                ["open", "Active maintenance"],
                ["mean", "Completion duration"],
                ["aged", "Aging work orders"],
                ["pending", "Pending approvals"],
              ] as const
            ).map(([key, title]) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="table-scroll insight-comparison"
        tabIndex={0}
        role="region"
        aria-label="Property comparison table"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Property</th>
              <th scope="col">Volume</th>
              <th scope="col">Active</th>
              <th scope="col">Aged</th>
              <th scope="col">Pending</th>
              <th scope="col">Mean / sample</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((m) => (
              <tr key={m.key}>
                <th scope="row">{m.name}</th>
                <td>{m.stats.total}</td>
                <td>{m.stats.open}</td>
                <td>{m.stats.aged}</td>
                <td>{m.stats.pending}</td>
                <td>
                  {metricValue(m.stats.mean, 1)}
                  <small>
                    {m.stats.mixed ? "Mixed precision" : m.stats.durationBasis}{" "}
                    · n={m.stats.n} · {m.stats.duration.excluded} excluded
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!paged.rows.length && (
        <p className="empty-inline">No comparison properties match.</p>
      )}
      <ComparePagination
        page={paged.page}
        pages={paged.pages}
        setPage={setPage}
        name="property"
      />
      <p className="insight-note">
        Same report/cohort filters apply to every row. Property/unit size and
        occupancy are unavailable; counts are not normalized risk or service
        quality ratings.
      </p>
    </Panel>
  );
}
export function VendorComparison({
  metrics,
  compatible,
}: {
  metrics: VendorMetrics[];
  compatible: boolean;
}) {
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState<VendorSort>("name"),
    [page, setPage] = useState(1);
  const filtered = metrics.filter((m) =>
      `${m.vendor.displayName} ${m.vendor.sourceId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
    paged = paginate(
      sortVendors(filtered, sort, sort === "name" ? 1 : -1),
      page,
      10,
    );
  return (
    <Panel
      title="Vendor comparison"
      eyebrow="VERIFIED ASSOCIATIONS · NO QUALITY RANKING"
    >
      <div className="comparison-controls">
        <label>
          Find comparison vendors
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Compare vendors by
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as VendorSort);
              setPage(1);
            }}
          >
            {(
              [
                ["name", "Vendor name"],
                ["assigned", "Assigned volume"],
                ["completed", "Completed records"],
                ["average", "Completion duration"],
                ["open", "Open workload"],
                ["followups", "Follow-up workload"],
              ] as const
            ).map(([key, title]) => (
              <option value={key} key={key}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!compatible && (
        <p className="vendor-caution">
          Unavailable: choose a verified same-account vendor directory and
          work-order source. No demo/CSV or name-based joins.
        </p>
      )}
      <div
        className="table-scroll insight-comparison"
        tabIndex={0}
        role="region"
        aria-label="Vendor comparison table"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Vendor</th>
              <th scope="col">Assigned</th>
              <th scope="col">Completed</th>
              <th scope="col">Open</th>
              <th scope="col">Follow-ups</th>
              <th scope="col">Mean / sample</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((m) => (
              <tr key={m.vendor.id}>
                <th scope="row">
                  {m.vendor.displayName || "Name unavailable"}
                  <small>{m.vendor.sourceId} · Not rated</small>
                </th>
                <td>{metricValue(m.assigned)}</td>
                <td>{metricValue(m.completed)}</td>
                <td>{metricValue(m.active)}</td>
                <td>
                  {metricValue(m.assigned === null ? null : m.followups.length)}
                </td>
                <td>
                  {metricValue(m.average, 1)}
                  <small>
                    {m.assigned === null
                      ? "Join unavailable"
                      : `${m.durationBasis} · n=${m.duration.date.n + m.duration.instant.n} · ${m.duration.excluded} excluded`}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!paged.rows.length && (
        <p className="empty-inline">
          No vendors in the selected directory match this search.
        </p>
      )}
      <ComparePagination
        page={paged.page}
        pages={paged.pages}
        setPage={setPage}
        name="vendor"
      />
      <p className="insight-note">
        Work-order age and completion duration do not measure vendor response
        time, appointment timeliness or service quality. Completed cohorts and
        sample sizes may differ; these are observed report records, not
        comparable quality scores. Unresolved assigned IDs remain in the
        workload chart and are excluded from directory comparisons.
      </p>
    </Panel>
  );
}
function ComparePagination({
  page,
  pages,
  setPage,
  name,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
  name: string;
}) {
  return pages > 1 ? (
    <div className="pagination">
      <span>
        Comparison page {page} of {pages}
      </span>
      <button
        className="outline-button"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous {name} comparisons
      </button>
      <button
        className="outline-button"
        disabled={page === pages}
        onClick={() => setPage(page + 1)}
      >
        Next {name} comparisons
      </button>
    </div>
  ) : null;
}
