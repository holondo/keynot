import assert from 'node:assert/strict'
import {
  formatCSSFilter,
  createFilterValue,
  parseFilterSliderValue,
  getAutoEnhanceFilters,
  calculateResetMask,
  createShapeMask,
} from '../src/utils/imageAdjustments.ts'
import type { PPTImageElement, ImageElementFilters } from '../src/types/slides.ts'

console.log('=== KeyNot Image Tools — Test-Driven Development (TDD) Suite ===\n')

// 1. Test Filter Value Creation (units and baseline offsets)
console.log('[1/5] Testing Filter Value Conversion & CSS Units...')
{
  // Brightness / Exposure (baseline 100%)
  assert.equal(createFilterValue('brightness', 0), '100%', '0% exposure should result in 100% brightness (normal)')
  assert.equal(createFilterValue('brightness', 15), '115%', '+15% exposure should be 115% brightness')
  assert.equal(createFilterValue('brightness', -20), '80%', '-20% exposure should be 80% brightness')

  // Contrast (baseline 100%)
  assert.equal(createFilterValue('contrast', 0), '100%', '0% contrast adjustment should be 100% contrast')
  assert.equal(createFilterValue('contrast', 25), '125%', '+25% contrast adjustment should be 125% contrast')
  assert.equal(createFilterValue('contrast', -30), '70%', '-30% contrast adjustment should be 70% contrast')

  // Saturation (baseline 100%)
  assert.equal(createFilterValue('saturate', 0), '100%', '0% saturation adjustment should be 100% saturation')
  assert.equal(createFilterValue('saturate', 50), '150%', '+50% saturation should be 150% saturation')
  assert.equal(createFilterValue('saturate', -100), '0%', '-100% saturation should be 0% saturation (grayscale)')

  // Blur (unit MUST be px, not %)
  assert.equal(createFilterValue('blur', 5), '5px', 'Blur unit must be px')
  assert.equal(createFilterValue('blur', 0), '0px', '0 blur should be 0px')

  // Hue-rotate (unit MUST be deg, not %)
  assert.equal(createFilterValue('hue-rotate', 90), '90deg', 'Hue rotate unit must be deg')
  assert.equal(createFilterValue('hue-rotate', 0), '0deg', '0 hue rotate should be 0deg')

  // Opacity (unit %)
  assert.equal(createFilterValue('opacity', 80), '80%', 'Opacity unit must be %')

  console.log('  PASS: CSS units and 100% baselines verified.')
}

// 2. Test Slider Value Parsing (reverse mapping from stored filter string to slider number)
console.log('\n[2/5] Testing Slider Value Parsing from Stored Filters...')
{
  // Relative baseline filters (100% is 0 on slider)
  assert.equal(parseFilterSliderValue('brightness', '100%'), 0, '100% brightness should parse as 0 exposure')
  assert.equal(parseFilterSliderValue('brightness', '120%'), 20, '120% brightness should parse as +20 exposure')
  assert.equal(parseFilterSliderValue('brightness', '75%'), -25, '75% brightness should parse as -25 exposure')
  assert.equal(parseFilterSliderValue('brightness', undefined), 0, 'undefined brightness should parse as 0')

  assert.equal(parseFilterSliderValue('contrast', '110%'), 10, '110% contrast should parse as +10')
  assert.equal(parseFilterSliderValue('contrast', undefined), 0, 'undefined contrast should parse as 0')

  assert.equal(parseFilterSliderValue('saturate', '135%'), 35, '135% saturate should parse as +35')
  assert.equal(parseFilterSliderValue('saturate', '0%'), -100, '0% saturate should parse as -100')

  // Direct unit filters
  assert.equal(parseFilterSliderValue('blur', '8px'), 8, '8px blur should parse as 8')
  assert.equal(parseFilterSliderValue('hue-rotate', '180deg'), 180, '180deg hue should parse as 180')
  assert.equal(parseFilterSliderValue('opacity', '65%'), 65, '65% opacity should parse as 65')
  assert.equal(parseFilterSliderValue('opacity', undefined), 100, 'undefined opacity default should be 100')

  console.log('  PASS: Reverse slider parsing verified.')
}

// 3. Test Full CSS Filter String Generation
console.log('\n[3/5] Testing Full CSS Filter String Generation...')
{
  const testFilters: ImageElementFilters = {
    brightness: '110%',
    contrast: '120%',
    saturate: '105%',
    blur: '3px',
    'hue-rotate': '45deg',
    opacity: '90%',
  }

  const cssString = formatCSSFilter(testFilters)
  assert.ok(cssString.includes('brightness(110%)'), 'Should include valid brightness')
  assert.ok(cssString.includes('contrast(120%)'), 'Should include valid contrast')
  assert.ok(cssString.includes('saturate(105%)'), 'Should include valid saturate')
  assert.ok(cssString.includes('blur(3px)'), 'Should include valid blur with px')
  assert.ok(cssString.includes('hue-rotate(45deg)'), 'Should include valid hue-rotate with deg')
  assert.ok(cssString.includes('opacity(90%)'), 'Should include valid opacity')

  // Empty or neutral filters should produce clean string
  assert.equal(formatCSSFilter({}), '', 'Empty filters should yield empty filter string')
  assert.equal(formatCSSFilter(undefined), '', 'Undefined filters should yield empty filter string')

  console.log('  PASS: CSS filter output string formatted correctly: ' + cssString)
}

// 4. Test Keynote Auto-Enhance Preset
console.log('\n[4/5] Testing Keynote Auto-Enhance Algorithm...')
{
  const enhanced = getAutoEnhanceFilters()
  assert.equal(enhanced.contrast, '115%', 'Auto-Enhance should boost contrast to 115%')
  assert.equal(enhanced.brightness, '105%', 'Auto-Enhance should lift brightness to 105%')
  assert.equal(enhanced.saturate, '110%', 'Auto-Enhance should enrich saturation to 110%')

  // Verify it does NOT darken or washout
  const brightnessNum = parseInt(enhanced.brightness)
  assert.ok(brightnessNum > 100, 'Auto-Enhance brightness must be brighter than 100% baseline')
  const contrastNum = parseInt(enhanced.contrast)
  assert.ok(contrastNum > 100, 'Auto-Enhance contrast must be punchier than 100% baseline')

  console.log('  PASS: Auto-Enhance verified.')
}

// 5. Test Mask Reset & Shape Masking Calculations
console.log('\n[5/5] Testing Keynote Mask Geometry & Reset Calculations...')
{
  // Simulated cropped image: original was 800x600 at left:100, top:100
  // Cropped to center 50%: range [[25, 25], [75, 75]]
  // Resulting in element width: 400, height: 300, left: 300, top: 250
  const mockCroppedImage: PPTImageElement = {
    id: 'test-img-1',
    type: 'image',
    src: 'https://example.com/test.jpg',
    width: 400,
    height: 300,
    left: 300,
    top: 250,
    rotate: 0,
    clip: {
      shape: 'rect',
      range: [[25, 25], [75, 75]],
    },
  }

  const restored = calculateResetMask(mockCroppedImage)
  assert.equal(restored.width, 800, 'Restored width must be 800px')
  assert.equal(restored.height, 600, 'Restored height must be 600px')
  assert.equal(restored.left, 100, 'Restored left must be 100px')
  assert.equal(restored.top, 100, 'Restored top must be 100px')
  assert.equal(restored.clip, undefined, 'Restored clip must be undefined (unmasked)')

  // Shape mask creation
  const circleMask = createShapeMask('ellipse')
  assert.equal(circleMask.shape, 'ellipse', 'Should generate ellipse mask')
  assert.deepEqual(circleMask.range, [[0, 0], [100, 100]], 'Full shape mask range')

  const heartMask = createShapeMask('heart')
  assert.equal(heartMask.shape, 'heart', 'Should generate heart mask')

  console.log('  PASS: Mask reset geometry calculations restored original 800x600 frame accurately.')
}

console.log('\n=== ALL IMAGE TOOL TDD TESTS PASSED ===')
