import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

// Real Chrome, isolated profile, touch emulation, DOM hit testing; no UI automation dependency.
const profile = await mkdtemp(path.join(tmpdir(), 'keynot-responsive-'))
const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let socket
try {
  const endpoint = await new Promise((resolve, reject) => {
    let log = ''
    const timeout = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000)
    chrome.on('error', reject)
    chrome.stderr.on('data', data => {
      log += data
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/)
      if (match) { clearTimeout(timeout); resolve(match[1]) }
    })
  })
  socket = new WebSocket(endpoint)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let id = 0
  const pending = new Map()
  socket.onmessage = event => {
    const response = JSON.parse(event.data)
    if (!response.id) return
    const callback = pending.get(response.id)
    pending.delete(response.id)
    if (response.error) callback.reject(new Error(JSON.stringify(response.error)))
    else callback.resolve(response.result)
  }
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const requestId = ++id
    pending.set(requestId, { resolve, reject })
    socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true })
  const page = (method, params) => call(method, params, sessionId)
  const evaluate = async expression => {
    const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await evaluate(expression)) return
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    throw new Error(`Timed out: ${expression}`)
  }
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [768, 1024], [1365, 768]]) {
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 })
    await page('Emulation.setTouchEmulationEnabled', { enabled: width < 1200 })
    await page('Page.navigate', { url: process.env.UI_URL || 'http://127.0.0.1:5173/' })
    await waitFor(`!!document.querySelector('.keynot-editor')`)
    await new Promise(resolve => setTimeout(resolve, 200))
    const result = await evaluate(`(() => {
      const visible = el => !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
      const controls = [...document.querySelectorAll('.mobile-tool-dock button, .editor-header button')].filter(visible);
      return controls.map(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return { label:el.textContent.trim() || el.getAttribute('aria-label'), inside:r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight, reachable:el===hit || el.contains(hit) }; });
    })()`)
    assert.ok(result.length > 0)
    assert.deepEqual(result.filter(item => !item.inside || !item.reachable), [], `${width}x${height}: inaccessible controls`)
    // Chrome floats over a full-bleed canvas, and the slide fits the free area between it.
    assert.equal(await evaluate(`(() => { const c = document.querySelector('.canvas').getBoundingClientRect(); return c.left === 0 && c.top === 0 && c.width === innerWidth && c.height === innerHeight; })()`), true, `${width}x${height}: canvas must be full-bleed`)
    assert.equal(await evaluate(`(() => { const v = document.querySelector('.viewport-wrapper')?.getBoundingClientRect(); const h = document.querySelector('.layout-header').getBoundingClientRect(); return !v || v.top >= h.bottom; })()`), true, `${width}x${height}: slide must not sit under the header`)
    if (width >= 1200) {
      // Hints come from the shared pill: every icon-only toolbar pill has one, with registry shortcuts.
      assert.deepEqual(await evaluate(`[...document.querySelectorAll('.canvas-tool .pill-button.icon-only:not(.caret)')].filter(b => !b._tippy || !b.getAttribute('aria-label')).length`), 0, 'Icon-only pills need a hint and accessible name')
      assert.equal(await evaluate(`document.querySelector('.play-main')._tippy.props.content.includes('<kbd>')`), true, 'Play hint must show its shortcut')
      // Menus blur through: no ancestor of an open menu may own a backdrop-filter itself.
      await evaluate(`document.querySelector('.menu-trigger').click()`)
      await waitFor(`!!document.querySelector('.menu-panel')`)
      assert.equal((await evaluate(`(() => { let el = document.querySelector('.menu-panel'); const p = getComputedStyle(el, '::before').backdropFilter; while ((el = el.parentElement)) { if (getComputedStyle(el).backdropFilter !== 'none') return 'blocked by ' + el.className; } return p; })()`)).includes('blur'), true, 'Menu panel blur must not be blocked by a parent backdrop root')
      await evaluate(`document.body.click()`)
    }
    const compact = await evaluate(`document.querySelector('.keynot-editor').dataset.tier === 'mobile'`)
    if (compact) {
      assert.equal(await evaluate(`(() => { const r=document.querySelector('.mobile-tool-dock').getBoundingClientRect(); return Math.abs(r.left+r.width/2-innerWidth/2)<2 && r.bottom<=innerHeight && r.bottom>innerHeight-60; })()`), true, 'Compact dock must be centered at the bottom')
      await evaluate(`document.querySelector('.mobile-tools-trigger').click()`)
      await waitFor(`document.querySelector('.sheet-header strong')?.textContent.includes('Insert')`)
      await evaluate(`document.querySelector('.sheet-header .sheet-back').click()`)
      await waitFor(`document.querySelectorAll('.mobile-command').length === 9`)
      const menus = await evaluate(`document.querySelectorAll('[role="dialog"] .mobile-command').length`)
      assert.equal(menus, 9, 'All nine command menus must be reachable from the dock')
      await evaluate(`document.querySelectorAll('.mobile-command')[2].click()`)
      await waitFor(`document.querySelector('.sheet-header strong').textContent.includes('Insert')`)
      await evaluate(`document.querySelector('.sheet-header .sheet-back').click()`)
      await waitFor(`document.querySelectorAll('.mobile-command').length === 9`)
      await evaluate(`document.querySelector('.sheet-header .sheet-close').click()`)
      await evaluate(`document.querySelector('.toggle-inspector').click()`)
      await waitFor(`document.querySelector('.toggle-inspector').getAttribute('aria-expanded') === 'true'`)
      await new Promise(resolve => setTimeout(resolve, 300))
      assert.equal(await evaluate(`(() => { const r = document.querySelector('.layout-content-right').getBoundingClientRect(); return r.right <= innerWidth && r.left >= 0 && r.bottom <= document.querySelector('.mobile-tool-dock').getBoundingClientRect().top; })()`), true, 'Inspector sheet must sit inside the viewport above the dock')
      await evaluate(`document.querySelector('.toggle-thumbnails')?.click()`)
      await waitFor(`!!document.querySelector('.layout-content-left.overlay') && document.querySelector('.toggle-inspector').getAttribute('aria-expanded') === 'false'`)
      await evaluate(`document.querySelector('.toggle-inspector').click()`)
      await evaluate(`document.querySelectorAll('.inspector-mode-switch .tab')[2].click()`)
      await waitFor(`document.querySelectorAll('.inspector-mode-switch .tab')[2].classList.contains('active')`)
    }
    console.log(`PASS ${width}x${height}: controls visible and hit-testable${compact ? ', nested menus and inspector modes work' : ''}`)
  }
  if (process.env.UI_SCREENSHOT) {
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await page('Emulation.setTouchEmulationEnabled', { enabled: true })
    await page('Page.navigate', { url: process.env.UI_URL || 'http://127.0.0.1:5173/' })
    await waitFor(`!!document.querySelector('.mobile-tool-dock')`)
    const { data } = await page('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: 844, scale: 0.5 } })
    await writeFile(process.env.UI_SCREENSHOT, Buffer.from(data, 'base64'))
  }
} finally {
  socket?.close()
  chrome.kill()
  await new Promise(resolve => setTimeout(resolve, 500))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
