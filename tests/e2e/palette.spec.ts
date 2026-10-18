import { expect, test } from "@playwright/test";

test("palette choice is applied instantly, kept after reload, and never on the landing page", async ({
  page,
}) => {
  await page.goto("/fr/settings/appearance");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-palette", "cobalt");

  await page.getByRole("radio", { name: /Teal & Safran/ }).click();
  await expect(html).toHaveAttribute("data-palette", "teal");
  await expect(page.getByRole("radio", { name: /Teal & Safran/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // Set before the first paint by the head script: no flash back to the default.
  await page.reload();
  await expect(html).toHaveAttribute("data-palette", "teal");

  // The landing page keeps the brand identity.
  await page.goto("/fr");
  await expect(html).toHaveAttribute("data-palette", "cobalt");
});

test("dark mode and palette are independent", async ({ page }) => {
  await page.goto("/en/settings/appearance");
  await page.getByRole("radio", { name: /Spark/ }).click();
  await page.getByRole("radio", { name: "Dark" }).click();
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveAttribute("data-palette", "etincelle");
});
