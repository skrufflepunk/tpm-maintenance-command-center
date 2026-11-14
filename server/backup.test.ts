import { it, expect } from "vitest";
import { mkdtemp, rm, stat, readFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { EncryptedStore } from "./store";
import { backupEncryptedDatabase } from "./backup";
it("backs up and restores encrypted state while the source database remains open", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tpm-synthetic-backup-")),
    key = randomBytes(32);
  const source = join(dir, "source.sqlite"),
    destination = join(dir, "backup.sqlite");
  const store = new EncryptedStore(source, key);
  try {
    store.set("record", "synthetic-id", { value: "synthetic-private-source" });
    for (const namespace of ["session", "login", "stage"])
      store.set(namespace, "synthetic-ephemeral", {
        value: "must-not-restore",
      });
    await backupEncryptedDatabase(source, destination);
    const restored = new EncryptedStore(destination, key);
    expect(restored.get("record", "synthetic-id")).toEqual({
      value: "synthetic-private-source",
    });
    restored.close();
    expect(store.list("session")).toHaveLength(1);
    const recovery = new EncryptedStore(destination, key);
    for (const namespace of ["session", "login", "stage"])
      expect(recovery.list(namespace)).toEqual([]);
    recovery.close();
    expect((await stat(destination)).mode & 0o077).toBe(0);
    expect(
      (await readFile(destination)).includes(
        Buffer.from("synthetic-private-source"),
      ),
    ).toBe(false);
    await expect(
      backupEncryptedDatabase(source, destination),
    ).rejects.toThrow();
    expect((await stat(destination)).size).toBeGreaterThan(0);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
it("rejects unsafe backup permissions and a source overwrite", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tpm-synthetic-backup-")),
    source = join(dir, "source.sqlite");
  const store = new EncryptedStore(source, randomBytes(32));
  try {
    await expect(backupEncryptedDatabase(source, source)).rejects.toThrow();
    await chmod(dir, 0o755);
    await expect(
      backupEncryptedDatabase(source, join(dir, "backup.sqlite")),
    ).rejects.toThrow(/private/);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
