import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Opens every dialog, drawer and picker on phone/tablet viewports and asserts it fits:
// the surface lies inside the viewport and nothing inside it overflows horizontally.
// Needs the Vite dev server (uses Vue's dev-only __vueParentComponent to reach the header API).
const profile = await mkdtemp(path.join(tmpdir(), 'keynot-dialogs-'))
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

  const header = `document.querySelector('.editor-header').__vueParentComponent`
  const dialogs = [
    ['theme', `${header}.exposed.executeCommand('file.theme')`],
    ['workspace', `${header}.exposed.executeCommand('file.workspace')`],
    ['versions', `${header}.exposed.executeCommand('file.versions')`],
    ['export keynote', `${header}.exposed.executeCommand('file.export.keynote')`],
    ['export pptx', `${header}.exposed.executeCommand('file.export.powerpoint')`],
    ['export pdf', `${header}.exposed.executeCommand('file.export.pdf')`],
    ['export images', `${header}.exposed.executeCommand('file.export.images')`],
    ['compatibility', `${header}.exposed.executeCommand('file.compatibility')`],
    ['preferences', `${header}.exposed.executeCommand('file.preferences')`],
    ['media', `${header}.exposed.executeCommand('insert.media.video')`],
    ['latex', `${header}.exposed.executeCommand('insert.latex')`],
    ['shortcuts', `${header}.exposed.executeCommand('help.shortcuts')`],
  ]
  // A surface fits when it is inside the viewport and none of its visible descendants pokes out of it.
  const measure = `(() => {
    const surfaces = [...document.querySelectorAll('.modal-content, .drawer, .tippy-box')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; });
    if (!surfaces.length) return 'no surface';
    const problems = [];
    for (const el of surfaces) {
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) problems.push(el.className + ' outside viewport ' + JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round)));
      if (el.scrollWidth > el.clientWidth + 1) problems.push(el.className + ' scrolls sideways ' + el.scrollWidth + '>' + el.clientWidth);
      for (const child of el.querySelectorAll('*')) {
        const c = child.getBoundingClientRect();
        if (!c.width || getComputedStyle(child).position === 'fixed') continue;
        let clipped = false; for (let p = child.parentElement; p && p !== el; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { clipped = true; break; } }
        if (!clipped && (c.right > r.right + 1 || c.left < r.left - 1)) { problems.push('child overflows: ' + child.tagName + '.' + child.className); break; }
      }
    }
    return problems.join(' | ');
  })()`
  const closeAll = `(() => { document.querySelectorAll('.modal .mask').forEach(m => m.offsetParent && m.click()); document.querySelectorAll('.drawer .close-btn').forEach(b => b.offsetParent && b.click()); document.body.click(); })()`

  for (const [width, height] of [[390, 844], [320, 640], [844, 390]]) {
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true })
    await page('Emulation.setTouchEmulationEnabled', { enabled: true })
    await page('Page.navigate', { url: process.env.UI_URL || 'http://127.0.0.1:5173/' })
    await waitFor(`!!document.querySelector('.keynot-editor')`)
    await sleep(800)
    for (const [name, open] of dialogs) {
      await evaluate(open)
      await sleep(450)
      const result = await evaluate(measure)
      if (result) failures.push(`${width}x${height} ${name}: ${result}`)
      if (process.env.SHOT === name && width === 390) {
        const { data } = await page('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 0.5 } })
        await writeFile(process.env.SHOT_FILE, Buffer.from(data, 'base64'))
      }
      await evaluate(closeAll)
      await sleep(350)
    }
  }
  // Pickers opened from the tablet toolbar must fit too.
  await page('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false })
  await page('Page.navigate', { url: process.env.UI_URL || 'http://127.0.0.1:5173/' })
  await waitFor(`!!document.querySelector('.insert-cluster')`)
  await sleep(800)
  const pickers = await evaluate(`[...document.querySelectorAll('.canvas-tool .popover > .pill-button')].length`)
  for (let index = 0; index < pickers; index++) {
    await evaluate(`document.querySelectorAll('.canvas-tool .popover > .pill-button')[${index}].click()`)
    await sleep(400)
    const result = await evaluate(measure)
    if (result && result !== 'no surface') failures.push(`768x1024 picker #${index}: ${result}`)
    await evaluate(closeAll)
    await sleep(250)
  }
  if (failures.length) {
    console.error(failures.join('\n'))
    process.exitCode = 1
  }
  else console.log(`PASS: ${dialogs.length} dialogs x 3 phone viewports and ${pickers} tablet pickers fit their viewport`)
} finally {
  socket?.close()
  chrome.kill()
  await new Promise(resolve => setTimeout(resolve, 500))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
