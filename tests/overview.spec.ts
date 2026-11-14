import { navigate } from "./navigation";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
test("dashboard reconciles counts, drills into records, and preserves filters across all tabs", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Portfolio overview" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(/24 of 24 fictional/);
  const card = page.getByRole("button", { name: /Open Work Orders/ });
  const total = Number(await card.locator(".kpi-value").innerText());
  await card.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("row")).toHaveCount(
    total + 1,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "DEMO-1001" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Fictional work order");
  await expect(page.getByRole("dialog")).toContainText(
    "Rentvine link unavailable",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toContainText("supporting records");
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Search work orders" })
    .fill("juniper");
  await expect(page.getByRole("status")).toContainText("8 of 24");
  for (const name of [
    "Work Orders",
    "Action Center",
    "Vendors",
    "Properties",
    "Analytics",
    "Overview",
  ]) {
    if (testInfo.project.name === "mobile")
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name, exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name:
          name === "Overview"
            ? "Portfolio overview"
            : name === "Work Orders"
              ? "Work Order Explorer"
              : name === "Vendors"
                ? "Vendor Watch"
                : name,
        exact: true,
      }),
    ).toBeVisible();
    if (name === "Overview")
      await expect(page.getByRole("status")).toContainText("8 of 24");
  }
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search work orders" })
    .fill("no-such-record");
  await expect(page.getByRole("status")).toContainText("0 of 24");
  await expect(
    page.getByRole("heading", { name: "No matching results" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("overview.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("multi-select, chart counts, rules, keyboard dialog, dates and data health work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Portfolio overview" }),
  ).toBeVisible();
  const status = page
    .locator(".main > .filter-panel .multi-filter")
    .filter({ has: page.locator("summary").filter({ hasText: "Status" }) });
  await status.locator("summary").click();
  await status.getByLabel("Open", { exact: true }).check();
  await status.getByLabel("In progress", { exact: true }).check();
  await status.locator("summary").click();
  await expect(page.getByRole("status")).toContainText("12 of 24");
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page.getByLabel("Created from", { exact: true }).fill("2026-11-01");
  await page.getByLabel("Created to", { exact: true }).fill("2026-11-06");
  await expect(page.getByRole("status")).toContainText("6 of 24");
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Created 2026-11: 10 work orders",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog").getByRole("row")).toHaveCount(11);
  await page.keyboard.press("Escape");
  const settings = page.getByRole("button", {
    name: "Demo rules",
    exact: true,
  });
  await settings.click();
  await page.getByLabel("Aging follow-up:", { exact: false }).fill("30");
  await page.getByRole("button", { name: "Apply demo rules" }).click();
  await expect(
    page.getByRole("button", { name: /Active over 30 days/ }),
  ).toBeVisible();
  await settings.click();
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();
  await page.getByRole("button", { name: /Data health/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "no previous comparable snapshot",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Source freshness unknown; policy not configured",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /0–7 days/ }).click();
  await expect(page.getByRole("dialog")).toContainText("supporting records");
});

test("keyboard focus is contained in dialogs and overview remains usable at 200% desktop zoom", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Portfolio overview" }).waitFor();
  await page.getByRole("button", { name: "Demo rules", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Apply demo rules" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Apply demo rules" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  if (testInfo.project.name === "desktop") {
    // A 720 CSS-pixel viewport models reflow on a 1440px desktop at 200% zoom.
    await page.setViewportSize({ width: 720, height: 550 });
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Analytics", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Analytics", exact: true }),
    ).toBeVisible();
  }
  await page.setViewportSize({ width: 320, height: 650 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Close navigation", exact: true }).last(),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});

test("automated WCAG checks cover overview, rules and health", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Portfolio overview" }).waitFor();
  const scan = async () =>
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  await scan();
  await page.getByRole("button", { name: "Demo rules", exact: true }).click();
  await scan();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Data health/ }).click();
  await scan();
});

test("dashboard panels reconcile drill-downs, sort records and keep future actions unavailable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Portfolio overview" }).waitFor();
  await navigate(page, "Vendors");
  await expect(
    page.getByRole("heading", { name: "Vendor Watch", exact: true }),
  ).toBeVisible();
  await navigate(page, "Overview");
  const status = page.locator(".status-panel");
  await status.getByRole("button", { name: "Open 8", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("row")).toHaveCount(9);
  await page.keyboard.press("Escape");
  await page
    .locator(".vendor-panel")
    .getByRole("button", { name: "Demo Fieldworks", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("row")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await page
    .locator(".heatmap-panel")
    .getByRole("button", { name: "Unknown property", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("row")).toHaveCount(2);
  await page.keyboard.press("Escape");
  const table = page.locator(".lower-grid").getByRole("table");
  await table.getByRole("button", { name: "Age", exact: false }).click();
  await expect(
    table.getByRole("columnheader", { name: /Age/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  await table.getByRole("button", { name: "Age", exact: false }).click();
  await expect(
    table.getByRole("columnheader", { name: /Age/ }),
  ).toHaveAttribute("aria-sort", "descending");
  await expect(table.locator("tbody tr").first()).toContainText("43 days");
  await table
    .getByRole("button", {
      name: "Review source-reported urgency",
      exact: true,
    })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Fictional work order");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "AI follow-ups · Coming soon",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Open Rentvine/ }),
  ).toBeDisabled();
  await expect(page.locator(".recent-activity")).toContainText(
    "No activity history",
  );
  await page
    .getByRole("textbox", { name: "Search work orders" })
    .fill("no-such-record");
  await expect(status.getByRole("img")).toHaveAccessibleName(/0 scoped/);
  await expect(page.locator(".assistant-card").first()).toContainText(
    "0 active over",
  );
});

test("five KPI cards disclose their cohorts and show unavailable means without eligible completions", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Portfolio overview" }).waitFor();
  const kpis = page.getByRole("region", { name: "Key performance indicators" });
  // section has an accessible name and is exposed as a region.
  await expect(kpis.getByRole("button")).toHaveCount(5);
  for (const [title, value] of [
    ["Open Work Orders", "14"],
    ["Awaiting Approval", "3"],
    ["Over 7 Days Old", "7"],
    ["Completed This Month", "4"],
    ["Average Days to Close", "12.7"],
  ]) {
    const card = kpis.getByRole("button", { name: new RegExp(title) });
    await expect(card.locator(".kpi-value")).toContainText(value);
  }
  await expect(
    kpis.getByRole("button", { name: /Completed This Month/ }),
  ).toContainText("2026-11");
  await expect(
    kpis.getByRole("button", { name: /Average Days to Close/ }),
  ).toContainText("n=6");
  await kpis.getByRole("button", { name: /Completed This Month/ }).click();
  await expect(page.getByRole("dialog").getByRole("row")).toHaveCount(5);
  await page.keyboard.press("Escape");
  await kpis.getByRole("button", { name: /Average Days to Close/ }).click();
  await expect(page.getByRole("dialog").getByRole("row")).toHaveCount(7);
  await page.keyboard.press("Escape");
  const table = page.locator(".lower-grid").getByRole("table");
  const urgentRow = table.getByRole("row").filter({
    has: page.getByRole("button", { name: "DEMO-1001", exact: true }),
  });
  await expect(urgentRow).toContainText("Unknown assignment");
  await expect(urgentRow).toContainText("Coverage unavailable");
  await expect(
    urgentRow.getByRole("button", { name: "Review source-reported urgency" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Demo rules", exact: true }).click();
  await page.getByLabel("Aging follow-up:", { exact: false }).fill("30");
  await page.getByRole("button", { name: "Apply demo rules" }).click();
  await expect(
    kpis.getByRole("button", { name: /Over 30 Days Old/ }),
  ).toContainText("3");
  await page
    .getByRole("textbox", { name: "Search work orders" })
    .fill("no-such-record");
  await expect(
    kpis
      .getByRole("button", { name: /Average Days to Close/ })
      .locator(".kpi-value"),
  ).toHaveText("Unavailable");
  expect(
    await page
      .locator(".topbar")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(info.project.name === "desktop" ? 100 : 132);
});
