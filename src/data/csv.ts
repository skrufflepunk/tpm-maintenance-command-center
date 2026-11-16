import { dateKey } from "../domain/rules";
import type {
  Coverage,
  Priority,
  Snapshot,
  SourceDate,
  Status,
  WorkOrder,
} from "../domain/types";
export const csvFields = [
  "sourceId",
  "number",
  "propertyId",
  "propertyName",
  "summaryRedacted",
  "status",
  "priority",
  "category",
  "vendorId",
  "vendorAssignmentState",
  "approvalState",
  "createdAt",
  "completedAt",
  "sourceUpdatedAt",
  "unitLabel",
] as const;
export type CsvField = (typeof csvFields)[number];
export interface CsvOptions {
  account: string;
  scope: string;
  timezone: string;
  reportAsOf: string;
  mapping: Partial<Record<CsvField, string>>;
  statusMap: Record<string, Status>;
  priorityMap: Record<string, Priority>;
  approvalMap: Record<string, WorkOrder["approvalState"]>;
  assignmentMap: Record<string, WorkOrder["vendorAssignmentState"]>;
  redacted: boolean;
}
export interface CsvPreview {
  id: string;
  snapshot: Snapshot | null;
  errors: string[];
  warnings: string[];
  rows: number;
  digest: string;
  options: CsvOptions;
}
export const MAX_CSV_BYTES = 2 * 1024 * 1024;
/** RFC-style quoted comma-separated records. Never executes formulas or guesses delimiters. */
export function parseCsv(input: string): string[][] {
  if (new TextEncoder().encode(input).length > MAX_CSV_BYTES)
    throw new Error("CSV exceeds the 2 MiB limit.");
  if (input.includes("\0")) throw new Error("Invalid CSV encoding. Use UTF-8.");
  const text = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const pushCell = () => {
    row.push(cell);
    cell = "";
    closed = false;
  };
  const pushRow = () => {
    pushCell();
    if (row.some((v) => v !== "")) rows.push(row);
    row = [];
    if (rows.length > 10001) throw new Error("CSV exceeds 10,000 data rows.");
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell || closed) throw new Error("Malformed CSV quotation.");
      quoted = true;
    } else if (c === ",") pushCell();
    else if (c === "\n") pushRow();
    else {
      if (closed) throw new Error("Unexpected text after a quoted cell.");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  if (cell || row.length || closed) pushRow();
  if (rows.length < 2)
    throw new Error("CSV needs headers and at least one data row.");
  const headers = rows[0].map((h) => h.trim());
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length)
    throw new Error("Headers must be nonempty and unique.");
  if (headers.length > 100) throw new Error("CSV exceeds 100 columns.");
  if (rows.slice(1).some((r) => r.length !== headers.length))
    throw new Error(
      "CSV rows must have the same number of cells as the header.",
    );
  return [headers, ...rows.slice(1)];
}
const token = (s: string) => s.trim().toLowerCase();
const safeText = (s: string) => {
  if (s.trim().length > 500)
    throw new Error(
      "A mapped cell exceeds the 500-character evaluation limit. Shorten or omit that column.",
    );
  return s.trim();
};
const canonicalJson = (value: unknown) =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
export async function previewCsv(
  input: string,
  options: CsvOptions,
): Promise<CsvPreview> {
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(input + canonicalJson(options)),
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const result: CsvPreview = {
    id: crypto.randomUUID(),
    snapshot: null,
    errors: [],
    warnings: [],
    rows: 0,
    digest,
    options: structuredClone(options),
  };
  try {
    if (!options.redacted)
      throw new Error(
        "Confirm the file contains only synthetic or approved redacted evaluation data.",
      );
    if (!options.account.trim() || !options.scope.trim())
      throw new Error("Source account and report scope are required.");
    if (options.account.length > 100 || options.scope.length > 500)
      throw new Error("Account or scope is too long.");
    new Intl.DateTimeFormat("en", { timeZone: options.timezone });
    if (
      options.reportAsOf &&
      !dateKey(
        { value: options.reportAsOf, precision: "instant" },
        options.timezone,
      )
    )
      throw new Error("Report-as-of must be an ISO timestamp with an offset.");
    const [headers, ...data] = parseCsv(input);
    result.rows = data.length;
    const mappings = Object.entries(options.mapping).filter(([, v]) => v);
    if (!options.mapping.sourceId)
      throw new Error("Map a verified stable work-order ID column.");
    if (
      mappings.some(
        ([key, value]) =>
          !csvFields.includes(key as CsvField) || !headers.includes(value!),
      )
    )
      throw new Error("A mapped column is not present in the CSV headers.");
    if (new Set(mappings.map(([, v]) => v)).size !== mappings.length)
      throw new Error(
        "Each source column may map to only one normalized field.",
      );
    const values = <T extends string>(
      map: Record<string, T>,
      allowed: string[],
    ) => {
      if (Object.values(map).some((v) => !allowed.includes(v)))
        throw new Error("An enum mapping contains an unsupported value.");
      const normalized = new Map<string, T>();
      for (const [key, value] of Object.entries(map)) {
        const canonical = token(key);
        if (normalized.has(canonical) && normalized.get(canonical) !== value)
          throw new Error(
            "Conflicting mappings for the same normalized source value.",
          );
        normalized.set(canonical, value);
      }
      return normalized;
    };
    const statusMap = values(options.statusMap, [
      "open",
      "in_progress",
      "on_hold",
      "completed",
      "cancelled",
      "unknown",
    ]);
    const priorityMap = values(options.priorityMap, [
      "urgent",
      "high",
      "normal",
      "low",
      "unknown",
    ]);
    const approvalMap = values(options.approvalMap, [
      "pending",
      "approved",
      "not_required",
      "unknown",
    ]);
    const assignmentMap = values(options.assignmentMap, [
      "assigned",
      "unassigned",
      "unknown",
    ]);
    const warnings = new Set<string>(),
      ids = new Set<string>();
    const importedAt = new Date().toISOString(),
      provenance = "csv-work-orders";
    const properties = new Map<string, string>(),
      categories = new Map<string, string>();
    const workOrders: WorkOrder[] = data.map((cells, index) => {
      const rowNumber = index + 2;
      const get = (field: CsvField) => {
        const header = options.mapping[field];
        return header ? safeText(cells[headers.indexOf(header)]) : "";
      };
      const sourceId = get("sourceId");
      if (!sourceId)
        throw new Error(`Row ${rowNumber}: missing stable work-order ID.`);
      if (ids.has(sourceId))
        throw new Error(
          `Row ${rowNumber}: duplicate stable work-order ID. The candidate was rejected.`,
        );
      ids.add(sourceId);
      const coverage: Record<string, Coverage> = {};
      for (const field of csvFields)
        coverage[field] = options.mapping[field]
          ? get(field)
            ? "present"
            : "value_missing"
          : "column_unavailable";
      const enumValue = <T extends string>(
        field: CsvField,
        map: Map<string, T>,
        unknown: T,
      ): T => {
        const raw = get(field);
        if (!raw) return unknown;
        const mapped = map.get(token(raw));
        if (!mapped) {
          coverage[field] = "invalid";
          warnings.add(`${field}: unmapped source values remain Unknown.`);
        }
        return mapped ?? unknown;
      };
      const date = (
        field: "createdAt" | "completedAt" | "sourceUpdatedAt",
      ): SourceDate | null => {
        const value = get(field);
        if (!value) return null;
        const d: SourceDate = {
          value,
          precision: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "date" : "instant",
        };
        if (!dateKey(d, options.timezone)) {
          coverage[field] = "invalid";
          warnings.add(
            `${field}: invalid dates excluded; use YYYY-MM-DD or ISO timestamps with offsets.`,
          );
          return null;
        }
        return d.precision === "instant"
          ? { ...d, value: new Date(value).toISOString() }
          : d;
      };
      const status = enumValue("status", statusMap, "unknown"),
        priority = enumValue("priority", priorityMap, "unknown"),
        approvalState = enumValue("approvalState", approvalMap, "unknown");
      const vendorId = get("vendorId") || null;
      let vendorAssignmentState = enumValue(
        "vendorAssignmentState",
        assignmentMap,
        "unknown",
      );
      if (
        vendorId &&
        vendorAssignmentState === "unknown" &&
        !get("vendorAssignmentState")
      )
        vendorAssignmentState = "assigned";
      if (
        (vendorId && vendorAssignmentState === "unassigned") ||
        (!vendorId && vendorAssignmentState === "assigned")
      ) {
        vendorAssignmentState = "unknown";
        warnings.add("Conflicting vendor assignment data remains Unknown.");
        coverage.vendorAssignmentState = "invalid";
      }
      if (vendorAssignmentState === "unassigned")
        coverage.vendorAssignmentState = "explicitly_absent";
      else if (vendorAssignmentState === "assigned")
        coverage.vendorAssignmentState = "present";
      const scoped = (kind: string, id: string) =>
        `${encodeURIComponent(options.account.trim())}:${kind}:${encodeURIComponent(id)}`;
      const propertyId = get("propertyId")
        ? scoped("property", get("propertyId"))
        : null;
      if (propertyId) {
        const name = get("propertyName") || "Unknown property name";
        if (properties.has(propertyId) && properties.get(propertyId) !== name)
          throw new Error(
            `Row ${rowNumber}: conflicting labels for the same property ID.`,
          );
        properties.set(propertyId, name);
      } else if (get("propertyName"))
        warnings.add("Property labels without verified IDs are not joined.");
      const category = get("category"),
        categoryId = category ? scoped("category", category) : null;
      if (categoryId) categories.set(categoryId, category);
      const createdAt = date("createdAt"),
        completedAt = date("completedAt");
      if (
        createdAt &&
        completedAt &&
        Date.parse(completedAt.value) < Date.parse(createdAt.value)
      )
        warnings.add(
          "Inverted creation/completion dates are excluded from duration calculations.",
        );
      if (
        createdAt &&
        options.reportAsOf &&
        dateKey(createdAt, options.timezone)! >
          dateKey(
            { value: options.reportAsOf, precision: "instant" },
            options.timezone,
          )!
      )
        warnings.add(
          "Creation dates after report-as-of are excluded from active age.",
        );
      if (vendorId)
        warnings.add(
          "Vendor directory not supplied; assigned IDs remain unresolved, not unassigned.",
        );
      return {
        id: scoped("work-order", sourceId),
        sourceAccountId: options.account.trim(),
        sourceId,
        number: get("number") || sourceId,
        propertyId,
        summaryRedacted: get("summaryRedacted") || null,
        categoryId,
        status,
        sourceStatus: get("status") || null,
        priority,
        sourcePriority: get("priority") || null,
        vendorId: vendorId ? scoped("vendor", vendorId) : null,
        vendorAssignmentState,
        approvalState,
        createdAt,
        completedAt,
        sourceUpdatedAt: date("sourceUpdatedAt"),
        unitLabel: get("unitLabel") || null,
        sourceUrl: null,
        fieldCoverage: coverage,
        provenance,
      };
    });
    if (workOrders.some((w) => w.status === "unknown"))
      warnings.add(
        "Unknown status records are excluded from known active and terminal totals.",
      );
    if (!options.reportAsOf)
      warnings.add(
        "Source report time unknown; active age uses the explicitly labeled load-time fallback.",
      );
    result.warnings = [...warnings];
    result.snapshot = {
      id: result.id,
      sourceMode: "csv",
      schemaVersion: "1",
      mappingVersion: canonicalJson({
        mapping: options.mapping,
        status: Object.fromEntries(statusMap),
        priority: Object.fromEntries(priorityMap),
        approval: Object.fromEntries(approvalMap),
        assignment: Object.fromEntries(assignmentMap),
      }),
      rulesVersion: "demo-1",
      importedAt,
      datasets: [
        {
          id: provenance,
          datasetType: "workOrders",
          sourceAccountId: options.account.trim(),
          reportAsOf: options.reportAsOf
            ? new Date(options.reportAsOf).toISOString()
            : null,
          importedAt,
          sourceTimezone: options.timezone,
          mappingVersion: "user-reviewed-1",
          reportScope: {
            comparisonKey: options.scope.trim(),
            description: options.scope.trim(),
            includedStatuses: [],
          },
          completeness: "partial",
          coverageFields: mappings.map(([k]) => k),
          rowCounts: { accepted: workOrders.length, rejected: 0 },
        },
      ],
      workOrders,
      properties: [...properties].map(([id, displayName]) => ({
        id,
        sourceAccountId: options.account.trim(),
        sourceId: decodeURIComponent(id.split(":").at(-1)!),
        displayName,
        coverageKind: "inferred",
        provenance,
      })),
      vendors: [],
      categories: [...categories].map(([id, label]) => ({ id, label })),
      qualitySummary: result.warnings.map((safeMessage, i) => ({
        code: `CSV_${i}`,
        severity: "warning",
        safeMessage,
      })),
    };
  } catch (error) {
    result.errors = [
      error instanceof Error ? error.message : "CSV validation failed.",
    ];
    result.snapshot = null;
  }
  return result;
}
