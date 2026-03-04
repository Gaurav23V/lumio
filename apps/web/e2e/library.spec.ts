import { expect, test } from "@playwright/test";

test.describe("library UI", () => {
  test("renders library view with mock data (e2e route)", async ({ page }) => {
    await page.goto("/e2e-library");

    await expect(page.getByRole("heading", { name: "Lumio" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  });

  test("shows create folder input and upload area", async ({ page }) => {
    await page.goto("/e2e-library");

    await expect(page.getByPlaceholder("Create folder")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Folder" })).toBeVisible();
  });
});
