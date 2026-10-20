import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Hierarchical back navigation, sheet gestures and system-bar color on a touch phone.
// Back must close one layer at a time (submenu -> sheet -> dialog -> drawer -> slideshow),
// drags must resize/dismiss sheets, and the theme-color meta must follow the scene.
// Needs the Vite dev server (reads the dev-only window.__keynotBackDepth).
const profile = await mkdtemp(path.join(tmpdir(), 'keynot-touch-'))
const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let socket
const failures = []
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
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await evaluate(expression)) return
      await sleep(150)
    }
    throw new Error(`Timed out: ${expression}`)
  }

  const depth = () => evaluate('window.__keynotBackDepth()')
  const back = async () => { await evaluate('history.back()'); await sleep(350) }
  const check = (ok, message) => { if (!ok) failures.push(message) }
  const drag = async (selector, dy, steps = 6) => {
    const box = await evaluate(`(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + Math.min(20, r.height / 2)] })()`)
    const [x, y] = box
    await page('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    for (let i = 1; i <= steps; i++) {
      await page('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: y + (dy * i) / steps, button: 'left', buttons: 1 })
      await sleep(16)
    }
    await page('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y: y + dy, button: 'left', clickCount: 1 })
    await sleep(450)
  }
  const clickText = text => evaluate(`[...document.querySelectorAll('.mobile-command')].find(b => b.textContent.includes(${JSON.stringify(text)}))?.click()`)

  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await page('Emulation.setTouchEmulationEnabled', { enabled: true })
  await page('Page.navigate', { url: process.env.UI_URL || 'http://127.0.0.1:5173/' })
  await waitFor(`!!document.querySelector('.mobile-tool-dock')`)
  await sleep(900)
  check(await depth() === 0, 'start: back stack must be empty')

  // System bars follow the top of the scene, not a hard-coded brand blue.
  const bar = await evaluate(`[document.querySelector('meta[name=theme-color]').content, getComputedStyle(document.querySelector('.canvas')).backgroundColor]`)
  check(bar[0] === bar[1], `theme-color ${bar[0]} must match the canvas ${bar[1]}`)

  // 1. Menu sheet -> submenu -> back -> back.
  await evaluate(`document.querySelector('.mobile-menu-trigger').click()`)
  await sleep(350)
  await clickText('Insert')
  await sleep(300)
  check(await depth() === 2, `menu + submenu must be 2 layers, got ${await depth()}`)
  await back()
  check(await evaluate(`document.querySelector('.sheet-header strong')?.textContent.trim() === 'Menu'`), 'back from a submenu must return to the root menu')
  await back()
  check(await evaluate(`!document.querySelector('.responsive-sheet')`) && await depth() === 0, 'second back must close the sheet')

  // 2. Command that closes the sheet and opens a dialog: the dialog must own exactly one entry.
  await evaluate(`document.querySelector('.mobile-menu-trigger').click()`)
  await sleep(350)
  await clickText('File')
  await sleep(300)
  await clickText('Theme')
  await sleep(700)
  check(await depth() === 1 && await evaluate(`!!document.querySelector('.theme-chooser-dialog')?.offsetParent`), `theme dialog must be the only layer, depth ${await depth()}`)
  await back()
  await sleep(200)
  check(!await evaluate(`!!document.querySelector('.theme-chooser-dialog')?.offsetParent`) && await depth() === 0, 'back must close the theme dialog')

  // 3. Drawers: inspector sheet resizes by drag and closes by back; slides drawer closes by back.
  await evaluate(`document.querySelector('.toggle-inspector').click()`)
  await sleep(450)
  const before = await evaluate(`document.querySelector('.layout-content-right').getBoundingClientRect().height`)
  await drag('.panel-handle', -260)
  const after = await evaluate(`document.querySelector('.layout-content-right').getBoundingClientRect().height`)
  check(after > before + 80, `dragging the inspector grabber up must enlarge it (${Math.round(before)} -> ${Math.round(after)})`)
  // Regression: a sheet sized for one viewport must re-fit when the viewport shrinks
  // (URL bar reappearing, rotation) instead of sliding under the bottom dock.
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 700, deviceScaleFactor: 1, mobile: true })
  await sleep(500)
  const fit = await evaluate(`(() => { const p = document.querySelector('.layout-content-right').getBoundingClientRect(); const d = document.querySelector('.mobile-tool-dock').getBoundingClientRect(); return [p.top >= 0, p.bottom <= d.top, document.scrollingElement.scrollTop === 0, getComputedStyle(document.querySelector('.layout-content-right')).overflowY] })()`)
  check(fit[0] && fit[1] && fit[2] && fit[3] === 'clip', `inspector must stay above the dock after a viewport change: ${JSON.stringify(fit)}`)
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await sleep(300)
  await back()
  check(await evaluate(`document.querySelector('.toggle-inspector').getAttribute('aria-expanded') === 'false'`) && await depth() === 0, 'back must close the inspector sheet')
  await evaluate(`document.querySelector('.toggle-thumbnails').click()`)
  await sleep(400)
  await back()
  check(await evaluate(`!document.querySelector('.layout-content-left.overlay')`), 'back must close the slides drawer')

  // 4. Drag a sheet down to dismiss it (and its history entry goes away too).
  await evaluate(`document.querySelector('.mobile-menu-trigger').click()`)
  await sleep(400)
  await drag('.sheet-header', 420, 4)
  await sleep(300)
  check(await evaluate(`!document.querySelector('.responsive-sheet')`) && await depth() === 0, 'pulling the sheet down must dismiss it')

  // 5. Popovers become sheets on phones (the layout picker from the slides drawer).
  await evaluate(`document.querySelector('.toggle-thumbnails').click()`)
  await sleep(400)
  await evaluate(`document.querySelector('.navigator-footer .popover .pill-button').click()`)
  await sleep(500)
  check(await evaluate(`(() => { const s = document.querySelector('.responsive-sheet'); if (!s) return false; const r = s.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && !!s.querySelector('.templates'); })()`), 'layout picker must open as an on-screen sheet')
  check(await depth() === 2, `drawer + picker sheet must be 2 layers, got ${await depth()}`)
  await back()
  await back()
  check(await depth() === 0, 'two backs must close picker then drawer')

  // 6. Slideshow: back exits it.
  await evaluate(`document.querySelector('.play-pill').click()`)
  await waitFor(`!document.querySelector('.keynot-editor')`)
  await sleep(300)
  check(await evaluate(`document.querySelector('meta[name=theme-color]').content`) === '#000000', 'slideshow must paint the system bars black')
  await back()
  await sleep(500)
  check(await evaluate(`!!document.querySelector('.keynot-editor')`), 'back must leave the slideshow')

  if (failures.length) {
    console.error(failures.join(String.fromCharCode(10)))
    process.exitCode = 1
  }
  else console.log('PASS: hierarchical back stack, sheet drag/resize, popover sheets and system bar color')
} finally {
  socket?.close()
  chrome.kill()
  await new Promise(resolve => setTimeout(resolve, 500))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
