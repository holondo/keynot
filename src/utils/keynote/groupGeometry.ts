import type { ParsedGeometry } from './document.ts'

export type NativeMatrix = [number, number, number, number, number, number]
export interface GroupContext { matrix: NativeMatrix; rotation: number; groupId: string; nativeId: string; depth: number }
const multiply = (a: NativeMatrix, b: NativeMatrix): NativeMatrix => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
]
export const groupContext = (id: number, frame: ParsedGeometry, parent?: GroupContext): GroupContext => {
  const angle = frame.angle * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle)
  const cx = frame.width / 2, cy = frame.height / 2
  const own: NativeMatrix = [cos, sin, -sin, cos, frame.x + cx - cos * cx + sin * cy, frame.y + cy - sin * cx - cos * cy]
  return { matrix: parent ? multiply(parent.matrix, own) : own, rotation: (parent?.rotation ?? 0) + frame.angle, groupId: parent?.groupId ?? `key-group-${id}`, nativeId: String(id), depth: (parent?.depth ?? 0) + 1 }
}
export const groupFrameToSlide = (frame: ParsedGeometry, context?: GroupContext): ParsedGeometry => {
  if (!context) return frame
  const [a, b, c, d, e, f] = context.matrix
  const x = frame.x + frame.width / 2, y = frame.y + frame.height / 2
  return { ...frame, x: a * x + c * y + e - frame.width / 2, y: b * x + d * y + f - frame.height / 2, angle: frame.angle + context.rotation }
}
