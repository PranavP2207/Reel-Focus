/* Development check only. The extension itself has no dependencies or build step.
   Requires Node, Playwright, and Chromium; no Instagram account or network access. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const extension = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-focus-check-'));
const fixture = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#15151c;color:white;font:16px system-ui}
  nav{position:fixed;inset:0 auto 0 0;width:120px;padding:24px;background:#24232e}
  main{margin-left:120px;height:100vh;overflow:auto;scroll-snap-type:y mandatory}
  article{height:100vh;display:flex;justify-content:center;align-items:center;gap:24px;scroll-snap-align:start}
  .media{width:360px;height:640px;position:relative;transform:translateZ(0)}video{display:block;width:100%;height:100%;object-fit:contain}
  aside{width:220px}.backdrop{position:fixed;inset:0;background:#000c;display:grid;place-items:center}
  [role=dialog]{display:flex;gap:24px;background:#24232e;padding:24px}button,input{font:inherit}
  .next{position:absolute;right:16px;top:50%}
</style></head><body><nav>Instagram<br><input id="typing" aria-label="Search"></nav><main id="feed">
${[1, 2, 3].map(n => `<article><div class="media"><video id="reel${n}" src="/fixture.webm" muted playsinline preload="auto"></video></div><aside><h2>Reel ${n}</h2><p>Comments and native controls</p><button aria-label="Like">♡ Like</button><div id="editor${n}" contenteditable="true"><span>Write a comment</span></div></aside></article>`).join('')}
</main><script>window.siteClicks=0;window.siteKeys=0;document.querySelector('main').addEventListener('click',()=>siteClicks++);document.addEventListener('keydown',()=>siteKeys++);</script></body></html>`;

(async () => {
  const media = fs.readFileSync(path.join(__dirname, 'fixture.webm'));
  const context = await chromium.launchPersistentContext(path.join(temporary, 'profile'), {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    viewport: { width: 1280, height: 900 },
    args: [`--disable-extensions-except=${extension}`, '--enable-unsafe-extension-debugging', '--no-sandbox']
  });
  try {
    // Recent Chromium versions load unpacked extensions through the debugging protocol.
    const browserSession = await context.browser().newBrowserCDPSession();
    let nativeExtension = true;
    try { await browserSession.send('Extensions.loadUnpacked', { path: extension }); }
    catch (error) {
      if (!error.message.includes('disabled by the administrator')) throw error;
      nativeExtension = false;
      console.log('NOTE managed Chromium blocks unpacked extensions; using a local chrome.storage adapter for content-script checks.');
      // Do not change the administrator policy. Exercise the local UI code with a minimal API shim.
      await context.addInitScript(({ js, css }) => {
        if (location.origin !== 'https://www.instagram.com') return;
        chrome.runtime = { lastError: undefined };
        chrome.storage = { local: {
          get(key, callback) { queueMicrotask(() => callback(JSON.parse(localStorage.getItem('fixturePreferences') || '{}'))); },
          set(value, callback) { localStorage.setItem('fixturePreferences', JSON.stringify(value)); queueMicrotask(callback); }
        } };
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent = css;
          document.head.append(style);
          (0, eval)(js);
        }, { once: true });
      }, { js: fs.readFileSync(path.join(extension, 'content.js'), 'utf8'), css: fs.readFileSync(path.join(extension, 'content.css'), 'utf8') });
    }
    await browserSession.detach();
    // Intercept the origin locally so the real manifest and isolated-world script are exercised.
    await context.route('https://www.instagram.com/**', route => {
      if (new URL(route.request().url()).pathname === '/fixture.webm') {
        const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
        if (range) {
          const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), media.length - 1) : media.length - 1;
          return route.fulfill({ status: 206, contentType: 'video/webm', headers: {
            'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${media.length}`
          }, body: media.subarray(start, end + 1) });
        }
        return route.fulfill({ contentType: 'video/webm', headers: { 'Accept-Ranges': 'bytes' }, body: media });
      }
      return route.fulfill({ contentType: 'text/html', body: fixture });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const controls = page.locator('[data-rc-host]');
    const ready = () => controls.locator('#seek').waitFor({ state: 'visible', timeout: 8000 });
    const wait = fn => page.waitForFunction(fn, null, { timeout: 8000 }).catch(async error => {
      console.error('Failure state:', await page.evaluate(() => ({
        videos: [...document.querySelectorAll('video')].map(v => ({ id: v.id, time: v.currentTime, duration: v.duration, paused: v.paused, speed: v.playbackRate, volume: v.volume, muted: v.muted, loop: v.loop, ready: v.readyState, seekable: [...Array(v.seekable.length)].map((_, i) => [v.seekable.start(i), v.seekable.end(i)]) })),
        focused: document.activeElement?.outerHTML.slice(0, 120), full: document.fullscreenElement?.tagName,
        fullMarked: document.fullscreenElement?.hasAttribute('data-rc-fullscreen'), keys: window.fixtureKeyLog,
        focus: document.documentElement.classList.contains('rc-focus'), nativeKeys: window.siteKeys,
        uiTime: document.querySelector('[data-rc-host]')?.shadowRoot.getElementById('time').textContent
      })));
      console.error('Page errors:', errors);
      throw error;
    });
    await page.goto('https://www.instagram.com/reels/');
    await ready().catch(async error => {
      console.error('Fixture state:', await page.evaluate(() => ({ url: location.href, videos: document.querySelectorAll('video').length, hosts: document.querySelectorAll('[data-rc-host]').length, errors: document.body.innerText.slice(0, 300) })));
      const extensionsPage = await context.newPage();
      await extensionsPage.goto('chrome://extensions/');
      await extensionsPage.waitForTimeout(500);
      console.error('Extensions:', await extensionsPage.locator('extensions-item').evaluateAll(items => items.map(el => ({ id: el.data.id, name: el.data.name, state: el.data.state, errors: el.data.runtimeErrors, warnings: el.data.installWarnings }))));
      console.error('Page errors:', errors);
      throw error;
    });
    await wait(() => document.getElementById('reel1').duration === 12);
    assert.equal(await controls.count(), 1);
    assert.equal(await controls.evaluate(host => host.parentElement.id), 'feed');
    assert.equal(await controls.locator('#seek').isEnabled(), true);
    assert.equal(await controls.locator('#volume').isVisible(), true, 'Portrait reels must retain the volume slider');
    if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH });

    await controls.locator('#play').click();
    await wait(() => !document.getElementById('reel1').paused);
    await controls.locator('#play').click();
    await wait(() => document.getElementById('reel1').paused);
    assert.equal(await page.evaluate(() => siteClicks), 0, 'Overlay clicks must not reach Instagram');
    await page.locator('#reel1').click({ position: { x: 20, y: 20 } });
    await page.keyboard.press('ArrowRight');
    await wait(() => document.getElementById('reel1').currentTime >= 5);
    await page.keyboard.press('ArrowLeft');
    await wait(() => document.getElementById('reel1').currentTime < 1);
    await controls.locator('#seek').evaluate(input => { input.value = 7; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await wait(() => document.getElementById('reel1').currentTime === 7);
    await controls.locator('#speed').selectOption('1.5');
    await controls.locator('#volume').evaluate(input => { input.value = 0.35; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await controls.locator('#loop').click();
    await wait(() => {
      const v = document.getElementById('reel1');
      return v.playbackRate === 1.5 && v.volume === 0.35 && !v.muted && !v.loop;
    });
    console.log('PASS playback, seeking, volume, speed, loop, event isolation');

    await page.locator('#typing').focus();
    await page.keyboard.type('kfmcl<>');
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => !!document.fullscreenElement), false);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('rc-focus')), false);
    assert.equal(await page.evaluate(() => document.getElementById('reel1').paused), true);
    await page.locator('#editor1').focus();
    await page.keyboard.type('fc');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('rc-focus')), false);
    await page.locator('#reel1').click({ position: { x: 20, y: 20 } });
    await page.keyboard.press('>');
    await wait(() => document.getElementById('reel1').playbackRate === 2);
    await page.keyboard.press('<');
    await wait(() => document.getElementById('reel1').playbackRate === 1.5);
    await page.keyboard.press('m');
    await wait(() => document.getElementById('reel1').muted);
    await page.keyboard.press('m');
    console.log('PASS typing guards and keyboard shortcuts');

    await controls.locator('#focus').click();
    await wait(() => document.documentElement.classList.contains('rc-focus'));
    assert.equal(await page.locator('nav').evaluate(el => getComputedStyle(el).visibility), 'hidden');
    assert.equal(await page.locator('#reel1').evaluate(el => getComputedStyle(el).position), 'fixed');
    assert.equal(await page.locator('#reel1').evaluate(el => el.getBoundingClientRect().width), 1280);
    await controls.locator('#fullscreen').click();
    await wait(() => document.fullscreenElement?.id === 'feed');
    assert.equal(await controls.evaluate(host => document.fullscreenElement.contains(host)), true);
    assert.equal(await page.locator('#reel1').evaluate(v => v.parentElement.className), 'media');
    // F must still work after clicking a shadow button that retains keyboard focus.
    await page.keyboard.press('f');
    await wait(() => !document.fullscreenElement);
    await page.keyboard.press('f');
    await wait(() => !!document.fullscreenElement);
    await page.keyboard.press('ArrowDown');
    await wait(() => document.querySelector('video[data-rc-video]')?.id === 'reel2');
    assert.equal(await page.locator('#reel2').evaluate(v => v.playbackRate), 1.5);
    await page.waitForTimeout(350);
    await page.keyboard.press('ArrowUp');
    await wait(() => document.querySelector('video[data-rc-video]')?.id === 'reel1');
    await page.evaluate(() => { window.fixtureKeyLog = []; window.addEventListener('keydown', event => fixtureKeyLog.push({ key: event.key, prevented: event.defaultPrevented, repeat: event.repeat }), true); });
    await page.keyboard.press('Escape');
    await wait(() => !document.fullscreenElement);
    console.log('PASS focus, wrapper fullscreen, F/Esc, fullscreen reel navigation');

    await page.waitForTimeout(250); // Allow the deliberately debounced storage write.
    await page.reload();
    await ready();
    await wait(() => document.documentElement.classList.contains('rc-focus'));
    await wait(() => {
      const v = document.getElementById('reel1');
      return v.volume === 0.35 && !v.muted && v.playbackRate === 1.5 && !v.loop;
    });
    await controls.locator('#focus').click();
    await wait(() => !document.documentElement.classList.contains('rc-focus'));
    assert.equal(await page.locator('nav').evaluate(el => getComputedStyle(el).visibility), 'visible');
    assert.equal(await page.locator('#reel1').evaluate(el => getComputedStyle(el).position), 'static');
    await page.locator('#reel1').click({ position: { x: 20, y: 20 } });
    await page.mouse.move(1250, 880);
    await wait(() => document.querySelector('[data-rc-host]').shadowRoot.getElementById('bar').classList.contains('idle'));
    await page.mouse.move(580, 250);
    await wait(() => !document.querySelector('[data-rc-host]').shadowRoot.getElementById('bar').classList.contains('idle'));
    console.log(`PASS ${nativeExtension ? 'chrome.storage' : 'storage-adapter'} persistence, focus restoration, auto-hide`);

    await page.evaluate(() => {
      history.pushState({}, '', '/tester/saved/all-posts/');
      const backdrop = document.createElement('div');
      backdrop.className = 'backdrop';
      backdrop.innerHTML = '<div role="dialog" aria-modal="true"><div class="media"><video id="savedReel" src="/fixture.webm" muted playsinline></video></div><aside>Saved reel comments</aside></div><button class="next" aria-label="Next">Next</button>';
      backdrop.querySelector('button').onclick = () => backdrop.querySelector('video').id = 'nextSavedReel';
      document.body.append(backdrop);
    });
    await wait(() => document.querySelector('[role=dialog] [data-rc-host]'));
    await wait(() => document.getElementById('savedReel').duration === 12);
    await controls.locator('#play').click();
    await wait(() => !document.getElementById('savedReel').paused);
    await controls.locator('#focus').click();
    await controls.locator('#fullscreen').click();
    await wait(() => document.fullscreenElement?.getAttribute('role') === 'dialog');
    await page.keyboard.press('ArrowDown');
    await wait(() => document.getElementById('nextSavedReel'));
    await page.keyboard.press('f');
    await wait(() => !document.fullscreenElement);
    await page.evaluate(() => document.querySelector('.backdrop').remove());
    await wait(() => !document.querySelector('[data-rc-host]'));
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('rc-focus')), false);
    console.log('PASS Saved modal activation, playback, focus, fullscreen, native navigation, removal');

    await page.evaluate(() => { history.pushState({}, '', '/reel/example/'); document.body.append(document.createElement('span')); });
    await ready();
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    });
    assert.equal(await controls.count(), 0);
    assert.equal(await page.locator('[data-rc-path]').count(), 0);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await ready();
    await page.evaluate(() => { history.pushState({}, '', '/'); document.body.append(document.createElement('span')); });
    await wait(() => !document.querySelector('[data-rc-host]'));
    assert.deepEqual(errors, [], 'No uncaught errors');
    console.log('PASS SPA routing, single-reel route, pagehide cleanup, bfcache restart, no page errors');
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(temporary, { recursive: true, force: true }));
