import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { navigate } from "./navigation";
const workCsv =
  "ID,Number,State,PropertyID,Property,Vendor,Created,Completed,UnmappedNotes\nw1,SYNTH-P6-101,Open,p1,Synthetic Operations Court,v1,2026-11-01,,MUST NOT IMPORT\nw2,SYNTH-P6-102,Completed,p1,Synthetic Operations Court,v1,2026-11-01,2026-11-05,MUST NOT IMPORT";
async function settings(page: Page) {
  await page
    .getByRole("link", { name: "Data & Settings", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Data & Settings", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "Data Sources", exact: true }).click();
}
async function signIn(page: Page, role = "administrator") {
  await page.goto("/auth/login");
  await page
    .getByRole("link", { name: `Continue as synthetic ${role}`, exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Portfolio overview", exact: true })
    .waitFor();
  await settings(page);
  await expect(
    page.getByRole("region", { name: "Connection and access" }),
  ).toContainText(`Authenticated ${role}`);
}
async function reportPreview(
  page: Page,
  dataset: "workOrders" | "vendors" | "properties",
  account: string,
  raw?: string,
  local = false,
) {
  await page
    .getByRole("tab", { name: "Imports & History", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Import ${dataset} report`, exact: true })
    .click();
  await page.getByRole("dialog").getByRole("checkbox").first().check();
  const source =
    raw ??
    (dataset === "workOrders"
      ? workCsv
      : dataset === "vendors"
        ? "ID,Name,Email,Active\nv1,Synthetic Fixtures Services,synthetic-contact@example.invalid,yes"
        : "ID,Name,Address\np1,Synthetic Master Court,Synthetic address omitted\np0,Synthetic Zero Work,");
  await page.getByLabel("Report CSV file", { exact: true }).setInputFiles({
    name: "synthetic-phase6-report.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(source),
  });
  if (local) {
    await page
      .getByLabel("Report source account", { exact: true })
      .fill(account);
    await page.getByLabel("Source timezone", { exact: true }).fill("UTC");
  }
  await page
    .getByLabel("Report scope / comparison key", { exact: true })
    .fill("synthetic-" + dataset);
  await page
    .getByLabel("Source report as of (optional ISO offset)", { exact: true })
    .fill("2026-11-13T14:00:00Z");
  const maps =
    dataset === "workOrders"
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
      : dataset === "vendors"
        ? [
            ["sourceId", "ID"],
            ["displayName", "Name"],
            ["businessEmail", "Email"],
            ["active", "Active"],
          ]
        : [
            ["sourceId", "ID"],
            ["displayName", "Name"],
            ["permittedAddress", "Address"],
          ];
  for (const [field, column] of maps)
    await page
      .getByRole("combobox", {
        name: `Map ${field}${field === "sourceId" ? " (required stable ID)" : ""}`,
        exact: true,
      })
      .selectOption(column);
  if (dataset === "workOrders") {
    await page
      .getByRole("combobox", { name: "Map status value: Open", exact: true })
      .selectOption("open");
    await page
      .getByRole("combobox", {
        name: "Map status value: Completed",
        exact: true,
      })
      .selectOption("completed");
  } else {
    await page
      .getByRole("checkbox", { name: /I verified these stable IDs/ })
      .check();
    if (dataset === "vendors")
      await page
        .getByRole("combobox", { name: "Map active value: yes", exact: true })
        .selectOption("active");
  }
  await page
    .getByRole("button", { name: "Validate report preview", exact: true })
    .click();
}
async function commitReport(page: Page) {
  await page
    .getByRole("button", { name: "Commit validated report", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
const scan = async (page: Page) =>
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
test("Data & Settings supports CSV-only local evaluation, all-six source switching and property master imports", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Portfolio overview" }).waitFor();
  await settings(page);
  await expect(
    page.getByRole("region", { name: "Connection and access" }),
  ).toContainText("Local evaluation");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveCount(6);
  await expect(
    page.getByRole("option", { name: "Rentvine API · Not configured" }),
  ).toBeDisabled();
  await reportPreview(
    page,
    "workOrders",
    "synthetic-local-p6",
    undefined,
    true,
  );
  await expect(
    page.getByRole("heading", { name: /Report ready for review/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText("MUST NOT IMPORT");
  await scan(page);
  await commitReport(page);
  await reportPreview(page, "vendors", "synthetic-local-p6", undefined, true);
  await commitReport(page);
  await reportPreview(
    page,
    "properties",
    "synthetic-local-p6",
    undefined,
    true,
  );
  await commitReport(page);
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
  ).toContainText("Synthetic Fixtures Services");
  await settings(page);
  await scan(page);
  await page.getByRole("tab", { name: "Data Sources", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Active data workspace", exact: true })
    .selectOption("demo");
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("14");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test("administrator CSV imports persist across reloads with history, replay safety and no API dependency", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await signIn(page);
  const account = "synthetic-p6-" + randomUUID().slice(0, 8),
    name = "Synthetic persistent CSV " + info.project.name + " " + account;
  for (const [label, value] of [
    ["Source name", name],
    ["Verified source account", account],
    ["Workspace scope", "synthetic approved workspace"],
    ["Reviewed source timezone", "UTC"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("checkbox", { name: /I confirm this CSV source/ })
    .check();
  await page
    .getByRole("button", { name: "Create approved CSV source", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Active data workspace", exact: true }),
  ).not.toHaveValue("demo");
  await reportPreview(page, "workOrders", account);
  if (info.project.name === "desktop") {
    await page
      .getByRole("region", { name: "Normalized report preview", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "/workspace/artifacts/tpm-phase6-csv-preview.png",
    });
  }
  await commitReport(page);
  await reportPreview(page, "vendors", account);
  await commitReport(page);
  await reportPreview(page, "properties", account);
  await commitReport(page);
  if (info.project.name === "desktop") {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "/workspace/artifacts/tpm-phase6-data-settings.png",
      fullPage: true,
    });
    await page.screenshot({
      path: "/workspace/artifacts/tpm-phase6-data-settings-viewport.png",
    });
  }
  await expect(
    page.getByRole("region", { name: "Persistent import history" }),
  ).toContainText("accepted");
  await expect(
    page.getByRole("region", { name: "Managed dataset health" }),
  ).toContainText("Last checked:");
  await scan(page);
  await reportPreview(
    page,
    "workOrders",
    account,
    workCsv.replace("w2,SYNTH-P6-102", "w1,SYNTH-P6-102"),
  );
  await expect(
    page.getByRole("heading", { name: /Report rejected/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Commit validated report", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await reportPreview(page, "workOrders", account);
  await commitReport(page);
  await expect(
    page.getByRole("region", { name: "Persistent import history" }),
  ).toContainText("replay");
  await page
    .getByRole("tab", { name: "Security & Settings", exact: true })
    .click();
  await page
    .getByLabel("Aging threshold (calendar days)", { exact: true })
    .fill("10");
  await page
    .getByRole("button", { name: "Save protected configuration", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("heading", { name: "Data & Settings", exact: true })
    .waitFor();
  await expect(
    page.getByLabel("Aging threshold (calendar days)", { exact: true }),
  ).toHaveValue("10");
  await page.getByRole("tab", { name: "Data Sources", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Active data workspace", exact: true }),
  ).not.toHaveValue("demo");
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("1");
  await expect(page.locator(".main")).not.toContainText("Demo Fieldworks");
  await navigate(page, "Work Orders");
  await expect(
    page
      .getByRole("region", { name: "Explorer work order register" })
      .locator("tbody tr"),
  ).toHaveCount(2);
  await navigate(page, "Vendors");
  await page
    .getByRole("region", { name: "Vendor directory table" })
    .getByRole("button", { name: "Synthetic Fixtures Services", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "synthetic-contact@example.invalid",
  );
  await page.keyboard.press("Escape");
  await settings(page);
  await page.getByRole("tab", { name: "Automation", exact: true }).click();
  await expect(
    page.getByText("Not configured / not activated.", { exact: false }),
  ).toBeVisible();
  const originalSettings = await page.request
    .get("/api/bootstrap")
    .then((r) => r.json());
  await page.request.put("/api/settings", {
    headers: {
      Origin: "http://127.0.0.1:5173",
      "X-CSRF-Token": originalSettings.csrf,
    },
    data: {
      ...originalSettings.settings,
      rules: { ...originalSettings.settings.rules, agingNudgeDays: 7 },
    },
  });
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test("viewer sessions read authorized CSV data but cannot manage imports or see restricted contacts", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(60000);
  await signIn(page);
  const account = "synthetic-viewer-" + randomUUID().slice(0, 8),
    name = "Synthetic viewer fixture " + info.project.name + " " + account;
  for (const [label, value] of [
    ["Source name", name],
    ["Verified source account", account],
    ["Workspace scope", "synthetic viewer scope"],
    ["Reviewed source timezone", "UTC"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("checkbox", { name: /I confirm this CSV source/ })
    .check();
  await page
    .getByRole("button", { name: "Create approved CSV source", exact: true })
    .click();
  await reportPreview(page, "workOrders", account);
  await commitReport(page);
  await reportPreview(page, "vendors", account);
  await commitReport(page);
  await page.getByRole("tab", { name: "Data Sources", exact: true }).click();
  const sourceId = await page
    .getByRole("combobox", { name: "Active data workspace", exact: true })
    .inputValue();
  const viewerContext = await browser.newContext(),
    viewer = await viewerContext.newPage();
  await signIn(viewer, "viewer");
  await viewer
    .getByRole("combobox", { name: "Active data workspace", exact: true })
    .selectOption(sourceId);
  await viewer
    .getByRole("tab", { name: "Imports & History", exact: true })
    .click();
  await expect(
    viewer.getByRole("button", {
      name: "Import workOrders report",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    viewer.getByRole("button", {
      name: "Create approved CSV source",
      exact: true,
    }),
  ).toHaveCount(0);
  const payload = await viewer.request
    .get(`/api/sources/${sourceId}/workspace`)
    .then((r) => r.json());
  expect(JSON.stringify(payload)).not.toContain(
    "synthetic-contact@example.invalid",
  );
  expect(payload.snapshot.workOrders).toHaveLength(2);
  await navigate(viewer, "Vendors");
  await viewer
    .getByRole("region", { name: "Vendor directory table" })
    .getByRole("button", { name: "Synthetic Fixtures Services", exact: true })
    .click();
  await expect(viewer.getByRole("dialog")).toContainText(
    "Restricted to administrators",
  );
  await expect(viewer.getByRole("dialog")).not.toContainText(
    "synthetic-contact@example.invalid",
  );
  await viewer.keyboard.press("Escape");
  await settings(viewer);
  const bootstrap = await viewer.request
    .get("/api/bootstrap")
    .then((r) => r.json());
  expect(
    (
      await viewer.request.post("/api/sources", {
        headers: {
          Origin: "http://127.0.0.1:5173",
          "X-CSRF-Token": bootstrap.csrf,
        },
        data: {},
      })
    ).status(),
  ).toBe(403);
  await viewer.getByRole("button", { name: "Sign out", exact: true }).click();
  await viewer
    .getByRole("heading", { name: "You’re signed out", exact: true })
    .waitFor();
  expect((await viewer.request.get("/api/bootstrap")).status()).toBe(401);
  await viewerContext.close();
});
test("Data & Settings remains accessible and fits a constrained desktop iframe", async ({
  page,
}) => {
  await page.goto("/#Data%20%26%20Settings");
  await page
    .getByRole("heading", { name: "Data & Settings", exact: true })
    .waitFor();
  await scan(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.body.replaceChildren();
    const frame = document.createElement("iframe");
    frame.title = "Synthetic settings portal";
    frame.src = "/#Data%20%26%20Settings";
    frame.style.cssText = "width:1060px;height:620px;border:0";
    document.body.append(frame);
  });
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("heading", { name: "Data & Settings", exact: true })
    .waitFor();
  await frame
    .getByRole("tab", { name: "Imports & History", exact: true })
    .click();
  await frame
    .getByRole("button", { name: "Import properties report", exact: true })
    .click();
  await expect(frame.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const child = page.frames().find((f) => f.url().includes("#Data"))!;
  expect(
    await child.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("loss of authentication clears cached managed CSV records even while Demo is selected", async ({
  page,
}) => {
  test.setTimeout(60000);
  await signIn(page);
  const account = "synthetic-revocation-" + randomUUID().slice(0, 8);
  for (const [label, value] of [
    ["Source name", "Synthetic session revocation " + account],
    ["Verified source account", account],
    ["Workspace scope", "synthetic session test"],
    ["Reviewed source timezone", "UTC"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("checkbox", { name: /I confirm this CSV source/ })
    .check();
  await page
    .getByRole("button", { name: "Create approved CSV source", exact: true })
    .click();
  await reportPreview(page, "workOrders", account);
  await commitReport(page);
  await page.getByRole("tab", { name: "Data Sources", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Active data workspace", exact: true })
    .selectOption("demo");
  await expect(
    page.getByRole("combobox", { name: "Active data workspace", exact: true }),
  ).toHaveValue("demo");
  const identity = await page.request
    .get("/api/bootstrap")
    .then((r) => r.json());
  await page.request.post("/api/logout", {
    headers: { Origin: "http://127.0.0.1:5173", "X-CSRF-Token": identity.csrf },
    data: {},
  });
  await page
    .getByRole("button", { name: "Check server connection", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Connection and access" }),
  ).toContainText("Local evaluation");
  await expect(
    page.getByRole("option", {
      name: "Local CSV evaluation · memory only",
      exact: true,
    }),
  ).toHaveCount(0);
  await navigate(page, "Work Orders");
  await expect(
    page.getByRole("region", { name: "Explorer work order register" }),
  ).not.toContainText("SYNTH-P6-101");
  await expect(
    page.getByRole("combobox", { name: "Current data source", exact: true }),
  ).toHaveValue("demo");
});
