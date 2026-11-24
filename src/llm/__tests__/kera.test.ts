// Kera's server address: what is accepted and how it is normalised, which address a provider uses, and the check that
// a server is a Kera server.
import { describe, expect, it, vi } from 'vitest';
import {
  isLoopback,
  isPlainHttp,
  keraApiBase,
  originPattern,
  parseKeraAddress,
  probeKeraServer,
  resolveKeraAddress,
} from '../kera';

const address = (input: string) => {
  const r = parseKeraAddress(input);
  return r.ok ? r.address : r.problem;
};

describe('parseKeraAddress', () => {
  it('accepts an origin and returns it normalised', () => {
    expect(address('https://kera.example.com')).toBe('https://kera.example.com');
    expect(address('  https://kera.example.com/  ')).toBe('https://kera.example.com');
    expect(address('HTTPS://Kera.Example.COM')).toBe('https://kera.example.com');
    expect(address('http://localhost:8080')).toBe('http://localhost:8080');
    expect(address('http://127.0.0.1:3030/')).toBe('http://127.0.0.1:3030');
    expect(address('http://192.168.1.20:8080')).toBe('http://192.168.1.20:8080');
    expect(address('http://[::1]:8080')).toBe('http://[::1]:8080');
    expect(address('https://kera.example.com:443')).toBe('https://kera.example.com');
  });

  it('accepts one /api after the host and drops it', () => {
    expect(address('https://kera.example.com/api')).toBe('https://kera.example.com');
    expect(address('https://kera.example.com/api/')).toBe('https://kera.example.com');
    expect(address('http://localhost:8080/API')).toBe('http://localhost:8080');
  });

  it('requires http:// or https://', () => {
    expect(address('kera.example.com')).toBe('scheme');
    expect(address('localhost:8080')).toBe('scheme');
    expect(address('//kera.example.com')).toBe('scheme');
    expect(address('ftp://kera.example.com')).toBe('scheme');
    expect(address('chrome-extension://abc/')).toBe('scheme');
  });

  it('refuses nothing, a bad host, a path, a query and credentials', () => {
    expect(address('')).toBe('empty');
    expect(address('   ')).toBe('empty');
    expect(address('https://')).toBe('invalid');
    expect(address('https://exa mple.com')).toBe('invalid');
    expect(address('https://kera.example.com/chat')).toBe('path');
    expect(address('https://kera.example.com/kera')).toBe('path');
    expect(address('https://kera.example.com/api/v1')).toBe('path');
    expect(address('https://kera.example.com/?a=1')).toBe('path');
    expect(address('https://kera.example.com/#top')).toBe('path');
    expect(address('https://me:secret@kera.example.com')).toBe('credentials');
    expect(address('https://token@kera.example.com')).toBe('credentials');
  });
});

describe('address helpers', () => {
  it('derives the API base and the permission pattern from the address', () => {
    expect(keraApiBase('https://kera.example.com')).toBe('https://kera.example.com/api');
    expect(originPattern('http://localhost:8080')).toBe('http://localhost:8080/*');
  });

  it('knows plain http and loopback', () => {
    expect(isPlainHttp('http://192.168.1.20')).toBe(true);
    expect(isPlainHttp('https://kera.example.com')).toBe(false);
    for (const a of ['http://localhost:8080', 'http://127.0.0.1:3030', 'http://[::1]:8080', 'http://kera.localhost']) {
      expect(isLoopback(a)).toBe(true);
    }
    for (const a of [
      'http://192.168.1.20',
      'http://10.0.0.5:8080',
      'https://kera.example.com',
      'http://127.0.0.1.evil.com',
    ]) {
      expect(isLoopback(a)).toBe(false);
    }
  });
});

describe('resolveKeraAddress: stored address, then the build default, then none', () => {
  it('prefers the stored address', () => {
    expect(resolveKeraAddress('https://mine.example.com', 'https://kera.cdmx.io')).toBe('https://mine.example.com');
    expect(resolveKeraAddress('https://mine.example.com', '')).toBe('https://mine.example.com');
  });

  it('falls back to the build default when nothing usable is stored', () => {
    expect(resolveKeraAddress(undefined, 'https://kera.cdmx.io')).toBe('https://kera.cdmx.io');
    expect(resolveKeraAddress('', 'https://kera.cdmx.io')).toBe('https://kera.cdmx.io');
    expect(resolveKeraAddress('   ', 'https://kera.cdmx.io')).toBe('https://kera.cdmx.io');
  });

  it('is undefined with neither (the public build, nothing entered yet)', () => {
    expect(resolveKeraAddress(undefined, '')).toBeUndefined();
    expect(resolveKeraAddress('', '')).toBeUndefined();
  });
});

describe('probeKeraServer', () => {
  const answer = (status: number, body: unknown) =>
    vi.fn(
      async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    ) as unknown as typeof fetch;

  it('asks GET /api/version without a key and reads the version', async () => {
    const fetchFn = answer(200, { version: '1.1.0' });
    expect(await probeKeraServer('https://kera.example.com', fetchFn)).toEqual({ ok: true, version: '1.1.0' });
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://kera.example.com/api/version');
    expect(init.headers).toBeUndefined();
  });

  it('says unreachable when the request fails or a gateway has nothing behind it', async () => {
    const refused = vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch;
    expect(await probeKeraServer('http://localhost:1', refused)).toEqual({ ok: false, problem: 'unreachable' });
    for (const status of [502, 503, 504]) {
      expect(await probeKeraServer('https://x.example.com', answer(status, 'bad gateway'))).toEqual({
        ok: false,
        problem: 'unreachable',
      });
    }
  });

  it('says not-kera for any other answer: a 404, a web page, JSON without a version', async () => {
    expect(await probeKeraServer('https://x.example.com', answer(404, 'nope'))).toEqual({
      ok: false,
      problem: 'not-kera',
    });
    expect(await probeKeraServer('https://x.example.com', answer(200, '<html>hi</html>'))).toEqual({
      ok: false,
      problem: 'not-kera',
    });
    expect(await probeKeraServer('https://x.example.com', answer(200, { ok: true }))).toEqual({
      ok: false,
      problem: 'not-kera',
    });
  });
});
