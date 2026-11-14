import type { Snapshot } from "../../domain/types";
import type { InsightFilters as Filters } from "../../domain/insights";
import { validDateRange } from "../../domain/insights";
import type { VendorDirectory } from "../../domain/vendors";
import { resolvedVendorLabel } from "./workspace";
export function InsightFilters({
  name,
  snapshot,
  directory,
  compatible,
  value,
  onChange,
}: {
  name: string;
  snapshot: Snapshot;
  directory: VendorDirectory | null;
  compatible: boolean;
  value: Filters;
  onChange: (value: Filters) => void;
}) {
  const update = (key: keyof Filters, next: string) =>
    onChange({ ...value, [key]: next });
  const vendorMap = new Map<string, string>();
  snapshot.workOrders.forEach((w) => {
    if (w.vendorAssignmentState === "assigned" && w.vendorId)
      vendorMap.set(w.vendorId, resolvedVendorLabel(w, directory, compatible));
  });
  return (
    <section
      className="filter-panel insight-filter-panel"
      aria-label={`${name} work-order filters`}
    >
      <div className="insight-filter-grid">
        <label>
          {name} property
          <select
            value={value.property}
            onChange={(e) => update("property", e.target.value)}
          >
            <option value="">All properties</option>
            {snapshot.properties.map((p) => (
              <option value={p.id} key={p.id}>
                {p.displayName}
              </option>
            ))}
            <option value="unknown">Unknown property relationships</option>
          </select>
        </label>
        <label>
          {name} vendor
          <select
            value={value.vendor}
            onChange={(e) => update("vendor", e.target.value)}
          >
            <option value="">All assignments</option>
            {[...vendorMap].map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
            <option value="unassigned">Explicitly unassigned</option>
            <option value="unknown">Unknown assignment</option>
          </select>
        </label>
        <label>
          {name} category
          <select
            value={value.category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">All categories</option>
            {snapshot.categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.label}
              </option>
            ))}
            <option value="unknown">Unknown category</option>
          </select>
        </label>
        <label>
          {name} date basis
          <select
            value={value.dateBasis}
            onChange={(e) => update("dateBasis", e.target.value)}
          >
            <option value="created">Created-date cohort</option>
            <option value="completed">Completed-date cohort</option>
          </select>
        </label>
        <label>
          {name} date from
          <input
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => update("from", e.target.value)}
          />
        </label>
        <label>
          {name} date to
          <input
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => update("to", e.target.value)}
          />
        </label>
      </div>
      <p className="insight-filter-note">
        Date limits use the selected record cohort; missing dates are excluded
        when a limit is set. Completion-date cohorts require explicit completed
        status. Filters combine with AND.
      </p>
      {!validDateRange(value) && (
        <p role="alert" className="error">
          Use valid dates with From on or before To.
        </p>
      )}
    </section>
  );
}
