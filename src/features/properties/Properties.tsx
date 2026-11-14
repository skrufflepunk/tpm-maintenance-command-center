import { metricValue } from "../../domain/format";
import { useState } from "react";
import {
  ArrowDownUp,
  Building2,
  Clock3,
  ClipboardList,
  Users,
  Wrench,
} from "lucide-react";
import { Panel } from "../../components/ui";
import type { Rules, Snapshot } from "../../domain/types";
import {
  emptyInsightFilters,
  maintenanceStats,
  selectInsightRows,
} from "../../domain/insights";
import type { InsightFilters as Filters } from "../../domain/insights";
import {
  filterProperties,
  propertyMetrics,
  signalLabels,
  sortProperties,
} from "../../domain/properties";
import type { PropertySignal, PropertySort } from "../../domain/properties";
import { paginate } from "../../domain/explorer";
import { useInsightWorkspace } from "../insights/workspace";
import { InsightSource } from "../insights/InsightSource";
import { InsightFilters } from "../insights/InsightFilters";
import { CoverageNote } from "../insights/Metrics";
import { ReviewSettings } from "../insights/ReviewSettings";
import { PropertyProfile } from "./PropertyProfile";
export function Properties({
  demo,
  rules,
  onOpenExplorer,
}: {
  demo: Snapshot;
  rules: Rules;
  onOpenExplorer: (id: string) => void;
}) {
  const workspace = useInsightWorkspace(demo, rules);
  return (
    <div className="insight-workspace">
      <InsightSource
        snapshot={workspace.snapshot}
        directory={workspace.directory}
        name="Properties"
      />
      <PropertyDirectory
        key={`${workspace.snapshot.id}:${workspace.source}:${workspace.vendorSource}:${workspace.directory?.id}`}
        workspace={workspace}
        onOpenExplorer={onOpenExplorer}
      />
    </div>
  );
}
function PropertyDirectory({
  workspace: w,
  onOpenExplorer,
}: {
  workspace: ReturnType<typeof useInsightWorkspace>;
  onOpenExplorer: (id: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>({ ...emptyInsightFilters }),
    [query, setQuery] = useState(""),
    [signal, setSignal] = useState<PropertySignal | "">(""),
    [workload, setWorkload] = useState(""),
    [sort, setSort] = useState<{ key: PropertySort; direction: 1 | -1 }>({
      key: "name",
      direction: 1,
    }),
    [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [selected, setSelected] = useState<string | null>(null),
    [settingsOpen, setSettingsOpen] = useState(false);
  const scoped = selectInsightRows(w.snapshot, filters, w.rules),
    all = propertyMetrics(
      w.snapshot,
      scoped,
      w.reference,
      w.rules,
      w.reviewSettings,
    ),
    filtered = filterProperties(all, query, signal, workload),
    sorted = sortProperties(filtered, sort.key, sort.direction),
    paged = paginate(sorted, page, size),
    stats = maintenanceStats(
      filtered.flatMap((p) => p.rows),
      w.reference,
      w.rules,
    );
  const current = all.find((m) => m.key === selected);
  const reset = () => {
    setFilters({ ...emptyInsightFilters });
    setQuery("");
    setSignal("");
    setWorkload("");
    setPage(1);
  };
  const cards = [
    {
      name: "Open work orders",
      value: stats.open,
      detail: `${stats.total} scoped report records`,
      icon: Wrench,
    },
    {
      name: `Over ${w.rules.agingNudgeDays} days old`,
      value: stats.aged,
      detail: `${stats.unknownAge} active ages unknown`,
      icon: Clock3,
    },
    {
      name: "Awaiting owner approval",
      value: stats.pending,
      detail: "Explicit pending on known active",
      icon: ClipboardList,
    },
    {
      name: "Without an assigned vendor",
      value: stats.unassigned,
      detail: "Explicit unassignment only",
      icon: Users,
    },
    {
      name: "Average completion time",
      value: stats.mean,
      detail: `${stats.durationBasis} · n=${stats.n}${stats.mixed ? " · mixed precision" : ""}`,
      icon: Building2,
    },
  ];
  const th = (key: PropertySort, title: string) => (
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
      <button
        className="sort-button"
        onClick={() => {
          setSort((s) => ({
            key,
            direction: s.key === key && s.direction === 1 ? -1 : 1,
          }));
          setPage(1);
        }}
      >
        {title}
        <ArrowDownUp size={12} />
      </button>
    </th>
  );
  return (
    <>
      <InsightFilters
        name="Properties"
        snapshot={w.snapshot}
        directory={w.directory}
        compatible={w.vendorCompatible}
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />
      <section className="insight-kpis" aria-label="Property summary">
        {cards.map(({ name, value, detail, icon: Icon }) => (
          <div className="insight-kpi" key={name}>
            <Icon size={18} />
            <span>{name}</span>
            <strong className={value === null ? "unavailable" : ""}>
              {metricValue(value, 1)}
            </strong>
            <small>{detail}</small>
          </div>
        ))}
      </section>
      <Panel
        title="Property maintenance directory"
        eyebrow="OBSERVED WORKLOAD · NO RISK RATINGS"
        action={
          <button
            className="outline-button"
            onClick={() => setSettingsOpen(true)}
          >
            Review thresholds
          </button>
        }
      >
        <div className="insight-property-controls">
          <label className="search-box">
            <span className="sr-only">Search property directory</span>
            <input
              value={query}
              placeholder="Find property name, supplied address or ID…"
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Operational signal
            <select
              value={signal}
              onChange={(e) => {
                setSignal(e.target.value as typeof signal);
                setPage(1);
              }}
            >
              <option value="">All review signals</option>
              {Object.entries(signalLabels).map(([key, title]) => (
                <option value={key} key={key}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Property workload
            <select
              value={workload}
              onChange={(e) => {
                setWorkload(e.target.value);
                setPage(1);
              }}
            >
              <option value="">
                All properties, including zero work orders
              </option>
              <option value="open">Has known active work orders</option>
              <option value="none">No known active work orders in scope</option>
            </select>
          </label>
          <button className="text-button" onClick={reset}>
            Clear property filters
          </button>
        </div>
        <p className="insight-note" role="status">
          {filtered.length} of {all.length} directory groups · {stats.total}{" "}
          scoped work orders · {w.snapshot.properties.length} supplied property
          entities. Unknown relationships stay separate; CSV properties are
          inferred from supplied stable IDs.
        </p>
        <div
          className="table-scroll insight-property-register"
          tabIndex={0}
          role="region"
          aria-label="Property directory table"
        >
          <table>
            <thead>
              <tr>
                {th("name", "Property / coverage")}
                {th("total", "Total")}
                {th("open", "Open")}
                {th("completed", "Completed")}
                {th("aged", `>${w.rules.agingNudgeDays} days`)}
                {th("pending", "Approval")}
                {th("unassigned", "No vendor")}
                {th("mean", "Avg. completion")}
                <th scope="col">Review signals</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((m) => (
                <tr key={m.key}>
                  <td>
                    <button
                      className="record-link"
                      onClick={() => setSelected(m.key)}
                    >
                      {m.name}
                    </button>
                    <small>
                      {m.property
                        ? `${m.property.sourceId} · ${m.property.coverageKind}`
                        : "Unresolved relationships"}
                    </small>
                  </td>
                  <td>{m.stats.total}</td>
                  <td>{m.stats.open}</td>
                  <td>{m.stats.completed}</td>
                  <td className={m.stats.aged ? "insight-aged" : ""}>
                    {m.stats.aged}
                  </td>
                  <td>{m.stats.pending}</td>
                  <td>{m.stats.unassigned}</td>
                  <td>
                    {metricValue(m.stats.mean, 1)}
                    <small>
                      {m.stats.mean === null
                        ? m.stats.mixed
                          ? "Mixed date precision"
                          : "No eligible pairs"
                        : `${m.stats.durationBasis} · n=${m.stats.n}`}
                    </small>
                  </td>
                  <td>
                    {m.signals.length ? (
                      m.signals.map((s) => (
                        <span className={`insight-signal signal-${s}`} key={s}>
                          {signalLabels[s]}
                        </span>
                      ))
                    ) : (
                      <small>No configured signal</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!paged.rows.length && (
          <div className="empty-inline">
            <h3>No matching properties</h3>
            <p>
              No property rows match the directory filters. Properties with zero
              matching work orders are retained unless workload/signal filters
              exclude them.
            </p>
            <button className="text-button" onClick={reset}>
              Reset property directory
            </button>
          </div>
        )}
        <div className="pagination">
          <span>
            Property page {paged.page} of {paged.pages}
          </span>
          <label>
            Properties per page
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
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
            disabled={paged.page === 1}
            onClick={() => setPage(paged.page - 1)}
          >
            Previous properties
          </button>
          <button
            className="outline-button"
            disabled={paged.page === paged.pages}
            onClick={() => setPage(paged.page + 1)}
          >
            Next properties
          </button>
        </div>
        <CoverageNote stats={stats} />
      </Panel>
      <Panel
        title="Operational maintenance summary"
        eyebrow="CONFIGURABLE REVIEW · CURRENT FILTER SCOPE"
      >
        <div className="insight-signals">
          {Object.entries(signalLabels).map(([key, title]) => (
            <button
              key={key}
              aria-pressed={signal === key}
              onClick={() => {
                setSignal((s) => (s === key ? "" : (key as PropertySignal)));
                setPage(1);
              }}
            >
              <span>{title}</span>
              <strong>
                {
                  filterProperties(all, query, "", workload).filter((m) =>
                    m.signals.includes(key as PropertySignal),
                  ).length
                }
              </strong>
              <small>directory groups · view supporting properties</small>
            </button>
          ))}
        </div>
        <p className="insight-note">
          Proposed thresholds: volume ≥{w.reviewSettings.highVolumeOrders}{" "}
          report records; aging ≥{w.reviewSettings.multipleAgedOrders} work
          orders strictly over {w.rules.agingNudgeDays} calendar days; approvals
          ≥{w.reviewSettings.pendingApprovals}; unassigned ≥
          {w.reviewSettings.unassignedOrders}; same known category on ≥
          {w.reviewSettings.repeatedCategoryOrders} work orders. Repeated
          categories are observations, not proof of recurring failures. No
          normalization by units or occupancy is possible.
        </p>
      </Panel>
      {selected && current && (
        <PropertyProfile
          metrics={current}
          snapshot={w.snapshot}
          rules={w.rules}
          reference={w.reference}
          directory={w.directory}
          compatible={w.vendorCompatible}
          pair={w.source === "csv" ? w.session.observationPair() : null}
          onClose={() => setSelected(null)}
          onOpen={onOpenExplorer}
        />
      )}
      {settingsOpen && (
        <ReviewSettings onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}
