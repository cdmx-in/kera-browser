// Kera, the self-hosted team chat (https://github.com/cdmx-in/kera), is Kera Browser's one provider. A user adds the
// address of their own Kera server and an API key from it (in Kera: Settings → Account → API keys). Requests go to
// Kera's OpenAI-compatible endpoint under `<address>/api`, which resolves the model with the key owner's access.
//
// This file is pure: no Chrome, no storage. The address a provider stores is the server's address (`origin` only, see
// `parseKeraAddress`); the API base is derived from it.

/** The model the welcome page picks first when the key sees it; otherwise it takes the first one listed. */
export const KERA_DEFAULT_MODEL = 'gpt-6-luna';

/** Set by the build (`KERA_DEFAULT_URL`, see wxt.config.ts); undefined under Vitest. */
declare const __KERA_DEFAULT_URL__: string | undefined;

/**
 * The server address a build was made for, or ''. A build for one organisation sets it so its users enter nothing; the
 * public build has none and the address field starts empty.
 */
export const BUILD_DEFAULT_ADDRESS: string = typeof __KERA_DEFAULT_URL__ === 'string' ? __KERA_DEFAULT_URL__ : '';

/** Why an address was refused; the page turns each into a sentence. */
export type AddressProblem =
  | 'empty'
  /** No `http://` or `https://` in front. */
  | 'scheme'
  | 'invalid'
  /** A path other than `/api`, a query or a fragment. */
  | 'path'
  /** A user name or password in the address. */
  | 'credentials';

export type ParsedAddress = { ok: true; address: string } | { ok: false; problem: AddressProblem };

/**
 * Checks and normalises what the user typed: `http://` or `https://` is required, a trailing slash and an optional
 * `/api` are dropped, and nothing else may follow the host and port. The result is the origin, lower-cased, without a
 * default port: `https://kera.example.com`, `http://localhost:8080`.
 */
export function parseKeraAddress(input: string): ParsedAddress {
  const text = input.trim();
  if (!text) return { ok: false, problem: 'empty' };
  // `localhost:8080` parses as a URL with the scheme `localhost:`, so the scheme is checked on the text.
  if (!/^https?:\/\//i.test(text)) return { ok: false, problem: 'scheme' };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, problem: 'invalid' };
  }
  if (!url.hostname) return { ok: false, problem: 'invalid' };
  if (url.username || url.password) return { ok: false, problem: 'credentials' };
  if (url.search || url.hash) return { ok: false, problem: 'path' };
  const path = url.pathname.replace(/\/+$/, '').toLowerCase();
  if (path !== '' && path !== '/api') return { ok: false, problem: 'path' };
  return { ok: true, address: url.origin };
}

/** The OpenAI-compatible base of a normalised address. */
export function keraApiBase(address: string): string {
  return `${address}/api`;
}

/**
 * The address a provider talks to: the one stored with it, else the build's default, else none. A provider saved by an
 * older version has no address and keeps working on a build that has a default.
 */
export function resolveKeraAddress(stored?: string, buildDefault: string = BUILD_DEFAULT_ADDRESS): string | undefined {
  const own = stored?.trim();
  if (own) return own;
  return buildDefault || undefined;
}

/** The Chrome match pattern for one server: `https://kera.example.com/*`. */
export function originPattern(address: string): string {
  return `${address}/*`;
}

/** Plain http: the key and the page text cross the network unencrypted. */
export function isPlainHttp(address: string): boolean {
  return address.startsWith('http://');
}

/** `localhost` or a loopback address: the server is on this computer, so plain http crosses no network. */
export function isLoopback(address: string): boolean {
  const host = new URL(address).hostname.replace(/^\[|\]$/g, '');
  return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127(\.\d{1,3}){3}$/.test(host);
}

/** What `probeKeraServer` found. */
export type ServerProbe = { ok: true; version: string } | { ok: false; problem: 'unreachable' | 'not-kera' };

/**
 * Asks a server who it is: Kera answers `GET /api/version` without a key with `{ "version": "…" }` (Open WebUI, whose API
 * Kera follows, does too). No answer in time, or a gateway error, is `unreachable`; an answer that is not that is
 * `not-kera`, which is what a wrong port, a wrong path or some other web server gives.
 */
export async function probeKeraServer(
  address: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<ServerProbe> {
  let response: Response;
  try {
    response = await fetchFn(`${keraApiBase(address)}/version`, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return { ok: false, problem: 'unreachable' };
  }
  if (response.status >= 502 && response.status <= 504) return { ok: false, problem: 'unreachable' };
  const body = (await response.json().catch(() => null)) as { version?: unknown } | null;
  return response.ok && typeof body?.version === 'string'
    ? { ok: true, version: body.version }
    : { ok: false, problem: 'not-kera' };
}
