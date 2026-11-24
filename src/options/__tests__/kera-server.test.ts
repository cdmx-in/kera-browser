// Connecting to a server from the welcome page and Settings: the order of the steps, and what each failure is called.
import { describe, expect, it, vi } from 'vitest';
import { connectToServer } from '../kera-server';
import type { ConnectDeps } from '../kera-server';

/** A server that answers the way Kera does, with `key` the only key it accepts. */
function server(options: { version?: boolean; key?: string; models?: string[]; status?: number } = {}) {
  const calls: string[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`GET ${url}`);
    if (options.status) return new Response('x', { status: options.status });
    if (url.endsWith('/api/version')) {
      return options.version === false ? new Response('<html></html>') : Response.json({ version: '1.1.0' });
    }
    if (url.endsWith('/api/models')) {
      const auth = new Headers(init?.headers).get('authorization');
      if (auth !== `Bearer ${options.key}`)
        return Response.json({ error: { message: 'Unauthorized' } }, { status: 401 });
      return Response.json({ data: (options.models ?? ['gpt-6-luna']).map(id => ({ id })) });
    }
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

function deps(over: Partial<ConnectDeps> & { fetchFn?: typeof fetch } = {}): ConnectDeps & { order: string[] } {
  const order: string[] = [];
  const base = over.fetchFn ?? server({ key: 'sk-ok' }).fetchFn;
  return {
    order,
    request: over.request ?? (async origin => (order.push(`request ${origin}`), true)),
    release: over.release ?? (async origin => void order.push(`release ${origin}`)),
    fetch: ((...args: Parameters<typeof fetch>) => (order.push('fetch'), base(...args))) as typeof fetch,
  };
}

describe('connectToServer', () => {
  it('asks for the permission first, then the server, then the key, and returns the models', async () => {
    const d = deps();
    const r = await connectToServer(' https://kera.example.com/api/ ', 'sk-ok', d);
    expect(r).toEqual({
      ok: true,
      address: 'https://kera.example.com',
      version: '1.1.0',
      list: { models: ['gpt-6-luna'], hidden: [] },
    });
    expect(d.order).toEqual(['request https://kera.example.com', 'fetch', 'fetch']);
  });

  it('makes the permission request before its first await, so the click still counts', () => {
    const request = vi.fn(async () => true);
    void connectToServer('https://kera.example.com', 'sk-ok', {
      request,
      release: async () => undefined,
      fetch: server({ key: 'sk-ok' }).fetchFn,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('refuses a bad address without asking Chrome or the network', async () => {
    const request = vi.fn(async () => true);
    const s = server();
    const r = await connectToServer('kera.example.com', 'k', {
      request,
      release: async () => undefined,
      fetch: s.fetchFn,
    });
    expect(r).toEqual({ ok: false, problem: 'address', addressProblem: 'scheme' });
    expect(request).not.toHaveBeenCalled();
    expect(s.calls).toEqual([]);
  });

  it('stops at a refused permission and sends nothing to the server', async () => {
    const s = server();
    const r = await connectToServer('https://kera.example.com', 'k', {
      request: async () => false,
      release: async () => undefined,
      fetch: s.fetchFn,
    });
    expect(r).toEqual({ ok: false, problem: 'permission', address: 'https://kera.example.com' });
    expect(s.calls).toEqual([]);
  });

  it('reports a server that cannot be reached, and gives the permission back', async () => {
    const down = vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch;
    const d = deps({ fetchFn: down });
    expect(await connectToServer('http://localhost:9', 'k', d)).toMatchObject({ ok: false, problem: 'unreachable' });
    expect(d.order).toEqual(['request http://localhost:9', 'fetch', 'release http://localhost:9']);
  });

  it('reports a server that is not Kera, gives the permission back and never sends it the key', async () => {
    const s = server({ version: false, key: 'sk-ok' });
    const d = deps({ fetchFn: s.fetchFn });
    const r = await connectToServer('https://example.com', 'sk-ok', d);
    expect(r).toMatchObject({ ok: false, problem: 'not-kera' });
    expect(d.order).toContain('release https://example.com');
    expect(s.calls).toEqual(['GET https://example.com/api/version']);
  });

  it('reports a key the server refuses', async () => {
    const r = await connectToServer(
      'https://kera.example.com',
      'sk-wrong',
      deps({ fetchFn: server({ key: 'sk-ok' }).fetchFn }),
    );
    expect(r).toMatchObject({ ok: false, problem: 'key', address: 'https://kera.example.com' });
  });

  it("reports any other refusal with the server's words", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/version')
        ? Response.json({ version: '1' })
        : Response.json({ error: { message: 'Rate limited' } }, { status: 429 }),
    ) as unknown as typeof fetch;
    const r = await connectToServer('https://kera.example.com', 'k', deps({ fetchFn }));
    expect(r).toMatchObject({ ok: false, problem: 'other', detail: '429 Rate limited' });
  });

  it('with no key, tries only the server (Settings, before a key is saved)', async () => {
    const s = server();
    const r = await connectToServer('http://192.168.1.20:8080', '  ', deps({ fetchFn: s.fetchFn }));
    expect(r).toEqual({ ok: true, address: 'http://192.168.1.20:8080', version: '1.1.0' });
    expect(s.calls).toEqual(['GET http://192.168.1.20:8080/api/version']);
  });
});
