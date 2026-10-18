<img src="icons/icon128.png" width="72" height="72" alt="Reel Focus icon">

# Reel Focus

**Better playback controls and distraction-free viewing for Instagram Reels.**

A small Manifest V3 extension for desktop Chrome, Edge, Brave, Opera, and Vivaldi. It adds playback controls, wrapper fullscreen, and a distraction-free focus mode to Instagram Reels, including video dialogs opened from Saved.

Vanilla JavaScript and CSS. No dependencies, build step, background worker, account setup, analytics, network requests, downloads, or remote code. The only permission is `storage`; the content script runs only on `https://www.instagram.com/*`.

**[Download Reel Focus v1.0.0](https://github.com/PranavP2207/Instagram-Reel-Tool-extension/raw/refs/tags/v1.0.0/packages/reel-focus-1.0.0.zip)** · [SHA-256 checksum](https://github.com/PranavP2207/Instagram-Reel-Tool-extension/blob/v1.0.0/packages/reel-focus-1.0.0.zip.sha256)

## Features

| Feature | What it does |
| --- | --- |
| Playback controls | Play/pause, seek with elapsed time and duration, volume, and mute. |
| Playback speed | Choose 0.5×, 1×, 1.25×, 1.5×, or 2×. |
| Loop toggle | Turn repeat playback on or off. |
| Wrapper fullscreen | Keep the video and custom controls together in fullscreen; use Up/Down to navigate reels. |
| Focus mode | Hide comments and surrounding UI, center the reel, and restore the layout with one toggle. Works inside and outside fullscreen. |
| Active reel detection | Follow the visible reel as you scroll or open a video dialog from Saved. |
| Local preferences | Remember volume, mute, speed, loop, and focus state in your browser profile. |

The overlay adapts to portrait reels with a two-row layout that keeps every control available.

### Preview

![Reel Focus playback controls on a portrait test video](docs/preview.png)

*Preview from the offline browser test fixture using a generated video.*

## Install

No Node.js, npm, or build tools are needed to use the extension.

1. [Download the installable v1.0.0 ZIP](https://github.com/PranavP2207/Instagram-Reel-Tool-extension/raw/refs/tags/v1.0.0/packages/reel-focus-1.0.0.zip) and extract it. Alternatively, choose **Code → Download ZIP** for the complete source, or clone the repository:

   ```sh
   git clone https://github.com/PranavP2207/Instagram-Reel-Tool-extension.git
   ```

2. Open your browser's extensions manager:

   | Browser | Address |
   | --- | --- |
   | Chrome | `chrome://extensions` |
   | Edge | `edge://extensions` |
   | Brave | `brave://extensions` |
   | Opera | `opera://extensions` |
   | Vivaldi | `vivaldi://extensions` |

3. Enable **Developer mode**, choose **Load unpacked**, and select the extracted or cloned folder containing `manifest.json`.
4. Refresh any Instagram tabs that were already open. Open the [Reels feed](https://www.instagram.com/reels/), a `/reel/<id>/` page, or a reel from Saved.

**Updating:** Download or pull the latest source, click **Reload** on the extension's card in the extensions manager, then refresh Instagram.

## Using the controls

Move the pointer over the reel to reveal the controls. They fade after 2.5 seconds of inactivity and remain visible while hovered or keyboard focused. The seek bar becomes available once Instagram supplies a finite duration. The volume slider also unmutes; dragging it to zero mutes.

Click fullscreen or press **F**. The extension fullscreens the existing main/dialog container, which contains both Instagram's video and the extension's controls. It never moves or clones the video. Click fullscreen again, press **F**, or press **Esc** to leave.

Click the split-panel icon or press **C** for focus mode. The video fills the viewport with its aspect ratio preserved; comments and surrounding UI are hidden. Toggle again to restore them. This works independently of fullscreen. The last focus setting follows you to the next reel.

## Shortcuts

| Key | Action |
| --- | --- |
| Space / K | Play or pause |
| M | Mute or unmute |
| F | Enter or exit fullscreen |
| Esc | Exit fullscreen |
| C | Toggle focus / restore comments |
| L | Toggle looping |
| Left / Right | Seek backward / forward 5 seconds |
| Up / Down | Previous / next reel, including in fullscreen |
| `<` / `>` | Slower / faster: 0.5×, 1×, 1.25×, 1.5×, 2× |

Up/Down is reserved for reel navigation; use the slider for volume. Navigation first uses Instagram's labeled next/previous button, then another loaded reel, then the nearest scroll container. On most keyboard layouts, `<` and `>` require Shift.

Shortcuts are ignored in inputs, textareas, selects, contenteditable regions, and ARIA textboxes. The controls retain normal range/select keyboard operation. Space on a focused button activates that button. Ctrl, Alt, and Meta combinations pass through. Handled shortcuts are stopped so Instagram does not perform the same action a second time; native like/comment/share clicks outside the extension pass through.

## Privacy and local preferences

- The only extension permission is `storage`; injection is limited to `https://www.instagram.com/*`.
- No analytics, tracking, remote code, or network requests from the extension.
- No downloading, scraping, saving, or transmitting Instagram content.
- No background service worker, broad host permissions, tabs permission, or web-request access.

Volume, mute, speed, loop, and focus are stored together in `chrome.storage.local` under `reelFocusPreferences`. Playback preferences also follow changes made through Instagram's native controls. On first use, the extension adopts the current video's volume, mute, and speed; looping defaults to on. Preferences remain in the browser profile and are not synced or transmitted.

## Layout adapter

All Instagram selectors and layout heuristics are in the clearly labeled `CONFIG` object at the top of `content.js`. No Instagram class names are used.

| Config entry | Adjust when |
| --- | --- |
| `selectors.videos`, `frame(video)` | The video or its immediate media container changes. The frame provides a stable visibility/scrolling anchor during focus. |
| `selectors.dialogs`, `selectors.main`, `scope(video)` | Saved dialogs or the main reel wrapper change. The scope must contain the video and remain mounted while navigating. |
| `reelRoute`, `eligible(video)` | Reel URLs or Saved overlay presentation change. |
| `selectors.hidden`, `minArea`, `minVisibleRatio` | Instagram changes hidden/preloaded video handling. |
| `selectors.labeled`, `selectors.clickable`, `nextLabel`, `previousLabel`, `navigationRegion(scope)` | Native navigation labels change, particularly in another language. |
| `selectors.typing` | Instagram introduces a different kind of text editor. |

One debounced MutationObserver discovers and prunes videos; one IntersectionObserver tracks their media frames, including clipping by nested scroll containers. Visible area and a small preference for the current reel choose the active video, with dialogs taking priority. Scroll/resize events schedule checks without polling. The observer checks the URL cheaply, and `popstate` handles back/forward navigation.

The controls live in a Shadow DOM. Focus uses removable `data-rc-*` attributes and the `rc-focus` class on `<html>` to hide sibling branches along the active video's ancestor path. Visibility preserves the original feed layout, and the video's slot is reserved while it is centered. No comments, media nodes, or Instagram handlers are removed. Active-video listeners are aborted on switching; observers, listeners, timers, animation frames, and focus markers are cleaned up on page exit and restored after a back-forward cache return. Seek progress uses animation frames only while the bar is visible and playback is running.

## Files

```text
Instagram-Reel-Tool-extension/
├── manifest.json
├── content.js              # Page adapter, isolated controls, playback and lifecycle
├── content.css             # Reversible focus/fullscreen rules
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
├── docs/
│   └── preview.png         # Screenshot of the generated offline fixture
├── packages/
│   ├── reel-focus-1.0.0.zip
│   └── reel-focus-1.0.0.zip.sha256
└── tests/                  # Development only
    ├── browser.cjs
    └── fixture.webm        # Generated solid-color test video
```

The four PNG icons are generated local artwork and are already included; no icon tooling is needed to install.

## Development and verification

Editing `content.js` or `content.css` requires no compilation. Reload the extension in your extensions manager, then refresh Instagram.

Syntax checks require Node.js:

```sh
node --check content.js
node --check tests/browser.cjs
```

`node --check content.js` checks syntax. `node tests/browser.cjs` loads the unpacked extension in Chromium using intercepted, offline Instagram-shaped fixtures. If administrator policy blocks unpacked installation, the harness reports that restriction and exercises the same local content script and CSS with a minimal `chrome.storage.local` adapter backed by fixture-local storage. It does not change browser policy. That fallback verifies page behavior and persistence logic, but does not verify extension installation, isolated-world execution, or the native Chrome storage API.

For development tests only, Playwright must be resolvable by Node and a recent Chromium with `Extensions.loadUnpacked` support must be installed; set `CHROMIUM_PATH` if it is not `/usr/bin/chromium`. These are not runtime dependencies. The test profile is temporary and is deleted afterward.

If Playwright is not already available, install the development tools locally:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

Then run `node tests/browser.cjs` with a Linux Chromium installation at `/usr/bin/chromium`, or set the executable path. For example, on a POSIX shell using Playwright's Chromium:

```sh
CHROMIUM_PATH="$(node -p 'require("playwright").chromium.executablePath()')" node tests/browser.cjs
```

The browser checks cover playback, seeking, settings, typing guards, event isolation, wrapper fullscreen, focus restoration, navigation, persistence across reloads, auto-hide, Saved-style dialogs, SPA routes, and lifecycle cleanup. Fixtures use a generated video and do not contact Instagram. This environment used the administrator-policy fallback. A manual installation check against your logged-in Instagram layout is still needed.

## Known limitations

- Instagram changes its markup frequently and runs layout experiments. The adapter may need adjustment; the extension safely detaches when no suitable video is visible. Test the feed, a direct reel, and Saved on your own account.
- Saved video dialogs are treated as reels even when Instagram keeps a Saved or `/p/` URL. This may also enable the controls on an ordinary video post opened in a dialog. Saved grid thumbnails alone are not activated.
- Next/previous navigation needs Instagram's native navigation button, a loaded neighboring reel, or a scrollable feed. Localized button labels can be added to `CONFIG`. The extension does not fetch or preload reels itself.
- Fullscreen requires a real click or keypress. Browser policy may refuse it. Content Instagram portals outside the fullscreen wrapper will not be visible there; exit fullscreen to interact with it.
- Focus hides Instagram's close/comment/share UI along with the comments; press C to restore it. While a reel is focused, wheel scrolling over the fixed video can be intercepted by Instagram; Up/Down provides explicit navigation.
- Live streams or media with no finite duration cannot be sought. Instagram may reset playback properties when replacing its player. Browser autoplay policy can still require a Play click. Failed playback/fullscreen requests are ignored safely.
- Desktop Chromium browsers are targeted. Safari, Firefox, mobile browsers without desktop extension support, and Instagram's native apps are outside scope. Fixture testing uses Chromium; other browsers have not been manually verified.

## Reporting a problem

[Open an issue](https://github.com/PranavP2207/Instagram-Reel-Tool-extension/issues/new) with your browser/version, extension version, the affected view (feed, direct reel, or Saved), and steps to reproduce. For layout fixes, keep selectors in `CONFIG` and preserve the storage-only permission model.
