import type { CsvOptions } from "./csv";
import type { VendorImportOptions } from "./vendorRepository";
import type { PropertyDirectory, PropertyOptions } from "./propertyCsv";
import type { VendorDirectory } from "../domain/vendors";
import type { Snapshot, Rules } from "../domain/types";
import type { ReviewSettings } from "../config/reviewSettings";
export type DatasetKind = "workOrders" | "vendors" | "properties";
export type ImportOptions = CsvOptions | VendorImportOptions | PropertyOptions;
export type ImportBehavior = "snapshot" | "upsert";
export interface SourceConfig {
  id: string;
  name: string;
  account: string;
  scope: string;
  timezone: string;
  approved: boolean;
  behavior: ImportBehavior;
  createdAt: string;
  revision: number;
  delivery: { enabled: boolean; intervalMinutes: number; dataset: DatasetKind };
  presets: Partial<Record<DatasetKind, ImportOptions>>;
}
export interface ServerSettings {
  rules: Rules;
  review: ReviewSettings;
  retentionDays: number;
  vendorStaleAfterHours: number;
  propertyStaleAfterHours: number;
}
export interface StaffIdentity {
  subject: string;
  role: "administrator" | "viewer";
}
export interface ImportSummary {
  id: string;
  sourceId: string;
  dataset: DatasetKind;
  status: "preview" | "rejected" | "accepted" | "replay" | "expired";
  at: string;
  rows: number;
  errors: string[];
  warnings: string[];
  behavior: ImportBehavior;
  trigger: "manual" | "delivered_csv";
}
export interface ManagedWorkspace {
  refresh: Partial<
    Record<
      DatasetKind,
      {
        lastSuccessfulImport: string;
        lastCheckedAt: string;
        revision: number;
        behavior: ImportBehavior;
        carried: number;
      }
    >
  >;
  snapshot: Snapshot;
  vendorDirectory: VendorDirectory | null;
  propertyDirectory: PropertyDirectory | null;
  previous: Snapshot | null;
  carried: number;
  notObserved: number;
}
export interface ManagedBootstrap {
  user: StaffIdentity;
  csrf: string;
  sources: SourceConfig[];
  settings: ServerSettings;
  ingestion: {
    configured: boolean;
    generation: "Unverified; no Rentvine report generation enabled";
  };
  api: {
    status: "Not configured";
    approved: false;
    capabilitiesVerified: false;
  };
  selectedSourceId: string | null;
}
export interface ManagedPreview {
  id: string;
  rows: number;
  errors: string[];
  warnings: string[];
  sample: unknown[];
  missing: number;
  carried: number;
}
