import {
  StatusDonut,
  PortfolioPanels,
  AssistantPanel,
} from "./ReferencePanels";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  Clock3,
  ShieldCheck,
  Sun,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Panel } from "../../components/ui";
import { RecordTable } from "../../components/RecordTable";
import {
  age,
  bucket,
  bucketLabels,
  completionStats,
  dateKey,
  isActive,
  label,
  matchesReason,
  reasons,
  sortQueue,
} from "../../domain/rules";
import { reasonNames } from "../../domain/labels";
import type { Reason, Rules, Snapshot, WorkOrder } from "../../domain/types";
import type { DataHealth } from "../../data/repository";
interface Props {
  snapshot: Snapshot;
  rows: WorkOrder[];
  rules: Rules;
  reference: string;
  health: DataHealth;
  setDrill: (d: { title: string; rows: WorkOrder[] }) => void;
  setSelected: (w: WorkOrder) => void;
  setHealthOpen: (open: boolean) => void;
}
export function Overview({
  snapshot,
  rows,
  rules,
  reference,
  health,
  setDrill,
  setSelected,
  setHealthOpen,
}: Props) {
  const active = rows.filter(isActive),
    queue = sortQueue(
      rows.filter((w) => reasons(w, reference, rules).length > 0),
      reference,
      rules,
    );
  const counts = (reason: Reason) =>
    rows.filter((w) => matchesReason(w, reason, reference, rules));
  const unknownAge = active.filter(
    (w) => age(w, reference, rules) === null,
  ).length;
  const unknownStatus = rows.filter((w) => w.status === "unknown").length;
  const durations = completionStats(rows, rules.timezone);
  const openReason = (r: Reason) =>
    setDrill({
      title: reasonNames[r],
      rows: sortQueue(counts(r), reference, rules),
    });
  const kpis: {
    title: string;
    reason: Reason;
    icon: LucideIcon;
    note: string;
    tone: string;
  }[] = [
    {
      title: "Known active backlog",
      reason: "active",
      icon: ClipboardList,
      note: `${unknownStatus} unknown status excluded`,
      tone: "blue",
    },
    {
      title: "Aging follow-ups",
      reason: "aged",
      icon: Clock3,
      note: `Over ${rules.agingNudgeDays} days · ${unknownAge} age unknown`,
      tone: "amber",
    },
    {
      title: "Pending approvals",
      reason: "pending",
      icon: ShieldCheck,
      note: "Explicit pending state · known active",
      tone: "violet",
    },
    {
      title: "Source urgent",
      reason: "urgent",
      icon: Activity,
      note: "Source priority · known active",
      tone: "red",
    },
    {
      title: "Observed completions",
      reason: "completed",
      icon: Check,
      note: "Explicit completed status · all dates",
      tone: "green",
    },
  ];
  const months = Array.from(
    new Set(
      rows
        .flatMap((w) => [
          dateKey(w.createdAt, rules.timezone)?.slice(0, 7),
          w.status === "completed"
            ? dateKey(w.completedAt, rules.timezone)?.slice(0, 7)
            : null,
        ])
        .filter((v): v is string => !!v),
    ),
  ).sort();
  const trends = months.map((month) => ({
    month,
    created: rows.filter((w) =>
      dateKey(w.createdAt, rules.timezone)?.startsWith(month),
    ),
    completed: rows.filter(
      (w) =>
        w.status === "completed" &&
        dateKey(w.completedAt, rules.timezone)?.startsWith(month),
    ),
  }));
  const trendMax = Math.max(
    1,
    ...trends.flatMap((t) => [t.created.length, t.completed.length]),
  );
  return (
    <div className="overview-layout">
      <div className="dashboard-main">
        <section className="briefing">
          <div className="briefing-intro">
            <div className="sun-icon">
              <Sun size={22} />
            </div>
            <div>
              <p className="eyebrow">A LITTLE FOCUS FOR YOUR DAY</p>
              <h2>
                Action Center{" "}
                <span className="briefing-subtitle">Morning Briefing</span>
              </h2>
              <p>
                {queue.length} unique work orders have eligible follow-ups in
                this scope.
              </p>
            </div>
          </div>
          <div className="briefing-items">
            {(["aged", "unassigned", "pending"] as Reason[]).map((reason) => (
              <button key={reason} onClick={() => openReason(reason)}>
                <span className={`briefing-number ${reason}`}>
                  {counts(reason).length}
                </span>
                <span>
                  {reason === "aged"
                    ? `Active over ${rules.agingNudgeDays} days`
                    : reason === "unassigned"
                      ? "Need vendor assignment"
                      : "Awaiting approval"}
                  <small>
                    {reason === "aged"
                      ? `${unknownAge} active age unknown`
                      : reason === "unassigned"
                        ? `${active.filter((w) => w.vendorAssignmentState === "unknown").length} active assignment unknown`
                        : `${active.filter((w) => w.approvalState === "unknown").length} active approval unknown`}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <div className="briefing-foot">
            <span>
              <Clock3 size={13} />
              Rules-based guidance · proposed thresholds
            </span>
            <span>Comparison unavailable — first snapshot</span>
            <button onClick={() => setHealthOpen(true)}>
              {health.issues.length} data-health notices{" "}
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
        <section className="kpi-grid" aria-label="Key performance indicators">
          {kpis.map(({ title, reason, icon: Icon, note, tone }) => (
            <button
              className="kpi-card"
              onClick={() => openReason(reason)}
              key={reason}
            >
              <div className="kpi-top">
                <span>{title}</span>
                <span className={`kpi-icon ${tone}`}>
                  <Icon size={18} />
                </span>
              </div>
              <div className="kpi-value">
                {counts(reason).length}
                <ArrowUpRight size={18} />
              </div>
              <span className="kpi-note">{note}</span>
              <span className="kpi-scope">
                {reason === "active" || reason === "completed"
                  ? `${rows.length} scoped records`
                  : `${active.length} known active records`}{" "}
                · report-as-of basis
              </span>
            </button>
          ))}
        </section>
        <StatusDonut rows={rows} setDrill={setDrill} />
        <PortfolioPanels
          rows={rows}
          snapshot={snapshot}
          rules={rules}
          reference={reference}
          setDrill={setDrill}
        />
        <div className="charts-grid">
          <Panel
            title="Maintenance trend"
            eyebrow="CREATED & COMPLETED"
            action={<span className="chart-tag">By calendar month</span>}
          >
            <p className="chart-description">
              Observed records in the current scope. This is not a historical
              backlog curve.
            </p>
            <div className="chart-legend">
              <span>
                <i className="legend-dot blue" />
                Created
              </span>
              <span>
                <i className="legend-dot teal" />
                Completed
              </span>
              <span>Click a bar to view records</span>
            </div>
            <div className="trend-chart">
              {trends.length ? (
                trends.map((t) => (
                  <div className="month-group" key={t.month}>
                    <div className="bar-pair">
                      {(["created", "completed"] as const).map((kind) => (
                        <button
                          key={kind}
                          className={`trend-bar ${kind}`}
                          style={{
                            height: `${Math.max(3, (t[kind].length / trendMax) * 100)}%`,
                          }}
                          onClick={() =>
                            setDrill({
                              title: `${label(kind)} · ${t.month}`,
                              rows: t[kind],
                            })
                          }
                          aria-label={`${label(kind)} ${t.month}: ${t[kind].length} work orders`}
                        >
                          <span>{t[kind].length}</span>
                        </button>
                      ))}
                    </div>
                    <span>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(new Date(t.month + "-01T12:00:00Z"))}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted">No eligible records for dated activity.</p>
              )}
            </div>
            <details className="chart-table">
              <summary>View activity data table</summary>
              <table>
                <caption>Monthly counts · {rules.timezone}</caption>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Created</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((t) => (
                    <tr key={t.month}>
                      <th>{t.month}</th>
                      <td>{t.created.length}</td>
                      <td>{t.completed.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <p className="chart-foot">
              {rows.filter((w) => !dateKey(w.createdAt, rules.timezone)).length}{" "}
              unknown/invalid creation dates excluded ·{" "}
              {
                counts("completed").filter(
                  (w) => !dateKey(w.completedAt, rules.timezone),
                ).length
              }{" "}
              completion dates excluded. Date filters use creation dates.
            </p>
          </Panel>
          <Panel
            title="Active backlog age"
            eyebrow="WHAT NEEDS A CLOSER LOOK"
            action={<Clock3 size={18} className="muted" />}
          >
            <div className="aging-total">
              <strong>{active.length}</strong>
              <span>
                known active work orders
                <small>Age at the fixed report time</small>
              </span>
            </div>
            <div className="aging-bars">
              {bucketLabels(rules).map((b, i) => {
                const supporting = active.filter(
                  (w) => bucket(w, reference, rules) === b,
                );
                return (
                  <button
                    className={`aging-row age-${i}`}
                    key={b}
                    onClick={() =>
                      setDrill({
                        title: `Active age · ${b}${i === 4 ? "" : " days"}`,
                        rows: sortQueue(supporting, reference, rules),
                      })
                    }
                  >
                    <span>
                      {b}
                      {i === 4 ? "" : " days"}
                    </span>
                    <span className="aging-track">
                      <span
                        style={{
                          width: `${active.length ? (supporting.length / active.length) * 100 : 0}%`,
                        }}
                      />
                    </span>
                    <strong>{supporting.length}</strong>
                    <ArrowUpRight size={13} />
                  </button>
                );
              })}
            </div>
            <p className="chart-foot">
              {active.length - unknownAge} eligible ages · {unknownAge} unknown
              · calendar-day basis. Terminal and unknown-status records
              excluded.
            </p>
          </Panel>
        </div>
        <div className="lower-grid">
          <Panel
            title="Scoped work orders"
            eyebrow="NEXT UP"
            action={
              <span className="chart-tag">{rows.length} scoped records</span>
            }
          >
            <p className="chart-description">
              {rules.queueReasonOrder
                .map((reason) => reasonNames[reason])
                .join(" → ")}
              ; then age descending and stable ID. Viewing never changes source
              records.
            </p>
            <RecordTable
              rows={rows}
              snapshot={snapshot}
              rules={rules}
              reference={reference}
              onSelect={setSelected}
            />
            <div className="panel-footer">
              <span>
                Showing {rows.length} scoped records · {queue.length} eligible
                follow-ups
              </span>
              <button
                className="text-button"
                onClick={() =>
                  setDrill({
                    title: "All priority follow-ups",
                    rows: queue,
                  })
                }
              >
                View all follow-ups <ArrowRight size={14} />
              </button>
            </div>
          </Panel>
          <Panel title="Category mix" eyebrow="SCOPED WORK ORDERS">
            <p className="chart-description">
              All statuses · {rows.length} records
            </p>
            <div className="category-list">
              {[
                ...snapshot.categories,
                { id: "unknown", label: "Unknown category" },
              ].map((c) => {
                const subset = rows.filter(
                  (w) => (w.categoryId ?? "unknown") === c.id,
                );
                return (
                  <button
                    key={c.id}
                    className="category-row"
                    onClick={() =>
                      setDrill({
                        title: `Category · ${c.label}`,
                        rows: subset,
                      })
                    }
                  >
                    <span className="category-icon">
                      <Wrench size={15} />
                    </span>
                    <span>
                      {c.label}
                      <span className="category-track">
                        <i
                          style={{
                            width: `${rows.length ? (subset.length / rows.length) * 100 : 0}%`,
                          }}
                        />
                      </span>
                    </span>
                    <strong>{subset.length}</strong>
                    <ArrowUpRight size={13} />
                  </button>
                );
              })}
            </div>
            <div className="duration-note">
              <Check size={16} />
              <div>
                <strong>Observed completion duration</strong>
                <p>
                  {durations.date.n
                    ? `Mean ${durations.date.mean!.toFixed(1)} / median ${durations.date.median!.toFixed(1)} calendar days · n=${durations.date.n}`
                    : "No eligible date-only pairs"}
                </p>
                <p>
                  {durations.instant.n
                    ? `Mean ${durations.instant.mean!.toFixed(1)} / median ${durations.instant.median!.toFixed(1)} elapsed days · n=${durations.instant.n}`
                    : "No eligible timestamp pairs"}
                </p>
                <small>
                  {durations.excluded} missing, inverted, or mixed-precision
                  pairs excluded.
                </small>
              </div>
            </div>
          </Panel>
        </div>
      </div>
      <AssistantPanel
        rows={rows}
        rules={rules}
        reference={reference}
        setDrill={setDrill}
        onHealth={() => setHealthOpen(true)}
      />
    </div>
  );
}
