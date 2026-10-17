import { expect, test } from "@playwright/test";

test("user can switch the interface to French and back to English", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Captions, translation and video dubbing in one click"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Change language" }).click();
  await page.getByRole("menuitem", { name: "Français" }).click();

  await expect(page).toHaveURL(/\/fr$/);
  await expect(
    page.getByText("Sous-titres, traduction et doublage vidéo en un clic"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Changer la langue" }).click();
  await page.getByRole("menuitem", { name: "English" }).click();

  await expect(page).toHaveURL(/\/en$/);
});
