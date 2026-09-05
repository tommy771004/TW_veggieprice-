import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createWriteRequestGuard } from './writeRequest.ts'

function request(body = '{"message":"你好"}', headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/feedback', {
    method: 'POST', body,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

const guard = () => createWriteRequestGuard({ maxBytes: 100, limit: 10, trustVercelProxy: false })

describe('write request protection', () => {
  it('accepts normal JSON and the sendBeacon JSON Blob content type', async () => {
    const headerCases: Record<string, string>[] = [
      {},
      { origin: 'https://example.test', 'content-type': 'application/json; charset=UTF-8' },
    ]
    for (const headers of headerCases) {
      const result = await guard()(request(undefined, headers))
      assert.deepEqual(result.body, { message: '你好' })
    }
  })

  it('rejects malformed JSON, null, arrays and primitives without throwing', async () => {
    for (const body of ['', '{', 'null', '[]', '"message"', 'true', '123']) {
      assert.equal((await guard()(request(body))).response?.status, 400, body)
    }
  })

  it('rejects foreign/null origins, cross-site requests, and form payloads', async () => {
    const headerCases: Record<string, string>[] = [
      { origin: 'https://other.test' },
      { origin: 'null' },
      { 'sec-fetch-site': 'cross-site' },
    ]
    for (const headers of headerCases) {
      assert.equal((await guard()(request(undefined, headers))).response?.status, 403)
    }
    assert.equal((await guard()(request(undefined, { 'content-type': 'text/plain' }))).response?.status, 415)
  })

  it('limits declared and actual bytes, including multibyte text and forged lengths', async () => {
    assert.equal((await guard()(request('{}', { 'content-length': '101' }))).response?.status, 413)
    const body = JSON.stringify({ message: '菜'.repeat(40) })
    assert.ok(body.length < 100)
    const headerCases: Record<string, string>[] = [{}, { 'content-length': '1' }]
    for (const headers of headerCases) {
      assert.equal((await guard()(request(body, headers))).response?.status, 413)
    }
  })

  it('cancels an oversized streamed body instead of reading the rest', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(101)) },
      cancel() { cancelled = true },
    })
    const req = new Request('https://example.test', {
      method: 'POST', body, headers: { 'content-type': 'application/json' }, duplex: 'half',
    } as RequestInit)
    assert.equal((await guard()(req)).response?.status, 413)
    assert.equal(cancelled, true)
  })

  it('returns Retry-After and allows requests again after the window', async () => {
    let now = 0
    const read = createWriteRequestGuard({ maxBytes: 100, limit: 2, now: () => now, trustVercelProxy: false })
    assert.ok((await read(request())).body)
    assert.ok((await read(request())).body)
    now = 1000
    const rejected = await read(request())
    assert.equal(rejected.response?.status, 429)
    assert.equal(rejected.response?.headers.get('retry-after'), '59')
    assert.equal(rejected.response?.headers.get('cache-control'), 'no-store')
    now = 60_000
    assert.ok((await read(request())).body)
  })

  it('ignores spoofed proxy headers outside Vercel and separates trusted IPs on Vercel', async () => {
    for (const trusted of [false, true]) {
      const read = createWriteRequestGuard({ maxBytes: 100, limit: 1, trustVercelProxy: trusted })
      assert.ok((await read(request('{}', { 'x-forwarded-for': '192.0.2.1' }))).body)
      const second = await read(request('{}', { 'x-forwarded-for': '192.0.2.2' }))
      assert.equal(second.response?.status, trusted ? undefined : 429)
    }
  })

  it('bounds IP buckets without evicting active limits, then prunes expired entries', async () => {
    let now = 0
    const read = createWriteRequestGuard({ maxBytes: 100, limit: 1, maxKeys: 1, now: () => now, trustVercelProxy: true })
    assert.ok((await read(request('{}', { 'x-forwarded-for': '192.0.2.1' }))).body)
    assert.equal((await read(request('{}', { 'x-forwarded-for': '192.0.2.2' }))).response?.status, 429)
    assert.equal((await read(request('{}', { 'x-forwarded-for': '192.0.2.1' }))).response?.status, 429)
    now = 60_000
    assert.ok((await read(request('{}', { 'x-forwarded-for': '192.0.2.2' }))).body)
  })
})
