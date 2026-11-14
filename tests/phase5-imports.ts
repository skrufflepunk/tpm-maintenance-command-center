import type { Page } from "@playwright/test";
export const workOrderReport = (changed = false) =>
  "ID,Number,Status,PropertyID,Property,Vendor,Category,Created,Completed,Approval\nw1,SYNTH-P5-1," +
  (changed ? "Completed" : "Open") +
  ",p1,Synthetic Keystone,v1,General,2026-10-01,2026-11-12,Waiting\nw2,SYNTH-P5-2,Completed,p2,Synthetic Banyan,v1,Plumbing,2026-11-01,2026-11-05,Waiting\nw3,SYNTH-P5-3,Open,,,,,invalid,,Waiting";
export async function previewWorkOrders(page: Page, raw: string) {
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await page.getByRole("checkbox", { name: /I confirm/ }).check();
  await page
    .getByLabel("Choose UTF-8 CSV", { exact: false })
    .setInputFiles({
      name: "synthetic-phase5-work-orders.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(raw),
    });
  await page
    .getByLabel("Source account identifier", { exact: true })
    .fill("synthetic-phase5");
  await page
    .getByLabel("Report scope / comparison key", { exact: true })
    .fill("synthetic reviewed work orders");
  await page.getByLabel("Report timezone (IANA)", { exact: true }).fill("UTC");
  await page
    .getByLabel("Report as of (optional ISO timestamp with offset)", {
      exact: true,
    })
    .fill("2026-11-13T14:00:00Z");
  for (const [field, column] of [
    ["Stable work-order ID (required)", "ID"],
    ["number", "Number"],
    ["status", "Status"],
    ["propertyId", "PropertyID"],
    ["propertyName", "Property"],
    ["vendorId", "Vendor"],
    ["category", "Category"],
    ["createdAt", "Created"],
    ["completedAt", "Completed"],
    ["approvalState", "Approval"],
  ])
    await page
      .getByRole("combobox", { name: field, exact: true })
      .selectOption(column);
  await page
    .getByLabel("Map status: Open", { exact: true })
    .selectOption("open");
  if (await page.getByLabel("Map status: Completed", { exact: true }).count())
    await page
      .getByLabel("Map status: Completed", { exact: true })
      .selectOption("completed");
  await page
    .getByLabel("Map approvalState: Waiting", { exact: true })
    .selectOption("pending");
  await page
    .getByRole("button", { name: "Validate & preview", exact: true })
    .click();
}
export async function loadWorkOrders(page: Page, raw: string) {
  await previewWorkOrders(page, raw);
  await page
    .getByRole("button", { name: "Load validated CSV session", exact: true })
    .click();
}
export async function loadVendorDirectory(page: Page) {
  await page
    .getByRole("button", { name: "Import vendor CSV", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /This file contains only synthetic/ })
    .check();
  await page
    .getByLabel("Vendor CSV file", { exact: true })
    .setInputFiles({
      name: "synthetic-phase5-vendors.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("ID,Name\nv1,Synthetic Phase Five Vendor"),
    });
  await page
    .getByLabel("Vendor source account", { exact: true })
    .fill("synthetic-phase5");
  await page
    .getByLabel("Vendor report scope", { exact: true })
    .fill("synthetic directory");
  await page.getByLabel("Vendor source timezone", { exact: true }).fill("UTC");
  await page.getByRole("checkbox", { name: /I verified Vendor ID/ }).check();
  await page
    .getByRole("combobox", { name: "Vendor ID", exact: true })
    .selectOption("ID");
  await page
    .getByRole("combobox", { name: "Vendor name", exact: true })
    .selectOption("Name");
  await page
    .getByRole("button", { name: "Validate vendor preview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load validated vendor session", exact: true })
    .click();
}
