export function encodeCalculatorState<T extends Record<string, unknown>>(state: T): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeCalculatorState<T extends Record<string, unknown>>(encoded: string, validate?: (value: unknown) => value is T): T | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (validate && !validate(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}
