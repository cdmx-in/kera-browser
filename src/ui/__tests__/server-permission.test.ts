// The permission for the Kera server's origin: asked for exactly that origin, never broader, and every refusal or error
// is a plain "no".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasServerPermission, releaseServerPermission, requestServerPermission } from '../server-permission';

function stubPermissions(permissions: Record<string, unknown>) {
  vi.stubGlobal('chrome', { permissions });
  return permissions as Record<string, ReturnType<typeof vi.fn>>;
}

afterEach(() => vi.unstubAllGlobals());

describe('requestServerPermission', () => {
  it('asks Chrome for exactly the one origin, as a pattern', async () => {
    const p = stubPermissions({ request: vi.fn(async () => true) });
    expect(await requestServerPermission('https://kera.example.com')).toBe(true);
    expect(p.request).toHaveBeenCalledOnce();
    expect(p.request).toHaveBeenCalledWith({ origins: ['https://kera.example.com/*'] });
    await requestServerPermission('http://192.168.1.20:8080');
    expect(p.request).toHaveBeenLastCalledWith({ origins: ['http://192.168.1.20:8080/*'] });
  });

  it('is false when the user says no', async () => {
    stubPermissions({ request: vi.fn(async () => false) });
    expect(await requestServerPermission('https://kera.example.com')).toBe(false);
  });

  it('is false when Chrome refuses the request (no user gesture, an origin the manifest does not allow)', async () => {
    stubPermissions({
      request: vi.fn(async () => Promise.reject(new Error('This function must be called during a user gesture'))),
    });
    expect(await requestServerPermission('https://kera.example.com')).toBe(false);
    stubPermissions({
      request: vi.fn(() => {
        throw new Error('Permissions request failed');
      }),
    });
    expect(await requestServerPermission('https://kera.example.com')).toBe(false);
  });
});

describe('hasServerPermission', () => {
  it('asks about the same origin pattern, and a failure is no', async () => {
    const p = stubPermissions({ contains: vi.fn(async () => true) });
    expect(await hasServerPermission('http://localhost:8080')).toBe(true);
    expect(p.contains).toHaveBeenCalledWith({ origins: ['http://localhost:8080/*'] });
    stubPermissions({ contains: vi.fn(async () => Promise.reject(new Error('x'))) });
    expect(await hasServerPermission('http://localhost:8080')).toBe(false);
  });

  it('is false once the user removed the permission', async () => {
    const granted = new Set(['https://kera.example.com/*']);
    stubPermissions({ contains: vi.fn(async (q: { origins: string[] }) => granted.has(q.origins[0])) });
    expect(await hasServerPermission('https://kera.example.com')).toBe(true);
    granted.clear();
    expect(await hasServerPermission('https://kera.example.com')).toBe(false);
  });
});

describe('releaseServerPermission: changing the address drops the old origin', () => {
  it('removes the old origin', async () => {
    const p = stubPermissions({ remove: vi.fn(async () => true) });
    await releaseServerPermission('https://old.example.com', ['https://new.example.com']);
    expect(p.remove).toHaveBeenCalledWith({ origins: ['https://old.example.com/*'] });
  });

  it('keeps it while another provider or the build default still uses it', async () => {
    const p = stubPermissions({ remove: vi.fn(async () => true) });
    await releaseServerPermission('https://old.example.com', ['https://old.example.com']);
    expect(p.remove).not.toHaveBeenCalled();
  });

  it('ignores a permission Chrome will not remove (the manifest requires it)', async () => {
    stubPermissions({ remove: vi.fn(async () => Promise.reject(new Error('You cannot remove required permissions'))) });
    await expect(releaseServerPermission('https://kera.cdmx.io', [])).resolves.toBeUndefined();
  });
});
