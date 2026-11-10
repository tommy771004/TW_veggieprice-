/**
 * 導覽共用資料：底部分頁列的五個分頁，以及 header 左側顯示的「目前頁面」名稱。
 * TopAppBar 與 BottomNav 都從這裡讀，分頁與頁名才不會兩邊各寫一份。
 */
export const MAIN_NAV_ITEMS = [
  { href: '/', icon: 'dashboard', label: '首頁' },
  { href: '/search', icon: 'search', label: '搜尋' },
  { href: '/seasonal', icon: 'local_florist', label: '當季' },
  { href: '/watchlist', icon: 'monitoring', label: '關注' },
  { href: '/insights', icon: 'insights', label: '洞察' },
] as const

export function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  if (href === '/search') return pathname === '/search' || pathname.startsWith('/produce/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

const SITE_NAME = '農時價'

/** 由長到短比對；沒有對應的路徑（例如 404）退回站名，不冒充首頁。 */
const ROUTE_LABELS: ReadonlyArray<readonly [prefix: string, label: string]> = [
  ['/produce/category', '分類行情'],
  ['/produce', '單品行情'],
  ['/search', '作物搜尋'],
  ['/seasonal', '當季盛產'],
  ['/watchlist', '追蹤清單'],
  ['/market', '市場行情'],
  ['/insights', '洞察與分析'],
  ['/healthy-basket', '一餐好菜籃'],
  ['/settings', '使用設定'],
  ['/about', '關於農時價'],
  ['/privacy', '隱私與合作揭露'],
]

export function getRouteLabel(pathname: string | null) {
  if (!pathname) return SITE_NAME
  if (pathname === '/') return '首頁總覽'
  const match = ROUTE_LABELS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return match ? match[1] : SITE_NAME
}
