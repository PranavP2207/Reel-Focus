# Reel Focus v1.0.0

Initial release of Reel Focus, a lightweight Manifest V3 extension that adds playback controls and distraction-free viewing to Instagram Reels.

## Downloads

- **`reel-focus-1.0.0.zip`** — ready to extract and load as an unpacked extension. Includes the manifest, JavaScript, CSS, four PNG icons, README, and preview. No build step or runtime dependencies.
- **`reel-focus-1.0.0.zip.sha256`** — SHA-256 checksum for the installable ZIP.
- **`RELEASE.md`** — these complete release notes.

Choose the named extension ZIP under **Assets**. GitHub's automatically generated source archives contain the complete repository, including development files.

## Installation

1. Download and extract `reel-focus-1.0.0.zip`.
2. Open your browser's extensions manager: `chrome://extensions`, `edge://extensions`, `brave://extensions`, `opera://extensions`, or `vivaldi://extensions`.
3. Enable **Developer mode**, click **Load unpacked**, and select the extracted folder containing `manifest.json`.
4. Refresh Instagram and open the Reels feed, a direct reel, or a video dialog from Saved.

To update an existing installation, replace its files, click **Reload** on the extension's card, and refresh Instagram. Local preferences remain in the browser profile when the extension ID and profile stay the same; uninstalling can remove them.

## Included features

- Play/pause and a seek bar with elapsed time and duration.
- Volume slider and mute, including in the compact portrait layout.
- Playback speeds: **0.5×, 1×, 1.25×, 1.5×, and 2×**.
- Loop toggle.
- Automatic attachment to the visible reel in the feed, on direct reel pages, and in Saved video dialogs.
- Controls that fade after about 2.5 seconds of inactivity and remain visible while hovered or keyboard focused.
- Wrapper fullscreen that keeps the video and custom controls visible together, with previous/next reel navigation.
- Focus mode that hides comments and surrounding UI, centers the video, and restores the layout on demand. Works inside and outside fullscreen.
- Local persistence of volume, mute, speed, loop, and focus preferences.
- SPA navigation handling, isolated Shadow DOM controls, observer-based discovery without polling, and lifecycle cleanup.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space / K | Play or pause |
| M | Mute or unmute |
| F | Enter or exit fullscreen |
| Esc | Exit fullscreen |
| C | Toggle focus / restore comments |
| L | Toggle looping |
| Left / Right | Seek backward / forward 5 seconds |
| Up / Down | Previous / next reel |
| `<` / `>` | Decrease / increase playback speed |

Shortcuts are ignored while typing in inputs, textareas, selects, contenteditable regions, and ARIA textboxes. The controls retain normal keyboard operation; Ctrl, Alt, and Meta combinations pass through.

## Privacy and compatibility

The only permission is **`storage`**. The content script runs only on **`https://www.instagram.com/*`**. There is no background service worker, tracking, analytics, remote code, extension network traffic, scraping, or video downloading. Preferences use `chrome.storage.local` and are not transmitted or synced.

Targets desktop **Chrome, Edge, Brave, Opera, and Vivaldi**. Safari, Firefox, Instagram's native apps, and mobile browsers without desktop extension support are outside scope.

## Validation and known limitations

- Syntax, manifest permissions and asset references, PNG dimensions, ZIP contents, and checksum were checked.
- Offline Chromium behavior checks passed for playback, seeking, settings, typing guards, event isolation, fullscreen, focus, navigation, persistence logic, auto-hide, Saved-style dialogs, SPA routing, and cleanup.
- The browser checks used a local storage adapter because managed Chromium blocked unpacked installation. Native extension installation/storage, live Instagram layouts, and the other browsers still need manual verification.
- Instagram markup changes can require updates to `CONFIG` in `content.js`. Native navigation-label matching currently uses English.
- Saved video dialogs may also enable controls on ordinary video posts opened in a dialog.
- Videos without a finite duration cannot be sought. Fullscreen and autoplay remain subject to browser policy; content outside the fullscreen wrapper is not visible there.
- Focus hides native close/comment/share controls until restored with **C**. Use **Up/Down** if Instagram intercepts wheel scrolling over the focused video.

## Package integrity

The release attaches the exact ZIP committed under `packages/` in the existing `v1.0.0` tag. Its SHA-256 is:

```text
a0487904c66f1594a7ef00ab08a9e641cff634b4722aab9226016631fd2fd5eb
```

On Linux/macOS with `sha256sum` available, place the ZIP and checksum file together and run:

```sh
sha256sum --check reel-focus-1.0.0.zip.sha256
```

Report issues at [PranavP2207/Instagram-Reel-Tool-extension](https://github.com/PranavP2207/Instagram-Reel-Tool-extension/issues), including browser/version, the affected view, and reproduction steps.
