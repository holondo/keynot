import {
  extractReferenceId,
  firstBytes,
  firstVarint,
  readFloat32LE,
  scanProtoFields,
} from './codec.ts'
import type { NativeIndex } from './document.ts'
import { readColor } from './styles.ts'
import type { Gradient, PPTElementOutline, PPTElementShadow } from '@/types/slides'

/**
 * Keynote shapes: TSD.PathSourceArchive geometry and the inherited
 * TSD.ShapeStyleArchive (3015) / TSWP.ShapeStyleArchive (2025) appearance.
 */

const STYLE_TYPES = { shapeStyle: 3015, textShapeStyle: 2025, slideStyle: 9 } as const

const firstFloat = (message: Uint8Array | undefined, fieldNumber: number): number | undefined => {
  const field = message ? scanProtoFields(message).find(item => item.fieldNumber === fieldNumber && item.fixed32 !== undefined) : undefined
  return field?.fixed32 !== undefined ? readFloat32LE(field.fixed32) : undefined
}

const readPoint = (point: Uint8Array | undefined): [number, number] => [firstFloat(point, 1) ?? 0, firstFloat(point, 2) ?? 0]

const round = (value: number) => Math.round(value * 1000) / 1000

// --- Paths -----------------------------------------------------------------

export interface NativeShapePath {
  viewBox: [number, number]
  path: string
  flipH: boolean
  flipV: boolean
  /** A single open segment: rendered as a stroke only. */
  isLine: boolean
  /** True when the geometry kind is not reproduced exactly. */
  approximated: boolean
}

const roundedRectangle = (width: number, height: number, radius: number) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  if (!r) return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`
  return [
    `M ${r} 0`, `L ${width - r} 0`, `Q ${width} 0 ${width} ${r}`,
    `L ${width} ${height - r}`, `Q ${width} ${height} ${width - r} ${height}`,
    `L ${r} ${height}`, `Q 0 ${height} 0 ${height - r}`,
    `L 0 ${r}`, `Q 0 0 ${r} 0`, 'Z',
  ].join(' ')
}

const polygonPath = (points: [number, number][]) =>
  points.map(([x, y], index) => `${index ? 'L' : 'M'} ${round(x)} ${round(y)}`).join(' ') + ' Z'

const regularPolygon = (width: number, height: number, sides: number) => {
  const count = Math.max(3, Math.round(sides))
  return polygonPath(Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count
    return [width / 2 + (width / 2) * Math.cos(angle), height / 2 + (height / 2) * Math.sin(angle)]
  }))
}

const star = (width: number, height: number, points: number, innerRatio: number) => {
  const count = Math.max(3, Math.round(points))
  const inner = Math.min(1, Math.max(0.05, innerRatio))
  return polygonPath(Array.from({ length: count * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / count
    const radius = index % 2 ? inner : 1
    return [width / 2 + (width / 2) * radius * Math.cos(angle), height / 2 + (height / 2) * radius * Math.sin(angle)]
  }))
}

/** Arrow with head length `point.x` and shaft thickness `point.y` (fraction of height). */
const arrow = (width: number, height: number, head: number, shaft: number, double: boolean, pointsLeft: boolean) => {
  const h = Math.min(Math.max(head, 0), double ? width / 2 : width)
  const top = height * (1 - Math.min(Math.max(shaft, 0.05), 1)) / 2
  const bottom = height - top
  const right: [number, number][] = [[width - h, top], [width - h, 0], [width, height / 2], [width - h, height], [width - h, bottom]]
  const left: [number, number][] = double
    ? [[h, bottom], [h, height], [0, height / 2], [h, 0], [h, top]]
    : [[0, bottom], [0, top]]
  const points = [...right, ...left]
  return polygonPath(pointsLeft ? points.map(([x, y]) => [width - x, y]) : points)
}

const plus = (width: number, height: number, thickness: number) => {
  const tx = Math.min(Math.max(thickness, 1), width) / 2
  const ty = Math.min(Math.max(thickness, 1), height) / 2
  const cx = width / 2
  const cy = height / 2
  return polygonPath([
    [cx - tx, 0], [cx + tx, 0], [cx + tx, cy - ty], [width, cy - ty], [width, cy + ty], [cx + tx, cy + ty],
    [cx + tx, height], [cx - tx, height], [cx - tx, cy + ty], [0, cy + ty], [0, cy - ty], [cx - tx, cy - ty],
  ])
}

const chevron = (width: number, height: number, depth: number) => {
  const d = Math.min(Math.max(depth, 0), width)
  return polygonPath([[0, 0], [width - d, 0], [width, height / 2], [width - d, height], [0, height], [d, height / 2]])
}

/** TSP.Path: moveTo 1, lineTo 2, quadCurveTo 3, curveTo 4, closeSubpath 5. */
const tspPathToSvg = (path: Uint8Array): { d: string; open: boolean; segments: number } => {
  const commands: string[] = []
  let open = true
  let segments = 0
  for (const elementField of scanProtoFields(path)) {
    if (elementField.fieldNumber !== 1 || !elementField.bytes) continue
    const type = firstVarint(elementField.bytes, 1)
    const points = scanProtoFields(elementField.bytes).filter(field => field.fieldNumber === 2 && field.bytes).map(field => readPoint(field.bytes).map(round).join(' '))
    if (type === 1 && points[0]) commands.push(`M ${points[0]}`)
    else if (type === 2 && points[0]) {
      commands.push(`L ${points[0]}`)
      segments++
    }
    else if (type === 3 && points.length >= 2) {
      commands.push(`Q ${points[0]} ${points[1]}`)
      segments++
    }
    else if (type === 4 && points.length >= 3) {
      commands.push(`C ${points[0]} ${points[1]} ${points[2]}`)
      segments++
    }
    else if (type === 5) {
      commands.push('Z')
      open = false
    }
  }
  return { d: commands.join(' '), open, segments }
}

/** TSD.EditableBezierPathSourceArchive: subpaths of nodes with in/out control points. */
const editableBezierToSvg = (source: Uint8Array): { d: string; open: boolean; segments: number } => {
  const commands: string[] = []
  let open = true
  let segments = 0
  for (const subpathField of scanProtoFields(source)) {
    if (subpathField.fieldNumber !== 1 || !subpathField.bytes) continue
    const nodes = scanProtoFields(subpathField.bytes)
      .filter(field => field.fieldNumber === 1 && field.bytes)
      .map(field => ({
        in: readPoint(firstBytes(field.bytes, 1)),
        point: readPoint(firstBytes(field.bytes, 2)),
        out: readPoint(firstBytes(field.bytes, 3)),
      }))
    if (!nodes.length) continue
    const closed = firstVarint(subpathField.bytes, 2) === 1
    const fmt = (point: [number, number]) => point.map(round).join(' ')
    commands.push(`M ${fmt(nodes[0].point)}`)
    const count = closed ? nodes.length : nodes.length - 1
    for (let index = 0; index < count; index++) {
      const from = nodes[index]
      const to = nodes[(index + 1) % nodes.length]
      commands.push(`C ${fmt(from.out)} ${fmt(to.in)} ${fmt(to.point)}`)
      segments++
    }
    if (closed) {
      commands.push('Z')
      open = false
    }
  }
  return { d: commands.join(' '), open, segments }
}

/** Largest x and y the path reaches (control points included), as a viewBox. */
const pathExtent = (d: string, fallback: [number, number]): [number, number] => {
  // Curves are sampled: control points can lie outside the drawn outline.
  const tokens = d.split(' ')
  let width = 0
  let height = 0
  let current: [number, number] = [0, 0]
  const include = ([x, y]: [number, number]) => {
    width = Math.max(width, x)
    height = Math.max(height, y)
  }
  const take = (index: number): [number, number] => [Number(tokens[index]), Number(tokens[index + 1])]
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index]
    if (command === 'M' || command === 'L') {
      current = take(index + 1)
      include(current)
      index += 3
    }
    else if (command === 'Q' || command === 'C') {
      const controls = command === 'Q' ? [take(index + 1)] : [take(index + 1), take(index + 3)]
      const end = take(index + (command === 'Q' ? 3 : 5))
      const points = [current, ...controls, end]
      for (let step = 1; step <= 16; step++) {
        const t = step / 16
        // De Casteljau evaluation of the quadratic or cubic segment.
        let level = points
        while (level.length > 1) level = level.slice(1).map((point, i) => [level[i][0] + (point[0] - level[i][0]) * t, level[i][1] + (point[1] - level[i][1]) * t] as [number, number])
        include(level[0])
      }
      current = end
      index += command === 'Q' ? 5 : 7
    }
    else index++
  }
  return [width > 0 ? round(width) : fallback[0], height > 0 ? round(height) : fallback[1]]
}

const naturalSize = (size: Uint8Array | undefined, fallback: [number, number]): [number, number] => {
  const [width, height] = readPoint(size)
  return width > 0 && height > 0 ? [width, height] : fallback
}

/**
 * SVG path for a TSD.ShapeArchive.pathsource, in the shape's natural size.
 * `frameSize` (native points) is the fallback when no natural size is stored.
 */
export const readShapePath = (pathSource: Uint8Array | undefined, frameSize: [number, number]): NativeShapePath => {
  const flipH = firstVarint(pathSource, 1) === 1
  const flipV = firstVarint(pathSource, 2) === 1
  const rectangle = (approximated: boolean): NativeShapePath => ({
    viewBox: frameSize, path: roundedRectangle(frameSize[0], frameSize[1], 0), flipH, flipV, isLine: false, approximated,
  })
  if (!pathSource) return rectangle(false)

  const scalarSource = firstBytes(pathSource, 4)
  if (scalarSource) {
    const [width, height] = naturalSize(firstBytes(scalarSource, 3), frameSize)
    const type = firstVarint(scalarSource, 1) ?? 0
    const scalar = firstFloat(scalarSource, 2) ?? 0
    const path = type === 1 ? regularPolygon(width, height, scalar) : type === 2 ? chevron(width, height, scalar) : roundedRectangle(width, height, scalar)
    return { viewBox: [width, height], path, flipH, flipV, isLine: false, approximated: false }
  }

  const pointSource = firstBytes(pathSource, 3)
  if (pointSource) {
    const [width, height] = naturalSize(firstBytes(pointSource, 3), frameSize)
    const type = firstVarint(pointSource, 1) ?? 0
    const [x, y] = readPoint(firstBytes(pointSource, 2))
    const path = type === 100
      ? star(width, height, x, y)
      : type === 200
        ? plus(width, height, x)
        : arrow(width, height, x, y, type === 10, type === 0)
    return { viewBox: [width, height], path, flipH, flipV, isLine: false, approximated: true }
  }

  const bezierSource = firstBytes(pathSource, 5)
  const editableSource = firstBytes(pathSource, 8)
  const converted = bezierSource && firstBytes(bezierSource, 3)
    ? { ...tspPathToSvg(firstBytes(bezierSource, 3)!), size: firstBytes(bezierSource, 2) }
    : editableSource
      ? { ...editableBezierToSvg(editableSource), size: firstBytes(editableSource, 2) }
      : null
  if (converted?.d) {
    // Keynote stretches the path's own bounds to the frame; the natural size only
    // matters for a straight line, whose bounds are flat in one direction.
    return {
      viewBox: pathExtent(converted.d, naturalSize(converted.size, frameSize)),
      path: converted.d,
      flipH,
      flipV,
      isLine: converted.open && converted.segments <= 1,
      approximated: false,
    }
  }
  // Callouts and connection lines are drawn as their bounding box until mapped.
  return rectangle(true)
}

// --- Styles ----------------------------------------------------------------

export interface NativeShapeStyle {
  fill?: string
  gradient?: Gradient
  outline?: PPTElementOutline
  opacity?: number
  shadow?: PPTElementShadow
  /** The style draws nothing: no fill and no stroke. */
  invisible: boolean
  hasLineEnds: boolean
}

interface StyleLayers {
  fill?: Uint8Array
  stroke?: Uint8Array
  opacity?: number
  shadow?: Uint8Array
  hasLineEnds: boolean
}

/** Gradient stops in TSD order; Keynote angles are counter-clockwise from the x-axis. */
const readGradient = (gradient: Uint8Array, angle: number | undefined): Gradient | undefined => {
  const colors = scanProtoFields(gradient)
    .filter(field => field.fieldNumber === 2 && field.bytes)
    .map(field => ({ color: readColor(firstBytes(field.bytes, 1)) ?? 'rgb(0, 0, 0)', pos: Math.round((firstFloat(field.bytes, 2) ?? 0) * 100) }))
  if (colors.length < 2) return undefined
  return {
    type: firstVarint(gradient, 1) === 1 ? 'radial' : 'linear',
    colors,
    rotate: Math.round(90 - (angle ?? 0)),
  }
}

export interface FillResult {
  color?: string
  gradient?: Gradient
  imageDataId?: number | null
  imageTechnique?: number
}

/** TSD.FillArchive: colour, gradient or image. */
export const readFill = (fill: Uint8Array | undefined): FillResult => {
  if (!fill) return {}
  const color = readColor(firstBytes(fill, 1))
  if (color) return { color }
  const gradient = firstBytes(fill, 2)
  if (gradient) {
    // TSD.AngleGradientArchive.gradientangle, in radians.
    const angle = firstFloat(firstBytes(gradient, 5), 2)
    const result = readGradient(gradient, angle !== undefined ? angle * 180 / Math.PI : undefined)
    if (result) return { gradient: result, color: result.colors[0].color }
  }
  const image = firstBytes(fill, 3)
  if (image) return { imageDataId: extractReferenceId(firstBytes(image, 6)), imageTechnique: firstVarint(image, 2) ?? 0 }
  return {}
}

const readShadow = (shadow: Uint8Array | undefined, scale: number): PPTElementShadow | undefined => {
  if (!shadow || firstVarint(shadow, 6) === 0) return undefined
  const angle = ((firstFloat(shadow, 2) ?? 315) * Math.PI) / 180
  const offset = (firstFloat(shadow, 3) ?? 5) * scale
  const opacity = firstFloat(shadow, 5) ?? 1
  const base = readColor(firstBytes(shadow, 1)) ?? 'rgb(0, 0, 0)'
  const rgb = base.match(/\d+(\.\d+)?/g)?.slice(0, 3).join(', ') ?? '0, 0, 0'
  return {
    h: round(offset * Math.cos(angle)),
    v: round(-offset * Math.sin(angle)),
    blur: round((firstVarint(shadow, 4) ?? 1) * scale),
    color: `rgba(${rgb}, ${round(opacity)})`,
  }
}

export interface ShapeStyleResolver {
  shape: (styleId: number | null, scale: number) => NativeShapeStyle
  slideFill: (styleId: number | null) => FillResult
}

export const createShapeStyleResolver = (index: NativeIndex): ShapeStyleResolver => {
  const layersCache = new Map<number, StyleLayers>()

  /** Properties and StyleArchive of TSD (3015) and TSWP (2025) shape styles. */
  const unwrap = (record: { type: number; data: Uint8Array }) => {
    if (record.type === STYLE_TYPES.shapeStyle) return { properties: firstBytes(record.data, 11), style: firstBytes(record.data, 1), media: false }
    if (record.type === 3016) return { properties: firstBytes(record.data, 11), style: firstBytes(record.data, 1), media: true }
    if (record.type === STYLE_TYPES.textShapeStyle) {
      const inner = firstBytes(record.data, 1)
      return { properties: firstBytes(inner, 11), style: firstBytes(inner, 1), media: false }
    }
    return null
  }

  const layers = (styleId: number | null, depth = 0): StyleLayers => {
    if (styleId === null || depth > 32) return { hasLineEnds: false }
    const cached = layersCache.get(styleId)
    if (cached) return cached
    const record = index.objects.get(styleId)
    const parts = record ? unwrap(record) : null
    if (!parts) return { hasLineEnds: false }
    const parent = layers(extractReferenceId(firstBytes(parts.style, 3)), depth + 1)
    const own = parts.properties
    const result: StyleLayers = {
      fill: parts.media ? undefined : firstBytes(own, 1) ?? parent.fill,
      stroke: firstBytes(own, parts.media ? 1 : 2) ?? parent.stroke,
      opacity: firstFloat(own, parts.media ? 2 : 3) ?? parent.opacity,
      shadow: firstBytes(own, parts.media ? 3 : 4) ?? parent.shadow,
      hasLineEnds: parent.hasLineEnds || (!parts.media && (!!firstBytes(own, 6) || !!firstBytes(own, 7))),
    }
    layersCache.set(styleId, result)
    return result
  }

  const slideFill = (styleId: number | null, depth = 0): FillResult => {
    if (styleId === null || depth > 32) return {}
    const record = index.objects.get(styleId)
    if (!record || record.type !== STYLE_TYPES.slideStyle) return {}
    const own = firstBytes(firstBytes(record.data, 11), 1)
    return own ? readFill(own) : slideFill(extractReferenceId(firstBytes(firstBytes(record.data, 1), 3)), depth + 1)
  }

  return {
    shape: (styleId, scale) => {
      const resolved = layers(styleId)
      const fill = readFill(resolved.fill)
      const stroke = resolved.stroke
      const strokePattern = firstVarint(firstBytes(stroke, 6), 1)
      const strokeColor = readColor(firstBytes(stroke, 1))
      const strokeWidth = firstFloat(stroke, 2) ?? 0
      const hasStroke = !!stroke && strokePattern !== 2 && !!strokeColor && strokeWidth > 0
      const dashed = strokePattern === 0 && scanProtoFields(firstBytes(stroke, 6) ?? new Uint8Array()).some(field => field.fieldNumber === 4)
      return {
        fill: fill.color,
        gradient: fill.gradient,
        outline: hasStroke ? { width: round(strokeWidth * scale), color: strokeColor, style: dashed ? 'dashed' : 'solid' } : undefined,
        opacity: resolved.opacity !== undefined && resolved.opacity < 1 ? round(resolved.opacity) : undefined,
        shadow: readShadow(resolved.shadow, scale),
        invisible: !fill.color && !fill.gradient && !hasStroke,
        hasLineEnds: resolved.hasLineEnds,
      }
    },
    slideFill: styleId => slideFill(styleId),
  }
}
