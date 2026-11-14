import { DatabaseSync } from "node:sqlite";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { chmodSync } from "node:fs";
export class EncryptedStore {
  private db: DatabaseSync;
  constructor(
    path: string,
    private key: Buffer,
  ) {
    if (key.length !== 32) throw new Error("Invalid storage key.");
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS entries (namespace TEXT NOT NULL, id TEXT NOT NULL, value BLOB NOT NULL, updated TEXT NOT NULL, PRIMARY KEY(namespace,id));",
    );
    if (path !== ":memory:") chmodSync(path, 0o600);
  }
  private seal(namespace: string, id: string, value: unknown) {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(namespace + ":" + id));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  }
  private open<T>(namespace: string, id: string, input: Uint8Array): T {
    const data = Buffer.from(input),
      decipher = createDecipheriv(
        "aes-256-gcm",
        this.key,
        data.subarray(0, 12),
      );
    decipher.setAAD(Buffer.from(namespace + ":" + id));
    decipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    );
  }
  get<T>(namespace: string, id: string): T | null {
    const row = this.db
      .prepare("SELECT value FROM entries WHERE namespace=? AND id=?")
      .get(namespace, id) as { value: Uint8Array } | undefined;
    return row ? this.open<T>(namespace, id, row.value) : null;
  }
  list<T>(namespace: string): T[] {
    const rows = this.db
      .prepare(
        "SELECT id,value FROM entries WHERE namespace=? ORDER BY updated DESC,id",
      )
      .all(namespace) as { id: string; value: Uint8Array }[];
    return rows.map((row) => this.open<T>(namespace, row.id, row.value));
  }
  set(namespace: string, id: string, value: unknown) {
    this.db
      .prepare(
        "INSERT INTO entries(namespace,id,value,updated) VALUES(?,?,?,?) ON CONFLICT(namespace,id) DO UPDATE SET value=excluded.value,updated=excluded.updated",
      )
      .run(
        namespace,
        id,
        this.seal(namespace, id, value),
        new Date().toISOString(),
      );
  }
  delete(namespace: string, id: string) {
    this.db
      .prepare("DELETE FROM entries WHERE namespace=? AND id=?")
      .run(namespace, id);
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}
