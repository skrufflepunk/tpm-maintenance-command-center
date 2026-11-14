import type { Snapshot } from "../domain/types";
import type { VendorDirectory } from "../domain/vendors";
import type { PropertyDirectory } from "./propertyCsv";
export function emptyCsvWorkspace(
  directory: Pick<VendorDirectory, "id" | "dataset">,
): Snapshot {
  return {
    id: directory.id + ":no-work-orders",
    sourceMode: "csv",
    schemaVersion: "1",
    mappingVersion: "not-imported",
    rulesVersion: "demo-1",
    importedAt: directory.dataset.importedAt,
    datasets: [
      {
        ...directory.dataset,
        id: "work-orders-not-imported",
        datasetType: "workOrders",
        mappingVersion: "not-imported",
        reportAsOf: null,
        coverageFields: [],
        rowCounts: { accepted: 0, rejected: 0 },
        reportScope: {
          ...directory.dataset.reportScope,
          description:
            "Work-order report not imported; timestamp is directory workspace receipt only",
        },
      },
    ],
    workOrders: [],
    vendors: [],
    properties: [],
    categories: [],
    qualitySummary: [
      {
        code: "NOT_IMPORTED",
        severity: "warning",
        safeMessage: "No work-order report imported; workload is unavailable.",
      },
    ],
  };
}
export function composeCsvWorkspace(
  snapshot: Snapshot | null,
  vendors: VendorDirectory | null,
  properties: PropertyDirectory | null,
) {
  if (!snapshot) return null;
  const account = snapshot.datasets.find(
    (d) => d.datasetType === "workOrders",
  )!.sourceAccountId;
  const vendorAllowed =
    !!vendors &&
    vendors.sourceMode === "csv" &&
    vendors.dataset.sourceAccountId === account &&
    vendors.verifiedIdentifiers;
  const propertyAllowed =
    !!properties &&
    properties.dataset.sourceAccountId === account &&
    properties.verifiedIdentifiers;
  return reconcileCatalogQuality({
    ...snapshot,
    id:
      snapshot.id +
      `:${vendorAllowed ? vendors!.id : ""}:${propertyAllowed ? properties!.id : ""}`,
    vendors: vendorAllowed ? vendors!.vendors : [],
    properties: propertyAllowed
      ? [
          ...properties!.properties,
          ...snapshot.properties.filter(
            (p) => !properties!.properties.some((n) => n.id === p.id),
          ),
        ]
      : snapshot.properties,
    datasets: [
      ...snapshot.datasets.filter((d) => d.datasetType === "workOrders"),
      ...(vendorAllowed ? [vendors!.dataset] : []),
      ...(propertyAllowed ? [properties!.dataset] : []),
    ],
  });
}

/** Derived join quality changes when a separate directory arrives; source row facts remain unchanged. */
export function reconcileCatalogQuality(snapshot: Snapshot): Snapshot {
  if (!snapshot.datasets.some((d) => d.datasetType === "vendors"))
    return snapshot;
  const ids = new Set(snapshot.vendors.map((v) => v.id));
  const unmatched = snapshot.workOrders.filter(
    (w) =>
      w.vendorAssignmentState === "assigned" &&
      w.vendorId &&
      !ids.has(w.vendorId),
  ).length;
  return {
    ...snapshot,
    qualitySummary: [
      ...snapshot.qualitySummary.filter(
        (issue) =>
          !issue.safeMessage.startsWith("Vendor directory not supplied") &&
          issue.code !== "UNMATCHED_VENDOR_IDS",
      ),
      ...(unmatched
        ? [
            {
              code: "UNMATCHED_VENDOR_IDS",
              severity: "warning" as const,
              safeMessage: `${unmatched} assigned work-order references do not resolve to the supplied vendor directory; they are not unassigned.`,
            },
          ]
        : []),
    ],
  };
}
