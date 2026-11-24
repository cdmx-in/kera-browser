# Privacy policy for Kera Browser

Kera Browser is an open-source Chrome extension (Apache-2.0), a fork of [Nanobrowser](https://github.com/nanobrowser/nanobrowser). It is the side-panel agent for [Kera](https://github.com/cdmx-in/kera), a chat server you or your organisation run yourselves. This policy describes the extension as built from this repository and published on its [releases page](https://github.com/cdmx-in/kera-browser/releases). A build made by someone else may differ; read theirs.

The maintainers run no server for this extension, receive nothing from it and cannot see your data.

## What leaves your browser

- **To your Kera server only.** When you send a message, the text of the pages you ask about or ask it to work on, your message, the files you attach and the screenshots the agent takes go to the Kera server whose address you entered, together with your Kera API key (as `Authorization: Bearer`), to run the model you chose. The address is the only destination the extension is given permission to call.
- **What Kera does with it** is decided by whoever runs that server: who can read it, how long it is kept, and whether the model behind it is local or a cloud service. Ask them.
- **Plain `http://` addresses.** If you enter an `http://` address that is not on your own computer, the key and the page text travel unencrypted on the network; the settings page says so next to the field. Use `https://` where you can.
- **Websites you visit with the agent** see ordinary browser traffic from your browser, as when you visit them yourself. The extension sends them nothing else.
- **Nothing else.** No analytics, no telemetry, no crash reports, no uninstall survey, no rating prompt, no remote code (every script ships in the package), and nothing is sent to the maintainers or to any third party.

About analytics in the code: the code inherited from Nanobrowser can send anonymous usage counts, but only in a build that has an analytics destination compiled in (`VITE_POSTHOG_API_KEY` and `VITE_POSTHOG_HOST` set at build time). Builds from this repository have none, so nothing is sent and anything queued is discarded; its small daily counters (how many tasks ran) are kept only in extension storage on your computer and are removed by Delete everything below. The Settings page has no analytics switch because there is nothing to switch.

## What stays in your browser

Kera Browser keeps this in Chrome's extension storage and IndexedDB on your computer: your Kera server address and API key (the key is stored apart from the settings, is never exported and never logged), your conversations with their attached files and run records, your settings, shortcuts and per-site Allow / Ask / Block rules, what it learned about each model (for example whether it can call tools), and a few local counters. None of this is sent anywhere except as described above.

Settings → Data → Delete everything removes it; removing the extension removes it too.

## Permissions

- **`debugger`**: how the agent reads and operates the page in a tab it works on, only during a run you started. Chrome shows its "started debugging this browser" bar above that tab, and Cancel ends the run.
- **Host access.** The public build requires none at install. Its manifest lists `http://*/*` and `https://*/*` only as optional host permissions, and the extension asks Chrome, from your click, for exactly the origin of your Kera server (for example `https://kera.example.com/*`) when you connect or change the address. If you change the address, the old origin's permission is dropped; if you remove it in `chrome://extensions`, the extension says so and cannot reach the server. A build made for one organisation may hold access to all sites from install, because the page border and cursor are scripts put into the page; the public build runs without them unless you grant that access.
- **`tabs`, `sidePanel`, `storage`, `unlimitedStorage`, `webNavigation`, `alarms`, `scripting`, `offscreen`, `contextMenus`**: the side panel, saved settings and conversations, noticing page loads in the tabs of a run, resuming an unfinished run, the highlight on a page during a run, saved files, and the "Ask Kera Browser about this" menu on selected text.
- **Optional, asked only when you press Allow**: `tabGroups` (a group named after the task), `notifications` (when the agent needs you), `downloads` and `downloads.open` (files the agent saves, with your confirmation).

## Contact

Questions and requests: [issues on GitHub](https://github.com/cdmx-in/kera-browser/issues). Security problems: see [SECURITY.md](SECURITY.md). Changes to this policy are commits to this file.
