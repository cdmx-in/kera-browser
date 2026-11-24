// An install of 1.3.5: a Kera provider and its key in storage, and no server address anywhere, because that version had
// one fixed address. After the update the company's build (default address set at build time) must keep sending to that
// address with the stored key and no re-setup; the public build, which has no default, must send nothing anywhere.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PROVIDER_ID = 'p-kera';
/** What 1.3.5 stored: the provider has no `baseUrl`, the key sits under its id. */
const STORED_1_3_5 = {
  'nb.providers': [
    {
      id: PROVIDER_ID,
      kind: 'kera',
      name: 'Kera',
      models: [{ name: 'gpt-6-luna', tested: { reasons: true, at: '2026-11-20' } }],
    },
  ],
  'nb.keys': { [PROVIDER_ID]: 'sk-stored-by-1.3.5' },
  'nb.settings': { defaultModel: { providerId: PROVIDER_ID, model: 'gpt-6-luna' }, onboarded: true },
};
const PAIR = { model: { providerId: PROVIDER_ID, model: 'gpt-6-luna' }, reasoning: 'medium' as const };

function installChrome(stored: Record<string, unknown>, granted: (origin: string) => boolean) {
  const area = {
    get: vi.fn(async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter(k => k in stored).map(k => [k, stored[k]]));
    }),
    set: vi.fn(async (items: Record<string, unknown>) => void Object.assign(stored, items)),
    onChanged: { addListener: () => undefined },
  };
  vi.stubGlobal('chrome', {
    storage: { local: area, session: area },
    permissions: {
      contains: vi.fn(async (q: { origins: string[] }) => q.origins.every(granted)),
      request: vi.fn(async () => true),
    },
  });
}

/** The modules read the build's default when they load, as the bundler's define sets it: stub it, then import fresh. */
async function loadBuild(defaultUrl: string) {
  vi.resetModules();
  vi.stubGlobal('__KERA_DEFAULT_URL__', defaultUrl);
  const models = await import('../models');
  const llm = await import('@src/llm');
  return { ...models, ...llm };
}

/** What a run sends: the request the model makes when asked one question. */
async function firstRequest(build: Awaited<ReturnType<typeof loadBuild>>) {
  const sent: Array<{ url: string; authorization: string | null }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      sent.push({ url: String(input), authorization: new Headers(init?.headers).get('authorization') });
      return new Response('{"error":{"message":"stop"}}', {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  const resolved = await build.resolveModel(PAIR);
  await build.streamTurn({
    chat: resolved.chat,
    system: 's',
    messages: [{ role: 'user', content: 'hi' }],
    tools: {},
    retry: { attempts: 1, baseMs: 0, maxMs: 0 },
  });
  return sent;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('update from 1.3.5', () => {
  it('the company build keeps sending to its default address with the stored key, no re-setup', async () => {
    installChrome({ ...STORED_1_3_5 }, () => true);
    const build = await loadBuild('https://kera.cdmx.io');
    expect(await firstRequest(build)).toEqual([
      { url: 'https://kera.cdmx.io/api/chat/completions', authorization: 'Bearer sk-stored-by-1.3.5' },
    ]);
  });

  it('the company build needs no new permission: the host access 1.3.5 already had answers yes', async () => {
    // <all_urls> in the manifest: every origin is granted. Nothing was requested by the update.
    installChrome({ ...STORED_1_3_5 }, origin => origin === 'https://kera.cdmx.io/*');
    const build = await loadBuild('https://kera.cdmx.io');
    await expect(build.resolveModel(PAIR)).resolves.toMatchObject({ ref: PAIR.model });
    expect(chrome.permissions.request).not.toHaveBeenCalled();
  });

  it('an address stored later wins over the build default', async () => {
    const stored = structuredClone(STORED_1_3_5) as typeof STORED_1_3_5 & {
      'nb.providers': Array<{ baseUrl?: string }>;
    };
    stored['nb.providers'][0].baseUrl = 'https://mine.example.com';
    installChrome(stored, () => true);
    const build = await loadBuild('https://kera.cdmx.io');
    expect((await firstRequest(build))[0].url).toBe('https://mine.example.com/api/chat/completions');
  });

  it('the public build, with nothing stored and no default, refuses to run and sends nothing', async () => {
    installChrome({ ...STORED_1_3_5 }, () => true);
    const build = await loadBuild('');
    vi.stubGlobal('fetch', vi.fn());
    await expect(build.resolveModel(PAIR)).rejects.toThrow('Enter your Kera server address first');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a permission the user removed later is reported in words, and nothing is sent', async () => {
    installChrome({ ...STORED_1_3_5 }, () => false);
    const build = await loadBuild('https://kera.cdmx.io');
    vi.stubGlobal('fetch', vi.fn());
    await expect(build.resolveModel(PAIR)).rejects.toThrow(
      'Kera Browser no longer has permission to reach https://kera.cdmx.io. Open Settings → Providers and press Allow access.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
