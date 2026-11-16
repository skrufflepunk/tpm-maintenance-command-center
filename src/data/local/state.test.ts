import { describe, it, expect } from "vitest";
import { savedReport, mappedCsv } from "./reports";
import {
  emptyLocalState,
  exportBackup,
  restoreBackup,
  validateLocalState,
  materializeReport,
  localText,
  MAX_LOCAL_BYTES,
} from "./state";
import type { CsvOptions } from "../csv";
import { CsvSession } from "../csvSession";
const options: CsvOptions = {
  account: "synthetic-static",
  scope: "reviewed-work-report",
  timezone: "UTC",
  reportAsOf: "2026-11-13T14:00:00Z",
  mapping: {
    sourceId: "ID",
    number: "Number",
    status: "Status",
    createdAt: "Created",
  },
  statusMap: { Open: "open", Completed: "completed" },
  priorityMap: {},
  approvalMap: {},
  assignmentMap: {},
  redacted: true,
};
const input =
  "ID,Number,Status,Created,UnmappedNotes\n1,SYNTH-STATIC-1,Open,2026-11-01,DO NOT RETAIN\n2,SYNTH-STATIC-2,Completed,2026-11-02,DO NOT RETAIN";
const state = () => ({
  ...emptyLocalState(),
  source: "csv" as const,
  work: savedReport("workOrders", input, options, "saved-observation"),
});
async function signed(payload: unknown) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return JSON.stringify({
    format: "tpm-static-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    checksum: Array.from(new Uint8Array(bytes))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join(""),
    payload,
  });
}
describe("browser-local backup validation and data integrity", () => {
  it("retains only mapped columns, including quoted text, independently of mapping key order", () => {
    expect(mappedCsv(input, options)).not.toContain("DO NOT RETAIN");
    expect(mappedCsv(input, options)).not.toContain("UnmappedNotes");
    expect(
      mappedCsv(input, {
        ...options,
        mapping: {
          createdAt: "Created",
          status: "Status",
          number: "Number",
          sourceId: "ID",
        },
      }),
    ).toBe(mappedCsv(input, options));
    const quoted = 'ID,Number\n1,"Line one\nLine, two"';
    expect(
      mappedCsv(quoted, {
        ...options,
        mapping: { sourceId: "ID", number: "Number" },
      }),
    ).toBe(quoted);
  });
  it("round trips through CSV validation without changing source values, IDs or receipt times", async () => {
    const original = state(),
      restored = await restoreBackup(await exportBackup(original));
    expect(restored).toEqual(original);
    const result = await materializeReport(restored.work!);
    expect(result.snapshot!.workOrders.map((w) => w.number)).toEqual([
      "SYNTH-STATIC-1",
      "SYNTH-STATIC-2",
    ]);
    expect(result.snapshot!.importedAt).toBe(original.work.receivedAt);
    expect(result.snapshot!.id).toBe("saved-observation");
  });
  it("rejects malformed files, unsupported versions, unknown fields and checksum changes before replacement", async () => {
    await expect(restoreBackup("not json")).rejects.toThrow(/JSON/);
    const backup = JSON.parse(await exportBackup(state()));
    backup.payload.source = "demo";
    await expect(restoreBackup(JSON.stringify(backup))).rejects.toThrow(
      /integrity/,
    );
    backup.version = 500;
    await expect(restoreBackup(JSON.stringify(backup))).rejects.toThrow(
      /version/,
    );
    await expect(
      restoreBackup(
        await signed({ ...state(), injectedNormalizedRecords: [] }),
      ),
    ).rejects.toThrow(/Unsupported fields/);
    await expect(
      restoreBackup(
        await signed(
          JSON.parse(
            JSON.stringify(state()).replace(
              '"version":1',
              '"__proto__":{},"version":1',
            ),
          ),
        ),
      ),
    ).rejects.toThrow(/Unsupported fields/);
  });
  it("does not trust a valid checksum when the backup includes invalid/duplicate report records", async () => {
    const invalid = state();
    invalid.work.input = invalid.work.input.replace(
      "2,SYNTH-STATIC-2",
      "1,SYNTH-STATIC-2",
    );
    await expect(restoreBackup(await signed(invalid))).rejects.toThrow(
      /CSV validation/,
    );
    const extra = state();
    extra.work.input = input;
    await expect(restoreBackup(await signed(extra))).rejects.toThrow(
      /unmapped/,
    );
  });
  it("keeps unknown statuses and invalid optional dates unknown rather than inventing facts", async () => {
    const original = state();
    original.work = savedReport(
      "workOrders",
      input.replace("Open,2026-11-01", "Unverified,bad"),
      options,
      "unknown-observation",
    );
    const result = await materializeReport(
      (await restoreBackup(await exportBackup(original))).work!,
    );
    expect(result.snapshot!.workOrders[0]).toMatchObject({
      status: "unknown",
      createdAt: null,
      vendorAssignmentState: "unknown",
    });
  });
  it("rejects mismatched accounts, future receipts and malformed configuration", async () => {
    const original = state();
    const vendor = savedReport(
      "vendors",
      "ID,Name\nv1,Synthetic vendor",
      {
        account: "another-account",
        scope: "vendors",
        timezone: "UTC",
        reportAsOf: "",
        redacted: true,
        mapping: { sourceId: "ID", displayName: "Name" },
        activeMap: {},
        categorySeparator: ";",
        verifiedIdentifiers: true,
      },
      "vendor-observation",
    );
    await expect(validateLocalState({ ...original, vendor })).rejects.toThrow(
      /different accounts/,
    );
    await expect(
      validateLocalState({
        ...original,
        work: { ...original.work, receivedAt: "2099-01-01T00:00:00.000Z" },
      }),
    ).rejects.toThrow(/future/);
    await expect(
      validateLocalState({
        ...original,
        rules: { ...original.rules, agingNudgeDays: -1 },
      }),
    ).rejects.toThrow();
    await expect(
      validateLocalState({
        ...original,
        review: { ...original.review, scorecardMeasures: [] },
      }),
    ).rejects.toThrow();
    await expect(
      validateLocalState({ ...original, rules: { timezone: "UTC" } }),
    ).rejects.toThrow();
  });
  it("enforces per-report, total workspace and history limits", async () => {
    expect(() =>
      localText({
        ...state(),
        work: { ...state().work, input: "x".repeat(MAX_LOCAL_BYTES) },
      }),
    ).toThrow(/12 MiB/);
    await expect(
      restoreBackup("x".repeat(MAX_LOCAL_BYTES + 4097)),
    ).rejects.toThrow(/12 MiB/);
    await expect(
      validateLocalState({
        ...state(),
        history: Array.from({ length: 51 }, () => ({
          kind: "workOrders",
          at: new Date().toISOString(),
          outcome: "accepted",
          rows: 2,
        })),
      }),
    ).rejects.toThrow(/50/);
  });
  it("restores compatible prior observations and prevents replay from fabricating another observation", async () => {
    const first = new CsvSession();
    const a = await first.preview(input, options);
    first.commit(a.id);
    const b = await first.preview(
      input.replace("1,SYNTH-STATIC-1,Open", "1,SYNTH-STATIC-1,Completed"),
      options,
    );
    first.commit(b.id);
    const restored = await restoreBackup(
      await exportBackup({
        ...emptyLocalState(),
        source: "csv",
        work: first.getReport(),
        priorWork: first.getPriorReport(),
      }),
    );
    const current = await materializeReport(restored.work!),
      previous = await materializeReport(restored.priorWork!);
    const session = new CsvSession();
    session.hydrate(
      current.snapshot!,
      previous.snapshot!,
      restored.work,
      restored.priorWork,
      current.digest,
    );
    expect(session.history().changes.some((c) => c.field === "status")).toBe(
      true,
    );
    const replay = await session.preview(restored.work!.input, options);
    const unchanged = session.commit(replay.id);
    expect(unchanged.id).toBe(current.snapshot!.id);
    expect(session.getPriorReport()).toEqual(restored.priorWork);
  });
});
