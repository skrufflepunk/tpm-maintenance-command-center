import { dateKey } from "../domain/rules";
import { parseCsv } from "./csv";
import type { DatasetProvenance, Property } from "../domain/types";
export const propertyFields = [
  "sourceId",
  "displayName",
  "permittedAddress",
] as const;
export type PropertyField = (typeof propertyFields)[number];
export interface PropertyOptions {
  account: string;
  scope: string;
  timezone: string;
  reportAsOf: string;
  mapping: Partial<Record<PropertyField, string>>;
  redacted: boolean;
  verifiedIdentifiers: boolean;
}
export interface PropertyDirectory {
  id: string;
  properties: Property[];
  dataset: DatasetProvenance;
  verifiedIdentifiers: boolean;
}
export async function previewPropertyCsv(
  input: string,
  options: PropertyOptions,
) {
  const result: {
    id: string;
    directory: PropertyDirectory | null;
    errors: string[];
    warnings: string[];
    rows: number;
  } = {
    id: crypto.randomUUID(),
    directory: null,
    errors: [],
    warnings: [],
    rows: 0,
  };
  try {
    if (!options.redacted)
      throw new Error(
        "Confirm approved and minimized source fields before preview.",
      );
    if (
      !options.account?.trim() ||
      !options.scope?.trim() ||
      options.account.length > 100 ||
      options.scope.length > 500 ||
      !options.timezone?.trim()
    )
      throw new Error("Account, scope and source timezone are required.");
    new Intl.DateTimeFormat("en", { timeZone: options.timezone });
    if (
      options.reportAsOf &&
      !dateKey(
        { value: options.reportAsOf, precision: "instant" },
        options.timezone,
      )
    )
      throw new Error("Report time must be an ISO timestamp with an offset.");
    const [headers, ...rows] = parseCsv(input);
    result.rows = rows.length;
    const mappings = Object.entries(options.mapping).filter(([, v]) => v);
    if (!options.mapping.sourceId)
      throw new Error("Map a verified stable property ID.");
    if (
      mappings.some(
        ([key, column]) =>
          !propertyFields.includes(key as PropertyField) ||
          !headers.includes(column!),
      ) ||
      new Set(mappings.map(([, v]) => v)).size !== mappings.length
    )
      throw new Error("Map actual headers once each to supported fields.");
    const seen = new Set<string>(),
      provenance = "csv-property-master",
      loaded = new Date().toISOString();
    const properties = rows.map((row, index) => {
      const get = (field: PropertyField) => {
        const col = options.mapping[field],
          value = col ? row[headers.indexOf(col)].trim() : "";
        if (value.length > 500)
          throw new Error(
            `Row ${index + 2}: mapped cell exceeds 500 characters.`,
          );
        return value;
      };
      const sourceId = get("sourceId");
      if (!sourceId || seen.has(sourceId))
        throw new Error(
          `Row ${index + 2}: missing or duplicate stable property ID.`,
        );
      seen.add(sourceId);
      return {
        id: `${encodeURIComponent(options.account.trim())}:property:${encodeURIComponent(sourceId)}`,
        sourceAccountId: options.account.trim(),
        sourceId,
        displayName: get("displayName") || "Property name not recorded",
        permittedAddress: get("permittedAddress") || null,
        coverageKind: "master" as const,
        provenance,
      };
    });
    result.directory = {
      id: result.id,
      properties,
      verifiedIdentifiers: options.verifiedIdentifiers,
      dataset: {
        id: provenance,
        datasetType: "properties",
        sourceAccountId: options.account.trim(),
        sourceTimezone: options.timezone,
        reportAsOf: options.reportAsOf
          ? new Date(options.reportAsOf).toISOString()
          : null,
        importedAt: loaded,
        mappingVersion: JSON.stringify(options.mapping),
        completeness: "partial",
        coverageFields: mappings.map(([key]) => key),
        reportScope: {
          comparisonKey: options.scope.trim(),
          description: options.scope.trim(),
          includedStatuses: [],
        },
        rowCounts: { accepted: rows.length, rejected: 0 },
      },
    };
    if (!options.verifiedIdentifiers)
      result.warnings.push(
        "Directory remains separate until the property identifier relationship is explicitly verified.",
      );
  } catch (err) {
    result.errors = [
      err instanceof Error ? err.message : "Property validation failed.",
    ];
  }
  return result;
}
