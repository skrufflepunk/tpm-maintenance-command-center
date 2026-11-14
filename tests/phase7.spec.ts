import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
const section = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true }).click();
async function signIn(page: Page) {
  await page.goto("/auth/login");
  await page
    .getByRole("link", {
      name: "Continue as synthetic administrator",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", { name: "Portfolio overview", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Data & Settings", exact: true })
    .click();
}
async function seed(page: Page) {
  const bootstrap = await page.request
    .get("/api/bootstrap")
    .then((r) => r.json());
  const headers = {
    Origin: "http://127.0.0.1:5173",
    "X-CSRF-Token": bootstrap.csrf,
  };
  const account = "synthetic-phase7-" + randomUUID();
  const sourceResponse = await page.request.post("/api/sources", {
    headers,
    data: {
      name: "Phase 7 · synthetic portal review",
      account,
      scope: "Synthetic review only",
      timezone: "UTC",
      approved: true,
      behavior: "snapshot",
    },
  });
  expect(sourceResponse.status()).toBe(201);
  const source = await sourceResponse.json();
  const preview = await page.request.post("/api/imports/preview", {
    headers,
    data: {
      sourceId: source.id,
      dataset: "workOrders",
      behavior: "snapshot",
      input:
        "ID,Number,State,PropertyID,Property,Created\nsynthetic-7-1,SYNTH-P7-001,Open,p1,Synthetic Portal Court,2026-11-01\nsynthetic-7-2,SYNTH-P7-002,Completed,p1,Synthetic Portal Court,2026-11-02",
      options: {
        account,
        timezone: "UTC",
        scope: "synthetic-work-orders",
        reportAsOf: "2026-11-13T14:00:00Z",
        redacted: true,
        mapping: {
          sourceId: "ID",
          number: "Number",
          status: "State",
          propertyId: "PropertyID",
          propertyName: "Property",
          createdAt: "Created",
        },
        statusMap: { Open: "open", Completed: "completed" },
        priorityMap: {},
        approvalMap: {},
        assignmentMap: {},
      },
    },
  });
  const candidate = await preview.json();
  expect(candidate.errors).toEqual([]);
  expect(
    (
      await page.request.post(`/api/imports/${candidate.id}/commit`, {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await section(page, "Data Sources");
  await page
    .getByRole("combobox", { name: "Active data workspace", exact: true })
    .selectOption(source.id);
  return source;
}
async function scan(page: Page) {
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
}
test("settings sections preserve drafts, support keyboard/deep links and show actual successful CSV loads", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await signIn(page);
  await seed(page);
  await expect(
    page
      .getByRole("tablist", { name: "Data & Settings sections" })
      .getByRole("tab"),
  ).toHaveCount(4);
  await expect(page.locator(".settings-refresh")).toContainText(
    "Phase 7 · synthetic portal review",
  );
  await expect(page.locator(".settings-refresh time")).toHaveCount(1);
  await section(page, "Security & Settings");
  const age = page.getByLabel("Aging threshold (calendar days)", {
    exact: true,
  });
  const original = await age.inputValue();
  await age.fill("23");
  await section(page, "Data Sources");
  await expect(age).not.toBeVisible();
  const first = page.getByRole("tab", { name: "Data Sources", exact: true });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Imports & History", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Managed dataset health" }),
  ).toContainText("Last checked:");
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Security & Settings", exact: true }),
  ).toBeFocused();
  await expect(age).toHaveValue("23");
  await age.fill(original);
  for (const [name, key] of [
    ["Data Sources", "sources"],
    ["Imports & History", "imports"],
    ["Automation", "automation"],
    ["Security & Settings", "security"],
  ]) {
    await section(page, name);
    await expect(
      page.getByRole("tabpanel", { name, exact: true }),
    ).toBeVisible();
    await scan(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (info.project.name === "desktop") {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `/workspace/artifacts/tpm-phase7-settings-${key}.png`,
        fullPage: true,
      });
      if (key === "sources")
        await page.screenshot({
          path: "/workspace/artifacts/tpm-phase7-settings-desktop.png",
        });
    }
  }
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Security & Settings", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(age).toHaveValue(original);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});

test("Google Sites-sized frame keeps navigation, modal focus and secure-tab fallback usable", async ({
  page,
}, info) => {
  await signIn(page);
  await page.evaluate(() => {
    document.body.replaceChildren();
    const frame = document.createElement("iframe");
    frame.title = "Synthetic Phase 7 Team Portal";
    frame.src = "/?settings=imports#Data%20%26%20Settings";
    frame.style.cssText = "width:1060px;height:620px;border:0";
    document.body.append(frame);
  });
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("tab", { name: "Imports & History", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const popupPromise = page.waitForEvent("popup");
  await frame
    .getByRole("link", { name: "Open dashboard in a secure tab", exact: true })
    .click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", { name: "Data & Settings", exact: true }),
  ).toBeVisible();
  await popup.close();
  await frame.getByRole("tab", { name: "Data Sources", exact: true }).click();
  await frame
    .getByRole("tab", { name: "Imports & History", exact: true })
    .click();
  // No source is selected in this fresh staff session, so use a Demo rules dialog.
  await frame.getByRole("button", { name: "Demo rules", exact: true }).click();
  await expect(frame.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(frame.getByRole("dialog")).toHaveCount(0);
  const child = page
    .frames()
    .find((f) => f.url().includes("settings=imports"))!;
  expect(
    await child.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const region of await frame.getByRole("region").all()) {
    expect(
      await region.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
  }
  const before = await frame.locator(".sidebar").boundingBox();
  await child.evaluate(() => scrollTo(0, document.body.scrollHeight));
  const after = await frame.locator(".sidebar").boundingBox();
  expect(Math.abs(before!.y - after!.y)).toBeLessThan(2);
  if (info.project.name === "desktop") {
    await child.evaluate(() => scrollTo(0, 0));
    await page.locator("iframe").screenshot({
      path: "/workspace/artifacts/tpm-phase7-iframe.png",
    });
  }
});

test("protected anonymous frame offers top-level sign-in while data and assets remain inaccessible", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.body.replaceChildren();
    const frame = document.createElement("iframe");
    frame.title = "Synthetic protected access frame";
    frame.src = "http://127.0.0.1:8787/";
    frame.style.cssText = "width:1060px;height:620px;border:0";
    document.body.append(frame);
  });
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("heading", {
      name: "Sign in to your maintenance dashboard",
      exact: true,
    }),
  ).toBeVisible();
  expect((await page.request.get("/api/bootstrap")).status()).toBe(401);
  expect(
    (
      await page.request.get("http://127.0.0.1:8787/assets/private.js")
    ).status(),
  ).toBe(401);
  if (info.project.name === "desktop")
    await page.screenshot({
      path: "/workspace/artifacts/tpm-phase7-access-fallback.png",
    });
  const popupPromise = page.waitForEvent("popup");
  await frame
    .getByRole("link", { name: "Open staff sign-in in a new tab", exact: true })
    .click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", { name: "Synthetic test sign-in", exact: true }),
  ).toBeVisible();
  await popup
    .getByRole("link", { name: "Continue as synthetic viewer", exact: true })
    .click();
  await expect(
    popup.getByRole("heading", { name: "Portfolio overview", exact: true }),
  ).toBeVisible();
  await frame
    .getByRole("link", { name: "Reload this dashboard", exact: true })
    .click();
  await expect(
    frame.getByRole("heading", { name: "Portfolio overview", exact: true }),
  ).toBeVisible();
  await popup
    .getByRole("link", { name: "Data & Settings", exact: true })
    .click();
  await popup.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    popup.getByRole("heading", { name: "You’re signed out", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/bootstrap")).status()).toBe(401);
  await popup.close();
});
