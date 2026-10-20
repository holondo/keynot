import type { ChartData, ChartType, PPTChartElement } from '@/types/slides'
import { type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeDoubleField, firstBytes, firstDouble, firstVarint, scanProtoFields, upsertProtoField } from './codec.ts'

const strings = (message: Uint8Array, number: number) => scanProtoFields(message).filter(field => field.fieldNumber === number && field.bytes).map(field => new TextDecoder().decode(field.bytes!))
const TYPES: Record<number, ChartType> = { 1: 'bar', 2: 'column', 3: 'line', 4: 'area', 5: 'pie', 6: 'bar', 7: 'column', 8: 'area', 9: 'scatter', 12: 'bar', 13: 'column', 14: 'line', 15: 'area', 16: 'pie', 17: 'bar', 18: 'column', 19: 'area', 25: 'ring', 26: 'ring', 27: 'radar' }
const NATIVE_TYPES: Record<ChartType, number> = { bar: 1, column: 2, line: 3, area: 4, pie: 5, scatter: 9, ring: 25, radar: 27 }
const fields = (message: Uint8Array, number: number) => scanProtoFields(message).filter(field => field.fieldNumber === number && field.bytes).map(field => field.bytes!)

export const chartFingerprint = (chart: PPTChartElement) => JSON.stringify([chart.chartType, chart.data, chart.options])

export const readNativeChart = (record: IWAObjectRecord): { chartType: ChartType; data: ChartData; options: { stack: boolean }; approximated: boolean } | null => {
  const chart = firstBytes(record.data, 10000)
  const grid = firstBytes(chart, 7)
  if (!chart || !grid) return null
  const nativeType = firstVarint(chart, 1) ?? 1
  const labels = strings(grid, 1), legends = strings(grid, 2)
  const rows = fields(grid, 3).map(row => fields(row, 1).map(value => firstDouble(value, 1)))
  if (!labels.length || !legends.length) return null
  return {
    chartType: TYPES[nativeType] ?? 'bar',
    data: { labels, legends, series: legends.map((_name, column) => labels.map((_label, row) => rows[row]?.[column] ?? 0)) },
    options: { stack: [6, 7, 8, 17, 18, 19].includes(nativeType) },
    approximated: !TYPES[nativeType] || nativeType >= 10 || rows.some(row => row.some(value => value === undefined)),
  }
}

export const patchNativeChart = (payload: Uint8Array, element: PPTChartElement): Uint8Array | null => {
  if (!element.sourceSnapshot || chartFingerprint(element) === element.sourceSnapshot.chart) return null
  let chart = firstBytes(payload, 10000)
  if (!chart) return null
  const { labels, legends, series } = element.data
  const grid = concatBytes([
    ...labels.map(name => bytes(1, new TextEncoder().encode(name))),
    ...legends.map(name => bytes(2, new TextEncoder().encode(name))),
    ...labels.map((_label, row) => bytes(3, concatBytes(legends.map((_legend, column) => {
      const value = series[column]?.[row]
      return bytes(1, Number.isFinite(value) ? encodeDoubleField(1, value) : new Uint8Array())
    })))),
  ])
  chart = upsertProtoField(chart, 7, grid)
  const previous = element.sourceSnapshot.chart ? JSON.parse(element.sourceSnapshot.chart) as [ChartType, unknown, { stack?: boolean }] : undefined
  if (!previous || previous[0] !== element.chartType || previous[2]?.stack !== element.options?.stack) {
    let type = NATIVE_TYPES[element.chartType]
    if (element.options?.stack) type = ({ bar: 6, column: 7, area: 8 } as Partial<Record<ChartType, number>>)[element.chartType] ?? type
    chart = upsertProtoField(chart, 1, type)
  }
  chart = upsertProtoField(chart, 24, 1)
  return upsertProtoField(payload, 10000, chart)
}
