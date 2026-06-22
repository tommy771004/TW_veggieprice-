/**
 * 輕量前端行為稽核（AuditLog）工具。
 *
 * 設計重點：
 * - 事件先進入佇列，批次（每 4 秒或滿 20 筆）以 sendBeacon 送往 /api/audit，
 *   避免每次點擊都打一支 request。
 * - 分頁隱藏 / 卸載時強制 flush，確保最後的事件不遺失。
 * - 以匿名訪客識別碼（localStorage）串接同一使用者的行為，不蒐集個資。
 * - 完全靜默：任何失敗都不影響使用者操作。
 */

const ENDPOINT = '/api/audit'
const SESSION_KEY = 'vp_session_id'
const FLUSH_INTERVAL_MS = 4000
const FLUSH_THRESHOLD = 20

export type AuditEvent = {
  action: string
  target?: string
  path?: string
  metadata?: Record<string, unknown>
  ts: number
}

let queue: AuditEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
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
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

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

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush()
  }, FLUSH_INTERVAL_MS)
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
  if (typeof window === 'undefined' || !action) return
  queue.push({
    action,
    target,
    path: window.location?.pathname,
    metadata,
    ts: Date.now(),
  })
  if (queue.length >= FLUSH_THRESHOLD) {
    flush()
  } else {
    scheduleFlush()
  }
}
