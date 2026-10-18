// Links out of the extension: Kera itself, and the Kera Browser repository for help. No tracking parameters.

/** Kera's own page, or the repository's README (`/docs`) for help; `place` names the link's spot, kept for upstream. */
export const websiteUrl = (path: '/' | '/docs', _place: 'side-panel' | 'settings' | 'about') =>
  path === '/docs' ? 'https://github.com/cdmx-in/kera-browser#readme' : 'https://kera.cdmx.io';
