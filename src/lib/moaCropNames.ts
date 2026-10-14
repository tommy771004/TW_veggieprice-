// Site crop names (what people search: 高麗菜, 文旦) → MOA 品名 matching.
//
// MOA rows are named `品名-品種` (甘藍-初秋, 柚子-文旦) and its API's CropName
// param is a substring match (薑 also returns 紅薑花 / 薑荷花). Pages keyed by a
// colloquial name therefore got no data at all, so each crop resolves to:
//   query   — CropName to send to the MOA API (broad substring)
//   matches — exact filter on the returned 品名
// Patterns match a 品名 exactly or as its `pattern-` prefix.

interface MoaCropRule {
  include: string[]
  exclude?: string[]
}

const RULES: Record<string, MoaCropRule> = {
  高麗菜: { include: ['甘藍'] },
  空心菜: { include: ['蕹菜'] },
  白蘿蔔: { include: ['蘿蔔'], exclude: ['蘿蔔-甜菜根', '蘿蔔-櫻桃'] },
  甜菜根: { include: ['蘿蔔-甜菜根'] },
  芋頭: { include: ['芋'], exclude: ['芋-芋莖'] },
  芭樂: { include: ['番石榴'] },
  白菜: { include: ['包心白菜'] },
  地瓜葉: { include: ['甘薯葉'] },
  芥藍: { include: ['芥藍菜'] },
  青江菜: { include: ['青江白菜'] },
  蔥: { include: ['青蔥'], exclude: ['青蔥-紅蔥頭'] },
  萵苣: { include: ['萵苣菜'] },
  結球萵苣: { include: ['萵苣菜-結球萵', '萵苣菜-進口 結球萵'] },
  青椒: { include: ['甜椒-青椒'] },
  佛手瓜: { include: ['隼人瓜'], exclude: ['隼人瓜-瓜苗'] },
  四季豆: { include: ['敏豆'], exclude: ['敏豆-翼豆'] },
  香菇: { include: ['濕香菇'] },
  金針菇: { include: ['金絲菇'] },
  木耳: { include: ['濕木耳'] },
  哈密瓜: { include: ['洋香瓜'] },
  柳橙: { include: ['甜橙-柳橙', '甜橙-紅肉柳橙'] },
  文旦: { include: ['柚子-文旦'] },
  橘子: { include: ['椪柑', '柑橘'] },
  檸檬: { include: ['雜柑-檸檬', '雜柑-無子檸檬', '雜柑-黃金檸檬'] },
  薑: { include: ['薑'], exclude: ['薑-薑黃'] },
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
