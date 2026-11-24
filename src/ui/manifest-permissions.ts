// The extension's Chrome permissions, for the build config, the worker, the pages and the checks.
//
// Four permissions are optional in the product: each adds an install warning the old Nanobrowser did not have, and
// Chrome turns an extension off after an update that adds a warning until the user accepts it. Each feature that uses
// one works with less until the user allows it with a click. The autorun build keeps the four required, so the checks
// that save files or group tabs run without a click.

/** Tab group titles and colours, notifications, saving files, and Open on a saved file. */
export const OPTIONAL_PERMISSIONS = [
  'tabGroups',
  'notifications',
  'downloads',
  'downloads.open',
] as const satisfies readonly chrome.runtime.ManifestOptionalPermission[];

export type OptionalPermission = (typeof OPTIONAL_PERMISSIONS)[number];

/** Always required. None of them adds a warning the old version did not have. */
export const REQUIRED_PERMISSIONS = [
  'debugger',
  'tabs',
  'sidePanel',
  'storage',
  'webNavigation',
  'unlimitedStorage',
  'alarms',
  'offscreen',
  'contextMenus',
  'scripting',
] as const satisfies readonly chrome.runtime.ManifestPermission[];

export interface PermissionLists {
  permissions: chrome.runtime.ManifestPermission[];
  optional_permissions: chrome.runtime.ManifestOptionalPermission[];
}

/** The manifest's two lists: the product asks for the four when the user allows them, the autorun build at install. */
export function permissionLists(build: 'product' | 'autorun'): PermissionLists {
  return build === 'product'
    ? { permissions: [...REQUIRED_PERMISSIONS], optional_permissions: [...OPTIONAL_PERMISSIONS] }
    : { permissions: [...REQUIRED_PERMISSIONS, ...OPTIONAL_PERMISSIONS], optional_permissions: [] };
}

export interface HostLists {
  host_permissions?: string[];
  optional_host_permissions?: string[];
}

/**
 * The manifest's host access. A build with a default server address (an organisation's own build) and the autorun build
 * keep `<all_urls>` required, as every release up to 1.3.5 did: the installed copies already hold it, so an update asks
 * nothing new, and the page border and pointer, which are scripts put into the pages, keep working. The public build
 * requires no host access; it may ask, from a click, for the one origin of the user's Kera server (any http or https
 * address, since a server may be on a private network), and the user decides.
 */
export function hostLists(broad: boolean): HostLists {
  return broad ? { host_permissions: ['<all_urls>'] } : { optional_host_permissions: ['http://*/*', 'https://*/*'] };
}
