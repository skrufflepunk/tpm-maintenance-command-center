import { readdir, open, mkdir, unlink, lstat } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { ServerConfig } from "./config";
import { ManagementService } from "./management";
import type { StaffIdentity } from "../src/data/managedTypes";
const actor: StaffIdentity = {
  subject: "authorized-csv-delivery-worker",
  role: "administrator",
};
/** Processes already-delivered files; never generates or downloads a Rentvine report. */
export class CsvDeliveryWorker {
  private last = new Map<string, number>();
  private running = false;
  constructor(
    private service: ManagementService,
    private config: ServerConfig,
  ) {}
  async run(now = Date.now()) {
    if (
      this.running ||
      !this.config.allowScheduledCsv ||
      !this.config.ingestionDirectory
    )
      return { processed: 0, configured: false };
    this.running = true;
    let processed = 0;
    try {
      for (const source of this.service.sources()) {
        const delivery = source.delivery,
          key = source.id + ":" + delivery.dataset;
        if (
          !source.approved ||
          !delivery.enabled ||
          !source.presets[delivery.dataset] ||
          now - (this.last.get(key) ?? 0) < delivery.intervalMinutes * 60000
        )
          continue;
        this.last.set(key, now);
        await mkdir(this.config.ingestionDirectory!, {
          recursive: true,
          mode: 0o700,
        });
        const rootStat = await lstat(this.config.ingestionDirectory!);
        if (
          rootStat.isSymbolicLink() ||
          !rootStat.isDirectory() ||
          (rootStat.mode & 0o077) !== 0
        ) {
          this.service.audit(actor, "delivery_directory_rejected", source.id);
          continue;
        }
        const sourcePath = join(this.config.ingestionDirectory!, source.id);
        await mkdir(sourcePath, { recursive: true, mode: 0o700 });
        const sourceStat = await lstat(sourcePath);
        if (
          sourceStat.isSymbolicLink() ||
          !sourceStat.isDirectory() ||
          (sourceStat.mode & 0o077) !== 0
        ) {
          this.service.audit(actor, "delivery_directory_rejected", source.id);
          continue;
        }
        const dir = join(
          this.config.ingestionDirectory,
          source.id,
          delivery.dataset,
        );
        await mkdir(dir, { recursive: true, mode: 0o700 });
        const stat = await lstat(dir);
        if (
          stat.isSymbolicLink() ||
          !stat.isDirectory() ||
          (stat.mode & 0o077) !== 0
        ) {
          this.service.audit(actor, "delivery_directory_rejected", source.id);
          continue;
        }
        for (const filename of (await readdir(dir))
          .filter((name) => /^[A-Za-z0-9_.-]+\.ready\.csv$/.test(name))
          .slice(0, 10)) {
          const file = join(dir, filename);
          let handle: Awaited<ReturnType<typeof open>> | null = null;
          try {
            const meta = await lstat(file);
            if (
              meta.isSymbolicLink() ||
              !meta.isFile() ||
              meta.size > 2 * 1024 * 1024 ||
              (meta.mode & 0o077) !== 0
            )
              throw new Error("delivery rejected");
            handle = await open(
              file,
              constants.O_RDONLY | constants.O_NOFOLLOW,
            );
            const actual = await handle.stat();
            if (
              !actual.isFile() ||
              actual.ino !== meta.ino ||
              actual.size !== meta.size ||
              actual.size > 2 * 1024 * 1024
            )
              throw new Error("delivery changed");
            const buffer = Buffer.alloc(actual.size);
            const { bytesRead } = await handle.read(
              buffer,
              0,
              buffer.length,
              0,
            );
            if (bytesRead !== actual.size)
              throw new Error("delivery incomplete");
            const input = new TextDecoder("utf-8", { fatal: true }).decode(
              buffer,
            );
            const preview = await this.service.preview(
              actor,
              source.id,
              delivery.dataset,
              input,
              source.presets[delivery.dataset]!,
              source.behavior,
              "delivered_csv",
            );
            if (preview.errors.length) throw new Error("validation rejected");
            this.service.commit(actor, preview.id);
            await unlink(file);
            processed++;
          } catch {
            this.service.audit(actor, "delivery_failed", source.id, {
              dataset: delivery.dataset,
              fileReference: "sha256-only-in-filesystem-operator-review",
            }); /* Retain failed delivery for an operator; no raw filename/row is logged. */
          } finally {
            await handle?.close();
          }
        }
      }
    } finally {
      this.running = false;
    }
    return { processed, configured: true };
  }
}
