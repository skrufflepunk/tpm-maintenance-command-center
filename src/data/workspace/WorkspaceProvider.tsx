import {
  defaultReviewSettings,
  validateReviewSettings,
} from "../../config/reviewSettings";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Snapshot } from "../../domain/types";
import { VendorCsvSession } from "../vendorRepository";
import type { VendorDirectory } from "../../domain/vendors";
import type { PropertyDirectory } from "../propertyCsv";
import type { ManagedWorkspace, ManagedBootstrap } from "../managedTypes";
import {
  getBootstrap,
  getManagedWorkspace,
  managedRequest,
  ManagedError,
} from "../managedClient";
import { composeCsvWorkspace, emptyCsvWorkspace } from "../composeWorkspace";
import { CsvSession } from "../csvSession";
import { WorkspaceContext } from "./context";
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new CsvSession()),
    [vendorSession] = useState(() => new VendorCsvSession());
  const [rawCsv, setCsv] = useState<Snapshot | null>(null),
    [source, setSource] = useState<"demo" | "csv">("demo"),
    [vendorCsv, setVendorCsv] = useState<VendorDirectory | null>(null),
    [propertyCsv, setPropertyCsv] = useState<PropertyDirectory | null>(null),
    [reviewSettings, setReviewSettings] = useState(defaultReviewSettings);
  const [managed, setManaged] = useState<ManagedBootstrap | null>(null),
    [managedSourceId, setManagedSourceId] = useState<string | null>(null),
    [managedError, setManagedError] = useState("");
  const selected = useRef<string | null>(null),
    requestRevision = useRef(0),
    managedData = useRef(false);
  const [managedRefresh, setManagedRefresh] = useState<
    ManagedWorkspace["refresh"]
  >({});
  const csv = useMemo(
    () => composeCsvWorkspace(rawCsv, vendorCsv, propertyCsv),
    [rawCsv, vendorCsv, propertyCsv],
  );
  const refreshManaged = useCallback(
    async (requested?: string | null) => {
      const revision = ++requestRevision.current;
      try {
        const bootstrap = await getBootstrap();
        if (revision !== requestRevision.current) return;
        const id =
          requested === undefined
            ? (selected.current ?? bootstrap.selectedSourceId)
            : requested;
        if (id && !bootstrap.sources.some((s) => s.id === id && s.approved)) {
          setManaged(bootstrap);
          setCsv(null);
          setVendorCsv(null);
          setPropertyCsv(null);
          setSource("demo");
          selected.current = null;
          setManagedSourceId(id);
          setManagedError(
            "CSV source approval is suspended; operational records are unavailable.",
          );
          return;
        }
        const workspace = id ? await getManagedWorkspace(id) : null;
        if (revision !== requestRevision.current) return;
        setManaged(bootstrap);
        setReviewSettings(bootstrap.settings.review);
        setManagedError("");
        selected.current = id;
        if (id) setManagedSourceId(id);
        if (workspace) {
          managedData.current = true;
          session.hydrate(workspace.snapshot, workspace.previous);
          if (workspace.vendorDirectory)
            vendorSession.hydrate(workspace.vendorDirectory);
          else vendorSession.clear();
          setManagedRefresh(workspace.refresh);
          setCsv(workspace.snapshot);
          setVendorCsv(workspace.vendorDirectory);
          setPropertyCsv(workspace.propertyDirectory);
          setSource("csv");
        } else if (requested === null) {
          setSource("demo");
        }
      } catch (err) {
        if (revision !== requestRevision.current) return;
        setManagedError(
          err instanceof Error ? err.message : "Protected server unavailable.",
        );
        if (err instanceof ManagedError && err.status === 401) {
          setManaged(null);
          if (managedData.current) {
            session.clear();
            vendorSession.clear();
            setCsv(null);
            setVendorCsv(null);
            setPropertyCsv(null);
            setSource("demo");
            selected.current = null;
            setManagedSourceId(null);
            setManagedRefresh({});
            managedData.current = false;
          }
        }
      }
    },
    [session, vendorSession],
  );
  useEffect(() => {
    const initial = setTimeout(() => void refreshManaged(), 0);
    const timer = setInterval(() => {
      if (managedData.current) void refreshManaged(selected.current);
    }, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refreshManaged]);
  const selectManaged = async (id: string | null) => {
    if (!managed) throw new Error("Sign in to the protected server first.");
    await managedRequest(
      id ? `/sources/${encodeURIComponent(id)}/selection` : "/selection/demo",
      managed.csrf,
      "POST",
      {},
    );
    await refreshManaged(id);
  };
  const choose = (next: "demo" | "csv") => {
    if (managed) {
      if (next === "demo") {
        setSource("demo");
        void selectManaged(null).catch((err) =>
          setManagedError((err as Error).message),
        );
      } else if (managedSourceId) {
        void selectManaged(managedSourceId).catch(async (err) => {
          setManagedError((err as Error).message);
          if (err instanceof ManagedError && err.status === 401)
            await refreshManaged();
        });
      } else
        setManagedError("Choose an approved CSV source in Data & Settings.");
      return;
    }
    setSource(next === "csv" && csv ? "csv" : "demo");
  };
  return (
    <WorkspaceContext
      value={{
        managed,
        managedRefresh,
        managedSourceId,
        managedError,
        refreshManaged,
        selectManaged,
        propertyCsv,
        loadPropertyCsv: (directory) => {
          if (managed)
            throw new Error(
              "Use protected Data & Settings imports for a managed source.",
            );
          if (
            rawCsv &&
            directory.dataset.sourceAccountId !==
              rawCsv.datasets[0].sourceAccountId
          )
            throw new Error(
              "Property account must match the current CSV workspace.",
            );
          setPropertyCsv(structuredClone(directory));
          if (!rawCsv) setCsv(emptyCsvWorkspace(directory));
          setSource("csv");
        },
        reviewSettings,
        updateReviewSettings: (settings) =>
          setReviewSettings(validateReviewSettings(settings)),
        vendorSession,
        vendorCsv,
        vendorSource: source,
        selectVendorSource: choose,
        loadVendorCsv: (directory) => {
          if (managed)
            throw new Error(
              "Use protected Data & Settings imports for a managed source.",
            );
          if (
            rawCsv &&
            directory.dataset.sourceAccountId !==
              rawCsv.datasets[0].sourceAccountId
          )
            throw new Error(
              "Vendor account must match the current CSV workspace. Clear the work-order session to start another account.",
            );
          setVendorCsv(structuredClone(directory));
          if (!rawCsv) setCsv(emptyCsvWorkspace(directory));
          setSource("csv");
        },
        clearVendorCsv: () => {
          if (managedSourceId)
            throw new Error(
              "Managed reports are retained on the protected server; select Demo or use administrator settings.",
            );
          vendorSession.clear();
          setVendorCsv(null);
        },
        session,
        csv,
        source,
        selectSource: choose,
        loadCsv: (snapshot) => {
          if (managed)
            throw new Error(
              "Use protected Data & Settings imports for a managed source.",
            );
          setCsv(structuredClone(snapshot));
          if (
            vendorCsv?.dataset.sourceAccountId !==
            snapshot.datasets[0].sourceAccountId
          )
            setVendorCsv(null);
          if (
            propertyCsv?.dataset.sourceAccountId !==
            snapshot.datasets[0].sourceAccountId
          )
            setPropertyCsv(null);
          setSource("csv");
        },
        clearCsv: () => {
          if (managedSourceId) {
            choose("demo");
            return;
          }
          session.clear();
          setCsv(null);
          setVendorCsv(null);
          setPropertyCsv(null);
          vendorSession.clear();
          setSource("demo");
        },
      }}
    >
      <div
        key={`${managed?.user.subject ?? "anonymous"}:${managed?.user.role ?? "evaluation"}:${source}:${source === "csv" ? csv?.id : "demo"}`}
      >
        {children}
      </div>
    </WorkspaceContext>
  );
}
