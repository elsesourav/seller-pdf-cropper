export async function computeBytesHash(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
    try {
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fallback below when subtle crypto is unavailable
    }
  }

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const step = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += step) {
    h1 ^= bytes[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= bytes[bytes.length - 1 - i];
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `fnv-${bytes.length}-${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}`;
}
