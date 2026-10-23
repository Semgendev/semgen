import { expect, test } from "@playwright/test";

// The export panel is checked on /dev/export, which builds each job state from the URL (the real
// page needs a signed-in account with a transcribed video).

test("a failed 1080p export says that no credit was taken", async ({ page }) => {
  await page.goto("/en/dev/export?job=failed&q=1080p");

  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("alert")).toContainText("No credits were taken");
  await expect(panel.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("a failed 4K export says the credits are refunded", async ({ page }) => {
  await page.goto("/en/dev/export?job=failed&q=4k");

  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Your credits are refunded",
  );
});

test("a lack of credits is told as such", async ({ page }) => {
  await page.goto("/fr/dev/export?job=insufficient&q=4k");

  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Pas assez de crédits");
});

test("the panel offers the formats and updates the size", async ({ page }) => {
  await page.goto("/en/dev/export");

  const panel = page.getByRole("dialog");
  await expect(panel.getByText("1920×1080 · 30 fps")).toBeVisible();
  await expect(panel.getByRole("radiogroup", { name: "Framing" })).toHaveCount(0);

  await panel.getByRole("radio", { name: "Vertical 9:16" }).click();
  await expect(panel.getByText("1080×1920 · 30 fps")).toBeVisible();
  await expect(panel.getByRole("radiogroup", { name: "Framing" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Start the export" })).toBeEnabled();
});

test("4K from a smaller video is explained, not sold", async ({ page }) => {
  await page.goto("/en/dev/export");
  const panel = page.getByRole("dialog");

  await panel.getByRole("radio", { name: "4K" }).click();
  await expect(panel.locator("p", { hasText: "Your video is not 4K" })).toBeVisible();
  await expect(panel.getByRole("radio", { name: "1080p" })).toHaveAttribute("aria-checked", "true");
});

test("4K and 60 fps point to the Business plan, and open with it", async ({ page }) => {
  await page.goto("/en/dev/export?src=uhd");
  let panel = page.getByRole("dialog");

  await panel.getByRole("radio", { name: /^60/ }).click();
  await expect(panel.getByText("Included in the Business plan")).toBeVisible();
  await expect(panel.getByRole("radio", { name: /^30/ })).toHaveAttribute("aria-checked", "true");

  await page.goto("/en/dev/export?src=uhd&plan=business");
  panel = page.getByRole("dialog");
  await panel.getByRole("radio", { name: "4K" }).click();
  await panel.getByRole("radio", { name: /^60/ }).click();
  await expect(panel.getByText("3840×2160 · 60 fps")).toBeVisible();
  await expect(panel.getByText("Included in the Business plan")).toHaveCount(0);
});

test("a running export shows its progress, a finished one offers the download", async ({
  page,
}) => {
  await page.goto("/en/dev/export?job=running");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");

  await page.goto("/en/dev/export?job=done");
  await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  await page.getByRole("button", { name: "Make another export" }).click();
  await expect(page.getByRole("button", { name: "Start the export" })).toBeVisible();
});

test("the panel has no blurred backdrop: the page stays sharp behind it", async ({ page }) => {
  await page.goto("/en/dev/export");
  await expect(page.getByRole("dialog")).toBeVisible();

  const blurred = await page.evaluate(() =>
    [...document.querySelectorAll("body *")].some((el) => {
      const filter = getComputedStyle(el).backdropFilter;
      return filter !== "" && filter !== "none";
    }),
  );
  expect(blurred).toBe(false);
});
