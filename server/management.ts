import { reconcileCatalogQuality } from "../src/data/composeWorkspace";
import { randomUUID } from "node:crypto";
import { previewCsv, parseCsv } from "../src/data/csv";
import { previewVendorCsv } from "../src/data/vendorRepository";
import { previewPropertyCsv } from "../src/data/propertyCsv";
import type {
  PropertyDirectory,
  PropertyOptions,
} from "../src/data/propertyCsv";
import type { CsvOptions } from "../src/data/csv";
import type { VendorImportOptions } from "../src/data/vendorRepository";
import type { VendorDirectory } from "../src/domain/vendors";
import type {
  Snapshot,
  WorkOrder,
  Vendor,
  Property,
} from "../src/domain/types";
import type {
  DatasetKind,
  ImportOptions,
  SourceConfig,
  ServerSettings,
  ImportSummary,
  StaffIdentity,
  ManagedWorkspace,
  ImportBehavior,
} from "../src/data/managedTypes";
import { defaultRules, validateRules } from "../src/config/rules";
import {
  defaultReviewSettings,
  validateReviewSettings,
} from "../src/config/reviewSettings";
import { EncryptedStore } from "./store";
import { administrator, digest } from "./auth";
import { requireValue, SafeError } from "./errors";
export interface DataSlot {
  revision: number;
  current: Snapshot | VendorDirectory | PropertyDirectory;
  previous: Snapshot | VendorDirectory | PropertyDirectory | null;
  digest: string;
  acceptedAt: string;
  checkedAt: string;
  carried: number;
  behavior: ImportBehavior;
}
interface Stage {
  id: string;
  sourceId: string;
  dataset: DatasetKind;
  options: ImportOptions;
  candidate: Snapshot | VendorDirectory | PropertyDirectory;
  digest: string;
  revision: number;
  sourceRevision: number;
  actor: string;
  expires: number;
  behavior: ImportBehavior;
  original: Record<string, string>[];
  trigger: "manual" | "delivered_csv";
}
const datasets: DatasetKind[] = ["workOrders", "vendors", "properties"];
const rowsOf = (
  dataset: DatasetKind,
  value: DataSlot["current"],
): (WorkOrder | Vendor | Property)[] =>
  dataset === "workOrders"
    ? (value as Snapshot).workOrders
    : dataset === "vendors"
      ? (value as VendorDirectory).vendors
      : (value as PropertyDirectory).properties;
const text = (value: unknown, max: number) => {
  requireValue(
    typeof value === "string" && value.trim().length > 0 && value.length <= max,
    400,
    "INVALID_CONFIG",
    "Required text is missing or exceeds its allowed length.",
  );
  return value.trim();
};
export class ManagementService {
  constructor(public store: EncryptedStore) {}
  settings(): ServerSettings {
    return (
      this.store.get<ServerSettings>("configuration", "settings") ?? {
        rules: defaultRules,
        review: defaultReviewSettings,
        retentionDays: 30,
        vendorStaleAfterHours: 168,
        propertyStaleAfterHours: 168,
      }
    );
  }
  sources() {
    return this.store.list<SourceConfig>("source");
  }
  source(id: string) {
    const source = this.store.get<SourceConfig>("source", id);
    requireValue(source, 404, "SOURCE_NOT_FOUND", "Data source not found.");
    return source;
  }
  slot(id: string, dataset: DatasetKind) {
    return this.store.get<DataSlot>("slot", id + ":" + dataset);
  }
  audit(
    user: StaffIdentity,
    event: string,
    sourceId: string | null,
    detail: Record<string, unknown> = {},
  ) {
    const id = randomUUID();
    this.store.set("audit", id, {
      id,
      actor: user.subject,
      role: user.role,
      event,
      sourceId,
      at: new Date().toISOString(),
      detail,
    });
  }
  createSource(user: StaffIdentity, input: unknown) {
    administrator(user);
    requireValue(
      input && typeof input === "object",
      400,
      "INVALID_SOURCE",
      "Source configuration is required.",
    );
    const value = input as Record<string, unknown>;
    requireValue(
      !value.mode || value.mode === "csv",
      409,
      "API_BLOCKED",
      "Only CSV sources can be configured. API capabilities and ownership approval are unverified.",
    );
    const timezone = text(value.timezone, 100);
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      throw new SafeError(
        400,
        "INVALID_TIMEZONE",
        "Use a valid reviewed IANA source timezone.",
      );
    }
    requireValue(
      value.approved === true || value.approved === false,
      400,
      "INVALID_SOURCE",
      "Record whether this CSV data source has been approved.",
    );
    requireValue(
      ["snapshot", "upsert"].includes(String(value.behavior)),
      400,
      "INVALID_BEHAVIOR",
      "Choose snapshot or incremental upsert explicitly.",
    );
    const source: SourceConfig = {
      id: randomUUID(),
      name: text(value.name, 100),
      account: text(value.account, 100),
      scope: text(value.scope, 500),
      timezone,
      approved: value.approved,
      behavior: value.behavior as ImportBehavior,
      createdAt: new Date().toISOString(),
      revision: 1,
      delivery: { enabled: false, intervalMinutes: 60, dataset: "workOrders" },
      presets: {},
    };
    this.store.transaction(() => {
      this.store.set("source", source.id, source);
      this.audit(user, "source_created", source.id);
    });
    return source;
  }
  updateSource(
    user: StaffIdentity,
    id: string,
    input: { approved: boolean; behavior: ImportBehavior },
  ) {
    administrator(user);
    const source = this.source(id);
    requireValue(
      typeof input.approved === "boolean" &&
        ["snapshot", "upsert"].includes(input.behavior),
      400,
      "SOURCE_CONFIG",
      "Approval and explicit import behavior are required.",
    );
    const next = {
      ...source,
      approved: input.approved,
      behavior: input.behavior,
      revision: source.revision + 1,
      delivery: {
        ...source.delivery,
        enabled: input.approved && source.delivery.enabled,
      },
    };
    this.store.transaction(() => {
      this.store.set("source", id, next);
      this.audit(user, "source_approval_updated", id, {
        approved: input.approved,
        behavior: input.behavior,
      });
    });
    return next;
  }
  saveSettings(user: StaffIdentity, input: ServerSettings) {
    administrator(user);
    let rules: ServerSettings["rules"], review: ServerSettings["review"];
    try {
      rules = validateRules(input.rules);
      review = validateReviewSettings(input.review);
    } catch {
      throw new SafeError(
        400,
        "INVALID_SETTINGS",
        "Use valid rule thresholds, ordered age boundaries, a reviewed IANA timezone and supported review settings.",
      );
    }
    requireValue(
      Number.isInteger(input.retentionDays) &&
        input.retentionDays >= 1 &&
        input.retentionDays <= 3650,
      400,
      "RETENTION_RANGE",
      "Retention must be 1–3650 days.",
    );
    requireValue(
      [input.vendorStaleAfterHours, input.propertyStaleAfterHours].every(
        (v) => Number.isInteger(v) && v > 0 && v <= 87600,
      ),
      400,
      "FRESHNESS_RANGE",
      "Dataset freshness policies must be positive whole hours.",
    );
    const settings = {
      rules: { ...rules, rulesVersion: `configured-${randomUUID()}` },
      review,
      retentionDays: input.retentionDays,
      vendorStaleAfterHours: input.vendorStaleAfterHours,
      propertyStaleAfterHours: input.propertyStaleAfterHours,
    };
    this.store.transaction(() => {
      this.store.set("configuration", "settings", settings);
      this.audit(user, "settings_updated", null, {
        retentionDays: settings.retentionDays,
      });
    });
    return settings;
  }
  delivery(
    user: StaffIdentity,
    id: string,
    input: { enabled: boolean; intervalMinutes: number; dataset: DatasetKind },
  ) {
    administrator(user);
    const source = this.source(id);
    requireValue(
      typeof input.enabled === "boolean" &&
        Number.isInteger(input.intervalMinutes) &&
        input.intervalMinutes >= 5 &&
        input.intervalMinutes <= 10080 &&
        datasets.includes(input.dataset),
      400,
      "DELIVERY_CONFIG",
      "Choose a supported dataset and a 5–10,080 minute processing interval.",
    );
    if (input.enabled)
      requireValue(
        source.approved && source.presets[input.dataset],
        409,
        "DELIVERY_PRESET",
        "Approve the source and successfully import its reviewed mapping before enabling processing.",
      );
    const next = {
      ...source,
      revision: source.revision + 1,
      delivery: {
        enabled: input.enabled,
        intervalMinutes: input.intervalMinutes,
        dataset: input.dataset,
      },
    };
    this.store.transaction(() => {
      this.store.set("source", id, next);
      this.audit(user, "delivery_configured", id, {
        enabled: input.enabled,
        intervalMinutes: input.intervalMinutes,
        dataset: input.dataset,
      });
    });
    return next;
  }
  async preview(
    user: StaffIdentity,
    sourceId: string,
    dataset: DatasetKind,
    input: string,
    options: ImportOptions,
    behavior: ImportBehavior,
    trigger: "manual" | "delivered_csv" = "manual",
  ) {
    administrator(user);
    const source = this.source(sourceId);
    requireValue(
      source.approved,
      409,
      "SOURCE_NOT_APPROVED",
      "Approve this CSV source before importing data.",
    );
    requireValue(
      datasets.includes(dataset) && ["snapshot", "upsert"].includes(behavior),
      400,
      "IMPORT_CONFIG",
      "Unsupported dataset or import behavior.",
    );
    requireValue(
      typeof input === "string" &&
        new TextEncoder().encode(input).length <= 2 * 1024 * 1024,
      413,
      "IMPORT_LIMIT",
      "CSV input must be UTF-8 text at most 2 MiB.",
    );
    requireValue(
      options &&
        typeof options === "object" &&
        options.account === source.account &&
        options.timezone === source.timezone &&
        typeof options.scope === "string" &&
        options.scope.trim(),
      400,
      "SOURCE_SCOPE",
      "Import account and timezone must match the approved source; declare the report scope explicitly.",
    );
    const id = randomUUID(),
      at = new Date().toISOString(),
      slot = this.slot(sourceId, dataset);
    let candidate: Stage["candidate"] | null = null,
      errors: string[] = [],
      warnings: string[] = [],
      rows = 0;
    try {
      if (dataset === "workOrders") {
        const p = await previewCsv(input, options as CsvOptions);
        candidate = p.snapshot;
        errors = p.errors;
        warnings = p.warnings;
        rows = p.rows;
      } else if (dataset === "vendors") {
        const p = await previewVendorCsv(input, options as VendorImportOptions);
        candidate = p.directory;
        errors = p.errors;
        warnings = p.warnings;
        rows = p.rows;
      } else {
        const p = await previewPropertyCsv(input, options as PropertyOptions);
        candidate = p.directory;
        errors = p.errors;
        warnings = p.warnings;
        rows = p.rows;
      }
    } catch {
      errors = [
        "CSV validation failed. Check the mapped headers, values and source metadata.",
      ];
    }
    const summary: ImportSummary = {
      id,
      sourceId,
      dataset,
      status: candidate && !errors.length ? "preview" : "rejected",
      at,
      rows,
      errors,
      warnings,
      behavior,
      trigger,
    };
    this.store.set("import", id, summary);
    this.audit(
      user,
      summary.status === "preview" ? "import_previewed" : "import_rejected",
      sourceId,
      { dataset, rows, issueCount: errors.length },
    );
    let missing = 0,
      carried = 0;
    if (candidate && !errors.length) {
      const latestIds = new Set(
          rowsOf(dataset, candidate).map((row) => row.id),
        ),
        oldRows = slot ? rowsOf(dataset, slot.current) : [];
      missing = oldRows.filter((row) => !latestIds.has(row.id)).length;
      carried = behavior === "upsert" ? missing : 0;
      const [headers, ...parsed] = parseCsv(input),
        mapping = options.mapping;
      const original = parsed.map((cells) =>
        Object.fromEntries(
          Object.entries(mapping)
            .filter(([, column]) => column && headers.includes(column))
            .map(([field, column]) => [field, cells[headers.indexOf(column!)]]),
        ),
      );
      const canonical = (value: unknown) =>
        JSON.stringify(value, (_key, item) =>
          item && typeof item === "object" && !Array.isArray(item)
            ? Object.fromEntries(
                Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
              )
            : item,
        );
      const stage: Stage = {
        id,
        sourceId,
        dataset,
        options: structuredClone(options),
        candidate,
        digest: digest(input + canonical(options) + behavior),
        revision: slot?.revision ?? 0,
        sourceRevision: source.revision,
        actor: user.subject,
        expires: Date.now() + 1200000,
        behavior,
        original,
        trigger,
      };
      this.store.set("stage", id, stage);
    }
    return {
      id,
      rows,
      errors,
      warnings,
      sample: candidate ? rowsOf(dataset, candidate).slice(0, 5) : [],
      missing,
      carried,
    };
  }
  commit(user: StaffIdentity, id: string): ManagedWorkspace {
    administrator(user);
    try {
      return this.applyCommit(user, id);
    } catch (error) {
      try {
        const stage = this.store.get<Stage>("stage", id),
          summary = this.store.get<ImportSummary>("import", id);
        if (stage?.actor === user.subject && summary) {
          const message =
            error instanceof SafeError
              ? error.message
              : "Commit failed safely; previous successful data retained.";
          this.store.transaction(() => {
            this.store.set("import", id, {
              ...summary,
              status: "rejected",
              errors: [message],
            });
            this.store.delete("stage", id);
            this.audit(user, "import_commit_failed", stage.sourceId, {
              dataset: stage.dataset,
              code: error instanceof SafeError ? error.code : "STORAGE_FAILURE",
            });
          });
        }
      } catch {
        /* Last successful transaction is preserved; no unsafe fallback or raw logging. */
      }
      throw error;
    }
  }
  private applyCommit(user: StaffIdentity, id: string) {
    administrator(user);
    const stage = this.store.get<Stage>("stage", id);
    requireValue(
      stage && stage.actor === user.subject && stage.expires > Date.now(),
      409,
      "PREVIEW_EXPIRED",
      "Preview is invalid, expired or belongs to another administrator. Validate again.",
    );
    const source = this.source(stage.sourceId),
      old = this.slot(stage.sourceId, stage.dataset);
    requireValue(
      source.approved &&
        source.revision === stage.sourceRevision &&
        (old?.revision ?? 0) === stage.revision,
      409,
      "PREVIEW_STALE",
      "Data or source configuration changed after preview. Previous data is retained; validate again.",
    );
    const loadedAt = new Date().toISOString();
    const summary = this.store.get<ImportSummary>("import", id)!;
    this.store.transaction(() => {
      if (old?.digest === stage.digest) {
        this.store.set("slot", stage.sourceId + ":" + stage.dataset, {
          ...old,
          checkedAt: loadedAt,
        });
        this.store.set("import", id, {
          ...summary,
          status: "replay",
          at: loadedAt,
        });
        this.store.delete("stage", id);
        this.audit(user, "import_replayed", stage.sourceId, {
          dataset: stage.dataset,
        });
        return;
      }
      const candidate = structuredClone(stage.candidate),
        incoming = rowsOf(stage.dataset, candidate),
        incomingIds = new Set(incoming.map((row) => row.id));
      let carried = 0;
      if (stage.behavior === "upsert" && old) {
        const oldData =
          stage.dataset === "workOrders"
            ? (old.current as Snapshot).datasets.find(
                (d) => d.datasetType === "workOrders",
              )!
            : (old.current as VendorDirectory | PropertyDirectory).dataset;
        const nextData =
          stage.dataset === "workOrders"
            ? (candidate as Snapshot).datasets.find(
                (d) => d.datasetType === "workOrders",
              )!
            : (candidate as VendorDirectory | PropertyDirectory).dataset;
        const oldMapping =
          stage.dataset === "workOrders"
            ? (old.current as Snapshot).mappingVersion
            : oldData.mappingVersion;
        const nextMapping =
          stage.dataset === "workOrders"
            ? (candidate as Snapshot).mappingVersion
            : nextData.mappingVersion;
        requireValue(
          oldData.sourceAccountId === nextData.sourceAccountId &&
            oldData.reportScope.comparisonKey ===
              nextData.reportScope.comparisonKey &&
            oldMapping === nextMapping,
          409,
          "UPSERT_SCOPE",
          "Incremental merge requires the same verified account, report scope and mapping semantics. Use a reviewed snapshot baseline or a separate source.",
        );
        const missing = rowsOf(stage.dataset, old.current).filter(
          (row) => !incomingIds.has(row.id),
        );
        carried = missing.length;
        const combined = [...incoming, ...missing];
        if (stage.dataset === "workOrders") {
          const next = candidate as Snapshot,
            previous = old.current as Snapshot;
          next.workOrders = combined as WorkOrder[];
          next.properties = [
            ...next.properties,
            ...previous.properties.filter(
              (p) => !next.properties.some((n) => n.id === p.id),
            ),
          ];
          next.categories = [
            ...next.categories,
            ...previous.categories.filter(
              (c) => !next.categories.some((n) => n.id === c.id),
            ),
          ];
        } else if (stage.dataset === "vendors") {
          const next = candidate as VendorDirectory,
            previous = old.current as VendorDirectory;
          next.vendors = combined as Vendor[];
          next.categories = [
            ...next.categories,
            ...previous.categories.filter(
              (c) => !next.categories.some((n) => n.id === c.id),
            ),
          ];
        } else
          (candidate as PropertyDirectory).properties = combined as Property[];
      }
      if (stage.dataset === "workOrders") {
        const s = candidate as Snapshot;
        s.importedAt = loadedAt;
        s.datasets.forEach((d) => (d.importedAt = loadedAt));
        if (carried) {
          s.qualitySummary.push({
            code: "CARRIED_RECORDS",
            severity: "warning",
            safeMessage: `Incremental last-known state includes ${carried} records not observed in the latest delivered batch. Status is last known, not newly confirmed.`,
          });
          s.datasets[0].reportScope.description += ` · incremental last-known state · ${carried} carried records`;
        }
      } else
        (candidate as VendorDirectory | PropertyDirectory).dataset.importedAt =
          loadedAt;
      const slot: DataSlot = {
        revision: (old?.revision ?? 0) + 1,
        current: candidate,
        previous: old?.current ?? null,
        digest: stage.digest,
        acceptedAt: loadedAt,
        checkedAt: loadedAt,
        carried,
        behavior: stage.behavior,
      };
      this.store.set("slot", stage.sourceId + ":" + stage.dataset, slot);
      for (const row of incoming)
        this.store.set(
          "record",
          stage.sourceId + ":" + stage.dataset + ":" + digest(row.id),
          {
            sourceId: stage.sourceId,
            dataset: stage.dataset,
            id: row.id,
            record: row,
            lastSeenAt: loadedAt,
            observed: true,
          },
        );
      this.store.set("source", source.id, {
        ...source,
        presets: { ...source.presets, [stage.dataset]: stage.options },
      });
      this.store.set("original", id, {
        id,
        sourceId: stage.sourceId,
        dataset: stage.dataset,
        at: loadedAt,
        fields: stage.original,
      });
      this.store.set("observation", id, {
        id,
        sourceId: stage.sourceId,
        dataset: stage.dataset,
        at: loadedAt,
        value: candidate,
      });
      this.store.set("import", id, {
        ...summary,
        status: "accepted",
        at: loadedAt,
      });
      this.store.delete("stage", id);
      this.audit(user, "import_committed", source.id, {
        dataset: stage.dataset,
        rows: incoming.length,
        carried,
        behavior: stage.behavior,
      });
    });
    return this.workspace(stage.sourceId, user);
  }
  empty(source: SourceConfig): Snapshot {
    const timestamp = source.createdAt;
    return {
      id: source.id + ":empty",
      sourceMode: "csv",
      schemaVersion: "1",
      mappingVersion: "not-imported",
      rulesVersion: this.settings().rules.rulesVersion,
      importedAt: timestamp,
      datasets: [
        {
          id: "work-orders-not-imported",
          datasetType: "workOrders",
          sourceAccountId: source.account,
          reportAsOf: null,
          importedAt: timestamp,
          sourceTimezone: source.timezone,
          mappingVersion: "not-imported",
          reportScope: {
            description:
              "No retained work-order report; timestamp is workspace creation only",
            comparisonKey: source.scope,
            includedStatuses: [],
          },
          completeness: "unknown",
          coverageFields: [],
          rowCounts: { accepted: 0, rejected: 0 },
        },
      ],
      workOrders: [],
      vendors: [],
      properties: [],
      categories: [],
      qualitySummary: [
        {
          code: "NOT_IMPORTED",
          severity: "warning",
          safeMessage:
            "No retained work-order report is available. Import one or review the retention policy.",
        },
      ],
    };
  }
  workspace(id: string, user: StaffIdentity): ManagedWorkspace {
    this.cleanup();
    const source = this.source(id);
    requireValue(
      source.approved,
      409,
      "SOURCE_NOT_APPROVED",
      "This source is not approved for operational access.",
    );
    const work = this.slot(id, "workOrders"),
      vendorSlot = this.slot(id, "vendors"),
      propertySlot = this.slot(id, "properties");
    const snapshot = work
        ? structuredClone(work.current as Snapshot)
        : this.empty(source),
      vendorDirectory = vendorSlot
        ? structuredClone(vendorSlot.current as VendorDirectory)
        : null,
      propertyDirectory = propertySlot
        ? structuredClone(propertySlot.current as PropertyDirectory)
        : null;
    if (vendorDirectory) {
      if (user.role !== "administrator")
        vendorDirectory.vendors = vendorDirectory.vendors.map((v) => ({
          ...v,
          businessEmail: null,
          businessPhone: null,
          contactsRestricted: true,
        }));
      if (vendorDirectory.verifiedIdentifiers)
        snapshot.vendors = vendorDirectory.vendors;
      snapshot.datasets.push(vendorDirectory.dataset);
    }
    if (propertyDirectory?.verifiedIdentifiers) {
      snapshot.properties = [
        ...propertyDirectory.properties,
        ...snapshot.properties.filter(
          (p) =>
            !propertyDirectory.properties.some((master) => master.id === p.id),
        ),
      ];
      snapshot.datasets.push(propertyDirectory.dataset);
    }
    snapshot.id += [
      vendorSlot?.revision ?? 0,
      propertySlot?.revision ?? 0,
    ].join(":");
    const previous =
      work?.previous && work.behavior === "snapshot"
        ? (work.previous as Snapshot)
        : null;
    const latestIds = new Set(snapshot.workOrders.map((w) => w.id)),
      notObserved = previous
        ? previous.workOrders.filter((w) => !latestIds.has(w.id)).length
        : 0;
    return {
      snapshot: reconcileCatalogQuality(snapshot),
      vendorDirectory,
      propertyDirectory,
      previous,
      carried: work?.carried ?? 0,
      notObserved,
      refresh: Object.fromEntries(
        datasets.flatMap((kind) => {
          const data = this.slot(id, kind);
          return data
            ? [
                [
                  kind,
                  {
                    lastSuccessfulImport: data.acceptedAt,
                    lastCheckedAt: data.checkedAt,
                    revision: data.revision,
                    behavior: data.behavior,
                    carried: data.carried,
                  },
                ],
              ]
            : [];
        }),
      ),
    };
  }
  history(id?: string) {
    return this.store
      .list<ImportSummary>("import")
      .filter((row) => !id || row.sourceId === id)
      .slice(0, 200);
  }
  cleanup(now = Date.now()) {
    const cutoff = now - this.settings().retentionDays * 86400000;
    for (const stage of this.store.list<Stage>("stage"))
      if (stage.expires <= now) {
        this.store.delete("stage", stage.id);
        const attempt = this.store.get<ImportSummary>("import", stage.id);
        if (attempt)
          this.store.set("import", stage.id, { ...attempt, status: "expired" });
      }
    for (const namespace of ["import", "audit", "original", "observation"]) {
      for (const entry of this.store.list<{ id?: string; at: string }>(
        namespace,
      )) {
        if (Date.parse(entry.at) < cutoff && entry.id)
          this.store.delete(namespace, entry.id);
      }
    }
    for (const source of this.sources())
      for (const dataset of datasets) {
        const slot = this.slot(source.id, dataset);
        if (slot && Date.parse(slot.acceptedAt) < cutoff)
          this.store.delete("slot", source.id + ":" + dataset);
        else if (slot?.previous) {
          const prior =
            dataset === "workOrders"
              ? (slot.previous as Snapshot).importedAt
              : (slot.previous as VendorDirectory | PropertyDirectory).dataset
                  .importedAt;
          if (Date.parse(prior) < cutoff)
            this.store.set("slot", source.id + ":" + dataset, {
              ...slot,
              previous: null,
            });
        }
      }
    // A fresh incremental batch cannot extend an unobserved row's retention.
    const expired = new Map<
      string,
      { sourceId: string; dataset: DatasetKind; ids: Set<string> }
    >();
    for (const row of this.store.list<{
      sourceId: string;
      dataset: DatasetKind;
      id: string;
      lastSeenAt: string;
    }>("record")) {
      if (Date.parse(row.lastSeenAt) >= cutoff) continue;
      const key = row.sourceId + ":" + row.dataset;
      if (!expired.has(key))
        expired.set(key, {
          sourceId: row.sourceId,
          dataset: row.dataset,
          ids: new Set(),
        });
      expired.get(key)!.ids.add(row.id);
    }
    for (const [key, group] of expired) {
      this.store.transaction(() => {
        const slot = this.slot(group.sourceId, group.dataset);
        if (slot) {
          const current = structuredClone(slot.current);
          const retained = rowsOf(group.dataset, current).filter(
            (row) => !group.ids.has(row.id),
          );
          const removed =
            rowsOf(group.dataset, current).length - retained.length;
          if (removed) {
            const marker = `:retention-${randomUUID()}`;
            if (group.dataset === "workOrders") {
              const snapshot = current as Snapshot;
              snapshot.id = snapshot.id.split(":retention-")[0] + marker;
              snapshot.workOrders = retained as WorkOrder[];
              const properties = new Set(
                snapshot.workOrders.map((row) => row.propertyId),
              );
              const categories = new Set(
                snapshot.workOrders.map((row) => row.categoryId),
              );
              snapshot.properties = snapshot.properties.filter((property) =>
                properties.has(property.id),
              );
              snapshot.categories = snapshot.categories.filter((category) =>
                categories.has(category.id),
              );
              snapshot.qualitySummary = snapshot.qualitySummary.filter(
                (issue) =>
                  issue.code !== "CARRIED_RECORDS" &&
                  issue.code !== "RETENTION_PRUNED",
              );
              snapshot.qualitySummary.push({
                code: "RETENTION_PRUNED",
                severity: "warning",
                safeMessage:
                  "Retention removed expired last-known records. Import a reviewed report to restore newly supplied observations.",
              });
              if (slot.carried > removed)
                snapshot.qualitySummary.push({
                  code: "CARRIED_RECORDS",
                  severity: "warning",
                  safeMessage: `${slot.carried - removed} retained records remain last known, not newly confirmed.`,
                });
            } else if (group.dataset === "vendors") {
              const directory = current as VendorDirectory;
              directory.id = directory.id.split(":retention-")[0] + marker;
              directory.vendors = retained as Vendor[];
            } else {
              const directory = current as PropertyDirectory;
              directory.id = directory.id.split(":retention-")[0] + marker;
              directory.properties = retained as Property[];
            }
            const report =
              group.dataset === "workOrders"
                ? (current as Snapshot).datasets.find(
                    (data) => data.datasetType === "workOrders",
                  )!
                : (current as VendorDirectory | PropertyDirectory).dataset;
            report.completeness = "partial";
            report.reportScope.description =
              report.reportScope.description.replace(
                / · \d+ carried records$/,
                "",
              );
            if (
              !report.reportScope.description.includes(" · retention applied")
            )
              report.reportScope.description += " · retention applied";
          }
          if (
            removed ||
            (slot.previous &&
              rowsOf(group.dataset, slot.previous).some((row) =>
                group.ids.has(row.id),
              ))
          ) {
            this.store.set("slot", key, {
              ...slot,
              current,
              previous: null,
              carried: Math.max(0, slot.carried - removed),
              revision: slot.revision + 1,
              digest: "",
            });
          }
        }
        // A mixed historical copy is discarded rather than retaining expired fields.
        for (const observation of this.store.list<{
          id: string;
          sourceId: string;
          dataset: DatasetKind;
          value: DataSlot["current"];
        }>("observation")) {
          if (
            observation.sourceId === group.sourceId &&
            observation.dataset === group.dataset &&
            rowsOf(group.dataset, observation.value).some((row) =>
              group.ids.has(row.id),
            )
          )
            this.store.delete("observation", observation.id);
        }
        for (const id of group.ids)
          this.store.delete("record", key + ":" + digest(id));
      });
    }
  }
}
