/**
 * 輕量前端行為稽核（AuditLog）工具。
 *
 * 設計重點：
 * - 事件先進入佇列，只在分頁隱藏 / 卸載時，或累積滿 20 筆時，以 sendBeacon
 *   送往 /api/audit。每次送出都是一次 Vercel Function 加一次 DB 寫入，
 *   所以不用定時送出（原本每 4 秒一次，停留越久請求越多）。
 * - 代價：瀏覽器被直接終止、沒觸發 pagehide / visibilitychange 時，
 *   該批事件會遺失；後台資料是離開頁面後才寫入，不是即時的。
 * - 以匿名訪客識別碼（localStorage）串接同一使用者的行為，不蒐集個資。
 * - 完全靜默：任何失敗都不影響使用者操作。
 */

import { isAllowedAuditAction } from './auditEvents'

const ENDPOINT = '/api/audit'
const SESSION_KEY = 'vp_session_id'
// 一次最多 20 筆，讓 payload 遠低於 sendBeacon 的 64KB 上限。
const FLUSH_THRESHOLD = 20

export type AuditEvent = {
  action: string
  target?: string
  path?: string
  metadata?: Record<string, unknown>
  ts: number
}

let queue: AuditEvent[] = []
let listenersBound = false

/** 取得（或建立）匿名訪客識別碼，存於 localStorage。 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(SESSION_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

function flush() {
  if (typeof window === 'undefined' || queue.length === 0) return
  const events = queue
  queue = []

  const payload = JSON.stringify({ sessionId: getSessionId(), events })
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      const ok = navigator.sendBeacon(ENDPOINT, blob)
      if (ok) return
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // 靜默忽略
  }
}

/** 綁定分頁隱藏 / 卸載時的 flush，只會綁一次。 */
export function initAnalytics() {
  if (listenersBound || typeof window === 'undefined') return
  listenersBound = true
  const onHide = () => flush()
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

/** 記錄一筆使用者行為事件。 */
export function trackEvent(
  action: string,
  target?: string,
  metadata?: Record<string, unknown>,
) {
  // 只記錄白名單內的重要事件，未列入者直接略過（不入列、不送網路）。
  if (typeof window === 'undefined' || !isAllowedAuditAction(action)) return
  // 沒有定時送出，所以一定要綁好隱藏 / 卸載的 flush，否則事件會卡在佇列裡。
  initAnalytics()
  queue.push({
    action,
    target,
    path: window.location?.pathname,
    metadata,
    ts: Date.now(),
  })
  if (queue.length >= FLUSH_THRESHOLD) flush()
}
