import { useState } from "react";
import type { ReactNode } from "react";
import type { Snapshot } from "../../domain/types";
import { CsvSession } from "../csvSession";
import { WorkspaceContext } from "./context";
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new CsvSession()),
    [csv, setCsv] = useState<Snapshot | null>(null),
    [source, setSource] = useState<"demo" | "csv">("demo");
  return (
    <WorkspaceContext
      value={{
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
