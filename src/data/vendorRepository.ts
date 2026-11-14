import { parseCsv } from "./csv";
import { dateKey } from "../domain/rules";
import type { Coverage, SourceDate, Vendor } from "../domain/types";
import type { VendorDirectory } from "../domain/vendors";
export const vendorFields = [
  "sourceId",
  "displayName",
  "vendorType",
  "categories",
  "businessEmail",
  "businessPhone",
  "active",
  "state",
  "liabilityInsuranceExpiration",
] as const;
export type VendorField = (typeof vendorFields)[number];
export interface VendorImportOptions {
  account: string;
  scope: string;
  timezone: string;
  reportAsOf: string;
  mapping: Partial<Record<VendorField, string>>;
  activeMap: Record<string, "active" | "inactive" | "unknown">;
  categorySeparator: ";" | "|" | ",";
  redacted: boolean;
  verifiedIdentifiers: boolean;
}
export interface VendorPreview {
  id: string;
  digest: string;
  directory: VendorDirectory | null;
  errors: string[];
  warnings: string[];
  rows: number;
}
const canonical = (input: unknown) =>
  JSON.stringify(input, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
export async function previewVendorCsv(
  input: string,
  options: VendorImportOptions,
): Promise<VendorPreview> {
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(input + canonical(options)),
      ),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const out: VendorPreview = {
    id: crypto.randomUUID(),
    digest,
    directory: null,
    errors: [],
    warnings: [],
    rows: 0,
  };
  try {
    if (!options.redacted)
      throw new Error(
        "Confirm synthetic or approved redacted evaluation data only; no private contacts.",
      );
    if (
      !options.account.trim() ||
      !options.scope.trim() ||
      options.account.length > 100 ||
      options.scope.length > 500
    )
      throw new Error(
        "Source account and report scope are required within 100 / 500 characters.",
      );
    if (!options.timezone.trim())
      throw new Error("A source timezone is required.");
    new Intl.DateTimeFormat("en", { timeZone: options.timezone });
    if (
      options.reportAsOf &&
      !dateKey(
        { value: options.reportAsOf, precision: "instant" },
        options.timezone,
      )
    )
      throw new Error("Report time must be an ISO timestamp with an offset.");
    if (![";", "|", ","].includes(options.categorySeparator))
      throw new Error("Choose a supported specialty separator.");
    const [headers, ...rows] = parseCsv(input);
    out.rows = rows.length;
    const maps = Object.entries(options.mapping).filter(([, v]) => v);
    if (!options.mapping.sourceId)
      throw new Error(
        "Map a verified stable Vendor ID; names cannot identify or join vendors.",
      );
    if (
      maps.some(
        ([k, v]) =>
          !vendorFields.includes(k as VendorField) || !headers.includes(v!),
      )
    )
      throw new Error("A mapped column is not in this file.");
    if (new Set(maps.map(([, v]) => v)).size !== maps.length)
      throw new Error("Each column may map to only one field.");
    const activeMap = new Map<string, string>();
    for (const [key, value] of Object.entries(options.activeMap)) {
      if (!["active", "inactive", "unknown"].includes(value))
        throw new Error("Unsupported active-state mapping.");
      const normalized = key.trim().toLowerCase();
      if (activeMap.has(normalized) && activeMap.get(normalized) !== value)
        throw new Error("Conflicting active-state mappings.");
      activeMap.set(normalized, value);
    }
    const ids = new Set<string>(),
      categories = new Map<string, string>(),
      warnings = new Set<string>();
    const scoped = (id: string) =>
      `${encodeURIComponent(options.account.trim())}:vendor:${encodeURIComponent(id)}`;
    const vendors: Vendor[] = rows.map((row, index) => {
      const get = (field: VendorField) => {
        const header = options.mapping[field],
          value = header ? row[headers.indexOf(header)].trim() : "";
        if (value.length > 500)
          throw new Error(
            `Row ${index + 2}: a mapped cell exceeds 500 characters.`,
          );
        return value;
      };
      const id = get("sourceId");
      if (!id || ids.has(id))
        throw new Error(
          `Row ${index + 2}: missing or duplicate stable Vendor ID. Candidate rejected.`,
        );
      ids.add(id);
      const coverage: Record<string, Coverage> = {};
      vendorFields.forEach(
        (f) =>
          (coverage[f] = !options.mapping[f]
            ? "column_unavailable"
            : get(f)
              ? "present"
              : "value_missing"),
      );
      const sourceCategories = get("categories")
        .split(options.categorySeparator)
        .map((s) => s.trim())
        .filter(Boolean);
      const categoryIds = [
        ...new Set(
          sourceCategories.map((label) => {
            const key = `vendor-specialty:${encodeURIComponent(label)}`;
            categories.set(key, label);
            return key;
          }),
        ),
      ];
      const rawActive = get("active"),
        mappedActive = activeMap.get(rawActive.toLowerCase());
      if (rawActive && !mappedActive) {
        coverage.active = "invalid";
        warnings.add("Unmapped active-state values remain Unknown.");
      }
      let insurance: SourceDate | null = null;
      const rawDate = get("liabilityInsuranceExpiration");
      if (rawDate) {
        const candidate: SourceDate = {
          value: rawDate,
          precision: /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? "date" : "instant",
        };
        if (dateKey(candidate, options.timezone))
          insurance =
            candidate.precision === "instant"
              ? { ...candidate, value: new Date(rawDate).toISOString() }
              : candidate;
        else {
          coverage.liabilityInsuranceExpiration = "invalid";
          warnings.add(
            "Invalid insurance dates remain Unavailable; use YYYY-MM-DD or offset ISO timestamps.",
          );
        }
      }
      let email = get("businessEmail") || null,
        phone = get("businessPhone") || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        email = null;
        coverage.businessEmail = "invalid";
        warnings.add("Invalid business email values are excluded.");
      }
      if (
        phone &&
        (!/^[+\d()\s.\-xext]+$/i.test(phone) ||
          phone.replace(/\D/g, "").length < 6)
      ) {
        phone = null;
        coverage.businessPhone = "invalid";
        warnings.add("Invalid business phone values are excluded.");
      }
      return {
        id: scoped(id),
        sourceAccountId: options.account.trim(),
        sourceId: id,
        displayName: get("displayName"),
        vendorType: get("vendorType") || null,
        categories: categoryIds,
        active:
          mappedActive === "active"
            ? true
            : mappedActive === "inactive"
              ? false
              : null,
        businessEmail: email,
        businessPhone: phone,
        state: get("state") || null,
        liabilityInsuranceExpiration: insurance,
        fieldCoverage: coverage,
        provenance: "csv-vendors",
      };
    });
    if (!options.verifiedIdentifiers)
      warnings.add(
        "Workload unavailable until the Vendor ID namespace relationship is explicitly verified. No name matching.",
      );
    warnings.add(
      "Separate partial vendor report; no directory completeness, insurance compliance or quality rating is inferred.",
    );
    const importedAt = new Date().toISOString();
    out.directory = {
      id: out.id,
      sourceMode: "csv",
      vendors,
      categories: [...categories].map(([id, label]) => ({ id, label })),
      verifiedIdentifiers: options.verifiedIdentifiers,
      dataset: {
        id: "csv-vendors",
        datasetType: "vendors",
        sourceAccountId: options.account.trim(),
        reportAsOf: options.reportAsOf
          ? new Date(options.reportAsOf).toISOString()
          : null,
        importedAt,
        sourceTimezone: options.timezone,
        mappingVersion: canonical({
          mapping: options.mapping,
          activeMap: options.activeMap,
          categorySeparator: options.categorySeparator,
          verifiedIdentifiers: options.verifiedIdentifiers,
        }),
        reportScope: {
          comparisonKey: options.scope.trim(),
          description: options.scope.trim(),
          includedStatuses: [],
        },
        completeness: "partial",
        coverageFields: maps.map(([k]) => k),
        rowCounts: { accepted: vendors.length, rejected: 0 },
      },
    };
    out.warnings = [...warnings];
  } catch (error) {
    out.errors = [
      error instanceof Error ? error.message : "Vendor validation failed.",
    ];
    out.directory = null;
  }
  return out;
}
/** Adapter boundary; API implementations can return the same normalized directory. No endpoint assumptions. */
export interface VendorRepository {
  getDirectory(): VendorDirectory | null;
  previewImport(
    input: string,
    options: VendorImportOptions,
  ): Promise<VendorPreview>;
  commitImport(id: string): VendorDirectory;
  clear(): void;
}
export class VendorCsvSession implements VendorRepository {
  private current: VendorDirectory | null = null;
  private staged: VendorPreview | null = null;
  private digest = "";
  private generation = 0;
  private removed: string[] = [];
  hydrate(directory: VendorDirectory) {
    this.generation++;
    this.staged = null;
    this.current = structuredClone(directory);
    this.digest = "";
    this.removed = [];
  }
  getDirectory() {
    return this.current ? structuredClone(this.current) : null;
  }
  missingSincePrior() {
    return [...this.removed];
  }
  async previewImport(input: string, options: VendorImportOptions) {
    const generation = ++this.generation;
    this.staged = null;
    const result = await previewVendorCsv(input, structuredClone(options));
    if (generation === this.generation) this.staged = structuredClone(result);
    return result;
  }
  commitImport(id: string) {
    if (
      !this.staged ||
      this.staged.id !== id ||
      !this.staged.directory ||
      this.staged.errors.length
    )
      throw new Error(
        "Preview unavailable or stale. Validate again; previous directory retained.",
      );
    const staged = this.staged;
    this.staged = null;
    if (staged.digest === this.digest && this.current)
      return structuredClone(this.current);
    const next = staged.directory!;
    const comparable =
      this.current &&
      this.current.dataset.sourceAccountId === next.dataset.sourceAccountId &&
      this.current.dataset.reportScope.comparisonKey ===
        next.dataset.reportScope.comparisonKey &&
      this.current.dataset.mappingVersion === next.dataset.mappingVersion;
    const nextIds = new Set(next.vendors.map((v) => v.id));
    this.removed = comparable
      ? this.current!.vendors.filter((v) => !nextIds.has(v.id)).map((v) => v.id)
      : [];
    this.current = structuredClone(next);
    this.digest = staged.digest;
    return structuredClone(this.current);
  }
  discardPreview() {
    this.generation++;
    this.staged = null;
  }
  clear() {
    this.generation++;
    this.current = null;
    this.staged = null;
    this.digest = "";
    this.removed = [];
  }
}
