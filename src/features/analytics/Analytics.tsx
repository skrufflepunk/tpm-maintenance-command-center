import { metricValue } from "../../domain/format";
import { useState } from "react";
import { Panel, Modal } from "../../components/ui";
import type { Rules, Snapshot, WorkOrder } from "../../domain/types";
import { isActive } from "../../domain/rules";
import {
  ageBreakdown,
  approvalBreakdown,
  assignmentBreakdown,
  assignmentKey,
  breakdown,
  categoryBreakdown,
  emptyInsightFilters,
  maintenanceStats,
  monthlyActivity,
  observedBacklog,
  propertyClassifier,
  selectInsightRows,
} from "../../domain/insights";
import type {
  Breakdown,
  InsightFilters as Filters,
} from "../../domain/insights";
import { propertyMetrics } from "../../domain/properties";
import { directoryMetrics } from "../../domain/vendors";
import {
  useInsightWorkspace,
  resolvedVendorLabel,
} from "../insights/workspace";
import { InsightSource } from "../insights/InsightSource";
import { InsightFilters } from "../insights/InsightFilters";
import { DurationEvidence, CoverageNote } from "../insights/Metrics";
import { InsightRecords } from "../insights/InsightRecords";
import { BreakdownChart } from "../insights/BreakdownChart";
import { ActivityChart } from "./ActivityChart";
import { PropertyComparison, VendorComparison } from "./Comparisons";
export function Analytics({
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
        name="Analytics"
      />
      <AnalyticsContent
        key={`${workspace.snapshot.id}:${workspace.source}:${workspace.vendorSource}:${workspace.directory?.id}`}
        workspace={workspace}
        onOpenExplorer={onOpenExplorer}
      />
    </div>
  );
}
function AnalyticsContent({
  workspace: w,
  onOpenExplorer,
}: {
  workspace: ReturnType<typeof useInsightWorkspace>;
  onOpenExplorer: (id: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>({ ...emptyInsightFilters }),
    [drill, setDrill] = useState<{ title: string; rows: WorkOrder[] } | null>(
      null,
    );
  const rows = selectInsightRows(w.snapshot, filters, w.rules),
    stats = maintenanceStats(rows, w.reference, w.rules),
    scopedSnapshot = { ...w.snapshot, workOrders: rows };
  const activity = monthlyActivity(
      rows,
      w.reference,
      w.rules.timezone,
      filters.from,
      filters.to,
    ),
    properties = propertyMetrics(
      w.snapshot,
      rows,
      w.reference,
      w.rules,
      w.reviewSettings,
    );
  const pair = w.source === "csv" ? w.session.observationPair() : null,
    history = observedBacklog(pair, filters, w.rules);
  const vendors =
    w.directory && w.vendorCompatible
      ? directoryMetrics(
          w.directory,
          scopedSnapshot,
          w.reference,
          w.rules,
          pair,
        )
      : [];
  const classify = propertyClassifier(w.snapshot);
  const vendorNames = new Map(
    rows.map((order) => [
      assignmentKey(order),
      resolvedVendorLabel(order, w.directory, w.vendorCompatible),
    ]),
  );
  const charts: [string, string, Breakdown[]][] = [
    [
      "Aging distribution",
      "Known active work orders · configured calendar-day buckets",
      ageBreakdown(rows, w.reference, w.rules),
    ],
    [
      "Maintenance categories",
      "All scoped report records",
      categoryBreakdown(rows, w.snapshot),
    ],
    [
      "Work orders by property",
      "Includes unresolved property relationships",
      breakdown(
        rows,
        classify,
        (id) =>
          w.snapshot.properties.find((p) => p.id === id)?.displayName ??
          "Unknown property",
      ),
    ],
    [
      "Work orders by vendor",
      "All assignment states · verified names only",
      breakdown(
        rows,
        assignmentKey,
        (id) => vendorNames.get(id) ?? "Unknown assignment",
      ),
    ],
    [
      "Owner approval workload",
      "Known active records · explicit approval states",
      approvalBreakdown(rows),
    ],
    [
      "Vendor assignment coverage",
      "Known active records · unknown is separate",
      assignmentBreakdown(rows),
    ],
  ];
  const select = (title: string, records: WorkOrder[]) =>
    setDrill({ title, rows: records });
  const cards = [
    {
      name: "Open maintenance backlog",
      value: stats.open,
      note: "Known active at the report reference",
      rows: rows.filter(isActive),
    },
    {
      name: "Completed work orders",
      value: stats.completed,
      note: "Explicit completed status · current cohort",
      rows: rows.filter((order) => order.status === "completed"),
    },
    {
      name: "Mean completion duration",
      value: stats.mean,
      note: `${stats.durationBasis} · n=${stats.n}`,
      rows: rows.filter((order) => {
        const s = maintenanceStats([order], w.reference, w.rules);
        return s.n > 0;
      }),
    },
    {
      name: "Median completion duration",
      value: stats.median,
      note: stats.mixed
        ? "Mixed precision · see separate cohorts"
        : `${stats.durationBasis} · n=${stats.n}`,
      rows: rows.filter(
        (order) => maintenanceStats([order], w.reference, w.rules).n > 0,
      ),
    },
    {
      name: "Pending owner approvals",
      value: stats.pending,
      note: "Explicit pending on known active",
      rows: rows.filter(
        (order) => isActive(order) && order.approvalState === "pending",
      ),
    },
  ];
  return (
    <>
      <InsightFilters
        name="Analytics"
        snapshot={w.snapshot}
        directory={w.directory}
        compatible={w.vendorCompatible}
        value={filters}
        onChange={setFilters}
      />
      <div className="insight-toolbar">
        <p role="status">
          {rows.length} of {w.snapshot.workOrders.length} work orders · current
          report cohort · {filters.from || "earliest supplied"} to{" "}
          {filters.to || "latest supplied"} · {filters.dateBasis}-date limits
        </p>
        <button
          className="text-button"
          onClick={() => setFilters({ ...emptyInsightFilters })}
        >
          Clear analytics filters
        </button>
      </div>
      <section className="insight-kpis" aria-label="Analytics summary">
        {cards.map((card) => (
          <button
            className="insight-kpi"
            key={card.name}
            onClick={() => select(card.name, card.rows)}
          >
            <span>{card.name}</span>
            <strong className={card.value === null ? "unavailable" : ""}>
              {metricValue(card.value, 1)}
            </strong>
            <small>{card.note}</small>
          </button>
        ))}
      </section>
      <CoverageNote stats={stats} />
      <div className="analytics-grid">
        <Panel
          title="Created vs. completed over time"
          eyebrow="OBSERVED EVENT COUNTS · NO SYNTHETIC HISTORY"
          className="activity-panel"
        >
          <ActivityChart months={activity.months} onSelect={select} />
          <p className="insight-note">
            {activity.excludedCreated} missing/invalid/future creation dates and{" "}
            {activity.excludedCompleted} missing/invalid/future completion dates
            excluded from event series. Counts can differ from explicit status
            totals.
          </p>
        </Panel>
        {charts.map(([title, note, groups]) => (
          <Panel key={title} title={title} eyebrow={note}>
            <BreakdownChart
              title={title}
              groups={groups}
              onSelect={(group) =>
                select(`${title} · ${group.label}`, group.rows)
              }
            />
          </Panel>
        ))}
      </div>
      <Panel
        title="Completion duration evidence"
        eyebrow="VALID PAIRS ONLY · CALENDAR AND ELAPSED COHORTS"
      >
        <DurationEvidence stats={stats} />
      </Panel>
      <PropertyComparison metrics={properties} />
      <VendorComparison metrics={vendors} compatible={w.vendorCompatible} />
      <Panel
        title="Observed backlog history"
        eyebrow="RETAINED COMPARABLE LOADS ONLY"
      >
        {history ? (
          <>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Observed backlog data"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Observed at import</th>
                    <th scope="col">Source report as of</th>
                    <th scope="col">Known active</th>
                    <th scope="col">Unknown status excluded</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((point) => (
                    <tr key={point.loadedAt}>
                      <td>{point.loadedAt}</td>
                      <td>{point.reportAsOf ?? "Unknown"}</td>
                      <td>{point.open}</td>
                      <td>{point.unknown}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="insight-note">
              Only the two retained compatible CSV observations, under the
              current cohort filters. These are actual load observations, not a
              daily historical curve or previous-period performance improvement.
            </p>
          </>
        ) : (
          <p className="empty-inline">
            Unavailable: at least two compatible retained work-order loads with
            valid observation times are required. Current records cannot
            reconstruct historical backlog.
          </p>
        )}
      </Panel>
      <Panel title="Maintenance costs" eyebrow="FUTURE APPROVED SOURCE FIELDS">
        <p className="empty-inline">
          Unavailable: no verified financial dataset or approved cost mapping is
          configured. Work-order cost, invoices, estimates, actual expenses and
          monthly/annual spending are not imported or calculated.
        </p>
      </Panel>
      {drill && (
        <Modal title={drill.title} onClose={() => setDrill(null)}>
          <div className="insight-profile">
            <p>
              {drill.rows.length} supporting records · selected {w.source}{" "}
              report cohort · read-only
            </p>
            {(drill.title === "Mean completion duration" ||
              drill.title === "Median completion duration") && (
              <DurationEvidence stats={stats} />
            )}
            <InsightRecords
              key={drill.title}
              title="Analytics supporting records"
              rows={drill.rows}
              snapshot={w.snapshot}
              rules={w.rules}
              reference={w.reference}
              directory={w.directory}
              compatible={w.vendorCompatible}
              onOpen={(id) => {
                setDrill(null);
                onOpenExplorer(id);
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
