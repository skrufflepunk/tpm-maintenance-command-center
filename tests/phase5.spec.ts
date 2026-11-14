import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { navigate } from "./navigation";
import {
  loadVendorDirectory,
  loadWorkOrders,
  previewWorkOrders,
  workOrderReport,
} from "./phase5-imports";
const propertyTable = (page: Page) =>
  page.getByRole("region", { name: "Property directory table", exact: true });
const properties = (page: Page) =>
  page.getByRole("region", { name: "Properties workspace", exact: true });
const analytics = (page: Page) =>
  page.getByRole("region", { name: "Analytics workspace", exact: true });
const scan = async (page: Page) =>
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
async function start(page: Page, section: string) {
  await page.goto("/#" + section);
  await page.getByRole("heading", { name: section, exact: true }).waitFor();
}
test("Properties preserves directory coverage, reconciles metrics, filters, sorts and opens full available history", async ({
  page,
}) => {
  await start(page, "Properties");
  const summary = page.getByRole("region", { name: "Property summary" });
  await expect(summary.locator("strong")).toHaveText([
    "14",
    "7",
    "3",
    "1",
    "12.7",
  ]);
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(4);
  await expect(propertyTable(page)).toContainText("Unknown property");
  await page
    .getByRole("textbox", { name: "Search property directory" })
    .fill("juniper");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(1);
  await expect(summary.locator("strong").first()).toHaveText("6");
  await page.getByRole("button", { name: "Clear property filters" }).click();
  await page
    .getByRole("combobox", { name: "Properties category", exact: true })
    .selectOption("unknown");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(4);
  await expect(summary.locator("strong").first()).toHaveText("0");
  await page.getByRole("button", { name: "Clear property filters" }).click();
  await page
    .getByRole("combobox", { name: "Operational signal", exact: true })
    .selectOption("aging");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Clear property filters" }).click();
  await propertyTable(page)
    .getByRole("button", { name: "Avg. completion", exact: true })
    .click();
  await expect(propertyTable(page).locator("tbody tr").first()).toContainText(
    "Cobalt Gardens",
  );
  await scan(page);
  await propertyTable(page)
    .getByRole("button", { name: "Juniper Court", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("no address supplied");
  await expect(dialog).toContainText("not a complete lifetime history");
  await page
    .getByRole("combobox", { name: "Property history group", exact: true })
    .selectOption("all");
  await expect(
    page
      .getByRole("region", { name: "Property work orders table" })
      .locator("tbody tr"),
  ).toHaveCount(8);
  await scan(page);
  await page
    .getByRole("combobox", { name: "Property history group", exact: true })
    .selectOption("pending");
  await expect(
    page
      .getByRole("region", { name: "Property work orders table" })
      .locator("tbody tr"),
  ).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Property history group", exact: true })
    .selectOption("all");
  await page
    .getByRole("region", { name: "Property work orders table" })
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
  await navigate(page, "Properties");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(4);
});
test("property operational review thresholds are configurable without altering aging rules", async ({
  page,
}) => {
  await start(page, "Properties");
  await page
    .getByRole("button", { name: "Review thresholds", exact: true })
    .click();
  await page
    .getByLabel("High volume: at least this many report records", {
      exact: true,
    })
    .fill("8");
  await page
    .getByLabel("Repeated category: at least this many distinct work orders", {
      exact: true,
    })
    .fill("2");
  await scan(page);
  await page
    .getByRole("button", { name: "Apply review settings", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Operational signal", exact: true })
    .selectOption("volume");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(2);
  await expect(properties(page)).toContainText("volume ≥8");
  await page.getByRole("button", { name: "Clear property filters" }).click();
  await page
    .getByRole("combobox", { name: "Operational signal", exact: true })
    .selectOption("repeated");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Demo rules", exact: true }).click();
  await page.getByLabel("Aging follow-up:", { exact: false }).fill("30");
  await page
    .getByRole("button", { name: "Apply demo rules", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Property summary" }),
  ).toContainText("Over 30 days old");
});
test("Analytics charts, duration cohorts, comparisons, filters and source-record drill-downs reconcile", async ({
  page,
}) => {
  await start(page, "Analytics");
  const summary = page.getByRole("region", { name: "Analytics summary" });
  await expect(summary.locator("strong")).toHaveText([
    "14",
    "6",
    "12.7",
    "12",
    "3",
  ]);
  await expect(
    page.getByRole("region", { name: "Monthly activity data" }),
  ).toContainText("2026-10");
  await page
    .getByRole("button", {
      name: "Completed 2026-11: 4 work orders",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText("4 supporting records");
  await expect(
    page
      .getByRole("region", { name: "Analytics supporting records table" })
      .locator("tbody tr"),
  ).toHaveCount(4);
  await scan(page);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Owner approval workload: Approved, 0 work orders",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "No work orders in this scope",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Analytics property", exact: true })
    .selectOption("demo:p:0");
  await expect(summary.locator("strong").first()).toHaveText("6");
  await expect(analytics(page).getByRole("status")).toContainText("8 of 24");
  await page
    .getByRole("combobox", { name: "Analytics category", exact: true })
    .selectOption("unknown");
  await expect(analytics(page).getByRole("status")).toContainText("0 of 24");
  await expect(analytics(page)).toContainText(
    "no eligible dated creation or completion records",
  );
  await page
    .getByRole("button", { name: "Clear analytics filters", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Analytics date basis", exact: true })
    .selectOption("completed");
  await page
    .getByLabel("Analytics date from", { exact: true })
    .fill("2026-11-01");
  await expect(analytics(page).getByRole("status")).toContainText("4 of 24");
  await expect(summary.locator("strong").nth(1)).toHaveText("4");
  await page
    .getByRole("button", { name: "Clear analytics filters", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Compare properties by", exact: true })
    .selectOption("open");
  await expect(
    page
      .getByRole("region", { name: "Property comparison table" })
      .locator("tbody tr")
      .first(),
  ).toContainText("Juniper");
  await page
    .getByRole("combobox", { name: "Compare vendors by", exact: true })
    .selectOption("completed");
  await expect(
    page
      .getByRole("region", { name: "Vendor comparison table" })
      .locator("tbody tr")
      .first(),
  ).not.toContainText("Demo Arc");
  await expect(
    page.getByRole("region", { name: "Vendor comparison table" }),
  ).toContainText("Not rated");
  await scan(page);
});
test("vendor scorecard configures sample coverage and measurements while ratings and quality remain unavailable", async ({
  page,
}) => {
  await page.goto("/#Vendors");
  await page
    .getByRole("heading", { name: "Vendor Watch", exact: true })
    .waitFor();
  const scorecard = page.getByRole("region", {
    name: "Vendor scorecard measurements",
  });
  await expect(scorecard).toContainText(
    "minimum 3 eligible completions required",
  );
  await expect(scorecard).toContainText("Not rated");
  await page
    .getByRole("button", { name: "Scorecard settings", exact: true })
    .click();
  await page
    .getByLabel("Scorecard minimum eligible completion sample", { exact: true })
    .fill("2");
  await page
    .getByRole("checkbox", { name: "Verified ratings", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Apply review settings", exact: true })
    .click();
  await expect(scorecard).toContainText("19");
  await expect(
    scorecard.getByRole("columnheader", { name: "Ratings", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Numerical quality score: Unavailable/),
  ).toBeVisible();
  await scan(page);
});
test("Properties and Analytics share CSV work orders, retain invalid-import rollback and use verified vendor sources only", async ({
  page,
}) => {
  await page.goto("/#Work%20Orders");
  await page
    .getByRole("heading", { name: "Work Order Explorer", exact: true })
    .waitFor();
  await loadWorkOrders(page, workOrderReport());
  await navigate(page, "Properties");
  await expect(
    page.getByRole("combobox", {
      name: "Properties work-order source",
      exact: true,
    }),
  ).toHaveValue("csv");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(3);
  await expect(properties(page)).not.toContainText("Juniper Court");
  await expect(
    page.getByRole("region", { name: "Property summary" }).locator("strong"),
  ).toHaveText(["2", "1", "2", "0", "4"]);
  await propertyTable(page)
    .getByRole("button", { name: "Synthetic Keystone", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText("Demo Fieldworks");
  await page
    .getByRole("region", { name: "Property work orders table" })
    .getByRole("button", { name: "SYNTH-P5-1", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "SYNTH-P5-1", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await navigate(page, "Action Center");
  await page
    .getByRole("region", { name: "Action priority queue" })
    .getByRole("button", { name: "SYNTH-P5-1", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "whether closure is needed",
  );
  await page
    .getByRole("combobox", { name: "Draft for", exact: true })
    .selectOption("vendor");
  await expect(
    page.getByRole("textbox", { name: "Message draft" }),
  ).toHaveValue(/help verify the recorded completion/);
  await page.keyboard.press("Escape");
  await navigate(page, "Analytics");
  await expect(analytics(page).getByRole("status")).toContainText("3 of 3");
  await expect(
    page
      .getByRole("region", { name: "Vendor comparison table" })
      .locator("tbody tr"),
  ).toHaveCount(0);
  await expect(analytics(page)).not.toContainText("Demo Fieldworks");
  await expect(analytics(page)).toContainText(
    "at least two compatible retained",
  );
  await navigate(page, "Vendors");
  await loadVendorDirectory(page);
  await navigate(page, "Analytics");
  await expect(
    page.getByRole("region", { name: "Vendor comparison table" }),
  ).toContainText("Synthetic Phase Five Vendor");
  await navigate(page, "Work Orders");
  await previewWorkOrders(
    page,
    workOrderReport().replace("w3,SYNTH-P5-3", "w1,SYNTH-P5-3"),
  );
  await expect(
    page.getByRole("heading", { name: "Candidate rejected" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await navigate(page, "Properties");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(3);
  await navigate(page, "Work Orders");
  await loadWorkOrders(page, workOrderReport(true));
  await navigate(page, "Analytics");
  await expect(
    page
      .getByRole("region", { name: "Observed backlog data" })
      .locator("tbody tr"),
  ).toHaveCount(2);
  await expect(
    page
      .getByRole("region", { name: "Observed backlog data" })
      .locator("tbody tr")
      .first(),
  ).toContainText("2");
  await expect(
    page
      .getByRole("region", { name: "Analytics summary" })
      .locator("strong")
      .first(),
  ).toHaveText("1");
  // Retained missing records remain separate evidence, never current backlog.
  const thirdReport =
    workOrderReport(true) +
    "\nw4,SYNTH-P5-4,Open,p1,Synthetic Keystone,v1,General,2026-10-02,,Waiting";
  await navigate(page, "Work Orders");
  await loadWorkOrders(page, thirdReport);
  await loadWorkOrders(
    page,
    thirdReport
      .split("\n")
      .filter((line) => !line.startsWith("w1,"))
      .join("\n"),
  );
  await navigate(page, "Properties");
  await propertyTable(page)
    .getByRole("button", { name: "Synthetic Keystone", exact: true })
    .click();
  await page
    .getByText("Retained prior property observation (2 records)", {
      exact: true,
    })
    .click();
  const prior = page.getByRole("region", {
    name: "Prior property observation table",
  });
  await expect(prior).toContainText("SYNTH-P5-1");
  await expect(prior).toContainText("Not observed in current report");
  await expect(
    page
      .getByRole("region", { name: "Property work orders table" })
      .locator("tbody tr"),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toContainText("14");
  await navigate(page, "Properties");
  await page
    .getByRole("combobox", {
      name: "Properties work-order source",
      exact: true,
    })
    .selectOption("demo");
  await expect(propertyTable(page)).toContainText("Juniper Court");
  await expect(properties(page)).not.toContainText("Synthetic Keystone");
});
test("new workspaces fit desktop and constrained iframes, preserve sidebar scrolling and keyboard modal access", async ({
  page,
}) => {
  await start(page, "Properties");
  expect(
    await propertyTable(page).evaluate(
      (el) => el.scrollWidth <= el.clientWidth,
    ),
  ).toBe(true);
  for (const section of ["Properties", "Analytics"]) {
    await page.goto("/#" + section);
    await page.getByRole("heading", { name: section, exact: true }).waitFor();
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    expect(
      await page.evaluate(() => ({
        top: document.querySelector(".sidebar")!.getBoundingClientRect().top,
        bottom: document.querySelector(".sidebar")!.getBoundingClientRect()
          .bottom,
        height: innerHeight,
        fits: document.documentElement.scrollWidth <= innerWidth,
      })),
    ).toEqual({ top: 0, bottom: 1000, height: 1000, fits: true });
  }
  await page.evaluate(() => {
    document.body.replaceChildren();
    const f = document.createElement("iframe");
    f.title = "Phase five portal simulation";
    f.src = "/#Properties";
    f.style.cssText = "width:1060px;height:620px;border:0";
    document.body.append(f);
  });
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("heading", { name: "Properties", exact: true })
    .waitFor();
  const button = frame
    .getByRole("region", { name: "Property directory table" })
    .getByRole("button", { name: "Juniper Court", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
  await frame
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Analytics", exact: true })
    .click();
  await expect(
    frame.getByRole("heading", { name: "Analytics", exact: true }),
  ).toBeVisible();
  await frame
    .getByRole("button", { name: "Open maintenance backlog", exact: false })
    .click();
  await expect(frame.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const child = page.frames().find((f) => f.url().includes("#Analytics"))!;
  expect(
    await child.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("property pagination, search reset and known zero-workload rows remain functional with CSV properties", async ({
  page,
}) => {
  await page.goto("/#Work%20Orders");
  await page
    .getByRole("heading", { name: "Work Order Explorer", exact: true })
    .waitFor();
  const report =
    "ID,Number,Status,PropertyID,Property,Vendor,Category,Created,Completed,Approval\n" +
    Array.from(
      { length: 12 },
      (_, i) =>
        `w${i + 1},PAGINATION-${i + 1},Open,p${i + 1},Synthetic Property ${String(i + 1).padStart(2, "0")},v1,General,2026-11-01,,Waiting`,
    ).join("\n");
  await loadWorkOrders(page, report);
  await navigate(page, "Properties");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Next properties", exact: true })
    .click();
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(2);
  await page
    .getByRole("textbox", { name: "Search property directory" })
    .fill("Property 12");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(1);
  await expect(
    properties(page).getByText("Property page 1 of 1", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear property filters" }).click();
  await page
    .getByRole("combobox", { name: "Properties per page", exact: true })
    .selectOption("25");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(12);
  await page
    .getByRole("combobox", { name: "Properties category", exact: true })
    .selectOption("unknown");
  await expect(propertyTable(page).locator("tbody tr")).toHaveCount(12);
  await expect(
    page
      .getByRole("region", { name: "Property summary" })
      .locator("strong")
      .first(),
  ).toHaveText("0");
});
