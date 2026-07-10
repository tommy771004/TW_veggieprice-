import { NextRequest, NextResponse, after } from 'next/server'
import { getSql } from '@/lib/server/db'
import { makeLogger } from '@/lib/server/logger'
import { isAllowedAuditAction } from '@/lib/auditEvents'
import { sendTelemetryBatch } from '@/lib/server/telemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = makeLogger('api/audit')

const MAX_EVENTS = 50
const MAX_ACTION = 80
const MAX_TARGET = 256
const MAX_PATH = 512
const MAX_META_CHARS = 4000

const noContent = () => new NextResponse(null, { status: 204 })

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function safeTimestamp(ts: unknown): string {
  const now = Date.now()
  const n = typeof ts === 'number' ? ts : now
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

  const params: unknown[] = []
  const rows: string[] = []
  const telemetryEvents: Array<{ name: string; properties: { route: string } }> = []

  for (const raw of rawEvents.slice(0, MAX_EVENTS)) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as Record<string, unknown>
    const action = str(e.action, MAX_ACTION)
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
    rows.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::jsonb, $${base + 6}, $${base + 7})`,
    )
    telemetryEvents.push({
      name: `audit.${action}`,
      properties: { route: str(e.path, MAX_PATH)?.slice(0, 120) ?? '/' },
    })
  }

  if (rows.length === 0) return noContent()

  const query =
    `INSERT INTO audit_log (session_id, action, target, path, metadata, user_agent, created_at) VALUES ` +
    rows.join(', ')

  after(async () => {
    let attempts = 0
    const maxAttempts = 3
    while (attempts < maxAttempts) {
      try {
        await sql.query(query, params)
        sendTelemetryBatch(telemetryEvents)
        break
      } catch (err) {
        attempts++
        const errMsg = err instanceof Error ? err.message : String(err)
        const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : null
        const isRetryable =
          errObj &&
          (errObj.retryable === true ||
            errObj['neon:retryable'] === true ||
            errMsg.toLowerCase().includes('control plane request failed') ||
            errMsg.toLowerCase().includes('retryable'))

        if (isRetryable && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempts * 1000))
          continue
        }
        log.error('寫入行為稽核失敗', err)
        break
      }
    }
  })

  return noContent()
}
