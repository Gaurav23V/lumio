import { describe, expect, it, vi, beforeEach } from "vitest";
import { createTokenVault, TOKEN_KEYS } from "./tokenVault";

const mockStore = {
  get: vi.fn(),
  insert: vi.fn(),
  remove: vi.fn()
};

const mockStronghold = {
  loadClient: vi.fn(),
  createClient: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined)
};

vi.mock("@tauri-apps/plugin-stronghold", () => ({
  Stronghold: {
    load: vi.fn().mockResolvedValue(mockStronghold)
  }
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/tmp/lumio-data"),
  join: vi.fn((...args: string[]) => args.join("/"))
}));

describe("createTokenVault", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockResolvedValue(null);
    mockStore.insert.mockResolvedValue(undefined);
    mockStore.remove.mockResolvedValue([1, 2, 3]);
    mockStronghold.loadClient.mockRejectedValue(new Error("no client"));
    mockStronghold.createClient.mockResolvedValue({
      getStore: () => mockStore
    });
  });

  it("creates client when loadClient fails", async () => {
    const vault = await createTokenVault("password");
    expect(mockStronghold.createClient).toHaveBeenCalledWith("lumio-tokens");
    expect(vault).toBeDefined();
  });

  it("uses existing client when loadClient succeeds", async () => {
    mockStronghold.loadClient.mockResolvedValue({
      getStore: () => mockStore
    });
    const vault = await createTokenVault("password");
    expect(mockStronghold.createClient).not.toHaveBeenCalled();
    expect(vault).toBeDefined();
  });

  it("get returns null for missing key", async () => {
    mockStore.get.mockResolvedValue(null);
    const vault = await createTokenVault("password");
    const value = await vault.get("missing");
    expect(value).toBeNull();
  });

  it("get returns decoded string for existing key", async () => {
    const bytes = new TextEncoder().encode("secret-token");
    mockStore.get.mockResolvedValue(new Uint8Array(bytes));
    const vault = await createTokenVault("password");
    const value = await vault.get(TOKEN_KEYS.SUPABASE_ACCESS_TOKEN);
    expect(value).toBe("secret-token");
  });

  it("set encodes value and saves", async () => {
    const vault = await createTokenVault("password");
    await vault.set(TOKEN_KEYS.DEVICE_ID, "device-123");
    expect(mockStore.insert).toHaveBeenCalledWith(
      TOKEN_KEYS.DEVICE_ID,
      expect.arrayContaining([100, 101, 118, 105, 99, 101, 45, 49, 50, 51])
    );
    expect(mockStronghold.save).toHaveBeenCalled();
  });

  it("remove returns true when key existed", async () => {
    mockStore.remove.mockResolvedValue([1]);
    const vault = await createTokenVault("password");
    const removed = await vault.remove("key");
    expect(removed).toBe(true);
    expect(mockStronghold.save).toHaveBeenCalled();
  });

  it("has returns true when key exists", async () => {
    mockStore.get.mockResolvedValue(new Uint8Array([1]));
    const vault = await createTokenVault("password");
    const result = await vault.has("key");
    expect(result).toBe(true);
  });

  it("has returns false when key missing", async () => {
    mockStore.get.mockResolvedValue(null);
    const vault = await createTokenVault("password");
    const result = await vault.has("key");
    expect(result).toBe(false);
  });
});
