import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Snapshot } from "../../domain/types";
import { validateRules } from "../../config/rules";
import { validateReviewSettings } from "../../config/reviewSettings";
import { VendorCsvSession } from "../vendorRepository";
import type { VendorDirectory } from "../../domain/vendors";
import type { PropertyDirectory } from "../propertyCsv";
import { composeCsvWorkspace, emptyCsvWorkspace } from "../composeWorkspace";
import { CsvSession } from "../csvSession";
import { WorkspaceContext } from "./context";
import {
  emptyLocalState,
  validateLocalState,
  materializeReport,
  exportBackup,
  restoreBackup,
  localText,
} from "../local/state";
import type { LocalState } from "../local/state";
import type { SavedReport } from "../local/reports";
import { openLocalStorage } from "../local/storage";
import type { LocalStorageAdapter } from "../local/storage";
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new CsvSession()),
    [vendorSession] = useState(() => new VendorCsvSession());
  const [state, setState] = useState(emptyLocalState),
    stateRef = useRef(state);
  const [ready, setReady] = useState(false),
    [status, setStatus] = useState<"saved" | "temporary" | "blocked">(
      "temporary",
    ),
    [error, setError] = useState("");
  const [raw, setRaw] = useState<Snapshot | null>(null),
    [vendor, setVendor] = useState<VendorDirectory | null>(null),
    [property, setProperty] = useState<PropertyDirectory | null>(null),
    [epoch, setEpoch] = useState(0);
  const db = useRef<LocalStorageAdapter | null>(null),
    generation = useRef<string | null>(null),
    blocked = useRef(false),
    queue = useRef(Promise.resolve()),
    channel = useRef<BroadcastChannel | null>(null),
    viewRevision = useRef(0);
  const csv = useMemo(
    () => composeCsvWorkspace(raw, vendor, property),
    [raw, vendor, property],
  );
  async function apply(next: LocalState, expectedView = viewRevision.current) {
    const results = await Promise.all(
      [
        next.work,
        next.priorWork,
        next.vendor,
        next.priorVendor,
        next.property,
      ].map((r) => (r ? materializeReport(r) : null)),
    );
    if (expectedView !== viewRevision.current) return;
    const current = results[0]?.snapshot ?? null,
      prior = results[1]?.snapshot ?? null;
    if (current)
      session.hydrate(
        current,
        prior,
        next.work,
        next.priorWork,
        results[0]!.digest,
      );
    else session.clear();
    const directory = results[2]?.vendor ?? null;
    if (directory)
      vendorSession.hydrate(
        directory,
        results[3]?.vendor ?? null,
        next.vendor,
        next.priorVendor,
        results[2]!.digest,
      );
    else vendorSession.clear();
    const properties = results[4]?.property ?? null;
    setRaw(
      current ??
        (directory
          ? emptyCsvWorkspace(directory)
          : properties
            ? emptyCsvWorkspace(properties)
            : null),
    );
    setVendor(directory);
    setProperty(properties);
    stateRef.current = next;
    setState(next);
  }
  useEffect(() => {
    let active = true;
    const bootView = viewRevision.current;
    let opened: LocalStorageAdapter | null = null;
    const scope = location.pathname.replace(/\/index\.html$/, "/");
    void (async () => {
      try {
        opened = await openLocalStorage(scope);
        if (!active) {
          opened.close();
          return;
        }
        db.current = opened;
        const record = await opened.read();
        if (!active) return;
        generation.current = record?.generation ?? null;
        if (record) {
          const parsed = await validateLocalState(JSON.parse(record.text));
          if (!active) return;
          await apply(parsed, bootView);
        }
        if (active) setStatus("saved");
      } catch {
        if (active) {
          blocked.current = !!opened;
          setStatus(opened ? "blocked" : "temporary");
          setError(
            opened
              ? "Saved data failed validation and was left untouched. Clear or restore a validated backup before saving."
              : "Browser storage is unavailable or blocked. Temporary mode: export before closing; try the dashboard in a new tab.",
          );
        }
      } finally {
        if (active) setReady(true);
      }
    })();
    if (typeof BroadcastChannel !== "undefined") {
      const bus = new BroadcastChannel("tpm-static:" + scope);
      channel.current = bus;
      bus.onmessage = (event) => {
        if (event.data?.type === "cleared") {
          viewRevision.current++;
          generation.current = event.data.generation;
          blocked.current = false;
          void apply(emptyLocalState()).then(() => {
            setEpoch((n) => n + 1);
            setError("Local data was cleared in another tab.");
          });
        } else if (
          event.data?.type === "changed" &&
          event.data.generation !== generation.current
        ) {
          viewRevision.current++;
          blocked.current = true;
          setStatus("blocked");
          setError(
            "Another dashboard tab changed saved data. Reload before saving.",
          );
        }
      };
    }
    return () => {
      active = false;
      opened?.close();
      db.current = null;
      channel.current?.close();
    };
    // Initialization deliberately runs once per provider; all mutations use current refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function enqueue(action: () => Promise<void>) {
    const next = queue.current.then(action);
    queue.current = next.catch(() => {});
    return next;
  }
  function change(
    update: (previous: LocalState) => LocalState,
    replacing = false,
  ) {
    return enqueue(async () => {
      const before = stateRef.current;
      const expectedView = viewRevision.current,
        expectedGeneration = generation.current;
      try {
        if (blocked.current && !replacing)
          throw new Error(
            "Reload, clear local data, or restore a valid backup before saving.",
          );
        const candidate = await validateLocalState(
          update(structuredClone(before)),
        );
        if (expectedView !== viewRevision.current)
          throw new Error(
            "Workspace changed during this operation. Reload before saving.",
          );
        if (db.current) {
          const written = await db.current.write(candidate, expectedGeneration);
          generation.current = written.generation;
          setStatus("saved");
          channel.current?.postMessage({
            type: "changed",
            generation: written.generation,
          });
        }
        await apply(candidate, expectedView);
        blocked.current = false;
        setError("");
      } catch (err) {
        await apply(before, expectedView);
        setError(
          err instanceof Error
            ? err.message
            : "Local save failed; previous data retained.",
        );
        throw err;
      }
    });
  }
  const select = (source: "demo" | "csv") => {
    void change((previous) => ({
      ...previous,
      source:
        source === "csv" &&
        (previous.work || previous.vendor || previous.property)
          ? "csv"
          : "demo",
    })).catch(() => {});
  };
  function accept(
    previous: LocalState,
    report: SavedReport,
    rows: number,
  ): LocalState {
    const next = { ...previous, source: "csv" as const };
    let replay = false;
    if (report.kind === "workOrders") {
      replay = report.observationId === previous.work?.observationId;
      if (!replay) {
        next.priorWork = previous.work;
        next.work = report;
      }
      if (
        next.vendor?.options.account.trim() !== report.options.account.trim()
      ) {
        next.vendor = null;
        next.priorVendor = null;
      }
      if (
        next.property?.options.account.trim() !== report.options.account.trim()
      )
        next.property = null;
    } else {
      const account =
        previous.work?.options.account.trim() ??
        previous.vendor?.options.account.trim() ??
        previous.property?.options.account.trim();
      if (account && account !== report.options.account.trim())
        throw new Error(
          "Directory account must match the local workspace. Export/clear before changing accounts.",
        );
      if (report.kind === "vendors") {
        replay = report.observationId === previous.vendor?.observationId;
        if (!replay) {
          next.priorVendor = previous.vendor;
          next.vendor = report;
        }
      } else {
        replay =
          report.input === previous.property?.input &&
          JSON.stringify(report.options) ===
            JSON.stringify(previous.property?.options);
        if (!replay) next.property = report;
      }
    }
    next.history = [
      {
        kind: report.kind,
        at: new Date().toISOString(),
        outcome: replay ? ("replay" as const) : ("accepted" as const),
        rows,
      },
      ...previous.history,
    ].slice(0, 50);
    return next;
  }
  if (!ready)
    return (
      <main className="fatal" role="status">
        Loading browser-local workspace…
      </main>
    );
  return (
    <WorkspaceContext
      value={{
        session,
        csv,
        source: state.source,
        selectSource: select,
        vendorSession,
        vendorCsv: vendor,
        vendorSource: state.source,
        selectVendorSource: select,
        propertyCsv: property,
        rules: state.rules,
        updateRules: (rules) =>
          change((previous) => ({ ...previous, rules: validateRules(rules) })),
        reviewSettings: state.review,
        updateReviewSettings: (review) =>
          change((previous) => ({
            ...previous,
            review: validateReviewSettings(review),
          })),
        loadCsv: async (snapshot) => {
          const report = session.getReport();
          if (!report || report.observationId !== snapshot.id)
            throw new Error("CSV preview changed. Validate again.");
          await change((previous) =>
            accept(previous, report, snapshot.workOrders.length),
          );
        },
        loadVendorCsv: async (directory) => {
          const report = vendorSession.getReport();
          if (!report || report.observationId !== directory.id)
            throw new Error("Vendor preview changed. Validate again.");
          await change((previous) =>
            accept(previous, report, directory.vendors.length),
          );
        },
        loadPropertyCsv: async (directory, report) => {
          await change((previous) =>
            accept(
              previous,
              { ...report, receivedAt: new Date().toISOString() },
              directory.properties.length,
            ),
          );
        },
        clearCsv: () => {
          void change((previous) => ({
            ...previous,
            source: "demo",
            work: null,
            priorWork: null,
            vendor: null,
            priorVendor: null,
            property: null,
          })).catch(() => {});
        },
        clearVendorCsv: () => {
          void change((previous) => ({
            ...previous,
            vendor: null,
            priorVendor: null,
            source:
              !previous.work && !previous.property ? "demo" : previous.source,
          })).catch(() => {});
        },
        storage: {
          status,
          bytes: new TextEncoder().encode(localText(state)).length,
          error,
          history: state.history,
        },
        exportLocal: () => exportBackup(stateRef.current),
        restoreLocal: async (input) => {
          const candidate = await restoreBackup(input);
          await change(() => candidate, true);
          setEpoch((n) => n + 1);
        },
        clearLocal: () =>
          enqueue(async () => {
            const cleared = await db.current?.clear();
            viewRevision.current++;
            generation.current = cleared?.generation ?? null;
            blocked.current = false;
            await apply(emptyLocalState());
            setStatus(db.current ? "saved" : "temporary");
            setError("");
            setEpoch((n) => n + 1);
            if (cleared)
              channel.current?.postMessage({
                type: "cleared",
                generation: cleared.generation,
              });
          }),
      }}
    >
      <div
        key={`${epoch}:${state.source}:${state.source === "csv" ? csv?.id : "demo"}`}
      >
        {children}
      </div>
    </WorkspaceContext>
  );
}
