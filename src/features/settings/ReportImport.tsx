import { useRef, useState } from "react";
import { Modal } from "../../components/ui";
import { csvFields, parseCsv, MAX_CSV_BYTES } from "../../data/csv";
import type { CsvOptions } from "../../data/csv";
import { vendorFields } from "../../data/vendorRepository";
import type { VendorImportOptions } from "../../data/vendorRepository";
import { propertyFields, previewPropertyCsv } from "../../data/propertyCsv";
import type {
  PropertyOptions,
  PropertyDirectory,
} from "../../data/propertyCsv";
import type {
  DatasetKind,
  ImportOptions,
  ManagedPreview,
  SourceConfig,
} from "../../data/managedTypes";
import type { Snapshot, Status, Priority, WorkOrder } from "../../domain/types";
import { useWorkspace } from "../../data/workspace/context";
import { managedRequest } from "../../data/managedClient";
const enumDefinitions = [
  {
    field: "status",
    key: "statusMap",
    values: [
      "unknown",
      "open",
      "in_progress",
      "on_hold",
      "completed",
      "cancelled",
    ],
  },
  {
    field: "priority",
    key: "priorityMap",
    values: ["unknown", "urgent", "high", "normal", "low"],
  },
  {
    field: "approvalState",
    key: "approvalMap",
    values: ["unknown", "pending", "approved", "not_required"],
  },
  {
    field: "vendorAssignmentState",
    key: "assignmentMap",
    values: ["unknown", "assigned", "unassigned"],
  },
] as const;
export function ReportImport({
  dataset,
  source,
  onClose,
}: {
  dataset: DatasetKind;
  source: SourceConfig | null;
  onClose: () => void;
}) {
  const workspace = useWorkspace(),
    [input, setInput] = useState(""),
    [table, setTable] = useState<string[][]>([]),
    [preview, setPreview] = useState<ManagedPreview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    revision = useRef(0),
    propertyStage = useRef<PropertyDirectory | null>(null);
  const preset = source?.presets[dataset];
  const [account, setAccount] = useState(
      source?.account ?? workspace.csv?.datasets[0].sourceAccountId ?? "",
    ),
    [scope, setScope] = useState(preset?.scope ?? source?.scope ?? ""),
    [timezone, setTimezone] = useState(source?.timezone ?? ""),
    [reportAsOf, setReportAsOf] = useState(""),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [enums, setEnums] = useState<Record<string, Record<string, string>>>({}),
    [approved, setApproved] = useState(false),
    [identifiers, setIdentifiers] = useState(false),
    [separator, setSeparator] = useState<";" | "|" | ",">(";");
  const fields =
    dataset === "workOrders"
      ? csvFields
      : dataset === "vendors"
        ? vendorFields
        : propertyFields;
  const invalidate = () => {
    revision.current++;
    setPreview(null);
    setError("");
    propertyStage.current = null;
    workspace.session.discardPreview();
    workspace.vendorSession.discardPreview();
  };
  const options = (): ImportOptions =>
    ({
      account,
      scope,
      timezone,
      reportAsOf,
      redacted: approved,
      mapping,
      ...(dataset === "workOrders"
        ? {
            statusMap: (enums.statusMap ?? {}) as Record<string, Status>,
            priorityMap: (enums.priorityMap ?? {}) as Record<string, Priority>,
            approvalMap: (enums.approvalMap ?? {}) as Record<
              string,
              WorkOrder["approvalState"]
            >,
            assignmentMap: (enums.assignmentMap ?? {}) as Record<
              string,
              WorkOrder["vendorAssignmentState"]
            >,
          }
        : dataset === "vendors"
          ? {
              verifiedIdentifiers: identifiers,
              categorySeparator: separator,
              activeMap: (enums.activeMap ??
                {}) as VendorImportOptions["activeMap"],
            }
          : { verifiedIdentifiers: identifiers }),
    }) as ImportOptions;
  const rawValues = (field: string) =>
    mapping[field]
      ? [
          ...new Set(
            table
              .slice(1)
              .map((row) => row[table[0].indexOf(mapping[field])].trim())
              .filter(Boolean),
          ),
        ]
      : [];
  const definitions =
    dataset === "workOrders"
      ? enumDefinitions
      : dataset === "vendors"
        ? [
            {
              field: "active",
              key: "activeMap",
              values: ["unknown", "active", "inactive"],
            },
          ]
        : [];
  return (
    <Modal
      title={`Import ${dataset} report · ${source ? "protected server" : "local evaluation"}`}
      onClose={() => {
        invalidate();
        onClose();
      }}
    >
      <p>
        {source
          ? "Administrator import: validation, original mapped field values, normalized records and audit history are stored encrypted on the protected server after review."
          : "Local synthetic/redacted evaluation only. This is memory-only, without operational authentication or persistence. Configure the protected server before importing production records."}
      </p>
      <p>
        No Rentvine export header is assumed. Only mapped approved fields are
        retained; arbitrary unmapped columns are discarded. Report-as-of remains
        Unknown if omitted.
      </p>
      <label className="vendor-attest">
        <input
          type="checkbox"
          checked={approved}
          onChange={(e) => {
            invalidate();
            setApproved(e.target.checked);
          }}
        />{" "}
        {source
          ? "I confirm these fields are approved, minimized and appropriately redacted for the authorized staff audience."
          : "This file contains only synthetic or approved redacted evaluation records; no private contacts or tenant information."}
      </label>
      <label className="vendor-file">
        Report CSV file
        <input
          disabled={!approved || busy}
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            invalidate();
            setTable([]);
            setInput("");
            const file = e.target.files?.[0];
            if (!file) return;
            const current = revision.current;
            setBusy(true);
            try {
              if (file.size > MAX_CSV_BYTES)
                throw new Error("CSV exceeds 2 MiB.");
              const raw = new TextDecoder("utf-8", { fatal: true }).decode(
                  await file.arrayBuffer(),
                ),
                parsed = parseCsv(raw);
              if (current !== revision.current) return;
              setInput(raw);
              setTable(parsed);
              setMapping({});
              setEnums({});
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "File validation failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <div className="vendor-import-grid">
        <label>
          Report source account
          <input
            value={account}
            disabled={!!source}
            maxLength={100}
            onChange={(e) => {
              invalidate();
              setAccount(e.target.value);
            }}
          />
        </label>
        <label>
          Report scope / comparison key
          <input
            value={scope}
            maxLength={500}
            onChange={(e) => {
              invalidate();
              setScope(e.target.value);
            }}
          />
        </label>
        <label>
          Source timezone
          <input
            value={timezone}
            disabled={!!source}
            onChange={(e) => {
              invalidate();
              setTimezone(e.target.value);
            }}
            placeholder="Reviewed IANA timezone"
          />
        </label>
        <label>
          Source report as of (optional ISO offset)
          <input
            value={reportAsOf}
            onChange={(e) => {
              invalidate();
              setReportAsOf(e.target.value);
            }}
            placeholder="Unknown if omitted"
          />
        </label>
      </div>
      {!!table.length && (
        <>
          <div className="vendor-import-grid">
            {fields.map((field) => (
              <label key={field}>
                Map {field}
                {field === "sourceId" ? " (required stable ID)" : ""}
                <select
                  value={mapping[field] ?? ""}
                  onChange={(e) => {
                    invalidate();
                    setMapping((m) => ({ ...m, [field]: e.target.value }));
                    setEnums({});
                  }}
                >
                  <option value="">Not supplied / omit</option>
                  {table[0].map((header) => (
                    <option key={header}>{header}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {definitions.map((definition) => (
            <fieldset key={definition.field}>
              <legend>Review {definition.field} source values</legend>
              {rawValues(definition.field).length > 100 ? (
                <p role="alert">
                  Too many distinct enum values; review the mapped column.
                </p>
              ) : (
                <div className="vendor-import-grid">
                  {rawValues(definition.field).map((raw) => (
                    <label key={raw}>
                      Map {definition.field} value: {raw}
                      <select
                        value={enums[definition.key]?.[raw] ?? "unknown"}
                        onChange={(e) => {
                          invalidate();
                          setEnums((values) => ({
                            ...values,
                            [definition.key]: {
                              ...values[definition.key],
                              [raw]: e.target.value,
                            },
                          }));
                        }}
                      >
                        {definition.values.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}
          {dataset !== "workOrders" && (
            <label className="vendor-attest">
              <input
                type="checkbox"
                checked={identifiers}
                onChange={(e) => {
                  invalidate();
                  setIdentifiers(e.target.checked);
                }}
              />{" "}
              I verified these stable IDs use the same identifier namespace as
              work-order references. No joins by name.
            </label>
          )}
          {dataset === "vendors" && (
            <label>
              Specialty separator
              <select
                value={separator}
                onChange={(e) => {
                  invalidate();
                  setSeparator(e.target.value as typeof separator);
                }}
              >
                <option value=";">Semicolon (;)</option>
                <option value="|">Pipe (|)</option>
                <option value=",">Comma (,)</option>
              </select>
            </label>
          )}
        </>
      )}
      <div className="draft-controls">
        <button
          className="primary"
          disabled={
            !input ||
            !approved ||
            busy ||
            definitions.some((d) => rawValues(d.field).length > 100)
          }
          onClick={async () => {
            const current = revision.current;
            setBusy(true);
            setError("");
            try {
              let result: ManagedPreview;
              if (source) {
                if (!workspace.managed)
                  throw new Error("Authenticate before importing.");
                result = await managedRequest<ManagedPreview>(
                  "/imports/preview",
                  workspace.managed.csrf,
                  "POST",
                  {
                    sourceId: source.id,
                    dataset,
                    input,
                    options: options(),
                    behavior: source.behavior,
                  },
                );
              } else if (dataset === "workOrders") {
                const p = await workspace.session.preview(
                  input,
                  options() as CsvOptions,
                );
                result = {
                  id: p.id,
                  rows: p.rows,
                  errors: p.errors,
                  warnings: p.warnings,
                  sample: p.snapshot?.workOrders.slice(0, 5) ?? [],
                  missing: 0,
                  carried: 0,
                };
              } else if (dataset === "vendors") {
                const p = await workspace.vendorSession.previewImport(
                  input,
                  options() as VendorImportOptions,
                );
                result = {
                  id: p.id,
                  rows: p.rows,
                  errors: p.errors,
                  warnings: p.warnings,
                  sample: p.directory?.vendors.slice(0, 5) ?? [],
                  missing: 0,
                  carried: 0,
                };
              } else {
                const p = await previewPropertyCsv(
                  input,
                  options() as PropertyOptions,
                );
                propertyStage.current = p.directory;
                result = {
                  id: p.id,
                  rows: p.rows,
                  errors: p.errors,
                  warnings: p.warnings,
                  sample: p.directory?.properties.slice(0, 5) ?? [],
                  missing: 0,
                  carried: 0,
                };
              }
              if (current === revision.current) setPreview(result);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Import failed; previous data retained.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Validate report preview
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {preview && (
        <section aria-label="Report validation result" aria-live="polite">
          <h3>
            {preview.errors.length
              ? "Report rejected"
              : "Report ready for review"}{" "}
            · {preview.rows} rows
          </h3>
          {preview.errors.map((message) => (
            <p role="alert" className="error" key={message}>
              {message}
            </p>
          ))}
          {preview.warnings.map((message) => (
            <p className="muted" key={message}>
              {message}
            </p>
          ))}
          {source && (
            <p>
              {source.behavior === "snapshot"
                ? "Snapshot replacement of current observations; absent prior records are archived, not deleted."
                : "Incremental last-known state; carried records are disclosed and not newly confirmed."}{" "}
              {preview.missing} prior rows not in this report; {preview.carried}{" "}
              carried into an upsert view.
            </p>
          )}
          {!preview.errors.length && (
            <>
              <div
                className="table-scroll"
                role="region"
                tabIndex={0}
                aria-label="Normalized report preview"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Stable ID</th>
                      <th scope="col">Number / name</th>
                      <th scope="col">Source state / coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((item, index) => {
                      const row = item as Record<string, unknown>;
                      return (
                        <tr key={index}>
                          <td>{String(row.sourceId ?? "Unknown")}</td>
                          <td>
                            {String(
                              row.number ?? row.displayName ?? "Not recorded",
                            )}
                          </td>
                          <td>
                            {String(
                              row.sourceStatus ??
                                (row.active === true
                                  ? "Active"
                                  : row.active === false
                                    ? "Inactive"
                                    : "Unknown / see normalized coverage"),
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                First five normalized rows. Original mapped values remain
                server-only in protected mode.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    if (source) {
                      await managedRequest(
                        `/imports/${preview.id}/commit`,
                        workspace.managed!.csrf,
                        "POST",
                        {},
                      );
                      await workspace.selectManaged(source.id);
                      await workspace.refreshManaged(source.id);
                    } else if (dataset === "workOrders")
                      workspace.loadCsv(
                        workspace.session.commit(preview.id) as Snapshot,
                      );
                    else if (dataset === "vendors")
                      workspace.loadVendorCsv(
                        workspace.vendorSession.commitImport(preview.id),
                      );
                    else if (propertyStage.current)
                      workspace.loadPropertyCsv(propertyStage.current);
                    onClose();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Commit failed; previous data retained.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Commit validated report
              </button>
            </>
          )}
        </section>
      )}
    </Modal>
  );
}
