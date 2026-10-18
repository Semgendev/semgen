import { expect, test } from "@playwright/test";

test("visitor is sent to the login page and sees the sign-in form", async ({ page }) => {
  await page.goto("/en/account");

  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Faccount/);
  await expect(page.getByRole("heading", { name: "Sign in to SemGen" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send me a sign-in link" })).toBeVisible();
});

test("login page is available in French", async ({ page }) => {
  await page.goto("/fr/login");

  await expect(page.getByRole("heading", { name: "Connexion à SemGen" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
});

test("the home page links to sign-in", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/en\/login/);
});

test("the credits page is protected too", async ({ page }) => {
  await page.goto("/fr/account/credits");

  await expect(page).toHaveURL(/\/fr\/login\?next=/);
});

test("the upload page is protected and sends visitors to sign in", async ({ page }) => {
  await page.goto("/en/projects/new");

  await expect(page).toHaveURL(/\/en\/login\?next=/);
});

test("the projects list and a project page are protected", async ({ page }) => {
  await page.goto("/fr/projects");
  await expect(page).toHaveURL(/\/fr\/login\?next=/);

  await page.goto("/en/projects/b28f9644-c3c7-4a31-8225-017f8b8bad2a");
  await expect(page).toHaveURL(/\/en\/login\?next=/);
});
