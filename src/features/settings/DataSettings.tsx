import { useState } from "react";
import { Database, Download, FileUp, Trash2 } from "lucide-react";
import { Panel, Modal } from "../../components/ui";
import { RulesEditor } from "../../components/RulesEditor";
import { ReviewSettings } from "../insights/ReviewSettings";
import { useWorkspace } from "../../data/workspace/context";
import { MAX_LOCAL_BYTES, restoreBackup } from "../../data/local/state";
import type { LocalState } from "../../data/local/state";
import type { DatasetKind } from "../../data/local/reports";
import { displayReceiptTime } from "../../domain/displayTime";
import { ReportImport } from "./ReportImport";
const sections = [
  { id: "sources", label: "Data Sources" },
  { id: "imports", label: "Imports & History" },
  { id: "storage", label: "Local Data & Backups" },
  { id: "settings", label: "Settings" },
] as const;
export function DataSettings() {
  const w = useWorkspace();
  const [active, setActive] = useState(
    () =>
      sections.find(
        (s) => s.id === new URLSearchParams(location.search).get("settings"),
      )?.id ?? "sources",
  );
  const [importing, setImporting] = useState<DatasetKind | null>(null),
    [rulesOpen, setRulesOpen] = useState(false),
    [reviewOpen, setReviewOpen] = useState(false),
    [clearOpen, setClearOpen] = useState(false),
    [confirmClear, setConfirmClear] = useState(false),
    [restoreOpen, setRestoreOpen] = useState(false),
    [backup, setBackup] = useState<{ input: string; state: LocalState } | null>(
      null,
    ),
    [confirmRestore, setConfirmRestore] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const data = [
    ...(w.csv?.datasets.filter(
      (d) =>
        d.datasetType === "workOrders" && d.mappingVersion !== "not-imported",
    ) ?? []),
    ...(w.vendorCsv ? [w.vendorCsv.dataset] : []),
    ...(w.propertyCsv ? [w.propertyCsv.dataset] : []),
  ];
  const latest = data
    .map((d) => d.importedAt)
    .sort()
    .at(-1);
  const action = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Local operation failed; previous data retained.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="data-settings">
      <section className="settings-status" aria-label="Local data storage">
        <Database size={24} />
        <div>
          <strong>
            {w.storage.status === "saved"
              ? "Saved in this browser profile"
              : w.storage.status === "temporary"
                ? "Temporary browser session"
                : "Saved data needs attention"}
          </strong>
          <p>
            Single-user static edition · no sign-in, backend, API connection or
            report upload. Browser-local data and downloaded backups are not
            encrypted.
          </p>
        </div>
        <a
          className="outline-button"
          href={location.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open dashboard in a new tab
        </a>
      </section>
      <div className="settings-summary">
        <div>
          <Database size={18} />
          <span>Local workspace</span>
          <strong>{(w.storage.bytes / 1048576).toFixed(2)} / 12 MiB</strong>
          <small>Browser quota or policy may impose a lower limit</small>
        </div>
        <div>
          <FileUp size={18} />
          <span>Manual CSV</span>
          <strong>Browser-only import</strong>
          <small>Explicit mapping · 2 MiB / 10,000 rows per report</small>
        </div>
        <div>
          <Download size={18} />
          <span>Backup & restore</span>
          <strong>Local JSON files</strong>
          <small>No cloud sync · export regularly</small>
        </div>
      </div>
      <div className="settings-refresh">
        <div>
          <strong>
            {w.source === "csv"
              ? "Browser-local CSV workspace"
              : "Fictional demonstration"}
          </strong>
          <span>Last successful CSV load</span>
        </div>
        <div>
          {latest ? (
            <time dateTime={latest}>{displayReceiptTime(latest)}</time>
          ) : (
            "No CSV report imported"
          )}
          <small>Receipt time is separate from the source report date.</small>
        </div>
      </div>
      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Data & Settings sections"
      >
        {sections.map((s, index) => (
          <button
            key={s.id}
            role="tab"
            id={`settings-tab-${s.id}`}
            aria-selected={active === s.id}
            aria-controls={`settings-panel-${s.id}`}
            tabIndex={active === s.id ? 0 : -1}
            onClick={() => {
              const url = new URL(location.href);
              url.searchParams.set("settings", s.id);
              history.replaceState(null, "", url);
              setActive(s.id);
            }}
            onKeyDown={(e) => {
              const n =
                e.key === "ArrowRight"
                  ? (index + 1) % 4
                  : e.key === "ArrowLeft"
                    ? (index + 3) % 4
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 3
                        : null;
              if (n === null) return;
              e.preventDefault();
              document
                .getElementById(`settings-tab-${sections[n].id}`)
                ?.click();
              document
                .getElementById(`settings-tab-${sections[n].id}`)
                ?.focus();
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="insight-note">
          {message}
        </p>
      )}
      <div
        role="tabpanel"
        className="settings-tab-panel"
        id="settings-panel-sources"
        aria-labelledby="settings-tab-sources"
        tabIndex={0}
        hidden={active !== "sources"}
      >
        <Panel
          title="Data sources"
          eyebrow="ONE SELECTED SOURCE · ALL SIX SECTIONS"
        >
          <div className="settings-controls">
            <label>
              Active data workspace
              <select
                value={w.source}
                onChange={(e) =>
                  w.selectSource(e.target.value as "demo" | "csv")
                }
              >
                <option value="demo">Fictional demonstration data</option>
                <option value="csv" disabled={!w.csv}>
                  Browser-local CSV reports
                </option>
              </select>
            </label>
            <p>
              Demo records never mix with imported records. Vendor/property
              joins require matching accounts and explicitly verified
              identifiers.
            </p>
          </div>
          <p className="insight-note">
            Use Imports &amp; History to map work orders, vendors or properties.
            Reports replace their current snapshot; compatible prior
            observations are kept separately. Missing rows do not mean a work
            order was completed or deleted.
          </p>
          <p className="insight-note">
            Live Rentvine API access, scheduled ingestion, Google Workspace
            sign-in and server role controls are unavailable in this static
            edition. The complete Phase 7 server edition remains on its separate
            branch.
          </p>
        </Panel>
      </div>
      <div
        role="tabpanel"
        className="settings-tab-panel"
        id="settings-panel-imports"
        aria-labelledby="settings-tab-imports"
        tabIndex={0}
        hidden={active !== "imports"}
      >
        <Panel
          title="Data health & import history"
          eyebrow="MANUAL REPORTS · NEVER UPLOADED"
        >
          <div className="settings-import-actions">
            {(["workOrders", "vendors", "properties"] as const).map((kind) => (
              <button
                className="outline-button"
                key={kind}
                disabled={busy}
                onClick={() => setImporting(kind)}
              >
                <FileUp size={15} />
                Import {kind} report
              </button>
            ))}
          </div>
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Local dataset health"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Dataset</th>
                  <th scope="col">Imported records</th>
                  <th scope="col">Report as of</th>
                  <th scope="col">Successful local load</th>
                  <th scope="col">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id}>
                    <th scope="row">{d.datasetType}</th>
                    <td>{d.rowCounts.accepted}</td>
                    <td>{d.reportAsOf ?? "Unknown"}</td>
                    <td>{displayReceiptTime(d.importedAt)}</td>
                    <td>{d.completeness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.length && (
            <p className="empty-inline">
              No CSV reports imported. Demo values do not enter this import
              history.
            </p>
          )}
          {w.csv?.qualitySummary.map((issue) => (
            <p key={issue.code} className="insight-note">
              {issue.safeMessage}
            </p>
          ))}
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Local import history"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Receipt time</th>
                  <th scope="col">Dataset</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Rows</th>
                </tr>
              </thead>
              <tbody>
                {w.storage.history.map((h, i) => (
                  <tr key={i}>
                    <td>{displayReceiptTime(h.at)}</td>
                    <td>{h.kind}</td>
                    <td>{h.outcome}</td>
                    <td>{h.rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="insight-note">
            Up to 50 local load/replay entries and the current/previous
            work-order and vendor reports are retained. This editable local
            history is not a server audit log.
          </p>
        </Panel>
      </div>
      <div
        role="tabpanel"
        className="settings-tab-panel"
        id="settings-panel-storage"
        aria-labelledby="settings-tab-storage"
        tabIndex={0}
        hidden={active !== "storage"}
      >
        <Panel title="Local data & backups" eyebrow="THIS BROWSER PROFILE ONLY">
          <p className="insight-note">
            Data can be lost when site data is cleared, private browsing ends,
            browser storage is evicted, or you change browser/device/origin.
            Embedded and top-level storage may be separate partitions. Use a
            local JSON backup to transfer between them. Other apps on the same
            GitHub Pages origin can access origin storage; a repository path is
            not a security boundary.
          </p>
          <div className="settings-import-actions">
            <button
              className="outline-button"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  const text = await w.exportLocal();
                  const url = URL.createObjectURL(
                    new Blob([text], { type: "application/json" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download =
                    "tpm-local-backup-" +
                    new Intl.DateTimeFormat("en-CA", {
                      timeZone: "America/Mexico_City",
                    }).format(new Date()) +
                    ".json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  setMessage(
                    "Backup downloaded. Keep it private; it contains your locally imported mapped data.",
                  );
                })
              }
            >
              <Download size={15} />
              Export local backup
            </button>
            <button
              className="outline-button"
              onClick={() => {
                setBackup(null);
                setConfirmRestore(false);
                setError("");
                setRestoreOpen(true);
              }}
            >
              Restore local backup
            </button>
            <button
              className="outline-button"
              onClick={() => {
                setConfirmClear(false);
                setClearOpen(true);
              }}
            >
              <Trash2 size={15} />
              Clear local data
            </button>
          </div>
          <p className="insight-note">
            JSON backups include mapped reports, original receipt times, rules,
            review settings and local history. A SHA-256 check detects
            accidental changes, not malicious edits or authenticity. Files are
            not password-protected; protect and delete downloaded copies
            separately.
          </p>
        </Panel>
      </div>
      <div
        role="tabpanel"
        className="settings-tab-panel"
        id="settings-panel-settings"
        aria-labelledby="settings-tab-settings"
        tabIndex={0}
        hidden={active !== "settings"}
      >
        <Panel
          title="Maintenance settings"
          eyebrow="LOCAL CONFIGURATION · SHARED RULE FUNCTIONS"
        >
          <div className="settings-import-actions">
            <button
              className="outline-button"
              onClick={() => setRulesOpen(true)}
            >
              Edit aging & follow-up rules
            </button>
            <button
              className="outline-button"
              onClick={() => setReviewOpen(true)}
            >
              Edit review & scorecard settings
            </button>
          </div>
          <p className="insight-note">
            Current aging follow-up: strictly over {w.rules.agingNudgeDays}{" "}
            calendar days. CSV calculations retain each report’s declared
            timezone. Receipt display uses Mexico City. Missing appointments,
            ratings, costs and source activity remain unavailable.
          </p>
        </Panel>
        <Panel
          title="Public hosting & Google Sites"
          eyebrow="NO APPLICATION AUTHENTICATION"
        >
          <p className="insight-note">
            GitHub Pages publishes the application and synthetic demo publicly.
            Google Sites view restrictions do not protect the Pages URL. This
            app does not upload CSVs or backups; anyone using this browser
            profile/origin may still access its local data. Use a dedicated
            profile/origin and minimize reports. No API key, password or OAuth
            credential belongs here.
          </p>
          <p className="insight-note">
            Embed the published HTTPS project URL using Google Sites → Insert →
            Embed → By URL. Prefer 1060px+ width and 800–1000px height. If
            storage or downloads are blocked in the frame, use the same
            dashboard in a new tab, then export/restore locally as needed.
            Actual portal/browser policies require a user test after approved
            publication.
          </p>
        </Panel>
      </div>
      {importing && (
        <ReportImport dataset={importing} onClose={() => setImporting(null)} />
      )}
      {rulesOpen && (
        <RulesEditor
          rules={w.rules}
          onSave={w.updateRules}
          onClose={() => setRulesOpen(false)}
        />
      )}
      {reviewOpen && <ReviewSettings onClose={() => setReviewOpen(false)} />}
      {clearOpen && (
        <Modal
          title="Clear local dashboard data"
          onClose={() => setClearOpen(false)}
        >
          <p>
            This removes this edition’s saved reports, previous observations,
            import history, settings and current local view. It does not delete
            Rentvine records, other browser partitions/profiles, other
            same-origin apps, or downloaded backups.
          </p>
          <label className="vendor-attest">
            <input
              type="checkbox"
              checked={confirmClear}
              onChange={(e) => setConfirmClear(e.target.checked)}
            />
            I have exported any needed backup and want to delete this local
            workspace.
          </label>
          <button
            className="primary"
            disabled={!confirmClear || busy}
            onClick={() =>
              void action(async () => {
                await w.clearLocal();
                setClearOpen(false);
              })
            }
          >
            Delete local dashboard data
          </button>
          {error && <p role="alert">{error}</p>}
        </Modal>
      )}
      {restoreOpen && (
        <Modal
          title="Restore local backup"
          onClose={() => {
            setRestoreOpen(false);
            setBackup(null);
          }}
        >
          <p>
            Validation runs before replacement. Only this static edition’s
            versioned JSON backup is supported. Existing data is retained if the
            file fails checks.
          </p>
          <label>
            Local backup JSON file
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                setBackup(null);
                setConfirmRestore(false);
                if (!file) return;
                void action(async () => {
                  if (file.size > MAX_LOCAL_BYTES + 4096)
                    throw new Error("Backup exceeds 12 MiB.");
                  const input = new TextDecoder("utf-8", {
                    fatal: true,
                  }).decode(await file.arrayBuffer());
                  const state = await restoreBackup(input);
                  setBackup({ input, state });
                });
              }}
            />
          </label>
          {backup && (
            <>
              <p role="status">
                Validated backup:{" "}
                {backup.state.work
                  ? "work-order report"
                  : "no work-order report"}
                , {backup.state.vendor ? "vendor report" : "no vendor report"},{" "}
                {backup.state.property
                  ? "property report"
                  : "no property report"}{" "}
                · {backup.state.history.length} history entries. Source:{" "}
                {backup.state.source}.
              </p>
              <label className="vendor-attest">
                <input
                  type="checkbox"
                  checked={confirmRestore}
                  onChange={(e) => setConfirmRestore(e.target.checked)}
                />
                Replace my current local workspace with this validated backup.
              </label>
              <button
                className="primary"
                disabled={!confirmRestore || busy}
                onClick={() =>
                  void action(async () => {
                    await w.restoreLocal(backup.input);
                    setRestoreOpen(false);
                    setBackup(null);
                    setMessage("Local backup restored after validation.");
                  })
                }
              >
                Restore validated local backup
              </button>
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </Modal>
      )}
    </div>
  );
}
