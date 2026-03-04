import { type Page } from "@playwright/test";

/** Supabase base URL from env (used for route matching). Default for CI/mock mode. */
const SUPABASE_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";

function matchSupabase(url: string): boolean {
  return url.startsWith(SUPABASE_BASE) || url.includes("supabase.co");
}

/**
 * Mock Supabase auth getSession to return null (unauthenticated).
 * Use before navigating to pages that check auth.
 */
export async function mockUnauthenticated(page: Page): Promise<void> {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (!matchSupabase(url)) return route.continue();
    if (url.includes("/auth/v1/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { session: null }, error: null })
      });
    }
    if (url.includes("/rest/v1/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    }
    return route.continue();
  });
}

/** Minimal mock session (kept for potential future auth-based library tests). */
const MOCK_SESSION = {
  access_token: "mock-token",
  refresh_token: "mock-refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: "mock-user-id",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  provider_token: "mock-google-token"
};

/**
 * Mock Supabase auth to return an authenticated session.
 * Also mocks REST endpoints. Used for potential future tests against / with auth.
 */
export async function mockAuthenticated(page: Page): Promise<void> {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (!matchSupabase(url)) return route.continue();
    const method = route.request().method();
    if (url.includes("/auth/v1/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { session: MOCK_SESSION }, error: null })
      });
    }
    if (url.includes("/rest/v1/") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    }
    if (url.includes("/rest/v1/") && (method === "POST" || method === "PATCH")) {
      return route.fulfill({ status: 204, body: "" });
    }
    return route.continue();
  });
}
