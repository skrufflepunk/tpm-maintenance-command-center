import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { importPreview, commit, settings } from "../static-import";
import { navigate } from "../navigation";
test("built project-path app is public, uses relative assets and never calls a backend", async ({
  page,
}) => {
  const requests: string[] = [],
    violations: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("console", (m) => {
    if (m.type() === "error") violations.push(m.text());
  });
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Portfolio overview", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content"),
  ).toContain("connect-src 'none'");
  await importPreview(page);
  await commit(page);
  await page.reload();
  await navigate(page, "Overview");
  await expect(
    page
      .getByRole("button", { name: /Open Work Orders/ })
      .locator(".kpi-value"),
  ).toHaveText("1");
  for (const name of [
    "Work Orders",
    "Action Center",
    "Vendors",
    "Properties",
    "Analytics",
    "Overview",
  ])
    await navigate(page, name);
  expect(
    requests.every(
      (url) =>
        url.startsWith(
          "http://127.0.0.1:4173/tpm-maintenance-command-center/",
        ) || url.startsWith("blob:"),
    ),
  ).toBe(true);
  expect(requests.some((url) => /\/(api|auth)\//.test(url))).toBe(false);
  expect(violations).toEqual([]);
});
test("production bundle works in a Google Sites-sized cross-origin frame with local import and new-tab fallback", async ({
  page,
}, info) => {
  await page.goto("http://127.0.0.1:4173/portal");
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("heading", { name: "Data & Settings", exact: true }),
  ).toBeVisible();
  await frame
    .getByRole("button", { name: "Import properties report", exact: true })
    .click();
  await expect(frame.getByRole("dialog")).toBeVisible();
  await frame.getByRole("dialog").getByRole("checkbox").first().check();
  await frame
    .getByLabel("Report CSV file", { exact: true })
    .setInputFiles({
      name: "synthetic-properties.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("ID,Name\np1,Synthetic Embedded Court"),
    });
  await frame
    .getByLabel("Report source account", { exact: true })
    .fill("synthetic-frame");
  await frame
    .getByLabel("Report scope / comparison key", { exact: true })
    .fill("synthetic-frame-properties");
  await frame
    .getByRole("combobox", {
      name: "Map sourceId (required stable ID)",
      exact: true,
    })
    .selectOption("ID");
  await frame
    .getByRole("combobox", { name: "Map displayName", exact: true })
    .selectOption("Name");
  await frame
    .getByRole("checkbox", { name: /I verified these stable IDs/ })
    .check();
  await frame
    .getByRole("button", { name: "Validate report preview", exact: true })
    .click();
  await frame
    .getByRole("button", { name: "Commit validated report", exact: true })
    .click();
  await expect(frame.getByRole("dialog")).toHaveCount(0);
  const child = page.frames().find((f) => f.url().includes(":4174"))!;
  expect(
    await child.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const before = await frame.locator(".sidebar").boundingBox();
  await child.evaluate(() => scrollTo(0, document.body.scrollHeight));
  const after = await frame.locator(".sidebar").boundingBox();
  expect(Math.abs(before!.y - after!.y)).toBeLessThan(2);
  await child.evaluate(() => scrollTo(0, 0));
  const popupPromise = page.waitForEvent("popup");
  await frame
    .getByRole("link", { name: "Open dashboard in a new tab", exact: true })
    .first()
    .click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", { name: "Data & Settings", exact: true }),
  ).toBeVisible();
  await popup.close();
  if (info.project.name === "desktop")
    await page
      .locator("iframe")
      .screenshot({ path: "/workspace/artifacts/tpm-phase8-pages-iframe.png" });
});
test("public visitors start with synthetic data and production settings remain keyboard-accessible", async ({
  page,
}) => {
  await page.goto("./?settings=storage#Data%20%26%20Settings");
  await expect(
    page.getByRole("region", { name: "Local data storage" }),
  ).toContainText("Saved in this browser profile");
  await expect(
    page.getByRole("tabpanel", { name: "Local Data & Backups", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Local Data & Backups", exact: true })
    .focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Settings", exact: true }),
  ).toBeFocused();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await settings(page, "Data Sources");
  await expect(
    page.getByRole("combobox", { name: "Active data workspace", exact: true }),
  ).toHaveValue("demo");
  await expect(
    page.getByRole("option", {
      name: "Browser-local CSV reports",
      exact: true,
    }),
  ).toBeDisabled();
});
