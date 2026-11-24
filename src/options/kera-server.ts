// Connecting to a Kera server from the welcome page and from Settings: the address is checked, Chrome is asked for that
// one origin, the server is asked who it is, and the key is tried by listing the models with it. Nothing is stored
// here; the caller stores the address with the provider once this succeeds.
import { useEffect, useState } from 'react';
import { listModels, probeKeraServer, parseKeraAddress } from '@src/llm';
import type { AddressProblem, ModelList } from '@src/llm';
import { BUILD_DEFAULT_ADDRESS, resolveKeraAddress } from '@src/llm/kera';
import { providersStorage } from '@src/store/settings';
import { hasServerPermission, releaseServerPermission, requestServerPermission } from '@src/ui/server-permission';

/** Why a connection failed; `kera.problem.<name>` in the catalogues says it in words. */
export type ConnectProblem = 'address' | 'permission' | 'unreachable' | 'not-kera' | 'key' | 'other';

export type ConnectResult =
  | {
      ok: true;
      address: string;
      version: string;
      /** Absent when no key was given: only the server was tried. */ list?: ModelList;
    }
  | { ok: false; problem: ConnectProblem; address?: string; addressProblem?: AddressProblem; detail?: string };

export interface ConnectDeps {
  request: (address: string) => Promise<boolean>;
  /** Gives the origin back after a try that found no Kera server there. */
  release: (address: string) => Promise<void>;
  fetch: typeof fetch;
}

const REAL: ConnectDeps = {
  request: requestServerPermission,
  // Kept only for a server that is saved (or is the build's default): a wrong address leaves nothing behind.
  release: async address => {
    const saved = (await providersStorage.get()).filter(p => p.kind === 'kera').map(p => resolveKeraAddress(p.baseUrl));
    await releaseServerPermission(
      address,
      [...saved, BUILD_DEFAULT_ADDRESS].filter((a): a is string => !!a),
    );
  },
  fetch: (...args) => fetch(...args),
};

/**
 * Tries a server address (and a key, when there is one). Call it first thing in a click handler: the permission request
 * is made before the first `await`, as Chrome requires. Stops at the first problem. An origin where no Kera server answered
 * is given back, so the extension holds a permission only for a server the user actually uses.
 */
export async function connectToServer(input: string, apiKey: string, deps: ConnectDeps = REAL): Promise<ConnectResult> {
  const parsed = parseKeraAddress(input);
  if (!parsed.ok) return { ok: false, problem: 'address', addressProblem: parsed.problem };
  const { address } = parsed;
  if (!(await deps.request(address))) return { ok: false, problem: 'permission', address };
  const probe = await probeKeraServer(address, deps.fetch);
  if (!probe.ok) {
    await deps.release(address);
    return { ok: false, problem: probe.problem, address };
  }
  if (!apiKey.trim()) return { ok: true, address, version: probe.version };
  try {
    const list = await listModels({ kind: 'kera', apiKey: apiKey.trim(), baseUrl: address }, deps.fetch);
    return { ok: true, address, version: probe.version, list };
  } catch (error) {
    const e = error as Error & { status?: number };
    // The server answered a moment ago: a refusal is the key's, anything else is reported as the server said it.
    if (e.status === 401 || e.status === 403) return { ok: false, problem: 'key', address };
    if (e.status === undefined) return { ok: false, problem: 'unreachable', address };
    return { ok: false, problem: 'other', address, detail: e.message };
  }
}

/** Whether Kera Browser may reach the address now, kept current as the user allows or removes it. null until read. */
export function useServerPermission(address: string | undefined): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!address) return setAllowed(null);
    let live = true;
    const read = () => void hasServerPermission(address).then(ok => live && setAllowed(ok));
    read();
    chrome.permissions.onAdded.addListener(read);
    chrome.permissions.onRemoved.addListener(read);
    return () => {
      live = false;
      chrome.permissions.onAdded.removeListener(read);
      chrome.permissions.onRemoved.removeListener(read);
    };
  }, [address]);
  return allowed;
}
