import { createContext, useContext } from "react";
import type { PropertyDirectory } from "../propertyCsv";
import type { ManagedWorkspace, ManagedBootstrap } from "../managedTypes";
import type { Snapshot } from "../../domain/types";
import type { CsvSession } from "../csvSession";
import type { VendorCsvSession } from "../vendorRepository";
import type { VendorDirectory } from "../../domain/vendors";
import type { ReviewSettings } from "../../config/reviewSettings";
export interface EvaluationWorkspace {
  managed: ManagedBootstrap | null;
  managedRefresh: ManagedWorkspace["refresh"];
  managedSourceId: string | null;
  managedError: string;
  refreshManaged: (sourceId?: string | null) => Promise<void>;
  selectManaged: (id: string | null) => Promise<void>;
  propertyCsv: PropertyDirectory | null;
  loadPropertyCsv: (directory: PropertyDirectory) => void;

  reviewSettings: ReviewSettings;
  updateReviewSettings: (settings: ReviewSettings) => void;
  vendorSession: VendorCsvSession;
  vendorCsv: VendorDirectory | null;
  vendorSource: "demo" | "csv";
  selectVendorSource: (source: "demo" | "csv") => void;
  loadVendorCsv: (directory: VendorDirectory) => void;
  clearVendorCsv: () => void;
  session: CsvSession;
  csv: Snapshot | null;
  source: "demo" | "csv";
  selectSource: (source: "demo" | "csv") => void;
  loadCsv: (snapshot: Snapshot) => void;
  clearCsv: () => void;
}
export const WorkspaceContext = createContext<EvaluationWorkspace | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Evaluation workspace provider is required.");
  return value;
}
