import { useState, useRef } from "react";
import { Modal } from "../../components/ui";
import { MAX_CSV_BYTES, parseCsv } from "../../data/csv";
import { vendorFields } from "../../data/vendorRepository";
import type {
  VendorCsvSession,
  VendorField,
  VendorImportOptions,
  VendorPreview,
} from "../../data/vendorRepository";
import type { VendorDirectory } from "../../domain/vendors";
const vendorFieldLabels: Record<VendorField, string> = {
  sourceId: "Vendor ID",
  displayName: "Vendor name",
  vendorType: "Vendor type",
  categories: "Vendor Maintenance Categories",
  businessEmail: "Business email",
  businessPhone: "Business phone",
  active: "Active status",
  state: "State",
  liabilityInsuranceExpiration: "Liability insurance expiration",
};
export function VendorImport({
  session,
  onLoad,
  onClose,
}: {
  session: VendorCsvSession;
  onLoad: (directory: VendorDirectory) => void | Promise<void>;
  onClose: () => void | Promise<void>;
}) {
  const revision = useRef(0);
  const [input, setInput] = useState(""),
    [parsed, setParsed] = useState<string[][]>([]),
    [preview, setPreview] = useState<VendorPreview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<VendorImportOptions>({
    account: "",
    scope: "",
    timezone: "",
    reportAsOf: "",
    mapping: {},
    activeMap: {},
    categorySeparator: ";",
    redacted: false,
    verifiedIdentifiers: false,
  });
  const update = (patch: Partial<VendorImportOptions>) => {
    revision.current++;
    session.discardPreview();
    setOptions((o) => ({ ...o, ...patch }));
    setPreview(null);
    setError("");
  };
  const activeHeader = options.mapping.active;
  const activeValues = activeHeader
    ? [
        ...new Set(
          parsed
            .slice(1)
            .map((r) => r[parsed[0].indexOf(activeHeader)]?.trim())
            .filter(Boolean),
        ),
      ]
    : [];
  return (
    <Modal
      title="Import vendor CSV · isolated evaluation"
      onClose={() => {
        revision.current++;
        session.discardPreview();
        onClose();
      }}
    >
      <p>
        Headers below are your file’s actual headers. No exact Rentvine export
        schema is assumed. Only mapped fields enter this session. A stable
        Vendor ID is required; names never create joins.
      </p>
      <p className="muted">
        Use only approved minimized records. Only mapped fields are saved to this browser profile;
        local data and backups are not encrypted. Nothing is uploaded. Browser storage may be unavailable in some frames.
      </p>
      <label className="vendor-attest">
        <input
          type="checkbox"
          checked={options.redacted}
          onChange={(e) => update({ redacted: e.target.checked })}
        />{" "}
        This file contains only synthetic or approved redacted evaluation data,
        without private contacts.
      </label>
      <label className="vendor-file">
        Vendor CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={!options.redacted || busy}
          onChange={async (e) => {
            const fileRevision = ++revision.current;
            session.discardPreview();
            setPreview(null);
            setError("");
            setInput("");
            setParsed([]);
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > MAX_CSV_BYTES)
                throw new Error("CSV exceeds 2 MiB.");
              const text = new TextDecoder("utf-8", { fatal: true }).decode(
                await file.arrayBuffer(),
              );
              const data = parseCsv(text);
              if (fileRevision !== revision.current) return;
              setInput(text);
              setParsed(data);
              setOptions((o) => ({ ...o, mapping: {}, activeMap: {} }));
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Cannot read file.",
              );
            }
          }}
        />
      </label>
      <div className="vendor-import-grid">
        <label>
          Vendor source account
          <input
            value={options.account}
            maxLength={100}
            onChange={(e) => update({ account: e.target.value })}
          />
        </label>
        <label>
          Vendor report scope
          <input
            value={options.scope}
            maxLength={500}
            onChange={(e) => update({ scope: e.target.value })}
          />
        </label>
        <label>
          Vendor source timezone
          <input
            placeholder="e.g. America/Los_Angeles"
            value={options.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
          />
        </label>
        <label>
          Vendor report time (optional ISO offset)
          <input
            placeholder="Unknown if omitted"
            value={options.reportAsOf}
            onChange={(e) => update({ reportAsOf: e.target.value })}
          />
        </label>
      </div>
      <label className="vendor-attest">
        <input
          type="checkbox"
          checked={options.verifiedIdentifiers}
          onChange={(e) => update({ verifiedIdentifiers: e.target.checked })}
        />{" "}
        I verified Vendor ID uses the same identifier namespace as the selected
        work-order report. Joins also require the same source account and CSV
        mode.
      </label>
      {!!parsed.length && (
        <>
          <h3>Explicit column mapping</h3>
          <div className="vendor-import-grid">
            {vendorFields.map((field) => (
              <label key={field}>
                {vendorFieldLabels[field]}
                <select
                  value={options.mapping[field] ?? ""}
                  onChange={(e) =>
                    update({
                      mapping: { ...options.mapping, [field]: e.target.value },
                      ...(field === "active" ? { activeMap: {} } : {}),
                    })
                  }
                >
                  <option value="">Not supplied</option>
                  {parsed[0].map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Specialty value separator
              <select
                value={options.categorySeparator}
                onChange={(e) =>
                  update({
                    categorySeparator: e.target
                      .value as VendorImportOptions["categorySeparator"],
                  })
                }
              >
                <option value=";">Semicolon (;)</option>
                <option value="|">Pipe (|)</option>
                <option value=",">Comma (,)</option>
              </select>
            </label>
          </div>
          {!!activeValues.length && (
            <fieldset>
              <legend>Review each supplied active-state value</legend>
              <div className="vendor-import-grid">
                {activeValues.map((value) => (
                  <label key={value}>
                    Map active value: {value}
                    <select
                      value={options.activeMap[value] ?? "unknown"}
                      onChange={(e) =>
                        update({
                          activeMap: {
                            ...options.activeMap,
                            [value]: e.target.value as
                              "active" | "inactive" | "unknown",
                          },
                        })
                      }
                    >
                      <option value="unknown">Unknown</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}
      <div className="draft-controls">
        <button
          className="primary"
          disabled={!input || !options.redacted || busy}
          onClick={async () => {
            const candidateRevision = revision.current;
            setBusy(true);
            setError("");
            try {
              const candidate = await session.previewImport(input, options);
              if (candidateRevision === revision.current) setPreview(candidate);
            } catch {
              setError("Validation failed. Existing directory retained.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Validating…" : "Validate vendor preview"}
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {preview && (
        <section aria-label="Vendor import preview" aria-live="polite">
          <h3>
            {preview.rows} vendor rows ·{" "}
            {preview.errors.length ? "Rejected" : "Ready for review"}
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
          {preview.directory && (
            <>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Vendor preview rows"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Vendor ID</th>
                      <th>Name</th>
                      <th>Specialties</th>
                      <th>Active state</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.directory.vendors.slice(0, 5).map((v) => (
                      <tr key={v.id}>
                        <td>{v.sourceId}</td>
                        <td>{v.displayName || "Not recorded"}</td>
                        <td>
                          {v.categories
                            .map(
                              (id) =>
                                preview.directory!.categories.find(
                                  (c) => c.id === id,
                                )?.label,
                            )
                            .join(", ") || "Unavailable"}
                        </td>
                        <td>
                          {v.active === null
                            ? "Unknown"
                            : v.active
                              ? "Active"
                              : "Inactive"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Preview: first five rows. Loading replaces the CSV vendor
                directory only; work orders and demo fixtures remain separate.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onLoad(session.commitImport(preview.id));
                    onClose();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Load failed; previous data retained.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Load validated vendor session
              </button>
            </>
          )}
        </section>
      )}
    </Modal>
  );
}
