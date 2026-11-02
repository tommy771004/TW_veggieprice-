import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { runInNewContext } from 'node:vm'
import {
  AFFILIATE_SESSION_TTL_MS,
  AFFILIATE_STORAGE_KEY,
  createAffiliateOffersFetcher,
  normalizeAffiliateOffer,
  selectAffiliateOffers,
} from './affiliates.ts'

const offer = {
  id: 'test', enabled: true, sponsored: true, title: '{crop} 合作', description: '測試',
  ctaLabel: '查看', url: 'https://example.test/?crop={crop}', categories: ['vegetable'], priority: 1,
}
const response = (offers: unknown[] = [offer]) => Response.json({ offers })
const memoryStorage = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial))
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value) },
  }
}

describe('affiliate refresh', () => {
  it('deduplicates concurrent requests, caches successes and refreshes disabled offers', async () => {
    let calls = 0
    let now = 0
    const load = createAffiliateOffersFetcher({
      now: () => now, ttlMs: 100,
      fetch: async (_url, init) => {
        assert.equal(init?.cache, 'no-store')
        calls++
        return response(calls === 1 ? [offer] : [])
      },
    })
    const first = load()
    assert.equal(load(), first)
    assert.equal((await first).length, 1)
    now = 99
    assert.equal((await load()).length, 1)
    assert.equal(calls, 1)
    now = 100
    assert.deepEqual(await load(), [])
    assert.equal(calls, 2)
  })

  it('retries failures after backoff, including HTTP, malformed and network responses', async () => {
    for (const failure of [
      () => new Response('', { status: 503 }),
      () => new Response('{'),
      () => Response.json(null),
      () => Response.json({}),
      () => { throw new Error('offline') },
    ]) {
      let now = 0
      let calls = 0
      const load = createAffiliateOffersFetcher({
        now: () => now, retryMs: 10,
        fetch: async () => { calls++; return calls === 1 ? failure() : response() },
      })
      assert.deepEqual(await load(), [])
      assert.deepEqual(await load(), [])
      assert.equal(calls, 1)
      now = 10
      assert.equal((await load()).length, 1)
      assert.equal(calls, 2)
    }
  })

  it('times out a hung fetch and releases the in-flight request for retry', async () => {
    let now = 0
    let calls = 0
    const load = createAffiliateOffersFetcher({
      now: () => now, retryMs: 1, timeoutMs: 5,
      fetch: async (_url, init) => {
        calls++
        if (calls > 1) return response()
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        })
      },
    })
    assert.deepEqual(await load(), [])
    now = 1
    assert.equal((await load()).length, 1)
  })

  it('preserves carousel identity on unchanged content and clears offers on failure', async () => {
    let now = 0
    let fail = false
    const load = createAffiliateOffersFetcher({
      now: () => now, ttlMs: 1,
      fetch: async () => fail ? new Response('', { status: 500 }) : response(),
    })
    const first = await load()
    now = 1
    assert.equal(await load(), first)
    fail = true
    now = 2
    assert.deepEqual(await load(), [])
  })

  it('reuses one successful load for the whole session, across page reloads', async () => {
    const storage = memoryStorage()
    let calls = 0
    let now = 1_000
    const fetch = async () => { calls++; return response() }
    const firstPage = createAffiliateOffersFetcher({ now: () => now, storage, fetch })
    assert.equal((await firstPage()).length, 1)
    assert.equal(calls, 1)
    assert.ok(storage.items.has(AFFILIATE_STORAGE_KEY))

    // A reload creates a fresh fetcher; it must answer from sessionStorage.
    now += AFFILIATE_SESSION_TTL_MS - 1
    const reloaded = createAffiliateOffersFetcher({ now: () => now, storage, fetch })
    assert.equal((await reloaded()).length, 1)
    assert.equal((await reloaded()).length, 1)
    assert.equal(calls, 1)

    now += 1
    const expired = createAffiliateOffersFetcher({ now: () => now, storage, fetch })
    assert.equal((await expired()).length, 1)
    assert.equal(calls, 2)
  })

  it('never persists failures and ignores unusable stored entries', async () => {
    for (const stored of [
      '{',
      JSON.stringify({ offers: [offer] }),
      JSON.stringify({ savedAt: 'yesterday', offers: [offer] }),
      JSON.stringify({ savedAt: 10, offers: 'nope' }),
      JSON.stringify({ savedAt: 10_000, offers: [offer] }),
    ]) {
      const storage = memoryStorage({ [AFFILIATE_STORAGE_KEY]: stored })
      let calls = 0
      const load = createAffiliateOffersFetcher({
        now: () => 5_000, storage,
        fetch: async () => { calls++; return new Response('', { status: 503 }) },
      })
      assert.deepEqual(await load(), [])
      assert.equal(calls, 1, stored)
      assert.equal(storage.items.get(AFFILIATE_STORAGE_KEY), stored)
    }
  })

  it('drops invalid stored rows and survives storage that throws', async () => {
    const storage = memoryStorage({
      [AFFILIATE_STORAGE_KEY]: JSON.stringify({ savedAt: 0, offers: [offer, { ...offer, url: 'javascript:x' }] }),
    })
    const load = createAffiliateOffersFetcher({
      now: () => 1, storage, fetch: async () => { throw new Error('must not fetch') },
    })
    assert.deepEqual((await load()).map((o) => o.id), ['test'])

    let calls = 0
    const broken = createAffiliateOffersFetcher({
      now: () => 0,
      storage: {
        getItem: () => { throw new Error('denied') },
        setItem: () => { throw new Error('quota') },
      },
      fetch: async () => { calls++; return response() },
    })
    assert.equal((await broken()).length, 1)
    assert.equal((await broken()).length, 1)
    assert.equal(calls, 1)
  })

  it('retains filtering, safe URLs, crop matching and template encoding', () => {
    assert.equal(normalizeAffiliateOffer({ ...offer, url: 'javascript:alert(1)' }), null)
    const valid = normalizeAffiliateOffer(offer)!
    const disabled = { ...valid, id: 'disabled', enabled: false }
    const selected = selectAffiliateOffers([valid, disabled], '高麗菜', 'vegetable')
    assert.equal(selected.length, 1)
    assert.equal(selected[0].title, '高麗菜 合作')
    assert.equal(selected[0].href, `https://example.test/?crop=${encodeURIComponent('高麗菜')}`)
    assert.deepEqual(selectAffiliateOffers([valid], '蘋果', 'fruit'), [])
  })

  it('never falls back to service worker storage for affiliate offers', async () => {
    let handleFetch: (event: { request: Request; respondWith: (response: Promise<Response>) => void }) => void = () => {}
    let networkCalls = 0
    runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
      self: {
        location: { origin: 'https://example.test' },
        addEventListener: (type: string, handler: typeof handleFetch) => { if (type === 'fetch') handleFetch = handler },
      },
      URL,
      fetch: async () => { networkCalls++; throw new Error('offline') },
      caches: { open: () => { throw new Error('Must not open cache for offers') } },
    })
    let pending: Promise<Response> | undefined
    handleFetch({
      request: new Request('https://example.test/api/affiliates'),
      respondWith: (value) => { pending = value },
    })
    await assert.rejects(pending!, /offline/)
    assert.equal(networkCalls, 1)
  })
})
