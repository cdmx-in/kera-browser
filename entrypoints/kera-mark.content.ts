import { defineContentScript } from 'wxt/utils/define-content-script';
import { BUILD_DEFAULT_ADDRESS, originPattern } from '@src/llm/kera';

// Marks the page of the Kera server a build is made for (KERA_DEFAULT_URL, see wxt.config.ts), so that server's web UI can
// tell the extension is installed and offer "Update Kera Browser" when a newer one is out. A DOM mark needs no extension
// ID, which an unpacked install does not keep. The public build has no default server and leaves this script out
// (wxt.config.ts drops the entrypoint): Kera itself does not read the mark. A build with a default has `<all_urls>`, so
// the match adds no install warning.
export default defineContentScript({
  matches: [originPattern(BUILD_DEFAULT_ADDRESS)],
  runAt: 'document_start',
  main() {
    document.documentElement.dataset.keraBrowser = chrome.runtime.getManifest().version;
  },
});
