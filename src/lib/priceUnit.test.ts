import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getPriceUnit } from './priceUnit.ts'

test('auction prices retain kilograms while poultry and eggs retain taijin', () => {
  for (const name of ['毛豬', '羊', '努比亞雜交閹公羊']) {
    assert.equal(getPriceUnit(name, 'meat'), '元 / 公斤')
  }
  for (const name of ['白肉雞', '紅羽土雞', '鵝', '鴨', '雞蛋']) {
    assert.equal(getPriceUnit(name, 'meat'), '元 / 台斤')
  }
  assert.equal(getPriceUnit('雞蛋果', 'fruit'), '元 / 公斤')
  assert.equal(getPriceUnit('甘藍', 'vegetable'), '元 / 公斤')
})
