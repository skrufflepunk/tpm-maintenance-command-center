import type { Snapshot } from "../../domain/types";
import type { VendorDirectory } from "../../domain/vendors";
import { useWorkspace } from "../../data/workspace/context";
export function InsightSource({
  snapshot,
  directory,
  name,
}: {
  snapshot: Snapshot;
  directory: VendorDirectory | null;
  name: string;
}) {
  const {
    source,
    csv,
    selectSource,
    vendorSource,
    vendorCsv,
    selectVendorSource,
  } = useWorkspace();
  const data = snapshot.datasets.find((d) => d.datasetType === "workOrders")!;
  return (
    <>
      <section className="source-bar" aria-label={`${name} data source`}>
        <div>
          <strong>
            {source === "demo"
              ? "Fictional demo work orders"
              : "CSV evaluation · session only"}
          </strong>
          <p>
            Same selected work-order source as Explorer and Action Center ·
            independent page filters
          </p>
        </div>
        <label>
          {name} work-order source
          <select
            value={source}
            onChange={(e) => selectSource(e.target.value as "demo" | "csv")}
          >
            <option value="demo">Fictional demo</option>
            <option value="csv" disabled={!csv}>
              CSV work orders{" "}
              {csv ? `(${csv.workOrders.length})` : "(load in Explorer)"}
            </option>
          </select>
        </label>
        <label>
          {name} vendor directory
          <select
            value={vendorSource}
            onChange={(e) =>
              selectVendorSource(e.target.value as "demo" | "csv")
            }
          >
            <option value="demo">Fictional demo vendors</option>
            <option value="csv" disabled={!vendorCsv}>
              CSV vendors{" "}
              {vendorCsv
                ? `(${vendorCsv.vendors.length})`
                : "(load in Vendors)"}
            </option>
          </select>
        </label>
      </section>
      <div className="insight-provenance">
        <span>
          Work-order account {data.sourceAccountId} ·{" "}
          {data.reportScope.description} · coverage {data.completeness}
        </span>
        <span>
          Report as of {data.reportAsOf ?? "Unknown"} · loaded{" "}
          {snapshot.importedAt}
          {source === "demo" ? " (synthetic)" : ""} · {data.sourceTimezone}
          {!data.reportAsOf ? " · age uses labeled load-time fallback" : ""}
        </span>
        <span>
          Vendor directory:{" "}
          {directory
            ? `${directory.sourceMode} · account ${directory.dataset.sourceAccountId} · ${directory.dataset.reportScope.description} · report ${directory.dataset.reportAsOf ?? "Unknown"} · loaded ${directory.dataset.importedAt}${directory.sourceMode === "demo" ? " (synthetic)" : ""}`
            : "Unavailable"}
          . Names require verified scoped-ID relationships.
        </span>
      </div>
    </>
  );
}
