/**
 * CropIcon — flat inline-SVG crop visuals, replacing cross-platform-inconsistent emoji.
 *
 * Why: emoji render differently per OS/font (identification cost) and depend on the
 * system emoji font. A curated SVG set is crisp, consistent, weighs almost nothing
 * (no <img>/network, no next/image), and ships inside the existing JS bundle.
 *
 * Server-safe: no hooks / no 'use client', so it works in RSC (e.g. /seasonal page)
 * and Client Components alike. Size is controlled by the caller via `className`
 * (e.g. "w-7 h-7"), matching the wrapper each call site already provides.
 */

type IconKey =
  | 'tomato' | 'broccoli' | 'onion' | 'leafy' | 'herb' | 'carrot' | 'apple'
  | 'banana' | 'pineapple' | 'mango' | 'grape' | 'melon' | 'citrus' | 'berry'
  | 'pear' | 'pepper' | 'corn' | 'pumpkin' | 'eggplant' | 'cucumber' | 'pea'
  | 'tuber' | 'mushroom' | 'garlic' | 'squid' | 'flower' | 'pig' | 'egg'
  | 'chicken' | 'duck' | 'sheep' | 'shrimp' | 'crab' | 'shell' | 'fish' | 'leaf'

/**
 * Ordered keyword → icon rules. First substring match wins, so more specific
 * multi-character keywords MUST precede generic single-character ones
 * (e.g. '洋蔥' before '蔥', '花枝' before '花', '雞蛋' before '雞').
 */
const ICON_RULES: ReadonlyArray<readonly [string, IconKey]> = [
  ['牛番茄', 'tomato'], ['番茄', 'tomato'],
  ['花椰菜', 'broccoli'], ['青花菜', 'broccoli'], ['花椰', 'broccoli'],
  ['洋蔥', 'onion'],
  ['高麗菜', 'leafy'], ['甘藍', 'leafy'], ['大白菜', 'leafy'], ['青江菜', 'leafy'], ['空心菜', 'leafy'],
  ['茼蒿', 'leafy'], ['菠菜', 'leafy'], ['萵苣', 'leafy'], ['生菜', 'leafy'], ['白菜', 'leafy'],
  ['青蔥', 'herb'], ['韭菜', 'herb'], ['芹菜', 'herb'], ['蔥', 'herb'],
  ['胡蘿蔔', 'carrot'], ['白蘿蔔', 'carrot'], ['蘿蔔', 'carrot'],
  ['蘋果', 'apple'],
  ['香蕉', 'banana'],
  ['鳳梨', 'pineapple'],
  ['芒果', 'mango'],
  ['葡萄', 'grape'],
  ['西瓜', 'melon'], ['哈密瓜', 'melon'], ['香瓜', 'melon'], ['木瓜', 'melon'], ['芭樂', 'melon'], ['石榴', 'melon'],
  ['柳橙', 'citrus'], ['柳丁', 'citrus'], ['椪柑', 'citrus'], ['橘子', 'citrus'],
  ['檸檬', 'citrus'], ['柑', 'citrus'], ['橙', 'citrus'],
  ['草莓', 'berry'], ['藍莓', 'berry'],
  ['水梨', 'pear'], ['梨', 'pear'], ['桃', 'pear'],
  ['青椒', 'pepper'], ['甜椒', 'pepper'], ['辣椒', 'pepper'],
  ['玉米', 'corn'],
  ['南瓜', 'pumpkin'],
  ['茄子', 'eggplant'],
  ['小黃瓜', 'cucumber'], ['花胡瓜', 'cucumber'], ['胡瓜', 'cucumber'], ['苦瓜', 'cucumber'], ['絲瓜', 'cucumber'], ['黃瓜', 'cucumber'],
  ['荷蘭豆', 'pea'], ['豌豆', 'pea'], ['毛豆', 'pea'], ['四季豆', 'pea'], ['花生', 'pea'],
  ['馬鈴薯', 'tuber'], ['地瓜', 'tuber'], ['番薯', 'tuber'], ['芋', 'tuber'], ['薑', 'tuber'],
  ['金針菇', 'mushroom'], ['杏鮑菇', 'mushroom'], ['香菇', 'mushroom'], ['菇', 'mushroom'],
  ['蒜頭', 'garlic'], ['蒜', 'garlic'],
  ['花枝', 'squid'], ['透抽', 'squid'], ['軟絲', 'squid'], ['魷', 'squid'], ['章魚', 'squid'],
  ['菊', 'flower'], ['玫瑰', 'flower'], ['百合', 'flower'], ['蘭花', 'flower'], ['花', 'flower'],
  ['毛豬', 'pig'], ['豬', 'pig'],
  ['雞蛋', 'egg'], ['蛋', 'egg'],
  ['白肉雞', 'chicken'], ['土雞', 'chicken'], ['雞', 'chicken'],
  ['鵝', 'duck'], ['鴨', 'duck'],
  ['羊', 'sheep'],
  ['蝦', 'shrimp'],
  ['蟹', 'crab'],
  ['牡蠣', 'shell'], ['蛤', 'shell'], ['蚵', 'shell'],
  ['虱目魚', 'fish'], ['吳郭魚', 'fish'], ['石斑', 'fish'], ['鱸', 'fish'], ['鯛', 'fish'],
  ['鯧', 'fish'], ['香魚', 'fish'], ['魚', 'fish'], ['海鮮', 'fish'],
]

export function resolveCropIconKey(cropName: string): IconKey {
  if (!cropName) return 'leaf'
  for (const [keyword, key] of ICON_RULES) {
    if (cropName.includes(keyword)) return key
  }
  return 'leaf'
}

/** Inner SVG markup per icon (viewBox 0 0 24 24, flat fills). */
const ICON_SVG: Record<IconKey, string> = {
  leaf: `<path d="M5 19c0-7 6-13 14-14 1 8-5 15-14 14z" fill="#66BB6A"/><path d="M8 16c2-3 5-5 8-6.5" stroke="#388E3C" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  leafy: `<circle cx="12" cy="13" r="8" fill="#81C784"/><path d="M12 5c-4 2-6 6-5 10 2 2 6 2 8 0 2-4 0-9-3-10z" fill="#C8E6C9"/><path d="M9.5 9c-2 3-2 6 0 8" stroke="#4CAF50" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  herb: `<path d="M11 21c-2-6-2-12 1-19" stroke="#43A047" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14 21c1-5 1-11-1-17" stroke="#66BB6A" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M8.5 20h8" stroke="#F5F5F5" stroke-width="2" stroke-linecap="round"/>`,
  tomato: `<circle cx="12" cy="14" r="7" fill="#E53935"/><path d="M12 5c1 2 3 3 4.5 2-1 2-3 2.2-4.5 2.2S8.5 9 7.5 7C9 8 11 7 12 5z" fill="#43A047"/><path d="M12 9V6" stroke="#2E7D32" stroke-width="1.4" stroke-linecap="round"/>`,
  onion: `<path d="M12 21c-4 0-6-3-6-7 0-4 3-8 6-9 3 1 6 5 6 9 0 4-2 7-6 7z" fill="#CE93D8"/><path d="M12 5V2.5" stroke="#7CB342" stroke-width="1.6" stroke-linecap="round"/><path d="M9 8c-.5 7-.5 10 0 12M15 8c.5 7 .5 10 0 12" stroke="#AB47BC" stroke-width="1" fill="none"/>`,
  carrot: `<path d="M12 22 6.5 11c2-2 9-2 11 0z" fill="#FB8C00"/><path d="M12 9V4M12 8 8.5 5M12 8l3.5-3" stroke="#43A047" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M9 13l1.5 3M13.5 12l1 2" stroke="#E65100" stroke-width="1" stroke-linecap="round"/>`,
  apple: `<path d="M16 7.5c-1.6 0-2.6.8-4 .8s-2.4-.8-4-.8C5.5 7.5 4 10 4 13.5S6.4 21 8.4 21c1 0 1.6-.6 3.6-.6s2.6.6 3.6.6c2 0 4.4-4 4.4-7.5S18.5 7.5 16 7.5z" fill="#EF5350"/><path d="M12 8c0-2 1-3.5 2.5-3.8" stroke="#8D6E63" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M14.5 4.5c2-1.2 3.2.2 3 1.4-2 1-3.2-.2-3-1.4z" fill="#43A047"/>`,
  banana: `<path d="M5 8c1.2 7.5 7.5 11.5 13.5 9 1-.4.8-2-.3-1.8-5 1-9.8-3-10.8-8C7.2 6.4 5 6.6 5 8z" fill="#FDD835"/><path d="M5 8c0-1.2-1-2.2-2.2-2" stroke="#C0A000" stroke-width="1.4" stroke-linecap="round"/><path d="M18 17l1.6.6" stroke="#A1887F" stroke-width="1.4" stroke-linecap="round"/>`,
  pineapple: `<ellipse cx="12" cy="15.5" rx="5" ry="6" fill="#FBC02D"/><path d="M12 9.5c0-4 2-6.5 4.5-6.5-1 3.5-1.2 5.5-4.5 6.5zm0 0c0-4-2-6.5-4.5-6.5 1 3.5 1.2 5.5 4.5 6.5z" fill="#43A047"/><path d="M9 12l6 6M15 12l-6 6" stroke="#C49000" stroke-width=".9"/>`,
  mango: `<path d="M14.5 6c4 1.2 5.8 5.2 4.6 9s-6.2 5.8-10 3.6S7 11 10 8.4c2-1.8 4-2.8 6.5-2.4z" fill="#FFB300"/><path d="M9 11c2.2-1 4.3-.8 6.2 1.2" stroke="#F57F17" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  grape: `<g fill="#9C27B0"><circle cx="9.5" cy="12" r="2.2"/><circle cx="13.5" cy="12" r="2.2"/><circle cx="11.5" cy="15.2" r="2.2"/><circle cx="15.2" cy="15.2" r="2.2"/><circle cx="13.3" cy="18.3" r="2.2"/><circle cx="10.5" cy="9" r="2.2"/></g><path d="M13 8.5c0-2.2 1.2-4 4-4" stroke="#43A047" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  melon: `<path d="M4 8h16c0 7-4 12-8 12S4 15 4 8z" fill="#E53935"/><path d="M4 8h16l-1.4-2H5.4z" fill="#43A047"/><g fill="#212121"><circle cx="10" cy="12" r=".8"/><circle cx="14" cy="12" r=".8"/><circle cx="12" cy="15.5" r=".8"/></g>`,
  citrus: `<circle cx="12" cy="12" r="8" fill="#FB8C00"/><circle cx="12" cy="12" r="5.4" fill="#FFCC80"/><path d="M12 6.6v10.8M6.6 12h10.8M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" stroke="#FB8C00" stroke-width="1"/>`,
  berry: `<path d="M12 21c-4-1-7-4-7-7.6 0-2 3-3 7-3s7 1 7 3C19 17 16 20 12 21z" fill="#E53935"/><path d="M8 9.5c1.2-3 6.8-3 8 0-2-1-6-1-8 0z" fill="#43A047"/><g fill="#FFF59D"><circle cx="9" cy="13" r=".6"/><circle cx="12" cy="12.2" r=".6"/><circle cx="15" cy="13" r=".6"/><circle cx="10.5" cy="16" r=".6"/><circle cx="13.5" cy="16" r=".6"/></g>`,
  pear: `<path d="M12 7c1 0 1.2 1 1 2 3 1 4 4 4 7 0 3-2 5-5 5s-5-2-5-5c0-3 1.2-6 4-7-.2-1 0-2 1-2z" fill="#9CCC65"/><path d="M12 7V4" stroke="#8D6E63" stroke-width="1.4" stroke-linecap="round"/><path d="M13 5c1.5-1 3-.3 3 .8-1.5.8-2.8.2-3-.8z" fill="#43A047"/>`,
  pepper: `<path d="M7.5 9.5c-2 1.2-2 5.5-.8 7.6C8 20 10 21 12 21s4-1 5.3-3.9c1.2-2.1 1.2-6.4-.8-7.6-1.2 2-2.5 2.2-4.5 2.2S8.7 11.5 7.5 9.5z" fill="#43A047"/><path d="M12 7.5V4.5M12 4.5c2 0 2.2 2.2 0 3.2" stroke="#2E7D32" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  broccoli: `<g fill="#43A047"><circle cx="8.5" cy="9" r="3.2"/><circle cx="14" cy="7.6" r="3.2"/><circle cx="16" cy="11.6" r="3"/><circle cx="11.5" cy="11" r="3.2"/></g><path d="M8.5 13h7v4c0 1.5-7 1.5-7 0z" fill="#A5D6A7"/>`,
  corn: `<path d="M12 3c3 0 5 3.2 5 9s-2 9-5 9-5-3.2-5-9 2-9 5-9z" fill="#FDD835"/><g fill="#C0A000"><circle cx="10" cy="9" r=".7"/><circle cx="14" cy="9" r=".7"/><circle cx="12" cy="12" r=".7"/><circle cx="10" cy="15" r=".7"/><circle cx="14" cy="15" r=".7"/></g><path d="M7 13c-2.2-1-3.5.2-4.2 2.2 2.2 1 3.5-.2 4.2-2.2z" fill="#7CB342"/>`,
  pumpkin: `<ellipse cx="12" cy="14.5" rx="9" ry="6.8" fill="#FB8C00"/><path d="M12 8v13M8 9c-2 3-2 9 0 11.4M16 9c2 3 2 9 0 11.4" stroke="#EF6C00" stroke-width="1" fill="none"/><path d="M12 8V4.5" stroke="#5D4037" stroke-width="1.6" stroke-linecap="round"/>`,
  eggplant: `<path d="M16.5 8c2.2 2.2 1.2 6.2-2 9.3s-7.3 4.2-9.5 2 0-6.3 3.2-9.5C10.2 7.6 13.3 6.5 16.5 8z" fill="#7B1FA2"/><path d="M15 7c1-2 3.2-2 4.3-.8-1 1-1 2.2-3.3 2.2" fill="#43A047"/>`,
  cucumber: `<path d="M7 7c-2 2-2 5.2 0 7.2l2.8 2.8c2 2 5.2 2 7.2 0s2-5.2 0-7.2L14.2 7c-2-2-5.2-2-7.2 0z" fill="#66BB6A"/><g fill="#388E3C"><circle cx="10" cy="10" r=".7"/><circle cx="12.5" cy="12.5" r=".7"/><circle cx="14.5" cy="11" r=".7"/></g>`,
  pea: `<path d="M5 9c0-2 4-3 8 0s6 3 6 6c0 1-1 2-3 1-1-1-2-4-5-6S5 11 5 9z" fill="#7CB342"/><g fill="#33691E"><circle cx="9" cy="11.5" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="15" cy="14.5" r="1.5"/></g>`,
  tuber: `<g transform="rotate(-15 12 13)"><ellipse cx="12" cy="13" rx="8" ry="5.6" fill="#A1887F"/></g><g fill="#6D4C41"><circle cx="9" cy="11" r=".7"/><circle cx="14" cy="14" r=".7"/><circle cx="12" cy="10.5" r=".7"/></g>`,
  mushroom: `<path d="M5 12c0-4 3-7 7-7s7 3 7 7c0 1-1 1.2-2 1.2H7C6 13.2 5 13 5 12z" fill="#A1887F"/><path d="M10 13.2h4V18c0 1.4-4 1.4-4 0z" fill="#EFEBE9"/>`,
  garlic: `<path d="M12 4c-1.2 2.2-4 3.4-4 9 0 4 2 7 4 7s4-3 4-7c0-5.6-2.8-6.8-4-9z" fill="#FAFAFA" stroke="#E0E0E0"/><path d="M9 8.5c-1 6-1 9 0 11.5M15 8.5c1 6 1 9 0 11.5" stroke="#E0E0E0" stroke-width="1" fill="none"/>`,
  flower: `<g fill="#EC407A"><circle cx="12" cy="7" r="3"/><circle cx="7" cy="11" r="3"/><circle cx="17" cy="11" r="3"/><circle cx="9" cy="16.5" r="3"/><circle cx="15" cy="16.5" r="3"/></g><circle cx="12" cy="12" r="2.6" fill="#FFD54F"/>`,
  pig: `<path d="M4.5 8l2.5 3M19.5 8L17 11" stroke="#F48FB1" stroke-width="3" stroke-linecap="round"/><ellipse cx="12" cy="13.5" rx="8" ry="6" fill="#F48FB1"/><ellipse cx="12" cy="14.5" rx="3" ry="2.4" fill="#EC407A"/><circle cx="11" cy="14.5" r=".5" fill="#AD1457"/><circle cx="13" cy="14.5" r=".5" fill="#AD1457"/><circle cx="9" cy="10.5" r=".8" fill="#4E342E"/><circle cx="15" cy="10.5" r=".8" fill="#4E342E"/>`,
  chicken: `<circle cx="13" cy="13.5" r="6" fill="#FFFFFF" stroke="#E0E0E0"/><path d="M13 7.5c-.4-2 1.4-3.2 2.6-2.2-1 1 .2 2.8-2.6 2.2z" fill="#E53935"/><path d="M19 12l3.2-1-3.2-1z" fill="#FB8C00"/><circle cx="17.5" cy="12" r=".9" fill="#3E2723"/><path d="M7.5 18.5c-2 .3-3.5-1.2-2.6-2.4 1 1.6 2.8.8 2.6 2.4z" fill="#FB8C00"/>`,
  duck: `<path d="M7 16c-2.2 1-4.2 0-4-2.4 2 1.4 3.4.4 4 2.4z" fill="#FFD54F"/><circle cx="13" cy="12" r="6.2" fill="#FFD54F"/><circle cx="15.4" cy="10.2" r=".9" fill="#3E2723"/><path d="M18.5 12l3.5.2-2 2z" fill="#FB8C00"/>`,
  sheep: `<g fill="#FAFAFA" stroke="#E0E0E0"><circle cx="9" cy="11" r="3"/><circle cx="13" cy="9" r="3"/><circle cx="16" cy="12" r="3"/><circle cx="11" cy="14" r="3"/><circle cx="15" cy="15" r="3"/></g><ellipse cx="7" cy="10" rx="2.4" ry="3" fill="#6D4C41"/><circle cx="6.2" cy="9.2" r=".5" fill="#fff"/><path d="M5.5 13l-1 2M8 13.5l-.6 2" stroke="#6D4C41" stroke-width="1.2" stroke-linecap="round"/>`,
  egg: `<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z" fill="#FFF8E1" stroke="#F0E0B0"/><path d="M9 16a3 3 0 0 0 5-1" stroke="#F0E0B0" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  shrimp: `<path d="M6 8c5-1 11 1 13.2 6.2-1 3-4.2 4-7.2 2.8 2-1 3-3.2 2-5.2-2-3-6.2-4-9.2-2C3.6 8.4 4 7 6 7z" fill="#FF7043"/><path d="M19 14.4c2 1 3.2 0 3.2-2.2" stroke="#FF7043" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="8" cy="9" r=".7" fill="#fff"/>`,
  crab: `<path d="M6 12C3 11 3 8 5 7c0 2 2 2 3 3zM18 12c3-1 3-4 1-5 0 2-2 2-3 3z" fill="#E53935"/><ellipse cx="12" cy="14" rx="6" ry="4.2" fill="#EF5350"/><circle cx="10" cy="13" r=".7" fill="#fff"/><circle cx="14" cy="13" r=".7" fill="#fff"/><path d="M8 18l-2 2.4M16 18l2 2.4M9.5 19l-1 2.4M14.5 19l1 2.4" stroke="#E53935" stroke-width="1.4" stroke-linecap="round"/>`,
  shell: `<path d="M12 18.5C6 18.5 3 13 4 9c1 .2 2 .8 3-.2.8-.6 1-1.3 2-1.3s1.2.9 2 1.5c.8-.6 1.2-1.5 2-1.5s1.2 1 2 1.6c1 .8 2 .1 3-.1 1 4-2 9.5-8 9.5z" fill="#FFCCBC" stroke="#FFAB91"/><path d="M12 8.5v9.5M8 9.5l2 8M16 9.5l-2 8" stroke="#FFAB91" stroke-width=".9" fill="none"/>`,
  squid: `<path d="M12 3c3 0 5 3 5 6.6 0 1.6-.8 2.6-.8 3.6 0 .8 1 .6 1 1.6s-1 .8-1 1.4 1 .6 1 1.4-1 1-1.8 1c-1 0-1.2-1-2.2-1s-1.2 1-2.2 1-1.2-1-2.2-1-1.2 1-2.2 1c-.8 0-1.8-.2-1.8-1s1-.6 1-1.4-1-.4-1-1.4 1-.8 1-1.6c0-1-.8-2-.8-3.6C7 6 9 3 12 3z" fill="#BA68C8"/><circle cx="10" cy="9.5" r="1" fill="#fff"/><circle cx="14" cy="9.5" r="1" fill="#fff"/><circle cx="10" cy="9.5" r=".4" fill="#4A148C"/><circle cx="14" cy="9.5" r=".4" fill="#4A148C"/>`,
  fish: `<path d="M4 12c3-4 9-5 13.2-3 1-2 3-3 3-3s.2 3-.8 4.2c1 1 1 2.6 0 3.6 1 1.2.8 4.2.8 4.2s-2-1-3-3C13 18 7 17 4 12z" fill="#42A5F5"/><circle cx="9" cy="11" r="1" fill="#fff"/><circle cx="9" cy="11" r=".45" fill="#0D3B66"/><path d="M11 12c2-1 4-1 6 0" stroke="#1E88E5" stroke-width="1" fill="none" stroke-linecap="round"/>`,
}

interface CropIconProps {
  /** Crop name (e.g. "高麗菜"). Resolved to a category icon. */
  name: string
  /** Tailwind sizing/styling, e.g. "w-7 h-7". Defaults to "w-6 h-6". */
  className?: string
}

export function CropIcon({ name, className = 'w-6 h-6' }: CropIconProps) {
  const key = resolveCropIconKey(name)
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={name || '農產品'}
      // Static, trusted markup — no user input reaches this path.
      dangerouslySetInnerHTML={{ __html: ICON_SVG[key] }}
    />
  )
}
