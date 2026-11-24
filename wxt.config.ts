import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { parseKeraAddress } from './src/llm/kera';
import { extensionIdFromKey, extensionKeyFrom } from './src/ui/manifest-key';
import { hostLists, permissionLists } from './src/ui/manifest-permissions';

// The autorun build (fixtures/autorun.mjs) keeps the optional permissions required, unless it is asked to build with the
// product's lists (WXT_PRODUCT_PERMISSIONS), to check the features without them.
const autorun = !!process.env.WXT_AUTORUN_URL;
const productPermissions = !autorun || !!process.env.WXT_PRODUCT_PERMISSIONS;

// Two build-time options make a build for one organisation; with neither (the public build) the extension asks the user
// for their Kera server and carries no extension ID of its own. docs/company-build.md has the company's command.
//   KERA_DEFAULT_URL          the server address the build starts with, e.g. https://kera.example.com. The address field is
//                             pre-filled, an install with no stored address uses it, and the build keeps `<all_urls>`.
//   KERA_EXTENSION_KEY[_FILE] the PUBLIC key that pins the extension ID (the key itself, or a file with it).
const parsedDefault = process.env.KERA_DEFAULT_URL?.trim() ? parseKeraAddress(process.env.KERA_DEFAULT_URL) : null;
if (parsedDefault && !parsedDefault.ok) {
  throw new Error(`KERA_DEFAULT_URL is not a server address (${parsedDefault.problem}); use https://host[:port]`);
}
const defaultAddress = parsedDefault?.ok ? parsedDefault.address : '';
const extensionKey = extensionKeyFrom(
  { KERA_EXTENSION_KEY: process.env.KERA_EXTENSION_KEY, KERA_EXTENSION_KEY_FILE: process.env.KERA_EXTENSION_KEY_FILE },
  path => readFileSync(path, 'utf8'),
);
// So whoever builds can check the ID is the one they expect.
if (extensionKey) console.info(`[kera] manifest key set; extension ID ${extensionIdFromKey(extensionKey)}`);

export default defineConfig({
  imports: false,
  // Unattended development builds (fixtures/autorun.mjs) go elsewhere, so dist/ stays a normal build.
  outDir: !autorun ? 'dist' : productPermissions ? '.output/autorun-product' : '.output/autorun',
  outDirTemplate: '',
  alias: {
    '@src': 'src',
  },
  manifest: {
    // The public half of a signing key, only when the build is given one (KERA_EXTENSION_KEY): it fixes the extension ID
    // wherever the unpacked folder sits, so chrome.storage (Kera key, settings) and the conversations survive an update.
    // Changing or removing it changes the ID and empties every user's settings. The public build has none, and the Chrome
    // Web Store assigns its own key to an upload, so a modified build never carries someone else's ID.
    ...(extensionKey ? { key: extensionKey } : {}),
    // The name, description and the strings Chrome shows itself follow Chrome's language (public/_locales).
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    minimum_chrome_version: '125',
    ...hostLists(!!defaultAddress || autorun),
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
    // A build with a default address has the address's host in its name, so it never overwrites the public zip.
    artifactTemplate: `../dist-zip/{{name}}-{{version}}${defaultAddress ? `-${new URL(defaultAddress).hostname}` : ''}.zip`,
    exclude: ['**/*.map'],
  },
  hooks: {
    'zip:extension:start': () => mkdir('dist-zip', { recursive: true }).then(() => {}),
    // The page mark (entrypoints/kera-mark.content.ts) is for the one server a build is made for; the public build has none.
    'entrypoints:found': (_wxt, infos) => {
      if (defaultAddress) return;
      const at = infos.findIndex(info => info.name === 'kera-mark');
      if (at >= 0) infos.splice(at, 1);
    },
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
    // The build's default Kera address, read by src/llm/kera.ts ('' for the public build).
    define: { __KERA_DEFAULT_URL__: JSON.stringify(defaultAddress) },
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
