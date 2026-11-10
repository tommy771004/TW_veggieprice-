/**
 * 站長的其他工具站。首頁「更多實用工具推薦」區塊與側邊選單「更多工具服務」共用這份清單，
 * 兩處的名稱與連結才不會各改各的。
 */
export interface RecommendedProject {
  title: string
  url: string
  description: string
  icon: string
  color: string
}

export const RECOMMENDED_PROJECTS: readonly RecommendedProject[] = [
  {
    title: '台灣台鐵/高鐵時刻查詢',
    url: 'https://taiwanrail.vercel.app/',
    description: '整合台鐵與高鐵即時時刻表，提供最直覺的路網查詢體驗。支援 RWD 介面，讓您的通勤行程一手掌握。',
    icon: '🚅',
    color: 'border-blue-200/50 text-blue-700',
  },
  {
    title: 'AI 行程規劃助手',
    url: 'https://roam-jelly-web.vercel.app/',
    description: '運用人工智慧為您量身打造旅遊行程。只需輸入目的地與偏好，即可生成完整的景點與路線建議。',
    icon: '✈️',
    color: 'border-purple-200/50 text-purple-700',
  },
  {
    title: '皮克敏 輔助工具',
    url: 'https://pikmin-tool-two.vercel.app/',
    description: '為《皮克敏》系列遊戲提供實用的輔助工具，包括物品管理追蹤等功能。',
    icon: '🎮',
    color: 'border-emerald-200/50 text-emerald-700',
  },
]
