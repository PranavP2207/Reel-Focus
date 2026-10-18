# Reel Focus v1.1.1

Sticky-hide controls update, including all playback, rotation, Saved navigation, and focus fixes from v1.1.0. The Manifest V3 / vanilla JavaScript / Shadow DOM architecture and storage-only permission model are unchanged.

## Changes in v1.1.1

- Added a double-chevron-down **Hide controls (H)** button beside the rotate buttons, plus **H** to hide/show the panel immediately.
- Manual hiding stays active through mouse movement, keyboard focus, playback events, reel changes, focus mode, fullscreen, and rotated viewing. Refreshing the page starts with the panel visible; this state is not saved.
- Added a small **36×14px** up-chevron reveal handle centered at the viewport's bottom edge. It dims to about 20% after 2.5 seconds of inactivity, including when the pointer rests on it; moving within the bottom 80px brightens it. The handle stays inside the Shadow DOM and fullscreen wrapper.
- Added a thin always-visible, non-interactive progress line. While the panel is hidden, animation frames update only this line; the hidden seek slider and time label stop updating. Paused/background playback stops progress frames.
- Playback shortcuts and native video clicks continue to work while hidden. The hidden panel is inert and cannot capture clicks or keyboard focus; only the small reveal handle accepts clicks.
- Updated the README and added offline regressions for sticky state, both reveal actions, dimming, input guards, hidden shortcuts, progress updates, video clicks, rotated/fullscreen viewing, feed/Saved reel changes, and reload reset.

## Earlier fixes included (v1.1.0)

- Added rotate-left/right controls and `[`, `]`, `0` shortcuts. Video rotation fits without cropping, updates with viewport/focus/fullscreen changes, and resets per reel without rotating the controls.
- Added explicit user-paused versus automatically paused state. Hidden tabs pause playback, and returning resumes only an automatically paused reel. Site-initiated replay is blocked while hidden or manually paused.
- Fresh installs default to unmuted at full volume; saved sound settings win over programmatic Instagram changes. Muted autoplay fallback is temporary and recovers on the first real click/key. Explicit saved mute is respected.
- Fixed Saved previous navigation using configurable label arrays, SVG titles, positioned native buttons, and a single ArrowLeft/ArrowRight fallback with optional debug logging.
- Removed focus clear/reapply cycles during discovery and navigation; new content stays covered until the next focused reel is ready.

## Downloads

- **`reel-focus-1.1.1.zip`** — ready to extract and load as an unpacked extension. Includes the manifest, JavaScript, CSS, four PNG icons, README, and preview. No build step or runtime dependencies.
- **`reel-focus-1.1.1.zip.sha256`** — SHA-256 checksum for the installable ZIP.
- **`RELEASE.md`** — these complete release notes.

Choose the named extension ZIP under **Assets**. GitHub's automatically generated source archives contain the complete repository, including development files.

## Installation

1. Download and extract `reel-focus-1.1.1.zip`.
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
- Controls that fade after about 2.5 seconds of inactivity and remain visible while hovered or keyboard focused, unless manually hidden.
- Sticky manual hiding with **H** or the header button, a small reveal handle, and a non-interactive progress line.
- Video rotation with fit-to-viewport scaling, stationary controls, and per-reel reset.
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
| H | Hide / show controls; sticky until revealed or the page reloads |
| L | Toggle looping |
| Left / Right | Seek backward / forward 5 seconds |
| Up / Down | Previous / next reel |
| `<` / `>` | Decrease / increase playback speed |
| `[` / `]` | Rotate left / right by 90° |
| `0` | Reset rotation |

Shortcuts are ignored while typing in inputs, textareas, selects, contenteditable regions, and ARIA textboxes. The controls retain normal keyboard operation; Ctrl, Alt, and Meta combinations pass through.

## Privacy and compatibility

The only permission is **`storage`**. The content script runs only on **`https://www.instagram.com/*`**. There is no background service worker, tracking, analytics, remote code, extension network traffic, scraping, or video downloading. Preferences use `chrome.storage.local` and are not transmitted or synced.

Targets desktop **Chrome, Edge, Brave, Opera, and Vivaldi**. Safari, Firefox, Instagram's native apps, and mobile browsers without desktop extension support are outside scope.

## Validation and known limitations

- Syntax, manifest permissions and asset references, PNG dimensions, ZIP contents, and checksum were checked.
- Offline Chromium behavior checks passed for playback, seeking, settings, typing guards, event isolation, fullscreen, focus, navigation, persistence logic, auto-hide, Saved-style dialogs, SPA routing, tab-pause intent, native auto-resume blocking, sound preference enforcement, muted-autoplay recovery, rotation scaling/reset, Saved previous-button/fallback navigation, focus continuity, sticky hiding across feed/Saved reel changes, mouse/focus/idle auto-show blocking, handle/H reveal in fullscreen, handle dimming/placement, hidden shortcuts and video clicks, progress-only updates, reload reset, and cleanup.
- The browser checks used a local storage adapter because managed Chromium blocked unpacked installation. Native extension installation/storage, live Instagram layouts, and the other browsers still need manual verification.
- Instagram markup changes can require updates to `CONFIG` in `content.js`. Native navigation-label matching currently uses English.
- Saved video dialogs may also enable controls on ordinary video posts opened in a dialog.
- Videos without a finite duration cannot be sought. Fullscreen and autoplay remain subject to browser policy; content outside the fullscreen wrapper is not visible there.
- Focus hides native close/comment/share controls until restored with **C**. Use **Up/Down** if Instagram intercepts wheel scrolling over the focused video.

## Package integrity

The release attaches the exact ZIP committed under `packages/` in the existing `v1.1.1` tag. Its SHA-256 is:

```text
788a7fb46e4e4475dee4a759f738c03a03c4e18003cf0755c523b0c484c1d3b9
```

On Linux/macOS with `sha256sum` available, place the ZIP and checksum file together and run:

```sh
sha256sum --check reel-focus-1.1.1.zip.sha256
```

Report issues at [Reel Focus](https://github.com/PranavP2207/Reel-Focus/issues), including browser/version, the affected view, and reproduction steps.
