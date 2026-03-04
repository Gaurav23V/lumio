import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthCallbackRouter = {
  replace: (path: string) => void;
};

export type AuthCallbackResult =
  | { ok: true }
  | { ok: false; error: string };

export async function handleAuthCallback(
  code: string | null,
  supabase: SupabaseClient,
  router: AuthCallbackRouter
): Promise<AuthCallbackResult> {
  if (!code) {
    router.replace("/");
    return { ok: true };
  }

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return { ok: false, error: exchangeError.message };
  }

  const providerToken = data.session?.provider_token;
  if (providerToken) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lumio_google_provider_token", providerToken);
    }
  }
  router.replace("/");
  return { ok: true };
}
