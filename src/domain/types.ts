export type Status =
  "open" | "in_progress" | "on_hold" | "completed" | "cancelled" | "unknown";
export type Priority = "urgent" | "high" | "normal" | "low" | "unknown";
export type Coverage =
  | "present"
  | "column_unavailable"
  | "value_missing"
  | "explicitly_absent"
  | "invalid";
export interface SourceDate {
  value: string;
  precision: "date" | "instant";
}
export interface WorkOrder {
  id: string;
  sourceAccountId: string;
  sourceId: string;
  number: string;
  propertyId: string | null;
  summaryRedacted: string | null;
  categoryId: string | null;
  status: Status;
  sourceStatus: string | null;
  priority: Priority;
  sourcePriority: string | null;
  vendorId: string | null;
  vendorAssignmentState: "assigned" | "unassigned" | "unknown";
  approvalState: "pending" | "approved" | "not_required" | "unknown";
  createdAt: SourceDate | null;
  completedAt: SourceDate | null;
  sourceUrl: string | null;
  unitLabel?: string | null;
  sourceUpdatedAt?: SourceDate | null;
  fieldCoverage: Record<string, Coverage>;
  provenance: string;
}
export interface Property {
  id: string;
  sourceAccountId: string;
  sourceId: string;
  displayName: string;
  coverageKind: "master" | "inferred";
  provenance: string;
}
export interface Vendor {
  id: string;
  sourceAccountId: string;
  sourceId: string;
  displayName: string;
  categories: string[];
  active: boolean | null;
  provenance: string;
}
export interface DatasetProvenance {
  id: string;
  datasetType: "workOrders" | "properties" | "vendors";
  sourceAccountId: string;
  reportAsOf: string | null;
  importedAt: string;
  sourceTimezone: string;
  mappingVersion: string;
  reportScope: {
    comparisonKey: string;
    includedStatuses: Status[];
    description: string;
  };
  completeness: "complete" | "partial" | "unknown";
  coverageFields: string[];
  rowCounts: { accepted: number; rejected: number };
}
export interface QualityIssue {
  code: string;
  entityId?: string;
  field?: string;
  severity: "warning" | "info";
  safeMessage: string;
}
export interface Snapshot {
  id: string;
  sourceMode: "demo" | "csv" | "api";
  schemaVersion: string;
  mappingVersion: string;
  rulesVersion: string;
  importedAt: string;
  datasets: DatasetProvenance[];
  workOrders: WorkOrder[];
  properties: Property[];
  vendors: Vendor[];
  categories: { id: string; label: string }[];
  qualitySummary: QualityIssue[];
}
export type Reason =
  "active" | "urgent" | "pending" | "aged" | "unassigned" | "completed";
export interface Rules {
  rulesVersion: string;
  timezone: string;
  agingNudgeDays: number;
  agingBucketBoundaries: [number, number, number];
  noObservedChangeDays: number;
  staleAfterHours: number;
  queueReasonOrder: Exclude<Reason, "active" | "completed">[];
}
export interface Filters {
  query: string;
  property: string[];
  status: string[];
  vendor: string[];
  category: string[];
  priority: string[];
  createdFrom: string;
  createdTo: string;
  bucket: string[];
}
