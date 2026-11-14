import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { navigate } from "./navigation";
test("Action Center reconciles KPIs, briefing, filters, ordering and Explorer navigation", async ({
  page,
}) => {
  await page.goto("/#Action%20Center");
  await page
    .getByRole("heading", { name: "Action Center", exact: true })
    .waitFor();
  const kpis = page.getByRole("region", { name: "Action Center summary" }),
    queue = page.getByRole("region", { name: "Action priority queue" });
  await expect(page.getByRole("status")).toContainText(
    "9 eligible action items",
  );
  await expect(queue.getByRole("row")).toHaveCount(10);
  await expect(queue.locator("tbody tr").first()).toContainText("DEMO-1010");
  await expect(kpis.getByRole("button")).toHaveCount(5);
  for (const [name, count] of [
    [/Older than 7 days/, 7],
    [/Pending owner approvals/, 3],
    [/Without an assigned vendor/, 1],
  ] as const) {
    await kpis.getByRole("button", { name }).click();
    await expect(page.getByRole("status")).toContainText(
      `${count} eligible action items`,
    );
    await expect(queue.getByRole("row")).toHaveCount(count + 1);
  }
  await kpis.getByRole("button", { name: /Scheduled review/ }).click();
  await expect(
    page.getByRole("heading", { name: "Scheduled review unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByText("No verified appointment dates", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset action queue" }).click();
  await page
    .getByRole("button", { name: "Urgent review: 2", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "2 eligible action items",
  );
  await page.getByRole("button", { name: "Reset action queue" }).click();
  await page
    .getByRole("textbox", { name: "Search action work orders" })
    .fill("no-such-record");
  await expect(
    page.getByRole("heading", { name: "No eligible follow-ups in this scope" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear action filters" }).click();
  await page
    .getByRole("combobox", { name: "Sort action queue" })
    .selectOption("number");
  await expect(queue.locator("tbody tr").first()).toContainText("DEMO-1001");
  await queue.getByRole("button", { name: "DEMO-1001", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Source / observed fact",
  );
  await expect(page.getByRole("dialog")).toContainText("Recommendation:");
  await expect(page.getByRole("dialog")).toContainText(
    "does not declare an emergency",
  );
  await page
    .getByRole("button", {
      name: "Open corresponding work order in Explorer",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Work Order Explorer", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "DEMO-1001" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await navigate(page, "Action Center");
  await expect(page.getByRole("status")).toContainText(
    "9 eligible action items",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("drafts are editable per recipient, copy-only, and disappear after detail close", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#Action%20Center");
  await page
    .getByRole("heading", { name: "Action Center", exact: true })
    .waitFor();
  await page
    .getByRole("region", { name: "Action priority queue" })
    .getByRole("button", { name: "Draft Follow-up", exact: true })
    .first()
    .click();
  const draft = page.getByRole("region", { name: "Draft follow-up" }),
    input = draft.getByRole("textbox", { name: "Message draft" });
  await expect(input).toHaveValue(/DEMO-1010/);
  await input.fill("Reviewed owner draft — synthetic test.");
  await draft
    .getByRole("combobox", { name: "Draft for" })
    .selectOption("vendor");
  await expect(input).not.toHaveValue("Reviewed owner draft — synthetic test.");
  await input.fill("Reviewed vendor draft — synthetic test.");
  await draft
    .getByRole("combobox", { name: "Draft for" })
    .selectOption("owner");
  await expect(input).toHaveValue("Reviewed owner draft — synthetic test.");
  await draft.getByRole("button", { name: "Copy draft", exact: true }).click();
  await expect(draft.getByRole("status")).toContainText(
    "Draft copied. Nothing was sent.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Reviewed owner draft — synthetic test.",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await draft
    .getByRole("button", { name: "Restore this recipient’s template" })
    .click();
  await expect(input).toHaveValue(/DEMO-1010/);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard blocked for test");
        },
      },
    }),
  );
  await draft.getByRole("button", { name: "Copy draft", exact: true }).click();
  await expect(draft.getByRole("status")).toContainText(
    "Clipboard unavailable",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("region", { name: "Action priority queue" })
    .getByRole("button", { name: "Draft Follow-up", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("textbox", { name: "Message draft" }),
  ).not.toHaveValue("Reviewed owner draft — synthetic test.");
});
test("Action Center works within a smaller iframe with source-qualified unavailable states", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.body.replaceChildren();
    const f = document.createElement("iframe");
    f.title = "Action portal simulation";
    f.src = "/#Action%20Center";
    f.style.cssText = "width:1060px;height:620px;border:0";
    document.body.append(f);
  });
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("heading", { name: "Action Center", exact: true })
    .waitFor();
  await frame
    .getByRole("button", { name: "Owner approvals: 3", exact: true })
    .click();
  await expect(frame.getByRole("status")).toContainText(
    "3 eligible action items",
  );
  await frame.getByRole("button", { name: "DEMO-1001", exact: true }).click();
  await expect(frame.getByRole("dialog")).toContainText(
    "No previous comparable demo snapshot",
  );
  await page.keyboard.press("Escape");
  const child = page.frames().find((f) => f.url().includes("#Action"))!;
  expect(
    await child.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
