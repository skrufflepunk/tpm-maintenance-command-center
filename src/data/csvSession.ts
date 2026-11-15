import { mappedCsv, savedReport } from "./local/reports";
import type { SavedReport } from "./local/reports";
import { previewCsv } from "./csv";
import type { CsvOptions, CsvPreview } from "./csv";
import type { Snapshot, WorkOrder } from "../domain/types";
export interface SessionHistory {
  comparable: boolean;
  reason: string;
  changes: {
    id: string;
    field: string;
    before: string;
    after: string;
    detectedAt: string;
  }[];
  missing: string[];
  newIds: string[];
}
export class CsvSession {
  private report: SavedReport | null = null;
  private priorReport: SavedReport | null = null;
  getReport() {
    return this.report ? structuredClone(this.report) : null;
  }
  getPriorReport() {
    return this.priorReport ? structuredClone(this.priorReport) : null;
  }
  private current: Snapshot | null = null;
  private previous: Snapshot | null = null;
  private digest = "";
  private revision = 0;
  private previewGeneration = 0;
  private staged: {
    preview: CsvPreview;
    revision: number;
    input: string;
  } | null = null;
  latestAttempt = "No CSV import attempted.";
  async preview(input: string, options: CsvOptions) {
    this.staged = null;
    const generation = ++this.previewGeneration;
    const revision = this.revision;
    let projected = input;
    try {
      projected = mappedCsv(input, options);
    } catch {
      /* Existing parser reports safe structural/mapping errors. */
    }
    const preview = await previewCsv(projected, options);
    if (generation !== this.previewGeneration)
      return {
        ...preview,
        snapshot: null,
        errors: ["Preview changed or was discarded. Validate again."],
      };
    this.latestAttempt = preview.errors.length
      ? "Latest preview rejected; previous successful data retained."
      : "Candidate validated; not loaded.";
    if (!preview.errors.length)
      this.staged = {
        preview: structuredClone(preview),
        revision,
        input: projected,
      };
    return structuredClone(preview);
  }
  commit(id: string) {
    const staged = this.staged;
    if (
      !staged ||
      staged.preview.id !== id ||
      staged.revision !== this.revision ||
      !staged.preview.snapshot
    )
      throw new Error(
        "Preview is stale or invalid. Validate again before loading.",
      );
    this.staged = null;
    if (this.digest === staged.preview.digest) {
      this.latestAttempt =
        "Identical CSV replay; no duplicate records or history created.";
      return this.get()!;
    }
    this.priorReport = this.report;
    this.report = savedReport(
      "workOrders",
      staged.input,
      staged.preview.options,
      staged.preview.snapshot.id,
    );
    this.previous = this.current;
    this.current = structuredClone(staged.preview.snapshot);
    const loadedAt = new Date().toISOString();
    this.report.receivedAt = loadedAt;
    this.current.importedAt = loadedAt;
    this.current.datasets.forEach((d) => {
      d.importedAt = loadedAt;
    });
    this.digest = staged.preview.digest;
    this.revision++;
    this.latestAttempt =
      "CSV loaded locally; browser storage status is shown in Data & Settings.";
    return this.get()!;
  }
  discardPreview() {
    this.previewGeneration++;
    this.staged = null;
  }
  get() {
    return this.current ? structuredClone(this.current) : null;
  }
  clear() {
    this.previewGeneration++;
    this.report = null;
    this.priorReport = null;
    this.current = null;
    this.previous = null;
    this.staged = null;
    this.digest = "";
    this.revision++;
    this.latestAttempt = "CSV session cleared.";
  }
  hydrate(
    current: Snapshot,
    previous: Snapshot | null,
    report: SavedReport | null = null,
    priorReport: SavedReport | null = null,
    digest = "",
  ) {
    this.discardPreview();
    this.current = structuredClone(current);
    this.previous = previous ? structuredClone(previous) : null;
    this.report = report;
    this.priorReport = priorReport;
    this.digest = digest;
    this.revision++;
    this.latestAttempt = "Validated browser-local CSV loaded.";
  }
  observationPair() {
    return this.history().comparable && this.previous && this.current
      ? {
          previous: structuredClone(this.previous),
          current: structuredClone(this.current),
        }
      : null;
  }
  history(): SessionHistory {
    const a = this.previous,
      b = this.current,
      empty = { comparable: false, changes: [], missing: [], newIds: [] };
    if (!a || !b)
      return {
        ...empty,
        reason:
          "No previous comparable CSV snapshot. Source maintenance activity history is unavailable.",
      };
    const ad = a.datasets[0],
      bd = b.datasets[0];
    if (
      ad.sourceAccountId !== bd.sourceAccountId ||
      ad.sourceTimezone !== bd.sourceTimezone ||
      ad.reportScope.comparisonKey !== bd.reportScope.comparisonKey ||
      a.mappingVersion !== b.mappingVersion
    )
      return {
        ...empty,
        reason:
          "Comparison unavailable: account, scope, timezone or mappings differ.",
      };
    const fields: (keyof WorkOrder)[] = [
      "status",
      "priority",
      "vendorId",
      "vendorAssignmentState",
      "approvalState",
      "createdAt",
      "completedAt",
      "sourceUpdatedAt",
    ];
    const changes: SessionHistory["changes"] = [];
    for (const w of b.workOrders) {
      const old = a.workOrders.find((o) => o.id === w.id);
      if (!old) continue;
      for (const field of Object.keys(w.fieldCoverage)) {
        const before = old.fieldCoverage[field] ?? "column_unavailable",
          after = w.fieldCoverage[field];
        if (before !== after)
          changes.push({
            id: w.id,
            field: `Coverage: ${field}`,
            before,
            after,
            detectedAt: b.importedAt,
          });
      }
      for (const field of fields) {
        const before = old[field],
          after = w[field];
        if (
          before == null ||
          after == null ||
          before === "unknown" ||
          after === "unknown"
        )
          continue;
        if (JSON.stringify(before) !== JSON.stringify(after))
          changes.push({
            id: w.id,
            field,
            before:
              typeof before === "object"
                ? JSON.stringify(before)
                : String(before),
            after:
              typeof after === "object" ? JSON.stringify(after) : String(after),
            detectedAt: b.importedAt,
          });
      }
    }
    return {
      comparable: true,
      reason:
        "Comparable session observations; detection times are not source event times.",
      changes,
      missing: a.workOrders
        .filter((w) => !b.workOrders.some((n) => n.id === w.id))
        .map((w) => w.id),
      newIds: b.workOrders
        .filter((w) => !a.workOrders.some((o) => o.id === w.id))
        .map((w) => w.id),
    };
  }
}
