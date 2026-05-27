import { getCropEmoji } from '@/lib/utils'

export type ProduceCategory = 'vegetable' | 'fruit' | 'flower' | 'mushroom' | 'meat' | 'seafood'

interface SeasonalGuideItem {
  cropName: string
  reason: string
  note: string
}

const CATEGORY_KEYWORDS: Record<ProduceCategory, string[]> = {
  vegetable: ['菜', '高麗', '蘿蔔', '番茄', '洋蔥', '胡蘿蔔', '青椒', '花椰菜', '地瓜', '玉米', '南瓜', '茄子', '小黃瓜', '黃瓜', '蔥', '韭', '芹', '空心', '茼蒿', '生菜', '萵苣'],
  fruit: ['果', '蘋果', '香蕉', '芭樂', '鳳梨', '芒果', '葡萄', '西瓜', '柳橙', '橘', '檸檬', '草莓', '桃', '梨', '木瓜'],
  flower: ['花', '菊', '玫瑰', '百合', '蘭'],
  mushroom: ['菇', '香菇', '金針', '杏鮑'],
  meat: ['豬', '雞', '鵝', '鴨', '羊', '白肉雞', '毛豬', '蛋'],
  seafood: ['魚', '蝦', '蟹', '蛤', '貝', '魷', '卷', '鯧', '鮭', '鯛']
}

const SEASONAL_GUIDE: Record<number, SeasonalGuideItem[]> = {
  1: [
    { cropName: '高麗菜', reason: '冬季盛產', note: '口感甜脆，均價通常較穩定，適合大量採買。' },
    { cropName: '白蘿蔔', reason: '產量充足', note: '煮湯與滷製都適合，冬季品質最穩。' },
    { cropName: '花椰菜', reason: '冷涼氣候甜度佳', note: '適合清炒或川燙，品質與外觀都較整齊。' },
  ],
  2: [
    { cropName: '高麗菜', reason: '冬末尾段仍有量', note: '可持續關注，通常仍維持高 CP 值。' },
    { cropName: '番茄', reason: '冬春交替品質好', note: '甜度與硬度平衡，適合生食與入菜。' },
    { cropName: '青江菜', reason: '葉菜供應穩定', note: '市場選擇多，價格波動通常較平緩。' },
  ],
  3: [
    { cropName: '洋蔥', reason: '春季主力作物', note: '保存期長，餐飲採購很適合先備貨。' },
    { cropName: '香蕉', reason: '南部供應轉旺', note: '適合即食與果汁，價格常有甜蜜區。' },
    { cropName: '鳳梨', reason: '春季開始進入甜區', note: '果香明顯，品質好時很適合促銷與家用。' },
  ],
  4: [
    { cropName: '洋蔥', reason: '產季高峰', note: '批發量大，適合留意採購窗口。' },
    { cropName: '鳳梨', reason: '甜度與產量同步提升', note: '零售與餐飲端都常有不錯進貨價。' },
    { cropName: '香蕉', reason: '供應穩定', note: '是日常家庭與早餐店常備水果。' },
  ],
  5: [
    { cropName: '鳳梨', reason: '盛產期', note: '價格常進入友善區間，適合多吃一點。' },
    { cropName: '芒果', reason: '夏季前哨', note: '開始陸續上量，可提早觀察行情。' },
    { cropName: '空心菜', reason: '夏季葉菜上場', note: '快炒需求高，供應量也逐步放大。' },
  ],
  6: [
    { cropName: '芒果', reason: '夏季主角', note: '愛文與在地品種陸續上場，適合比價採買。' },
    { cropName: '西瓜', reason: '消暑旺季', note: '產地多、流通快，夏季常有大宗交易。' },
    { cropName: '空心菜', reason: '葉菜供應強', note: '短周期作物，夏季餐桌常客。' },
  ],
  7: [
    { cropName: '芒果', reason: '盛夏高峰', note: '品項豐富，適合家庭與飲料店補貨。' },
    { cropName: '西瓜', reason: '需求與供給都高', note: '通常能看到明顯的市場競價變化。' },
    { cropName: '玉米', reason: '夏季鮮甜', note: '蒸煮烤皆適合，適合大量備料。' },
  ],
  8: [
    { cropName: '芒果', reason: '產季尾聲仍有甜度', note: '可留意末段價格回落機會。' },
    { cropName: '西瓜', reason: '仍屬夏季熱門', note: '高溫期間需求穩定。' },
    { cropName: '玉米', reason: '供應尚穩', note: '可作為家庭與攤商的高 CP 選項。' },
  ],
  9: [
    { cropName: '柚子', reason: '中秋前後旺季', note: '節慶需求帶動，適合提前比價。' },
    { cropName: '地瓜', reason: '秋季轉強', note: '保存容易，家用與烘烤都方便。' },
    { cropName: '花椰菜', reason: '冷涼季節準備起量', note: '開始回到家庭常見菜盤。' },
  ],
  10: [
    { cropName: '柚子', reason: '節後仍有量', note: '常能遇到價格回落的補貨時機。' },
    { cropName: '高麗菜', reason: '秋季開始回甜', note: '逐步進入穩定供應期。' },
    { cropName: '青花菜', reason: '天氣轉涼品質提升', note: '適合清燙與便當配菜。' },
  ],
  11: [
    { cropName: '高麗菜', reason: '秋冬主力', note: '通常是家庭採買與市場攤商的核心菜款。' },
    { cropName: '白蘿蔔', reason: '冬季前段開始大量供應', note: '價格常逐步回穩。' },
    { cropName: '番茄', reason: '秋冬品質佳', note: '鮮食與炒菜需求都高。' },
  ],
  12: [
    { cropName: '高麗菜', reason: '冬季盛產', note: '常是冬天最值得追的菜價代表。' },
    { cropName: '白蘿蔔', reason: '口感與產量俱佳', note: '適合煮湯、燉滷與家常菜。' },
    { cropName: '花椰菜', reason: '冬季品質優', note: '顏色與口感穩定，很適合家用採購。' },
  ],
}

// Flat lookup: all crop names that appear in any month's SEASONAL_GUIDE.
// Used to attach descriptions when the seasonal crop list is fetched dynamically from MOA.
export const CROP_DESCRIPTIONS: Record<string, { reason: string; note: string }> = Object.fromEntries(
  Object.values(SEASONAL_GUIDE)
    .flat()
    .map((item) => [item.cropName, { reason: item.reason, note: item.note }])
)

export function getProduceCategory(cropName: string): ProduceCategory {
  const matchedCategory = (Object.entries(CATEGORY_KEYWORDS) as Array<[ProduceCategory, string[]]>).find(([, keywords]) =>
    keywords.some((keyword) => cropName.includes(keyword))
  )

  return matchedCategory?.[0] ?? 'vegetable'
}

export function getSeasonalGuide(month = new Date().getMonth() + 1) {
  return (SEASONAL_GUIDE[month] ?? SEASONAL_GUIDE[1]).map((item) => ({
    ...item,
    emoji: getCropEmoji(item.cropName),
    category: getProduceCategory(item.cropName),
  }))
}