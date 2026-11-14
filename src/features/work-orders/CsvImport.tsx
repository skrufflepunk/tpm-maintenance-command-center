import { useState } from "react";
import { Modal } from "../../components/ui";
import { csvFields, MAX_CSV_BYTES, parseCsv } from "../../data/csv";
import type { CsvOptions, CsvPreview, CsvField } from "../../data/csv";
import type { CsvSession } from "../../data/csvSession";
import type { Snapshot } from "../../domain/types";
export function CsvImport({
  session,
  timezone,
  onLoad,
  onClose,
}: {
  session: CsvSession;
  timezone: string;
  onLoad: (s: Snapshot) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(""),
    [headers, setHeaders] = useState<string[]>([]),
    [table, setTable] = useState<string[][]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<CsvPreview | null>(null);
  const [options, setOptions] = useState<CsvOptions>({
    account: "",
    scope: "",
    timezone,
    reportAsOf: "",
    mapping: {},
    statusMap: {},
    priorityMap: {},
    approvalMap: {},
    assignmentMap: {},
    redacted: false,
  });
  const invalidate = () => {
    setPreview(null);
    session.discardPreview();
    setError("");
  };
  const patch = (v: Partial<CsvOptions>) => {
    invalidate();
    setOptions((o) => ({ ...o, ...v }));
  };
  const enumFields = [
    {
      field: "status",
      key: "statusMap",
      values: [
        "open",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
        "unknown",
      ],
    },
    {
      field: "priority",
      key: "priorityMap",
      values: ["urgent", "high", "normal", "low", "unknown"],
    },
    {
      field: "approvalState",
      key: "approvalMap",
      values: ["pending", "approved", "not_required", "unknown"],
    },
    {
      field: "vendorAssignmentState",
      key: "assignmentMap",
      values: ["assigned", "unassigned", "unknown"],
    },
  ] as const;
  return (
    <Modal
      title="CSV import · preview & validation"
      onClose={() => {
        session.discardPreview();
        onClose();
      }}
    >
      <p>
        No verified Rentvine headers are supplied in this project. Map only
        columns present in your export to the documented application contract.
        Nothing is sent to a server. Use synthetic or approved redacted
        evaluation files only; operational access and storage are not
        implemented.
      </p>
      <label className="csv-attest">
        <input
          type="checkbox"
          disabled={busy}
          checked={options.redacted}
          onChange={(e) => patch({ redacted: e.target.checked })}
        />
        I confirm this file contains only synthetic or approved redacted data,
        including any mapped issue text. No tenant/contact details, private
        notes, credentials or access codes.
      </label>
      <label className="csv-upload">
        Choose UTF-8 CSV (comma-separated, maximum 2 MiB / 10,000 rows)
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={!options.redacted || busy}
          onChange={async (e) => {
            invalidate();
            setText("");
            setHeaders([]);
            setTable([]);
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > MAX_CSV_BYTES) {
              setError("CSV exceeds the 2 MiB limit.");
              return;
            }
            setBusy(true);
            try {
              const raw = new TextDecoder("utf-8", { fatal: true }).decode(
                await f.arrayBuffer(),
              );
              const parsed = parseCsv(raw);
              setText(raw);
              setHeaders(parsed[0]);
              setTable(parsed.slice(1));
              setOptions((o) => ({
                ...o,
                mapping: {},
                statusMap: {},
                priorityMap: {},
                approvalMap: {},
                assignmentMap: {},
              }));
            } catch {
              setError(
                "CSV could not be read. Check UTF-8 encoding, unique headers, quoted cells and consistent columns.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {headers.length > 0 && (
        <form
          className="csv-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const p = await session.preview(text, options);
              setPreview(p);
            } catch {
              setError("Preview failed. Existing records remain unchanged.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <legend>1 · Report provenance</legend>
            <div className="csv-meta-grid">
              <label>
                Source account identifier
                <input
                  required
                  value={options.account}
                  maxLength={100}
                  onChange={(e) => patch({ account: e.target.value })}
                />
              </label>
              <label>
                Report scope / comparison key
                <input
                  required
                  maxLength={500}
                  value={options.scope}
                  placeholder="Account, portfolio, export filters, date coverage"
                  onChange={(e) => patch({ scope: e.target.value })}
                />
              </label>
              <label>
                Report timezone (IANA)
                <input
                  required
                  value={options.timezone}
                  onChange={(e) => patch({ timezone: e.target.value })}
                />
              </label>
              <label>
                Report as of (optional ISO timestamp with offset)
                <input
                  value={options.reportAsOf}
                  placeholder="YYYY-MM-DDTHH:mm:ssZ"
                  onChange={(e) => patch({ reportAsOf: e.target.value })}
                />
              </label>
            </div>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>2 · Map actual source columns</legend>
            <p>
              Only stable ID is required. Leave unavailable fields unmapped. A
              blank vendor ID does not mean unassigned; map an explicit
              assignment state if supplied. Names without stable property IDs
              are not joined. Unmapped columns are discarded. Source links and
              arbitrary free-form notes are not imported.
            </p>
            <div className="csv-mapping-grid">
              {csvFields.map((field) => (
                <label key={field}>
                  {field === "sourceId"
                    ? "Stable work-order ID (required)"
                    : field === "summaryRedacted"
                      ? "Issue text (already redacted only)"
                      : field}
                  <select
                    value={options.mapping[field] ?? ""}
                    onChange={(e) =>
                      patch({
                        mapping: {
                          ...options.mapping,
                          [field]: e.target.value,
                        },
                        ...(field === "status"
                          ? { statusMap: {} }
                          : field === "priority"
                            ? { priorityMap: {} }
                            : field === "approvalState"
                              ? { approvalMap: {} }
                              : field === "vendorAssignmentState"
                                ? { assignmentMap: {} }
                                : {}),
                      })
                    }
                  >
                    <option value="">Not supplied / omit</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p>
              Dates must use YYYY-MM-DD or an ISO timestamp with an explicit
              offset. Date-only precision is preserved; invalid optional dates
              become Unknown with warnings.
            </p>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>3 · Review value mappings</legend>
            <p>
              No Rentvine statuses or priority values are assumed. Unmapped
              values stay Unknown; approval and assignment never derive from
              empty cells or descriptions.
            </p>
            <div className="csv-enum-grid">
              {enumFields.map(({ field, key, values }) => {
                const column = options.mapping[field as CsvField];
                const distinct = column
                  ? [
                      ...new Set(
                        table
                          .map((row) => row[headers.indexOf(column)].trim())
                          .filter(Boolean),
                      ),
                    ]
                  : [];
                return (
                  <div key={field}>
                    <h3>{field}</h3>
                    {distinct.length > 100 ? (
                      <p>
                        Too many distinct values. Check the selected column.
                      </p>
                    ) : (
                      distinct.map((raw) => (
                        <label key={raw}>
                          <span>{raw}</span>
                          <select
                            aria-label={`Map ${field}: ${raw}`}
                            value={options[key][raw] ?? "unknown"}
                            onChange={(e) =>
                              patch({
                                [key]: {
                                  ...options[key],
                                  [raw]: e.target.value,
                                },
                              })
                            }
                          >
                            {values.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))
                    )}
                    {!distinct.length && <p>No mapped values supplied.</p>}
                  </div>
                );
              })}
            </div>
          </fieldset>
          <button
            className="primary"
            disabled={busy || !options.redacted}
            type="submit"
          >
            {busy ? "Validating…" : "Validate & preview"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {preview && (
        <section className="csv-result" aria-label="CSV validation result">
          <h3>
            {preview.errors.length
              ? "Candidate rejected"
              : "Candidate ready for review"}
          </h3>
          {preview.errors.map((v, i) => (
            <p role="alert" key={i}>
              {v}
            </p>
          ))}
          <p>
            {preview.rows} candidate rows · current workspace unchanged until
            loaded
          </p>
          {preview.warnings.length > 0 && (
            <ul>
              {preview.warnings.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          )}
          {preview.snapshot && (
            <>
              <div
                className="table-scroll"
                role="region"
                aria-label="Normalized CSV preview"
                tabIndex={0}
              >
                <table>
                  <caption>First 5 normalized records · CSV only</caption>
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Assignment</th>
                      <th>Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.snapshot.workOrders.slice(0, 5).map((w) => (
                      <tr key={w.id}>
                        <td>{w.number}</td>
                        <td>{w.status}</td>
                        <td>{w.createdAt?.value ?? "Unknown"}</td>
                        <td>{w.vendorAssignmentState}</td>
                        <td>{w.approvalState}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                No demo records will be added. This replaces only the CSV
                evaluation snapshot in memory and resets Explorer filters.
                Reloading or clearing the session removes it.
              </p>
              <button
                className="primary"
                onClick={() => {
                  try {
                    const s = session.commit(preview.id);
                    onLoad(s);
                    onClose();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Load validated CSV session
              </button>
            </>
          )}
        </section>
      )}
    </Modal>
  );
}
