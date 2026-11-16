import { useWorkspace } from "../../data/workspace/context";
import {
  demoDirectory,
  joinCompatible,
  vendorReferenceLabel,
} from "../../domain/vendors";
import type { Rules, Snapshot, WorkOrder } from "../../domain/types";
export function useInsightWorkspace(demo: Snapshot, rules: Rules) {
  const workspace = useWorkspace();
  const snapshot =
    workspace.source === "csv" && workspace.csv ? workspace.csv : demo;
  const directory =
    workspace.vendorSource === "csv"
      ? workspace.vendorCsv
      : demoDirectory(demo);
  const data = snapshot.datasets.find((d) => d.datasetType === "workOrders")!;
  return {
    ...workspace,
    snapshot,
    directory,
    data,
    reference: data.reportAsOf ?? snapshot.importedAt,
    rules: { ...rules, timezone: data.sourceTimezone },
    vendorCompatible: joinCompatible(directory, snapshot),
  };
}
export function resolvedVendorLabel(
  w: WorkOrder,
  directory: ReturnType<typeof useInsightWorkspace>["directory"],
  compatible: boolean,
) {
  return vendorReferenceLabel(w, directory, compatible);
}
