import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { navigate } from "./navigation";
import {
  settings,
  importPreview,
  commit,
  clearLocal,
  workCsv,
} from "./static-import";
test("three browser reports persist across reload with all-six source isolation and local settings", async ({
  page,
}, info) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Portfolio overview", exact: true })
    .waitFor();
  for (const kind of ["workOrders", "vendors", "properties"] as const) {
    await importPreview(page, kind);
    await commit(page);
  }
  await page.reload();
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("1");
  await expect(page.locator(".main")).not.toContainText("Juniper Court");
  await navigate(page, "Properties");
  await expect(
    page.getByRole("region", { name: "Property directory table" }),
  ).toContainText("Synthetic Zero Work");
  await navigate(page, "Analytics");
  await expect(
    page.getByRole("region", { name: "Vendor comparison table" }),
  ).toContainText("Synthetic Static Services");
  await settings(page, "Imports & History");
  await expect(
    page
      .getByRole("region", { name: "Local import history" })
      .locator("tbody tr"),
  ).toHaveCount(3);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  if (info.project.name === "desktop") {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "/workspace/artifacts/tpm-phase8-imports.png",
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Local rules", exact: true }).click();
  await page.getByLabel(/Aging follow-up: strictly greater/).fill("11");
  await page
    .getByRole("button", { name: "Apply local rules", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Local rules", exact: true }).click();
  await expect(
    page.getByLabel(/Aging follow-up: strictly greater/),
  ).toHaveValue("11");
  await page.keyboard.press("Escape");
  await settings(page, "Data Sources");
  await page
    .getByRole("combobox", { name: "Active data workspace", exact: true })
    .selectOption("demo");
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("14");
  expect(requests.some((url) => /\/(api|auth)\//.test(url))).toBe(false);
});
test("validated local backup downloads, clears and restores without an upload and rejects tampering", async ({
  page,
}) => {
  await page.goto("/");
  await importPreview(page);
  await commit(page);
  await settings(page, "Local Data & Backups");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export local backup", exact: true })
    .click();
  const file = await downloadPromise;
  const input = await readFile((await file.path())!, "utf8");
  expect(input).not.toContain("DO NOT PERSIST");
  expect(input).not.toContain("UnmappedNotes");
  await clearLocal(page);
  await page.reload();
  await settings(page, "Imports & History");
  await expect(
    page
      .getByRole("region", { name: "Local import history" })
      .locator("tbody tr"),
  ).toHaveCount(0);
  await settings(page, "Local Data & Backups");
  await page
    .getByRole("button", { name: "Restore local backup", exact: true })
    .click();
  await page
    .getByLabel("Local backup JSON file", { exact: true })
    .setInputFiles({
      name: "synthetic-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(input),
    });
  await expect(page.getByRole("dialog")).toContainText("Validated backup");
  await expect(
    page.getByRole("button", {
      name: "Restore validated local backup",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /Replace my current local workspace/ })
    .check();
  await page
    .getByRole("button", {
      name: "Restore validated local backup",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("1");
  await settings(page, "Local Data & Backups");
  await page
    .getByRole("button", { name: "Restore local backup", exact: true })
    .click();
  await page
    .getByLabel("Local backup JSON file", { exact: true })
    .setInputFiles({
      name: "tampered.json",
      mimeType: "application/json",
      buffer: Buffer.from(input.replace("SYNTH-STATIC-101", "TAMPERED")),
    });
  await expect(page.getByRole("dialog")).toContainText(
    "integrity check failed",
  );
  await page.keyboard.press("Escape");
  await navigate(page, "Work Orders");
  await expect(
    page.getByRole("region", { name: "Explorer work order register" }),
  ).toContainText("SYNTH-STATIC-101");
});
test("replays and rejected duplicate imports preserve the successful local snapshot", async ({
  page,
}) => {
  await page.goto("/");
  await importPreview(page);
  await commit(page);
  await importPreview(page);
  await commit(page);
  await expect(
    page.getByRole("region", { name: "Local import history" }),
  ).toContainText("replay");
  await importPreview(
    page,
    "workOrders",
    workCsv.replace("w2,SYNTH-STATIC-102", "w1,SYNTH-STATIC-102"),
  );
  await expect(
    page.getByRole("heading", { name: /Report rejected/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Commit validated report", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  await navigate(page, "Work Orders");
  await expect(
    page
      .getByRole("region", { name: "Explorer work order register" })
      .locator("tbody tr"),
  ).toHaveCount(2);
});
test("blocked storage stays functional in temporary mode with honest persistence status", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  await page.goto("/");
  await settings(page);
  await expect(
    page.getByRole("region", { name: "Local data storage" }),
  ).toContainText("Temporary browser session");
  await importPreview(page);
  await commit(page);
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("1");
  await page.reload();
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("14");
});
test("clear-data removes reports in another open tab without changing unrelated browser storage", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await importPreview(page);
  await commit(page);
  await page.evaluate(() => localStorage.setItem("unrelated-user-app", "keep"));
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("1");
  await clearLocal(page);
  await expect(
    other
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("14");
  expect(
    await page.evaluate(() => localStorage.getItem("unrelated-user-app")),
  ).toBe("keep");
  await other.reload();
  await expect(
    other
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("14");
});

test("quota/write failures keep the last successful dataset in memory and after reload", async ({
  page,
}) => {
  await page.goto("/");
  await importPreview(page);
  await commit(page);
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      ...args: Parameters<typeof original>
    ) {
      if (args[1] === "readwrite")
        throw new DOMException("Synthetic quota reached", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await importPreview(
    page,
    "workOrders",
    workCsv.replace("SYNTH-STATIC-101", "QUOTA-PENDING"),
  );
  await page
    .getByRole("button", { name: "Commit validated report", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(/quota/i);
  await page.keyboard.press("Escape");
  await navigate(page, "Work Orders");
  await expect(
    page.getByRole("region", { name: "Explorer work order register" }),
  ).toContainText("SYNTH-STATIC-101");
  await expect(
    page.getByRole("region", { name: "Explorer work order register" }),
  ).not.toContainText("QUOTA-PENDING");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Explorer work order register" }),
  ).toContainText("SYNTH-STATIC-101");
});
test("corrupt saved data is quarantined and explicit clear restores a usable empty workspace", async ({
  page,
}) => {
  await page.goto("/");
  await importPreview(page);
  await commit(page);
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("tpm-static:/", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("workspace", "readwrite"),
        store = tx.objectStore("workspace"),
        r = store.get("current");
      r.onsuccess = () =>
        store.put({ ...r.result, text: "corrupt JSON" }, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    database.close();
  });
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Local data storage" }),
  ).toContainText("Saved data needs attention");
  await expect(page.locator(".main")).toContainText("left untouched");
  await clearLocal(page);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Local data storage" }),
  ).toContainText("Saved in this browser profile");
  await settings(page, "Data Sources");
  await expect(
    page.getByRole("option", {
      name: "Browser-local CSV reports",
      exact: true,
    }),
  ).toBeDisabled();
});
