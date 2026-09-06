import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeHistory } from './historySummary.ts'
import type { PriceHistoryPoint } from './types.ts'

const point = (date: string, avgPrice: number | null, isClosed = false): PriceHistoryPoint => ({ date, avgPrice, isClosed, volume: null, label: date })

test('headline excludes interpolated closed days and orders observations without mutation', () => {
  const history = [point('2026-01-03', 99, true), point('2026-01-02', 12), point('2026-01-01', 10)]
  const result = summarizeHistory(history)
  assert.equal(result.latest?.date, '2026-01-02')
  assert.equal(result.previous?.date, '2026-01-01')
  assert.equal(result.change, 20)
  assert.equal(history[0].date, '2026-01-03')
})

test('one quote or synthetic duplicate does not imply zero change', () => {
  const result = summarizeHistory([point('2026-01-01', 10, true), point('2026-01-02', 10)])
  assert.equal(result.change, null)
  assert.equal(result.previous, undefined)
})

test('missing, zero, negative and non-finite prices cannot become quotes', () => {
  assert.equal(summarizeHistory([null, 0, -1, NaN, Infinity].map(price => point('2026-01-01', price))).latest, undefined)
  assert.equal(summarizeHistory([]).change, null)
})
