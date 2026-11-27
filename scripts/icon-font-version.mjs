// Cache-busting version for the self-hosted icon font.
// Shared by scripts/sync-icon-font.mjs (writes it) and scripts/icon-font.test.js (checks it).
import { createHash } from 'node:crypto'

export const FONT_URL_PATH = '/fonts/material-symbols-outlined.woff2'
/** Files that reference the font URL; each must carry the current ?v=. */
export const FONT_URL_FILES = ['src/app/globals.css', 'src/app/layout.tsx']
/** The font URL with or without an existing ?v= query. */
export const FONT_URL_RE = /\/fonts\/material-symbols-outlined\.woff2(?:\?v=[0-9a-f]+)?/g

/** First 10 hex chars of the font's SHA-256. */
export function fontVersion(bytes) {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 10)
}
