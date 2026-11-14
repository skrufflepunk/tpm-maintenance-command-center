import { describe, expect, it } from "vitest";
import { parseCsv, previewCsv } from "./csv";
import type { CsvOptions } from "./csv";
import { CsvSession } from "./csvSession";
const options: CsvOptions = {
  account: "fictional-account",
  scope: "fictional-work-order-report",
  timezone: "America/Mexico_City",
  reportAsOf: "2026-11-13T14:00:00Z",
  redacted: true,
  mapping: {
    sourceId: "ID",
    number: "Number",
    status: "State",
    createdAt: "Created",
    completedAt: "Completed",
    vendorId: "Vendor",
    vendorAssignmentState: "Assignment",
    approvalState: "Approval",
  },
  statusMap: { New: "open", Done: "completed" },
  priorityMap: {},
  approvalMap: { Waiting: "pending" },
  assignmentMap: { None: "unassigned" },
};
const input =
  "ID,Number,State,Created,Completed,Vendor,Assignment,Approval\na,EX-1,New,2026-11-01,,,,Waiting\nb,EX-2,Done,2026-11-01,2026-11-05,,None,\n";
describe("CSV parsing and normalization", () => {
  it("reads UTF-8 BOM, CRLF, quoted commas, escaped quotes and multiline cells", () => {
    expect(parseCsv('\ufeffID,Text\r\na,"a,b\n""quoted"""\r\n')).toEqual([
      ["ID", "Text"],
      ["a", 'a,b\n"quoted"'],
    ]);
  });
  it.each([
    "ID,ID\na,b",
    "ID,Name\na",
    'ID\n"unclosed',
    'ID\n"closed"extra',
    'ID\na"bad',
    "ID\n",
  ])("rejects malformed and ambiguous CSV: %s", (raw) => {
    expect(() => parseCsv(raw)).toThrow();
  });
  it("normalizes only reviewed columns and leaves unknowns unknown", async () => {
    const p = await previewCsv(input, options);
    expect(p.errors).toEqual([]);
    expect(p.snapshot!.sourceMode).toBe("csv");
    expect(p.snapshot!.workOrders).toHaveLength(2);
    const [a, b] = p.snapshot!.workOrders;
    expect(a.status).toBe("open");
    expect(a.approvalState).toBe("pending");
    expect(a.vendorAssignmentState).toBe("unknown");
    expect(b.fieldCoverage.vendorAssignmentState).toBe("explicitly_absent");
    expect(p.snapshot!.vendors).toEqual([]);
    expect(a.createdAt).toEqual({ value: "2026-11-01", precision: "date" });
  });
  it("rejects duplicate/missing IDs and invalid required mappings or provenance", async () => {
    for (const [raw, opt] of [
      [input + "a,EX-3,New,,,,,\n", options],
      [
        "ID,Number,State,Created,Completed,Vendor,Assignment,Approval\n,EX-1,,,,,,",
        options,
      ],
      [input, { ...options, mapping: {} }],
      [input, { ...options, account: "" }],
      [input, { ...options, timezone: "No/Zone" }],
      [input, { ...options, redacted: false }],
      [input, { ...options, reportAsOf: "2026-11-13" }],
    ] as [string, CsvOptions][]) {
      const p = await previewCsv(raw, opt);
      expect(p.snapshot).toBeNull();
      expect(p.errors.length).toBeGreaterThan(0);
    }
  });
  it("preserves unmapped statuses and excludes invalid optional dates instead of coercing", async () => {
    const p = await previewCsv(
      input.replace("New,2026-11-01", "Strange,2026-02-30"),
      options,
    );
    expect(p.snapshot!.workOrders[0].status).toBe("unknown");
    expect(p.snapshot!.workOrders[0].sourceStatus).toBe("Strange");
    expect(p.snapshot!.workOrders[0].createdAt).toBeNull();
    expect(p.warnings.join(" ")).toContain("invalid dates");
  });
  it("never interprets empty vendor cells as unassigned or joins fictional directories", async () => {
    const p = await previewCsv(
      input.replace(",,,,Waiting", ",,external-vendor,None,Waiting"),
      options,
    );
    expect(p.snapshot!.workOrders[0].vendorAssignmentState).toBe("unknown");
    expect(p.snapshot!.vendors).toEqual([]);
  });
  it("discards unmapped private columns and source URLs", async () => {
    const p = await previewCsv(
      "ID,PrivateNote,URL\na,ignored note,https://unverified.invalid",
      { ...options, mapping: { sourceId: "ID" } },
    );
    expect(JSON.stringify(p.snapshot)).not.toContain("ignored note");
    expect(p.snapshot!.workOrders[0].sourceUrl).toBeNull();
    expect(p.snapshot!.workOrders[0].summaryRedacted).toBeNull();
  });
  it("enforces size limits and source column uniqueness", async () => {
    expect(() => parseCsv("x".repeat(2 * 1024 * 1024 + 1))).toThrow("limit");
    const p = await previewCsv(input, {
      ...options,
      mapping: { sourceId: "ID", number: "ID" },
    });
    expect(p.errors[0]).toContain("only one");
  });
});
describe("atomic, isolated CSV sessions", () => {
  it("requires validated previews, retains successful data after rejection, and is idempotent", async () => {
    const s = new CsvSession();
    expect(() => s.commit("invalid")).toThrow();
    const p = await s.preview(input, options);
    const saved = s.commit(p.id);
    expect(saved.workOrders).toHaveLength(2);
    saved.workOrders.length = 0;
    expect(s.get()!.workOrders).toHaveLength(2);
    const bad = await s.preview(input + "a,EX-3,New,,,,,", options);
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(() => s.commit(bad.id)).toThrow();
    expect(s.get()!.workOrders).toHaveLength(2);
    const replay = await s.preview(input, options);
    expect(s.commit(replay.id).id).toBe(p.id);
    expect(s.history().comparable).toBe(false);
  });
  it("only commits the latest preview, rejects revoked previews and supports clearing", async () => {
    const s = new CsvSession();
    const a = await s.preview(input, options),
      b = await s.preview(input.replace("EX-1", "EX-11"), options);
    expect(() => s.commit(a.id)).toThrow();
    s.commit(b.id);
    const c = await s.preview(input, options);
    s.discardPreview();
    expect(() => s.commit(c.id)).toThrow();
    s.clear();
    expect(s.get()).toBeNull();
  });
  it("compares only compatible snapshots and flags missing rows without inferring closure", async () => {
    const s = new CsvSession();
    s.commit((await s.preview(input, options)).id);
    const changed = input
      .replace("a,EX-1,New", "a,EX-1,Done")
      .split("\n")
      .filter((line) => !line.startsWith("b,"))
      .join("\n");
    s.commit((await s.preview(changed, options)).id);
    const h = s.history();
    expect(h.comparable).toBe(true);
    expect(h.changes).toHaveLength(1);
    expect(h.changes[0]).toMatchObject({
      field: "status",
      before: "open",
      after: "completed",
    });
    expect(h.missing).toHaveLength(1);
    expect(s.get()!.workOrders).toHaveLength(1);
    s.commit(
      (await s.preview(input, { ...options, scope: "different scope" })).id,
    );
    expect(s.history().comparable).toBe(false);
  });
});

it("revokes in-flight previews and separates coverage changes from source changes", async () => {
  const session = new CsvSession();
  const pending = session.preview(input, options);
  session.discardPreview();
  const revoked = await pending;
  expect(revoked.errors[0]).toContain("discarded");
  expect(() => session.commit(revoked.id)).toThrow();
  session.commit((await session.preview(input, options)).id);
  const changed = input.replace("New,2026-11-01", "New,invalid");
  session.commit((await session.preview(changed, options)).id);
  expect(
    session.history().changes.some((c) => c.field === "Coverage: createdAt"),
  ).toBe(true);
  expect(session.history().changes.some((c) => c.field === "createdAt")).toBe(
    false,
  );
});

it("rejects conflicting normalized enum mappings and overlong mapped IDs without truncation", async () => {
  const ambiguous = await previewCsv(input, {
    ...options,
    statusMap: { New: "open", " new ": "completed" },
  });
  expect(ambiguous.snapshot).toBeNull();
  expect(ambiguous.errors[0]).toContain("Conflicting mappings");
  const long = await previewCsv("ID\n" + "x".repeat(501), {
    ...options,
    mapping: { sourceId: "ID" },
  });
  expect(long.snapshot).toBeNull();
  expect(long.errors[0]).toContain("500-character");
});

it("treats reordering reviewed mapping keys as the same import and comparable semantics", async () => {
  const s = new CsvSession();
  const first = await s.preview(input, options);
  s.commit(first.id);
  const reordered = {
    ...options,
    mapping: Object.fromEntries(Object.entries(options.mapping).reverse()),
    statusMap: { Done: "completed" as const, New: "open" as const },
  };
  const again = await s.preview(input, reordered);
  expect(s.commit(again.id).id).toBe(first.id);
  const changed = input.replace("2026-11-01", "2026-10-31");
  s.commit((await s.preview(changed, reordered)).id);
  expect(s.history().comparable).toBe(true);
});
