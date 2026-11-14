import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { navigate } from "./navigation";
const directory = (page: Page) =>
  page.getByRole("region", { name: "Vendor directory table", exact: true });
const watch = (page: Page) =>
  page.getByRole("region", { name: "Vendor Watch workspace", exact: true });
const scan = async (page: Page) =>
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
async function start(page: Page) {
  await page.goto("/#Vendors");
  await page
    .getByRole("heading", { name: "Vendor Watch", exact: true })
    .waitFor();
}
async function vendorImport(page: Page, raw: string, verified = true) {
  await page
    .getByRole("button", { name: "Import vendor CSV", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /This file contains only synthetic/ })
    .check();
  await page.getByLabel("Vendor CSV file", { exact: true }).setInputFiles({
    name: "synthetic-vendors.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(raw),
  });
  await page
    .getByLabel("Vendor source account", { exact: true })
    .fill("vendor-evaluation");
  await page
    .getByLabel("Vendor report scope", { exact: true })
    .fill("synthetic directory");
  await page.getByLabel("Vendor source timezone", { exact: true }).fill("UTC");
  if (verified)
    await page.getByRole("checkbox", { name: /I verified Vendor ID/ }).check();
  for (const [field, column] of [
    ["Vendor ID", "Key"],
    ["Vendor name", "Name"],
    ["Vendor type", "Type"],
    ["Vendor Maintenance Categories", "Specialties"],
    ["Active status", "Active"],
    ["Business email", "Email"],
    ["Business phone", "Phone"],
    ["State", "State"],
    ["Liability insurance expiration", "Insurance"],
  ])
    await page
      .getByRole("combobox", { name: field, exact: true })
      .selectOption(column);
  await page
    .getByRole("combobox", { name: "Map active value: yes", exact: true })
    .selectOption("active");
  await page
    .getByRole("button", { name: "Validate vendor preview", exact: true })
    .click();
}
const vendorCsv = (duplicate = false) =>
  "Key,Name,Type,Specialties,Active,Email,Phone,State,Insurance\nv1,Synthetic Multi Trade,Contractor,Plumbing;HVAC,yes,demo@example.invalid,+1 555 010 1234,CA,2027-01-01\n" +
  (duplicate ? "v1" : "v2") +
  ",Synthetic Unspecified,,,,,,,not-a-date";
test("Vendor Watch reconciles KPIs, directory filters, sorting and profile evidence", async ({
  page,
}) => {
  await start(page);
  const summary = page.getByRole("region", { name: "Vendor summary metrics" });
  await expect(
    summary.locator(".action-kpi").nth(0).locator("strong"),
  ).toHaveText("3");
  await expect(summary.locator(".action-kpi").nth(1)).toContainText(
    "Unavailable",
  );
  await expect(
    summary.locator(".action-kpi").nth(3).locator("strong"),
  ).toHaveText("5");
  await expect(
    summary.locator(".action-kpi").nth(4).locator("strong"),
  ).toHaveText("2");
  await expect(directory(page).locator("tbody tr")).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "Maintenance specialty", exact: true })
    .selectOption("cat:0");
  await expect(directory(page).locator("tbody tr")).toHaveCount(1);
  await expect(directory(page)).toContainText("Demo Fieldworks");
  await page.getByRole("button", { name: "Clear vendor filters" }).click();
  await page
    .getByRole("combobox", { name: "Vendor status", exact: true })
    .selectOption("active");
  await expect(
    page.getByRole("heading", { name: "No matching vendors" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset vendor directory" }).click();
  await summary
    .getByRole("button", { name: /Vendors requiring follow-up/ })
    .click();
  await expect(directory(page).locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Clear vendor filters" }).click();
  await page
    .getByRole("textbox", { name: "Search vendor directory" })
    .fill("bluebird");
  await expect(directory(page).locator("tbody tr")).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "Vendor follow-up table" })
      .locator("tbody tr"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Clear vendor filters" }).click();
  await directory(page)
    .getByRole("button", { name: "Avg. completion", exact: true })
    .click();
  await expect(directory(page).locator("tbody tr").first()).toContainText(
    "Demo Bluebird",
  );
  await scan(page);
  await directory(page)
    .getByRole("button", { name: "Demo Fieldworks", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Business emailNot recorded");
  await expect(dialog).toContainText(
    "Liability insurance expirationUnavailable",
  );
  await expect(dialog).toContainText("Not rated");
  await expect(dialog).toContainText("19.0 calendar days");
  await page
    .getByRole("combobox", { name: "Profile work-order group", exact: true })
    .selectOption("completed");
  await expect(
    page
      .getByRole("region", { name: "Vendor related work orders" })
      .locator("tbody tr"),
  ).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Profile work-order group", exact: true })
    .selectOption("aged");
  await expect(
    page
      .getByRole("region", { name: "Vendor related work orders" })
      .locator("tbody tr"),
  ).toHaveCount(3);
  await scan(page);
  await page.keyboard.press("Escape");
  await expect(
    directory(page).getByRole("button", {
      name: "Demo Fieldworks",
      exact: true,
    }),
  ).toBeFocused();
});
test("vendor drafts support four purposes, copy-only edits, denial, restore and discard", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page);
  await directory(page)
    .getByRole("button", { name: "Demo Fieldworks", exact: true })
    .click();
  const draft = page.getByRole("region", { name: "Vendor contact draft" }),
    input = draft.getByRole("textbox", { name: "Vendor message draft" });
  for (const [purpose, phrase] of [
    ["status", "current status"],
    ["appointment", "whether an appointment has been arranged"],
    ["estimate", "provide an estimate"],
    ["aging", "reviewing older open work orders"],
  ]) {
    await draft
      .getByRole("combobox", { name: "Draft purpose", exact: true })
      .selectOption(purpose);
    await expect(input).toHaveValue(new RegExp(phrase));
  }
  await input.fill("Synthetic reviewed vendor draft.");
  await draft
    .getByRole("button", { name: "Copy vendor draft", exact: true })
    .click();
  await expect(draft.getByRole("status")).toContainText("Nothing was sent");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Synthetic reviewed vendor draft.",
  );
  await draft
    .getByRole("combobox", { name: "Draft purpose", exact: true })
    .selectOption("status");
  await draft
    .getByRole("combobox", { name: "Draft purpose", exact: true })
    .selectOption("aging");
  await expect(input).toHaveValue("Synthetic reviewed vendor draft.");
  await draft.getByRole("button", { name: "Restore vendor template" }).click();
  await expect(input).toHaveValue(/reviewing older open work orders/);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("test denial");
        },
      },
    }),
  );
  await draft
    .getByRole("button", { name: "Copy vendor draft", exact: true })
    .click();
  await expect(draft.getByRole("status")).toContainText(
    "Clipboard unavailable",
  );
  await input.fill("Must disappear");
  await page.keyboard.press("Escape");
  await directory(page)
    .getByRole("button", { name: "Demo Fieldworks", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Vendor message draft" }),
  ).not.toHaveValue("Must disappear");
});
test("vendor navigation opens exact Explorer and Action records while retaining directory filters", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("textbox", { name: "Search vendor directory" })
    .fill("fieldworks");
  await directory(page)
    .getByRole("button", { name: "Demo Fieldworks", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Vendor related work orders" })
    .getByRole("button", { name: "DEMO-1010", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Work Order Explorer", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "DEMO-1010", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await navigate(page, "Vendors");
  await expect(
    page.getByRole("textbox", { name: "Search vendor directory" }),
  ).toHaveValue("fieldworks");
  await page
    .getByRole("region", { name: "Vendor follow-up table" })
    .getByRole("button", { name: "Review in Action Center", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Action Center", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "DEMO-1010", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "Source / observed fact",
  );
  await page.keyboard.press("Escape");
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toContainText("14");
});
test("vendor CSV imports require mapped IDs, preserve isolation, safely join compatible work orders and roll back failures", async ({
  page,
}) => {
  await start(page);
  await vendorImport(page, vendorCsv(), false);
  await scan(page);
  await page
    .getByRole("button", { name: "Load validated vendor session" })
    .click();
  await expect(directory(page).locator("tbody tr")).toHaveCount(2);
  await expect(watch(page)).not.toContainText("Demo Fieldworks");
  await expect(
    page.getByRole("region", { name: "Vendor summary metrics" }),
  ).toContainText("Unavailable");
  // Import work orders independently using the existing reviewed workflow.
  await navigate(page, "Work Orders");
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await page.getByRole("checkbox", { name: /I confirm/ }).check();
  await page.getByLabel("Choose UTF-8 CSV", { exact: false }).setInputFiles({
    name: "synthetic-work-orders.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "ID,Number,Vendor,Status,Created\nw1,VENDOR-EVAL-1,v1,Open,2026-10-01",
    ),
  });
  await page
    .getByLabel("Source account identifier", { exact: true })
    .fill("vendor-evaluation");
  await page
    .getByLabel("Report scope / comparison key", { exact: true })
    .fill("synthetic work orders");
  await page.getByLabel("Report timezone (IANA)", { exact: true }).fill("UTC");
  for (const [field, column] of [
    ["Stable work-order ID (required)", "ID"],
    ["number", "Number"],
    ["vendorId", "Vendor"],
    ["status", "Status"],
    ["createdAt", "Created"],
  ])
    await page
      .getByRole("combobox", { name: field, exact: true })
      .selectOption(column);
  await page
    .getByLabel("Map status: Open", { exact: true })
    .selectOption("open");
  await page
    .getByRole("button", { name: "Validate & preview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load validated CSV session" })
    .click();
  await navigate(page, "Vendors");
  await expect(watch(page)).toContainText("Workload unavailable"); // Unverified namespace remains blocked, even with same names/IDs.
  await vendorImport(page, vendorCsv(), true);
  await page
    .getByRole("button", { name: "Load validated vendor session" })
    .click();
  await expect(watch(page)).not.toContainText("Workload unavailable:");
  await expect(directory(page).locator("tbody tr").first()).toContainText(
    "Synthetic Multi Trade",
  );
  await directory(page)
    .getByRole("button", { name: "Synthetic Multi Trade", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("demo@example.invalid");
  await page
    .getByRole("region", { name: "Vendor related work orders" })
    .getByRole("button", { name: "VENDOR-EVAL-1", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "VENDOR-EVAL-1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Current data source", exact: true }),
  ).toHaveValue("csv");
  await page.keyboard.press("Escape");
  await navigate(page, "Vendors");
  await vendorImport(page, vendorCsv(true), true);
  await expect(page.getByRole("alert")).toContainText("duplicate");
  await expect(
    page.getByRole("button", { name: "Load validated vendor session" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(directory(page).locator("tbody tr")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Clear vendor CSV", exact: true })
    .click();
  await expect(directory(page)).toContainText("Demo Fieldworks");
  await expect(watch(page)).toContainText("Workload unavailable");
  await page
    .getByRole("combobox", { name: "Vendor workload source", exact: true })
    .selectOption("demo");
  await expect(
    page
      .getByRole("region", { name: "Vendor summary metrics" })
      .locator(".action-kpi")
      .nth(3)
      .locator("strong"),
  ).toHaveText("5");
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toContainText("14");
});
test("Vendor Watch fits desktop and smaller iframe with keyboard-accessible profiles", async ({
  page,
}) => {
  await start(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await directory(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.evaluate(() => {
    document.body.replaceChildren();
    const f = document.createElement("iframe");
    f.title = "Vendor portal simulation";
    f.src = "/#Vendors";
    f.style.cssText = "width:1060px;height:620px;border:0";
    document.body.append(f);
  });
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("heading", { name: "Vendor Watch", exact: true })
    .waitFor();
  const button = frame
    .getByRole("region", { name: "Vendor directory table", exact: true })
    .getByRole("button", { name: "Demo Fieldworks", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
  const child = page.frames().find((f) => f.url().includes("#Vendors"))!;
  expect(
    await child.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("vendor pagination resets after search, and edited import options revoke the preview", async ({
  page,
}) => {
  await start(page);
  const raw =
    "Key,Name,Type,Specialties,Active,Email,Phone,State,Insurance\n" +
    Array.from(
      { length: 12 },
      (_, i) =>
        `v${i + 1},Synthetic Vendor ${String(i + 1).padStart(2, "0")},Contractor,Plumbing,yes,,,,`,
    ).join("\n");
  await vendorImport(page, raw);
  await expect(
    page.getByRole("button", { name: "Load validated vendor session" }),
  ).toBeVisible();
  await page
    .getByLabel("Vendor report scope", { exact: true })
    .fill("reviewed synthetic scope");
  await expect(
    page.getByRole("button", { name: "Load validated vendor session" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Validate vendor preview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load validated vendor session" })
    .click();
  await expect(directory(page).locator("tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "Next vendors", exact: true }).click();
  await expect(directory(page).locator("tbody tr")).toHaveCount(2);
  await expect(
    watch(page).getByText("12 matching vendors · Page 2 of 2", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search vendor directory" })
    .fill("Vendor 12");
  await expect(directory(page).locator("tbody tr")).toHaveCount(1);
  await expect(
    watch(page).getByText("1 matching vendors · Page 1 of 1", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear vendor filters" }).click();
  await page
    .getByRole("combobox", { name: "Vendors per page", exact: true })
    .selectOption("25");
  await expect(directory(page).locator("tbody tr")).toHaveCount(12);
});
