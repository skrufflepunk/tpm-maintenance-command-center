/** Future internal contracts only. No source fields are mapped or enabled by this phase. */
export interface VerifiedMoney {
  /** Decimal string in currency units; future adapters must use decimal-safe arithmetic. */
  amount: string;
  currency: string;
}
export type MaintenanceCostKind =
  | "work_order_cost"
  | "vendor_invoice"
  | "approved_estimate"
  | "actual_expense";
export interface MaintenanceCostRecord {
  id: string;
  sourceAccountId: string;
  workOrderId: string;
  vendorId: string | null;
  propertyId: string | null;
  kind: MaintenanceCostKind;
  money: VerifiedMoney;
  occurredOn: import("../domain/types").SourceDate | null;
  provenance: string;
  /** A verified source transaction key is needed to avoid invoice/expense double counting. */
  sourceTransactionId: string;
}
export interface ApprovedFinancialSnapshot {
  sourceMode: "csv" | "api";
  sourceAccountId: string;
  provenance: Omit<
    import("../domain/types").DatasetProvenance,
    "datasetType"
  > & { datasetType: "maintenanceCosts" };
  reviewedMappingVersion: string;
  approvedFields: MaintenanceCostKind[];
  records: MaintenanceCostRecord[];
}
/** Not implemented: requires reviewed financial scope, authorization and actual source mapping. */
export interface FinancialReader {
  getApprovedFinancialSnapshot(): Promise<ApprovedFinancialSnapshot>;
}
