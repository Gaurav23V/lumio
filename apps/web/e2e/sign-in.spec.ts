import { expect, test } from "@playwright/test";
import { mockUnauthenticated } from "./fixtures/supabase-mock";

test.describe("sign-in entry page", () => {
  test("renders sign-in UI when unauthenticated", async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Lumio" })).toBeVisible();
    await expect(page.getByText("Sign in with Google to access your Drive-backed library.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });

  test("shows status message", async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto("/");

    await expect(page.getByText(/Sign in required|Initializing/)).toBeVisible();
  });
});
