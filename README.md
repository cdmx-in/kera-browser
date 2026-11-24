# Kera Browser

Kera's AI agent in Chrome's side panel. It reads the page you are on, answers questions about it and carries out tasks on it (click, type, scroll, move between tabs), using a model that runs in **your own [Kera](https://github.com/cdmx-in/kera) server**. Page content, your messages and screenshots go to that server and nowhere else.

In twenty seconds: you run Kera (the self-hosted team chat) with `docker compose`; you install this extension; you give it your server's address and an API key from Kera; you press <kbd>Alt+Shift+K</kbd> on any tab and tell the agent what to do. It asks before it submits, sends, deletes or uploads anything.

This is a fork of [Nanobrowser](https://github.com/nanobrowser/nanobrowser) (Apache-2.0), with Kera as its one provider. The agent, the browser control through `chrome.debugger` and the per-site Ask / Allow / Block permissions are upstream's; we rebase on it. Licensed under the [Apache License 2.0](LICENSE).

## Install

Chrome or Edge, version 125 or later.

**From a release (no build needed)**

1. Download `kera-browser-<version>.zip` from the [latest release](https://github.com/cdmx-in/kera-browser/releases/latest) and unzip it into a folder you will keep, for example `~/kera-browser`.
2. Open `chrome://extensions`, turn on Developer mode (top right), click Load unpacked and pick that folder.
3. The welcome page opens. Pin Kera Browser to the toolbar if you like.

**From source**: see [For maintainers](#for-maintainers); load the `dist/` folder the same way.

## Connect it to your Kera

1. In Kera, open Settings → Account → API keys and create a key. Copy it.
2. On the welcome page (later: Settings → Providers), enter your **Kera server address**, paste the key and press Connect. The address is the one you open Kera at, for example `https://kera.example.com`, or `http://localhost:8080` for the default `docker compose` install on the same computer. A trailing slash or `/api` is fine; nothing else may follow the host and port.
3. Chrome asks whether Kera Browser may "read and change your data on" that address. Allow it: it is how the extension reaches your server.
4. Pick a model from the list and press "Test and use this model". The test checks that the model can call tools, which the agent needs.
5. Press <kbd>Alt+Shift+K</kbd> (or "Open the panel") on any tab and ask.

If something is wrong the page says which part: the address is not valid, Chrome did not give access, the server could not be reached, the address is not a Kera server, or Kera did not accept the key.

## Permissions, in plain words

- **At install** Kera Browser holds no access to any website. It does hold Chrome's `debugger` permission, which is how it operates a page: Chrome shows "Kera Browser started debugging this browser" above a tab the agent works on, only during a run you started, and Cancel ends the run.
- **At connect** it asks, once, for exactly the origin of your Kera server (`https://kera.example.com/*`), from your click. That is the only site it is ever allowed to call; "Kera Browser will talk to <your address>" is shown next to the field. A wrong address you tried leaves nothing behind.
- **If you change the address** in Settings → Providers, Chrome asks for the new one and the old one is dropped. If you remove the permission yourself in `chrome://extensions`, Settings shows "Allow access" and a run says why it cannot start.
- **Plain `http://` is allowed**, for a server on your computer or your own network. On `localhost` nothing crosses a network. Anywhere else your API key and the text of the pages you work on travel unencrypted, and the settings page says so; put Kera behind `https` if you can.
- A few more permissions (tab groups, notifications, saving files) are optional and asked only when you press Allow. Per-site Ask / Allow / Block rules are in Settings → Permissions. Keep Ask mode on for finance and HR portals; the agent then confirms before it submits, sends, deletes or uploads.
- The page border and the on-page cursor are scripts put into the page, which needs access to that page. A build made for one organisation (see below) holds that access from install; the public build does not, and the run works without them.

[PRIVACY.md](PRIVACY.md) says what is sent where and what is stored.

## Update

The extension does not update itself; install a newer zip over the same folder.

1. Unzip the new zip over the same folder, replacing the files.
2. In `chrome://extensions`, click the reload arrow on Kera Browser.

Keep using the same folder, at the same path, and never Remove the extension first: Remove deletes its API key, settings and conversations. A copy loaded unpacked gets its extension ID from the folder's path, so a copy loaded from another folder is a new extension with nothing stored (and no permission yet).

## What differs from upstream

- `src/llm/kera.ts`: Kera's server address (checked, normalised, resolved from the provider, then the build's default). `kera` is a provider kind whose API base is `<address>/api` (`src/llm/providers.ts`), and the catalogue knows Kera's `gpt-oss` runs with a 64k context.
- `src/options/KeraAddress.tsx`, `src/options/kera-server.ts`, `src/ui/server-permission.ts`: the address field, the connection test, and the Chrome permission for the one origin, asked at runtime (optional host permissions in the manifest).
- `src/options/ProvidersSection.tsx`: `ENABLED_KINDS = ['kera']` is the only switch; the other kinds' code stays so upstream rebases cleanly.
- A `run_javascript` tool (upstream reserved the `eval` capability but ships no tool): the agent can evaluate JavaScript in the page when the page's controls cannot do the job. Outside Auto mode every script waits for your approval on a card that shows the code, and a site's "Allow" rule does not cover scripts.
- No analytics switches, no uninstall survey, no rating card; `PRIVACY.md` says what leaves the browser.
- Build-time options (`KERA_DEFAULT_URL`, `KERA_EXTENSION_KEY`) so one organisation can ship a build that needs no setup. The public build has neither.
- Branding: name, icon, colours (`src/ui/index.css`), shortcut `Alt+Shift+K`.

## For maintainers

Node 24 LTS and pnpm 10 (pinned in `package.json`; `corepack enable` once, or call `corepack pnpm <script>`).

```sh
corepack enable && pnpm install --frozen-lockfile
pnpm dev                                  # watch build into dist/; load it unpacked at chrome://extensions
pnpm type-check && pnpm lint && pnpm test
pnpm build                                # the public build into dist/
pnpm zip                                  # dist-zip/kera-browser-<version>.zip: the file for a GitHub release
```

The public build (no environment variable) has no extension `key`, no default server, no required host access and no page-mark content script. Two variables make a build for one organisation:

| Variable                                   | Effect                                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KERA_DEFAULT_URL=https://kera.example.com` | The address field starts filled; an install with a key but no stored address uses it; the manifest keeps `<all_urls>` (as every release up to 1.3.5) and a page-mark content script for that origin; the zip is named `kera-browser-<version>-<host>.zip`. |
| `KERA_EXTENSION_KEY` or `KERA_EXTENSION_KEY_FILE` | The **public** half of a signing key: it fixes the extension ID. A private key is refused. Without it the build has no `key`, so a modified build uploaded to the Chrome Web Store never carries someone else's ID. |

Never set `VITE_POSTHOG_API_KEY` or `VITE_POSTHOG_HOST` for a release build: the analytics code inherited from upstream sends only when a build has them (see `.env.example`, `PRIVACY.md`).

The company's own build command is in [docs/company-build.md](docs/company-build.md). [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md) describe the code layout and the working rules. The browser checks (`pnpm autorun`) are run by hand before a release.

### Rebase on upstream

```sh
git fetch upstream && git rebase upstream/master
```

## For a team that distributes its own build

CodeMax, the maintainers' company, ships a build for its team with its server and its extension ID built in; see [docs/company-build.md](docs/company-build.md). If your organisation wants the same, build with `KERA_DEFAULT_URL` set to your server and, if you want an ID that survives moving the folder, `KERA_EXTENSION_KEY_FILE` pointing at your own **public** key (never reuse another project's).
