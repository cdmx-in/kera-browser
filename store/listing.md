# Chrome Web Store listing: Kera Browser

Paste these into the developer dashboard (https://chrome.google.com/webstore/devconsole). Visibility: **Unlisted**.
Upload `dist-zip/kera-browser-<version>.zip` from `pnpm zip`.

## Store listing

- **Name:** Kera Browser
- **Summary (132 chars max):** Kera's AI agent in a side panel beside the page: it reads pages and works on them for you, with your Kera key.
- **Category:** Productivity → Workflow & Planning
- **Language:** English

**Description**

Kera Browser puts Kera, CodeMax's own AI, in a side panel next to the page you are on. Ask it about the page, or give it a task: it reads the page, clicks, types, scrolls and moves between tabs to carry the task out, and asks you before it submits, sends, deletes or uploads anything.

For CodeMax teams. You sign in with nothing new: paste the API key from your Kera account (Kera → Settings → Account → API keys) and pick a model Kera offers you. Page content and your messages go to Kera at kera.cdmx.io and nowhere else; your key stays in your browser.

Open the panel with Alt+Shift+K. Per-site rules (Allow, Ask, Block) are in Settings → Permissions.

Based on Nanobrowser (Apache-2.0).

## Privacy practices

- **Single purpose:** An AI assistant that reads the current page and performs the user's tasks on it, using the user's own Kera (Open WebUI) account.
- **Privacy policy URL:** https://github.com/cdmx-in/kera-browser/blob/kera/PRIVACY.md
- **Data usage disclosures:** Website content and user activity (page text, screenshots, clicks the agent performs) are sent to the user's Kera server to run the task. Authentication information (the user's Kera API key) is stored locally. Not sold, not used for unrelated purposes, not used for creditworthiness.
- **Remote code:** No. All code ships in the package.

## Permission justifications

- **debugger:** The only way the agent reads the page's accessibility tree and performs clicks, typing and scrolling on it. Attached only to the tabs of a run the user started; detached when the run ends.
- **Host permission `<all_urls>`:** The user may run a task on any site. Access is used only in the tabs of a running task, and per-site Allow / Ask / Block rules are in Settings.
- **scripting:** Draws the glowing border on a page while the agent works on it, so the user sees which tab is being driven.
- **tabs, tabGroups (optional):** Opens the tabs a task needs in a group named after the conversation, and brings a conversation's tab to the front.
- **sidePanel:** The user interface is a side panel beside the page.
- **storage, unlimitedStorage:** Conversations, settings and the user's key are stored locally.
- **webNavigation:** Notices page loads and navigations in the tabs of a run, so the agent waits for the page before acting.
- **offscreen:** Records microphone audio for voice input in an offscreen document.
- **alarms:** Wakes the service worker to resume an unfinished run.
- **contextMenus:** "Ask Kera Browser about this" on selected text.
- **notifications (optional):** Tells the user when the agent needs them, if they moved to another window.
- **downloads, downloads.open (optional):** Saves files the agent produced, with the user's confirmation.

## Assets

- Icon 128×128: `public/icon-128.png`
- Screenshots 1280×800: `store/screenshots/*.png`
