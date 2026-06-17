/**
 * townshipCountyMap — resolve a Taiwan township / district name to its county.
 *
 * Why: crop "origin" strings (from traceability + curated data) are sometimes at
 * district granularity (e.g. "五股區", "三星鄉", "玉井區"). The weather lookup only
 * knows county-level names, so those origins silently fail.
 *
 * Safety: Taiwan district names are NOT globally unique (中正/中山/信義/東區/西區…
 * repeat across cities). To avoid mis-assigning a county we deliberately map ONLY
 * unambiguous names — overwhelmingly the rural/agricultural townships that actually
 * appear as produce origins. Ambiguous urban districts are intentionally omitted, so
 * an unknown name returns null (the pre-existing "no weather" behaviour — no regression).
 *
 * County values use the short form the weather route already matches on (台北, 新北, …).
 */

// district/township (without the 區/鄉/鎮/市 suffix) → short county name
const TOWNSHIP_TO_COUNTY: Record<string, string> = {}

function register(county: string, townships: string[]) {
  for (const t of townships) {
    // Last write wins; the lists below are curated to avoid cross-county clashes.
    TOWNSHIP_TO_COUNTY[t] = county
  }
}

// 新北市 — rural/agri townships (urban 板橋/三重/中和/永和… handled by county keyword)
register('新北', [
  '五股', '泰山', '林口', '深坑', '石碇', '坪林', '三芝', '石門', '八里',
  '平溪', '雙溪', '貢寮', '金山', '萬里', '烏來', '鶯歌', '三峽', '瑞芳',
])

// 桃園市
register('桃園', [
  '蘆竹', '大園', '龜山', '八德', '龍潭', '新屋', '觀音', '復興', '大溪', '楊梅',
])

// 新竹縣
register('新竹', [
  '竹北', '湖口', '新豐', '新埔', '關西', '芎林', '寶山', '竹東', '五峰',
  '橫山', '尖石', '北埔', '峨眉',
])

// 苗栗縣
register('苗栗', [
  '苗栗', '苑裡', '通霄', '竹南', '頭份', '後龍', '卓蘭', '大湖', '公館',
  '銅鑼', '南庄', '頭屋', '三義', '西湖', '造橋', '三灣', '獅潭', '泰安',
])

// 臺中市 — agri townships
register('台中', [
  '太平', '大里', '霧峰', '烏日', '豐原', '后里', '石岡', '東勢', '和平',
  '新社', '潭子', '大雅', '神岡', '大肚', '沙鹿', '龍井', '梧棲', '清水',
  '大甲', '外埔', '大安',
])

// 彰化縣
register('彰化', [
  '彰化', '員林', '和美', '鹿港', '溪湖', '二林', '田中', '北斗', '花壇',
  '芬園', '秀水', '福興', '線西', '伸港', '埔心', '大村', '埔鹽', '永靖',
  '社頭', '二水', '田尾', '埤頭', '芳苑', '大城', '竹塘', '溪州', '溪洲',
])

// 南投縣
register('南投', [
  '南投', '草屯', '埔里', '竹山', '集集', '名間', '鹿谷', '中寮', '魚池',
  '國姓', '水里', '信義', '仁愛', // 信義/仁愛 here would clash — removed below
])
delete TOWNSHIP_TO_COUNTY['信義'] // 信義 also 台北市/基隆市 — ambiguous
delete TOWNSHIP_TO_COUNTY['仁愛'] // 仁愛 also 基隆市/台南市 — ambiguous

// 雲林縣
register('雲林', [
  '斗六', '斗南', '虎尾', '西螺', '土庫', '北港', '古坑', '大埤', '莿桐',
  '林內', '二崙', '崙背', '麥寮', '東勢', '褒忠', '台西', '元長', '四湖',
  '口湖', '水林',
])
// 東勢 exists in both 台中 and 雲林 — drop to avoid mis-assignment
delete TOWNSHIP_TO_COUNTY['東勢']

// 嘉義縣
register('嘉義', [
  '太保', '朴子', '布袋', '大林', '民雄', '溪口', '新港', '六腳', '東石',
  '義竹', '鹿草', '水上', '中埔', '竹崎', '梅山', '番路', '大埔', '阿里山',
])

// 臺南市 — agri districts
register('台南', [
  '永康', '歸仁', '新化', '左鎮', '玉井', '楠西', '南化', '仁德', '關廟',
  '龍崎', '官田', '麻豆', '佳里', '西港', '七股', '將軍', '學甲', '北門',
  '新營', '後壁', '白河', '東山', '六甲', '下營', '柳營', '鹽水', '善化',
  '大內', '山上', '新市', '安定',
])

// 高雄市 — agri districts
register('高雄', [
  '鳳山', '大寮', '鳥松', '林園', '仁武', '大樹', '大社', '岡山', '路竹',
  '橋頭', '梓官', '彌陀', '永安', '燕巢', '田寮', '阿蓮', '茄萣', '湖內',
  '旗山', '美濃', '內門', '杉林', '甲仙', '六龜', '茂林', '桃源', '那瑪夏',
])

// 屏東縣
register('屏東', [
  '屏東', '潮州', '東港', '恆春', '里港', '萬丹', '長治', '麟洛', '九如',
  '鹽埔', '高樹', '萬巒', '內埔', '竹田', '新埤', '枋寮', '枋山', '春日',
  '獅子', '車城', '滿州', '林邊', '南州', '佳冬', '琉球', '崁頂', '新園',
  '霧台', '瑪家', '泰武', '來義', '牡丹',
])

// 宜蘭縣
register('宜蘭', [
  '宜蘭', '羅東', '蘇澳', '頭城', '礁溪', '壯圍', '員山', '冬山', '五結',
  '三星', '大同', '南澳',
])
delete TOWNSHIP_TO_COUNTY['大同'] // 大同 also 台北市 — ambiguous

// 花蓮縣
register('花蓮', [
  '花蓮', '鳳林', '玉里', '新城', '吉安', '壽豐', '光復', '豐濱', '瑞穗',
  '富里', '秀林', '萬榮', '卓溪',
])

// 臺東縣
register('台東', [
  '台東', '成功', '關山', '卑南', '大武', '太麻里', '東河', '長濱', '鹿野',
  '池上', '綠島', '延平', '海端', '達仁', '金峰', '蘭嶼',
])

// 基隆市 (七堵/暖暖/安樂 unique; 中正/中山/仁愛/信義 omitted as ambiguous)
register('基隆', ['七堵', '暖暖', '安樂'])

// 澎湖縣
register('澎湖', ['馬公', '湖西', '白沙', '西嶼', '望安', '七美'])

// 金門縣
register('金門', ['金城', '金沙', '金湖', '金寧', '烈嶼'])

// 連江縣
register('連江', ['南竿', '北竿', '莒光', '東引'])

/**
 * Resolve a county (short form, e.g. "新北") from an origin string that may be a
 * township/district. Returns null when the name is unknown or ambiguous.
 */
export function resolveCountyFromTownship(origin: string): string | null {
  if (!origin) return null
  const cleaned = origin
    .trim()
    .replace(/臺/g, '台')
    .replace(/[區鄉鎮市縣]$/g, '')
  if (!cleaned) return null
  if (TOWNSHIP_TO_COUNTY[cleaned]) return TOWNSHIP_TO_COUNTY[cleaned]
  // Substring fallback: handles "彰化溪洲" style prefixed origins.
  for (const [township, county] of Object.entries(TOWNSHIP_TO_COUNTY)) {
    if (cleaned.includes(township)) return county
  }
  return null
}
