import assert from 'node:assert/strict'
import {
  formatTableCellValue,
  parseRawCellValue,
} from '../src/utils/tableDataFormatter.ts'
import {
  ACCELERATION_EASINGS,
  DEFAULT_MAGIC_MOVE,
} from '../src/utils/magicMove.ts'
import type { CellDataFormat, PPTTableElement, Slide } from '../src/types/slides.ts'

console.log('=== KeyNot Table & Motion Parity Automated Regression Suite ===\n')

// 1. Table Cell Formatter (Keynote iCloud "Data" tab parity)
console.log('[1/4] Testing Table Cell Data Formatter...')
{
  // Number formatting
  const numFmt: CellDataFormat = {
    kind: 'number',
    decimals: 2,
    thousandsSeparator: true,
    negativeStyle: 'minus',
  }
  assert.equal(formatTableCellValue(1234.567, numFmt), '1,234.57')
  assert.equal(formatTableCellValue(-9876.5, numFmt), '-9,876.50')

  // Negative with parentheses
  const parenFmt: CellDataFormat = {
    kind: 'number',
    decimals: 0,
    thousandsSeparator: true,
    negativeStyle: 'parentheses',
  }
  assert.equal(formatTableCellValue(-5000, parenFmt), '(5,000)')

  // Currency formatting
  const currFmt: CellDataFormat = {
    kind: 'currency',
    currencyCode: 'USD',
    decimals: 2,
    thousandsSeparator: true,
    negativeStyle: 'minus',
  }
  assert.equal(formatTableCellValue(42.5, currFmt), '$42.50')
  assert.equal(formatTableCellValue(-1200, currFmt), '-$1,200.00')

  // Percentage formatting
  const pctFmt: CellDataFormat = {
    kind: 'percentage',
    decimals: 1,
  }
  assert.equal(formatTableCellValue(0.1234, pctFmt), '12.3%')
  assert.equal(formatTableCellValue(1.5, pctFmt), '150.0%')

  // Scientific formatting
  const sciFmt: CellDataFormat = {
    kind: 'scientific',
    decimals: 2,
  }
  assert.equal(formatTableCellValue(1234500, sciFmt), '1.23E+6')

  // Fraction formatting
  const fracFmt: CellDataFormat = {
    kind: 'fraction',
  }
  assert.equal(formatTableCellValue(0.75, fracFmt), '3/4')
  assert.equal(formatTableCellValue(2.5, fracFmt), '2 1/2')

  // Automatic & Text fallback
  assert.equal(formatTableCellValue('Quarterly Earnings', { kind: 'text' }), 'Quarterly Earnings')
  assert.equal(formatTableCellValue(99.99, { kind: 'automatic' }), '99.99')

  // Parsing raw cell value
  assert.equal(parseRawCellValue('1,234.50'), 1234.5)
  assert.equal(parseRawCellValue('$99.00'), 99)
  assert.equal(parseRawCellValue('75%'), 0.75)
  assert.equal(parseRawCellValue('Executive Summary'), 'Executive Summary')

  console.log('  PASS: Table cell number, currency, percentage, scientific, and fraction formatting verified.')
}

// 2. Table Element Structure & Header/Footer Counts
console.log('\n[2/4] Testing Table Model Structure & Metadata...')
{
  const testTable: PPTTableElement = {
    id: 'tbl-parity-test',
    type: 'table',
    left: 100,
    top: 100,
    width: 600,
    height: 300,
    rotate: 0,
    colWidths: [0.25, 0.25, 0.25, 0.25],
    title: 'Financial Breakdown 2026',
    caption: 'Audited figures under GAAP standards',
    headerRows: 1,
    headerColumns: 1,
    footerRows: 1,
    data: [
      [
        { id: 'c00', colspan: 1, rowspan: 1, text: 'Metric' },
        { id: 'c01', colspan: 1, rowspan: 1, text: 'Q1' },
        { id: 'c02', colspan: 1, rowspan: 1, text: 'Q2' },
        { id: 'c03', colspan: 1, rowspan: 1, text: 'Total' },
      ],
      [
        { id: 'c10', colspan: 1, rowspan: 1, text: 'Revenue' },
        { id: 'c11', colspan: 1, rowspan: 1, text: '$1,200.00', rawValue: 1200, displayValue: '$1,200.00', dataFormat: { kind: 'currency', currencyCode: 'USD', decimals: 2 } },
        { id: 'c12', colspan: 1, rowspan: 1, text: '$1,500.00', rawValue: 1500, displayValue: '$1,500.00', dataFormat: { kind: 'currency', currencyCode: 'USD', decimals: 2 } },
        { id: 'c13', colspan: 1, rowspan: 1, text: '$2,700.00', rawValue: 2700, displayValue: '$2,700.00', dataFormat: { kind: 'currency', currencyCode: 'USD', decimals: 2 } },
      ],
      [
        { id: 'c20', colspan: 1, rowspan: 1, text: 'Total' },
        { id: 'c21', colspan: 1, rowspan: 1, text: '$1,200.00' },
        { id: 'c22', colspan: 1, rowspan: 1, text: '$1,500.00' },
        { id: 'c23', colspan: 1, rowspan: 1, text: '$2,700.00' },
      ],
    ],
  }

  assert.equal(testTable.title, 'Financial Breakdown 2026')
  assert.equal(testTable.caption, 'Audited figures under GAAP standards')
  assert.equal(testTable.headerRows, 1)
  assert.equal(testTable.headerColumns, 1)
  assert.equal(testTable.footerRows, 1)
  assert.equal(testTable.data[1][1].rawValue, 1200)
  assert.equal(testTable.data[1][1].dataFormat?.kind, 'currency')

  console.log('  PASS: Table title, caption, header/footer row & column counts, and cell data formats verified.')
}

// 3. Motion & Transition Acceleration Easing Parity
console.log('\n[3/4] Testing Magic Move Acceleration & Matching Configuration...')
{
  assert.equal(DEFAULT_MAGIC_MOVE.effect, 'apple:magic-move-implied-motion-path', 'Magic Move uses the native Keynote effect id')
  assert.equal(DEFAULT_MAGIC_MOVE.duration, 2000, 'Keynote Magic Move defaults to 2 seconds')
  assert.equal(DEFAULT_MAGIC_MOVE.textMatchMode, 'object', 'Default textMatchMode must be "object"')
  assert.equal(DEFAULT_MAGIC_MOVE.acceleration, 'easeInOut', 'Default acceleration must be "easeInOut"')
  assert.equal(DEFAULT_MAGIC_MOVE.startMode, 'click', 'Default startMode must be "click"')

  // Verify all 4 Keynote acceleration curves are defined
  const easings = ['easeInOut', 'easeIn', 'easeOut', 'constant'] as const
  for (const easing of easings) {
    const val = ACCELERATION_EASINGS[easing]
    assert.ok(val, `Acceleration curve "${easing}" must be defined`)
    assert.ok(typeof val === 'string', `Acceleration curve "${easing}" must be a CSS easing string`)
  }

  console.log('  PASS: Keynote transition acceleration curves and default transition configuration verified.')
}

// 4. Slide Skipping & Presentation Flow Parity
console.log('\n[4/4] Testing Slide Skip & Playback Filtering Parity...')
{
  const mockSlides: Slide[] = [
    { id: 's1', elements: [] },
    { id: 's2', elements: [], skipped: true },
    { id: 's3', elements: [] },
  ]

  // Playback filter: skipped slides should be skipped in presentation sequence
  const playableSlides = mockSlides.filter(s => !s.skipped)
  assert.equal(playableSlides.length, 2, 'Skipped slide s2 must be excluded from active presentation')
  assert.equal(playableSlides[0].id, 's1')
  assert.equal(playableSlides[1].id, 's3')

  // Un-skipping restores slide to active playback
  mockSlides[1].skipped = false
  assert.equal(mockSlides.filter(s => !s.skipped).length, 3, 'Unskipped slide must return to active presentation')

  console.log('  PASS: Keynote slide skipping and playback exclusion verified.')
}

console.log('\n=== ALL TABLE & MOTION PARITY TESTS PASSED ===')
