import { parseCsv } from "../csv";
import type { CsvOptions } from "../csv";
import type { VendorImportOptions } from "../vendorRepository";
import type { PropertyOptions } from "../propertyCsv";
export type DatasetKind = "workOrders" | "vendors" | "properties";
export type ImportOptions = CsvOptions | VendorImportOptions | PropertyOptions;
export interface SavedReport {
  kind: DatasetKind;
  input: string;
  options: ImportOptions;
  receivedAt: string;
  observationId: string;
}
/** Keep only explicitly mapped columns; never persist arbitrary source notes/attachments. */
export function mappedCsv(input: string, options: ImportOptions) {
  const [headers, ...rows] = parseCsv(input);
  const mapped = new Set(
    Object.values(options.mapping).filter((value): value is string => !!value),
  );
  const columns = headers.filter((column) => mapped.has(column));
  if (
    !columns.length ||
    [...mapped].some((column) => !headers.includes(column))
  )
    throw new Error("Map actual report headers before saving.");
  const quote = (value: string) =>
    /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return [
    columns,
    ...rows.map((row) => columns.map((column) => row[headers.indexOf(column)])),
  ]
    .map((row) => row.map(quote).join(","))
    .join("\n");
}
export function savedReport(
  kind: DatasetKind,
  input: string,
  options: ImportOptions,
  observationId: string,
  receivedAt = new Date().toISOString(),
): SavedReport {
  return {
    kind,
    input: mappedCsv(input, options),
    options: structuredClone(options),
    observationId,
    receivedAt,
  };
}
