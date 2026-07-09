import type { ProduceCategory } from './produce'

/**
 * 聯盟／贊助版位設定。
 *
 * 這是「資料驅動」的廣告／聯盟版位:你只要編輯下方 AFFILIATE_OFFERS 陣列,
 * 就能新增、停用、調整要在「作物詳情頁」輪播的推廣卡片,不需改動任何 UI 程式。
 *
 * 完整的註冊流程、欄位說明、追蹤連結取得方式與成效查詢 SQL:
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

// 「食材類」作物類別(不含花卉),多數生鮮電商適用。
const FOOD: AffiliateCategory[] = ['vegetable', 'fruit', 'mushroom', 'meat', 'seafood']

// ===========================================================================
//  ▼▼▼ 版位設定:請編輯這個陣列 ▼▼▼
//  連結來源:聯盟網 Affiliates.one(linkgo.one / afflink.one)、通路王 iChannels
// ===========================================================================
export const AFFILIATE_OFFERS: AffiliateOffer[] = [
  // ---- 生鮮買菜網(與「查菜價→買菜」情境最相關,優先) ----
  {
    id: 'ich-lidaniang',
    enabled: true,
    sponsored: false,
    title: '上李大娘買菜網買{crop}',
    description: '生鮮蔬果線上選購,宅配到府最方便。',
    ctaLabel: '去買菜',
    url: 'https://igrape.net/3RVKp',
    icon: 'shopping_basket',
    categories: FOOD,
    priority: 9,
    partner: '李大娘買菜網',
  },
  {
    id: 'ich-sevenstore',
    enabled: true,
    sponsored: false,
    title: '七號店舖・線上買{crop}',
    description: '全站生鮮蔬果,輕鬆補貨送到家。',
    ctaLabel: '逛七號店舖',
    url: 'https://pinkrose.info/3RVKr',
    icon: 'shopping_cart',
    categories: FOOD,
    priority: 9,
    partner: '七號店舖',
  },
  {
    id: 'ich-unilohas',
    enabled: true,
    sponsored: false,
    title: '統一生機・有機生機食品',
    description: '有機與健康食材一站購齊,吃得安心。',
    ctaLabel: '逛統一生機',
    url: 'https://greenmall.info/3RVKx',
    icon: 'spa',
    categories: FOOD,
    priority: 8,
    partner: '統一生機',
  },
  {
    id: 'a1-36life',
    enabled: true,
    sponsored: false,
    title: '鮮綠生活・生鮮水產宅配',
    description: '嚴選水產與生鮮食材,產地直送到府。',
    ctaLabel: '前往選購',
    url: 'https://linkgo.one/s/BoVGf',
    icon: 'set_meal',
    categories: FOOD,
    priority: 7,
    partner: '36Life 鮮綠生活',
  },
  {
    id: 'a1-goodfoodyou',
    enabled: true,
    sponsored: false,
    title: '好歐食庫・歐陸食材冷凍生鮮',
    description: '進口肉品、海鮮與冷凍食材一次補齊。',
    ctaLabel: '逛好歐食庫',
    url: 'https://afflink.one/s/QOFbF',
    icon: 'kitchen',
    categories: ['meat', 'seafood', 'vegetable'],
    priority: 6,
    partner: 'Good Food You 好歐食庫',
  },

  // ---- 即食/料理(免開伙) ----
  {
    id: 'a1-ubereats',
    enabled: true,
    sponsored: false,
    title: '想吃{crop}料理?Uber Eats 外送',
    description: '不想開伙,現成美食直接送到家。',
    ctaLabel: '叫 Uber Eats',
    url: 'https://linkgo.one/s/VwTic',
    icon: 'delivery_dining',
    categories: FOOD,
    priority: 6,
    partner: 'Uber Eats',
  },
  {
    id: 'ich-yuanshanlu',
    enabled: true,
    sponsored: false,
    title: '猿山鹿水餃・水餃代工大王',
    description: '皮薄餡多手工水餃,免開伙快速上桌。',
    ctaLabel: '看猿山鹿水餃',
    url: 'https://joymall.co/3RVKm',
    icon: 'lunch_dining',
    categories: ['vegetable'],
    crops: ['高麗', '白菜', '韭', '蔥'],
    priority: 8,
    partner: '猿山鹿水餃',
  },
  {
    id: 'ich-menqianyinwei',
    enabled: true,
    sponsored: false,
    title: '門前隱味・天然食材手作水餃',
    description: '天然食材手工現做,冷凍宅配到家。',
    ctaLabel: '逛門前隱味',
    url: 'https://wonderfulapple.net/3RVKo',
    icon: 'dinner_dining',
    categories: ['vegetable'],
    crops: ['高麗', '白菜', '韭'],
    priority: 6,
    partner: '門前隱味',
  },

  // ---- 產地農遊體驗(當季作物 → 採果小旅行;KKday CID=25570) ----
  // KKday 機制:任何 KKday 頁面網址後面加上 ?cid=25570(網址已有 ? 則用 &cid=25570)即為推廣連結。
  {
    id: 'kkday-farm',
    enabled: true,
    sponsored: false,
    title: '採果體驗・產地小旅行',
    description: '趁{crop}產季,安排一趟親子採果與農場體驗。',
    ctaLabel: '看採果體驗',
    url: 'https://www.kkday.com/zh-tw/product/productlist?keyword=採果&cid=25570',
    icon: 'agriculture',
    categories: ['fruit'],
    crops: ['草莓', '葡萄', '火龍果', '藍莓', '水梨', '番茄', '柑'],
    priority: 7,
    partner: 'KKday',
  },

  // ---- 保健/特產(精準或一般) ----
  {
    id: 'a1-chunlian',
    enabled: true,
    sponsored: false,
    title: '純煉滴雞精・日常保養',
    description: '純粹濃醇滴雞精,為家人補一下。',
    ctaLabel: '看滴雞精',
    url: 'https://linkgo.one/s/Ywe0v',
    icon: 'health_and_safety',
    categories: ['meat'],
    crops: ['雞'],
    priority: 7,
    partner: '純煉營養研究室',
  },
  {
    id: 'ich-basefood',
    enabled: true,
    sponsored: false,
    title: 'BASE FOOD・完全營養食',
    description: '一份補齊多種營養的日系機能食。',
    ctaLabel: '認識 BASE FOOD',
    url: 'https://adcenter.conn.tw/3RVKn',
    icon: 'nutrition',
    categories: FOOD,
    priority: 5,
    partner: 'BASE FOOD',
  },
  {
    id: 'a1-tea',
    enabled: true,
    sponsored: false,
    title: '天下第一好茶・茶葉禮品',
    description: '送禮自用兩相宜的台灣好茶。',
    ctaLabel: '逛茶葉禮盒',
    url: 'https://linkgo.one/s/GKPRr',
    icon: 'emoji_food_beverage',
    categories: FOOD,
    priority: 4,
    partner: '天下第一好茶',
  },
  {
    id: 'a1-icookie',
    enabled: true,
    sponsored: false,
    title: 'iCookie 私房手作點心',
    description: '手工餅乾與甜點,下午茶的好選擇。',
    ctaLabel: '看私房點心',
    url: 'https://afflink.one/s/5bSJu',
    icon: 'bakery_dining',
    categories: FOOD,
    priority: 3,
    partner: 'iCookie 私房手作',
  },
  {
    id: 'a1-byfood',
    enabled: true,
    sponsored: false,
    title: 'byFood・美食體驗與預訂',
    description: '探索各地美食體驗與餐廳預訂。',
    ctaLabel: '探索美食體驗',
    url: 'https://afflink.one/s/AmLVG',
    icon: 'restaurant',
    categories: FOOD,
    priority: 3,
    partner: 'byFood',
  },
  {
    id: 'a1-i3Fresh',
    enabled: true,
    sponsored: false,
    title: 'i3Fresh 愛上新鮮 臺灣',
    description: '探索新鮮蔬果預訂。',
    ctaLabel: '探索蔬果體驗',
    url: 'https://onelink.one/s/FN2vG',
    icon: 'restaurant',
    categories: FOOD,
    priority: 3,
    partner: 'byFood',
  },
  {
    id: 'a1-uni-prosperity',
    enabled: true,
    sponsored: false,
    title: '萬家福線上購物',
    description: '探索新鮮蔬果預訂。',
    ctaLabel: '探索蔬果體驗',
    url: 'https://onelink.one/s/CPHek',
    icon: 'restaurant',
    categories: FOOD,
    priority: 3,
    partner: 'byFood',
  },
]
// ===========================================================================
//  ▲▲▲ 版位設定結束 ▲▲▲
// ===========================================================================

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
  cropName: string,
  category: ProduceCategory,
  limit = 6,
): ResolvedOffer[] {
  const eligible = AFFILIATE_OFFERS.filter((offer) => {
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
export function getMarqueeOffers(): ResolvedOffer[] {
  return AFFILIATE_OFFERS.filter((offer) => offer.enabled)
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
