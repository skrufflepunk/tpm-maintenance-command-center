import { expect, it } from "vitest";
import { demoSnapshot } from "./demo";
import {
  composeCsvWorkspace,
  emptyCsvWorkspace,
  reconcileCatalogQuality,
} from "./composeWorkspace";
import { demoDirectory } from "../domain/vendors";
it("keeps demo catalogs out of CSV state and reports an absent work-order dataset honestly", () => {
  const directory = {
    ...demoDirectory(demoSnapshot),
    sourceMode: "csv" as const,
  };
  const empty = emptyCsvWorkspace(directory);
  expect(empty.workOrders).toEqual([]);
  expect(empty.mappingVersion).toBe("not-imported");
  expect(
    composeCsvWorkspace(empty, demoDirectory(demoSnapshot), null)!.vendors,
  ).toEqual([]);
});
it("reconciles stale directory warnings after a verified catalog import without changing work-order source facts", () => {
  const s = structuredClone(demoSnapshot);
  s.qualitySummary = [
    {
      code: "CSV_0",
      severity: "warning",
      safeMessage:
        "Vendor directory not supplied; assigned IDs remain unresolved, not unassigned.",
    },
  ];
  const before = JSON.stringify(s.workOrders);
  expect(reconcileCatalogQuality(s).qualitySummary).toEqual([]);
  s.vendors = [];
  expect(reconcileCatalogQuality(s).qualitySummary[0].code).toBe(
    "UNMATCHED_VENDOR_IDS",
  );
  expect(JSON.stringify(s.workOrders)).toBe(before);
});
