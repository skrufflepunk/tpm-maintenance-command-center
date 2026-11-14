import { describe, expect, it } from "vitest";
import { VendorCsvSession, previewVendorCsv } from "./vendorRepository";
import type { VendorImportOptions } from "./vendorRepository";
import { demoSnapshot } from "./demo";
import { previewCsv } from "./csv";
import { joinCompatible, vendorMetrics } from "../domain/vendors";
import { defaultRules } from "../config/rules";
const options = (): VendorImportOptions => ({
  account: "synthetic-account",
  scope: "redacted vendor report",
  timezone: "UTC",
  reportAsOf: "",
  mapping: {
    sourceId: "ID",
    displayName: "Name",
    categories: "Specialties",
    active: "Enabled",
    liabilityInsuranceExpiration: "Insurance",
  },
  activeMap: { yes: "active", no: "inactive" },
  categorySeparator: ";",
  redacted: true,
  verifiedIdentifiers: true,
});
const csv =
  "ID,Name,Specialties,Enabled,Insurance\nv1,Sample Only,Plumbing;HVAC,yes,2027-01-01\nv2,Other Demo,,unknown,invalid";
describe("explicit vendor CSV contract", () => {
  it("preserves supplied categories/type-independent specialty and missing/invalid coverage", async () => {
    const p = await previewVendorCsv(csv, options());
    expect(p.errors).toEqual([]);
    const [a, b] = p.directory!.vendors;
    expect(a.categories).toHaveLength(2);
    expect(a.active).toBe(true);
    expect(a.liabilityInsuranceExpiration?.precision).toBe("date");
    expect(b.active).toBeNull();
    expect(b.categories).toEqual([]);
    expect(b.liabilityInsuranceExpiration).toBeNull();
    expect(b.fieldCoverage).toMatchObject({
      active: "invalid",
      businessEmail: "column_unavailable",
      liabilityInsuranceExpiration: "invalid",
    });
    expect(p.warnings).toContain(
      "Unmapped active-state values remain Unknown.",
    );
  });
  it("requires explicit mappings, provenance, timezone and evaluation attestation", async () => {
    for (const change of [
      { mapping: {} },
      { account: "" },
      { scope: "" },
      { timezone: "" },
      { redacted: false },
      { reportAsOf: "2026-13-40" },
      { mapping: { sourceId: "ID", displayName: "ID" } },
      { mapping: { sourceId: "Nonexistent" } },
      { activeMap: { yes: "active", YES: "inactive" } },
    ] as Partial<VendorImportOptions>[]) {
      const p = await previewVendorCsv(csv, { ...options(), ...change });
      expect(p.directory).toBeNull();
      expect(p.errors).toHaveLength(1);
    }
  });
  it("rejects duplicate or blank IDs and malformed structure atomically", async () => {
    for (const input of [
      "ID,Name\na,A\na,B",
      "ID,Name\n,A",
      "ID,ID\na,a",
      "ID,Name\na,A,extra",
      'ID,Name\na,"Unclosed',
    ]) {
      expect(
        (
          await previewVendorCsv(input, {
            ...options(),
            mapping: { sourceId: "ID", displayName: "Name" },
          })
        ).directory,
      ).toBeNull();
    }
  });
  it("validates optional contacts and dates safely and treats cell text literally", async () => {
    const p = await previewVendorCsv(
      "ID,Email,Phone,Date,Name\nx,invalid-email,https://wrong,2026-02-30,=SUM(A1)",
      {
        ...options(),
        mapping: {
          sourceId: "ID",
          businessEmail: "Email",
          businessPhone: "Phone",
          liabilityInsuranceExpiration: "Date",
          displayName: "Name",
        },
      },
    );
    const v = p.directory!.vendors[0];
    expect(v.businessEmail).toBeNull();
    expect(v.businessPhone).toBeNull();
    expect(v.liabilityInsuranceExpiration).toBeNull();
    expect(v.displayName).toBe("=SUM(A1)");
    expect(p.warnings.length).toBeGreaterThan(2);
  });
  it("joins only confirmed scoped IDs across CSV sources and never mutates the demo", async () => {
    const before = JSON.stringify(demoSnapshot),
      p = await previewVendorCsv(csv, options());
    const work = await previewCsv("ID,Vendor,Status\nw1,v1,Open", {
      account: "synthetic-account",
      scope: "wo",
      timezone: "UTC",
      reportAsOf: "",
      mapping: { sourceId: "ID", vendorId: "Vendor", status: "Status" },
      statusMap: { open: "open" },
      priorityMap: {},
      assignmentMap: {},
      approvalMap: {},
      redacted: true,
    });
    expect(joinCompatible(p.directory, work.snapshot!)).toBe(true);
    expect(
      vendorMetrics(
        p.directory!.vendors[0],
        work.snapshot!,
        true,
        work.snapshot!.importedAt,
        defaultRules,
      ).active,
    ).toBe(1);
    expect(
      joinCompatible(
        { ...p.directory!, verifiedIdentifiers: false },
        work.snapshot!,
      ),
    ).toBe(false);
    expect(joinCompatible(p.directory, demoSnapshot)).toBe(false);
    expect(JSON.stringify(demoSnapshot)).toBe(before);
  });
});
describe("memory-only transactional vendor adapter", () => {
  it("rejects failed/stale previews, protects defensive copies and makes replay idempotent", async () => {
    const s = new VendorCsvSession(),
      p = await s.previewImport(csv, options()),
      a = s.commitImport(p.id);
    a.vendors[0].displayName = "edited returned object";
    expect(s.getDirectory()!.vendors[0].displayName).toBe("Sample Only");
    const replay = await s.previewImport(csv, options());
    expect(s.commitImport(replay.id).id).toBe(a.id);
    const stale = await s.previewImport(csv, options());
    const invalid = await s.previewImport("not a csv", options());
    expect(() => s.commitImport(stale.id)).toThrow();
    expect(() => s.commitImport(invalid.id)).toThrow();
    expect(s.getDirectory()!.id).toBe(a.id);
    const altered = await s.previewImport(csv, options());
    altered.directory!.vendors = [];
    expect(s.commitImport(altered.id).vendors).toHaveLength(2);
  });
  it("retains removed-ID evidence only for comparable scopes; no fabricated inactive rows", async () => {
    const s = new VendorCsvSession(),
      p = await s.previewImport(csv, options());
    s.commitImport(p.id);
    const next = await s.previewImport(
      "ID,Name,Specialties,Enabled,Insurance\nv1,Sample Only,Plumbing;HVAC,yes,2027-01-01",
      { ...options(), reportAsOf: "2026-11-14T00:00:00Z" },
    );
    expect(s.commitImport(next.id).vendors).toHaveLength(1);
    expect(s.missingSincePrior()).toHaveLength(1);
    const scoped = await s.previewImport(csv, {
      ...options(),
      scope: "different",
    });
    s.commitImport(scoped.id);
    expect(s.missingSincePrior()).toEqual([]);
    s.clear();
    expect(s.getDirectory()).toBeNull();
    expect(() => s.commitImport(scoped.id)).toThrow();
  });
});
