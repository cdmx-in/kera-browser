# Kera Browser

Kera's AI agent in Chrome's side panel. It reads the page you are on, answers questions about it and carries out tasks on it (click, type, navigate, across tabs) with a model running in [Kera](https://kera.cdmx.io), CodeMax's own Open WebUI. Page content goes to Kera and nowhere else.

A fork of [Nanobrowser](https://github.com/nanobrowser/nanobrowser) (Apache-2.0) with Kera as its one provider and Kera's branding. The agent, the browser control through `chrome.debugger` and the per-site Ask / Allow / Block permissions are upstream's; we rebase on it.

## Install (team)

1. Install from the Chrome Web Store link shared in the team channel (the listing is unlisted), or load a release zip unpacked: download `kera-browser-<version>.zip` from the [latest release](https://github.com/cdmx-in/kera-browser/releases/latest) and unzip it into a folder you keep; open `chrome://extensions`, turn on Developer mode (top right); click Load unpacked and pick that folder.
2. In Kera: Settings → Account → API keys → Create. Copy the key.
3. The welcome page asks for that key: paste it, Connect, pick `gpt-6-luna` (or `gpt-oss:20b` for work that must stay on CodeMax's GPU), Use.
4. `Alt+Shift+K` opens the panel on any tab.

Chrome shows "Kera Browser started debugging this browser" above a tab the agent works on: that is how it controls the page. Cancel ends the run. Keep Ask mode on for finance and HR portals; the agent then confirms before it submits, sends, deletes or uploads.

## Develop

```sh
corepack enable && pnpm install --frozen-lockfile
pnpm dev                                  # watch build into dist/; load it unpacked at chrome://extensions
pnpm type-check && pnpm lint && pnpm test
pnpm build && pnpm zip                    # dist-zip/kera-browser-<version>.zip for the store
```

## What differs from upstream

- `src/llm/kera.ts`: Kera's address and default model. `kera` is a provider kind with a fixed base URL (`src/llm/providers.ts`), and the catalogue knows Kera's `gpt-oss` runs with a 16k context.
- `src/options/ProvidersSection.tsx`: `ENABLED_KINDS = ['kera']` is the only switch; the other kinds' code stays so upstream rebases cleanly.
- A `run_javascript` tool (upstream reserved the `eval` capability but ships no tool): the agent can evaluate JavaScript in the page when the page's controls cannot do the job. Outside Auto mode every script waits for your approval on a card that shows the code, and a site's "Allow" rule does not cover scripts.
- No analytics switches, no uninstall survey, no rating card. `PRIVACY.md` says what leaves the browser.
- Branding: name, icon, colours (`src/ui/index.css`), shortcut `Alt+Shift+K`.

## Rebase on upstream

```sh
git fetch upstream && git rebase upstream/master
```
