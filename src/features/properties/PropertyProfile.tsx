import { PriorPropertyEvidence } from "./PriorPropertyEvidence";
import type { ObservationPair } from "../../domain/actions";
import { metricValue } from "../../domain/format";
import { useState } from "react";
import { Modal } from "../../components/ui";
import { age, isActive, matchesReason } from "../../domain/rules";
import { propertyClassifier } from "../../domain/insights";
import type { PropertyMetrics } from "../../domain/properties";
import { signalLabels } from "../../domain/properties";
import type { Rules, Snapshot } from "../../domain/types";
import type { VendorDirectory } from "../../domain/vendors";
import { DurationEvidence, CoverageNote } from "../insights/Metrics";
import { InsightRecords } from "../insights/InsightRecords";
import { resolvedVendorLabel } from "../insights/workspace";
export function PropertyProfile({
  metrics: m,
  snapshot,
  rules,
  reference,
  directory,
  compatible,
  pair,
  onClose,
  onOpen,
}: {
  metrics: PropertyMetrics;
  snapshot: Snapshot;
  rules: Rules;
  reference: string;
  directory: VendorDirectory | null;
  compatible: boolean;
  pair: ObservationPair | null;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const [group, setGroup] = useState("active");
  const classify = propertyClassifier(snapshot),
    available = snapshot.workOrders.filter((w) => classify(w) === m.key);
  const records =
    group === "active"
      ? available.filter(isActive)
      : group === "pending"
        ? available.filter((w) => matchesReason(w, "pending", reference, rules))
        : group === "aged"
          ? available.filter((w) => matchesReason(w, "aged", reference, rules))
          : group === "completed"
            ? available.filter((w) => w.status === "completed")
            : available;
  const vendors = new Map<string, { name: string; count: number }>();
  available
    .filter((w) => w.vendorAssignmentState === "assigned" && w.vendorId)
    .forEach((w) => {
      const id = w.vendorId!,
        current = vendors.get(id) ?? {
          name: resolvedVendorLabel(w, directory, compatible),
          count: 0,
        };
      current.count++;
      vendors.set(id, current);
    });
  return (
    <Modal title={`${m.name} · maintenance profile`} onClose={onClose}>
      <div className="insight-profile">
        <span className="demo-pill">
          {snapshot.sourceMode === "demo"
            ? "Fictional property profile"
            : "CSV property evidence"}
        </span>
        <dl className="record-details">
          {Object.entries({
            "Property ID": m.property?.sourceId ?? "Unknown relationship",
            Name: m.property?.displayName ?? "Unknown property",
            Address:
              m.property?.permittedAddress ??
              "Unavailable; no address supplied",
            "Directory coverage": m.property
              ? `${m.property.coverageKind} · ${m.property.provenance}`
              : "Unresolved property references; no property entity invented",
            "Scoped work orders": String(m.stats.total),
            "Known active backlog": String(m.stats.open),
            Completed: String(m.stats.completed),
            [`Older than ${rules.agingNudgeDays} days`]: String(m.stats.aged),
            "Pending owner approvals": String(m.stats.pending),
            "Explicitly unassigned": String(m.stats.unassigned),
            "Mean completion duration": `${metricValue(m.stats.mean, 1)}${m.stats.mean === null ? "" : ` ${m.stats.durationBasis}`}`,
          }).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <CoverageNote stats={m.stats} />
        <h3>Operational review signals · current filter scope</h3>
        <p>
          {m.signals.length
            ? m.signals.map((s) => signalLabels[s]).join(" · ")
            : "No configured review signal in this scope."}
        </p>
        <p className="muted">
          These are configurable counts, not property risk ratings. Unit count,
          occupancy and source completeness are unavailable.
        </p>
        <h3>Categories &amp; repeated observations</h3>
        {m.categories.length ? (
          <ul className="insight-count-list">
            {m.categories.map((c) => (
              <li key={c.key}>
                <span>{c.label}</span>
                <strong>
                  {c.rows.length} work orders
                  {m.repeated.some((r) => r.key === c.key)
                    ? " · repeated category threshold met"
                    : ""}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>No classified records in this scope.</p>
        )}
        <p className="muted">
          Repeated categories are separate work-order IDs in the selected
          report; they do not prove repeat failures, the same underlying issue
          or recurring service events.
        </p>
        <h3>Observed completion duration · current filter scope</h3>
        <DurationEvidence stats={m.stats} />
        <h3>Vendors on available report records</h3>
        {vendors.size ? (
          <ul className="insight-count-list">
            {[...vendors].map(([id, v]) => (
              <li key={id}>
                <span>{v.name}</span>
                <strong>{v.count} assigned records</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>No explicit assigned vendor IDs on available records.</p>
        )}
        <p className="insight-note">
          History below includes every available record for this property in the
          selected report, independent of directory work-order filters. It is
          not a complete lifetime history. Open a record in Explorer for any
          retained comparable-load evidence; visits, communications and
          appointment history remain unavailable.
        </p>
        <label className="insight-group-label">
          Property history group
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="active">Current known active backlog</option>
            <option value="all">Complete available report history</option>
            <option value="completed">Completed work orders</option>
            <option value="pending">Outstanding owner approvals</option>
            <option value="aged">Aging requests</option>
          </select>
        </label>
        <InsightRecords
          key={group}
          title="Property work orders"
          rows={records}
          snapshot={snapshot}
          rules={rules}
          reference={reference}
          directory={directory}
          compatible={compatible}
          onOpen={(id) => {
            onClose();
            onOpen(id);
          }}
        />
        <PriorPropertyEvidence
          pair={pair}
          propertyId={m.key}
          onOpen={(id) => {
            onClose();
            onOpen(id);
          }}
        />
        <p className="muted">
          {
            available.filter(
              (w) => isActive(w) && age(w, reference, rules) === null,
            ).length
          }{" "}
          active record ages unavailable across this property’s available
          history.
        </p>
      </div>
    </Modal>
  );
}
