import type { LocalState } from "./state";
import { localText, MAX_LOCAL_BYTES, emptyLocalState } from "./state";
export interface LocalRecord {
  generation: string;
  text: string;
}
export interface LocalStorageAdapter {
  read(): Promise<LocalRecord | null>;
  write(state: LocalState, expected: string | null): Promise<LocalRecord>;
  clear(): Promise<LocalRecord>;
  close(): void;
}
export function openLocalStorage(scope: string): Promise<LocalStorageAdapter> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(
        new Error(
          "Browser storage is unavailable or blocked. Temporary mode is active.",
        ),
      );
    }, 4000);
    const request = indexedDB.open("tpm-static:" + scope, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("workspace");
    request.onblocked = () => {
      clearTimeout(timer);
      settled = true;
      reject(
        new Error("Close older dashboard tabs to unlock browser storage."),
      );
    };
    request.onerror = () => {
      clearTimeout(timer);
      settled = true;
      reject(
        new Error("Browser storage is unavailable. Temporary mode is active."),
      );
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      const db = request.result;
      if (settled) {
        db.close();
        return;
      }
      const adapter: LocalStorageAdapter = {
        async read() {
          return new Promise((resolve, reject) => {
            const tx = db.transaction("workspace", "readonly"),
              r = tx.objectStore("workspace").get("current");
            r.onsuccess = () => {
              const value = r.result as LocalRecord | undefined;
              if (
                value &&
                (typeof value.text !== "string" ||
                  typeof value.generation !== "string" ||
                  new TextEncoder().encode(value.text).length > MAX_LOCAL_BYTES)
              ) {
                reject(
                  new Error(
                    "Stored browser workspace is invalid. Clear it before saving new data.",
                  ),
                );
                return;
              }
              resolve(value ?? null);
            };
            r.onerror = () => reject(new Error("Cannot read browser storage."));
          });
        },
        async write(state, expected) {
          const text = localText(state);
          const record = { generation: crypto.randomUUID(), text };
          return new Promise((resolve, reject) => {
            const tx = db.transaction("workspace", "readwrite"),
              store = tx.objectStore("workspace"),
              read = store.get("current");
            let conflict = false;
            read.onsuccess = () => {
              if ((read.result?.generation ?? null) !== expected) {
                conflict = true;
                tx.abort();
                return;
              }
              store.put(record, "current");
            };
            tx.oncomplete = () => resolve(record);
            tx.onabort = tx.onerror = () =>
              reject(
                new Error(
                  conflict
                    ? "Another tab changed this workspace. Reload before saving; previous data is retained."
                    : "Browser storage write failed or quota was reached. Previous saved data is retained.",
                ),
              );
          });
        },
        async clear() {
          return new Promise((resolve, reject) => {
            const tx = db.transaction("workspace", "readwrite");
            const record = {
              generation: crypto.randomUUID(),
              text: localText(emptyLocalState()),
            };
            tx.objectStore("workspace").put(record, "current");
            tx.oncomplete = () => resolve(record);
            tx.onerror = tx.onabort = () =>
              reject(
                new Error(
                  "Browser storage could not be cleared. Use browser site-data controls.",
                ),
              );
          });
        },
        close() {
          db.close();
        },
      };
      db.onversionchange = () => db.close();
      resolve(adapter);
    };
  });
}
