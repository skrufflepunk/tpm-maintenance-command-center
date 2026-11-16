import type { Snapshot } from "../domain/types";
import { demoSnapshot } from "./demo";
export interface DataHealth {
  issues: Snapshot["qualitySummary"];
  latestAttempt: string;
  comparison: string;
}
export interface ImportInput {
  input: string;
  mapping: Record<string, string>;
  scope: string;
}
export interface DataRepository {
  capabilities: { imports: boolean; comparison: boolean; sourceLinks: boolean };
  getSnapshot(): Promise<Snapshot>;
  getDataHealth(): Promise<DataHealth>;
  previewImport(request: ImportInput): Promise<{ previewId: string }>;
  commitImport(previewId: string): Promise<Snapshot>;
  getComparableChanges(
    snapshotId: string,
  ): Promise<{ available: false; reason: string }>;
}
export function validateSnapshot(s: Snapshot) {
  const ids = s.workOrders.map((w) => w.id);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
    throw new Error("Snapshot rejected: missing or duplicate work-order IDs.");
  if (s.sourceMode !== "demo")
    throw new Error("Operational data adapters are unavailable in Phase 1.");
  return s;
}
export function createDemoRepository(
  snapshot: Snapshot = demoSnapshot,
): DataRepository {
  const stored = structuredClone(validateSnapshot(snapshot));
  return {
    capabilities: { imports: false, comparison: false, sourceLinks: false },
    async getSnapshot() {
      return structuredClone(stored);
    },
    async getDataHealth() {
      return {
        issues: structuredClone(stored.qualitySummary),
        latestAttempt: "Synthetic fixture loaded · no import attempted",
        comparison: "Comparison unavailable — no previous comparable snapshot.",
      };
    },
    async previewImport() {
      throw new Error(
        "CSV imports are unavailable in Phase 1. No data was changed.",
      );
    },
    async commitImport() {
      throw new Error(
        "CSV imports are unavailable in Phase 1. No data was changed.",
      );
    },
    async getComparableChanges() {
      return {
        available: false,
        reason:
          "No previous comparable snapshot. No observed-change nudges can be calculated.",
      };
    },
  };
}
export function getRepository(): DataRepository {
  if (
    import.meta.env.VITE_DATA_MODE &&
    import.meta.env.VITE_DATA_MODE !== "demo"
  )
    throw new Error(
      "Only demo mode is supported. Operational access is disabled.",
    );
  return createDemoRepository();
}
