import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { permissionLists } from './src/ui/manifest-permissions';

// The autorun build (fixtures/autorun.mjs) keeps the optional permissions required, unless it is asked to build with the
// product's lists (WXT_PRODUCT_PERMISSIONS), to check the features without them.
const autorun = !!process.env.WXT_AUTORUN_URL;
const productPermissions = !autorun || !!process.env.WXT_PRODUCT_PERMISSIONS;

export default defineConfig({
  imports: false,
  // Unattended development builds (fixtures/autorun.mjs) go elsewhere, so dist/ stays a normal build.
  outDir: !autorun ? 'dist' : productPermissions ? '.output/autorun-product' : '.output/autorun',
  outDirTemplate: '',
  alias: {
    '@src': 'src',
  },
  manifest: {
    // Public half of the signing key (private .pem kept off the repo): it fixes the extension ID at
    // niehiilifenimkkbiikekkfjhaaellah wherever the unpacked folder sits, so chrome.storage (Kera key, settings) and the
    // conversations survive an update. Changing or removing it changes the ID and empties every user's settings.
    // The Chrome Web Store assigns its own key: drop this line from a build uploaded there.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuHW2BZigh7zL/CRVJwLrx+uPEIm+rQXuhZqO4G2N3IWbnJke0hDRISQF1dUwi3kBLY6pQsNjipNAX2v8/414ndrF+5YFcMFFNH8L+pNeDuQe4v5SBc80mfs5SlApo6RK1Lyt4g8z5QB6fZuSSRA9ja88bmfa2Crrh/ma6iriCJq72IOOmseqS8XSj8Nj+4EiZlC0WIYih6i0GefiV4f3n4w8NPvd2Qg+sxNjVPNFhzdMsY25y3ZdShkVovXpNeZAvHFlxm0oN2kJMB/VeEoQ3OgmKD3w4uvSqCKQDhj1iq5LP+Ta76CfS6f1Xqzttz4foLT8q91TszbjiTzTP0PLIwIDAQAB',
    // The name, description and the strings Chrome shows itself follow Chrome's language (public/_locales).
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    minimum_chrome_version: '125',
    host_permissions: ['<all_urls>'],
    ...permissionLists(productPermissions ? 'product' : 'autorun'),
    action: { default_icon: 'icon-32.png', default_title: '__MSG_actionTitle__' },
    icons: { 128: 'icon-128.png' },
    commands: {
      'open-panel': { suggested_key: { default: 'Alt+Shift+K' }, description: '__MSG_commandOpenPanel__' },
      'open-test-panel': { description: 'Open the browser control test panel (developers)' },
    },
  },
  // `pnpm zip` packs dist/ into dist-zip/, outside the folder Chrome loads.
  zip: {
    artifactTemplate: '../dist-zip/{{name}}-{{version}}.zip',
    exclude: ['**/*.map'],
  },
  hooks: {
    'zip:extension:start': () => mkdir('dist-zip', { recursive: true }).then(() => {}),
    'config:resolved': wxt => {
      // WXT 0.21.4 still installs Unimport's Vite plugin with imports: false; clear its presets.
      wxt.config.imports.presets = [];
      wxt.config.imports.imports = [];
    },
    'build:manifestGenerated': (_wxt, manifest) => {
      if (manifest.background) (manifest.background as { type?: string }).type = 'module';
      // No panel by default: the worker enables it per tab with a path.
      delete (manifest as { side_panel?: unknown }).side_panel;
    },
  },
  vite: env => ({
    plugins: [react()],
    resolve: {
      alias: {
        // puppeteer-core 25 imports @puppeteer/browsers for the `channel` option, which is never used here.
        '@puppeteer/browsers': resolve(import.meta.dirname, 'src/browser-control/host/puppeteer-browsers-stub.ts'),
      },
      conditions: ['browser', 'module', 'import', 'default'],
      mainFields: ['browser', 'module', 'main'],
    },
    css: {
      postcss: {
        plugins: [tailwindcss({ config: resolve(import.meta.dirname, 'tailwind.config.ts') }), autoprefixer()],
      },
    },
    build: {
      sourcemap: env.mode === 'development',
      minify: env.mode === 'production',
    },
  }),
});
