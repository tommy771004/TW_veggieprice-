import type { ProduceCategory } from './produce'

/**
 * 聯盟／贊助版位設定。
 *
 * 這是「資料驅動」的廣告／聯盟版位。版位資料由外部系統維護的
 * `affiliates` 資料表提供，前端只負責取得資料與套用顯示規則。
 *
 * 完整的註冊流程、欄位說明、資料表與成效查詢 SQL:
 *   見 docs/affiliate-setup.md
 *
 * 點擊與曝光會透過 audit_log 記錄(action: affiliate_click / affiliate_impression),
 * 可用來計算各檔位的點擊數與 CTR(轉換率)。
 *
 * 註:本版位的連結皆為「會帶來收益」的推廣連結,UI 一律加上 rel="sponsored nofollow"
 * 並顯示揭露說明,以符合搜尋引擎建議與廣告揭露規範。
 */

/** 'all' = 不分類別都顯示;其餘對應 getProduceCategory() 的回傳值。 */
export type AffiliateCategory = ProduceCategory | 'all'

export interface AffiliateOffer {
  /** 唯一識別碼,用於 audit 追蹤與成效統計。請勿重複、勿任意更名(會中斷歷史統計)。 */
  id: string
  /** 是否啟用。false 時完全不顯示、不追蹤。 */
  enabled: boolean
  /** true = 付費贊助(顯示「贊助」標籤);false = 一般聯盟推薦(顯示「合作推薦」)。兩者都會加 rel="sponsored"。 */
  sponsored: boolean
  /** 卡片標題。可用 {crop} 代入目前作物名稱。 */
  title: string
  /** 卡片描述。同樣支援 {crop}。 */
  description: string
  /** 行動呼籲按鈕文字,支援 {crop}。 */
  ctaLabel: string
  /** 目標連結(你的聯盟/分潤追蹤網址)。URL 中的 {crop} 會被自動 URL-encode 後代入。 */
  url: string
  /** Material Symbols 圖示名稱(選填)。 */
  icon?: string
  /** 要顯示在哪些作物類別。'all' 代表全部。 */
  categories: AffiliateCategory[]
  /** 選填:僅針對特定作物(以「包含」比對作物名稱),命中者會優先排序。 */
  crops?: string[]
  /** 排序權重,數字越大越前面(預設 0)。 */
  priority?: number
  /** 合作夥伴/商家名稱,顯示於卡片並用於揭露與統計。 */
  partner?: string
}

const VALID_CATEGORIES: ReadonlySet<AffiliateCategory> = new Set([
  'all',
  'vegetable',
  'fruit',
  'mushroom',
  'flower',
  'meat',
  'seafood',
])

/**
 * 將 API 回傳的資料轉成可安全交給 UI 的版位資料。
 * 外部維護系統的單筆髒資料不應讓整個聯盟區塊無法顯示。
 */
export function normalizeAffiliateOffer(value: unknown): AffiliateOffer | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const strings = ['id', 'title', 'description', 'ctaLabel', 'url'] as const
  if (strings.some((key) => typeof row[key] !== 'string' || !row[key])) return null

  const categories = Array.isArray(row.categories)
    ? row.categories.filter(
        (category): category is AffiliateCategory =>
          typeof category === 'string' && VALID_CATEGORIES.has(category as AffiliateCategory),
      )
    : []
  if (categories.length === 0) return null

  try {
    const parsedUrl = new URL(row.url as string)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return null
  } catch {
    return null
  }

  return {
    id: row.id as string,
    enabled: row.enabled === true,
    sponsored: row.sponsored === true,
    title: row.title as string,
    description: row.description as string,
    ctaLabel: row.ctaLabel as string,
    url: row.url as string,
    ...(typeof row.icon === 'string' && row.icon ? { icon: row.icon } : {}),
    categories,
    ...(Array.isArray(row.crops)
      ? { crops: row.crops.filter((crop): crop is string => typeof crop === 'string') }
      : {}),
    priority: typeof row.priority === 'number' && Number.isFinite(row.priority) ? row.priority : 0,
    ...(typeof row.partner === 'string' && row.partner ? { partner: row.partner } : {}),
  }
}

/** 從同網域 API 取得由外部系統維護的啟用中聯盟版位。 */
let affiliateOffersPromise: Promise<AffiliateOffer[]> | null = null

export function fetchAffiliateOffers(): Promise<AffiliateOffer[]> {
  if (!affiliateOffersPromise) {
    affiliateOffersPromise = fetch('/api/affiliates', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return []
        const body: unknown = await response.json()
        const rows =
          body && typeof body === 'object' && Array.isArray((body as { offers?: unknown }).offers)
            ? (body as { offers: unknown[] }).offers
            : []
        return rows.flatMap((row) => {
          const offer = normalizeAffiliateOffer(row)
          return offer ? [offer] : []
        })
      })
      .catch(() => [])
  }
  return affiliateOffersPromise
}

export interface ResolvedOffer extends AffiliateOffer {
  /** 已套入作物名稱、可直接使用的最終連結。 */
  href: string
}

function fillText(text: string, cropName: string): string {
  return text.split('{crop}').join(cropName)
}

function fillUrl(url: string, cropName: string): string {
  return url.split('{crop}').join(encodeURIComponent(cropName))
}

function matchesCrop(offer: AffiliateOffer, cropName: string): boolean {
  return offer.crops?.some((c) => cropName.includes(c)) ?? false
}

/**
 * 依目前作物挑出要顯示的推廣卡片,並把 {crop} 套版完成。
 * 規則:啟用中 + (類別命中 'all'/該類別 或 指定 crops 命中);
 * 排序:指定 crops 命中者優先,其次 priority 由大到小。
 */
export function selectAffiliateOffers(
  offers: readonly AffiliateOffer[],
  cropName: string,
  category: ProduceCategory,
  limit = 6,
): ResolvedOffer[] {
  const eligible = offers.filter((offer) => {
    if (!offer.enabled) return false
    const catMatch = offer.categories.includes('all') || offer.categories.includes(category)
    if (offer.crops && offer.crops.length > 0) {
      return matchesCrop(offer, cropName) || catMatch
    }
    return catMatch
  })

  eligible.sort((a, b) => {
    const aCrop = matchesCrop(a, cropName) ? 1 : 0
    const bCrop = matchesCrop(b, cropName) ? 1 : 0
    if (aCrop !== bCrop) return bCrop - aCrop
    return (b.priority ?? 0) - (a.priority ?? 0)
  })

  return eligible.slice(0, Math.max(0, limit)).map((offer) => ({
    ...offer,
    title: fillText(offer.title, cropName),
    description: fillText(offer.description, cropName),
    ctaLabel: fillText(offer.ctaLabel, cropName),
    href: fillUrl(offer.url, cropName),
  }))
}

/**
 * 不分作物的版位用(首頁/搜尋頁跑馬燈):回傳所有啟用中的檔位,依 priority 排序。
 * 跑馬燈卡片以 partner(商家名)為主,因此 {crop} 會被移除。
 */
export function getMarqueeOffers(offers: readonly AffiliateOffer[]): ResolvedOffer[] {
  return offers.filter((offer) => offer.enabled)
    .slice()
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .map((offer) => ({
      ...offer,
      title: fillText(offer.title, ''),
      description: fillText(offer.description, ''),
      ctaLabel: fillText(offer.ctaLabel, ''),
      href: fillUrl(offer.url, ''),
    }))
}
