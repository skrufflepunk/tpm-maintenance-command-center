import { useState } from "react";
import type { Snapshot, WorkOrder } from "../../domain/types";
import type { Audience } from "../../domain/messageTemplates";
import { followUpTemplate } from "../../domain/messageTemplates";
export function MessageDraft({
  order,
  snapshot,
}: {
  order: WorkOrder;
  snapshot: Snapshot;
}) {
  const [audience, setAudience] = useState<Audience>("owner"),
    [drafts, setDrafts] = useState<Partial<Record<Audience, string>>>({}),
    [status, setStatus] = useState("");
  const content =
    drafts[audience] ?? followUpTemplate(order, snapshot, audience);
  return (
    <section className="message-draft" aria-label="Draft follow-up">
      <div className="draft-heading">
        <h3>Draft Follow-up</h3>
        <span className="chart-tag">Editable template · no AI / sending</span>
      </div>
      <p>
        No recipient names, addresses or contact records are collected. Verify
        the latest source facts and choose an appropriate recipient before using
        a draft.
      </p>
      <label>
        Draft for
        <select
          value={audience}
          onChange={(e) => {
            setAudience(e.target.value as Audience);
            setStatus("");
          }}
        >
          {(["owner", "tenant", "vendor"] as const).map((a) => (
            <option key={a} value={a}>
              {a[0].toUpperCase() + a.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Message draft
        <textarea
          value={content}
          rows={10}
          onChange={(e) => {
            setDrafts((v) => ({ ...v, [audience]: e.target.value }));
            setStatus("");
          }}
        />
      </label>
      <div className="draft-controls">
        <button
          className="primary"
          onClick={async () => {
            try {
              if (!navigator.clipboard?.writeText)
                throw new Error("unavailable");
              await navigator.clipboard.writeText(content);
              setStatus("Draft copied. Nothing was sent.");
            } catch {
              setStatus(
                "Clipboard unavailable. Select the draft and copy it manually; nothing was sent.",
              );
            }
          }}
        >
          Copy draft
        </button>
        <button
          className="text-button"
          onClick={() => {
            setDrafts((v) => ({
              ...v,
              [audience]: followUpTemplate(order, snapshot, audience),
            }));
            setStatus("Template restored for this recipient.");
          }}
        >
          Restore this recipient’s template
        </button>
      </div>
      <p role="status" className="draft-status">
        {status ||
          "Local draft only. No send action or external messaging integration."}
      </p>
      <p className="muted">
        Edits are retained per recipient while this detail view is open and are
        discarded when it closes. Drafts are not saved to browser storage or the
        source system.
      </p>
    </section>
  );
}
