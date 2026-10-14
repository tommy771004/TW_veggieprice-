// Title/description for /produce/[id].
//
// GSC showed these pages ranking ~7–8 with CTR under 2% for "今日X價格" queries.
// Putting the actual latest price + date in the snippet answers the query on
// the SERP itself, and colloquial aliases (蒲瓜 for 扁蒲) match what people type.

export interface PricePoint {
  date: string // ISO yyyy-mm-dd
  avgPrice: number | null
}

/** Older than this, a "今日行情" price would mislead — fall back to generic copy. */
const STALE_AFTER_DAYS = 7

function fmt(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(1)
}

function monthDay(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000)
}

function changeText(latest: number, prev: number | undefined): string {
  if (!prev) return ''
  const pct = ((latest - prev) / prev) * 100
  if (pct > 0.05) return `，較前一交易日上漲 ${fmt(pct)}%`
  if (pct < -0.05) return `，較前一交易日下跌 ${fmt(Math.abs(pct))}%`
  return '，與前一交易日持平'
}

export function buildProduceMeta({
  cropName,
  history,
  aliases,
  aliasInTitle,
  today,
}: {
  cropName: string
  history: PricePoint[]
  aliases: string[]
  /** Only when cropName is the formal MOA name (扁蒲) — 高麗菜 needs no 甘藍 tag. */
  aliasInTitle: boolean
  today: string
}): { title: string; description: string } {
  const titleName = aliasInTitle && aliases[0] ? `${cropName}（${aliases[0]}）` : cropName
  const descName = aliases.length > 0 ? `${cropName}（又稱${aliases.join('、')}）` : cropName

  const priced = history.filter((p): p is { date: string; avgPrice: number } =>
    p.avgPrice !== null && p.avgPrice > 0,
  )
  const latest = priced[priced.length - 1]
  const prev = priced[priced.length - 2]

  if (!latest || daysBetween(latest.date, today) > STALE_AFTER_DAYS) {
    return {
      title: `${titleName}價格今日行情・批發價與歷史走勢`,
      description: `即時查詢${descName}全台果菜批發市場價格、漲跌幅與近30日歷史走勢，每日依農業部官方數據更新，助您掌握最佳採購時機。`,
    }
  }

  const price = fmt(latest.avgPrice)
  const date = monthDay(latest.date)
  return {
    title: `${titleName}價格今日行情 ${price}元/公斤（${date}）`,
    description: `${descName}全台批發均價每公斤 ${price} 元（${date}）${changeText(latest.avgPrice, prev?.avgPrice)}。查詢各果菜批發市場${cropName}價格、漲跌幅與近30日歷史走勢，每日依農業部官方數據更新。`,
  }
}
