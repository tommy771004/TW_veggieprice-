import type { ProducePrice } from './types'

/**
 * Column order of the compact price DTO served by `/api/prices?format=array`.
 *
 * The payload ships `keys` alongside positional rows so the search page can
 * rebuild objects without repeating field names on every record. That makes the
 * key list the actual API contract: a field missing here is a field the client
 * silently receives as `undefined`, which is how `priceChange` used to collapse
 * to 0 on the search page (漲跌幅永遠 0) even though the server computed it.
 *
 * Encoder and decoder both live here so the two sides cannot drift apart.
 */
export const COMPACT_PRICE_KEYS = [
  'cropCode',
  'cropName',
  'marketName',
  'grade',
  'upperPrice',
  'middlePrice',
  'lowerPrice',
  'avgPrice',
  'transWeight',
  'date',
  'priceChange',
] as const

export type CompactPriceKey = (typeof COMPACT_PRICE_KEYS)[number]

export type CompactPriceRow = (string | number)[]

export interface CompactPricePayload {
  keys: string[]
  data: CompactPriceRow[]
}

/** Record shape the encoder accepts — a `ProducePrice` plus the optional
 *  `grade` that only the meat feed carries. */
export type EncodablePriceRecord = ProducePrice & { grade?: string }

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** One decimal place — prices and percentages are quoted to 0.1 upstream. */
function round1(value: unknown): number {
  return Math.round(toNumber(value) * 10) / 10
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

/** Encode records into the positional `{ keys, data }` payload. */
export function toCompactPricePayload(
  records: readonly Partial<EncodablePriceRecord>[],
): CompactPricePayload {
  return {
    keys: [...COMPACT_PRICE_KEYS],
    data: records.map((r) => [
      toText(r.cropCode),
      toText(r.cropName),
      toText(r.marketName),
      toText(r.grade),
      round1(r.upperPrice),
      round1(r.middlePrice),
      round1(r.lowerPrice),
      round1(r.avgPrice),
      Math.round(toNumber(r.transWeight)),
      toText(r.date),
      round1(r.priceChange),
    ]),
  }
}

/**
 * Rebuild records from a `{ keys, data }` payload. Driven by the payload's own
 * `keys` rather than `COMPACT_PRICE_KEYS`, so a client running against an older
 * or newer deploy still decodes whatever columns that server actually sent.
 */
export function fromCompactPricePayload(
  payload: { keys?: unknown; data?: unknown } | null | undefined,
): ProducePrice[] {
  const keys = payload?.keys
  const rows = payload?.data
  if (!Array.isArray(keys) || !Array.isArray(rows)) return []

  return rows.map((row) => {
    const record: Record<string, unknown> = {}
    keys.forEach((key, idx) => {
      if (typeof key !== 'string') return
      record[key] = Array.isArray(row) ? row[idx] : undefined
    })
    return record as unknown as ProducePrice
  })
}

/** True when a JSON body looks like the compact payload rather than a plain array. */
export function isCompactPricePayload(
  json: unknown,
): json is CompactPricePayload {
  if (!json || typeof json !== 'object') return false
  const candidate = json as { keys?: unknown; data?: unknown }
  return Array.isArray(candidate.keys) && Array.isArray(candidate.data)
}
