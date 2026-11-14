import {
  defaultReviewSettings,
  validateReviewSettings,
} from "../../config/reviewSettings";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Snapshot } from "../../domain/types";
import { VendorCsvSession } from "../vendorRepository";
import type { VendorDirectory } from "../../domain/vendors";
import { CsvSession } from "../csvSession";
import { WorkspaceContext } from "./context";
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new CsvSession()),
    [csv, setCsv] = useState<Snapshot | null>(null),
    [source, setSource] = useState<"demo" | "csv">("demo");
  const [vendorSession] = useState(() => new VendorCsvSession()),
    [vendorCsv, setVendorCsv] = useState<VendorDirectory | null>(null),
    [vendorSource, setVendorSource] = useState<"demo" | "csv">("demo");
  const [reviewSettings, setReviewSettings] = useState(defaultReviewSettings);
  return (
    <WorkspaceContext
      value={{
        reviewSettings,
        updateReviewSettings: (settings) =>
          setReviewSettings(validateReviewSettings(settings)),
        vendorSession,
        vendorCsv,
        vendorSource,
        selectVendorSource: (next) =>
          setVendorSource(next === "csv" && vendorCsv ? "csv" : "demo"),
        loadVendorCsv: (directory) => {
          setVendorCsv(structuredClone(directory));
          setVendorSource("csv");
        },
        clearVendorCsv: () => {
          vendorSession.clear();
          setVendorCsv(null);
          setVendorSource("demo");
        },
        session,
        csv,
        source,
        selectSource: (next) =>
          setSource(next === "csv" && csv ? "csv" : "demo"),
        loadCsv: (s) => {
          setCsv(structuredClone(s));
          setSource("csv");
        },
        clearCsv: () => {
          session.clear();
          setCsv(null);
          setSource("demo");
        },
      }}
    >
      {children}
    </WorkspaceContext>
  );
}
