/**
 * 行為稽核白名單。
 *
 * 只有列在此處的 action 才會被記錄到 audit_log。用戶端（analytics.ts）會在
 * 入列前過濾、伺服器端（/api/audit）會在寫入前再過濾一次（defense-in-depth）。
 * 如此可同時降低 Neon 的寫入量/成本，並避免未授權的事件名稱被塞進資料庫。
 *
 * 要新增/移除「重要事件」，只需調整下面這個陣列即可（單一控制點）。
 * 未列入的事件（例如 notifications_open）即使呼叫了 trackEvent 也不會被記錄。
 */
export const AUDIT_ACTIONS = [
  'page_view', // 頁面瀏覽
  'nav_click', // 導覽列點擊
  'search_submit', // 搜尋送出
  'suggestion_select', // 搜尋建議選取
  'feedback_open', // 開啟意見回饋（回饋漏斗起點）
  'feedback_submit', // 送出意見回饋
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

const ALLOWED: ReadonlySet<string> = new Set(AUDIT_ACTIONS)

/** action 是否在白名單內。 */
export function isAllowedAuditAction(action: string): action is AuditAction {
  return ALLOWED.has(action)
}
