import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/core/vitest.config.ts",
  "packages/adapters/vitest.config.ts",
  "packages/ui/vitest.config.ts",
  "infra/supabase/vitest.config.ts",
  "apps/web/vitest.config.ts",
  "apps/desktop/vitest.config.ts"
]);
