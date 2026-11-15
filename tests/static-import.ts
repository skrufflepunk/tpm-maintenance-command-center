import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export const workCsv =
  "ID,Number,State,PropertyID,Property,Vendor,Created,Completed,UnmappedNotes\nw1,SYNTH-STATIC-101,Open,p1,Synthetic Static Court,v1,2026-11-01,,DO NOT PERSIST\nw2,SYNTH-STATIC-102,Completed,p1,Synthetic Static Court,v1,2026-11-01,2026-11-05,DO NOT PERSIST";
export async function settings(page: Page, section = "Data Sources") {
  await page
    .getByRole("link", { name: "Data & Settings", exact: true })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Data & Settings", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: section, exact: true }).click();
}
export async function importPreview(
  page: Page,
  kind: "workOrders" | "vendors" | "properties" = "workOrders",
  raw?: string,
) {
  await settings(page, "Imports & History");
  await page
    .getByRole("button", { name: `Import ${kind} report`, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").first().check();
  const data =
    raw ??
    (kind === "workOrders"
      ? workCsv
      : kind === "vendors"
        ? "ID,Name,Email\nv1,Synthetic Static Services,synthetic-static@example.invalid"
        : "ID,Name\np1,Synthetic Master Court\np0,Synthetic Zero Work");
  await page
    .getByLabel("Report CSV file", { exact: true })
    .setInputFiles({
      name: "synthetic-static.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(data),
    });
  await page
    .getByLabel("Report source account", { exact: true })
    .fill("synthetic-static-account");
  await page
    .getByLabel("Report scope / comparison key", { exact: true })
    .fill("synthetic-" + kind);
  await page.getByLabel("Source timezone", { exact: true }).fill("UTC");
  await page
    .getByLabel("Source report as of (optional ISO offset)", { exact: true })
    .fill("2026-11-13T14:00:00Z");
  const maps =
    kind === "workOrders"
      ? [
          ["sourceId", "ID"],
          ["number", "Number"],
          ["status", "State"],
          ["propertyId", "PropertyID"],
          ["propertyName", "Property"],
          ["vendorId", "Vendor"],
          ["createdAt", "Created"],
          ["completedAt", "Completed"],
        ]
      : kind === "vendors"
        ? [
            ["sourceId", "ID"],
            ["displayName", "Name"],
            ["businessEmail", "Email"],
          ]
        : [
            ["sourceId", "ID"],
            ["displayName", "Name"],
          ];
  for (const [key, column] of maps)
    await page
      .getByRole("combobox", {
        name: `Map ${key}${key === "sourceId" ? " (required stable ID)" : ""}`,
        exact: true,
      })
      .selectOption(column);
  if (kind === "workOrders")
    for (const [value, status] of [
      ["Open", "open"],
      ["Completed", "completed"],
    ])
      await page
        .getByRole("combobox", {
          name: `Map status value: ${value}`,
          exact: true,
        })
        .selectOption(status);
  else
    await page
      .getByRole("checkbox", { name: /I verified these stable IDs/ })
      .check();
  await page
    .getByRole("button", { name: "Validate report preview", exact: true })
    .click();
}
export async function commit(page: Page) {
  await page
    .getByRole("button", { name: "Commit validated report", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
export async function clearLocal(page: Page) {
  await settings(page, "Local Data & Backups");
  await page
    .getByRole("button", { name: "Clear local data", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Delete local dashboard data",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /I have exported any needed backup/ })
    .check();
  await page
    .getByRole("button", { name: "Delete local dashboard data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
