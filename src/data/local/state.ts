import { csvFields, previewCsv } from "../csv";
import { vendorFields, previewVendorCsv } from "../vendorRepository";
import { propertyFields, previewPropertyCsv } from "../propertyCsv";
import type { CsvOptions } from "../csv";
import type { VendorImportOptions } from "../vendorRepository";
import type { PropertyOptions } from "../propertyCsv";
import type { SavedReport } from "./reports";
import { mappedCsv } from "./reports";
import { defaultRules, validateRules } from "../../config/rules";
import {
  defaultReviewSettings,
  validateReviewSettings,
} from "../../config/reviewSettings";
export const MAX_LOCAL_BYTES = 12 * 1024 * 1024;
export interface LocalImport {
  kind: SavedReport["kind"];
  at: string;
  outcome: "accepted" | "replay";
  rows: number;
}
export interface LocalState {
  version: 1;
  source: "demo" | "csv";
  work: SavedReport | null;
  priorWork: SavedReport | null;
  vendor: SavedReport | null;
  priorVendor: SavedReport | null;
  property: SavedReport | null;
  rules: typeof defaultRules;
  review: typeof defaultReviewSettings;
  history: LocalImport[];
}
export const emptyLocalState = (): LocalState =>
  structuredClone({
    version: 1,
    source: "demo",
    work: null,
    priorWork: null,
    vendor: null,
    priorVendor: null,
    property: null,
    rules: defaultRules,
    review: defaultReviewSettings,
    history: [],
  });
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid backup object.");
  return value as Record<string, unknown>;
};
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error("Unsupported fields in local data. Nothing was replaced.");
}
function text(value: unknown, limit: number) {
  if (typeof value !== "string" || value.length > limit)
    throw new Error("Invalid local text field.");
  return value;
}
function receipt(value: unknown) {
  const result = text(value, 30);
  if (
    !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString() !== result ||
    Date.parse(result) > Date.now() + 300000
  )
    throw new Error("Invalid or future local receipt timestamp.");
  return result;
}
export function localText(state: LocalState) {
  const result = JSON.stringify(state);
  if (new TextEncoder().encode(result).length > MAX_LOCAL_BYTES)
    throw new Error(
      "Local workspace exceeds 12 MiB. Previous data is retained; export a backup and clear unneeded reports.",
    );
  return result;
}
async function report(value: unknown, kind: SavedReport["kind"]) {
  if (value === null) return null;
  const r = object(value);
  keys(r, ["kind", "input", "options", "observationId", "receivedAt"]);
  if (
    r.kind !== kind ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(text(r.observationId, 100))
  )
    throw new Error("Invalid report identity.");
  receipt(r.receivedAt);
  const input = text(r.input, 2 * 1024 * 1024);
  if (new TextEncoder().encode(input).length > 2 * 1024 * 1024)
    throw new Error("Saved report exceeds 2 MiB.");
  const o = object(r.options);
  const common = [
    "account",
    "scope",
    "timezone",
    "reportAsOf",
    "mapping",
    "redacted",
  ];
  const enums =
    kind === "workOrders"
      ? ["statusMap", "priorityMap", "approvalMap", "assignmentMap"]
      : kind === "vendors"
        ? ["activeMap"]
        : [];
  keys(o, [
    ...common,
    ...enums,
    ...(kind !== "workOrders" ? ["verifiedIdentifiers"] : []),
    ...(kind === "vendors" ? ["categorySeparator"] : []),
  ]);
  for (const [name, limit] of [
    ["account", 100],
    ["scope", 500],
    ["timezone", 100],
    ["reportAsOf", 40],
  ] as const)
    text(o[name], limit);
  if (
    o.redacted !== true ||
    (kind !== "workOrders" && typeof o.verifiedIdentifiers !== "boolean")
  )
    throw new Error("Report minimization/identifier review is missing.");
  const mapping = object(o.mapping);
  keys(mapping, [
    ...(kind === "workOrders"
      ? csvFields
      : kind === "vendors"
        ? vendorFields
        : propertyFields),
  ]);
  for (const column of Object.values(mapping)) text(column, 500);
  for (const name of enums) {
    const values = object(o[name]);
    if (Object.keys(values).length > 1000)
      throw new Error("Too many enum mappings.");
    for (const [key, value] of Object.entries(values)) {
      text(key, 500);
      text(value, 40);
    }
  }
  const stored = r as unknown as SavedReport;
  if (mappedCsv(input, stored.options) !== input)
    throw new Error(
      "Backup includes unmapped source columns or noncanonical report text.",
    );
  await materializeReport(stored);
  return structuredClone(stored);
}
export async function materializeReport(r: SavedReport) {
  if (r.kind === "workOrders") {
    const p = await previewCsv(r.input, r.options as CsvOptions);
    if (!p.snapshot || p.errors.length)
      throw new Error(
        "Saved work-order report failed CSV validation. Previous data retained.",
      );
    p.snapshot.id = r.observationId;
    p.snapshot.importedAt = r.receivedAt;
    p.snapshot.datasets.forEach((d) => (d.importedAt = r.receivedAt));
    return { snapshot: p.snapshot, digest: p.digest };
  }
  if (r.kind === "vendors") {
    const p = await previewVendorCsv(r.input, r.options as VendorImportOptions);
    if (!p.directory || p.errors.length)
      throw new Error(
        "Saved vendor report failed CSV validation. Previous data retained.",
      );
    p.directory.id = r.observationId;
    p.directory.dataset.importedAt = r.receivedAt;
    return { vendor: p.directory, digest: p.digest };
  }
  const p = await previewPropertyCsv(r.input, r.options as PropertyOptions);
  if (!p.directory || p.errors.length)
    throw new Error(
      "Saved property report failed CSV validation. Previous data retained.",
    );
  p.directory.id = r.observationId;
  p.directory.dataset.importedAt = r.receivedAt;
  return { property: p.directory, digest: "" };
}
export async function validateLocalState(value: unknown): Promise<LocalState> {
  const s = object(value);
  keys(s, [
    "version",
    "source",
    "work",
    "priorWork",
    "vendor",
    "priorVendor",
    "property",
    "rules",
    "review",
    "history",
  ]);
  if (s.version !== 1 || !["demo", "csv"].includes(String(s.source)))
    throw new Error("Unsupported local data version or source.");
  localText(s as unknown as LocalState);
  const rules = object(s.rules);
  keys(rules, Object.keys(defaultRules));
  if (
    Object.keys(rules).length !== Object.keys(defaultRules).length ||
    typeof rules.timezone !== "string" ||
    typeof rules.rulesVersion !== "string" ||
    !Array.isArray(rules.agingBucketBoundaries) ||
    rules.agingBucketBoundaries.length !== 3 ||
    !Array.isArray(rules.queueReasonOrder)
  )
    throw new Error("Invalid saved maintenance rules.");
  validateRules(rules as unknown as typeof defaultRules);
  if (
    [
      rules.agingNudgeDays,
      rules.noObservedChangeDays,
      rules.staleAfterHours,
      ...rules.agingBucketBoundaries,
    ].some((v) => typeof v !== "number" || v > 100000)
  )
    throw new Error("Saved rule thresholds exceed supported limits.");
  const review = object(s.review);
  keys(review, Object.keys(defaultReviewSettings));
  if (Object.keys(review).length !== Object.keys(defaultReviewSettings).length)
    throw new Error("Incomplete review settings.");
  validateReviewSettings(review as unknown as typeof defaultReviewSettings);
  const [work, priorWork, vendor, priorVendor, property] = await Promise.all([
    report(s.work, "workOrders"),
    report(s.priorWork, "workOrders"),
    report(s.vendor, "vendors"),
    report(s.priorVendor, "vendors"),
    report(s.property, "properties"),
  ]);
  const account =
    work?.options.account.trim() ??
    vendor?.options.account.trim() ??
    property?.options.account.trim();
  if (
    [work, vendor, property].some(
      (r) => r && r.options.account.trim() !== account,
    )
  )
    throw new Error(
      "Reports from different accounts cannot share one local workspace.",
    );
  if (
    (priorWork && !work) ||
    (priorVendor && !vendor) ||
    (s.source === "csv" && !work && !vendor && !property)
  )
    throw new Error("Incomplete local report relationships.");
  if (!Array.isArray(s.history) || s.history.length > 50)
    throw new Error("Import history exceeds 50 entries.");
  for (const entry of s.history) {
    const h = object(entry);
    keys(h, ["kind", "at", "outcome", "rows"]);
    receipt(h.at);
    if (
      !["workOrders", "vendors", "properties"].includes(String(h.kind)) ||
      !["accepted", "replay"].includes(String(h.outcome)) ||
      !Number.isInteger(h.rows) ||
      Number(h.rows) < 0 ||
      Number(h.rows) > 10000
    )
      throw new Error("Invalid local import history.");
  }
  return structuredClone({
    ...s,
    work,
    priorWork,
    vendor,
    priorVendor,
    property,
  }) as unknown as LocalState;
}
const hash = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
export async function exportBackup(state: LocalState) {
  const payload = await validateLocalState(state);
  const checksum = await hash(localText(payload));
  return JSON.stringify({
    format: "tpm-static-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    checksum,
    payload,
  });
}
export async function restoreBackup(input: string) {
  if (new TextEncoder().encode(input).length > MAX_LOCAL_BYTES + 4096)
    throw new Error("Backup exceeds the 12 MiB workspace limit.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("Backup is not valid JSON. Previous data retained.");
  }
  const b = object(parsed);
  keys(b, ["format", "version", "exportedAt", "checksum", "payload"]);
  if (b.format !== "tpm-static-backup" || b.version !== 1)
    throw new Error("Unsupported backup format/version.");
  receipt(b.exportedAt);
  if (
    typeof b.checksum !== "string" ||
    b.checksum !== (await hash(JSON.stringify(b.payload)))
  )
    throw new Error("Backup integrity check failed. Previous data retained.");
  return validateLocalState(b.payload);
}
