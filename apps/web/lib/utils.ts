export async function sha256Hex(input: Uint8Array): Promise<string> {
  const copy = new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  const bytes = new Uint8Array(digest);
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}
