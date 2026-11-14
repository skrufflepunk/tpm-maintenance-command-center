import { useState } from "react";
import { ArrowDownUp, ArrowRight, FileUp, ShieldCheck } from "lucide-react";
import { MultiFilter } from "../../components/MultiFilter";
import { Modal, Panel } from "../../components/ui";
import { CsvSession } from "../../data/csvSession";
import {
  age,
  bucketLabels,
  emptyFilters,
  isActive,
  label,
  matchesReason,
  reasons,
  selectOrders,
} from "../../domain/rules";
import { paginate, sortExplorer } from "../../domain/explorer";
import type { ExplorerSort } from "../../domain/explorer";
import { reasonNames } from "../../domain/labels";
import type { Filters, Rules, Snapshot, WorkOrder } from "../../domain/types";
import { CsvImport } from "./CsvImport";
import { WorkOrderDetails } from "./WorkOrderDetails";
export function WorkOrderExplorer({
  demo,
  rules,
  onSourceChange,
}: {
  demo: Snapshot;
  rules: Rules;
  onSourceChange: (source: "demo" | "csv") => void;
}) {
  const [session] = useState(() => new CsvSession()),
    [csv, setCsv] = useState<Snapshot | null>(null),
    [source, setSource] = useState<"demo" | "csv">("demo");
  const [filters, setFilters] = useState<Filters>(emptyFilters),
    [approval, setApproval] = useState<string[]>([]),
    [requested, setRequested] = useState(1),
    [size, setSize] = useState(10),
    [sort, setSort] = useState<{ key: ExplorerSort; direction: 1 | -1 }>({
      key: "number",
      direction: 1,
    });
  const [selected, setSelected] = useState<WorkOrder | null>(null),
    [importOpen, setImportOpen] = useState(false),
    [healthOpen, setHealthOpen] = useState(false);
  const snapshot = source === "csv" && csv ? csv : demo;
  const dataset = snapshot.datasets.find(
    (d) => d.datasetType === "workOrders",
  )!;
  const reference = dataset.reportAsOf ?? snapshot.importedAt;
  const scopedRules = { ...rules, timezone: dataset.sourceTimezone };
  const filtered = selectOrders(
    snapshot,
    filters,
    scopedRules,
    reference,
  ).filter((w) => !approval.length || approval.includes(w.approvalState));
  const sorted = sortExplorer(
      filtered,
      sort.key,
      sort.direction,
      snapshot,
      scopedRules,
      reference,
    ),
    page = paginate(sorted, requested, size);
  const active = filtered.filter(isActive);
  const history =
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
  const reset = () => {
    setFilters({ ...emptyFilters });
    setApproval([]);
    setRequested(1);
  };
  const switchSource = (next: "demo" | "csv") => {
    setSource(next);
    onSourceChange(next);
    reset();
    setSelected(null);
  };
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setRequested(1);
  };
  const makeOptions = (items: string[]) =>
    items.map((value) => ({ value, label: label(value) }));
  const count = (reason: "aged" | "pending" | "unassigned") =>
    active.filter((w) => matchesReason(w, reason, reference, scopedRules))
      .length;
  const headings: { key: ExplorerSort; title: string }[] = [
    { key: "number", title: "Work order" },
    { key: "property", title: "Property" },
    { key: "summary", title: "Issue description" },
    { key: "status", title: "Status" },
    { key: "vendor", title: "Vendor assignment" },
    { key: "created", title: "Created" },
    { key: "age", title: "Active age" },
    { key: "approval", title: "Owner approval" },
    { key: "priority", title: "Priority" },
    { key: "category", title: "Category" },
  ];
  const sources =
    source === "demo" ? "Fictional demo" : "CSV evaluation · session only";
  return (
    <div className="explorer">
      <div className="explorer-heading">
        <div>
          <p className="eyebrow">PHASE 2 · READ-ONLY WORKSPACE</p>
          <h2>Work Order Explorer</h2>
          <p>
            Search, prioritize and inspect the evidence behind each follow-up.
          </p>
        </div>
        <div className="explorer-actions">
          <button
            className="outline-button"
            onClick={() => setHealthOpen(true)}
          >
            <ShieldCheck size={16} />
            Explorer data health
          </button>
          <button className="primary" onClick={() => setImportOpen(true)}>
            <FileUp size={16} />
            Import CSV
          </button>
        </div>
      </div>
      <section className="source-bar" aria-label="Explorer data source">
        <div>
          <strong>{sources}</strong>
          <p>
            {source === "demo"
              ? "Synthetic records only."
              : "Isolated evaluation data. No demo records, persistence or server uploads."}
          </p>
        </div>
        <label>
          Current data source
          <select
            value={source}
            onChange={(e) => switchSource(e.target.value as "demo" | "csv")}
          >
            <option value="demo">Fictional demo</option>
            <option value="csv" disabled={!csv}>
              CSV session{" "}
              {csv ? `(${csv.workOrders.length} records)` : "(not loaded)"}
            </option>
          </select>
        </label>
        {csv && (
          <button
            className="text-button"
            onClick={() => {
              session.clear();
              setCsv(null);
              switchSource("demo");
            }}
          >
            Clear CSV session
          </button>
        )}
      </section>
      <div className="explorer-provenance">
        <span>
          {dataset.reportAsOf
            ? `Report as of ${dataset.reportAsOf}`
            : `Report time Unknown · age uses load-time fallback ${snapshot.importedAt}`}
        </span>
        <span>{dataset.sourceTimezone}</span>
        <span>{dataset.reportScope.description}</span>
      </div>
      <section className="filter-panel" aria-label="Explorer filters">
        <div className="filter-top">
          <label className="search-box">
            <span className="sr-only">Search Explorer work orders</span>
            <input
              placeholder="Search number, issue or property…"
              value={filters.query}
              onChange={(e) => update("query", e.target.value)}
            />
          </label>
          <button className="text-button" onClick={reset}>
            Clear Explorer filters
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
            options={makeOptions([
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
          <MultiFilter
            name="Priority"
            options={makeOptions([
              "urgent",
              "high",
              "normal",
              "low",
              "unknown",
            ])}
            value={filters.priority}
            onChange={(v) => update("priority", v)}
          />
          <MultiFilter
            name="Owner approval"
            options={makeOptions([
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
            name="Active age"
            options={bucketLabels(scopedRules).map((v) => ({
              value: v,
              label: v === "Unknown age" ? v : `${v} days`,
            }))}
            value={filters.bucket}
            onChange={(v) => update("bucket", v)}
          />
          <label className="date-filter">
            Created from
            <input
              type="date"
              aria-label="Explorer created from"
              value={filters.createdFrom}
              max={filters.createdTo || undefined}
              onChange={(e) => update("createdFrom", e.target.value)}
            />
          </label>
          <label className="date-filter">
            Created to
            <input
              type="date"
              aria-label="Explorer created to"
              value={filters.createdTo}
              min={filters.createdFrom || undefined}
              onChange={(e) => update("createdTo", e.target.value)}
            />
          </label>
        </div>
        {filters.createdFrom &&
          filters.createdTo &&
          filters.createdFrom > filters.createdTo && (
            <p className="error" role="alert">
              Created from must be on or before Created to.
            </p>
          )}
        <p className="filter-result" role="status">
          {filtered.length} of {snapshot.workOrders.length} records · {sources}{" "}
          · date filters use creation dates
        </p>
      </section>
      <section className="explorer-kpis" aria-label="Explorer summary">
        {[
          {
            name: "Matching work orders",
            value: filtered.length,
            note: "All mapped statuses",
          },
          {
            name: "Known active",
            value: active.length,
            note: `${filtered.filter((w) => w.status === "unknown").length} unknown status excluded`,
          },
          {
            name: `Over ${rules.agingNudgeDays} days`,
            value: count("aged"),
            note: `${active.filter((w) => age(w, reference, scopedRules) === null).length} active age unknown`,
          },
          {
            name: "Pending approval",
            value: count("pending"),
            note: "Explicit pending · active only",
          },
          {
            name: "Unassigned",
            value: count("unassigned"),
            note: `${active.filter((w) => w.vendorAssignmentState === "unknown").length} active assignment unknown`,
          },
        ].map((k) => (
          <div className="explorer-kpi" key={k.name}>
            <span>{k.name}</span>
            <strong>{k.value}</strong>
            <small>{k.note}</small>
          </div>
        ))}
      </section>
      <Panel
        title="Work order register"
        action={
          <span className="chart-tag">Read-only · {scopedRules.timezone}</span>
        }
      >
        <p className="chart-description">
          Aging highlight: strictly over {rules.agingNudgeDays} calendar days.
          This is a proposed follow-up threshold, not a contractual overdue
          classification. Pending approval has no waiting-duration threshold
          without an approval-request date. Scroll horizontally for all columns,
          or open a work-order number for full details.
        </p>
        {page.rows.length ? (
          <div
            className="table-scroll explorer-table"
            tabIndex={0}
            role="region"
            aria-label="Explorer work order register"
          >
            <table>
              <thead>
                <tr>
                  {headings.map((h) => (
                    <th
                      key={h.key}
                      aria-sort={
                        sort.key === h.key
                          ? sort.direction === 1
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        className="sort-button"
                        onClick={() => {
                          setSort({
                            key: h.key,
                            direction:
                              sort.key === h.key && sort.direction === 1
                                ? -1
                                : 1,
                          });
                          setRequested(1);
                        }}
                      >
                        {h.title}
                        <ArrowDownUp size={12} />
                      </button>
                    </th>
                  ))}
                  <th>Recommended next action</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((w) => {
                  const aged = matchesReason(w, "aged", reference, scopedRules),
                    why = reasons(w, reference, scopedRules),
                    vendor = snapshot.vendors.find((v) => v.id === w.vendorId),
                    n = age(w, reference, scopedRules);
                  return (
                    <tr key={w.id}>
                      <td>
                        <button
                          className="record-link"
                          onClick={() => setSelected(w)}
                        >
                          {w.number}
                          <ArrowRight size={12} />
                        </button>
                      </td>
                      <td>
                        {snapshot.properties.find((p) => p.id === w.propertyId)
                          ?.displayName ?? "Unknown property"}
                        {w.unitLabel && (
                          <small className="cell-secondary">
                            Unit: {w.unitLabel}
                          </small>
                        )}
                      </td>
                      <td>{w.summaryRedacted ?? "Unavailable / omitted"}</td>
                      <td>
                        <span className={`badge ${w.status}`}>
                          {label(w.status)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`assignment ${w.vendorAssignmentState}`}
                        >
                          {w.vendorAssignmentState === "unknown"
                            ? "Unknown assignment"
                            : w.vendorAssignmentState === "unassigned"
                              ? "Explicitly unassigned"
                              : (vendor?.displayName ?? "Unresolved source ID")}
                        </span>
                        {w.vendorId && !vendor && (
                          <small className="cell-secondary">{w.vendorId}</small>
                        )}
                      </td>
                      <td>
                        {w.createdAt?.value ?? "Unknown"}
                        {w.createdAt && (
                          <small className="cell-secondary">
                            {w.createdAt.precision} precision
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`age-indicator ${aged ? "aged" : ""}`}>
                          {isActive(w)
                            ? n === null
                              ? "Unknown"
                              : `${n} days`
                            : "Not applicable"}
                        </span>
                        {aged && (
                          <small className="age-note">
                            Over {rules.agingNudgeDays}d rule
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`approval ${w.approvalState}`}>
                          {label(w.approvalState)}
                        </span>
                      </td>
                      <td>{label(w.priority)}</td>
                      <td>
                        {snapshot.categories.find((c) => c.id === w.categoryId)
                          ?.label ?? "Unknown"}
                      </td>
                      <td>
                        <button
                          className="next-action"
                          onClick={() => setSelected(w)}
                        >
                          {why.length ? "Review follow-up" : "Review details"}
                        </button>
                        <small className="cell-secondary">
                          {why.map((r) => reasonNames[r]).join(" · ") ||
                            "No eligible follow-up"}
                        </small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <h3>No matching work orders</h3>
            <p>
              Adjust filters or clear the current scope. No source records have
              been changed.
            </p>
            <button className="text-button" onClick={reset}>
              Reset Explorer scope
            </button>
          </div>
        )}
        <div className="pagination">
          <span>
            {filtered.length
              ? `${(page.page - 1) * size + 1}–${Math.min(page.page * size, filtered.length)}`
              : "0"}{" "}
            of {filtered.length}
          </span>
          <label>
            Rows per page
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setRequested(1);
              }}
            >
              {[10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            disabled={page.page === 1}
            onClick={() => setRequested(page.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page.page} of {page.pages}
          </span>
          <button
            disabled={page.page === page.pages}
            onClick={() => setRequested(page.page + 1)}
          >
            Next
          </button>
        </div>
      </Panel>
      {selected && (
        <WorkOrderDetails
          order={selected}
          snapshot={snapshot}
          rules={scopedRules}
          reference={reference}
          history={history}
          onClose={() => setSelected(null)}
        />
      )}
      {importOpen && (
        <CsvImport
          session={session}
          timezone={rules.timezone}
          onClose={() => setImportOpen(false)}
          onLoad={(s) => {
            setCsv(s);
            switchSource("csv");
          }}
        />
      )}
      {healthOpen && (
        <Modal
          title="Explorer data health"
          onClose={() => setHealthOpen(false)}
        >
          <p>
            {sources} · {filtered.length} scoped / {snapshot.workOrders.length}{" "}
            total records.
          </p>
          <p>
            {source === "csv"
              ? session.latestAttempt
              : "Demo fixture loaded; no operational imports."}
          </p>
          <p>{history.reason}</p>
          <p>
            {history.missing.length} records not observed in the latest
            comparable snapshot; never treated as closed or deleted.{" "}
            {history.newIds.length} first observed records.
          </p>
          <p>
            Coverage: {dataset.completeness}. Source report time:{" "}
            {dataset.reportAsOf ?? "Unknown"}. Last successful load:{" "}
            {snapshot.importedAt}.
          </p>
          <ul>
            {snapshot.qualitySummary.map((issue, i) => (
              <li key={i}>{issue.safeMessage}</li>
            ))}
          </ul>
          <p>
            CSV data is held only in memory until this browser session is
            cleared or reloaded. Operational authentication, storage and private
            sharing are not enabled.
          </p>
        </Modal>
      )}
    </div>
  );
}
