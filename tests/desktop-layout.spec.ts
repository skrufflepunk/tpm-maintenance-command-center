import { test, expect } from "@playwright/test";
test.skip(
  ({ isMobile }) => isMobile,
  "Desktop-only layout matrix; prior mobile checks remain opt-in.",
);
test("KPI quick filters scope the register, preserve context and reset pagination", async ({
  page,
}) => {
  await page.goto("/#Work%20Orders");
  await expect(
    page.getByRole("heading", { name: "Work Order Explorer", exact: true }),
  ).toHaveCount(1);
  expect(
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link")
      .count(),
  ).toBe(6);
  await expect(page.locator(".horizontal-nav")).toHaveCount(0);
  const summary = page.getByRole("region", { name: "Explorer summary" }),
    register = page.getByRole("region", {
      name: "Explorer work order register",
    });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  for (const [name, count] of [
    [/Open Work Orders/, 14],
    [/Over 7 days/, 7],
    [/Pending approval/, 3],
    [/^Unassigned/, 1],
  ] as const) {
    const card = summary.getByRole("button", { name });
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("status")).toContainText(
      `${count} of 24 records`,
    );
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    await expect(register.getByRole("row")).toHaveCount(
      Math.min(count, 10) + 1,
    );
  }
  await expect(register).toContainText("Explicitly unassigned");
  await expect(register).not.toContainText("Unknown assignment");
  await page.getByRole("button", { name: "Reset KPI filter" }).click();
  await expect(page.getByRole("status")).toContainText("24 of 24 records");
  await page
    .getByRole("textbox", { name: "Search Explorer work orders" })
    .fill("juniper");
  await summary.getByRole("button", { name: /Open Work Orders/ }).click();
  await expect(page.getByRole("status")).toContainText("6 of 24 records");
  await page.getByRole("button", { name: "Reset KPI filter" }).click();
  await expect(page.getByRole("status")).toContainText("8 of 24 records");
  await page.getByRole("button", { name: "Clear Explorer filters" }).click();
  await expect(page.getByRole("status")).toContainText("24 of 24 records");
  await page
    .getByRole("combobox", { name: "Sort register by", exact: true })
    .selectOption("created");
  await expect(register.getByRole("row").nth(1)).toContainText("DEMO-1010");
  await page.getByRole("button", { name: "DEMO-1010", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Owner approval");
  await expect(page.getByRole("dialog")).toContainText("Created");
  await expect(page.getByRole("dialog")).toContainText("Priority");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Open in Rentvine", exact: true }),
  ).toBeDisabled();
});
test("sidebar covers long pages, stays fixed and register has no desktop inner scrollbar", async ({
  page,
}) => {
  for (const target of ["/#Work%20Orders", "/#Overview"]) {
    await page.goto(target);
    await page
      .getByRole("heading", {
        name: target.includes("Work")
          ? "Work Order Explorer"
          : "Portfolio overview",
        exact: true,
      })
      .waitFor();
    if (target.includes("Work"))
      await page
        .getByRole("combobox", { name: "Rows per page" })
        .selectOption("25");
    await expect(page.locator(".horizontal-nav")).toHaveCount(0);
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    const measurements = await page.evaluate(() => {
      const sidebar = document.querySelector(".sidebar")!,
        table = document.querySelector(".explorer-table"),
        app = document.querySelector(".app-shell")!;
      const s = sidebar.getBoundingClientRect(),
        m = document.querySelector(".workspace")!.getBoundingClientRect();
      return {
        top: s.top,
        bottom: s.bottom,
        height: innerHeight,
        left: m.left,
        right: s.right,
        fits: document.documentElement.scrollWidth <= innerWidth,
        tableY: table ? table.scrollHeight - table.clientHeight : 0,
        tableX: table ? table.scrollWidth - table.clientWidth : 0,
        pageHeight: document.documentElement.scrollHeight,
        appBackground: getComputedStyle(app).backgroundImage,
      };
    });
    expect(measurements.top).toBe(0);
    expect(measurements.bottom).toBe(measurements.height);
    expect(measurements.left).toBeGreaterThanOrEqual(measurements.right);
    expect(measurements.fits).toBe(true);
    expect(measurements.pageHeight).toBeGreaterThan(measurements.height);
    expect(measurements.appBackground).toContain("linear-gradient");
    if (target.includes("Work")) {
      expect(measurements.tableY).toBeLessThanOrEqual(1);
      expect(measurements.tableX).toBeLessThanOrEqual(1);
    }
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
  }
});
test("local iframe uses its own dimensions, supports scrolling, navigation and dialogs", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.body.replaceChildren();
    const frame = document.createElement("iframe");
    frame.title = "Internal portal simulation";
    frame.src = "/#Work%20Orders";
    frame.style.cssText = "width:1060px;height:620px;border:0";
    document.body.append(frame);
  });
  const frame = page.frameLocator('iframe[title="Internal portal simulation"]');
  await expect(
    frame.getByRole("heading", { name: "Work Order Explorer", exact: true }),
  ).toBeVisible();
  await frame.getByRole("button", { name: /Open Work Orders/ }).click();
  await expect(frame.getByRole("status")).toContainText("14 of 24 records");
  await frame.getByRole("button", { name: "DEMO-1001", exact: true }).click();
  await expect(frame.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await frame
    .getByRole("combobox", { name: "Rows per page" })
    .selectOption("25");
  const child = page.frames().find((f) => f.url().includes("#Work"))!;
  await child.evaluate(() =>
    scrollTo(0, document.documentElement.scrollHeight),
  );
  expect(
    await child.evaluate(() => ({
      height: innerHeight,
      sidebar: document.querySelector(".sidebar")!.getBoundingClientRect()
        .height,
      fits: document.documentElement.scrollWidth <= innerWidth,
    })),
  ).toEqual({ height: 620, sidebar: 620, fits: true });
  await frame
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await expect(
    frame.getByRole("heading", { name: "Portfolio overview", exact: true }),
  ).toBeVisible();
});
