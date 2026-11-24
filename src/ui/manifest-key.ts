// The manifest's `key`, chosen at build time. Chrome derives an extension's ID from it, so a build with a key keeps one ID
// wherever the unpacked folder sits (which is what keeps its stored settings through an update), and a build without
// one gets the ID Chrome derives from the folder or the store assigns. Only the PUBLIC half is ever read here.
// For the build config and the tests; nothing in the extension imports this file.
import { createHash } from 'node:crypto';

/** What the build reads: the key itself, or the path of a file that holds it (a PEM public key or its base64 body). */
export interface KeyEnv {
  KERA_EXTENSION_KEY?: string;
  KERA_EXTENSION_KEY_FILE?: string;
}

/**
 * The base64 body of a public key, from the text of a PEM file or from the body alone. Refuses a private key (the
 * message never includes the text), anything that is not base64 and anything too short to be an RSA key.
 */
export function normalizeExtensionKey(text: string): string {
  if (/PRIVATE KEY/i.test(text)) {
    throw new Error('The extension key must be the PUBLIC key. A private key was given; it was not read further.');
  }
  const body = text.replace(/-----(BEGIN|END)[^-]*-----/g, '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body) || body.length < 200) {
    throw new Error(
      'The extension key is not a base64 public key (DER body of an RSA public key, PEM header optional).',
    );
  }
  return body;
}

/** The key the build asked for, or undefined for a build without one. `readFile` reads a text file. */
export function extensionKeyFrom(env: KeyEnv, readFile: (path: string) => string): string | undefined {
  const inline = env.KERA_EXTENSION_KEY?.trim();
  const file = env.KERA_EXTENSION_KEY_FILE?.trim();
  if (inline && file) throw new Error('Set KERA_EXTENSION_KEY or KERA_EXTENSION_KEY_FILE, not both.');
  if (inline) return normalizeExtensionKey(inline);
  if (file) return normalizeExtensionKey(readFile(file));
  return undefined;
}

/** The extension ID Chrome derives from a key: the first 32 hex digits of the SHA-256 of the DER key, as letters a to p. */
export function extensionIdFromKey(key: string): string {
  const hex = createHash('sha256').update(Buffer.from(key, 'base64')).digest('hex').slice(0, 32);
  return [...hex].map(c => String.fromCharCode('a'.charCodeAt(0) + parseInt(c, 16))).join('');
}
