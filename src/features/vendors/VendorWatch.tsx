import { VendorScorecard } from "./VendorScorecard";
import { useState } from "react";
import {
  ArrowDownUp,
  ClipboardList,
  Clock3,
  Users,
  UserCheck,
  Wrench,
} from "lucide-react";
import { Panel, Modal } from "../../components/ui";
import { useWorkspace } from "../../data/workspace/context";
import {
  demoDirectory,
  emptyVendorFilters,
  filterVendors,
  joinCompatible,
  sortVendors,
  vendorKpis,
  directoryMetrics,
} from "../../domain/vendors";
import type {
  VendorDirectory,
  VendorFilters,
  VendorMetrics,
  VendorSort,
} from "../../domain/vendors";
import { age, isActive, label } from "../../domain/rules";
import { paginate } from "../../domain/explorer";
import type { ObservationPair } from "../../domain/actions";
import { actionQueue } from "../../domain/actions";
import type { Rules, Snapshot } from "../../domain/types";
import { VendorImport } from "./VendorImport";
import { VendorDraft } from "./VendorDraft";
const shown = (n: number | null) =>
  n === null ? "Unavailable" : n.toLocaleString();
const status = (value: boolean | null) =>
  value === null ? "Unknown" : value ? "Active" : "Inactive";
const specialty = (id: string, directory: VendorDirectory) =>
  directory.categories.find((c) => c.id === id)?.label ?? id;
interface Props {
  demo: Snapshot;
  rules: Rules;
  onOpenExplorer: (id: string) => void;
  onOpenAction: (id: string) => void;
}
export function VendorWatch({
  demo,
  rules,
  onOpenExplorer,
  onOpenAction,
}: Props) {
  const {
    source,
    csv,
    vendorSource,
    vendorCsv,
    selectSource,
    selectVendorSource,
    vendorSession,
    loadVendorCsv,
    clearVendorCsv,
    session,
  } = useWorkspace();
  const [importOpen, setImportOpen] = useState(false);
  const snapshot = source === "csv" && csv ? csv : demo;
  const directory = vendorSource === "csv" ? vendorCsv : demoDirectory(demo);
  return (
    <div className="vendor-watch">
      <section className="source-bar" aria-label="Vendor Watch data sources">
        <div>
          <strong>Vendor Watch</strong>
          <p>
            Independent vendor directory · workload from the selected work-order
            report
          </p>
        </div>
        <label>
          Vendor directory source
          <select
            value={vendorSource}
            onChange={(e) =>
              selectVendorSource(e.target.value as "demo" | "csv")
            }
          >
            <option value="demo">Fictional demo vendors</option>
            <option value="csv" disabled={!vendorCsv}>
              CSV vendor session
              {vendorCsv ? ` (${vendorCsv.vendors.length})` : " (not loaded)"}
            </option>
          </select>
        </label>
        <label>
          Vendor workload source
          <select
            value={source}
            onChange={(e) => selectSource(e.target.value as "demo" | "csv")}
          >
            <option value="demo">Fictional demo work orders</option>
            <option value="csv" disabled={!csv}>
              CSV work-order session
              {csv ? ` (${csv.workOrders.length})` : " (load in Explorer)"}
            </option>
          </select>
        </label>
        <div className="source-buttons">
          <button className="text-button" onClick={() => setImportOpen(true)}>
            Import vendor CSV
          </button>
          {vendorCsv && (
            <button className="text-button" onClick={clearVendorCsv}>
              Clear vendor CSV
            </button>
          )}
        </div>
      </section>
      {directory ? (
        <VendorWorkspace
          key={`${directory.id}:${snapshot.id}:${vendorSource}:${source}`}
          directory={directory}
          snapshot={snapshot}
          rules={rules}
          pair={source === "csv" ? session.observationPair() : null}
          missing={
            vendorSource === "csv"
              ? vendorSession.missingSincePrior().length
              : 0
          }
          onOpenExplorer={onOpenExplorer}
          onOpenAction={onOpenAction}
        />
      ) : (
        <p>
          No vendor directory loaded. Import a validated CSV or choose fictional
          demo vendors.
        </p>
      )}
      {importOpen && (
        <VendorImport
          session={vendorSession}
          onLoad={loadVendorCsv}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}
function VendorWorkspace({
  directory,
  snapshot,
  rules,
  pair,
  missing,
  onOpenExplorer,
  onOpenAction,
}: {
  directory: VendorDirectory;
  snapshot: Snapshot;
  rules: Rules;
  pair: ObservationPair | null;
  missing: number;
  onOpenExplorer: (id: string) => void;
  onOpenAction: (id: string) => void;
}) {
  const dataset = snapshot.datasets.find(
      (d) => d.datasetType === "workOrders",
    )!,
    reference = dataset.reportAsOf ?? snapshot.importedAt,
    scopedRules = { ...rules, timezone: dataset.sourceTimezone };
  const compatible = joinCompatible(directory, snapshot);
  const [filters, setFilters] = useState<VendorFilters>({
      ...emptyVendorFilters,
    }),
    [sort, setSort] = useState<{ key: VendorSort; direction: 1 | -1 }>({
      key: "name",
      direction: 1,
    }),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [queuePage, setQueuePage] = useState(1),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const metrics = directoryMetrics(
      directory,
      snapshot,
      reference,
      scopedRules,
      pair,
    ),
    scoped = filterVendors(metrics, filters, directory),
    kpis = vendorKpis(scoped, compatible);
  const sorted = sortVendors(scoped, sort.key, sort.direction),
    paged = paginate(sorted, page, pageSize),
    selected = metrics.find((m) => m.vendor.id === selectedId);
  const ids = new Set(scoped.map((m) => m.vendor.id));
  const queue = compatible
    ? actionQueue(
        snapshot.workOrders.filter(
          (w) =>
            w.vendorAssignmentState === "assigned" &&
            w.sourceAccountId === directory.dataset.sourceAccountId &&
            !!w.vendorId &&
            ids.has(w.vendorId),
        ),
        reference,
        scopedRules,
        pair,
      )
    : [];
  const queuePaged = paginate(queue, queuePage, 5);
  const knownIds = new Set(directory.vendors.map((v) => v.id));
  const unresolved = compatible
    ? snapshot.workOrders.filter(
        (w) =>
          w.vendorAssignmentState === "assigned" &&
          w.vendorId &&
          !knownIds.has(w.vendorId),
      ).length
    : null;
  const update = (key: keyof VendorFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
    setQueuePage(1);
  };
  const reset = () => {
    setFilters({ ...emptyVendorFilters });
    setPage(1);
    setQueuePage(1);
  };
  const sortBy = (key: VendorSort) => {
    setSort((s) => ({
      key,
      direction: s.key === key && s.direction === 1 ? -1 : 1,
    }));
    setPage(1);
  };
  const cards = [
    {
      title: "Total vendors",
      value: kpis.total,
      unit: "vendor records",
      note: "Current directory filter scope",
      icon: Users,
      click: reset,
      pressed: Object.values(filters).every((v) => !v),
    },
    {
      title: "Active vendors",
      value: kpis.active,
      unit: "vendors",
      note: `${kpis.unknownActive} active states unknown`,
      icon: UserCheck,
      click: () => update("status", "active"),
      pressed: filters.status === "active",
    },
    {
      title: "Vendors with open work orders",
      value: kpis.withOpen,
      unit: "vendors",
      note: "Known active work orders · verified joins",
      icon: Wrench,
      click: () => update("workload", "open"),
      pressed: filters.workload === "open",
    },
    {
      title: `Assigned work orders > ${rules.agingNudgeDays} days`,
      value: kpis.agedOrders,
      unit: "work orders",
      note: "Work-order age; assignment age unavailable",
      icon: Clock3,
    },
    {
      title: "Vendors requiring follow-up",
      value: kpis.followupVendors,
      unit: "vendors",
      note: "Same rules as Action Center",
      icon: ClipboardList,
      click: () => update("followup", "yes"),
      pressed: filters.followup === "yes",
    },
  ];
  const th = (key: VendorSort, title: string) => (
    <th
      scope="col"
      aria-sort={
        sort.key === key
          ? sort.direction === 1
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button className="sort-button" onClick={() => sortBy(key)}>
        {title}
        <ArrowDownUp size={12} />
      </button>
    </th>
  );
  return (
    <>
      <div className="vendor-evidence">
        <span>
          <strong>
            {directory.sourceMode === "demo"
              ? "Fictional vendor directory"
              : "CSV vendor evaluation"}
          </strong>{" "}
          · account {directory.dataset.sourceAccountId} · scope{" "}
          {directory.dataset.reportScope.description}
        </span>
        <span>
          Vendor report: {directory.dataset.reportAsOf ?? "Unknown"} · loaded{" "}
          {directory.dataset.importedAt}
          {directory.sourceMode === "demo" ? " (synthetic)" : ""} ·{" "}
          {directory.dataset.sourceTimezone}
        </span>
        <span>
          Work orders: {snapshot.sourceMode} · {dataset.reportScope.description}{" "}
          ·{" "}
          {dataset.reportAsOf
            ? `as of ${reference}`
            : `report time Unknown; age uses load time ${reference}`}{" "}
          · {scopedRules.timezone}
        </span>
      </div>
      {!compatible && (
        <p className="vendor-caution" role="status">
          Workload unavailable: the directory and work-order sources must share
          source mode, account and explicitly verified Vendor ID semantics. No
          name matching or demo/CSV joining occurs.
        </p>
      )}
      <section className="filter-panel" aria-label="Vendor directory filters">
        <div className="filter-top">
          <label className="search-box">
            <span className="sr-only">Search vendor directory</span>
            <input
              placeholder="Search vendors, IDs, types or specialties…"
              value={filters.query}
              onChange={(e) => update("query", e.target.value)}
            />
          </label>
          <button className="text-button" onClick={reset}>
            Clear vendor filters
          </button>
        </div>
        <div className="vendor-filter-controls">
          <label>
            Maintenance specialty
            <select
              value={filters.specialty}
              onChange={(e) => update("specialty", e.target.value)}
            >
              <option value="">All specialties</option>
              {directory.categories
                .filter((c) =>
                  directory.vendors.some((v) => v.categories.includes(c.id)),
                )
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.label}
                  </option>
                ))}
              <option value="unknown">Not recorded</option>
            </select>
          </label>
          <label>
            Vendor status
            <select
              value={filters.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="">All vendor statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            Vendor workload
            <select
              value={filters.workload}
              onChange={(e) => update("workload", e.target.value)}
            >
              <option value="">All workloads</option>
              <option value="open">Has open work orders</option>
              <option value="none">No open orders in report</option>
              <option value="unknown">Unavailable</option>
            </select>
          </label>
          <label>
            Vendor follow-up needs
            <select
              value={filters.followup}
              onChange={(e) => update("followup", e.target.value)}
            >
              <option value="">All follow-up needs</option>
              <option value="yes">Needs review</option>
              <option value="no">No eligible follow-ups in report</option>
              <option value="unknown">Unavailable</option>
            </select>
          </label>
        </div>
        <p className="filter-result" role="status">
          {scoped.length} of {metrics.length} vendors · directory filters apply
          to cards, directory and linked follow-up queue · independent of
          Explorer filters
        </p>
      </section>
      <section
        className="action-kpis vendor-kpis"
        aria-label="Vendor summary metrics"
      >
        {cards.map(
          ({ title, value, unit, note, icon: Icon, click, pressed }) =>
            click ? (
              <button
                key={title}
                className="action-kpi"
                aria-pressed={pressed}
                onClick={click}
              >
                <span className="action-kpi-icon">
                  <Icon size={19} />
                </span>
                <span>{title}</span>
                <strong className={value === null ? "unavailable" : ""}>
                  {shown(value)}
                </strong>
                <small>
                  {unit} · {note}
                </small>
              </button>
            ) : (
              <div className="action-kpi" key={title}>
                <span className="action-kpi-icon">
                  <Icon size={19} />
                </span>
                <span>{title}</span>
                <strong className={value === null ? "unavailable" : ""}>
                  {shown(value)}
                </strong>
                <small>
                  {unit} · {note}
                </small>
              </div>
            ),
        )}
      </section>
      <Panel
        title="Vendor directory"
        eyebrow="FIND A VENDOR · VERIFIED SPECIALTIES ONLY"
        action={
          <label className="vendor-sort">
            Sort directory
            <select
              value={sort.key}
              onChange={(e) => {
                setSort({ key: e.target.value as VendorSort, direction: 1 });
                setPage(1);
              }}
            >
              {(
                [
                  ["name", "Vendor name"],
                  ["id", "Vendor ID"],
                  ["type", "Vendor type"],
                  ["active", "Active status"],
                  ["assigned", "Assigned work orders"],
                  ["open", "Open work orders"],
                  ["completed", "Completed work orders"],
                  ["average", "Average completion duration"],
                  ["followups", "Follow-up work orders"],
                ] as const
              ).map(([key, title]) => (
                <option key={key} value={key}>
                  {title}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div
          className="table-scroll vendor-register"
          tabIndex={0}
          role="region"
          aria-label="Vendor directory table"
        >
          <table>
            <thead>
              <tr>
                {th("name", "Vendor / ID")}
                <th scope="col">Specialties / type</th>
                {th("active", "Status")}
                {th("assigned", "Assigned")}
                {th("open", "Open")}
                {th("completed", "Completed")}
                {th("average", "Avg. completion")}
                <th scope="col">Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((m) => (
                <tr key={m.vendor.id}>
                  <td>
                    <button
                      className="record-link"
                      onClick={() => setSelectedId(m.vendor.id)}
                    >
                      {m.vendor.displayName || "Vendor name not recorded"}
                    </button>
                    <small>{m.vendor.sourceId}</small>
                  </td>
                  <td>
                    <span>
                      {m.vendor.categories.length
                        ? m.vendor.categories
                            .map((id) => specialty(id, directory))
                            .join(" · ")
                        : "Specialties unavailable"}
                    </span>
                    <small>{m.vendor.vendorType ?? "Type not recorded"}</small>
                  </td>
                  <td>
                    <span
                      className={`vendor-state ${m.vendor.active === true ? "known-active" : ""}`}
                    >
                      {status(m.vendor.active)}
                    </span>
                  </td>
                  <td>{shown(m.assigned)}</td>
                  <td>{shown(m.active)}</td>
                  <td>{shown(m.completed)}</td>
                  <td>
                    {m.average === null
                      ? "Unavailable"
                      : `${m.average.toFixed(1)} ${m.durationBasis}`}
                    <small>
                      {m.assigned === null
                        ? "No verified join"
                        : `n=${m.duration.date.n + m.duration.instant.n} · ${m.duration.excluded} excluded`}
                    </small>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setSelectedId(m.vendor.id)}
                    >
                      {m.assigned === null
                        ? "View profile"
                        : `${m.followups.length} to review`}
                    </button>
                    <small>Not rated</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!paged.rows.length && (
          <div className="empty-inline">
            <h3>No matching vendors</h3>
            <p>
              Change search or filters to review available directory records.
            </p>
            <button className="text-button" onClick={reset}>
              Reset vendor directory
            </button>
          </div>
        )}
        <div className="pagination">
          <p aria-live="polite">
            {sorted.length} matching vendors · Page {paged.page} of{" "}
            {paged.pages}
          </p>
          <label>
            Vendors per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            className="outline-button"
            disabled={paged.page <= 1}
            onClick={() => setPage(paged.page - 1)}
          >
            Previous vendors
          </button>
          <button
            className="outline-button"
            disabled={paged.page >= paged.pages}
            onClick={() => setPage(paged.page + 1)}
          >
            Next vendors
          </button>
        </div>
      </Panel>
      <Panel
        title="Vendor follow-up queue"
        eyebrow="SUGGESTED REVIEW · NO PERFORMANCE RANKING"
        action={
          <span className="chart-tag">{queue.length} unique work orders</span>
        }
      >
        <p className="vendor-note">
          Work-order age measures time since creation, not time since vendor
          assignment. Urgency and pending approval describe source work-order
          facts; they do not establish vendor delay or poor performance.
        </p>
        <div
          className="table-scroll vendor-queue"
          tabIndex={0}
          role="region"
          aria-label="Vendor follow-up table"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Vendor / property</th>
                <th scope="col">Work order / status</th>
                <th scope="col">WO age</th>
                <th scope="col">Follow-up reason</th>
                <th scope="col">Recommended next action</th>
              </tr>
            </thead>
            <tbody>
              {queuePaged.rows.map((item) => {
                const w = item.order,
                  days = age(w, reference, scopedRules);
                return (
                  <tr key={w.id}>
                    <td>
                      <button
                        className="record-link"
                        onClick={() => setSelectedId(w.vendorId)}
                      >
                        {directory.vendors.find((v) => v.id === w.vendorId)
                          ?.displayName || "Name not recorded"}
                      </button>
                      <small>
                        {snapshot.properties.find((p) => p.id === w.propertyId)
                          ?.displayName ?? "Unknown property"}
                      </small>
                    </td>
                    <td>
                      <button
                        className="record-link"
                        onClick={() => onOpenExplorer(w.id)}
                      >
                        {w.number}
                      </button>
                      <small>{label(w.status)}</small>
                    </td>
                    <td>
                      <span
                        className={
                          days !== null && days > rules.agingNudgeDays
                            ? "vendor-aged"
                            : ""
                        }
                      >
                        {days === null ? "Unknown" : `${days} days`}
                      </span>
                      <small>Assignment age unavailable</small>
                    </td>
                    <td>
                      {item.recommendations.map((r) => (
                        <span className="vendor-reason" key={r.key}>
                          {r.title}
                        </span>
                      ))}
                    </td>
                    <td>
                      <p>{item.recommendations[0].recommendation}</p>
                      <button
                        className="text-button"
                        onClick={() => onOpenAction(w.id)}
                      >
                        Review in Action Center
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!queue.length && (
          <p className="empty-inline">
            {compatible
              ? "No eligible vendor follow-ups in this directory filter scope."
              : "No verified work-order relationship. Load compatible CSVs or choose both demo sources."}
          </p>
        )}
        {queuePaged.pages > 1 && (
          <div className="pagination">
            <span>
              Follow-up page {queuePaged.page} of {queuePaged.pages}
            </span>
            <button
              className="outline-button"
              disabled={queuePaged.page === 1}
              onClick={() => setQueuePage(queuePaged.page - 1)}
            >
              Previous follow-ups
            </button>
            <button
              className="outline-button"
              disabled={queuePaged.page === queuePaged.pages}
              onClick={() => setQueuePage(queuePaged.page + 1)}
            >
              Next follow-ups
            </button>
          </div>
        )}
      </Panel>
      <VendorScorecard metrics={scoped} compatible={compatible} />
      <details className="vendor-coverage">
        <summary>Data coverage &amp; metric limits</summary>
        <p>
          {unresolved === null
            ? "Unmatched joins unavailable without verified identifiers."
            : `${unresolved} assigned work-order references do not resolve to this directory; excluded from vendor counts, never treated as unassigned.`}{" "}
          {missing} vendors not observed since the prior comparable vendor load;
          not inferred inactive or deleted.
        </p>
        <p>
          {
            snapshot.workOrders.filter(
              (w) => w.vendorAssignmentState === "unknown",
            ).length
          }{" "}
          work orders have unknown assignment state. Metrics cover only the
          selected work-order report, not vendor lifetime totals. Unknown
          statuses and invalid ages are excluded from eligible metrics. Ratings,
          response time, service quality, assignment dates and appointments are
          unavailable. No quality ranking is calculated.
        </p>
        <p>
          Separate vendor freshness policy is not configured; source freshness
          is not inferred from work-order freshness. Imported directory contacts
          remain evaluation-only; no operational authorization is provided.
        </p>
      </details>
      {selected && (
        <VendorProfile
          key={selected.vendor.id}
          metrics={selected}
          directory={directory}
          snapshot={snapshot}
          reference={reference}
          rules={scopedRules}
          compatible={compatible}
          onClose={() => setSelectedId(null)}
          onOpenExplorer={(id) => {
            setSelectedId(null);
            onOpenExplorer(id);
          }}
          onOpenAction={(id) => {
            setSelectedId(null);
            onOpenAction(id);
          }}
        />
      )}
    </>
  );
}
function VendorProfile({
  metrics: m,
  directory,
  snapshot,
  reference,
  rules,
  compatible,
  onClose,
  onOpenExplorer,
  onOpenAction,
}: {
  metrics: VendorMetrics;
  directory: VendorDirectory;
  snapshot: Snapshot;
  reference: string;
  rules: Rules;
  compatible: boolean;
  onClose: () => void;
  onOpenExplorer: (id: string) => void;
  onOpenAction: (id: string) => void;
}) {
  const v = m.vendor,
    active = m.rows.filter(isActive),
    completed = m.rows.filter((w) => w.status === "completed");
  const [cohort, setCohort] = useState("active"),
    [page, setPage] = useState(1);
  const rows =
    cohort === "active"
      ? active
      : cohort === "completed"
        ? completed
        : cohort === "aged"
          ? active.filter(
              (w) => (age(w, reference, rules) ?? -1) > rules.agingNudgeDays,
            )
          : m.rows;
  const paged = paginate(rows, page, 10);
  return (
    <Modal
      title={v.displayName || "Vendor name not recorded"}
      onClose={onClose}
    >
      <div className="vendor-profile">
        <span className="demo-pill">
          {directory.sourceMode === "demo"
            ? "Fictional vendor profile"
            : "CSV vendor evaluation profile"}
        </span>
        <p className="muted">
          Vendor ID {v.sourceId} · {directory.dataset.sourceAccountId} · Not
          rated
        </p>
        <dl className="record-details">
          {Object.entries({
            "Vendor type": v.vendorType ?? "Not recorded",
            Specialties:
              v.categories.map((id) => specialty(id, directory)).join(", ") ||
              "Unavailable",
            "Active status": status(v.active),
            "Business email": v.businessEmail ?? "Not recorded",
            "Business phone": v.businessPhone ?? "Not recorded",
            State: v.state ?? "Not recorded",
            "Liability insurance expiration": v.liabilityInsuranceExpiration
              ? `${v.liabilityInsuranceExpiration.value} (${v.liabilityInsuranceExpiration.precision})`
              : "Unavailable",
            "Vendor report as of": directory.dataset.reportAsOf ?? "Unknown",
            "Vendor loaded": `${directory.dataset.importedAt}${directory.sourceMode === "demo" ? " (synthetic)" : ""}`,
            "Source provenance": v.provenance,
          }).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">
          Insurance dates are source values, not a verification of coverage or
          compliance. Contact information is displayed as text; no send or dial
          action is provided.
        </p>
        <section
          className="vendor-profile-stats"
          aria-label="Vendor performance statistics"
        >
          <h3>Observed performance · selected work-order report</h3>
          <dl className="record-details">
            {Object.entries({
              "Total assigned": shown(m.assigned),
              "Active assignments": shown(m.active),
              "Completed work orders": shown(m.completed),
              [`Work orders older than ${rules.agingNudgeDays} days`]: shown(
                m.aged,
              ),
              "Work orders requiring follow-up": compatible
                ? String(m.followups.length)
                : "Unavailable",
              "Average completion duration":
                m.average === null
                  ? "Unavailable"
                  : `${m.average.toFixed(1)} ${m.durationBasis}`,
            }).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {compatible ? (
            <p className="muted">
              Calendar-date mean:{" "}
              {m.duration.date.mean === null
                ? "Unavailable"
                : `${m.duration.date.mean.toFixed(1)} days`}{" "}
              (n={m.duration.date.n}); elapsed-time mean:{" "}
              {m.duration.instant.mean === null
                ? "Unavailable"
                : `${m.duration.instant.mean.toFixed(1)} days`}{" "}
              (n={m.duration.instant.n}). {m.duration.excluded} completed
              records excluded for invalid/missing/mixed dates.{" "}
              {m.rows.filter((w) => w.status === "unknown").length} unknown
              statuses;{" "}
              {active.filter((w) => age(w, reference, rules) === null).length}{" "}
              active ages unknown.
            </p>
          ) : (
            <p className="vendor-caution">
              No compatible work-order join. All workload statistics are
              unavailable.
            </p>
          )}
          <h4>Active workload by work-order category</h4>
          {m.workload.length ? (
            <ul className="vendor-workload">
              {m.workload.map((c) => (
                <li key={c.label}>
                  <span>{c.label}</span>
                  <strong>{c.count} work orders</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              {compatible
                ? "No known active work orders in this report."
                : "Unavailable without a verified join."}{" "}
              Work-order categories do not establish vendor specialties.
            </p>
          )}
        </section>
        <section
          className="vendor-history"
          aria-label="Vendor work order history"
        >
          <h3>Work orders &amp; available history</h3>
          <p className="muted">
            Current report records only; not a complete service or communication
            history. Assignment timing and appointment details are unavailable.
          </p>
          <label>
            Profile work-order group
            <select
              value={cohort}
              onChange={(e) => {
                setCohort(e.target.value);
                setPage(1);
              }}
            >
              <option value="active">Current known active work orders</option>
              <option value="completed">Completed work orders</option>
              <option value="aged">Aging active work orders</option>
              <option value="all">All report records</option>
            </select>
          </label>
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Vendor related work orders"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Work order / property</th>
                  <th scope="col">Status / work-order age</th>
                  <th scope="col">Available dates</th>
                  <th scope="col">Next action</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <button
                        className="record-link"
                        onClick={() => onOpenExplorer(w.id)}
                      >
                        {w.number}
                      </button>
                      <small>
                        {snapshot.properties.find((p) => p.id === w.propertyId)
                          ?.displayName ?? "Unknown property"}
                      </small>
                      <p>{w.summaryRedacted ?? "Issue unavailable"}</p>
                    </td>
                    <td>
                      {label(w.status)}
                      <small>
                        {isActive(w)
                          ? age(w, reference, rules) === null
                            ? "Age unknown"
                            : `${age(w, reference, rules)} days since creation`
                          : "Active age not applicable"}
                      </small>
                    </td>
                    <td>
                      Created: {w.createdAt?.value ?? "Unknown"}
                      <small>
                        Completed: {w.completedAt?.value ?? "Unknown"}
                      </small>
                    </td>
                    <td>
                      {m.followups.some((i) => i.order.id === w.id) ? (
                        <button
                          className="text-button"
                          onClick={() => onOpenAction(w.id)}
                        >
                          Review in Action Center
                        </button>
                      ) : (
                        "No eligible follow-up in report"
                      )}
                      <button
                        className="text-button"
                        onClick={() => onOpenExplorer(w.id)}
                      >
                        Open in Explorer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!paged.rows.length && (
            <p className="empty-inline">
              {compatible
                ? "No records in this group."
                : "Related work orders unavailable without a verified join."}
            </p>
          )}
          {paged.pages > 1 && (
            <div className="pagination">
              <span>
                Profile page {paged.page} of {paged.pages}
              </span>
              <button
                className="outline-button"
                disabled={paged.page === 1}
                onClick={() => setPage(paged.page - 1)}
              >
                Previous profile records
              </button>
              <button
                className="outline-button"
                disabled={paged.page === paged.pages}
                onClick={() => setPage(paged.page + 1)}
              >
                Next profile records
              </button>
            </div>
          )}
        </section>
        <VendorDraft
          rows={active}
          snapshot={snapshot}
          rules={rules}
          reference={reference}
        />
        {v.fieldCoverage && (
          <details className="vendor-coverage">
            <summary>Vendor field coverage</summary>
            <dl className="record-details">
              {Object.entries(v.fieldCoverage).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{label(value)}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    </Modal>
  );
}
