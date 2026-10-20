/** Reproducible native artifact for independent schema and Apple-open validation. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PPTElement, Slide } from '../src/types/slides.ts'
import { buildNativeKeynoteArchive } from '../src/utils/keynoteImporter.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const elements: PPTElement[] = [
  { id: 'title', type: 'text', name: 'Native title', left: 65, top: 48, width: 850, height: 100, rotate: 0, defaultFontName: 'Arial', defaultColor: '#ffffff', content: '<p><strong style="font-size:44px;color:#ffffff">KeyNot ↔ Keynote</strong></p><p><span style="font-size:20px;color:#c4d7ff">Editable native objects and builds</span></p>' },
  { id: 'triangle', type: 'shape', name: 'Editable triangle', left: 80, top: 225, width: 210, height: 160, rotate: 0, groupId: 'visuals', viewBox: [100, 100], path: 'M50 0 L100 100 L0 100 Z', fill: '#38bdf8', fixedRatio: false },
  { id: 'square', type: 'shape', name: 'Editable rectangle', left: 335, top: 225, width: 210, height: 160, rotate: 0, groupId: 'visuals', viewBox: [100, 100], path: 'M0 0 L100 0 L100 100 L0 100 Z', fill: '#a78bfa', outline: { width: 3, color: '#ffffff', style: 'solid' }, fixedRatio: false },
  { id: 'note', type: 'text', name: 'Editable body', left: 620, top: 235, width: 300, height: 140, rotate: 0, defaultFontName: 'Arial', defaultColor: '#ffffff', content: '<p style="text-align:center"><span style="font-size:24px;color:#ffffff">Native text</span></p><p style="text-align:center"><em style="font-size:20px;color:#c4d7ff">Character and paragraph styles</em></p>' },
]
const first: Slide = {
  id: 'first', elements, background: { type: 'solid', color: '#11213d' },
  remark: '<p>Confirm that text and shapes remain editable in Apple Keynote.</p><p>Play the build and advance to the next slide.</p>',
  transition: { effect: 'apple:push', duration: 700, direction: 12, startMode: 'click', delay: 0 },
  animations: [{ id: 'title-in', elId: 'title', keynoteEffect: 'apple:dissolve character', effect: 'fadeIn', type: 'in', duration: 700, trigger: 'click' }],
}
const second = structuredClone(first)
second.id = 'second'
second.elements = second.elements.map(element => ({ ...element, id: `${element.id}-2`, left: element.left + 10 }))
second.animations = [{ id: 'rotate', elId: 'square-2', keynoteEffect: 'apple:action-rotation', effect: 'actionRotate', type: 'action', duration: 900, trigger: 'click', actionParams: { rotate: 30 } }]
second.transition = { effect: 'apple:dissolve', duration: 600, startMode: 'click', delay: 0 }
const result = await buildNativeKeynoteArchive([first, second], 'Native Keynote interchange showcase', null, 1000, new Uint8Array(fs.readFileSync(path.join(root, 'src/assets/keynote/seed.key'))))
const directory = path.join(root, 'doc/parity-evidence')
fs.mkdirSync(directory, { recursive: true })
fs.writeFileSync(path.join(directory, 'native-interchange-showcase.key'), Buffer.from(await result.blob.arrayBuffer()))
fs.writeFileSync(path.join(directory, 'native-interchange-showcase.json'), JSON.stringify({ generatedAt: new Date().toISOString(), report: result.report, appleOpenValidated: false }, null, 2))
if (result.report.keynotOnly.length) throw new Error(`Showcase has ${result.report.keynotOnly.length} non-native features`)
console.log('PASS: generated two native slides with editable text, vectors, groups, notes, transitions and builds')
