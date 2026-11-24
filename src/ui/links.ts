// Links out of the extension: the user's Kera server, the Kera project, and the Kera Browser repository for help. No
// tracking parameters.

/** The project that makes Kera. */
export const KERA_PROJECT_URL = 'https://github.com/cdmx-in/kera';

/**
 * The user's own Kera server when one is configured (`serverAddress`), else the Kera project; or the README (`/docs`)
 * for help. `place` names the link's spot, kept for upstream.
 */
export const websiteUrl = (path: '/' | '/docs', _place: 'side-panel' | 'settings' | 'about', serverAddress?: string) =>
  path === '/docs' ? 'https://github.com/cdmx-in/kera-browser#readme' : (serverAddress ?? KERA_PROJECT_URL);
