// Fruit & vegetable wholesale markets that get a /market/[name] page.
//
// `name` is the MOA 市場名稱 exactly as it appears in the daily data (and the
// URL segment); `label` is how people search for it (西螺果菜市場), which GSC
// shows as real demand ("西螺今日菜價查詢", "西螺果菜市場行情").

export interface MarketEntry {
  name: string
  label: string
  region: '北部' | '中部' | '南部' | '東部'
}

export const MARKETS: readonly MarketEntry[] = [
  { name: '台北一', label: '台北第一果菜市場', region: '北部' },
  { name: '台北二', label: '台北第二果菜市場', region: '北部' },
  { name: '三重區', label: '三重果菜市場', region: '北部' },
  { name: '板橋區', label: '板橋果菜市場', region: '北部' },
  { name: '桃農', label: '桃園果菜市場', region: '北部' },
  { name: '宜蘭市', label: '宜蘭果菜市場', region: '北部' },
  { name: '台中市', label: '台中果菜市場', region: '中部' },
  { name: '豐原區', label: '豐原果菜市場', region: '中部' },
  { name: '東勢鎮', label: '東勢果菜市場', region: '中部' },
  { name: '溪湖鎮', label: '溪湖果菜市場', region: '中部' },
  { name: '永靖鄉', label: '永靖果菜市場', region: '中部' },
  { name: '西螺鎮', label: '西螺果菜市場', region: '中部' },
  { name: '南投市', label: '南投果菜市場', region: '中部' },
  { name: '嘉義市', label: '嘉義果菜市場', region: '南部' },
  { name: '高雄市', label: '高雄果菜市場', region: '南部' },
  { name: '鳳山區', label: '鳳山果菜市場', region: '南部' },
  { name: '屏東市', label: '屏東果菜市場', region: '南部' },
  { name: '花蓮市', label: '花蓮果菜市場', region: '東部' },
  { name: '台東市', label: '台東果菜市場', region: '東部' },
]

export const MARKET_REGIONS = ['北部', '中部', '南部', '東部'] as const

export function findMarket(name: string): MarketEntry | undefined {
  return MARKETS.find((m) => m.name === name)
}

/** 西螺果菜市場 → 西螺: the short form used in running copy and search queries. */
export function marketShortName(entry: MarketEntry): string {
  return entry.label.replace(/果菜市場$/, '')
}
