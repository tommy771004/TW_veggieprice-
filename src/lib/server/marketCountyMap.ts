interface MarketCountyEntry {
  market: string
  county: string
}

interface MarketCountyKeywordRule {
  keywords: string[]
  county: string
}

function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/臺/g, '台')
    .replace(/[（）()]/g, '')
}

export function normalizeCountyNameForCompare(value: string): string {
  return normalizeText(value)
    .replace(/台/g, '台')
    .replace(/臺/g, '台')
}

const MARKET_COUNTY_ENTRIES: MarketCountyEntry[] = [
  { market: '台北一', county: '臺北市' },
  { market: '台北二', county: '臺北市' },
  { market: '第一果菜批發市場', county: '臺北市' },
  { market: '第二果菜批發市場', county: '臺北市' },
  { market: '萬大市場', county: '臺北市' },
  { market: '台北市', county: '臺北市' },

  { market: '板橋區', county: '新北市' },
  { market: '三重區', county: '新北市' },
  { market: '新莊區', county: '新北市' },
  { market: '新店區', county: '新北市' },
  { market: '土城區', county: '新北市' },
  { market: '樹林區', county: '新北市' },
  { market: '蘆洲區', county: '新北市' },
  { market: '汐止區', county: '新北市' },
  { market: '淡水區', county: '新北市' },
  { market: '新北市', county: '新北市' },

  { market: '桃園市', county: '桃園市' },
  { market: '中壢區', county: '桃園市' },
  { market: '平鎮區', county: '桃園市' },
  { market: '楊梅區', county: '桃園市' },
  { market: '大溪區', county: '桃園市' },

  { market: '新竹市', county: '新竹市' },
  { market: '新竹縣', county: '新竹縣' },
  { market: '竹北市', county: '新竹縣' },

  { market: '苗栗市', county: '苗栗縣' },
  { market: '苗栗縣', county: '苗栗縣' },

  { market: '台中市', county: '臺中市' },
  { market: '豐原區', county: '臺中市' },
  { market: '東勢區', county: '臺中市' },
  { market: '大甲區', county: '臺中市' },
  { market: '清水區', county: '臺中市' },

  { market: '彰化市場', county: '彰化縣' },
  { market: '彰化市', county: '彰化縣' },
  { market: '員林市', county: '彰化縣' },
  { market: '溪湖鎮', county: '彰化縣' },
  { market: '田中鎮', county: '彰化縣' },
  { market: '二林鎮', county: '彰化縣' },

  { market: '南投市', county: '南投縣' },
  { market: '草屯鎮', county: '南投縣' },
  { market: '埔里鎮', county: '南投縣' },

  { market: '西螺鎮', county: '雲林縣' },
  { market: '斗六市', county: '雲林縣' },
  { market: '斗南鎮', county: '雲林縣' },
  { market: '虎尾鎮', county: '雲林縣' },
  { market: '北港鎮', county: '雲林縣' },

  { market: '嘉義市', county: '嘉義市' },
  { market: '太保市', county: '嘉義縣' },
  { market: '朴子市', county: '嘉義縣' },
  { market: '民雄鄉', county: '嘉義縣' },
  { market: '嘉義縣', county: '嘉義縣' },

  { market: '台南市', county: '臺南市' },
  { market: '永康區', county: '臺南市' },
  { market: '新化區', county: '臺南市' },
  { market: '麻豆區', county: '臺南市' },
  { market: '佳里區', county: '臺南市' },
  { market: '新營區', county: '臺南市' },

  { market: '高雄市', county: '高雄市' },
  { market: '鳳山區', county: '高雄市' },
  { market: '岡山區', county: '高雄市' },
  { market: '路竹區', county: '高雄市' },
  { market: '旗山區', county: '高雄市' },

  { market: '屏東市', county: '屏東縣' },
  { market: '潮州鎮', county: '屏東縣' },
  { market: '東港鎮', county: '屏東縣' },
  { market: '里港鄉', county: '屏東縣' },

  { market: '宜蘭市', county: '宜蘭縣' },
  { market: '羅東鎮', county: '宜蘭縣' },

  { market: '花蓮市', county: '花蓮縣' },
  { market: '吉安鄉', county: '花蓮縣' },

  { market: '台東市', county: '臺東縣' },
  { market: '關山鎮', county: '臺東縣' },

  { market: '基隆市', county: '基隆市' },
  { market: '澎湖縣', county: '澎湖縣' },
  { market: '馬公市', county: '澎湖縣' },
  { market: '金門縣', county: '金門縣' },
  { market: '連江縣', county: '連江縣' },
]

const MARKET_TO_COUNTY_MAP = new Map<string, string>(
  MARKET_COUNTY_ENTRIES.map((entry) => [normalizeText(entry.market), entry.county])
)

const COUNTY_KEYWORD_RULES: MarketCountyKeywordRule[] = [
  { keywords: ['台北', '萬大', '濱江'], county: '臺北市' },
  { keywords: ['新北', '板橋', '三重', '新莊', '新店', '土城', '樹林', '淡水', '汐止', '蘆洲'], county: '新北市' },
  { keywords: ['桃園', '中壢', '平鎮', '楊梅', '大溪'], county: '桃園市' },
  { keywords: ['新竹市'], county: '新竹市' },
  { keywords: ['新竹縣', '竹北'], county: '新竹縣' },
  { keywords: ['苗栗'], county: '苗栗縣' },
  { keywords: ['台中', '豐原', '東勢', '大甲', '清水'], county: '臺中市' },
  { keywords: ['彰化', '員林', '溪湖', '田中', '二林'], county: '彰化縣' },
  { keywords: ['南投', '草屯', '埔里'], county: '南投縣' },
  { keywords: ['雲林', '西螺', '斗六', '斗南', '虎尾', '北港'], county: '雲林縣' },
  { keywords: ['嘉義市'], county: '嘉義市' },
  { keywords: ['嘉義縣', '太保', '朴子', '民雄'], county: '嘉義縣' },
  { keywords: ['台南', '永康', '新化', '麻豆', '佳里', '新營'], county: '臺南市' },
  { keywords: ['高雄', '鳳山', '岡山', '路竹', '旗山'], county: '高雄市' },
  { keywords: ['屏東', '潮州', '東港', '里港'], county: '屏東縣' },
  { keywords: ['宜蘭', '羅東'], county: '宜蘭縣' },
  { keywords: ['花蓮', '吉安'], county: '花蓮縣' },
  { keywords: ['台東', '關山'], county: '臺東縣' },
  { keywords: ['基隆'], county: '基隆市' },
  { keywords: ['澎湖', '馬公'], county: '澎湖縣' },
  { keywords: ['金門'], county: '金門縣' },
  { keywords: ['連江', '馬祖'], county: '連江縣' },
]

export function resolveCountyFromMarketName(marketName: string): string {
  const normalizedMarket = normalizeText(marketName)
  if (!normalizedMarket) {
    return ''
  }

  const exact = MARKET_TO_COUNTY_MAP.get(normalizedMarket)
  if (exact) {
    return exact
  }

  const normalizedWithoutSuffix = normalizedMarket.replace(/市場$/, '')
  const exactNoSuffix = MARKET_TO_COUNTY_MAP.get(normalizedWithoutSuffix)
  if (exactNoSuffix) {
    return exactNoSuffix
  }

  for (const rule of COUNTY_KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => normalizedMarket.includes(normalizeText(keyword)))) {
      return rule.county
    }
  }

  return ''
}

export const MARKET_COUNTY_MAPPING_VERSION = 'v1.0.0'
