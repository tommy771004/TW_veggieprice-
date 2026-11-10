// Site crop names (what people search: 高麗菜, 文旦) → MOA 品名 matching.
//
// MOA rows are named `品名-品種` (甘藍-初秋, 柚子-文旦) and its API's CropName
// param is a substring match (薑 also returns 紅薑花 / 薑荷花). Pages keyed by a
// colloquial name therefore got no data at all, so each crop resolves to:
//   query   — CropName to send to the MOA API (broad substring)
//   matches — exact filter on the returned 品名
// Patterns match a 品名 exactly or as its `pattern-` prefix.

import { COMMON_CROPS } from './crops.ts'

interface MoaCropRule {
  include: string[]
  exclude?: string[]
}

// Every 品名 below was checked against the 2026 daily MOA snapshots
// (public/data/daily). A pattern with a space (甜椒-彩色種 紅色) must be listed
// whole: the `pattern-` prefix rule only extends at a hyphen.
const RULES: Record<string, MoaCropRule> = {
  高麗菜: { include: ['甘藍'] },
  空心菜: { include: ['蕹菜'] },
  白蘿蔔: { include: ['蘿蔔'], exclude: ['蘿蔔-甜菜根', '蘿蔔-櫻桃'] },
  甜菜根: { include: ['蘿蔔-甜菜根'] },
  芋頭: { include: ['芋'], exclude: ['芋-芋莖'] },
  芭樂: { include: ['番石榴'] },
  // Domestic napa cabbage trades as 包心白-包白; only imports use 包心白菜-進口 ….
  白菜: { include: ['包心白', '包心白菜'] },
  大白菜: { include: ['包心白', '包心白菜'] },
  地瓜葉: { include: ['甘薯葉'] },
  芥藍: { include: ['芥藍菜'] },
  青江菜: { include: ['青江白菜'] },
  蔥: { include: ['青蔥'], exclude: ['青蔥-紅蔥頭'] },
  萵苣: { include: ['萵苣菜'] },
  結球萵苣: { include: ['萵苣菜-結球萵', '萵苣菜-進口 結球萵'] },
  青椒: { include: ['甜椒-青椒'] },
  佛手瓜: { include: ['隼人瓜'], exclude: ['隼人瓜-瓜苗'] },
  // MOA 胡瓜 is 大黃瓜; what people search as 小黃瓜 trades as 花胡瓜.
  小黃瓜: { include: ['花胡瓜'] },
  四季豆: { include: ['敏豆'], exclude: ['敏豆-翼豆'] },
  香菇: { include: ['濕香菇'] },
  金針菇: { include: ['金絲菇'] },
  木耳: { include: ['濕木耳'] },
  哈密瓜: { include: ['洋香瓜'] },
  柳橙: { include: ['甜橙-柳橙', '甜橙-紅肉柳橙'] },
  文旦: { include: ['柚子-文旦'] },
  橘子: { include: ['椪柑', '柑橘', '桶柑', '茂谷柑'] },
  檸檬: { include: ['雜柑-檸檬', '雜柑-無子檸檬', '雜柑-黃金檸檬'] },
  薑: { include: ['薑'], exclude: ['薑-薑黃'] },

  // ── Site crop pages that had no MOA match at all ──
  青花菜: { include: ['青花苔'] },
  山藥: { include: ['薯蕷'], exclude: ['薯蕷-樹薯'] },
  豇豆: { include: ['菜豆'] },
  火龍果: { include: ['紅龍果'] },

  // ── Colloquial search names (vegetables) ──
  地瓜: { include: ['甘薯'] },
  番薯: { include: ['甘薯'] },
  紅蘿蔔: { include: ['胡蘿蔔'] },
  大黃瓜: { include: ['胡瓜'] },
  黃瓜: { include: ['胡瓜', '花胡瓜'] },
  長豆: { include: ['菜豆'] },
  皇帝豆: { include: ['萊豆'] },
  甜豆: { include: ['豌豆-甜豌豆', '豌豆-進口 甜豌豆'] },
  荷蘭豆: {
    include: ['豌豆-白花', '豌豆-紅花', '豌豆-進口 白花', '豌豆-進口 紅花', '豌豆-豆莢', '豌豆-進口 豆筴', '豌豆-進口'],
  },
  彩椒: {
    include: [
      '甜椒-彩色種', '甜椒-彩色種 紅色', '甜椒-彩色種 黃色', '甜椒-彩色種 橘色',
      '甜椒-彩色種 其他', '甜椒-水果彩椒', '甜椒-進口 彩色種',
    ],
  },
  紅椒: { include: ['甜椒-彩色種 紅色'] },
  黃椒: { include: ['甜椒-彩色種 黃色'] },
  聖女番茄: { include: ['小番茄-聖女'] },
  瓠瓜: { include: ['扁蒲'] },
  蒲瓜: { include: ['扁蒲'] },
  瓠子: { include: ['扁蒲'] },
  // 龍鬚菜 at the market is the chayote shoot (隼人瓜-瓜苗), not the seaweed.
  龍鬚菜: { include: ['隼人瓜-瓜苗'] },
  蒜苗: { include: ['大蒜-軟梗', '大蒜-硬梗'] },
  青蒜: { include: ['大蒜-軟梗', '大蒜-硬梗'] },
  韭黃: { include: ['韭菜-韭菜黃'] },
  香菜: { include: ['芫荽'] },
  A菜: { include: ['萵苣菜-本島尖葉'] },
  大陸妹: { include: ['萵苣菜-本島圓葉'] },
  美生菜: { include: ['萵苣菜-結球萵', '萵苣菜-進口 結球萵'] },
  蘿蔓: { include: ['萵苣菜-蘿美', '萵苣菜-進口 蘿美'] },
  刈菜: { include: ['芥菜-大芥菜'] },
  雪裡紅: { include: ['雪里紅'] },
  酸菜: { include: ['鹹菜'] },
  綠花椰: { include: ['青花苔'] },
  青花椰: { include: ['青花苔'] },
  白花椰: { include: ['花椰菜'] },
  高麗菜芽: { include: ['甘藍-甘藍芽'] },
  大頭菜: { include: ['球莖甘藍'] },
  結頭菜: { include: ['球莖甘藍'] },
  筊白筍: { include: ['茭白筍'] },
  豆芽菜: { include: ['芽菜類'] },
  黑木耳: { include: ['濕木耳'] },
  蕗蕎: { include: ['蕎頭'] },
  巴西里: { include: ['巴西利'] },
  栗子南瓜: { include: ['南瓜-栗子', '南瓜-栗子 小黑', '南瓜-栗子 小紅', '南瓜-進口 栗子'] },
  君達菜: { include: ['菾菜'] },

  // ── Colloquial search names (fruit) ──
  柳丁: { include: ['甜橙-柳橙', '甜橙-紅肉柳橙'] },
  香吉士: { include: ['甜橙-進口'] },
  // In Taiwan 香瓜 is the Oriental melon (甜瓜); search still also shows 洋香瓜 by substring.
  香瓜: { include: ['甜瓜'] },
  紅心芭樂: { include: ['番石榴-紅心'] },
  金桔: { include: ['雜柑-桔子', '雜柑-金棗'] },
  金棗: { include: ['雜柑-金棗'] },
  李子: { include: ['李'] },
  油桃: { include: ['桃子-甜桃', '桃子-甜桃進口'] },
  梅子: { include: ['梅'] },
  水梨: { include: ['梨'] },
  // Substring search for 梨子 only finds 扁蒲-梨子蒲 (a gourd).
  梨子: { include: ['梨'] },
  蜜棗: { include: ['棗子', '蜜棗'] },
  波羅蜜: { include: ['波蘿蜜'] },
  菠蘿蜜: { include: ['波蘿蜜'] },
}

function matchesPattern(moaName: string, pattern: string): boolean {
  return moaName === pattern || moaName.startsWith(`${pattern}-`)
}

/** True when the crop has an explicit mapping (alias or curated exclusions). */
export function hasMoaCropRule(cropName: string): boolean {
  return cropName.trim() in RULES
}

/** CropName to send to the MOA API; it substring-matches, so the base 品名 is enough. */
export function moaQueryName(cropName: string): string {
  const rule = RULES[cropName.trim()]
  if (!rule) return cropName
  return rule.include[0].split('-')[0]
}

/** Whether a MOA 品名 (e.g. 甘藍-初秋) belongs to the site crop (高麗菜). */
export function matchesMoaCrop(cropName: string, moaName: string): boolean {
  const name = cropName.trim()
  const n = moaName.trim()
  const rule = RULES[name] ?? { include: [name] }
  if (rule.exclude?.includes(n)) return false
  return rule.include.some((p) => matchesPattern(n, p))
}

/**
 * Rows belonging to the crop. When MOA has an exact 品名 row (香蕉) keep only
 * those, so crops that already worked don't start averaging in side varieties
 * (香蕉-芭蕉紅芭蕉); otherwise fall back to the variety/alias matches.
 */
export function selectMoaCropRows<T>(cropName: string, rows: T[], nameOf: (row: T) => string): T[] {
  const name = cropName.trim()
  const matched = rows.filter((r) => matchesMoaCrop(name, nameOf(r)))
  const exact = matched.filter((r) => nameOf(r).trim() === name)
  return exact.length > 0 ? exact : matched
}

/**
 * CropName terms a free-text search must request so alias rows come back too:
 * the keyword itself plus each alias base not already covered by it as a
 * substring (高麗菜 → [高麗菜, 甘藍]; 白菜 → [白菜, 包心白]).
 */
export function moaSearchTerms(keyword: string): string[] {
  const k = keyword.trim()
  const rule = RULES[k]
  if (!rule) return [k]
  const bases = rule.include.map((p) => p.split('-')[0])
  return [...new Set([k, ...bases.filter((b) => !b.includes(k))])]
}

/**
 * Search is a substring match on 品名 (白菜 also finds 小白菜), widened by the
 * alias rule so colloquial names find their MOA rows (高麗菜 → 甘藍-初秋).
 */
export function matchesSearchKeyword(keyword: string, moaName: string): boolean {
  const k = keyword.trim()
  if (!k) return true
  return moaName.includes(k) || (k in RULES && matchesMoaCrop(k, moaName))
}

const SITE_CROPS = new Set<string>(COMMON_CROPS)

/**
 * Reverse lookup for linking a MOA base 品名 to the site's crop page:
 * 甘藍 → 高麗菜, 番石榴 → 芭樂. Only names with a curated page (COMMON_CROPS)
 * are returned, so search-only aliases (紅蘿蔔) never take over a crop that
 * has its own page (胡蘿蔔). Anything else maps to itself.
 */
export function siteCropForMoaName(moaBaseName: string): string {
  const base = moaBaseName.trim()
  if (SITE_CROPS.has(base)) return base
  for (const [site, rule] of Object.entries(RULES)) {
    if (SITE_CROPS.has(site) && rule.include.length === 1 && rule.include[0] === base) return site
  }
  return base
}
