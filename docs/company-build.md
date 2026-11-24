# CodeMax's build of Kera Browser

The release zip on GitHub is the public build: no server address, no extension ID of its own, no access to any site until the user allows their own Kera server. CodeMax's team uses a build made for `https://kera.cdmx.io` that starts filled in, holds the access the 1.3.x copies already had, and keeps the extension ID the team's installed copies have, so an update needs no re-setup. This page is how to make it. Nothing secret is in this repository: the private key stays outside it.

## Build the zip for the team

From a clean checkout of the release tag:

```sh
corepack pnpm install --frozen-lockfile
env -u VITE_POSTHOG_API_KEY -u VITE_POSTHOG_HOST \
  KERA_DEFAULT_URL=https://kera.cdmx.io \
  KERA_EXTENSION_KEY="$(openssl rsa -in /path/outside/the/repo/kera-browser-key.pem -pubout -outform DER 2>/dev/null | base64 -w0)" \
  corepack pnpm zip
```

The result is `dist-zip/kera-browser-<version>-kera.cdmx.io.zip`. The build prints the extension ID it pinned; it must be `niehiilifenimkkbiikekkfjhaaellah`, the ID of the copies installed since 1.3.4. If it is not, stop: the key is not the team's.

Only the public half of the key is read (the command derives it from the `.pem` and prints nothing). A private key given as `KERA_EXTENSION_KEY` is refused. A file holding the public key works the same: `KERA_EXTENSION_KEY_FILE=/path/to/public-key.pem`.

Do not commit the zip or the key. `dist-zip/` is ignored by git.

What this build differs in, and why:

| | Public build | CodeMax build |
| --- | --- | --- |
| Server address | empty field | `https://kera.cdmx.io`, used when no address is stored (copies updated from 1.3.5) |
| Host access | optional, asked per origin | `<all_urls>`, as in 1.3.5: no new permission, so Chrome does not turn the extension off on update, and the page border works |
| `key` in the manifest | none | the team's public key (fixed extension ID) |
| Page mark | none | marks `https://kera.cdmx.io` pages (`data-kera-browser`) so Kera can offer "Update Kera Browser" |

## Install and update for the team

The team installs from the zip, unpacked: unzip into a folder that is kept, `chrome://extensions`, Developer mode, Load unpacked. With the pinned key the extension ID is the same wherever the folder is, so an update is: unzip the new zip over the same folder and press the reload arrow. Never Remove the extension first: that deletes its API key, settings and conversations.

Kera's "Kera for Chrome" button and its "Update Kera Browser" state (in the company's Kera deployment, not in this repository) must point at the file name above, which now carries the host name so it cannot be mistaken for the public zip.

## Chrome Web Store (unlisted)

The Web Store assigns its own extension ID and key. For an upload, build the same way **without** `KERA_EXTENSION_KEY`; copies installed from the store are separate installs from the zip-installed ones. See `store/listing.md`.

## Check an upgrade by hand

Load the 1.3.5 build, enter a key, then replace the files with this build's and reload: the panel works at once with no new permission prompt and the model list is unchanged. The unit test `src/extension/__tests__/kera-migration.test.ts` covers the same case (a provider with a key and no stored address).
