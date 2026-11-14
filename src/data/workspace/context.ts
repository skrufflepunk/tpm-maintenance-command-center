import { createContext, useContext } from "react";
import type { Snapshot } from "../../domain/types";
import type { CsvSession } from "../csvSession";
export interface EvaluationWorkspace {
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
