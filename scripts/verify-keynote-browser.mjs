import { spawn } from 'node:child_process'
import { mkdtemp, rm, mkdir, readdir, readFile, copyFile, writeFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { importKeynoteArchive } from '../src/utils/keynoteImporter.ts'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Opens a real Keynote document through the editor's File > Open input and asserts the
// imported deck in the store: slide order from the show tree, native transitions, text,
// and the source archive kept for a source-preserving export.
// Needs the Vite dev server (UI_URL, default http://127.0.0.1:5173/).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = path.join(repoRoot, 'tests', 'fixtures', 'keynote', 'twoslides.key')
const transdeck = path.join(repoRoot, 'public', 'samples', 'research-transdeck.key')

const profile = await mkdtemp(path.join(tmpdir(), 'keynot-keynote-'))
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
      await sleep(150)
    }
    throw new Error(`Timed out: ${label}`)
  }
  const expect = (condition, message) => { if (!condition) failures.push(message) }

  const store = `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('slides')`
  const openFile = async file => {
    await page('DOM.enable')
    const { root } = await page('DOM.getDocument')
    const { nodeId } = await page('DOM.querySelector', { nodeId: root.nodeId, selector: 'input.native-file-input[accept^=".key"]' })
    await page('DOM.setFileInputFiles', { nodeId, files: [file] })
  }

  await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  await page('Page.navigate', { url: process.env.UI_URL || 'http://127.0.0.1:5173/' })
  await waitFor(`!!document.querySelector('.keynot-editor')`, 'editor mounted')
  await sleep(800)

  await openFile(transdeck)
  await waitFor(`${store}.slides[0]?.sourceId === '2652176'`, 'research-transdeck imported')
  const transdeckState = await evaluate(`(() => { const s = ${store}; return {
    order: s.slides.map(slide => slide.sourceId),
    effects: s.slides.map(slide => slide.transition?.effect),
    ratio: s.viewportRatio,
    hasSource: !!s.keynoteSourceBase64,
  } })()`)
  expect(JSON.stringify(transdeckState.order) === JSON.stringify(['2652176', '2652475', '2652599']), `slide order ${JSON.stringify(transdeckState.order)}`)
  expect(JSON.stringify(transdeckState.effects) === JSON.stringify(['apple:dissolve', 'apple:3D-cube', 'none']), `effects ${JSON.stringify(transdeckState.effects)}`)
  expect(Math.abs(transdeckState.ratio - 0.5625) < 1e-6, `viewport ratio ${transdeckState.ratio}`)
  expect(transdeckState.hasSource, 'source archive kept for export')

  await openFile(fixture)
  await waitFor(`${store}.slides.length === 2 && ${store}.slides[0]?.sourceId === '2652176' && ${store}.slides[0].elements.some(element => element.type === 'text')`, 'twoslides imported')
  const texts = await evaluate(`${store}.slides.map(slide => slide.elements.filter(element => element.type === 'text').map(element => element.sourceSnapshot.text))`)
  expect(JSON.stringify(texts) === JSON.stringify([['First'], ['Second']]), `texts ${JSON.stringify(texts)}`)
  const rendered = await evaluate(`[...document.querySelectorAll('.editable-element-text, .base-element-text')].map(el => el.textContent.trim()).filter(Boolean)`)
  expect(rendered.includes('First'), `canvas renders the imported text (${JSON.stringify(rendered)})`)

  await evaluate(`document.querySelector('.editor-header').__vueParentComponent.exposed.executeCommand('file.export.keynote')`)
  await waitFor(`!!document.querySelector('.export-keynote-dialog')`, 'export dialog open')
  const banner = await evaluate(`document.querySelector('.export-keynote-dialog .status-title').textContent.trim()`)
  expect(banner === 'Edits go back into the original Keynote file', `export banner: ${banner}`)
  expect(await evaluate(`!!document.querySelector('.export-keynote-dialog .radio-group')`), 'slide range is available for native source exports')

  await evaluate(`document.querySelector('.export-keynote-dialog .btn.close').click()`)
  const main = `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('main')`
  await evaluate(`(() => { const s = ${store}; const m = ${main}; m.setActiveElementIdList([s.slides[0].elements.find(element => element.type === 'text').id]); m.setInspectorMode('animate') })()`)
  await waitFor(`!!document.querySelector('.element-animation-btn')`, 'object build inspector')
  await evaluate(`document.querySelector('.element-animation-btn').click()`)
  await waitFor(`!!document.querySelector('[data-build-effect="apple:bc-appear"]')`, 'native build gallery')
  await evaluate(`document.querySelector('[data-build-effect="apple:bc-appear"]').click()`)
  await waitFor(`${store}.slides[0].animations?.some(build => build.keynoteEffect === 'apple:bc-appear')`, 'native build selected')
  expect(await evaluate(`${store}.slides[0].animations[0].effect === 'fadeIn'`), 'gallery keeps native id and preview effect separately')

  // Exercise the actual export button, bundled theme fetch, browser download and native re-import.
  const downloads = path.join(profile, 'downloads')
  await mkdir(downloads)
  await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
  await evaluate(`(() => { const s = ${store}; s.setKeynoteSourceBase64(null); s.setTitle('Native interchange verification') })()`)
  await evaluate(`document.querySelector('.editor-header').__vueParentComponent.exposed.executeCommand('file.export.keynote')`)
  await waitFor(`!!document.querySelector('.export-keynote-dialog')`, 'new deck export dialog')
  await evaluate(`document.querySelector('.export-keynote-dialog .btn.export').click()`)
  let downloaded
  for (let attempt = 0; attempt < 100; attempt++) {
    downloaded = (await readdir(downloads)).find(name => name.endsWith('.key'))
    if (downloaded) break
    await sleep(150)
  }
  if (!downloaded) throw new Error('Native export did not download a .key file')
  const downloadedPath = path.join(downloads, downloaded)
  const zip = await JSZip.loadAsync(await readFile(downloadedPath))
  zip.remove('Metadata/slate-model.json')
  const nativeOnly = await zip.generateAsync({ type: 'uint8array' })
  const exported = await importKeynoteArchive(nativeOnly.buffer.slice(nativeOnly.byteOffset, nativeOnly.byteOffset + nativeOnly.byteLength), downloaded)
  expect(exported.slides.length === 2, 'new deck download contains two native slides')
  expect(exported.slides[0].elements.some(element => element.sourceSnapshot?.text === 'First'), 'new deck text is stored natively')
  expect(exported.slides[0].animations.some(build => build.keynoteEffect === 'apple:bc-appear'), 'gallery build is stored natively')
  if (!failures.length) {
    const evidence = path.join(repoRoot, 'doc', 'parity-evidence')
    await mkdir(evidence, { recursive: true })
    await copyFile(downloadedPath, path.join(evidence, 'native-interchange-e2e.key'))
    await writeFile(path.join(evidence, 'native-interchange-e2e.json'), JSON.stringify({
      verifiedAt: new Date().toISOString(), nativeSlides: exported.slides.length,
      nativeBuilds: exported.slides.flatMap(slide => slide.animations ?? []).length,
      assertions: ['native File > Open', 'native build gallery', 'source slide range', 'new deck theme load', 'actual export download', 'sidecar removed before re-import'],
      appleOpenValidated: false,
    }, null, 2))
  }

  if (failures.length) {
    console.error(failures.join('\n'))
    process.exitCode = 1
  }
  else console.log('PASS: native import, build gallery, slide ranges, and real native export download/re-import without the bridge')
} finally {
  socket?.close()
  chrome.kill()
  await new Promise(resolve => setTimeout(resolve, 500))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
