import { NextRequest, NextResponse } from 'next/server'
import { fetchTraceabilitySummary } from '@/lib/server/moa'
import { resolveCountyFromTownship } from '@/lib/server/townshipCountyMap'
import { resolveCountyFromMarketName } from '@/lib/server/marketCountyMap'
import type { CropInfo } from '@/lib/types'

interface CropBaseEntry {
  feature: string
  season: string
  staticOrigin: string
}

const CROP_BASE_INFO: Record<string, CropBaseEntry> = {
  // 葉菜類
  '高麗菜':   { feature: '球體呈扁圓形，纖維細緻，含豐富維生素 C', season: '秋季 9-11月，冬季 12-2月', staticOrigin: '彰化、雲林、嘉義' },
  '空心菜':   { feature: '莖中空，葉片翠綠，口感爽脆清甜', season: '春夏季 4-10月', staticOrigin: '雲林、彰化、台南' },
  '菠菜':     { feature: '葉片厚實深綠，富含鐵質與葉酸', season: '冬季 10月-3月', staticOrigin: '雲林、彰化' },
  '小白菜':   { feature: '葉片嫩綠柔軟，質地鮮嫩多汁', season: '秋冬季 9-3月', staticOrigin: '雲林、彰化、嘉義' },
  '大白菜':   { feature: '結球緊實，水分充足，口感甜嫩', season: '冬季 11月-2月', staticOrigin: '雲林、彰化、南投' },
  '芹菜':     { feature: '莖葉芳香濃郁，富含膳食纖維', season: '秋冬季 10-3月', staticOrigin: '雲林、彰化' },
  '韭菜':     { feature: '葉片扁平細長，辛香濃郁，助消化', season: '全年供應，春季最佳', staticOrigin: '雲林、嘉義、高雄' },
  '地瓜葉':   { feature: '葉片鮮嫩翠綠，營養豐富，抗氧化強', season: '全年供應', staticOrigin: '台灣各地' },
  // 瓜果類
  '番茄':     { feature: '果實飽滿，色澤鮮豔，茄紅素豐富', season: '秋冬季 10月-3月', staticOrigin: '嘉義、台南、屏東' },
  '小黃瓜':   { feature: '果型細長，果皮薄，口感清脆多汁', season: '春夏季 4-9月', staticOrigin: '雲林、嘉義、屏東' },
  '絲瓜':     { feature: '果肉鮮嫩多汁，清甜爽口，富含水分', season: '夏季 5-10月', staticOrigin: '雲林、嘉義、台南' },
  '苦瓜':     { feature: '果面有突起，苦中回甘，清熱解毒', season: '夏季 5-10月', staticOrigin: '雲林、嘉義、屏東' },
  '青椒':     { feature: '果肉厚實，口感清脆，富含維生素 C', season: '秋冬季 9-3月', staticOrigin: '嘉義、台南、屏東' },
  '甜椒':     { feature: '色彩豐富，甜度高，低卡路里', season: '秋冬季 10-3月', staticOrigin: '嘉義、台南、屏東' },
  '茄子':     { feature: '果皮深紫光亮，肉質細嫩柔軟', season: '春夏季 4-10月', staticOrigin: '雲林、嘉義、屏東' },
  '西瓜':     { feature: '果肉紅潤多汁，清甜解渴，補水效果佳', season: '春夏季 4-8月', staticOrigin: '雲林、嘉義、台南' },
  // 根莖類
  '蘿蔔':     { feature: '根部碩大潔白，口感爽脆，消化助益', season: '冬季 10月-2月', staticOrigin: '雲林、彰化' },
  '胡蘿蔔':   { feature: '根部橙紅碩大，甜度高，β-胡蘿蔔素豐富', season: '冬季 11月-2月', staticOrigin: '彰化溪洲、雲林' },
  '地瓜':     { feature: '肉質鬆軟甜糯，富含膳食纖維與維生素', season: '秋冬季 9-2月', staticOrigin: '雲林、台南、台東' },
  '芋頭':     { feature: '肉質粉糯香甜，富含礦物質與碳水化合物', season: '秋季 9-11月', staticOrigin: '高雄、屏東、台中' },
  '玉米':     { feature: '粒粒飽滿鮮甜，富含膳食纖維', season: '春夏季 4-8月', staticOrigin: '雲林、嘉義、台南' },
  // 蔥蒜類
  '洋蔥':     { feature: '外皮金黃，辛香濃郁，富含槲皮素', season: '春季 3-5月', staticOrigin: '恆春半島、屏東' },
  '青蔥':     { feature: '蔥白細長，葉片翠綠，香氣辛辣', season: '全年供應，冬季最佳', staticOrigin: '宜蘭三星、雲林、彰化' },
  '大蒜':     { feature: '球莖飽滿，辛香濃郁，抗菌效果強', season: '春季 3-5月', staticOrigin: '雲林台西、彰化' },
  '薑':       { feature: '肉質飽滿，辛香味足，暖胃祛寒', season: '秋冬季 9-2月', staticOrigin: '苗栗、南投、花蓮' },
  // 花菜類
  '花椰菜':   { feature: '花蕾緊密潔白，口感鬆脆，高纖維', season: '冬季 11月-3月', staticOrigin: '雲林、彰化、嘉義' },
  '青花椰菜': { feature: '花球翠綠飽滿，富含維生素 C 與抗癌物質', season: '冬季 11月-3月', staticOrigin: '雲林、彰化' },
  '青花菜':   { feature: '花球翠綠飽滿，富含維生素 C 與抗癌物質', season: '冬季 11月-3月', staticOrigin: '雲林、彰化' },
  // 菇菌類
  '香菇':     { feature: '菌傘厚實，香味濃郁，富含多醣體', season: '秋冬季 10-3月', staticOrigin: '台中、南投、彰化' },
  '金針菇':   { feature: '菌柄細長雪白，口感爽脆，低卡高纖', season: '全年供應', staticOrigin: '台灣各地（多為設施栽培）' },
  // 水果類
  '香蕉':     { feature: '果肉香甜綿密，富含鉀質，能量來源佳', season: '全年供應', staticOrigin: '台灣南部、屏東' },
  '鳳梨':     { feature: '果肉金黃多汁，甜酸適中，助消化', season: '春夏季 3-8月', staticOrigin: '屏東、台南、高雄' },
  '木瓜':     { feature: '肉質橙紅細嫩，含木瓜酵素，助消化', season: '全年供應', staticOrigin: '屏東、台南、高雄' },
  '芒果':     { feature: '果肉金黃香甜，多汁芳香，品種多樣', season: '夏季 5-9月', staticOrigin: '台南玉井、屏東枋山' },
  '蓮霧':     { feature: '果皮鮮紅光亮，口感清脆多汁，低糖低卡', season: '冬春季 12-4月', staticOrigin: '屏東、高雄' },
  '釋迦':     { feature: '果肉乳白香甜，奶香濃郁，富含維生素 C', season: '秋冬季 9-1月', staticOrigin: '台東、花蓮' },
  '荔枝':     { feature: '果肉晶瑩剔透，香甜多汁，滋補佳品', season: '夏季 5-7月', staticOrigin: '台南、高雄、屏東' },
  '龍眼':     { feature: '果肉飽滿甘甜，富含維生素 B 群與礦物質', season: '夏季 7-9月', staticOrigin: '台南、高雄、南投' },
  '百香果':   { feature: '外皮深紫，果汁酸甜芳香，維生素 C 豐富', season: '夏季 6-10月', staticOrigin: '南投、台東、屏東' },
  '葡萄':     { feature: '果粒飽滿，酸甜多汁，含豐富花青素', season: '夏季 7-10月', staticOrigin: '台中、彰化' },
  '草莓':     { feature: '果實鮮紅嬌嫩，甜酸可口，維生素 C 豐富', season: '冬春季 12-4月', staticOrigin: '苗栗大湖、台中' },
  '柑橘':     { feature: '果皮橙黃薄脆，果肉多汁甘甜，富含 C', season: '冬季 11月-2月', staticOrigin: '台中、南投、台南' },
  '文旦柚':   { feature: '果肉淡黃清香，微甜帶酸，去油解膩', season: '秋季 9-10月', staticOrigin: '台南麻豆、花蓮瑞穗' },
  '火龍果':   { feature: '果皮紅豔，果肉多汁，花青素與維生素 C 豐富', season: '夏秋季 6-11月', staticOrigin: '屏東、台南、高雄' },
  '蘋果':     { feature: '進口優質品種，口感酥脆，富含多酚', season: '全年供應', staticOrigin: '日本、美國、紐西蘭（進口）' },
}

function getBaseInfo(cropName: string): CropBaseEntry {
  for (const [key, info] of Object.entries(CROP_BASE_INFO)) {
    if (cropName.includes(key)) return info
  }
  return { feature: '天然新鮮農產品', season: '全年供應', staticOrigin: '台灣各地' }
}

async function resolveOrigin(cropName: string, staticOrigin: string): Promise<string> {
  const { items } = await fetchTraceabilitySummary(cropName, 10)
  if (items.length === 0) return staticOrigin

  const countyCounts = new Map<string, number>()
  for (const item of items) {
    // Normalize dirty traceability county fields (e.g. 雲林縣, 臺南市, 五股區,
    // "新北市淡水") down to a clean short county name.
    const raw = (item.county ?? '').replace(/臺/g, '台').trim()
    // marketCountyMap knows urban districts + keywords (淡水/蘆洲/…); townshipMap
    // covers rural townships (五股/三星/玉井/…); finally strip any lingering suffix.
    const full = resolveCountyFromMarketName(raw).replace(/臺/g, '台').replace(/[市縣]$/, '')
    const county = full || resolveCountyFromTownship(raw) || raw.replace(/[市縣區鄉鎮]$/, '')
    if (county && county !== '未知' && county.length >= 2) {
      countyCounts.set(county, (countyCounts.get(county) ?? 0) + 1)
    }
  }

  // Require at least 2 distinct counties for dynamic origin to be reliable
  if (countyCounts.size < 2) return staticOrigin

  const top = [...countyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([county]) => county)

  return top.join('、')
}

export async function GET(req: NextRequest) {
  const cropName = req.nextUrl.searchParams.get('crop')?.trim() ?? ''
  if (!cropName) {
    return NextResponse.json({ error: '請提供作物名稱' }, { status: 400 })
  }

  const base = getBaseInfo(cropName)

  let origin = base.staticOrigin
  try {
    origin = await resolveOrigin(cropName, base.staticOrigin)
  } catch {
    // keep static origin on error
  }

  const body: CropInfo = { feature: base.feature, season: base.season, origin }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
  })
}
