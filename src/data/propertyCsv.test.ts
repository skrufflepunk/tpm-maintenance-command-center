import { it, expect } from "vitest";
import { previewPropertyCsv } from "./propertyCsv";
const options = {
  account: "synthetic-account",
  scope: "property-master",
  timezone: "UTC",
  reportAsOf: "",
  redacted: true,
  verifiedIdentifiers: true,
  mapping: {
    sourceId: "Key",
    displayName: "Label",
    permittedAddress: "Address",
  },
};
it("maps verified property IDs and optional addresses without importing unrelated columns", async () => {
  const result = await previewPropertyCsv(
    "Key,Label,Address,PrivateNotes\np1,Synthetic House,Synthetic address omitted,DO NOT IMPORT\np2,,,omitted",
    options,
  );
  expect(result.errors).toEqual([]);
  expect(result.directory!.properties[0]).toMatchObject({
    sourceId: "p1",
    displayName: "Synthetic House",
    coverageKind: "master",
  });
  expect(JSON.stringify(result)).not.toContain("DO NOT IMPORT");
  expect(result.directory!.properties[1].permittedAddress).toBeNull();
});
it("rejects duplicate/missing IDs, reused columns, invalid timezone/date and missing approval", async () => {
  for (const [raw, patch] of [
    ["Key,Label,Address\np1,A,\np1,B,", {}],
    ["Key,Label,Address\n,A,", {}],
    [
      "Key,Label,Address\np1,A,",
      { mapping: { sourceId: "Key", displayName: "Key" } },
    ],
    ["Key,Label,Address\np1,A,", { timezone: "invalid-zone" }],
    ["Key,Label,Address\np1,A,", { reportAsOf: "2026-02-30" }],
    ["Key,Label,Address\np1,A,", { redacted: false }],
  ] as [string, Partial<typeof options>][])
    expect(
      (await previewPropertyCsv(raw, { ...options, ...patch })).errors,
    ).toHaveLength(1);
});
it("keeps unverified directories separate and preserves unknown source timestamps", async () => {
  const result = await previewPropertyCsv("Key,Label,Address\np1,A,", {
    ...options,
    verifiedIdentifiers: false,
  });
  expect(result.directory!.verifiedIdentifiers).toBe(false);
  expect(result.directory!.dataset.reportAsOf).toBeNull();
  expect(result.warnings).toHaveLength(1);
});
