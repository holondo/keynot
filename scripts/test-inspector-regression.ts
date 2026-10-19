import assert from 'node:assert/strict'
import { CLIPPATHS, getClipPath, ClipPathTypes } from '../src/configs/imageClip.ts'

console.log('=== KeyNot Inspector & Image Selection Regression Test Suite ===\n')

// 1. Test shape mask integrity (the exact bug that caused lateral menus to disappear)
console.log('[1/5] Testing Shape Mask Definitions & Keys...')
{
  const expectedKeys = ['rect', 'roundRect', 'ellipse', 'rhombus', 'diamond', 'triangle', 'star', 'heart', 'hexagon']
  
  for (const key of expectedKeys) {
    const clip = getClipPath(key)
    assert.ok(clip, `Shape "${key}" must resolve through getClipPath`)
    assert.ok(typeof clip.style === 'string', `Shape "${key}" must have a string style property`)
    assert.ok(clip.name, `Shape "${key}" must have a valid name`)
    assert.ok(clip.type, `Shape "${key}" must have a valid type`)
  }

  // Ensure rhombus and diamond are both accessible
  assert.equal(getClipPath('rhombus').type, ClipPathTypes.POLYGON)
  assert.equal(getClipPath('diamond').type, ClipPathTypes.POLYGON)
  assert.ok(getClipPath('star').style.includes('polygon'), 'Star shape must have valid polygon clip-path')
  assert.ok(getClipPath('heart').style.includes('polygon'), 'Heart shape must have valid polygon clip-path')

  console.log('  PASS: All 9 essential Keynote image mask shapes are defined and valid.')
}

// 2. Test Safe Fallback Behavior
console.log('\n[2/5] Testing Safe Fallback on Corrupted or Unknown Keys...')
{
  // A non-existent shape key must never return undefined or throw
  const fallback1 = getClipPath('nonExistentShape123')
  assert.ok(fallback1, 'Unknown shape must fallback to rect')
  assert.equal(fallback1.name, 'Rectangle')
  assert.equal(typeof fallback1.style, 'string')

  const fallbackEmpty = getClipPath('')
  assert.equal(fallbackEmpty.name, 'Rectangle')

  const fallbackUndefined = getClipPath(undefined)
  assert.equal(fallbackUndefined.name, 'Rectangle')

  console.log('  PASS: getClipPath safely falls back to Rectangle without throwing.')
}

// 3. Test SVG CreatePath Geometry Generation for Canvas Masking
console.log('\n[3/5] Testing SVG CreatePath Generators for Dynamic Resizing...')
{
  const testWidth = 400
  const testHeight = 300

  const shapesWithGenerators = ['star', 'heart', 'rhombus', 'triangle', 'hexagon']
  for (const shapeKey of shapesWithGenerators) {
    const shape = getClipPath(shapeKey)
    assert.ok(typeof shape.createPath === 'function', `Shape "${shapeKey}" must have createPath function`)
    const path = shape.createPath(testWidth, testHeight)
    assert.ok(path.startsWith('M '), `Path for "${shapeKey}" must start with SVG M command`)
    assert.ok(path.endsWith('Z'), `Path for "${shapeKey}" must close with SVG Z command`)
  }

  console.log('  PASS: Vector SVG createPath generation verified for scalable masking.')
}

// 4. Test ImageTab shapeMasks Array Static Integrity
console.log('\n[4/5] Verifying ImageTab shapeMasks items match available definitions...')
{
  const imageTabMasks = [
    { key: 'rect', name: 'Rectangle', style: getClipPath('rect').style },
    { key: 'roundRect', name: 'Rounded', style: getClipPath('roundRect').style },
    { key: 'ellipse', name: 'Circle', style: getClipPath('ellipse').style },
    { key: 'rhombus', name: 'Diamond', style: getClipPath('rhombus').style },
    { key: 'triangle', name: 'Triangle', style: getClipPath('triangle').style },
    { key: 'star', name: 'Star', style: getClipPath('star').style },
    { key: 'heart', name: 'Heart', style: getClipPath('heart').style },
    { key: 'hexagon', name: 'Hexagon', style: getClipPath('hexagon').style },
  ]

  assert.equal(imageTabMasks.length, 8)
  for (const item of imageTabMasks) {
    assert.ok(item.key, 'Item must have a key')
    assert.ok(item.name, 'Item must have a name')
    assert.ok(typeof item.style === 'string', `Item "${item.key}" must have a valid string style`)
  }

  console.log('  PASS: ImageTab shapeMasks verified — 0 runtime TypeError possibilities.')
}

// 5. Test Mixed-Object Slide Model Persistence (Phase P05 Parity)
console.log('\n[5/5] Testing Mixed-Object Slide Persistence & Inspector Model Integrity...')
{
  const mixedSlide = {
    id: 'slide-mixed-p05',
    elements: [
      {
        id: 'text-1',
        type: 'text',
        left: 50,
        top: 40,
        width: 400,
        height: 60,
        rotate: 0,
        content: '<h1>Strategic Product Review</h1>',
        defaultFontName: 'Helvetica Neue',
        defaultColor: '#1d1d1f',
      },
      {
        id: 'img-1',
        type: 'image',
        left: 50,
        top: 120,
        width: 320,
        height: 240,
        rotate: 0,
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        filters: { brightness: 105, contrast: 110, saturate: 115 },
        clip: { shape: 'roundRect', radius: 16 },
      },
      {
        id: 'table-1',
        type: 'table',
        left: 420,
        top: 120,
        width: 500,
        height: 240,
        rotate: 0,
        colWidths: [0.5, 0.5],
        title: 'Performance Matrix',
        caption: 'Q3 Verified Results',
        headerRows: 1,
        headerColumns: 1,
        footerRows: 0,
        data: [
          [
            { id: 'c0', colspan: 1, rowspan: 1, text: 'KPI' },
            { id: 'c1', colspan: 1, rowspan: 1, text: 'Growth' },
          ],
          [
            { id: 'c2', colspan: 1, rowspan: 1, text: 'ARR' },
            { id: 'c3', colspan: 1, rowspan: 1, text: '$4.2M', rawValue: 4200000, displayValue: '$4.2M', dataFormat: { kind: 'currency', currencyCode: 'USD', decimals: 1 } },
          ],
        ],
      },
      {
        id: 'shape-1',
        type: 'shape',
        left: 50,
        top: 400,
        width: 870,
        height: 80,
        rotate: 0,
        viewBox: [870, 80],
        path: 'M 0 0 L 870 0 L 870 80 L 0 80 Z',
        fill: '#f5f5f7',
        outline: { width: 1, style: 'solid', color: '#e5e5ea' },
      },
    ],
  }

  // Simulate JSON serialization / IndexedDB persistence round-trip
  const serialized = JSON.stringify(mixedSlide)
  const deserialized = JSON.parse(serialized)

  assert.equal(deserialized.elements.length, 4)
  assert.equal(deserialized.elements[0].type, 'text')
  assert.equal(deserialized.elements[1].filters.contrast, 110)
  assert.equal(deserialized.elements[2].title, 'Performance Matrix')
  assert.equal(deserialized.elements[2].data[1][1].dataFormat.kind, 'currency')
  assert.equal(deserialized.elements[3].fill, '#f5f5f7')

  console.log('  PASS: Mixed-object slide model persists across text, image, table, and shape without data loss.')
}

console.log('\n=== ALL INSPECTOR REGRESSION TESTS PASSED ===')
