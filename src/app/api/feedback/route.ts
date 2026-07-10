import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/server/db'
import { makeLogger } from '@/lib/server/logger'
import { sendTelemetry } from '@/lib/server/telemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = makeLogger('api/feedback')

const MAX_MESSAGE = 2000
const MAX_CONTACT = 200
const MAX_PATH = 512
const ALLOWED_CATEGORIES = new Set(['suggestion', 'bug', 'data', 'other'])

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

export async function POST(req: NextRequest) {
  const sql = getSql()
  if (!sql) {
    return NextResponse.json(
      { error: '尚未設定資料庫連線，請稍後再試。' },
      { status: 503 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: '無效的請求內容。' }, { status: 400 })
  }

  const message = str(body.message, MAX_MESSAGE)
  if (!message) {
    return NextResponse.json({ error: '請輸入回饋內容。' }, { status: 400 })
  }

  const category =
    typeof body.category === 'string' && ALLOWED_CATEGORIES.has(body.category)
      ? body.category
      : 'other'
  const contact = str(body.contact, MAX_CONTACT)
  const path = str(body.path, MAX_PATH)
  const sessionId = str(body.sessionId, 100)
  const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? null

  try {
    await sql`
      INSERT INTO feedback (category, message, contact, path, session_id, user_agent)
      VALUES (${category}, ${message}, ${contact}, ${path}, ${sessionId}, ${userAgent})
    `
    sendTelemetry('feedback.submitted', { category })
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('寫入意見回饋失敗', err)
    return NextResponse.json({ error: '寫入失敗，請稍後再試。' }, { status: 500 })
  }
}
