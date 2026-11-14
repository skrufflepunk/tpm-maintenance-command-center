import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  stat,
  mkdir,
  writeFile,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { EncryptedStore } from "./store";
import { ManagementService } from "./management";
import type { CsvOptions } from "../src/data/csv";
import type { StaffIdentity } from "../src/data/managedTypes";
import { CsvDeliveryWorker } from "./delivery";
import type { ServerConfig } from "./config";
const admin: StaffIdentity = {
    subject: "synthetic-admin",
    role: "administrator",
  },
  viewer: StaffIdentity = { subject: "synthetic-viewer", role: "viewer" };
const options: CsvOptions = {
  account: "synthetic-account",
  scope: "reviewed-scope",
  timezone: "UTC",
  reportAsOf: "2026-11-13T14:00:00Z",
  redacted: true,
  mapping: {
    sourceId: "ID",
    status: "State",
    propertyId: "Property",
    vendorId: "Vendor",
    createdAt: "Created",
  },
  statusMap: { Open: "open", Completed: "completed" },
  priorityMap: {},
  approvalMap: {},
  assignmentMap: {},
};
const csv = (second = true, changed = false) =>
  "ID,State,Property,Vendor,Created\n1," +
  (changed ? "Completed" : "Open") +
  ",p1,v1,2026-11-01" +
  (second ? "\n2,Completed,p2,v1,2026-11-03" : "");
let dir: string, store: EncryptedStore, service: ManagementService, key: Buffer;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tpm-store-test-"));
  key = randomBytes(32);
  store = new EncryptedStore(join(dir, "test.sqlite"), key);
  service = new ManagementService(store);
});
afterEach(async () => {
  vi.useRealTimers();
  store.close();
  await rm(dir, { recursive: true, force: true });
});
const source = () =>
  service.createSource(admin, {
    name: "Synthetic CSV",
    account: options.account,
    scope: "approved-workspace",
    timezone: "UTC",
    approved: true,
    behavior: "snapshot",
  });
describe("protected CSV persistence and integrity", () => {
  it("persists encrypted data across restarts and keeps original mapped values server-only", async () => {
    const s = source(),
      p = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        options,
        "snapshot",
      );
    const result = service.commit(admin, p.id);
    expect(result.snapshot.workOrders).toHaveLength(2);
    store.close();
    const disk = await readFile(join(dir, "test.sqlite"));
    expect(disk.includes(Buffer.from("synthetic-account"))).toBe(false);
    expect(disk.includes(Buffer.from("reviewed-scope"))).toBe(false);
    expect((await stat(join(dir, "test.sqlite"))).mode & 0o077).toBe(0);
    store = new EncryptedStore(join(dir, "test.sqlite"), key);
    service = new ManagementService(store);
    expect(service.workspace(s.id, admin).snapshot.workOrders).toHaveLength(2);
    const originals = store.list<{ fields: Record<string, string>[] }>(
      "original",
    );
    expect(originals[0].fields[0].status).toBe("Open");
    expect(JSON.stringify(result)).not.toContain('"fields"');
  });
  it("rejects duplicates, blank IDs, invalid mappings and account changes without replacing current data", async () => {
    const s = source(),
      p = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        options,
        "snapshot",
      );
    service.commit(admin, p.id);
    for (const input of [
      "ID,State,Property,Vendor,Created\n1,Open,p1,v1,bad\n1,Open,p2,v1,bad",
      "ID,State,Property,Vendor,Created\n,Open,p1,v1,bad",
    ]) {
      const bad = await service.preview(
        admin,
        s.id,
        "workOrders",
        input,
        options,
        "snapshot",
      );
      expect(bad.errors.length).toBeGreaterThan(0);
      expect(() => service.commit(admin, bad.id)).toThrow();
    }
    expect(service.workspace(s.id, admin).snapshot.workOrders).toHaveLength(2);
    await expect(
      service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        { ...options, account: "other" },
        "snapshot",
      ),
    ).rejects.toThrow(/account/);
    expect(
      service.history(s.id).filter((h) => h.status === "rejected"),
    ).toHaveLength(2);
  });
  it("replays idempotently and rejects stale/foreign/expired previews", async () => {
    const s = source(),
      first = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        options,
        "snapshot",
      ),
      stale = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(false),
        options,
        "snapshot",
      );
    const a = service.commit(admin, first.id);
    expect(() => service.commit(admin, stale.id)).toThrow(/changed/);
    const replay = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(),
      options,
      "snapshot",
    );
    expect(service.commit(admin, replay.id).snapshot.id).toBe(a.snapshot.id);
    expect(store.list("observation")).toHaveLength(1);
    expect(service.history().some((h) => h.status === "replay")).toBe(true);
    const p = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(false),
      options,
      "snapshot",
    );
    expect(() =>
      service.commit({ ...admin, subject: "other-admin" }, p.id),
    ).toThrow();
    service.cleanup(Date.now() + 1200001);
    expect(() => service.commit(admin, p.id)).toThrow();
  });
  it("archives absent snapshot rows without deleting or closing them and makes upsert carry-over explicit", async () => {
    const s = source();
    const a = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(),
      options,
      "snapshot",
    );
    service.commit(admin, a.id);
    const replacement = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(false),
      options,
      "snapshot",
    );
    expect(replacement.missing).toBe(1);
    const b = service.commit(admin, replacement.id);
    expect(b.snapshot.workOrders).toHaveLength(1);
    expect(b.notObserved).toBe(1);
    expect(store.list("record")).toHaveLength(2);
    const reset = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(),
      options,
      "snapshot",
    );
    service.commit(admin, reset.id);
    const incremental = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(false, true),
      options,
      "upsert",
    );
    expect(incremental.carried).toBe(1);
    const c = service.commit(admin, incremental.id);
    expect(c.snapshot.workOrders).toHaveLength(2);
    expect(c.carried).toBe(1);
    expect(c.previous).toBeNull();
    expect(
      c.snapshot.qualitySummary.some(
        (issue) => issue.code === "CARRIED_RECORDS",
      ),
    ).toBe(true);
  });
  it("rejects incremental scope/mapping changes and source approval changes after preview", async () => {
    const s = source(),
      a = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        options,
        "snapshot",
      );
    service.commit(admin, a.id);
    const changed = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(false),
      { ...options, scope: "another-scope" },
      "upsert",
    );
    expect(() => service.commit(admin, changed.id)).toThrow(/same verified/);
    expect(service.workspace(s.id, admin).snapshot.workOrders).toHaveLength(2);
    const p = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(false),
      options,
      "snapshot",
    );
    service.updateSource(admin, s.id, {
      approved: false,
      behavior: "snapshot",
    });
    expect(() => service.commit(admin, p.id)).toThrow();
    expect(() => service.workspace(s.id, admin)).toThrow(/not approved/);
  });
  it("retains unknown values and invalid dates without inventing assignment absence", async () => {
    const s = source(),
      p = await service.preview(
        admin,
        s.id,
        "workOrders",
        "ID,State,Property,Vendor,Created\n1,Unverified,,,bad",
        options,
        "snapshot",
      );
    const row = service.commit(admin, p.id).snapshot.workOrders[0];
    expect(row.status).toBe("unknown");
    expect(row.vendorAssignmentState).toBe("unknown");
    expect(row.createdAt).toBeNull();
    expect(row.propertyId).toBeNull();
  });
  it("joins separate property/vendor reports only after identifier verification and masks contacts for viewers", async () => {
    const s = source(),
      p = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        options,
        "snapshot",
      );
    service.commit(admin, p.id);
    const vendorOptions = {
      account: options.account,
      scope: "vendor-report",
      timezone: "UTC",
      reportAsOf: "",
      mapping: { sourceId: "ID", displayName: "Name", businessEmail: "Email" },
      activeMap: {},
      categorySeparator: ";" as const,
      redacted: true,
      verifiedIdentifiers: false,
    };
    const raw = "ID,Name,Email\nv1,Synthetic Shop,private-demo@example.invalid";
    const v = await service.preview(
      admin,
      s.id,
      "vendors",
      raw,
      vendorOptions,
      "snapshot",
    );
    service.commit(admin, v.id);
    expect(service.workspace(s.id, admin).snapshot.vendors).toEqual([]);
    const verified = await service.preview(
      admin,
      s.id,
      "vendors",
      raw,
      { ...vendorOptions, verifiedIdentifiers: true },
      "snapshot",
    );
    service.commit(admin, verified.id);
    expect(
      service.workspace(s.id, admin).snapshot.vendors[0].businessEmail,
    ).toBe("private-demo@example.invalid");
    const restricted = service.workspace(s.id, viewer).snapshot.vendors[0];
    expect(restricted.businessEmail).toBeNull();
    expect(restricted.contactsRestricted).toBe(true);
    const propertyOptions = {
      account: options.account,
      scope: "property-report",
      timezone: "UTC",
      reportAsOf: "",
      mapping: { sourceId: "ID", displayName: "Name" },
      redacted: true,
      verifiedIdentifiers: true,
    };
    const property = await service.preview(
      admin,
      s.id,
      "properties",
      "ID,Name\np1,Synthetic Master\np0,Synthetic Zero Work",
      propertyOptions,
      "snapshot",
    );
    const result = service.commit(admin, property.id);
    expect(
      result.snapshot.properties.find((p) => p.sourceId === "p0")?.coverageKind,
    ).toBe("master");
    expect(
      result.snapshot.properties.find((p) => p.sourceId === "p1")?.displayName,
    ).toBe("Synthetic Master");
  });
  it("purges expired current data, observations, source values, records and history under configured retention", async () => {
    const s = source(),
      p = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        options,
        "snapshot",
      );
    service.commit(admin, p.id);
    const accepted = service.slot(s.id, "workOrders")!.acceptedAt;
    service.cleanup(Date.parse(accepted) + 31 * 86400000);
    expect(service.slot(s.id, "workOrders")).toBeNull();
    for (const namespace of ["original", "record", "observation", "import"])
      expect(store.list(namespace)).toHaveLength(0);
    expect(service.workspace(s.id, admin).snapshot.workOrders).toEqual([]);
    expect(service.sources()).toHaveLength(1);
  });
  it("does not extend expired carried-row retention when a fresh incremental batch arrives", async () => {
    vi.useFakeTimers();
    const firstTime = Date.parse("2026-11-14T12:00:00Z");
    vi.setSystemTime(firstTime);
    const s = source();
    const first = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(),
      options,
      "snapshot",
    );
    service.commit(admin, first.id);
    vi.setSystemTime(firstTime + 31 * 86400000);
    const incremental = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(false, true),
      options,
      "upsert",
    );
    expect(incremental.carried).toBe(1);
    const result = service.commit(admin, incremental.id);
    expect(result.snapshot.workOrders.map((row) => row.sourceId)).toEqual([
      "1",
    ]);
    expect(result.carried).toBe(0);
    expect(result.previous).toBeNull();
    expect(
      result.snapshot.qualitySummary.some(
        (issue) => issue.code === "RETENTION_PRUNED",
      ),
    ).toBe(true);
    expect(store.list("record")).toHaveLength(1);
    expect(store.list("original")).toHaveLength(1);
    expect(store.list("observation")).toHaveLength(0);
    expect(service.slot(s.id, "workOrders")!.digest).toBe("");
  });
  it("fails closed for a wrong storage key or modified ciphertext", () => {
    store.set("secret", "test", { value: "synthetic-only" });
    const wrong = new EncryptedStore(join(dir, "test.sqlite"), randomBytes(32));
    expect(() => wrong.get("secret", "test")).toThrow();
    wrong.close();
  });
  it("enforces administrator authority and validates explicit policies", async () => {
    expect(() => service.createSource(viewer, {})).toThrow(/administrators/);
    expect(() => service.saveSettings(viewer, service.settings())).toThrow();
    const s = source();
    await expect(
      service.preview(viewer, s.id, "workOrders", csv(), options, "snapshot"),
    ).rejects.toThrow();
    expect(() => service.createSource(admin, { mode: "api" })).toThrow(
      /Only CSV/,
    );
    expect(() =>
      service.saveSettings(admin, { ...service.settings(), retentionDays: 0 }),
    ).toThrow();
  });
});
describe("delivered-file processing gates", () => {
  it("requires both operator and approved source/preset gates; processes a protected delivery idempotently", async () => {
    const s = source(),
      p = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        options,
        "snapshot",
      );
    service.commit(admin, p.id);
    service.delivery(admin, s.id, {
      enabled: true,
      intervalMinutes: 5,
      dataset: "workOrders",
    });
    const config = {
      allowScheduledCsv: false,
      ingestionDirectory: join(dir, "inbox"),
    } as ServerConfig;
    const worker = new CsvDeliveryWorker(service, config);
    expect((await worker.run()).configured).toBe(false);
    config.allowScheduledCsv = true;
    const inbox = join(config.ingestionDirectory!, s.id, "workOrders");
    await mkdir(inbox, { recursive: true, mode: 0o700 });
    await writeFile(join(inbox, "synthetic.ready.csv"), csv(), { mode: 0o600 });
    expect(await worker.run()).toMatchObject({
      configured: true,
      processed: 1,
    });
    expect(service.workspace(s.id, admin).snapshot.workOrders).toHaveLength(2);
    expect(
      service
        .history()
        .some((h) => h.trigger === "delivered_csv" && h.status === "replay"),
    ).toBe(true);
  });
  it("rejects symlinks and unsafe file permissions while retaining the previous successful snapshot", async () => {
    const s = source(),
      p = await service.preview(
        admin,
        s.id,
        "workOrders",
        csv(),
        options,
        "snapshot",
      );
    service.commit(admin, p.id);
    service.delivery(admin, s.id, {
      enabled: true,
      intervalMinutes: 5,
      dataset: "workOrders",
    });
    const config = {
        allowScheduledCsv: true,
        ingestionDirectory: join(dir, "inbox"),
      } as ServerConfig,
      folder = join(config.ingestionDirectory!, s.id, "workOrders");
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const target = join(dir, "synthetic-source.csv");
    await writeFile(target, csv(false), { mode: 0o600 });
    await symlink(target, join(folder, "unsafe.ready.csv"));
    const result = await new CsvDeliveryWorker(service, config).run();
    expect(result.processed).toBe(0);
    expect(service.workspace(s.id, admin).snapshot.workOrders).toHaveLength(2);
  });
});

it("rolls back storage failures and records a safe failed attempt without replacing last successful data", async () => {
  const s = source(),
    first = await service.preview(
      admin,
      s.id,
      "workOrders",
      csv(),
      options,
      "snapshot",
    );
  const initial = service.commit(admin, first.id);
  const next = await service.preview(
    admin,
    s.id,
    "workOrders",
    csv(false, true),
    options,
    "snapshot",
  );
  const original = store.set.bind(store);
  let failed = false;
  const spy = vi
    .spyOn(store, "set")
    .mockImplementation((namespace, id, value) => {
      if (namespace === "slot" && !failed) {
        failed = true;
        throw new Error("Synthetic storage failure");
      }
      return original(namespace, id, value);
    });
  expect(() => service.commit(admin, next.id)).toThrow(
    "Synthetic storage failure",
  );
  spy.mockRestore();
  expect(service.workspace(s.id, admin).snapshot.workOrders).toEqual(
    initial.snapshot.workOrders,
  );
  expect(service.history().find((h) => h.id === next.id)?.status).toBe(
    "rejected",
  );
});
