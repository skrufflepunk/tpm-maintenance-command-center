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
    [focus, setFocus] = useState<
      "all" | "active" | "aged" | "pending" | "unassigned"
    >("all"),
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
  const baseRows = selectOrders(
    snapshot,
    filters,
    scopedRules,
    reference,
  ).filter((w) => !approval.length || approval.includes(w.approvalState));
  const filtered =
    focus === "all"
      ? baseRows
      : baseRows.filter((w) => matchesReason(w, focus, reference, scopedRules));
  const sorted = sortExplorer(
      filtered,
      sort.key,
      sort.direction,
      snapshot,
      scopedRules,
      reference,
    ),
    page = paginate(sorted, requested, size);
  const active = baseRows.filter(isActive);
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
    setFocus("all");
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
    { key: "age", title: "Active age" },
  ];
  const sources =
    source === "demo" ? "Fictional demo" : "CSV evaluation · session only";
  return (
    <div className="explorer">
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
        <div className="explorer-actions">
          <button
            className="outline-button"
            onClick={() => setHealthOpen(true)}
          >
            <ShieldCheck size={16} />
            Explorer data health
          </button>
          <button
            className="text-button csv-backup"
            onClick={() => setImportOpen(true)}
          >
            <FileUp size={16} />
            Import CSV
          </button>
        </div>
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
        {focus !== "all" && (
          <div className="kpi-filter-chip">
            <span>
              Quick filter:{" "}
              {focus === "active"
                ? "Known active"
                : focus === "aged"
                  ? `Over ${rules.agingNudgeDays} days`
                  : label(focus)}
            </span>
            <button
              className="text-button"
              onClick={() => {
                setFocus("all");
                setRequested(1);
              }}
            >
              Reset KPI filter
            </button>
          </div>
        )}
      </section>
      <section className="explorer-kpis" aria-label="Explorer summary">
        {[
          {
            id: "all" as const,
            name: "All matching work orders",
            value: baseRows.length,
            note: "All mapped statuses",
          },
          {
            id: "active" as const,
            name: "Open Work Orders",
            value: active.length,
            note: `${baseRows.filter((w) => w.status === "unknown").length} unknown status excluded`,
          },
          {
            id: "aged" as const,
            name: `Over ${rules.agingNudgeDays} days`,
            value: count("aged"),
            note: `${active.filter((w) => age(w, reference, scopedRules) === null).length} active age unknown`,
          },
          {
            id: "pending" as const,
            name: "Pending approval",
            value: count("pending"),
            note: "Explicit pending · active only",
          },
          {
            id: "unassigned" as const,
            name: "Unassigned",
            value: count("unassigned"),
            note: `${active.filter((w) => w.vendorAssignmentState === "unknown").length} active assignment unknown`,
          },
        ].map((k) => (
          <button
            type="button"
            className="explorer-kpi"
            key={k.id}
            aria-pressed={focus === k.id}
            aria-controls="explorer-register"
            onClick={() => {
              setFocus(k.id);
              setRequested(1);
            }}
          >
            <span>{k.name}</span>
            <strong>{k.value}</strong>
            <small>{k.note}</small>
          </button>
        ))}
      </section>
      <div id="explorer-register">
        <Panel
          title="Work order register"
          action={
            <span className="chart-tag">
              Read-only · {scopedRules.timezone}
            </span>
          }
        >
          <p className="chart-description">
            Aging highlight: strictly over {rules.agingNudgeDays} calendar days.
            This is a proposed follow-up threshold, not a contractual overdue
            classification. Pending approval has no waiting-duration threshold
            without an approval-request date. Open a work-order number for
            approval, priority, category, dates and source metadata.
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
                    const aged = matchesReason(
                        w,
                        "aged",
                        reference,
                        scopedRules,
                      ),
                      why = reasons(w, reference, scopedRules),
                      vendor = snapshot.vendors.find(
                        (v) => v.id === w.vendorId,
                      ),
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
                          {snapshot.properties.find(
                            (p) => p.id === w.propertyId,
                          )?.displayName ?? "Unknown property"}
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
                                : (vendor?.displayName ??
                                  "Unresolved source ID")}
                          </span>
                          {w.vendorId && !vendor && (
                            <small className="cell-secondary">
                              {w.vendorId}
                            </small>
                          )}
                        </td>
                        <td>
                          <span
                            className={`age-indicator ${aged ? "aged" : ""}`}
                          >
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
                Adjust filters or clear the current scope. No source records
                have been changed.
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
            <div className="register-sort-controls">
              <label>
                Sort register by
                <select
                  value={sort.key}
                  onChange={(e) => {
                    setSort({
                      key: e.target.value as ExplorerSort,
                      direction: sort.direction,
                    });
                    setRequested(1);
                  }}
                >
                  {[
                    ...headings,
                    { key: "created", title: "Created date" },
                    { key: "approval", title: "Owner approval" },
                    { key: "priority", title: "Priority" },
                    { key: "category", title: "Maintenance category" },
                  ].map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-label={
                  sort.direction === 1 ? "Sort descending" : "Sort ascending"
                }
                onClick={() => {
                  setSort({
                    ...sort,
                    direction: sort.direction === 1 ? -1 : 1,
                  });
                  setRequested(1);
                }}
              >
                <ArrowDownUp size={14} />
              </button>
            </div>
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
      </div>
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
