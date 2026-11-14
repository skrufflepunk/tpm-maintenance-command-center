import { useEffect, useState } from "react";
import {
  Database,
  FileUp,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Panel } from "../../components/ui";
import { useWorkspace } from "../../data/workspace/context";
import { managedRequest } from "../../data/managedClient";
import type {
  DatasetKind,
  ImportSummary,
  ServerSettings,
  SourceConfig,
} from "../../data/managedTypes";
import { freshness } from "../../domain/rules";
import { displayReceiptTime } from "../../domain/displayTime";
import { ReportImport } from "./ReportImport";
export function DataSettings() {
  const w = useWorkspace(),
    source = w.managed?.sources.find((s) => s.id === w.managedSourceId);
  return (
    <DataSettingsContent
      key={`${w.managed?.user.role ?? "local"}:${source?.id ?? "none"}:${source?.revision ?? 0}:${w.managed?.settings.rules.rulesVersion ?? "demo"}`}
    />
  );
}
function DataSettingsContent() {
  const w = useWorkspace(),
    [importing, setImporting] = useState<DatasetKind | null>(null),
    [history, setHistory] = useState<ImportSummary[]>([]),
    [audit, setAudit] = useState<
      { id: string; event: string; at: string; actor: string }[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState<ServerSettings | null>(
      w.managed?.settings ?? null,
    ),
    [profile, setProfile] = useState({
      name: "",
      account: "",
      scope: "",
      timezone: "",
      approved: false,
      behavior: "snapshot",
    }),
    [delivery, setDelivery] = useState(
      w.managed?.sources.find((s) => s.id === w.managedSourceId)?.delivery ?? {
        enabled: false,
        intervalMinutes: 60,
        dataset: "workOrders" as DatasetKind,
      },
    );
  const admin = w.managed?.user.role === "administrator",
    source = w.managed?.sources.find((s) => s.id === w.managedSourceId) ?? null;
  const sourceId = source?.id;
  useEffect(() => {
    let valid = true;
    if (w.managed) {
      void managedRequest<{ imports: ImportSummary[] }>(
        "/imports" + (sourceId ? `?sourceId=${sourceId}` : ""),
      )
        .then((result) => {
          if (valid) setHistory(result.imports);
        })
        .catch(() => {
          if (valid)
            setError(
              "Import history is unavailable; previous data is retained.",
            );
        });
      if (admin)
        void managedRequest<{ events: typeof audit }>("/audit")
          .then((result) => {
            if (valid) setAudit(result.events);
          })
          .catch(() => {
            if (valid) setError("Audit history is unavailable.");
          });
    }
    return () => {
      valid = false;
    };
  }, [w.managed, sourceId, admin]);
  const action = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await w.refreshManaged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Protected action failed.");
    } finally {
      setBusy(false);
    }
  };
  const datasetRows = [
    ...new Map(
      [
        ...(w.csv?.datasets.filter((d) => d.datasetType === "workOrders") ??
          []),
        ...(w.vendorCsv ? [w.vendorCsv.dataset] : []),
        ...(w.propertyCsv ? [w.propertyCsv.dataset] : []),
      ].map((d) => [d.datasetType, d]),
    ).values(),
  ];
  return (
    <div className="data-settings">
      <section className="settings-status" aria-label="Connection and access">
        <Database size={24} />
        <div>
          <strong>
            {w.managed
              ? "Protected server connected"
              : "Local evaluation · protected server not connected"}
          </strong>
          <p>
            {w.managed
              ? `Authenticated ${w.managed.user.role} · server-side authorization · encrypted persistence`
              : "Fictional/redacted CSV evaluation remains functional. Configure authenticated server access before handling production records."}
          </p>
        </div>
        {w.managed ? (
          <button
            className="outline-button"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await managedRequest("/logout", w.managed!.csrf, "POST", {});
                location.assign("/auth/login");
              })
            }
          >
            Sign out
          </button>
        ) : (
          <a className="outline-button" href="/auth/login" target="_top">
            Staff sign-in
          </a>
        )}
        <button
          className="outline-button"
          disabled={busy}
          onClick={() => void action(() => w.refreshManaged())}
        >
          <RefreshCw size={14} />
          Check server connection
        </button>
      </section>
      {(error || w.managedError) && (
        <p className="settings-error" role="status">
          {error || w.managedError}
        </p>
      )}
      <div className="settings-summary">
        <div>
          <ShieldCheck size={18} />
          <span>Rentvine access</span>
          <strong>Read-only boundary</strong>
          <small>No write operations or messages</small>
        </div>
        <div>
          <FileUp size={18} />
          <span>Manual CSV</span>
          <strong>
            {w.managed
              ? "Protected import route"
              : "Local evaluation available"}
          </strong>
          <small>API-independent · explicit mappings</small>
        </div>
        <div>
          <LockKeyhole size={18} />
          <span>Rentvine API</span>
          <strong>Not configured</strong>
          <small>Ownership approval &amp; verified capabilities required</small>
        </div>
      </div>
      <Panel
        title="Data sources"
        eyebrow="ONE NORMALIZED WORKSPACE · ALL SIX SECTIONS"
      >
        <div className="settings-controls">
          <label>
            Active data workspace
            <select
              value={
                w.source === "demo"
                  ? "demo"
                  : (w.managedSourceId ?? "local-csv")
              }
              onChange={(e) => {
                if (e.target.value === "demo") w.selectSource("demo");
                else if (e.target.value === "local-csv") w.selectSource("csv");
                else void action(() => w.selectManaged(e.target.value));
              }}
            >
              <option value="demo">Fictional demonstration data</option>
              {!w.managed && w.csv && (
                <option value="local-csv">
                  Local CSV evaluation · memory only
                </option>
              )}
              {w.managed?.sources.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.approved}>
                  {s.name} · CSV {s.approved ? "approved" : "not approved"}
                </option>
              ))}
              <option value="api" disabled>
                Rentvine API · Not configured
              </option>
            </select>
          </label>
          <p>
            Demo records and operational CSV records never join. Vendor/property
            directory references require verified same-account IDs. Overview
            uses this same selected work-order source.
          </p>
        </div>
        <div className="settings-import-actions">
          {(["workOrders", "vendors", "properties"] as const).map((dataset) => (
            <button
              className="outline-button"
              key={dataset}
              disabled={busy || (!!w.managed && (!admin || !source?.approved))}
              onClick={() => setImporting(dataset)}
            >
              <FileUp size={15} />
              Import {dataset} report
            </button>
          ))}
        </div>
        {w.managed && !admin && (
          <p className="insight-note">
            Staff/viewer access is read-only. Administrators manage imports,
            approved sources, API setup and retention.
          </p>
        )}
        {w.managed && admin && !source && (
          <p className="insight-note">
            Create and select an approved CSV source below before importing
            reports.
          </p>
        )}
        {admin && (
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                const created = await managedRequest<SourceConfig>(
                  "/sources",
                  w.managed!.csrf,
                  "POST",
                  profile,
                );
                await w.selectManaged(created.id);
              });
            }}
          >
            <h3>Create a CSV source</h3>
            <div className="vendor-import-grid">
              {(
                [
                  ["name", "Source name"],
                  ["account", "Verified source account"],
                  ["scope", "Workspace scope"],
                  ["timezone", "Reviewed source timezone"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    maxLength={key === "scope" ? 500 : 100}
                    value={profile[key]}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
              <label>
                Import behavior
                <select
                  value={profile.behavior}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, behavior: e.target.value }))
                  }
                >
                  <option value="snapshot">
                    Snapshot · archive absent records
                  </option>
                  <option value="upsert">
                    Incremental upsert · disclose last-known carried rows
                  </option>
                </select>
              </label>
            </div>
            <label className="vendor-attest">
              <input
                type="checkbox"
                checked={profile.approved}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, approved: e.target.checked }))
                }
              />{" "}
              I confirm this CSV source and minimized fields are approved for
              the authorized audience. This does not approve Rentvine API
              access.
            </label>
            <button className="primary" disabled={busy || !profile.approved}>
              Create approved CSV source
            </button>
          </form>
        )}
        {source && admin && (
          <div className="settings-source-policy">
            <p>
              <strong>Selected source:</strong> {source.name} ·{" "}
              {source.behavior} behavior · approved{" "}
              {source.approved ? "Yes" : "No"}
            </p>
            <label>
              Selected source import behavior
              <select
                value={source.behavior}
                onChange={(e) =>
                  void action(() =>
                    managedRequest(
                      `/sources/${source.id}`,
                      w.managed!.csrf,
                      "PATCH",
                      { approved: source.approved, behavior: e.target.value },
                    ),
                  )
                }
              >
                <option value="snapshot">Snapshot</option>
                <option value="upsert">Incremental upsert</option>
              </select>
            </label>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void action(() =>
                  managedRequest(
                    `/sources/${source.id}`,
                    w.managed!.csrf,
                    "PATCH",
                    { approved: !source.approved, behavior: source.behavior },
                  ),
                )
              }
            >
              {source.approved
                ? "Suspend source approval"
                : "Restore source approval"}
            </button>
          </div>
        )}
      </Panel>
      <Panel
        title="Data health & import history"
        eyebrow="SOURCE TIME AND RECEIPT TIME ARE DISTINCT"
      >
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Managed dataset health"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Dataset</th>
                <th scope="col">Imported records</th>
                <th scope="col">Report as of</th>
                <th scope="col">Last successful load / check</th>
                <th scope="col">Freshness / coverage</th>
              </tr>
            </thead>
            <tbody>
              {datasetRows.map((d) => (
                <tr key={d.id}>
                  <th scope="row">{d.datasetType}</th>
                  <td>
                    {d.rowCounts.accepted} accepted · {d.rowCounts.rejected}{" "}
                    rejected
                  </td>
                  <td>{d.reportAsOf ?? "Unknown"}</td>
                  <td>
                    <time dateTime={d.importedAt} title={d.importedAt}>
                      {displayReceiptTime(d.importedAt)}
                    </time>
                    <small>
                      Last checked:{" "}
                      {w.managedRefresh[d.datasetType]?.lastCheckedAt
                        ? displayReceiptTime(
                            w.managedRefresh[d.datasetType]?.lastCheckedAt,
                          )
                        : "Local evaluation only"}
                    </small>
                  </td>
                  <td>
                    {w.managed
                      ? freshness(
                          d.reportAsOf,
                          d.importedAt,
                          new Date().toISOString(),
                          d.datasetType === "vendors"
                            ? w.managed.settings.vendorStaleAfterHours
                            : d.datasetType === "properties"
                              ? w.managed.settings.propertyStaleAfterHours
                              : w.managed.settings.rules.staleAfterHours,
                        )
                      : "Evaluation only; no operational policy"}
                    <small>{d.completeness}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!datasetRows.length && (
          <p className="empty-inline">
            No CSV dataset selected or imported. Demo is fictional; no
            operational refresh is claimed.
          </p>
        )}
        {w.csv?.qualitySummary.map((issue) => (
          <p className="insight-note" key={issue.code}>
            {issue.safeMessage}
          </p>
        ))}
        {w.managed ? (
          <>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Persistent import history"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Attempt time</th>
                    <th scope="col">Dataset / trigger</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Rows / behavior</th>
                    <th scope="col">Validation details</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <time dateTime={row.at} title={row.at}>
                          {displayReceiptTime(row.at)}
                        </time>
                      </td>
                      <td>
                        {row.dataset}
                        <small>{row.trigger}</small>
                      </td>
                      <td>{row.status}</td>
                      <td>
                        {row.rows} · {row.behavior}
                      </td>
                      <td>
                        {row.errors.join(" ") ||
                          row.warnings.join(" ") ||
                          "No reported validation issues"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!history.length && (
              <p className="empty-inline">
                No persistent import attempts for this scope.
              </p>
            )}
          </>
        ) : (
          <p className="insight-note">
            Persistent history is unavailable until the protected server is
            configured. Local evaluation is lost on reload.
          </p>
        )}
      </Panel>
      <Panel
        title="Configuration"
        eyebrow="ADMINISTRATOR-ONLY PERSISTENT SETTINGS"
      >
        {settings ? (
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              void action(() =>
                managedRequest("/settings", w.managed!.csrf, "PUT", settings),
              );
            }}
          >
            <div className="vendor-import-grid">
              <label>
                Aging threshold (calendar days)
                <input
                  disabled={!admin}
                  required
                  type="number"
                  min="0"
                  value={settings.rules.agingNudgeDays}
                  onChange={(e) =>
                    setSettings(
                      (s) =>
                        s && {
                          ...s,
                          rules: {
                            ...s.rules,
                            agingNudgeDays: Number(e.target.value),
                          },
                        },
                    )
                  }
                />
              </label>
              <label>
                No-observed-change threshold (elapsed days)
                <input
                  disabled={!admin}
                  required
                  type="number"
                  min="1"
                  value={settings.rules.noObservedChangeDays}
                  onChange={(e) =>
                    setSettings(
                      (s) =>
                        s && {
                          ...s,
                          rules: {
                            ...s.rules,
                            noObservedChangeDays: Number(e.target.value),
                          },
                        },
                    )
                  }
                />
              </label>
              <label>
                Configuration timezone
                <input
                  disabled={!admin}
                  required
                  value={settings.rules.timezone}
                  onChange={(e) =>
                    setSettings(
                      (s) =>
                        s && {
                          ...s,
                          rules: { ...s.rules, timezone: e.target.value },
                        },
                    )
                  }
                />
              </label>
              {(
                [
                  ["retentionDays", "Data retention days", 1, 3650],
                  ["vendorStaleAfterHours", "Vendor freshness hours", 1, 87600],
                  [
                    "propertyStaleAfterHours",
                    "Property freshness hours",
                    1,
                    87600,
                  ],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key}>
                  {label}
                  <input
                    disabled={!admin}
                    required
                    type="number"
                    min={min}
                    max={max}
                    value={settings[key]}
                    onChange={(e) =>
                      setSettings(
                        (s) => s && { ...s, [key]: Number(e.target.value) },
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <p className="insight-note">
              CSV calculations retain each report’s declared source timezone.
              Retention removes expired encrypted observations, raw mapped
              values, archives and audit/import history; expired current data
              becomes unavailable. No missing row is inferred deleted from
              Rentvine.
            </p>
            <button className="primary" disabled={!admin || busy}>
              Save protected configuration
            </button>
          </form>
        ) : (
          <p className="empty-inline">
            Protected configuration is unavailable. Demo rules and review
            thresholds remain session-only until authenticated server setup is
            complete.
          </p>
        )}
      </Panel>
      <Panel
        title="Automatic CSV processing"
        eyebrow="DELIVERY PROCESSING ≠ RENTVINE REPORT GENERATION"
      >
        <p className="insight-note">
          {w.managed?.ingestion.configured
            ? "Server-side protected file ingestion is configured; only explicitly enabled approved source mappings are processed."
            : "Not configured / not activated. Manual CSV upload remains supported."}{" "}
          Rentvine automatic report generation and delivery are unverified. No
          email or cloud-storage connector is assumed.
        </p>
        {admin && source && (
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              void action(() =>
                managedRequest(
                  `/sources/${source.id}/delivery`,
                  w.managed!.csrf,
                  "PUT",
                  delivery,
                ),
              );
            }}
          >
            <div className="vendor-import-grid">
              <label>
                Delivered report dataset
                <select
                  value={delivery.dataset}
                  onChange={(e) =>
                    setDelivery((d) => ({
                      ...d,
                      dataset: e.target.value as DatasetKind,
                    }))
                  }
                >
                  <option value="workOrders">Work orders</option>
                  <option value="vendors">Vendors</option>
                  <option value="properties">Properties</option>
                </select>
              </label>
              <label>
                Processing interval (minutes)
                <input
                  required
                  type="number"
                  min="5"
                  max="10080"
                  value={delivery.intervalMinutes}
                  onChange={(e) =>
                    setDelivery((d) => ({
                      ...d,
                      intervalMinutes: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <label className="vendor-attest">
              <input
                type="checkbox"
                checked={delivery.enabled}
                onChange={(e) =>
                  setDelivery((d) => ({ ...d, enabled: e.target.checked }))
                }
              />{" "}
              Enable processing for this approved source after a successful
              mapping review. A separate server operator gate and protected
              inbox are required.
            </label>
            <button className="outline-button" disabled={busy}>
              Save processing schedule
            </button>
          </form>
        )}
      </Panel>
      <Panel
        title="Rentvine API configuration"
        eyebrow="NOT CONFIGURED · OWNERSHIP APPROVAL REQUIRED"
      >
        <p className="insight-note">
          Official capabilities could not be verified in this environment. A
          server-only reader interface exists; no endpoints, credentials, rate
          limits or production synchronization are invented or activated.
        </p>
        <details>
          <summary>Administrator setup requirements</summary>
          <p>
            Obtain ownership approval, verify official maintenance
            fields/read-only permissions, authentication, pagination and quotas,
            then implement and review the server adapter. Store secrets only in
            the server’s secret manager or protected mounted files. No API
            credential can be entered into this frontend. CSV remains fully
            supported if API access is denied.
          </p>
        </details>
      </Panel>
      {admin && (
        <Panel
          title="Audit trail"
          eyebrow="SAFE OPERATION METADATA · NO RAW ROW LOGS"
        >
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Administrator audit trail"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Operation</th>
                  <th scope="col">Actor</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <time dateTime={row.at} title={row.at}>
                        {displayReceiptTime(row.at)}
                      </time>
                    </td>
                    <td>{row.event}</td>
                    <td>{row.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!audit.length && <p>No audit events yet.</p>}
        </Panel>
      )}
      <Panel
        title="Protected Google Sites embedding"
        eyebrow="INTERNAL PORTAL IS NOT THE AUTHORIZATION BOUNDARY"
      >
        <p className="insight-note">
          Authenticate the application itself. Configure exact reviewed ancestor
          origins on the server; default framing is denied. Sign in at the
          dashboard’s top-level URL if third-party cookies block an embedded
          session. Real hosting/identity-provider iframe behavior requires
          validation before production. No security header is weakened here.
        </p>
        <details>
          <summary>Deployment and CSV-only setup checklist</summary>
          <p>
            Use the protected Node server behind HTTPS on a host with durable
            encrypted storage and server-only secret mounts. Configure OIDC
            discovery/client settings and an explicit staff subject-to-role
            allowlist. Keep the application URL protected even outside Google
            Sites. Review docs/DEPLOYMENT.md and docs/CSV_ONLY.md in the
            repository for commands, retention, backups, precise CSP origins and
            portal tests. No public deployment is performed.
          </p>
        </details>
      </Panel>
      {importing && (
        <ReportImport
          dataset={importing}
          source={w.managed ? source : null}
          onClose={() => {
            setImporting(null);
            if (w.managed) void w.refreshManaged(source?.id);
          }}
        />
      )}
    </div>
  );
}
