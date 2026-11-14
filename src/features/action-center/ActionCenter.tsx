import { useState, useImperativeHandle } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  ClipboardList,
  Clock3,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { useWorkspace } from "../../data/workspace/context";
import { Panel } from "../../components/ui";
import { MultiFilter } from "../../components/MultiFilter";
import {
  age,
  emptyFilters,
  isActive,
  label,
  selectOrders,
} from "../../domain/rules";
import { sortExplorer, paginate } from "../../domain/explorer";
import type { ExplorerSort } from "../../domain/explorer";
import {
  actionQueue,
  actionKpis,
  actionLabels,
  filterActionQueue,
} from "../../domain/actions";
import type { ActionFocus, ActionItem } from "../../domain/actions";
import type { Filters, Rules, Snapshot } from "../../domain/types";
import { WorkOrderDetails } from "../work-orders/WorkOrderDetails";
import { MessageDraft } from "./MessageDraft";
import type { Ref } from "react";
interface Props {
  ref?: Ref<{ openRecord: (id: string) => void }>;
  demo: Snapshot;
  rules: Rules;
  onOpenExplorer: (id: string) => void;
}
export function ActionCenter({ demo, rules, onOpenExplorer, ref }: Props) {
  const { session, csv, source, selectSource } = useWorkspace();
  const snapshot = source === "csv" && csv ? csv : demo;
  const dataset = snapshot.datasets.find(
      (d) => d.datasetType === "workOrders",
    )!,
    reference = dataset.reportAsOf ?? snapshot.importedAt,
    scopedRules = { ...rules, timezone: dataset.sourceTimezone };
  const [filters, setFilters] = useState<Filters>(emptyFilters),
    [focus, setFocus] = useState<ActionFocus>("all"),
    [approval, setApproval] = useState<string[]>([]),
    [selected, setSelected] = useState<ActionItem | null>(null),
    [sort, setSort] = useState<{
      key: ExplorerSort | "queue";
      direction: 1 | -1;
    }>({ key: "queue", direction: 1 }),
    [requested, setRequested] = useState(1);
  useImperativeHandle(ref, () => ({
    openRecord: (id) => {
      const order = snapshot.workOrders.find((w) => w.id === id);
      if (order)
        setSelected({
          order,
          recommendations:
            actionQueue(
              [order],
              reference,
              scopedRules,
              source === "csv" ? session.observationPair() : null,
            )[0]?.recommendations ?? [],
        });
    },
  }));
  const pair = source === "csv" ? session.observationPair() : null,
    history =
      source === "csv"
        ? session.history()
        : {
            comparable: false,
            reason:
              "No previous comparable demo snapshot. Source maintenance activity history is unavailable.",
            changes: [],
            missing: [],
            newIds: [],
          };
  const rows = selectOrders(snapshot, filters, scopedRules, reference).filter(
    (w) => !approval.length || approval.includes(w.approvalState),
  );
  const items = actionQueue(rows, reference, scopedRules, pair),
    filtered = filterActionQueue(items, focus);
  const order =
    sort.key === "queue"
      ? filtered.map((i) => i.order)
      : sortExplorer(
          filtered.map((i) => i.order),
          sort.key,
          sort.direction,
          snapshot,
          scopedRules,
          reference,
        );
  const sorted =
    sort.key === "queue" && sort.direction === -1
      ? [...order].reverse()
      : order;
  const paged = paginate(sorted, requested, 10);
  const baseKpis = actionKpis(items, scopedRules);
  const active = rows.filter(isActive),
    unknownStatus = rows.filter((w) => w.status === "unknown").length;
  const reset = () => {
    setFilters({ ...emptyFilters });
    setApproval([]);
    setFocus("all");
    setRequested(1);
  };
  const selectFocus = (next: ActionFocus) => {
    setFocus(next);
    setRequested(1);
  };
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setRequested(1);
  };
  const options = (values: string[]) =>
    values.map((value) => ({ value, label: label(value) }));
  const briefings = [
    { title: "Urgent review", reason: "urgent" as const, icon: ShieldCheck },
    {
      title: "Owner approvals",
      reason: "pending" as const,
      icon: ClipboardList,
    },
    {
      title: "Vendor coordination",
      reason: "unassigned" as const,
      icon: Users,
    },
    { title: "Aging maintenance", reason: "aged" as const, icon: Clock3 },
    {
      title: "Other follow-ups",
      reason: "no_change" as const,
      icon: ArrowRight,
    },
  ];
  return (
    <div className="action-center">
      <section className="source-bar" aria-label="Action Center data source">
        <div>
          <strong>
            {source === "demo"
              ? "Fictional demo"
              : "CSV evaluation · session only"}
          </strong>
          <p>
            Same selected source as Work Order Explorer · no demo/CSV mixing
          </p>
        </div>
        <label>
          Action data source
          <select
            value={source}
            onChange={(e) => {
              selectSource(e.target.value as "demo" | "csv");
              reset();
            }}
          >
            <option value="demo">Fictional demo</option>
            <option value="csv" disabled={!csv}>
              CSV session{" "}
              {csv ? `(${csv.workOrders.length} records)` : "(not loaded)"}
            </option>
          </select>
        </label>
      </section>
      <p className="action-provenance">
        {dataset.reportAsOf
          ? `Report as of ${reference}`
          : `Report time Unknown · age uses load time ${reference}`}{" "}
        · {scopedRules.timezone} · proposed rules {rules.rulesVersion}
      </p>
      <section className="filter-panel" aria-label="Action filters">
        <div className="filter-top">
          <label className="search-box">
            <span className="sr-only">Search action work orders</span>
            <input
              value={filters.query}
              placeholder="Find a work order, issue or property…"
              onChange={(e) => update("query", e.target.value)}
            />
          </label>
          <button className="text-button" onClick={reset}>
            Clear action filters
          </button>
        </div>
        <div className="filter-controls">
          <MultiFilter
            name="Property"
            options={[
              ...snapshot.properties.map((p) => ({
                value: p.id,
                label: p.displayName,
              })),
              { value: "unknown", label: "Unknown property" },
            ]}
            value={filters.property}
            onChange={(v) => update("property", v)}
          />
          <MultiFilter
            name="Status"
            options={options([
              "open",
              "in_progress",
              "on_hold",
              "completed",
              "cancelled",
              "unknown",
            ])}
            value={filters.status}
            onChange={(v) => update("status", v)}
          />
          <MultiFilter
            name="Vendor"
            options={[
              ...Array.from(
                new Set(
                  snapshot.workOrders
                    .map((w) => w.vendorId)
                    .filter((id): id is string => !!id),
                ),
              ).map((id) => ({
                value: id,
                label:
                  snapshot.vendors.find((v) => v.id === id)?.displayName ??
                  `Unresolved ID: ${id}`,
              })),
              { value: "unassigned", label: "Explicitly unassigned" },
              { value: "unknown", label: "Unknown assignment" },
            ]}
            value={filters.vendor}
            onChange={(v) => update("vendor", v)}
          />
          <MultiFilter
            name="Priority"
            options={options(["urgent", "high", "normal", "low", "unknown"])}
            value={filters.priority}
            onChange={(v) => update("priority", v)}
          />
          <MultiFilter
            name="Owner approval"
            options={options([
              "pending",
              "approved",
              "not_required",
              "unknown",
            ])}
            value={approval}
            onChange={(v) => {
              setApproval(v);
              setRequested(1);
            }}
          />
          <MultiFilter
            name="Category"
            options={[
              ...snapshot.categories.map((c) => ({
                value: c.id,
                label: c.label,
              })),
              { value: "unknown", label: "Unknown category" },
            ]}
            value={filters.category}
            onChange={(v) => update("category", v)}
          />
        </div>
        <p className="filter-result" role="status">
          {filtered.length} eligible action items · {rows.length} scoped /{" "}
          {snapshot.workOrders.length} source records ·{" "}
          {source === "demo" ? "fictional demo" : "CSV session"}
        </p>
        {focus !== "all" && (
          <div className="kpi-filter-chip">
            <span>
              Queue:{" "}
              {focus === "scheduled"
                ? "Scheduled review unavailable"
                : actionLabels[focus]}
            </span>
            <button className="text-button" onClick={() => selectFocus("all")}>
              Reset action queue
            </button>
          </div>
        )}
      </section>
      <section className="action-kpis" aria-label="Action Center summary">
        {baseKpis.map((k, i) => (
          <button
            className={`action-kpi tone-${i}`}
            key={k.key}
            aria-pressed={focus === k.key}
            aria-controls="action-register"
            onClick={() => selectFocus(k.key)}
          >
            <span>{k.title}</span>
            <strong className={k.value === null ? "unavailable" : ""}>
              {k.value ?? "Unavailable"}
            </strong>
            <small>{k.criterion}</small>
          </button>
        ))}
      </section>
      <Panel
        title="Morning Briefing"
        className="action-morning"
        action={
          <span className="chart-tag">
            <Sun size={14} /> Rules-based · current scope
          </span>
        }
      >
        <div className="morning-groups">
          {briefings.map(({ title, reason, icon: Icon }) => {
            const count = items.filter((i) =>
              i.recommendations.some((r) => r.key === reason),
            ).length;
            return (
              <button
                key={reason}
                onClick={() => selectFocus(reason)}
                aria-label={`${title}: ${reason === "no_change" && !pair ? "Unavailable" : count}`}
              >
                <Icon size={17} />
                <span>{title}</span>
                <strong>
                  {reason === "no_change" && !pair ? "Unavailable" : count}
                </strong>
                <small>
                  {reason === "no_change"
                    ? `Requires comparable observations spanning ${rules.noObservedChangeDays} elapsed days`
                    : "Review the exact supporting work orders"}
                </small>
              </button>
            );
          })}
        </div>
        <p className="chart-foot">
          Counts overlap when a work order has multiple reasons. The queue
          deduplicates by stable ID. Source facts and staff recommendations are
          labeled separately.
        </p>
      </Panel>
      <div id="action-register">
        <Panel
          title="Priority follow-up queue"
          action={
            <span className="chart-tag">{filtered.length} unique records</span>
          }
        >
          <p className="chart-description">
            Default priority:{" "}
            {rules.queueReasonOrder.map((r) => actionLabels[r]).join(" → ")} →
            observed unchanged. Within a reason: known age descending, stable
            ID. No emergency classification or source change is made.
          </p>
          <div className="action-sort">
            <label>
              Sort action queue
              <select
                value={sort.key}
                onChange={(e) => {
                  setSort({
                    key: e.target.value as ExplorerSort | "queue",
                    direction: 1,
                  });
                  setRequested(1);
                }}
              >
                <option value="queue">Configured follow-up priority</option>
                {[
                  ["number", "Work order"],
                  ["property", "Property"],
                  ["summary", "Description"],
                  ["status", "Status"],
                  ["vendor", "Vendor"],
                  ["age", "Age"],
                  ["approval", "Approval"],
                  ["priority", "Source priority"],
                ].map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="outline-button"
              aria-label={
                sort.direction === 1
                  ? "Reverse action sort"
                  : "Restore ascending action sort"
              }
              onClick={() => {
                setSort((v) => ({
                  ...v,
                  direction: v.direction === 1 ? -1 : 1,
                }));
                setRequested(1);
              }}
            >
              <ArrowDownUp size={15} />
            </button>
          </div>
          {paged.rows.length ? (
            <div
              className="table-scroll action-table"
              role="region"
              aria-label="Action priority queue"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Work order / property</th>
                    <th>Description / status</th>
                    <th>Assigned vendor</th>
                    <th>Age / approval / priority</th>
                    <th>Reason for follow-up</th>
                    <th>Recommended next action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((w) => {
                    const item = filtered.find((i) => i.order.id === w.id)!;
                    const vendor = snapshot.vendors.find(
                      (v) => v.id === w.vendorId,
                    );
                    return (
                      <tr key={w.id}>
                        <td>
                          <button
                            className="record-link"
                            onClick={() => setSelected(item)}
                          >
                            {w.number}
                            <ArrowRight size={12} />
                          </button>
                          <small className="cell-secondary">
                            {snapshot.properties.find(
                              (p) => p.id === w.propertyId,
                            )?.displayName ?? "Unknown property"}
                          </small>
                        </td>
                        <td>
                          {w.summaryRedacted ?? "Unavailable description"}
                          <div>
                            <span className={`badge ${w.status}`}>
                              {label(w.status)}
                            </span>
                          </div>
                        </td>
                        <td>
                          {w.vendorAssignmentState === "unassigned"
                            ? "Explicitly unassigned"
                            : w.vendorAssignmentState === "unknown"
                              ? "Unknown assignment"
                              : (vendor?.displayName ??
                                "Unresolved source vendor ID")}
                        </td>
                        <td>
                          <strong>
                            {age(w, reference, scopedRules) === null
                              ? "Unknown"
                              : `${age(w, reference, scopedRules)} days`}
                          </strong>
                          <span className={`approval ${w.approvalState}`}>
                            {label(w.approvalState)}
                          </span>
                          <small className="cell-secondary">
                            Source priority: {label(w.priority)}
                          </small>
                        </td>
                        <td>
                          {item.recommendations.map((r) => (
                            <span
                              className={`reason-tag reason-${r.key}`}
                              key={r.key}
                            >
                              {r.title}
                            </span>
                          ))}
                        </td>
                        <td>
                          <p className="recommendation-line">
                            {item.recommendations[0].recommendation}
                          </p>
                          <button
                            className="next-action"
                            onClick={() => setSelected(item)}
                          >
                            Draft Follow-up
                          </button>
                          <button
                            className="text-button"
                            onClick={() => onOpenExplorer(w.id)}
                          >
                            Open in Explorer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <h3>
                {focus === "scheduled"
                  ? "Scheduled review unavailable"
                  : "No eligible follow-ups in this scope"}
              </h3>
              <p>
                {focus === "scheduled"
                  ? "No verified appointment dates or completion/visit states are supplied. This cannot be calculated from work-order age."
                  : "Adjust the filters or inspect the coverage notes. Unknown information never creates a follow-up."}
              </p>
              <button className="text-button" onClick={reset}>
                Reset Action Center scope
              </button>
            </div>
          )}
          <div className="pagination">
            <span>
              {filtered.length
                ? `${(paged.page - 1) * 10 + 1}–${Math.min(paged.page * 10, filtered.length)}`
                : "0"}{" "}
              of {filtered.length}
            </span>
            <button
              disabled={paged.page === 1}
              onClick={() => setRequested(paged.page - 1)}
            >
              Previous action page
            </button>
            <span>
              Page {paged.page} of {paged.pages}
            </span>
            <button
              disabled={paged.page === paged.pages}
              onClick={() => setRequested(paged.page + 1)}
            >
              Next action page
            </button>
          </div>
        </Panel>
      </div>
      <details className="action-coverage">
        <summary>Eligibility, data health & unavailable capabilities</summary>
        <ul>
          <li>
            {unknownStatus} unknown-status records excluded from active
            follow-ups.
          </li>
          <li>
            {
              active.filter((w) => age(w, reference, scopedRules) === null)
                .length
            }{" "}
            active records have unknown age;{" "}
            {active.filter((w) => w.vendorAssignmentState === "unknown").length}{" "}
            have unknown assignment;{" "}
            {active.filter((w) => w.approvalState === "unknown").length} have
            unknown approval.
          </li>
          <li>
            Scheduled reviews: unavailable; appointment fields are not supplied.
          </li>
          <li>
            Awaiting updates:{" "}
            {pair
              ? "evaluated only for eligible comparable, unchanged known fields"
              : "unavailable without a previous comparable snapshot"}
            . The configured interval is {rules.noObservedChangeDays} elapsed
            days. A source-updated timestamp is not proof of inactivity.
          </li>
          <li>{history.reason}</li>
        </ul>
        {snapshot.qualitySummary.map((v, i) => (
          <p key={i}>{v.safeMessage}</p>
        ))}
      </details>
      {selected && (
        <WorkOrderDetails
          order={selected.order}
          snapshot={snapshot}
          rules={scopedRules}
          reference={reference}
          history={history}
          onClose={() => setSelected(null)}
        >
          <div className="action-evidence">
            <h3>Facts & recommended follow-ups</h3>
            {selected.recommendations.map((r) => (
              <section key={r.key}>
                <h4>{r.title}</h4>
                <p>
                  <strong>Source / observed fact:</strong> {r.fact}
                </p>
                <p>
                  <strong>Recommendation:</strong> {r.recommendation}
                </p>
              </section>
            ))}
            <button
              className="outline-button"
              onClick={() => {
                setSelected(null);
                onOpenExplorer(selected.order.id);
              }}
            >
              Open corresponding work order in Explorer
            </button>
          </div>
          <MessageDraft
            key={selected.order.id}
            order={selected.order}
            snapshot={snapshot}
          />
        </WorkOrderDetails>
      )}
    </div>
  );
}
