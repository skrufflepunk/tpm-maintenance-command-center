import { useState } from "react";
import { vendorPurposes, vendorTemplate } from "../../domain/vendorTemplates";
import type { VendorPurpose } from "../../domain/vendorTemplates";
import type { Rules, Snapshot, WorkOrder } from "../../domain/types";
import { age } from "../../domain/rules";
export function VendorDraft({
  rows,
  snapshot,
  reference,
  rules,
}: {
  rows: WorkOrder[];
  snapshot: Snapshot;
  reference: string;
  rules: Rules;
}) {
  const [orderId, setOrderId] = useState(rows[0]?.id ?? ""),
    [purpose, setPurpose] = useState<VendorPurpose>("status"),
    [edits, setEdits] = useState<Record<string, string>>({}),
    [status, setStatus] = useState("");
  const order = rows.find((w) => w.id === orderId),
    key = `${orderId}:${purpose}`;
  const eligible =
    !!order &&
    (purpose !== "aging" ||
      (age(order, reference, rules) ?? -1) > rules.agingNudgeDays);
  const template = order ? vendorTemplate(order, snapshot, purpose) : "",
    text = edits[key] ?? template;
  return (
    <section className="message-draft" aria-label="Vendor contact draft">
      <div className="draft-heading">
        <h3>Vendor contact draft</h3>
        <span className="chart-tag">Editable template · no AI / sending</span>
      </div>
      <p>
        Copy only. No appointment, estimate, response or commitment is assumed.
        Edits are local to this open profile and discarded on close or source
        change.
      </p>
      {!rows.length ? (
        <p className="empty-inline">
          No verified current assignments available for a draft.
        </p>
      ) : (
        <>
          <div className="vendor-import-grid">
            <label>
              Draft work order
              <select
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setStatus("");
                }}
              >
                {rows.map((w) => (
                  <option value={w.id} key={w.id}>
                    {w.number}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Draft purpose
              <select
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value as VendorPurpose);
                  setStatus("");
                }}
              >
                {Object.entries(vendorPurposes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!eligible ? (
            <p className="empty-inline">
              This record does not meet the configured aging rule. Choose
              another draft purpose or eligible record.
            </p>
          ) : (
            <>
              <label>
                Vendor message draft
                <textarea
                  rows={9}
                  value={text}
                  onChange={(e) => {
                    setEdits((v) => ({ ...v, [key]: e.target.value }));
                    setStatus("");
                  }}
                />
              </label>
              <div className="draft-controls">
                <button
                  className="primary"
                  onClick={async () => {
                    try {
                      if (!navigator.clipboard?.writeText) throw new Error();
                      await navigator.clipboard.writeText(text);
                      setStatus("Draft copied. Nothing was sent.");
                    } catch {
                      setStatus(
                        "Clipboard unavailable. Select and copy the text manually; nothing was sent.",
                      );
                    }
                  }}
                >
                  Copy vendor draft
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setEdits((v) => ({ ...v, [key]: template }));
                    setStatus("Template restored.");
                  }}
                >
                  Restore vendor template
                </button>
              </div>
            </>
          )}
        </>
      )}
      <p role="status" className="draft-status">
        {status ||
          "Local draft only. No send action or external messaging integration."}
      </p>
    </section>
  );
}
