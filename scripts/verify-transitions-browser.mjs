import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Plays a deck in the presenter and asserts Keynote transition semantics:
// the transition of the slide being left plays (layers animate, then reset),
// Magic Move "By Word" morphs text through token clones, and an automatic
// transition advances by itself after its delay. The Animate inspector picks
// effects from the Keynote gallery and stores them on the slide being left.
// Needs the Vite dev server (UI_URL, default http://127.0.0.1:5173/).
const profile = await mkdtemp(path.join(tmpdir(), 'keynot-transitions-'))
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
  const waitFor = async (expression, label = expression) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return
      await sleep(100)
    }
    throw new Error(`Timed out: ${label}`)
  }
  const expect = (condition, message) => { if (!condition) failures.push(message) }

  const store = `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('slides')`
  const text = (id, content, left, top) => ({ type: 'text', id, continuityId: 'title', left, top, width: 600, height: 80, rotate: 0, defaultFontName: 'Helvetica Neue', defaultColor: '#000', content: `<p><span style="font-size: 36px;">${content}</span></p>` })
  const deck = [
    { id: 's1', elements: [text('t1', 'Push into the next slide', 100, 100)], background: { type: 'solid', color: '#fff' }, transition: { effect: 'apple:push', duration: 800, startMode: 'click', delay: 0, direction: 12 } },
    { id: 's2', elements: [text('t2', 'Hello brave new world', 100, 100)], background: { type: 'solid', color: '#fff' }, transition: { effect: 'apple:magic-move', duration: 900, startMode: 'click', delay: 0, acceleration: 'easeInOut', unmatchedBehavior: 'fade', textMatchMode: 'word' } },
    { id: 's3', elements: [text('t3', 'Hello new world today', 200, 300)], background: { type: 'solid', color: '#fff' }, transition: { effect: 'apple:dissolve', duration: 300, startMode: 'auto', delay: 400 } },
    { id: 's4', elements: [text('t4', 'Arrived automatically', 100, 100)], background: { type: 'solid', color: '#fff' } },
  ]

  await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  await page('Page.navigate', { url: process.env.UI_URL || 'http://127.0.0.1:5173/' })
  await waitFor(`!!document.querySelector('.keynot-editor')`, 'editor mounted')
  await sleep(600)
  await evaluate(`(() => { const s = ${store}; s.setSlides(${JSON.stringify(deck)}); s.updateSlideIndex(0) })()`)
  await evaluate(`document.querySelector('.editor-header').__vueParentComponent.exposed.executeCommand('play.beginning')`)
  await waitFor(`!!document.querySelector('.screen-slide-list .slide-item.current')`, 'presenter open')
  await sleep(600)
  const next = () => evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))`)

  // 1. Push: both layers animate; the outgoing one is shown while it moves away.
  await next()
  await sleep(150)
  const push = await evaluate(`(() => {
    const layer = index => document.querySelector('.screen-slide-list .slide-item[data-index="' + index + '"]')
    return { index: ${store}.slideIndex, outgoing: layer(0).getAnimations().length, incoming: layer(1).getAnimations().length, outgoingVisible: layer(0).style.visibility }
  })()`)
  expect(push.index === 1, `push advanced to slide 2 (${push.index})`)
  expect(push.outgoing === 1 && push.incoming === 1, `push animates both layers ${JSON.stringify(push)}`)
  expect(push.outgoingVisible === 'visible', 'outgoing layer visible during push')
  await sleep(900)
  const settled = await evaluate(`[...document.querySelectorAll('.screen-slide-list .slide-item')].every(el => !el.getAnimations().length && !el.style.transform && !el.style.visibility)`)
  expect(settled, 'layers return to rest after the push')

  // 2. Magic Move by word: token clones of both texts travel, then are removed.
  await next()
  await sleep(150)
  const morph = await evaluate(`(() => {
    const clones = document.querySelectorAll('.slide-item.current [aria-hidden="true"]')
    const moving = [...document.querySelectorAll('.slide-item.current [aria-hidden="true"] span')].filter(span => span.getAnimations().length)
    return { index: ${store}.slideIndex, clones: clones.length, moving: moving.length, realHidden: document.querySelector('.slide-item.current #screen-element-t3')?.style.opacity }
  })()`)
  expect(morph.index === 2, `magic move advanced to slide 3 (${morph.index})`)
  expect(morph.clones === 2, `outgoing and incoming text clones present (${morph.clones})`)
  expect(morph.moving >= 3, `matched words "Hello", "new", "world" animate (${morph.moving})`)
  expect(morph.realHidden === '0', 'real text hidden while tokens move')
  if (process.env.SHOT_FILE) {
    const { data } = await page('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1280, height: 800, scale: 0.375 } })
    await writeFile(process.env.SHOT_FILE, Buffer.from(data, 'base64'))
  }
  // The morph lasts 900 ms; slide 3 then waits 400 ms before leaving on its own.
  await sleep(950)
  const morphDone = await evaluate(`(() => ({ clones: document.querySelectorAll('.slide-item[data-index="2"] [aria-hidden="true"]').length, opacity: document.querySelector('.slide-item[data-index="2"] #screen-element-t3')?.style.opacity }))()`)
  expect(morphDone.clones === 0 && morphDone.opacity === '', `morph cleaned up ${JSON.stringify(morphDone)}`)

  // 3. Slide 3 leaves automatically after its 400 ms delay.
  await waitFor(`${store}.slideIndex === 3`, 'automatic transition to slide 4')

  // 4. Animate inspector: pick Cube from the gallery for slide 1.
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await page('Page.navigate', { url: process.env.UI_URL || 'http://127.0.0.1:5173/' })
  await waitFor(`!!document.querySelector('.keynot-editor')`, 'editor mounted again')
  await sleep(600)
  const mainStore = `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('main')`
  await evaluate(`(() => { const s = ${store}; s.setSlides(${JSON.stringify(deck)}); s.updateSlideIndex(0); ${mainStore}.setActiveElementIdList([]); ${mainStore}.setInspectorMode('animate') })()`)
  await waitFor(`!!document.querySelector('.slide-animation-panel .effect-summary button')`, 'transition inspector')
  await evaluate(`document.querySelector('.slide-animation-panel .effect-summary button').click()`)
  await waitFor(`!!document.querySelector('.slide-animation-panel [data-effect="apple:3D-cube"]')`, 'transition gallery')
  const galleryCount = await evaluate(`document.querySelectorAll('.slide-animation-panel .animation-item').length`)
  expect(galleryCount === 43, `gallery lists None and the 42 Keynote 15.2.1 effects (${galleryCount})`)
  await evaluate(`document.querySelector('.slide-animation-panel [data-effect="apple:3D-cube"]').click()`)
  await sleep(200)
  const picked = await evaluate(`JSON.parse(JSON.stringify(${store}.slides[0].transition ?? null))`)
  expect(picked?.effect === 'apple:3D-cube' && picked.duration === 800 && picked.direction === 12, `Cube stored on slide 1 with its timing kept ${JSON.stringify(picked)}`)
  const directionShown = await evaluate(`[...document.querySelectorAll('.slide-animation-panel .config-label')].some(el => /Direction|Direção/.test(el.textContent))`)
  expect(directionShown, 'Cube shows the Direction control')

  if (failures.length) {
    console.error(failures.join('\n'))
    process.exitCode = 1
  }
  else console.log('PASS: Push plays on the slide being left, Magic Move morphs word by word, automatic transitions advance on their own, and the inspector stores gallery picks on the slide')
} finally {
  socket?.close()
  chrome.kill()
  await new Promise(resolve => setTimeout(resolve, 500))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
