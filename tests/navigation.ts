import type { Page } from "@playwright/test";
/** Use the sole primary navigation; also supports the retained narrow-viewport fallback. */
export async function navigate(page: Page, name: string) {
  const open = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await open.isVisible()) await open.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name, exact: true })
    .click();
}
