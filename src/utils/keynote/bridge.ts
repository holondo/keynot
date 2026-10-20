import type {
  Slide,
} from '@/types/slides'
import {
  concatBytes,
} from './codec.ts'

export const KEYNOT_VIEWPORT_SIZE = 1000
export const BRIDGE_FORMAT = 'slate-keynote-bridge'
export const BRIDGE_PATH = 'Metadata/slate-model.json'

export const toHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')

/**
 * Digest of native entries (IWA and, for bridge v4, media assets). The bridge is only trusted when the
 * native records are exactly the ones KeyNot wrote; otherwise Keynote (or another
 * tool) changed the document after export and the native records win.
 */
export const digestNativeEntries = async (entries: [string, Uint8Array][]): Promise<string> => {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  for (const [path, bytes] of [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    parts.push(encoder.encode(`${path}\n${bytes.length}\n`), bytes)
  }
  return toHex(await crypto.subtle.digest('SHA-256', concatBytes(parts)))
}

export interface BridgePayload {
  format: string
  version: number
  title?: string
  nativeDigest?: string
  slides: Slide[]
}
