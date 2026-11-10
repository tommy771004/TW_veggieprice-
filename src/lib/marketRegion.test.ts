import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  groupMarketsByRegion,
  hasMultipleRegions,
  parseRegionValue,
  resolveMarketRegion,
  toRegionValue,
} from './marketRegion.ts'

describe('resolveMarketRegion', () => {
  it('maps directory markets and names only the county table knows', () => {
    assert.equal(resolveMarketRegion('台北一'), '北部')
    assert.equal(resolveMarketRegion('桃農'), '北部')
    assert.equal(resolveMarketRegion('宜蘭地區'), '北部')
    assert.equal(resolveMarketRegion('東勢鎮'), '中部')
    assert.equal(resolveMarketRegion('埔里鎮'), '中部')
    assert.equal(resolveMarketRegion('員林鎮'), '中部')
    assert.equal(resolveMarketRegion('西螺鎮'), '中部')
    assert.equal(resolveMarketRegion('嘉義市'), '南部')
    assert.equal(resolveMarketRegion('台南市場'), '南部')
    assert.equal(resolveMarketRegion('台東市'), '東部')
    assert.equal(resolveMarketRegion('花蓮市'), '東部')
  })

  it('leaves aggregate and unknown markets without a region', () => {
    assert.equal(resolveMarketRegion('全部市場'), null)
    assert.equal(resolveMarketRegion('全國平均'), null)
    assert.equal(resolveMarketRegion(''), null)
  })
})

describe('region select values', () => {
  it('round-trips a region and rejects anything else', () => {
    assert.equal(parseRegionValue(toRegionValue('南部')), '南部')
    assert.equal(parseRegionValue('region:火星'), null)
    assert.equal(parseRegionValue('台北一'), null)
    assert.equal(parseRegionValue(null), null)
  })
})

describe('groupMarketsByRegion', () => {
  it('orders 北 → 中 → 南 → 東 → 其他 and keeps input order inside a group', () => {
    const groups = groupMarketsByRegion(
      ['全部市場', '高雄市', '台北二', '台北一', '花蓮市', '員林鎮', '全國平均'],
      ['全部市場'],
    )
    assert.deepEqual(groups, [
      { region: '北部', markets: ['台北二', '台北一'] },
      { region: '中部', markets: ['員林鎮'] },
      { region: '南部', markets: ['高雄市'] },
      { region: '東部', markets: ['花蓮市'] },
      { region: '其他', markets: ['全國平均'] },
    ])
    assert.equal(hasMultipleRegions(groups), true)
  })

  it('does not count 其他 as a region', () => {
    assert.equal(hasMultipleRegions(groupMarketsByRegion(['全國平均', '全部市場'])), false)
  })
})
