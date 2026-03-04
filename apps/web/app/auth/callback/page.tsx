"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { handleAuthCallback } from "@/lib/auth-callback";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    async function run() {
      const code = searchParams.get("code");
      const result = await handleAuthCallback(code, supabase, router);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Completing sign-in</h1>
      {error ? <p style={{ color: "#b42318" }}>{error}</p> : <p>Please wait...</p>}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}><h1>Completing sign-in</h1><p>Please wait...</p></main>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
