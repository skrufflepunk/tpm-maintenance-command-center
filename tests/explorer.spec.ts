import { navigate } from "./navigation";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const file = (state = "New", duplicate = false) =>
  `Ticket,Number,State,Created,Approval,Assignment,PropertyKey,PropertyLabel,Category,Priority,Description\neval-1,EVAL-101,${state},2026-11-01,Waiting,None,p-1,Fictional Evaluation Court,General,High,Synthetic fixture inspection\n${duplicate ? "eval-1" : "eval-2"},EVAL-102,Unrecognized,not-a-date,, ,p-1,Fictional Evaluation Court,General,,Synthetic missing-data example\n`;
async function start(page: import("@playwright/test").Page) {
  await page.goto("/#Work%20Orders");
  await page
    .getByRole("heading", { name: "Work Order Explorer", exact: true })
    .waitFor();
}
async function upload(page: import("@playwright/test").Page, raw: string) {
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await page.getByRole("checkbox", { name: /I confirm/ }).check();
  await page.getByLabel("Choose UTF-8 CSV", { exact: false }).setInputFiles({
    name: "synthetic-evaluation.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(raw),
  });
  await page
    .getByLabel("Source account identifier", { exact: true })
    .fill("fictional-evaluation");
  await page
    .getByLabel("Report scope / comparison key", { exact: true })
    .fill("synthetic partial report");
  await page
    .getByLabel("Report as of (optional ISO timestamp with offset)", {
      exact: true,
    })
    .fill("2026-11-13T14:00:00Z");
  for (const [field, column] of [
    ["Stable work-order ID (required)", "Ticket"],
    ["number", "Number"],
    ["status", "State"],
    ["createdAt", "Created"],
    ["approvalState", "Approval"],
    ["vendorAssignmentState", "Assignment"],
    ["propertyId", "PropertyKey"],
    ["propertyName", "PropertyLabel"],
    ["category", "Category"],
    ["priority", "Priority"],
    ["Issue text (already redacted only)", "Description"],
  ])
    await page
      .getByRole("combobox", { name: field, exact: true })
      .selectOption(column);
  await page
    .getByLabel("Map status: New", { exact: true })
    .selectOption("open");
  await page
    .getByLabel("Map approvalState: Waiting", { exact: true })
    .selectOption("pending");
  await page
    .getByLabel("Map vendorAssignmentState: None", { exact: true })
    .selectOption("unassigned");
  await page
    .getByLabel("Map priority: High", { exact: true })
    .selectOption("high");
  await page
    .getByRole("button", { name: "Validate & preview", exact: true })
    .click();
}
test("Explorer filters, KPIs, sorting, pagination, details and keyboard access work", async ({
  page,
}, info) => {
  await start(page);
  await expect(page.getByRole("status")).toContainText("24 of 24 records");
  const table = page
    .getByRole("region", { name: "Explorer work order register" })
    .getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(11);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 3", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search Explorer work orders" })
    .fill("juniper");
  await expect(page.getByRole("status")).toContainText("8 of 24");
  await expect(
    page
      .getByRole("region", { name: "Work Order Explorer workspace" })
      .getByText("Page 1 of 1", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear Explorer filters" }).click();
  const approval = page.locator(".explorer .multi-filter").filter({
    has: page.locator("summary").filter({ hasText: "Owner approval" }),
  });
  await approval.locator("summary").click();
  await approval.getByLabel("Pending", { exact: true }).check();
  await approval.locator("summary").click();
  await expect(page.getByRole("status")).toContainText("5 of 24");
  await page.getByRole("button", { name: "Clear Explorer filters" }).click();
  await table.getByRole("button", { name: "Active age", exact: true }).click();
  await table.getByRole("button", { name: "Active age", exact: true }).click();
  await expect(table.locator("tbody tr").first()).toContainText("43 days");
  await table.getByRole("button", { name: "DEMO-1010", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Available dates & maintenance history",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Source maintenance activity history is unavailable",
  );
  await expect(page.getByRole("dialog")).toContainText("fictional-demo");
  await page.keyboard.press("Escape");
  await page.getByLabel("Explorer created from").fill("2026-11-01");
  await page.getByLabel("Explorer created to").fill("2026-11-06");
  await expect(page.getByRole("status")).toContainText("6 of 24");
  await page
    .getByRole("textbox", { name: "Search Explorer work orders" })
    .fill("no-match");
  await expect(
    page.getByRole("heading", { name: "No matching work orders" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset Explorer scope" }).click();
  await page.screenshot({
    path: info.outputPath("explorer.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("CSV preview loads the unified workspace, rejects duplicate IDs, and updates Overview", async ({
  page,
}) => {
  await start(page);
  await upload(page, file());
  await expect(
    page.getByRole("heading", { name: "Candidate ready for review" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "CSV validation result" }),
  ).toContainText("invalid dates");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Load validated CSV session" })
    .click();
  await expect(page.getByRole("status")).toContainText("2 of 2 records");
  await expect(
    page.getByRole("combobox", { name: "Current data source", exact: true }),
  ).toHaveValue("csv");
  await expect(page.locator(".explorer-kpis")).toContainText("1");
  await page.getByRole("button", { name: "EVAL-101", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Browser-local CSV record",
  );
  await expect(page.getByRole("dialog")).toContainText("fictional-evaluation");
  await page.keyboard.press("Escape");
  await navigate(page, "Action Center");
  await expect(page.getByRole("status")).toContainText(
    "1 eligible action items",
  );
  await expect(
    page.getByRole("combobox", { name: "Action data source" }),
  ).toHaveValue("csv");
  await page.getByRole("button", { name: "EVAL-101", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Browser-local CSV record",
  );
  await page
    .getByRole("button", {
      name: "Open corresponding work order in Explorer",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "EVAL-101" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toContainText("1");
  await navigate(page, "Work Orders");
  await expect(page.getByRole("status")).toContainText("2 of 2 records");
  await upload(page, file("New", true));
  await expect(
    page.getByRole("heading", { name: "Candidate rejected" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("duplicate");
  await expect(
    page.getByRole("button", { name: "Load validated CSV session" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("status")).toContainText("2 of 2 records");
  await page
    .getByRole("button", { name: "Explorer data health", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "previous successful data retained",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Current data source", exact: true })
    .selectOption("demo");
  await expect(page.getByRole("status")).toContainText("24 of 24 records");
  await page
    .getByRole("combobox", { name: "Current data source", exact: true })
    .selectOption("csv");
  await expect(page.getByRole("status")).toContainText("2 of 2 records");
  await page.getByRole("button", { name: "Clear CSV session" }).click();
  await expect(page.getByRole("status")).toContainText("24 of 24 records");
});
