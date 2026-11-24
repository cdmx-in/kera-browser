// The Chrome permission for one Kera server. The public build declares `http://*/*` and `https://*/*` as optional host
// permissions and never holds any at install: the user is asked, from a click, for the one origin they entered, and that
// grant is all Kera Browser has for it. A build with a default address holds `<all_urls>` instead, which already covers
// every origin here, so each call below answers yes without a dialog (and a removal of it is refused by Chrome, which is
// ignored).
import { originPattern } from '@src/llm/kera';

/** Whether Kera Browser may reach the server now. */
export async function hasServerPermission(address: string): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: [originPattern(address)] });
  } catch {
    return false;
  }
}

/**
 * Asks Chrome for the server's origin in one dialog. Call it first thing in a click handler, with no `await` before it:
 * Chrome accepts the request only while the click lasts. Resolves to whether the origin is allowed; a refusal by the
 * user or by Chrome resolves to false. Already allowed resolves to true with no dialog.
 */
export function requestServerPermission(address: string): Promise<boolean> {
  try {
    return chrome.permissions.request({ origins: [originPattern(address)] }).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

/**
 * Drops the permission for a server the user left, unless another Kera provider or the build's default still uses it.
 * A permission Chrome will not remove (the manifest's) stays; nothing is reported.
 */
export async function releaseServerPermission(address: string, stillUsed: readonly string[]): Promise<void> {
  if (stillUsed.includes(address)) return;
  try {
    await chrome.permissions.remove({ origins: [originPattern(address)] });
  } catch {
    // Required permissions cannot be removed.
  }
}
