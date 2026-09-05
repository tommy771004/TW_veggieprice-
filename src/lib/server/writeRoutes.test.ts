import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { createWriteRequestGuard } from './writeRequest.ts'
import { isAllowedAuditAction } from '../auditEvents.ts'

// Execute the real route source with an explicit import allowlist. Never import
// db.ts, Next's runtime, telemetry, or any real environment/database connection.
function route(name: 'feedback' | 'audit', configured = true, failWrite = false) {
  const writes: unknown[][] = []
  const jobs: Array<() => Promise<void>> = []
  const telemetry: unknown[] = []
  const sql = Object.assign(async (_strings: TemplateStringsArray, ...params: unknown[]) => {
    if (failWrite) throw new Error('test database error')
    writes.push(params)
  }, {
    query: async (_query: string, params: unknown[]) => {
      if (failWrite) throw new Error('test database error')
      writes.push(params)
    },
  })
  const imports: Record<string, unknown> = {
    'next/server': { NextResponse: Response, after: (job: () => Promise<void>) => jobs.push(job) },
    '@/lib/server/db': { getSql: () => configured ? sql : null },
    '@/lib/server/logger': { makeLogger: () => ({ error: () => {} }) },
    '@/lib/server/telemetry': {
      sendTelemetry: (...args: unknown[]) => telemetry.push(args),
      sendTelemetryBatch: (...args: unknown[]) => telemetry.push(args),
    },
    '@/lib/auditEvents': { isAllowedAuditAction },
    '@/lib/server/writeRequest': {
      createWriteRequestGuard: (options: Parameters<typeof createWriteRequestGuard>[0]) =>
        createWriteRequestGuard({ ...options, trustVercelProxy: false }),
    },
  }
  const source = readFileSync(new URL(`../../app/api/${name}/route.ts`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const exports: { POST?: (req: Request) => Promise<Response> } = {}
  runInNewContext(outputText, {
    exports,
    require: (id: string) => {
      if (!(id in imports)) throw new Error(`Unexpected route dependency: ${id}`)
      return imports[id]
    },
    setTimeout,
  })
  return {
    post: exports.POST!, writes, jobs, telemetry,
    flush: async () => { for (const job of jobs) await job() },
  }
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/test', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', origin: 'https://example.test', ...headers },
  })
}

describe('protected write routes (isolated DB and telemetry)', () => {
  it('keeps successful feedback normalization and writes exactly once', async () => {
    const app = route('feedback')
    const response = await app.post(request({ message: '  菜價建議  ', contact: ' a@b.test ', category: 'bug', path: '/', sessionId: 'test' }))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
    assert.deepEqual(app.writes, [['bug', '菜價建議', 'a@b.test', '/', 'test', null]])
    assert.equal(app.telemetry.length, 1)
  })

  it('preserves missing database and write-failure responses', async () => {
    assert.equal((await route('feedback', false).post(request({ message: 'test' }))).status, 503)
    assert.equal((await route('audit', false).post(request({ events: [] }))).status, 204)
    const app = route('feedback', true, true)
    assert.equal((await app.post(request({ message: 'test' }))).status, 500)
    assert.equal(app.telemetry.length, 0)
  })

  it('rejects null/arrays/primitives safely without writing or scheduling work', async () => {
    for (const name of ['feedback', 'audit'] as const) {
      const app = route(name)
      for (const body of [null, [], 'text', true, 1]) {
        assert.equal((await app.post(request(body))).status, name === 'feedback' ? 400 : 204)
      }
      assert.equal(app.writes.length, 0)
      assert.equal(app.jobs.length, 0)
    }
  })

  it('blocks cross-site and oversized requests before either database write', async () => {
    for (const name of ['feedback', 'audit'] as const) {
      const app = route(name)
      assert.equal((await app.post(request({}, { origin: 'https://other.test' }))).status, 403)
      assert.equal((await app.post(request({ message: 'x'.repeat(300_000) }))).status, 413)
      assert.equal(app.writes.length, 0)
      assert.equal(app.jobs.length, 0)
    }
  })

  it('enforces feedback rate limits without additional writes', async () => {
    const app = route('feedback')
    for (let i = 0; i < 10; i++) assert.equal((await app.post(request({ message: 'test' }))).status, 200)
    assert.equal((await app.post(request({ message: 'test' }))).status, 429)
    assert.equal(app.writes.length, 10)
  })

  it('keeps audit batching, allowlist, 50-event cap and after-response scheduling', async () => {
    const app = route('audit')
    const events = [null, { action: 'not_allowed' }, ...Array.from({ length: 60 }, () => ({ action: 'page_view', path: '/' }))]
    assert.equal((await app.post(request({ sessionId: 'test', events }))).status, 204)
    assert.equal(app.writes.length, 0)
    assert.equal(app.jobs.length, 1)
    await app.flush()
    assert.equal(app.writes.length, 1)
    assert.equal(app.writes[0].length, 48 * 7)
    // VM arrays have a different prototype; compare their values in this realm.
    assert.deepEqual(Array.from(app.writes[0].slice(0, 4)), ['test', 'page_view', null, '/'])
    assert.equal(app.telemetry.length, 1)
  })

  it('enforces audit rate limits before scheduling extra jobs', async () => {
    const app = route('audit')
    for (let i = 0; i < 120; i++) {
      assert.equal((await app.post(request({ events: [{ action: 'page_view' }] }))).status, 204)
    }
    assert.equal((await app.post(request({ events: [{ action: 'page_view' }] }))).status, 429)
    assert.equal(app.jobs.length, 120)
  })
})
