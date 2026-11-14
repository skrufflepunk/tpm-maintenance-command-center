import {
  Bot,
  Clock3,
  ExternalLink,
  FileUp,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { Panel } from "../../components/ui";
import { isActive, label, matchesReason } from "../../domain/rules";
import type { Rules, Snapshot, Status, WorkOrder } from "../../domain/types";
type Drill = (d: { title: string; rows: WorkOrder[] }) => void;
interface Props {
  rows: WorkOrder[];
  snapshot: Snapshot;
  rules: Rules;
  reference: string;
  setDrill: Drill;
}
const statuses: Status[] = [
  "open",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
  "unknown",
];
const colors = [
  "#082b60",
  "#0780ed",
  "#e9ad28",
  "#239479",
  "#768395",
  "#ac6a98",
];
export function StatusDonut({
  rows,
  setDrill,
}: Pick<Props, "rows" | "setDrill">) {
  const groups = statuses.map((status, i) => ({
    status,
    count: rows.filter((w) => w.status === status).length,
    color: colors[i],
  }));
  let end = 0;
  const gradient = groups
    .map((g) => {
      const start = end;
      end += rows.length ? (g.count / rows.length) * 100 : 0;
      return `${g.color} ${start}% ${end}%`;
    })
    .join(",");
  return (
    <Panel title="Work orders by status" className="status-panel">
      <div className="donut-layout">
        <div
          className="donut"
          style={{
            background: rows.length ? `conic-gradient(${gradient})` : "#e6ebf1",
          }}
          role="img"
          aria-label={`${rows.length} scoped work orders; status counts listed alongside`}
        >
          <div>
            <strong>{rows.length}</strong>
            <span>In scope</span>
          </div>
        </div>
        <div className="status-legend">
          {groups.map((g) => (
            <button
              key={g.status}
              onClick={() =>
                setDrill({
                  title: `Status · ${label(g.status)}`,
                  rows: rows.filter((w) => w.status === g.status),
                })
              }
            >
              <i style={{ background: g.color }} />
              <span>{label(g.status)}</span>
              <strong>{g.count}</strong>
            </button>
          ))}
        </div>
      </div>
      <p className="chart-foot">All statuses · unknown is shown separately.</p>
    </Panel>
  );
}
export function PortfolioPanels({
  rows,
  snapshot,
  rules,
  reference,
  setDrill,
}: Props) {
  return (
    <>
      <Panel title="Vendor performance" className="vendor-panel">
        <p className="chart-description">
          Observed workload · not a quality ranking
        </p>
        <table className="mini-table">
          <thead>
            <tr>
              <th>Fictional vendor</th>
              <th>Active</th>
              <th>On-time</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.vendors.map((v) => {
              const subset = rows.filter(
                (w) =>
                  w.vendorId === v.id &&
                  w.vendorAssignmentState === "assigned" &&
                  isActive(w),
              );
              return (
                <tr key={v.id}>
                  <td>
                    <button
                      className="record-link"
                      onClick={() =>
                        setDrill({ title: v.displayName, rows: subset })
                      }
                    >
                      {v.displayName}
                    </button>
                  </td>
                  <td>{subset.length}</td>
                  <td>Unavailable</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="chart-foot">
          Ratings, deadlines and on-time performance are not supplied. Unmatched
          or unknown assignments are not inferred.
        </p>
      </Panel>
      <Panel title="Property heatmap" className="heatmap-panel">
        <p className="chart-description">
          Known active work · current filter scope
        </p>
        <table className="mini-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Active</th>
              <th>Over {rules.agingNudgeDays}d</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...snapshot.properties,
              { id: "unknown", displayName: "Unknown property" },
            ].map((p) => {
              const subset = rows.filter(
                (w) => (w.propertyId ?? "unknown") === p.id,
              );
              const active = subset.filter(isActive);
              const aged = active.filter((w) =>
                matchesReason(w, "aged", reference, rules),
              );
              return (
                <tr key={p.id}>
                  <td>
                    <button
                      className="record-link"
                      onClick={() =>
                        setDrill({ title: p.displayName, rows: subset })
                      }
                    >
                      {p.displayName}
                    </button>
                  </td>
                  {[active.length, aged.length, subset.length].map((n, i) => (
                    <td
                      key={i}
                      style={{
                        background: `rgba(19,118,230,${Math.min(0.32, n * 0.045)})`,
                      }}
                    >
                      {n}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="chart-foot">
          Darker blue = more records. Counts, not risk scores.
        </p>
      </Panel>
    </>
  );
}
export function AssistantPanel({
  rows,
  rules,
  reference,
  setDrill,
  onHealth,
}: Pick<Props, "rows" | "rules" | "reference" | "setDrill"> & {
  onHealth: () => void;
}) {
  const aged = rows.filter((w) => matchesReason(w, "aged", reference, rules));
  const pending = rows.filter((w) =>
    matchesReason(w, "pending", reference, rules),
  );
  return (
    <aside className="insights-rail" aria-label="Assistant and insights">
      <section className="assistant-card">
        <div className="assistant-title">
          <Bot size={30} />
          <div>
            <h2>TPM Assistant</h2>
            <span>Rules-based · AI coming soon</span>
          </div>
        </div>
        <div className="insight-section">
          <h3>
            <Sparkles size={17} />
            Snapshot insights
          </h3>
          <p className="rail-caption">Rule-based counts, not AI responses</p>
          <button
            onClick={() => setDrill({ title: "Aging follow-ups", rows: aged })}
          >
            <Clock3 size={15} />
            <span>
              <strong>{aged.length}</strong> active over {rules.agingNudgeDays}{" "}
              days
            </span>
          </button>
          <button
            onClick={() =>
              setDrill({ title: "Pending approvals", rows: pending })
            }
          >
            <ShieldCheck size={15} />
            <span>
              <strong>{pending.length}</strong> confirmed pending approvals
            </span>
          </button>
          <p className="rail-empty">
            No comparable history. Stalled work and changes cannot be
            determined.
          </p>
          <button disabled className="future-primary">
            <Bot size={16} />
            AI follow-ups · Coming soon
          </button>
          <p className="rail-caption">No AI connected. No messages are sent.</p>
        </div>
      </section>
      <section className="assistant-card quick-actions">
        <h3>
          <Zap size={19} />
          Quick Actions
        </h3>
        <button onClick={onHealth}>
          <ShieldCheck size={16} />
          Inspect data health
        </button>
        <button
          onClick={() => setDrill({ title: "All scoped work orders", rows })}
        >
          <Wrench size={16} />
          Review scoped work orders
        </button>
        <button disabled>
          <ExternalLink size={16} />
          Open Rentvine <small>Not configured</small>
        </button>
        <button
          onClick={() => {
            location.hash = "Work Orders";
          }}
        >
          <FileUp size={16} />
          Preview CSV in Explorer
        </button>
      </section>
      <section className="assistant-card recent-activity">
        <h3>
          <Clock3 size={18} />
          Recent Activity
        </h3>
        <div className="activity-empty">
          <Clock3 size={25} />
          <strong>No activity history</strong>
          <p>
            This fixed fictional snapshot has no event log. Completion dates are
            not an activity feed.
          </p>
        </div>
      </section>
      <p className="rail-caption">Read-only workspace · fictional data only</p>
    </aside>
  );
}
