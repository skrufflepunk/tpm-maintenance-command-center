import type { Snapshot } from "../../src/domain/types";
import type { VendorDirectory } from "../../src/domain/vendors";
/** No endpoint/authentication/rate-limit contract is verified. This is not a live adapter. */
export interface ApprovedRentvineReader {
  getMaintenanceSnapshot(): Promise<Snapshot>;
  getVendorDirectory(): Promise<VendorDirectory>;
}
export const rentvineStatus = {
  status: "Not configured" as const,
  approved: false as const,
  capabilitiesVerified: false as const,
};
export function createRentvineReader(): never {
  throw new Error(
    "Rentvine integration is blocked pending ownership approval, verified documentation/scopes, and a reviewed server adapter. No credentials or live requests are accepted.",
  );
}
