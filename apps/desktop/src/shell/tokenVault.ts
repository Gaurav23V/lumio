/**
 * Token vault helper using Tauri Stronghold plugin for secure storage.
 * Stores auth tokens and device identifiers in an encrypted vault.
 */

export const TOKEN_KEYS = {
  SUPABASE_ACCESS_TOKEN: "supabase_access_token",
  SUPABASE_REFRESH_TOKEN: "supabase_refresh_token",
  DEVICE_ID: "device_id",
  USER_ID: "user_id"
} as const;

export type TokenKey = (typeof TOKEN_KEYS)[keyof typeof TOKEN_KEYS];

export interface TokenVaultApi {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
}

export interface TokenVaultOptions {
  clientName?: string;
  vaultFileName?: string;
}

const DEFAULT_CLIENT_NAME = "lumio-tokens";
const DEFAULT_VAULT_FILE = "vault.hold";

/**
 * Creates a token vault using Stronghold plugin.
 * Must be called from Tauri webview context.
 */
export async function createTokenVault(
  vaultPassword: string,
  options: TokenVaultOptions = {}
): Promise<TokenVaultApi> {
  const { Stronghold } = await import("@tauri-apps/plugin-stronghold");
  const { appDataDir } = await import("@tauri-apps/api/path");
  const { join } = await import("@tauri-apps/api/path");

  const vaultPath = await join(await appDataDir(), options.vaultFileName ?? DEFAULT_VAULT_FILE);
  const clientName = options.clientName ?? DEFAULT_CLIENT_NAME;

  const stronghold = await Stronghold.load(vaultPath, vaultPassword);
  let client;
  try {
    client = await stronghold.loadClient(clientName);
  } catch {
    client = await stronghold.createClient(clientName);
  }

  const store = client.getStore();

  function toBytes(value: string): number[] {
    return Array.from(new TextEncoder().encode(value));
  }

  function fromBytes(data: Uint8Array | null): string | null {
    if (!data || data.length === 0) return null;
    return new TextDecoder().decode(data);
  }

  return {
    async get(key: string): Promise<string | null> {
      const data = await store.get(key);
      return fromBytes(data);
    },

    async set(key: string, value: string): Promise<void> {
      await store.insert(key, toBytes(value));
      await stronghold.save();
    },

    async remove(key: string): Promise<boolean> {
      const removed = await store.remove(key);
      if (removed) {
        await stronghold.save();
        return true;
      }
      return false;
    },

    async has(key: string): Promise<boolean> {
      const data = await store.get(key);
      return data != null && data.length > 0;
    }
  };
}
