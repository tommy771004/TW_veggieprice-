import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/server/db'
import { makeLogger } from '@/lib/server/logger'
import { isAllowedAuditAction } from '@/lib/auditEvents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = makeLogger('api/audit')

const MAX_EVENTS = 50
const MAX_ACTION = 80
const MAX_TARGET = 256
const MAX_PATH = 512
const MAX_META_CHARS = 4000

// 行為稽核以「靜默無聲」為原則：任何問題（未設定 DB、格式錯誤、寫入失敗）
// 都回 204，絕不影響使用者操作。所有寫入皆為匿名行為資料，不含個資。
const noContent = () => new NextResponse(null, { status: 204 })

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function safeTimestamp(ts: unknown): string {
  const now = Date.now()
  const n = typeof ts === 'number' ? ts : now
  // 夾在 now 前後合理區間內，避免異常或惡意時間戳。
  if (!Number.isFinite(n) || n < now - 86_400_000 || n > now + 60_000) {
    return new Date(now).toISOString()
  }
  return new Date(n).toISOString()
}

function metadataJson(value: unknown): string | null {
  if (value == null || typeof value !== 'object') return null
  try {
    const json = JSON.stringify(value)
    return json.length > MAX_META_CHARS ? null : json
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const sql = getSql()
  if (!sql) return noContent()

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return noContent()
  }

  const rawEvents = Array.isArray(body.events) ? body.events : []
  if (rawEvents.length === 0) return noContent()

  const sessionId = str(body.sessionId, 100)
  const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? null

  // 組成單次多列 INSERT（一個 HTTP round-trip）。
  // 欄位：session_id, action, target, path, metadata, user_agent, created_at
  const params: unknown[] = []
  const rows: string[] = []

  for (const raw of rawEvents.slice(0, MAX_EVENTS)) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as Record<string, unknown>
    const action = str(e.action, MAX_ACTION)
    // 僅接受白名單內的重要事件（伺服器端再過濾一次）。
    if (!action || !isAllowedAuditAction(action)) continue

    const base = params.length
    params.push(
      sessionId,
      action,
      str(e.target, MAX_TARGET),
      str(e.path, MAX_PATH),
      metadataJson(e.metadata),
      userAgent,
      safeTimestamp(e.ts),
    )
    // metadata 欄位（第 5 個）需轉型為 jsonb。
    rows.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::jsonb, $${base + 6}, $${base + 7})`,
    )
  }

  if (rows.length === 0) return noContent()

  const query =
    `INSERT INTO audit_log (session_id, action, target, path, metadata, user_agent, created_at) VALUES ` +
    rows.join(', ')

  try {
    await sql.query(query, params)
  } catch (err) {
    log.error('寫入行為稽核失敗', err)
  }
  return noContent()
}
