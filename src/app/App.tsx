import { DataSettings } from "../features/settings/DataSettings";
import { displayReceiptTime } from "../domain/displayTime";
import { Properties } from "../features/properties/Properties";
import { Analytics } from "../features/analytics/Analytics";
import { VendorWatch } from "../features/vendors/VendorWatch";
import { ActionCenter } from "../features/action-center/ActionCenter";
import { useWorkspace } from "../data/workspace/context";
import { WorkOrderExplorer } from "../features/work-orders/WorkOrderExplorer";
import { TropicalScene } from "../components/TropicalScene";
import { trapFocus } from "../components/focus";
import { Overview } from "../features/overview/Overview";
import { RulesEditor } from "../components/RulesEditor";
import { RecordTable } from "../components/RecordTable";
import { MultiFilter } from "../components/MultiFilter";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import { Modal, Palm } from "../components/ui";
import { defaultRules } from "../config/rules";
import { getRepository } from "../data/repository";
import type { DataHealth } from "../data/repository";
import {
  age,
  bucketLabels,
  emptyFilters,
  freshness,
  isActive,
  label,
  selectOrders,
} from "../domain/rules";
import type { Filters, Snapshot, WorkOrder } from "../domain/types";
const tabs = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Work Orders", icon: ClipboardList },
  { name: "Action Center", icon: Activity },
  { name: "Vendors", icon: Users },
  { name: "Properties", icon: Building2 },
  { name: "Analytics", icon: BarChart3 },
];
function currentTab() {
  const hash = decodeURIComponent(location.hash.slice(1));
  return hash === "Data & Settings" || tabs.some((t) => t.name === hash)
    ? hash
    : "Overview";
}
export default function App() {
  const [fixture, setSnapshot] = useState<Snapshot | null>(null),
    [fixtureHealth, setHealth] = useState<DataHealth | null>(null),
    [error, setError] = useState("");
  const [tab, setTab] = useState(currentTab),
    [menu, setMenu] = useState(false),
    [filters, setFilters] = useState<Filters>(emptyFilters),
    [demoRules, setRules] = useState(defaultRules);
  const [ruleOpen, setRuleOpen] = useState(false),
    [healthOpen, setHealthOpen] = useState(false),
    [selected, setSelected] = useState<WorkOrder | null>(null),
    [drill, setDrill] = useState<{ title: string; rows: WorkOrder[] } | null>(
      null,
    );
  const {
    source: explorerSource,
    csv,
    vendorSource,
    managed,
    managedSourceId,
    managedError,
    session,
  } = useWorkspace();
  const rules =
    managed && managedSourceId && explorerSource === "csv"
      ? managed.settings.rules
      : demoRules;
  const actionRef = useRef<{ openRecord: (id: string) => void }>(null);
  const explorerRef = useRef<{ openRecord: (id: string) => void }>(null);
  const [viewedAt] = useState(() => new Date().toISOString());
  const mainRef = useRef<HTMLElement>(null),
    initialNavigation = useRef(true);
  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(async () => {
        const repository = getRepository();
        const [s, h] = await Promise.all([
          repository.getSnapshot(),
          repository.getDataHealth(),
        ]);
        if (mounted) {
          setSnapshot(s);
          setHealth(h);
        }
      })
      .catch((e) => {
        if (mounted) setError((e as Error).message);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const handler = () => {
      setTab(currentTab());
      setMenu(false);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (initialNavigation.current) {
      initialNavigation.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [tab]);
  useEffect(() => {
    if (!menu) return;
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    sidebar?.querySelector<HTMLElement>(".mobile-close")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        document.querySelector<HTMLElement>(".mobile-menu")?.focus();
      } else if (sidebar) trapFocus(event, sidebar);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu]);
  if (error)
    return (
      <main className="fatal">
        <h1>Demo unavailable</h1>
        <p role="alert">{error}</p>
        <p>No operational data was loaded.</p>
      </main>
    );
  if (!fixture || !fixtureHealth)
    return (
      <main className="fatal" role="status">
        Loading maintenance workspace…
      </main>
    );
  const snapshot = explorerSource === "csv" && csv ? csv : fixture;
  const health =
    explorerSource === "csv"
      ? {
          issues: snapshot.qualitySummary,
          latestAttempt: session.latestAttempt,
          comparison: session.history().reason,
        }
      : fixtureHealth;
  const operations = tab !== "Overview";
  const explorerCsv = ["Vendors", "Properties", "Analytics"].includes(tab)
    ? vendorSource === "csv" || explorerSource === "csv"
    : explorerSource === "csv";
  const openActionRecord = (id: string) => {
    setTab("Action Center");
    location.hash = "Action Center";
    actionRef.current?.openRecord(id);
  };
  const openExplorerRecord = (id: string) => {
    setTab("Work Orders");
    location.hash = "Work Orders";
    explorerRef.current?.openRecord(id);
  };
  const dataset = snapshot.datasets.find(
    (d) => d.datasetType === "workOrders",
  )!;
  const reference = dataset.reportAsOf ?? snapshot.importedAt;
  const effectiveRules = {
    ...rules,
    timezone:
      snapshot.sourceMode === "csv" ? dataset.sourceTimezone : rules.timezone,
  };
  const rows = selectOrders(snapshot, filters, effectiveRules, reference);
  const setField = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const options = (values: string[]) =>
    values.map((value) => ({ value, label: label(value) }));
  const chips = [
    ...(
      [
        "property",
        "status",
        "vendor",
        "category",
        "priority",
        "bucket",
      ] as const
    ).flatMap((k) =>
      filters[k].map((value) => ({
        key: `${k}-${value}`,
        text: `${label(k)}: ${snapshot.properties.find((p) => p.id === value)?.displayName ?? snapshot.vendors.find((v) => v.id === value)?.displayName ?? snapshot.categories.find((c) => c.id === value)?.label ?? label(value)}`,
        clear: () =>
          setField(
            k,
            filters[k].filter((v) => v !== value),
          ),
      })),
    ),
    ...(filters.query
      ? [
          {
            key: "query",
            text: `Search: ${filters.query}`,
            clear: () => setField("query", ""),
          },
        ]
      : []),
    ...(filters.createdFrom
      ? [
          {
            key: "from",
            text: `Created from ${filters.createdFrom}`,
            clear: () => setField("createdFrom", ""),
          },
        ]
      : []),
    ...(filters.createdTo
      ? [
          {
            key: "to",
            text: `Created to ${filters.createdTo}`,
            clear: () => setField("createdTo", ""),
          },
        ]
      : []),
  ];
  const showDate = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: effectiveRules.timezone,
    }).format(new Date(value));
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "expanded" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Palm />
          </div>
          <div>
            <strong>
              TPM<span>MANAGEMENT</span>
            </strong>
          </div>
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <div className="sidebar-label">MAINTENANCE WORKSPACE</div>
        <nav aria-label="Main navigation">
          {tabs.map(({ name, icon: Icon }) => (
            <a
              href={`#${name}`}
              key={name}
              aria-current={tab === name ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} />
              {name}
              {tab === name && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <a
          className="settings-utility"
          href="#Data & Settings"
          aria-current={tab === "Data & Settings" ? "page" : undefined}
        >
          <Settings2 size={17} />
          Data &amp; Settings
        </a>
        <div className="sidebar-bottom">
          <div className="sidebar-landscape">
            <TropicalScene vertical />
          </div>
          <span className="demo-label">
            <span />{" "}
            {explorerCsv
              ? managedSourceId
                ? "CSV REPORTS"
                : "CSV EVALUATION"
              : "DEMO WORKSPACE"}
          </span>
          <p>
            {explorerCsv
              ? managedSourceId
                ? "Protected CSV workspace."
                : "Local CSV evaluation."
              : "Fictional portfolio."}
            <br />
            Read-only clarity.
          </p>
          <small>Original illustration · provisional branding</small>
          <div className="sidebar-profile">
            <span className="avatar">TP</span>
            <div>
              TPM team
              <small>
                {managed
                  ? `Authenticated ${managed.user.role}`
                  : "Read-only demonstration"}
              </small>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <TropicalScene />
          <div className="hero-copy">
            <p>MAINTENANCE OPERATIONS</p>
            <div className="hero-title">Maintenance Command Center</div>
            <span>
              {explorerCsv
                ? managedSourceId
                  ? "Protected CSV reports · read-only operational views."
                  : "Read-only CSV evaluation · session memory only."
                : "Priorities, clarity, and follow-ups across your fictional portfolio."}
            </span>
          </div>
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu />
            </button>
            <span>Maintenance</span>
            <span className="crumb-divider">/</span>
            <strong>{tab}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-pill">
              <span />
              {explorerCsv ? "CSV session" : "Demo data"}
            </span>
            <button
              hidden={operations}
              className="health-button"
              onClick={() => setHealthOpen(true)}
            >
              <ShieldCheck size={15} />
              Data health{" "}
              <span className="health-count">{health.issues.length}</span>
            </button>
            <span className="avatar light">TP</span>
          </div>
        </header>
        <main id="main-content" ref={mainRef} tabIndex={-1} className="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR MAINTENANCE WORKSPACE</p>
              <h1>
                {tab === "Overview"
                  ? "Portfolio overview"
                  : tab === "Work Orders"
                    ? "Work Order Explorer"
                    : tab === "Vendors"
                      ? "Vendor Watch"
                      : tab}
              </h1>
              <p className="muted">
                {tab === "Overview"
                  ? "A clear view of what’s moving. A focused view of what needs you."
                  : tab === "Work Orders"
                    ? "Explore work orders and evaluate CSV imports in an isolated session."
                    : tab === "Vendors"
                      ? "Find vendors, review verified workload and prepare local follow-up drafts."
                      : tab === "Action Center"
                        ? "Review source-qualified priorities and prepare local follow-up drafts."
                        : tab === "Properties"
                          ? "Inspect source-qualified property maintenance and review signals."
                          : "Explore available maintenance records, cohorts and observed trends."}
              </p>
            </div>
            <button
              className="outline-button"
              onClick={() => {
                if (managed && explorerSource === "csv")
                  location.hash = "Data & Settings";
                else setRuleOpen(true);
              }}
            >
              <Settings2 size={16} />
              {managed && explorerSource === "csv"
                ? "Protected rule settings"
                : "Demo rules"}
            </button>
          </div>
          <div className="demo-notice">
            <Sparkles size={16} />
            <span>
              {explorerCsv ? (
                <>
                  <strong>
                    {managedSourceId
                      ? "Protected CSV reports."
                      : "CSV evaluation · session only."}
                  </strong>{" "}
                  Imported records are separate from demo data.{" "}
                  {managedSourceId
                    ? "Authenticated server storage; no live Rentvine connection."
                    : "No server upload or Rentvine connection."}
                </>
              ) : (
                <>
                  <strong>Fictional sample data.</strong> Every record,
                  property, vendor, and date is synthetic. No Rentvine
                  connection.
                </>
              )}
            </span>
          </div>
          {managedSourceId && managedError && (
            <p className="settings-error" role="status">
              {managedError} Last loaded source data may be stale.
            </p>
          )}
          {snapshot.qualitySummary
            .filter((issue) =>
              ["NOT_IMPORTED", "CARRIED_RECORDS", "RETENTION_PRUNED"].includes(
                issue.code,
              ),
            )
            .map((issue) => (
              <p key={issue.code} className="settings-error" role="status">
                {issue.safeMessage}
              </p>
            ))}
          <div className="snapshot-meta" hidden={operations}>
            <span>
              <span className="status-dot" />
              {snapshot.sourceMode === "demo"
                ? "Fixed demo snapshot"
                : "Selected CSV workspace"}
            </span>
            <span>Report as of {showDate(reference)}</span>
            <span>
              Loaded {displayReceiptTime(snapshot.importedAt)}
              {snapshot.sourceMode === "demo" ? " (synthetic)" : ""}
            </span>
            <span>
              {effectiveRules.timezone}
              {snapshot.sourceMode === "demo"
                ? " · illustrative"
                : " · declared source timezone"}
            </span>
          </div>
          <section
            className="filter-panel"
            hidden={operations}
            aria-label="Shared work-order filters"
          >
            <div className="filter-top">
              <div className="search-box">
                <Search size={17} />
                <input
                  aria-label="Search work orders"
                  placeholder="Search work orders, summaries, properties…"
                  value={filters.query}
                  onChange={(e) => setField("query", e.target.value)}
                />
              </div>
              <span className="filter-title">
                <SlidersHorizontal size={15} />
                Filter portfolio
              </span>
              <button
                className="text-button"
                onClick={() => setFilters({ ...emptyFilters })}
              >
                Clear all
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
                onChange={(v) => setField("property", v)}
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
                onChange={(v) => setField("status", v)}
              />
              <MultiFilter
                name="Vendor"
                options={[
                  ...snapshot.vendors.map((v) => ({
                    value: v.id,
                    label: v.displayName,
                  })),
                  { value: "unassigned", label: "Explicitly unassigned" },
                  { value: "unknown", label: "Unknown assignment" },
                ]}
                value={filters.vendor}
                onChange={(v) => setField("vendor", v)}
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
                onChange={(v) => setField("category", v)}
              />
              <MultiFilter
                name="Priority"
                options={options([
                  "urgent",
                  "high",
                  "normal",
                  "low",
                  "unknown",
                ])}
                value={filters.priority}
                onChange={(v) => setField("priority", v)}
              />
              <MultiFilter
                name="Active age"
                options={bucketLabels(rules).map((v) => ({
                  value: v,
                  label: `${v}${v === "Unknown age" ? "" : " days"}`,
                }))}
                value={filters.bucket}
                onChange={(v) => setField("bucket", v)}
              />
              <label className="date-filter">
                Created from
                <input
                  type="date"
                  aria-label="Created from"
                  value={filters.createdFrom}
                  max={filters.createdTo || undefined}
                  onChange={(e) => setField("createdFrom", e.target.value)}
                />
              </label>
              <label className="date-filter">
                Created to
                <input
                  type="date"
                  aria-label="Created to"
                  value={filters.createdTo}
                  min={filters.createdFrom || undefined}
                  onChange={(e) => setField("createdTo", e.target.value)}
                />
              </label>
            </div>
            {filters.createdFrom &&
              filters.createdTo &&
              filters.createdFrom > filters.createdTo && (
                <p role="alert" className="error">
                  Created from must be on or before Created to.
                </p>
              )}
            {chips.length > 0 && (
              <div className="filter-chips">
                {chips.map((c) => (
                  <button
                    key={c.key}
                    onClick={c.clear}
                    aria-label={`Remove ${c.text}`}
                  >
                    {c.text}
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}
            <p className="filter-result" role="status">
              {rows.length} of {snapshot.workOrders.length}{" "}
              {snapshot.sourceMode === "demo"
                ? "fictional work orders"
                : "CSV work orders"}{" "}
              ·{" "}
              {chips.length
                ? "Filtered scope"
                : snapshot.sourceMode === "demo"
                  ? "All sample records"
                  : "All report records"}{" "}
              · filters apply to all work-order metrics
            </p>
          </section>
          <section
            hidden={tab !== "Work Orders"}
            aria-label="Work Order Explorer workspace"
          >
            <WorkOrderExplorer
              demo={fixture}
              rules={rules}
              ref={explorerRef}
              key={`${explorerSource}:${explorerSource === "csv" ? csv?.id : snapshot.id}`}
            />
          </section>
          <section
            hidden={tab !== "Action Center"}
            aria-label="Action Center workspace"
          >
            <ActionCenter
              ref={actionRef}
              key={`${explorerSource}:${explorerSource === "csv" ? csv?.id : snapshot.id}`}
              demo={fixture}
              rules={rules}
              onOpenExplorer={openExplorerRecord}
            />
          </section>
          <section
            hidden={tab !== "Vendors"}
            aria-label="Vendor Watch workspace"
          >
            <VendorWatch
              demo={fixture}
              rules={rules}
              onOpenExplorer={openExplorerRecord}
              onOpenAction={openActionRecord}
            />
          </section>
          <section
            hidden={tab !== "Properties"}
            aria-label="Properties workspace"
          >
            <Properties
              demo={fixture}
              rules={rules}
              onOpenExplorer={openExplorerRecord}
            />
          </section>
          <section
            hidden={tab !== "Analytics"}
            aria-label="Analytics workspace"
          >
            <Analytics
              demo={fixture}
              rules={rules}
              onOpenExplorer={openExplorerRecord}
            />
          </section>
          {tab === "Data & Settings" && <DataSettings />}
          {tab === "Overview" && (
            <Overview
              snapshot={snapshot}
              rows={rows}
              rules={effectiveRules}
              reference={reference}
              health={health}
              setDrill={setDrill}
              setSelected={setSelected}
              setHealthOpen={setHealthOpen}
            />
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={14} />
              {operations
                ? "Read-only workspace · no source changes or messages"
                : snapshot.sourceMode === "demo"
                  ? "Read-only demo · no imports, source changes, or messages"
                  : "Read-only CSV view · no Rentvine changes or messages"}
            </span>
            <span>
              Viewed {displayReceiptTime(viewedAt)} · not source freshness
            </span>
          </footer>
        </main>
      </div>
      {ruleOpen && (
        <RulesEditor
          rules={rules}
          onSave={(r) => {
            setRules(r);
            setField("bucket", []);
          }}
          onClose={() => setRuleOpen(false)}
        />
      )}
      {healthOpen && (
        <Modal
          title="Data health & provenance"
          onClose={() => setHealthOpen(false)}
        >
          <span className="demo-pill">
            {snapshot.sourceMode === "demo" ? "Demo data" : "CSV reports"} ·{" "}
            {dataset.completeness} coverage
          </span>
          <p>{dataset.reportScope.description}</p>
          <ul className="health-list">
            {health.issues.map((issue) => (
              <li key={issue.code}>
                <AlertCircle size={16} />
                {issue.safeMessage}
              </li>
            ))}
          </ul>
          <p>
            <strong>Latest attempt:</strong> {health.latestAttempt}
          </p>
          <p>{health.comparison}</p>
          <p>
            No observed-change nudges: history does not span{" "}
            {rules.noObservedChangeDays} elapsed days.
          </p>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Dataset coverage and freshness"
          >
            <table>
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Coverage</th>
                  <th>Freshness</th>
                  <th>Accepted / rejected</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.datasets.map((d) => (
                  <tr key={d.id}>
                    <td>{d.datasetType}</td>
                    <td>{d.completeness}</td>
                    <td>
                      {d.datasetType === "workOrders"
                        ? freshness(
                            d.reportAsOf,
                            d.importedAt,
                            viewedAt,
                            rules.staleAfterHours,
                          )
                        : "Source freshness unknown; policy not configured"}
                    </td>
                    <td>
                      {d.rowCounts.accepted} / {d.rowCounts.rejected}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Work-order freshness threshold: {rules.staleAfterHours} elapsed
            hours. Source and receipt timestamps are distinct; no live source
            freshness is claimed. CSV evaluation is available in Work Orders;
            live API access remains unavailable. Schema {snapshot.schemaVersion}{" "}
            · mapping {snapshot.mappingVersion} · rules {rules.rulesVersion}.
          </p>
        </Modal>
      )}
      {drill && !selected && (
        <Modal title={drill.title} onClose={() => setDrill(null)}>
          <p className="muted">
            {drill.rows.length} supporting records · current filter scope ·
            {snapshot.sourceMode === "demo"
              ? "fictional demo data"
              : "selected CSV report data"}
          </p>
          <RecordTable
            rows={drill.rows}
            snapshot={snapshot}
            rules={rules}
            reference={reference}
            onSelect={setSelected}
          />
        </Modal>
      )}
      {selected && (
        <Modal title={selected.number} onClose={() => setSelected(null)}>
          <span className="demo-pill">
            {snapshot.sourceMode === "demo"
              ? "Fictional work order"
              : "Read-only CSV work order"}
          </span>
          <h3 className="detail-title">{selected.summaryRedacted}</h3>
          <dl className="record-details">
            {Object.entries({
              Property:
                snapshot.properties.find((p) => p.id === selected.propertyId)
                  ?.displayName ?? "Unknown property",
              Status: label(selected.status),
              "Original source status": selected.sourceStatus ?? "Unknown",
              Priority: label(selected.priority),
              Vendor:
                snapshot.vendors.find((v) => v.id === selected.vendorId)
                  ?.displayName ??
                (selected.vendorAssignmentState === "unassigned"
                  ? "Explicitly unassigned"
                  : "Unknown"),
              "Assignment coverage": label(
                selected.fieldCoverage.vendorAssignmentState,
              ),
              "Approval state": label(selected.approvalState),
              Created: selected.createdAt
                ? `${selected.createdAt.value} (${selected.createdAt.precision} precision)`
                : "Unknown",
              Completed: selected.completedAt
                ? `${selected.completedAt.value} (${selected.completedAt.precision} precision)`
                : "Unknown",
              Age: isActive(selected)
                ? age(selected, reference, effectiveRules) === null
                  ? "Unknown"
                  : `${age(selected, reference, effectiveRules)} calendar days`
                : "Not applicable",
              Provenance: `${selected.provenance} · ${snapshot.id}`,
            }).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="muted">
            Rentvine link unavailable: no verified source URL. This is a
            read-only detail view.
          </p>
        </Modal>
      )}
    </div>
  );
}
