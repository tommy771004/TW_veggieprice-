import { createHash } from 'node:crypto'
import { isIP } from 'node:net'

export type WriteRequestResult =
  | { body: Record<string, unknown>; response?: never }
  | { body?: never; response: Response }

function reject(status: number, error: string, retryAfter?: number): WriteRequestResult {
  return {
    response: Response.json({ error }, {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...(retryAfter === undefined ? {} : { 'Retry-After': String(retryAfter) }),
      },
    }),
  }
}

/**
 * Best-effort per-instance protection, NOT a distributed rate limit.
 * Vercel overwrites x-forwarded-for at its edge. Outside Vercel, do not trust
 * caller-supplied IP headers: use a shared bucket instead. See docs/write-api-protection.md.
 */
export function createWriteRequestGuard(options: {
  maxBytes: number
  limit: number
  windowMs?: number
  maxKeys?: number
  now?: () => number
  trustVercelProxy?: boolean
}) {
  const buckets = new Map<string, { count: number; resetAt: number }>()
  const windowMs = options.windowMs ?? 60_000
  const maxKeys = options.maxKeys ?? 10_000
  const now = options.now ?? Date.now
  const trustVercelProxy = options.trustVercelProxy ?? process.env.VERCEL === '1'

  return async function readWriteRequest(request: Request): Promise<WriteRequestResult> {
    const origin = request.headers.get('origin')
    if (
      request.headers.get('sec-fetch-site') === 'cross-site' ||
      (origin !== null && origin !== new URL(request.url).origin)
    ) return reject(403, '不接受跨網站請求。')

    const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (contentType !== 'application/json') return reject(415, '請使用 JSON 格式。')

    const timestamp = now()
    const forwardedIp = trustVercelProxy
      ? request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      : undefined
    const key = forwardedIp && isIP(forwardedIp)
      ? createHash('sha256').update(forwardedIp).digest('hex')
      : 'shared'
    let bucket = buckets.get(key)
    if (!bucket || timestamp >= bucket.resetAt) {
      // Bound memory without evicting active limits (which would permit bypass).
      if (buckets.size >= maxKeys) {
        for (const [id, value] of buckets) {
          if (timestamp >= value.resetAt) buckets.delete(id)
        }
        if (buckets.size >= maxKeys) return reject(429, '請稍後再試。', Math.ceil(windowMs / 1000))
      }
      bucket = { count: 0, resetAt: timestamp + windowMs }
      buckets.set(key, bucket)
    }
    if (bucket.count >= options.limit) {
      return reject(429, '請求過於頻繁，請稍後再試。', Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000)))
    }
    bucket.count++

    if (Number(request.headers.get('content-length')) > options.maxBytes) {
      return reject(413, '請求內容過大。')
    }

    // Count actual streamed bytes too: Content-Length can be absent or forged.
    const reader = request.body?.getReader()
    if (!reader) return reject(400, '無效的請求內容。')
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > options.maxBytes) {
          void reader.cancel().catch(() => {})
          return reject(413, '請求內容過大。')
        }
        chunks.push(value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
      }
      const body: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return reject(400, '請求內容必須是 JSON 物件。')
      }
      return { body: body as Record<string, unknown> }
    } catch {
      return reject(400, '無效的請求內容。')
    } finally {
      reader.releaseLock()
    }
  }
}
