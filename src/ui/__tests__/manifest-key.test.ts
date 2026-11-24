// The build-time extension key: only a public key is taken, from the environment or a file, and a build with neither has
// none.
import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { extensionIdFromKey, extensionKeyFrom, normalizeExtensionKey } from '../manifest-key';

const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicDer = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const publicPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const privatePem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const none = () => {
  throw new Error('no file expected');
};

describe('normalizeExtensionKey', () => {
  it('takes the base64 body, with or without PEM lines and line breaks', () => {
    expect(normalizeExtensionKey(publicDer)).toBe(publicDer);
    expect(normalizeExtensionKey(publicPem)).toBe(publicDer);
    expect(normalizeExtensionKey(`${publicDer}\n`)).toBe(publicDer);
  });

  it('refuses a private key, and its message does not quote it', () => {
    let message = '';
    try {
      normalizeExtensionKey(privatePem);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/PUBLIC key/);
    expect(message).not.toContain(privatePem.split('\n')[1]);
  });

  it('refuses text that is not a key', () => {
    expect(() => normalizeExtensionKey('hello')).toThrow(/not a base64 public key/);
    expect(() => normalizeExtensionKey('not base64 !!! '.repeat(30))).toThrow(/not a base64 public key/);
  });
});

describe('extensionKeyFrom', () => {
  it('is undefined for a build with no key option: the public build', () => {
    expect(extensionKeyFrom({}, none)).toBeUndefined();
    expect(extensionKeyFrom({ KERA_EXTENSION_KEY: '  ', KERA_EXTENSION_KEY_FILE: '' }, none)).toBeUndefined();
  });

  it('reads the key from the variable or from a file', () => {
    expect(extensionKeyFrom({ KERA_EXTENSION_KEY: publicDer }, none)).toBe(publicDer);
    expect(
      extensionKeyFrom({ KERA_EXTENSION_KEY_FILE: '/keys/pub.pem' }, path =>
        path === '/keys/pub.pem' ? publicPem : '',
      ),
    ).toBe(publicDer);
  });

  it('refuses both at once, and a file holding a private key', () => {
    expect(() => extensionKeyFrom({ KERA_EXTENSION_KEY: publicDer, KERA_EXTENSION_KEY_FILE: '/x' }, none)).toThrow(
      /not both/,
    );
    expect(() => extensionKeyFrom({ KERA_EXTENSION_KEY_FILE: '/x' }, () => privatePem)).toThrow(/PUBLIC key/);
  });
});

describe('extensionIdFromKey', () => {
  it('is 32 letters a to p, the same for the same key and different for another', () => {
    const id = extensionIdFromKey(publicDer);
    expect(id).toMatch(/^[a-p]{32}$/);
    expect(extensionIdFromKey(publicDer)).toBe(id);
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'der' });
    expect(extensionIdFromKey(other.toString('base64'))).not.toBe(id);
  });
});
