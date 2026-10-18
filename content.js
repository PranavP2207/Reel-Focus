(() => {
  'use strict';

  // INSTAGRAM ADAPTER: all page selectors, route rules, and layout heuristics live here.
  const CONFIG = {
    selectors: {
      videos: 'video', dialogs: '[role="dialog"], dialog[open]', main: 'main, [role="main"]',
      hidden: '[hidden], [aria-hidden="true"]',
      typing: 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
      labeled: '[aria-label], svg title', title: 'svg title', clickable: 'button, [role="button"], a[href]'
    },
    reelRoute: /^\/reels?(?:\/|$)/,
    nextLabels: ['next', 'next reel', 'next video', 'next post', 'go forward'],
    previousLabels: ['previous', 'prev', 'previous reel', 'previous video', 'previous post', 'go back', 'back'],
    ambiguousBack: ['back', 'go back'], audioLabels: ['mute', 'unmute', 'sound', 'audio', 'volume'],
    source: video => video.getAttribute('src') || video.currentSrc,
    debug: false,
    frame: video => video.parentElement || video,
    scope(video) {
      return video.closest(this.selectors.dialogs) || video.closest(this.selectors.main) || document.body;
    },
    navigationRegion(scope) {
      if (!scope.matches(this.selectors.dialogs)) return scope;
      for (let i = 0; i < 3 && scope.parentElement && scope.parentElement !== document.body; i++) scope = scope.parentElement;
      return scope;
    },
    scrollable: node => node.scrollHeight > node.clientHeight + 8 && /auto|scroll/.test(getComputedStyle(node).overflowY),
    // Video dialogs include Saved overlays, even when Instagram keeps the Saved or /p/ URL.
    eligible(video) { return this.reelRoute.test(location.pathname) || !!video.closest(this.selectors.dialogs); },
    speeds: [0.5, 1, 1.25, 1.5, 2], discoveryDelay: 90, idleDelay: 2500,
    navigationDelay: 300, minArea: 400, minVisibleRatio: 0.08, activeBias: 1.03, maxBarWidth: 600,
    compactWidth: 440, barHeight: 128, compactBarHeight: 162,
    gestureDelay: 750, ownChangeDelay: 250, navigationVerticalTolerance: 0.4,
    storageKey: 'reelFocusPreferences'
  };
  const paths = {
    play: '<path d="m9 5 11 7-11 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    volume: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
    muted: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
    loop: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
    focus: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    collapse: '<path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/>',
    rotateLeft: '<path d="M3 9V3m0 6h6M3 9a9 9 0 1 1 1 9"/>',
    rotateRight: '<path d="M21 9V3m0 6h-6m6 0a9 9 0 1 0-1 9"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const button = (id, label, icon, toggle = false) => `<button id="${id}" type="button" aria-label="${label}" title="${label}" ${toggle ? 'aria-pressed="false"' : ''}>${svg(icon)}</button>`;
  const host = document.createElement('div');
  host.setAttribute('data-rc-host', '');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host{all:initial!important;position:fixed!important;z-index:2147483647!important;display:block!important;
        left:var(--rc-left,0px)!important;top:var(--rc-top,0px)!important;width:var(--rc-width,0px)!important;
        pointer-events:none!important;color-scheme:dark!important;contain:layout style!important}
      *{box-sizing:border-box} [hidden]{display:none!important}
      .bar{font:12px/1.4 system-ui,sans-serif;color:#f5f4fc;background:linear-gradient(135deg,#22212beb,#111117f5);
        border:1px solid #ffffff26;border-radius:16px;padding:12px;box-shadow:0 8px 32px #0006;
        pointer-events:auto;opacity:1;transition:opacity .18s;backdrop-filter:blur(16px)}
      .bar.idle{opacity:0;pointer-events:none} .top,.row{display:flex;align-items:center;gap:8px}
      .top{justify-content:space-between;margin-bottom:6px;color:#c7c3d8;font-size:10px;letter-spacing:1.5px}
      .brand{font-weight:700}.dot{color:#b6a0ff;margin-right:5px}.hint{letter-spacing:.2px;color:#b0aabc}
      .tools{display:flex;gap:4px}.tools button{height:28px;width:28px;padding:5px}
      .row{gap:6px} button,select{font:inherit;color:inherit;border:0;background:transparent;border-radius:8px;height:32px}
      button{width:32px;padding:7px;cursor:pointer;flex-shrink:0} button:hover,select:hover{background:#ffffff18}
      button[aria-pressed=true]{color:#c3b0ff;background:#b6a0ff20} svg{display:block;width:18px;height:18px}
      button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #c3b0ff;outline-offset:2px}
      input[type=range]{accent-color:#b6a0ff;cursor:pointer;min-width:0;margin:0;height:18px}
      #seek{display:block;width:100%;margin:0 0 6px} #volume{width:64px;flex-shrink:1}
      #time{font-variant-numeric:tabular-nums;white-space:nowrap;color:#d6d2e3;font-size:11px}
      .spacer{flex:1} select{padding:0 3px;cursor:pointer;width:61px} option{background:#22212b}
      .compact .spacer,.compact .hint{display:none}
      .compact .row{display:grid;grid-template-columns:32px minmax(16px,1fr) 32px 32px minmax(16px,1fr) 32px;gap:2px 4px}
      .compact #play{grid-area:1/1}.compact #time{grid-area:1/2/2/4}
      .compact #mute{grid-area:1/4}.compact #volume{grid-area:1/5/2/7;width:100%}
      .compact #speed{grid-area:2/1/3/4}.compact #loop{grid-area:2/4}
      .compact #focus{grid-area:2/5;justify-self:center}.compact #fullscreen{grid-area:2/6}
      @media(prefers-reduced-motion:reduce){.bar{transition:none}}
    </style>
    <section id="bar" class="bar" aria-label="Reel playback controls">
      <div class="top"><span class="brand"><span class="dot">●</span>REEL FOCUS</span><span class="hint">↑ ↓ reels · C focus</span><span class="tools">${button('rotateLeft', 'Rotate left 90° ([)', 'rotateLeft')}${button('rotateRight', 'Rotate right 90° (])', 'rotateRight')}</span></div>
      <input id="seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek reel" disabled>
      <div class="row">
        ${button('play', 'Play (Space / K)', 'play')}
        <span id="time">0:00 / 0:00</span><span class="spacer"></span>
        ${button('mute', 'Unmute (M)', 'muted')}
        <input id="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume">
        <select id="speed" aria-label="Playback speed" title="Playback speed (< / >)">${CONFIG.speeds.map(n => `<option value="${n}">${n}×</option>`).join('')}</select>
        ${button('loop', 'Loop (L)', 'loop', true)}
        ${button('focus', 'Focus: hide comments (C)', 'focus', true)}
        ${button('fullscreen', 'Fullscreen (F)', 'expand')}
      </div>
    </section>`;
  const ui = Object.fromEntries(['bar', 'play', 'mute', 'seek', 'time', 'volume', 'speed', 'loop', 'focus', 'fullscreen', 'rotateLeft', 'rotateRight'].map(id => [id, shadow.getElementById(id)]));
  let prefs = { volume: 1, muted: false, speed: 1, loop: true, focus: false };
  let active = null, scope = null, mediaEvents = null, events = null;
  let mutation = null, intersection = null, discoveryTimer = 0, saveTimer = 0, idleTimer = 0;
  let progressFrame = 0, layoutFrame = 0, visible = false, hovering = false, started = false;
  let lastHref = location.href, lastNavigation = 0, ownFullscreen = null, pendingFullscreen = null, slot = null;
  let bounds = null;
  let userPaused = false, autoPaused = false, gesture = null, rotation = 0, activeSource = '';
  let ownSoundChange = null, ownPlay = null, temporarilyMuted = false, forwardingNavigation = false, pendingNavigation = null;
  const tracked = new Map(), intersections = new Map(), focusMarks = new Map();
  const ignore = () => {};
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const time = n => Number.isFinite(n) ? `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}` : '—:—';
  const matchesLabel = (label, words) => words.some(word => ` ${label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `.includes(` ${word.toLowerCase()} `));
  const debug = (...message) => { if (CONFIG.debug) console.log('[Reel Focus]', ...message); };

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 180);
  }
  function flushSave() {
    try { chrome.storage.local.set({ [CONFIG.storageKey]: prefs }, () => { void chrome.runtime.lastError; }); } catch { /* Extension reloaded. */ }
    saveTimer = 0;
  }
  function persistPlayback(sound = false) {
    if (!active) return;
    if (sound) { temporarilyMuted = false; prefs.volume = active.volume; prefs.muted = active.muted; }
    Object.assign(prefs, { speed: active.playbackRate, loop: active.loop });
    save();
  }
  function recentGesture(video) { return gesture?.video === video && performance.now() < gesture.until; }
  function rememberGesture(event) {
    unlockSound(event);
    if (!event.isTrusted || !active || event.composedPath().includes(host)) return;
    const path = event.composedPath().filter(node => node instanceof Element);
    const button = path.find(node => node.matches(CONFIG.selectors.clickable));
    const metadata = [...path, ...(button?.querySelectorAll(CONFIG.selectors.labeled) || [])];
    const audio = metadata.some(node => matchesLabel(node.getAttribute('aria-label') || (node.matches(CONFIG.selectors.title) ? node.textContent : '') || '', CONFIG.audioLabels));
    if (CONFIG.frame(active).contains(event.target) || (audio && scope?.contains(event.target))) {
      if (event.type === 'click' && recentGesture(active)) return;
      if (audio) ownSoundChange = null;
      gesture = { video: active, audio, play: !audio && active.paused, until: performance.now() + CONFIG.gestureDelay };
    }
  }
  function applySound(resume = true) {
    if (!active) return;
    const muted = prefs.muted || temporarilyMuted;
    if (active.volume === prefs.volume && active.muted === muted) return;
    ownSoundChange = { video: active, volume: prefs.volume, muted, until: performance.now() + CONFIG.ownChangeDelay };
    const playing = !active.paused;
    active.volume = prefs.volume; active.muted = muted;
    if (resume && playing && active.paused && !userPaused && !document.hidden) playVideo();
  }
  function playVideo(userInitiated = false) {
    const video = active;
    if (!video?.isConnected || document.hidden || userPaused) return;
    if (userInitiated) ownPlay = { video, until: performance.now() + CONFIG.gestureDelay };
    applySound(false);
    video.play().catch(error => {
      if (active !== video || document.hidden || userPaused || prefs.muted || error.name !== 'NotAllowedError') return;
      temporarilyMuted = true;
      applySound();
      video.play().catch(ignore); // Muted autoplay fallback never changes the saved sound preference.
    });
  }
  function unlockSound(event) {
    if (!event.isTrusted || !active || !temporarilyMuted || prefs.muted) return;
    if (event.composedPath().includes(ui.mute) || (event.key?.toLowerCase() === 'm' && !event.composedPath().some(node => node instanceof Element && node.matches(CONFIG.selectors.typing)))) return;
    temporarilyMuted = false;
    const playing = !active.paused;
    applySound();
    if (playing && !userPaused) playVideo(true);
  }
  function guardPlayback(event) {
    const video = event.target;
    if (!video.matches?.(CONFIG.selectors.videos) || !CONFIG.eligible(video)) return;
    if (video === active && !document.hidden && ((recentGesture(video) && gesture.play) || (ownPlay?.video === video && performance.now() < ownPlay.until))) userPaused = false;
    if (document.hidden || (video === active && userPaused)) video.pause();
    else if (video === active && event.type === 'playing') applySound();
  }
  function visibilityChanged() {
    if (document.hidden) {
      cancelAnimationFrame(progressFrame);
      if (active && !active.paused) autoPaused = !userPaused;
      else if (active && !autoPaused) userPaused = true;
      for (const video of tracked.keys()) video.pause();
    } else {
      if (userPaused) active?.pause();
      else if (autoPaused) playVideo();
      autoPaused = false;
      schedule(); show();
    }
  }
  function clearRotation(video) {
    video?.removeAttribute('data-rc-rotation');
    for (const key of ['--rc-angle', '--rc-rotation-scale']) video?.style.removeProperty(key);
  }
  function applyRotation() { layout(); }
  function rotate(direction) {
    if (!active) return;
    rotation = direction === 0 ? 0 : (rotation + direction * 90 + 360) % 360;
    applyRotation(); layout(); show();
  }
  function label(id, text, icon) {
    ui[id].setAttribute('aria-label', text);
    ui[id].title = text;
    if (icon && ui[id].dataset.icon !== icon) {
      ui[id].innerHTML = svg(icon);
      ui[id].dataset.icon = icon;
    }
  }
  function sync() {
    if (!active || !visible) return;
    label('play', active.paused ? 'Play (Space / K)' : 'Pause (Space / K)', active.paused ? 'play' : 'pause');
    label('mute', active.muted || !active.volume ? 'Unmute (M)' : 'Mute (M)', active.muted || !active.volume ? 'muted' : 'volume');
    const full = document.fullscreenElement === scope;
    label('fullscreen', full ? 'Exit fullscreen (F / Esc)' : 'Fullscreen (F)', full ? 'collapse' : 'expand');
    ui.loop.setAttribute('aria-pressed', String(active.loop));
    ui.focus.setAttribute('aria-pressed', String(prefs.focus));
    label('focus', prefs.focus ? 'Restore comments (C)' : 'Focus: hide comments (C)');
    ui.volume.value = active.muted ? 0 : active.volume;
    ui.speed.value = active.playbackRate;
    progress();
  }
  function progress() {
    cancelAnimationFrame(progressFrame);
    progressFrame = 0;
    if (!active || !visible || document.hidden) return;
    const duration = active.duration, valid = Number.isFinite(duration) && duration > 0;
    ui.seek.disabled = !valid;
    ui.seek.max = valid ? duration : 100;
    ui.seek.value = valid ? clamp(active.currentTime, 0, duration) : 0;
    ui.seek.setAttribute('aria-valuetext', `${time(active.currentTime)} of ${time(duration)}`);
    ui.time.textContent = `${time(active.currentTime)} / ${time(duration)}`;
    if (!active.paused && !active.ended) progressFrame = requestAnimationFrame(progress);
  }
  function show() {
    if (!active) return;
    visible = true;
    ui.bar.classList.remove('idle');
    sync();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (hovering || shadow.activeElement) return;
      visible = false;
      ui.bar.classList.add('idle');
      cancelAnimationFrame(progressFrame);
      progressFrame = 0;
    }, CONFIG.idleDelay);
  }
  function place() {
    layoutFrame = 0;
    if (!active || !active.isConnected) return;
    const frame = CONFIG.frame(active).getBoundingClientRect();
    bounds = prefs.focus ? { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight } : frame;
    const videoWidth = prefs.focus ? innerWidth : active.offsetWidth, videoHeight = prefs.focus ? innerHeight : active.offsetHeight;
    const scale = rotation % 180 ? Math.min(bounds.width / Math.max(1, videoHeight), bounds.height / Math.max(1, videoWidth)) : 1;
    const width = Math.min(CONFIG.maxBarWidth, innerWidth - 24, Math.max(0, bounds.width - 16));
    const compact = width < CONFIG.compactWidth, height = compact ? CONFIG.compactBarHeight : CONFIG.barHeight;
    const left = clamp(bounds.left + (bounds.width - width) / 2, 12, Math.max(12, innerWidth - width - 12));
    const top = clamp(Math.min(bounds.bottom, innerHeight) - height, 12, Math.max(12, innerHeight - height));
    // Custom properties survive the Shadow DOM's defensive `all: initial` reset.
    active.toggleAttribute('data-rc-rotation', rotation !== 0);
    active.style.setProperty('--rc-angle', `${rotation}deg`);
    active.style.setProperty('--rc-rotation-scale', scale);
    host.style.cssText = `--rc-left:${left}px;--rc-top:${top}px;--rc-width:${width}px;`;
    ui.bar.classList.toggle('compact', compact);
  }
  function layout() { if (!layoutFrame) layoutFrame = requestAnimationFrame(place); }

  function clearFocus() {
    document.documentElement.classList.remove('rc-focus');
    for (const [element, names] of focusMarks) for (const name of names) element.removeAttribute(name);
    focusMarks.clear();
    if (slot) {
      slot.style.removeProperty('--rc-slot-height');
      slot.style.removeProperty('--rc-slot-width');
      slot = null;
    }
  }
  function applyFocus() {
    if (!prefs.focus) { clearFocus(); applyRotation(); return; }
    if (!active?.isConnected) return;
    const previousSlot = slot, nextSlot = CONFIG.frame(active), next = new Map(), ancestors = [];
    const mark = (node, name) => { if (!next.has(node)) next.set(node, new Set()); next.get(node).add(name); };
    if (nextSlot !== slot) {
      const rect = nextSlot.getBoundingClientRect();
      nextSlot.style.setProperty('--rc-slot-height', `${rect.height}px`);
      nextSlot.style.setProperty('--rc-slot-width', `${rect.width}px`);
    }
    for (let node = active.parentElement; node; node = node.parentElement) {
      ancestors.push(node);
      if (node === document.body) break;
    }
    const path = new Set(ancestors);
    // Preserve the video's original slot so feed scrolling still measures the real reel position.
    mark(nextSlot, 'data-rc-slot');
    mark(active, 'data-rc-video');
    for (const node of ancestors) {
      mark(node, 'data-rc-path');
      for (const sibling of node.children) {
        if (path.has(sibling) || sibling === active || sibling === host) continue;
        mark(sibling, 'data-rc-hidden');
      }
    }
    // Diff markers in one task; never expose Instagram's normal layout between focused reels.
    for (const [node, names] of next) for (const name of names) if (!node.hasAttribute(name)) node.setAttribute(name, '');
    for (const [node, names] of focusMarks) for (const name of names) if (!next.get(node)?.has(name)) node.removeAttribute(name);
    focusMarks.clear();
    for (const entry of next) focusMarks.set(...entry);
    if (previousSlot && previousSlot !== nextSlot) {
      previousSlot.style.removeProperty('--rc-slot-height'); previousSlot.style.removeProperty('--rc-slot-width');
    }
    slot = nextSlot;
    if (!document.documentElement.classList.contains('rc-focus')) document.documentElement.classList.add('rc-focus');
    applyRotation();
    layout();
  }
  function detach(keepFocus = false) {
    mediaEvents?.abort();
    mediaEvents = null;
    if (!keepFocus) clearFocus();
    clearRotation(active);
    active?.pause();
    clearTimeout(idleTimer);
    cancelAnimationFrame(progressFrame);
    progressFrame = 0;
    active = null;
    scope = null;
    visible = hovering = false;
    bounds = null;
    host.remove();
  }
  function attach(video) {
    if (video === active && (!video || CONFIG.source(video) === activeSource)) { applyFocus(); layout(); return; }
    detach(!!video && prefs.focus);
    if (!video) return;
    active = video;
    activeSource = CONFIG.source(video);
    rotation = 0; userPaused = autoPaused = temporarilyMuted = false;
    lastNavigation = -Infinity;
    ownPlay = ownSoundChange = gesture = null;
    scope = ownFullscreen?.contains(video) ? ownFullscreen : CONFIG.scope(video);
    scope.append(host);
    mediaEvents = new AbortController();
    const wasPlaying = !video.paused || video.autoplay;
    applySound(false);
    video.playbackRate = prefs.speed;
    video.loop = prefs.loop;
    for (const type of ['play', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'seeking', 'seeked', 'timeupdate', 'volumechange', 'ratechange']) {
      video.addEventListener(type, () => {
        if (type === 'volumechange') {
          const ours = ownSoundChange?.video === video && performance.now() < ownSoundChange.until &&
            video.volume === ownSoundChange.volume && video.muted === ownSoundChange.muted;
          if (!ours && recentGesture(video) && gesture.audio) persistPlayback(true);
          else applySound();
        }
        if (type === 'ratechange') { prefs.speed = video.playbackRate; save(); }
        if (type === 'loadedmetadata') {
          if (CONFIG.source(video) !== activeSource) { attach(video); return; }
          applySound(); applyRotation();
        }
        if (type === 'pause' && !document.hidden && recentGesture(video) && !gesture.audio && !gesture.play) { userPaused = true; autoPaused = false; ownPlay = null; }
        if (type === 'play' || type === 'pause') show(); else sync();
      }, { signal: mediaEvents.signal });
    }
    if (document.hidden) video.pause();
    else if (wasPlaying) playVideo();
    applyFocus();
    layout();
    show();
  }
  function selectActive() {
    // Read all candidate geometry before attach() performs any writes. Dialogs outrank the feed.
    const dialogs = [...document.querySelectorAll(CONFIG.selectors.dialogs)].filter(node =>
      !node.closest(CONFIG.selectors.hidden) && node.getBoundingClientRect().width > 0);
    const dialog = dialogs.at(-1);
    let best = null, bestScore = 0;
    for (const [video, frame] of tracked) {
      if (!video.isConnected || !CONFIG.eligible(video) || video.closest(CONFIG.selectors.hidden)) continue;
      if (dialog && !dialog.contains(video)) continue;
      if (ownFullscreen && !ownFullscreen.contains(video)) continue;
      if (!prefs.focus && getComputedStyle(video).visibility === 'hidden') continue;
      const r = frame.getBoundingClientRect();
      const viewportArea = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) *
        Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      // IntersectionObserver also accounts for clipping by Instagram's nested scroll containers.
      const area = Math.min(viewportArea, r.width * r.height * (intersections.get(frame) ?? 1));
      if (area < CONFIG.minArea || area / Math.max(1, r.width * r.height) < CONFIG.minVisibleRatio) continue;
      const score = area * (video === active ? CONFIG.activeBias : 1); // Small hysteresis avoids flicker at reel boundaries.
      if (score > bestScore) { best = video; bestScore = score; }
    }
    // Keep the focus backdrop during an asynchronous reel replacement, but release it for unrelated dialogs.
    if (!best && prefs.focus && document.documentElement.classList.contains('rc-focus') &&
      ((!dialog && CONFIG.reelRoute.test(location.pathname)) || dialog === scope)) return;
    attach(best);
    if (!best && ownFullscreen) document.exitFullscreen?.().catch(ignore);
  }
  function discover() {
    discoveryTimer = 0;
    // pushState doesn't emit popstate. Instagram's route render produces a mutation instead.
    if (lastHref !== location.href) lastHref = location.href;
    for (const [video, frame] of tracked) {
      if (video.isConnected && CONFIG.eligible(video) && CONFIG.frame(video) === frame) continue;
      intersection.unobserve(frame);
      intersections.delete(frame);
      tracked.delete(video);
    }
    for (const video of document.querySelectorAll(CONFIG.selectors.videos)) {
      if (tracked.has(video) || !CONFIG.eligible(video)) continue;
      const frame = CONFIG.frame(video);
      tracked.set(video, frame);
      intersection.observe(frame);
    }
    selectActive();
    if (pendingNavigation) {
      debug('Keyboard navigation check:', active !== pendingNavigation.video || CONFIG.source(active || pendingNavigation.video) !== pendingNavigation.source || location.href !== pendingNavigation.href ? 'reel changed' : 'no change; leaving the dialog alone');
      pendingNavigation = null;
    }
  }
  function schedule() {
    if (!started || discoveryTimer) return;
    discoveryTimer = setTimeout(discover, CONFIG.discoveryDelay);
  }
  function togglePlayback() {
    if (!active) return;
    if (active.paused) { userPaused = autoPaused = false; playVideo(true); }
    else { userPaused = true; autoPaused = false; ownPlay = gesture = null; active.pause(); }
  }
  function seek(delta) {
    if (!active || !Number.isFinite(active.duration)) return;
    try { active.currentTime = clamp(active.currentTime + delta, 0, active.duration); } catch { /* Not seekable yet. */ }
  }
  function toggleFocus() { prefs.focus = !prefs.focus; applyFocus(); save(); show(); }
  function fullscreen() {
    if (!scope) return;
    // Fullscreen an existing wrapper, never reparent React's video; the shadow controls stay inside.
    // Call synchronously from the click/key handler to retain the browser's user activation.
    if (document.fullscreenElement === scope) document.exitFullscreen?.().catch(ignore);
    else if (!document.fullscreenElement && scope.requestFullscreen) {
      const target = scope;
      target.setAttribute('data-rc-fullscreen', '');
      ownFullscreen = pendingFullscreen = target;
      target.requestFullscreen().then(() => {
        if (pendingFullscreen === target) pendingFullscreen = null;
      }).catch(() => {
        if (pendingFullscreen === target) pendingFullscreen = null;
        target.removeAttribute('data-rc-fullscreen');
        if (ownFullscreen === target) ownFullscreen = null;
      });
    }
  }
  function navigate(direction) {
    if (performance.now() - lastNavigation < CONFIG.navigationDelay) return;
    lastNavigation = performance.now();
    const region = scope, frame = CONFIG.frame(active);
    const videos = [...tracked.keys()].filter(video => region.contains(video));
    videos.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    const next = videos[videos.indexOf(active) + direction];
    const labels = direction > 0 ? CONFIG.nextLabels : CONFIG.previousLabels;
    const rect = frame.getBoundingClientRect(), centerX = (rect.left + rect.right) / 2, centerY = (rect.top + rect.bottom) / 2;
    const candidates = [...CONFIG.navigationRegion(region).querySelectorAll(CONFIG.selectors.labeled)].map(node =>
      ({ label: (node.getAttribute('aria-label') || node.textContent || '').trim(), button: node.closest(CONFIG.selectors.clickable) }));
    const hasNext = candidates.some(item => matchesLabel(item.label, CONFIG.nextLabels));
    const native = candidates.find(({ label, button }) => {
      if (!matchesLabel(label, labels) || !button || button.disabled || button.getAttribute('aria-disabled') === 'true') return false;
      const r = button.getBoundingClientRect();
      if (!r.width || button.closest(CONFIG.selectors.hidden)) return false;
      const ambiguous = CONFIG.ambiguousBack.includes(label.toLowerCase());
      if (!region.contains(button) || ambiguous) {
        const dx = (r.left + r.right) / 2 - centerX, dy = (r.top + r.bottom) / 2 - centerY;
        const lateral = dx * direction > 0 && Math.abs(dy) <= Math.max(80, rect.height * CONFIG.navigationVerticalTolerance);
        const vertical = !ambiguous && dy * direction > 0 && Math.abs(dx) <= Math.max(80, rect.width * CONFIG.navigationVerticalTolerance);
        if (!lateral && !vertical) return false;
      }
      return !ambiguous || hasNext;
    });
    if (native) { debug('Navigation: native button', native.label); native.button.click(); }
    else if (next) { debug('Navigation: loaded reel'); CONFIG.frame(next).scrollIntoView({ block: 'center', behavior: 'instant' }); }
    else {
      if (region.matches(CONFIG.selectors.dialogs)) {
        debug('Navigation: no enabled, positioned dialog button matched', labels, '; trying Instagram keyboard handling');
        pendingNavigation = { video: active, source: CONFIG.source(active), href: location.href };
        const key = direction < 0 ? 'ArrowLeft' : 'ArrowRight';
        forwardingNavigation = true;
        try { for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true })); }
        finally { forwardingNavigation = false; }
        schedule(); return;
      }
      let scroller = frame.parentElement;
      while (scroller && !CONFIG.scrollable(scroller)) scroller = scroller.parentElement;
      (scroller || window).scrollBy({ top: direction * (scroller?.clientHeight || innerHeight), behavior: 'instant' });
      debug('Navigation: feed scroll');
    }
    schedule();
    show();
  }
  function keydown(event) {
    unlockSound(event);
    if (forwardingNavigation || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    const path = event.composedPath();
    if (path.some(node => node instanceof Element && (node.matches(CONFIG.selectors.typing) || node.isContentEditable))) return;
    if (event.key === ' ' && path.some(node => node instanceof Element && node.matches(CONFIG.selectors.clickable))) return;
    const key = event.key.toLowerCase();
    if (!active && !(key === 'c' && prefs.focus)) return;
    if (key === 'escape' && document.fullscreenElement !== scope) return;
    if (![' ', 'k', 'm', 'f', 'escape', 'c', 'l', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', '<', '>', '[', ']', '0'].includes(key)) return;
    event.preventDefault();
    event.stopImmediatePropagation(); // Prevent Instagram from also acting on the same playback shortcut.
    if (event.repeat && !key.startsWith('arrow')) return;
    if (key === ' ' || key === 'k') togglePlayback();
    else if (key === 'm') { active.muted = !active.muted; persistPlayback(true); }
    else if (key === 'f' || key === 'escape') fullscreen();
    else if (key === 'c') toggleFocus();
    else if (key === 'l') { active.loop = !active.loop; persistPlayback(); }
    else if (key === '[' || key === ']') rotate(key === '[' ? -1 : 1);
    else if (key === '0') rotate(0);
    else if (key === 'arrowleft' || key === 'arrowright') seek(key === 'arrowleft' ? -5 : 5);
    else if (key === 'arrowup' || key === 'arrowdown') navigate(key === 'arrowup' ? -1 : 1);
    else {
      const i = CONFIG.speeds.indexOf(active.playbackRate);
      active.playbackRate = CONFIG.speeds[clamp((i < 0 ? 1 : i) + (key === '>' ? 1 : -1), 0, CONFIG.speeds.length - 1)];
      persistPlayback();
    }
    show();
  }

  // Events originating in our controls must not become Instagram video clicks or shortcuts.
  for (const type of ['click', 'dblclick', 'pointerdown', 'pointerup', 'keydown', 'keyup']) shadow.addEventListener(type, event => event.stopPropagation());
  ui.play.addEventListener('click', togglePlayback);
  ui.mute.addEventListener('click', () => { if (active) { active.muted = !active.muted; persistPlayback(true); show(); } });
  ui.fullscreen.addEventListener('click', fullscreen);
  ui.rotateLeft.addEventListener('click', () => rotate(-1));
  ui.rotateRight.addEventListener('click', () => rotate(1));
  ui.focus.addEventListener('click', toggleFocus);
  ui.loop.addEventListener('click', () => { if (active) { active.loop = !active.loop; persistPlayback(); show(); } });
  ui.speed.addEventListener('change', () => { if (active) { active.playbackRate = Number(ui.speed.value); persistPlayback(); show(); } });
  ui.volume.addEventListener('input', () => { if (active) { active.volume = Number(ui.volume.value); active.muted = active.volume === 0; persistPlayback(true); show(); } });
  ui.seek.addEventListener('input', () => {
    if (!active || !Number.isFinite(active.duration)) return;
    try { active.currentTime = clamp(Number(ui.seek.value), 0, active.duration); } catch { /* Media may be replaced during a drag. */ }
    show();
  });
  ui.bar.addEventListener('pointerenter', () => { hovering = true; show(); });
  ui.bar.addEventListener('pointerleave', () => { hovering = false; show(); });
  shadow.addEventListener('focusin', show);
  shadow.addEventListener('focusout', show);

  function start() {
    if (started) return;
    started = true;
    events = new AbortController();
    const on = (target, type, listener, options = {}) => target.addEventListener(type, listener, { ...options, signal: events.signal });
    intersection = new IntersectionObserver(entries => {
      for (const entry of entries) intersections.set(entry.target, entry.intersectionRatio);
      schedule();
    }, { threshold: [0, 0.08, 0.25, 0.5, 0.75, 1] });
    mutation = new MutationObserver(records => {
      if (lastHref !== location.href || records.some(record => !host.contains(record.target) && record.target !== host)) schedule();
    });
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'role', 'src'] });
    on(document, 'keydown', keydown, { capture: true });
    on(document, 'pointerdown', rememberGesture, { capture: true, passive: true });
    on(document, 'click', rememberGesture, { capture: true, passive: true });
    on(document, 'play', guardPlayback, { capture: true });
    on(document, 'playing', guardPlayback, { capture: true });
    on(document, 'pointermove', event => {
      if (bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom) show();
    }, { passive: true });
    on(document, 'scroll', () => { layout(); schedule(); }, { capture: true, passive: true });
    on(window, 'resize', () => { applyRotation(); layout(); schedule(); }, { passive: true });
    on(window, 'popstate', schedule);
    on(window, 'hashchange', schedule);
    on(document, 'visibilitychange', visibilityChanged);
    on(document, 'fullscreenchange', () => {
      // An earlier exit event can arrive while a new gesture's fullscreen request is pending.
      if (ownFullscreen && !pendingFullscreen && document.fullscreenElement !== ownFullscreen) {
        ownFullscreen.removeAttribute('data-rc-fullscreen');
        ownFullscreen = null;
      }
      applyRotation(); schedule(); show();
    });
    discover();
  }
  function stop() {
    started = false;
    if (saveTimer) { clearTimeout(saveTimer); flushSave(); }
    events?.abort();
    mutation?.disconnect();
    intersection?.disconnect();
    tracked.clear();
    intersections.clear();
    clearTimeout(discoveryTimer);
    discoveryTimer = 0;
    cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    ownFullscreen?.removeAttribute('data-rc-fullscreen');
    ownFullscreen = null;
    pendingFullscreen = null;
    detach();
  }
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
  try {
    chrome.storage.local.get(CONFIG.storageKey, result => {
      void chrome.runtime.lastError;
      const saved = result?.[CONFIG.storageKey];
      if (saved && typeof saved === 'object') {
        if (Number.isFinite(saved.volume) && saved.volume >= 0 && saved.volume <= 1) prefs.volume = saved.volume;
        if (CONFIG.speeds.includes(saved.speed)) prefs.speed = saved.speed;
        for (const key of ['muted', 'loop', 'focus']) if (typeof saved[key] === 'boolean') prefs[key] = saved[key];
      }
      start();
    });
  } catch { start(); }
})();
