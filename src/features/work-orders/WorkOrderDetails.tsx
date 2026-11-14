import type { ReactNode } from "react";
import { verifiedRecordUrl } from "../../config/sourceLinks";
import type { Rules, Snapshot, WorkOrder } from "../../domain/types";
import type { SessionHistory } from "../../data/csvSession";
import { age, isActive, label, reasons } from "../../domain/rules";
import { reasonNames } from "../../domain/labels";
import { Modal } from "../../components/ui";
export function WorkOrderDetails({
  order: w,
  snapshot,
  rules,
  reference,
  history,
  onClose,
  children,
}: {
  order: WorkOrder;
  snapshot: Snapshot;
  rules: Rules;
  reference: string;
  history: SessionHistory;
  onClose: () => void;
  children?: ReactNode;
}) {
  const sourceUrl = verifiedRecordUrl(w.sourceUrl);
  const date = (v: WorkOrder["createdAt"]) =>
    v ? `${v.value} (${v.precision} precision)` : "Unknown";
  const fields = {
    Number: w.number,
    "Source account": w.sourceAccountId,
    "Source ID": w.sourceId,
    "Internal scoped ID": w.id,
    Property:
      snapshot.properties.find((p) => p.id === w.propertyId)?.displayName ??
      "Unknown property",
    "Property ID": w.propertyId ?? "Unknown",
    Unit: w.unitLabel ?? "Unknown",
    "Issue description": w.summaryRedacted ?? "Unavailable / omitted",
    Status: label(w.status),
    "Original source status": w.sourceStatus ?? "Unknown",
    Priority: label(w.priority),
    "Original source priority": w.sourcePriority ?? "Unknown",
    Category:
      snapshot.categories.find((c) => c.id === w.categoryId)?.label ??
      "Unknown",
    Vendor:
      snapshot.vendors.find((v) => v.id === w.vendorId)?.displayName ??
      (w.vendorAssignmentState === "unassigned"
        ? "Explicitly unassigned"
        : w.vendorId
          ? "Unresolved source vendor ID"
          : "Unknown"),
    "Vendor ID": w.vendorId ?? "Unknown",
    "Assignment state": label(w.vendorAssignmentState),
    "Owner approval": label(w.approvalState),
    Created: date(w.createdAt),
    Completed: date(w.completedAt),
    "Source updated": date(w.sourceUpdatedAt ?? null),
    Age: isActive(w)
      ? age(w, reference, rules) === null
        ? "Unknown"
        : `${age(w, reference, rules)} calendar days`
      : "Not applicable",
    "Follow-up reasons":
      reasons(w, reference, rules)
        .map((r) => reasonNames[r])
        .join(" · ") || "No eligible follow-up",
    Provenance: `${w.provenance} · ${snapshot.id}`,
  };
  return (
    <Modal title={w.number} onClose={onClose}>
      <span className="demo-pill">
        {snapshot.sourceMode === "demo"
          ? "Fictional work order"
          : "CSV evaluation record · session only"}
      </span>
      <h3 className="detail-title">Read-only work order details</h3>
      <dl className="record-details">
        {Object.entries(fields)
          .filter(
            ([key]) =>
              !children ||
              [
                "Property",
                "Vendor",
                "Status",
                "Priority",
                "Owner approval",
                "Created",
                "Completed",
                "Age",
              ].includes(key),
          )
          .map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {children}
      {children && (
        <details>
          <summary>All normalized source fields</summary>
          <dl className="record-details">
            {Object.entries(fields).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      <details>
        <summary>Field coverage</summary>
        <dl className="record-details">
          {Object.entries(w.fieldCoverage).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{label(value)}</dd>
            </div>
          ))}
        </dl>
      </details>
      <section className="record-history">
        <h3>Available dates & maintenance history</h3>
        <p>
          Created: {date(w.createdAt)}. Completed: {date(w.completedAt)}. Source
          updated: {date(w.sourceUpdatedAt ?? null)}.
        </p>
        <p>{history.reason}</p>
        {history.newIds.includes(w.id) && (
          <p>
            First observed in the latest comparable CSV snapshot; not
            necessarily newly created.
          </p>
        )}
        {history.changes
          .filter((c) => c.id === w.id)
          .map((c, i) => (
            <p key={i}>
              <strong>{c.field}</strong>: {c.before} → {c.after}
              <br />
              Detected at {c.detectedAt} · session observation only
            </p>
          ))}
        <p>
          No notes, visits, messages, approval-request dates or assignment
          events are supplied. Approval waiting duration is unavailable; pending
          highlights require an explicit pending state.
        </p>
      </section>
      <div className="source-link-action">
        {sourceUrl ? (
          <a
            className="outline-button"
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Rentvine
          </a>
        ) : (
          <>
            <button
              className="outline-button"
              disabled
              aria-describedby="rentvine-unavailable"
            >
              Open in Rentvine
            </button>
            <p id="rentvine-unavailable" className="muted">
              Rentvine link unavailable: no verified source URL and permitted
              HTTPS origin are configured.
            </p>
          </>
        )}
        <p className="muted">
          Viewing details does not change records or send messages.
        </p>
      </div>
    </Modal>
  );
}
