import { createContext, useContext } from "react";
import type { PropertyDirectory } from "../propertyCsv";
import type { Snapshot, Rules } from "../../domain/types";
import type { CsvSession } from "../csvSession";
import type { VendorCsvSession } from "../vendorRepository";
import type { VendorDirectory } from "../../domain/vendors";
import type { ReviewSettings } from "../../config/reviewSettings";
import type { SavedReport } from "../local/reports";
import type { LocalState } from "../local/state";
export interface EvaluationWorkspace {
  propertyCsv: PropertyDirectory | null;
  loadPropertyCsv: (
    directory: PropertyDirectory,
    report: SavedReport,
  ) => Promise<void>;
  rules: Rules;
  updateRules: (rules: Rules) => Promise<void>;
  reviewSettings: ReviewSettings;
  updateReviewSettings: (settings: ReviewSettings) => Promise<void>;
  vendorSession: VendorCsvSession;
  vendorCsv: VendorDirectory | null;
  vendorSource: "demo" | "csv";
  selectVendorSource: (source: "demo" | "csv") => void;
  loadVendorCsv: (directory: VendorDirectory) => Promise<void>;
  clearVendorCsv: () => void;
  session: CsvSession;
  csv: Snapshot | null;
  source: "demo" | "csv";
  selectSource: (source: "demo" | "csv") => void;
  loadCsv: (snapshot: Snapshot) => Promise<void>;
  clearCsv: () => void;
  storage: {
    status: "saved" | "temporary" | "blocked";
    bytes: number;
    error: string;
    history: LocalState["history"];
  };
  exportLocal: () => Promise<string>;
  restoreLocal: (input: string) => Promise<void>;
  clearLocal: () => Promise<void>;
}
export const WorkspaceContext = createContext<EvaluationWorkspace | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace provider is required.");
  return value;
}
