import { defineContentScript } from 'wxt/utils/define-content-script';

// Tells Kera's web UI the extension is installed, so its "Install Kera Browser" header button hides itself
// (kera-custom.css in cdmx-in/ollama). A DOM mark needs no extension ID, which an unpacked install does not keep.
// <all_urls> already covers the match, so this adds no install warning.
export default defineContentScript({
  matches: ['https://kera.cdmx.io/*'],
  runAt: 'document_start',
  main() {
    document.documentElement.dataset.keraBrowser = chrome.runtime.getManifest().version;
  },
});
