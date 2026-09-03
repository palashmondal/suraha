import { SecureStorage } from '@aparajita/capacitor-secure-storage';

// Records held on-device are named pregnancy records, so everything but the sync bookkeeping is
// AES-GCM encrypted before it reaches IndexedDB (FWA_MOBILE_APP_PLAN §7). The 256-bit key is
// generated once per install and kept in the Android Keystore via SecureStorage — never in the
// database it protects. Losing the key (app uninstall / "clear data") is intended: the records are
// unreadable rather than recoverable, and anything unsynced was already queued in the outbox.
//
// ponytail: WebCrypto needs a secure context. Capacitor serves https://localhost on-device and
// vite serves localhost in dev, both fine; `vite --host` over a LAN IP is not, so use the emulator
// or a localhost tunnel when testing crypto paths in the browser.

const KEY_ID = 'suraha_db_key';

let keyPromise: Promise<CryptoKey> | null = null;

function toB64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    let b64 = await SecureStorage.getItem(KEY_ID);
    if (!b64) {
      b64 = toB64(crypto.getRandomValues(new Uint8Array(32)));
      await SecureStorage.setItem(KEY_ID, b64);
    }
    return crypto.subtle.importKey('raw', fromB64(b64), 'AES-GCM', false, ['encrypt', 'decrypt']);
  })();
  return keyPromise;
}

/** Encrypt any JSON-serialisable value to a base64 `iv || ciphertext` string. */
export async function encryptJson(value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await getKey(),
      new TextEncoder().encode(JSON.stringify(value)),
    ),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64(out);
}

export async function decryptJson<T>(blob: string): Promise<T> {
  const raw = fromB64(blob);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, 12) },
    await getKey(),
    raw.slice(12),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
