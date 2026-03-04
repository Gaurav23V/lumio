import { beforeEach, describe, expect, it, vi } from "vitest";
import { sha256Hex } from "@/lib/utils";
import { handleAuthCallback } from "@/lib/auth-callback";

describe("sha256Hex", () => {
  it("produces correct hash for empty input", async () => {
    const input = new Uint8Array([]);
    const hash = await sha256Hex(input);
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("produces correct hash for known input", async () => {
    const input = new TextEncoder().encode("hello");
    const hash = await sha256Hex(input);
    expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });
});

describe("handleAuthCallback", () => {
  const mockRouter = { replace: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to / when code is null", async () => {
    const mockSupabase = {
      auth: { exchangeCodeForSession: vi.fn() },
    } as unknown as Parameters<typeof handleAuthCallback>[1];

    const result = await handleAuthCallback(null, mockSupabase, mockRouter);

    expect(result).toEqual({ ok: true });
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
    expect(mockSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges code for session and redirects on success", async () => {
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: { session: { provider_token: "token-123" } },
          error: null,
        }),
      },
    } as unknown as Parameters<typeof handleAuthCallback>[1];

    const result = await handleAuthCallback("auth-code-xyz", mockSupabase, mockRouter);

    expect(result).toEqual({ ok: true });
    expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("auth-code-xyz");
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });

  it("returns error when exchange fails", async () => {
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { message: "Invalid code" },
        }),
      },
    } as unknown as Parameters<typeof handleAuthCallback>[1];

    const result = await handleAuthCallback("bad-code", mockSupabase, mockRouter);

    expect(result).toEqual({ ok: false, error: "Invalid code" });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
