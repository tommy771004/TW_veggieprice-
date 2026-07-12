import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapWxToIcon, parseCwaResponse, mergeForecastPeriods, taipeiISODate } from './cwaForecast.ts'

test('mapWxToIcon: 雷 takes priority over 雨/多雲', () => {
  assert.equal(mapWxToIcon('午後雷陣雨'), 'thunderstorm')
})

test('mapWxToIcon: 雨 takes priority over 多雲', () => {
  assert.equal(mapWxToIcon('多雲短暫雨'), 'rainy')
})

test('mapWxToIcon: 多雲 maps to partly_cloudy_day', () => {
  assert.equal(mapWxToIcon('晴時多雲'), 'partly_cloudy_day')
})

test('mapWxToIcon: 陰 maps to cloud', () => {
  assert.equal(mapWxToIcon('陰天'), 'cloud')
})

test('mapWxToIcon: falls back to sunny', () => {
  assert.equal(mapWxToIcon('晴天'), 'sunny')
})

test('taipeiISODate: UTC late-night rolls into next Taipei day', () => {
  // 2026-07-12T16:30:00Z + 8h = 2026-07-13T00:30 Taipei
  assert.equal(taipeiISODate(new Date('2026-07-12T16:30:00Z')), '2026-07-13')
})

test('taipeiISODate: UTC morning stays same Taipei day', () => {
  // 2026-07-12T01:00:00Z + 8h = 2026-07-12T09:00 Taipei
  assert.equal(taipeiISODate(new Date('2026-07-12T01:00:00Z')), '2026-07-12')
})

const FIXTURE = {
  records: {
    location: [
      {
        locationName: '臺北市',
        weatherElement: [
          {
            elementName: 'Wx',
            time: [
              { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '多雲', parameterValue: '4' } },
              { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '多雲時陰', parameterValue: '7' } },
              { startTime: '2026-07-13 06:00:00', endTime: '2026-07-13 18:00:00', parameter: { parameterName: '午後雷陣雨', parameterValue: '15' } },
              { startTime: '2026-07-13 18:00:00', endTime: '2026-07-14 06:00:00', parameter: { parameterName: '多雲', parameterValue: '4' } },
            ],
          },
          {
            elementName: 'MaxT',
            time: [
              { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '33' } },
              { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '27' } },
              { startTime: '2026-07-13 06:00:00', endTime: '2026-07-13 18:00:00', parameter: { parameterName: '31' } },
              { startTime: '2026-07-13 18:00:00', endTime: '2026-07-14 06:00:00', parameter: { parameterName: '26' } },
            ],
          },
          {
            elementName: 'MinT',
            time: [
              { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '26' } },
              { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '25' } },
              { startTime: '2026-07-13 06:00:00', endTime: '2026-07-13 18:00:00', parameter: { parameterName: '25' } },
              { startTime: '2026-07-13 18:00:00', endTime: '2026-07-14 06:00:00', parameter: { parameterName: '24' } },
            ],
          },
          {
            elementName: 'PoP12h',
            time: [
              { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '20', parameterUnit: '百分比' } },
              { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '10', parameterUnit: '百分比' } },
              { startTime: '2026-07-13 06:00:00', endTime: '2026-07-13 18:00:00', parameter: { parameterName: '70', parameterUnit: '百分比' } },
              { startTime: '2026-07-13 18:00:00', endTime: '2026-07-14 06:00:00', parameter: { parameterName: '30', parameterUnit: '百分比' } },
            ],
          },
        ],
      },
    ],
  },
}

test('parseCwaResponse: extracts one flat period per Wx time entry', () => {
  const periods = parseCwaResponse(FIXTURE)
  assert.equal(periods.length, 4)
  assert.equal(periods[0].wx, '多雲')
  assert.equal(periods[0].maxT, 33)
  assert.equal(periods[0].minT, 26)
  assert.equal(periods[0].pop, 20)
  assert.equal(periods[2].wx, '午後雷陣雨')
})

test('parseCwaResponse: missing records structure returns empty array', () => {
  assert.deepEqual(parseCwaResponse({}), [])
  assert.deepEqual(parseCwaResponse(null), [])
  assert.deepEqual(parseCwaResponse({ records: { location: [] } }), [])
})

test('parseCwaResponse: pairs elements by startTime, not array position (reordered/missing entries)', () => {
  // Wx has two periods, A then B. MaxT/MinT/PoP12h are reordered (B before A) and MaxT
  // is additionally missing an entry for A entirely. A naive index-based zip would pair
  // Wx[0] (A) with MaxT[0]/MinT[0]/PoP[0] (which are actually B's values) -- wrong.
  const REORDERED_FIXTURE = {
    records: {
      location: [
        {
          locationName: '臺北市',
          weatherElement: [
            {
              elementName: 'Wx',
              time: [
                { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '多雲' } }, // A
                { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '晴天' } }, // B
              ],
            },
            {
              elementName: 'MaxT',
              time: [
                // Only B's entry present, and listed first (reordered) -- A's entry is missing entirely.
                { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '20' } }, // B
              ],
            },
            {
              elementName: 'MinT',
              time: [
                // Reordered: B before A.
                { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '15' } }, // B
                { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '22' } }, // A
              ],
            },
            {
              elementName: 'PoP12h',
              time: [
                { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '5' } }, // B
                { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '50' } }, // A
              ],
            },
          ],
        },
      ],
    },
  }

  const periods = parseCwaResponse(REORDERED_FIXTURE)
  assert.equal(periods.length, 2)

  const periodA = periods.find((p) => p.startTime === '2026-07-12 06:00:00')!
  const periodB = periods.find((p) => p.startTime === '2026-07-12 18:00:00')!

  assert.equal(periodA.wx, '多雲')
  assert.equal(periodA.maxT, null) // no MaxT entry for A -- must NOT fall back to B's 20
  assert.equal(periodA.minT, 22)
  assert.equal(periodA.pop, 50)

  assert.equal(periodB.wx, '晴天')
  assert.equal(periodB.maxT, 20)
  assert.equal(periodB.minT, 15)
  assert.equal(periodB.pop, 5)
})

test('parseCwaResponse: blank or missing numeric readings parse as null, not 0', () => {
  const BLANK_FIXTURE = {
    records: {
      location: [
        {
          locationName: '臺北市',
          weatherElement: [
            {
              elementName: 'Wx',
              time: [
                { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '多雲' } },
              ],
            },
            {
              elementName: 'MaxT',
              time: [
                { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '' } },
              ],
            },
            {
              elementName: 'MinT',
              time: [], // entirely missing entry for this startTime
            },
            {
              elementName: 'PoP12h',
              time: [
                { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '' } },
              ],
            },
          ],
        },
      ],
    },
  }

  const periods = parseCwaResponse(BLANK_FIXTURE)
  assert.equal(periods.length, 1)
  assert.equal(periods[0].maxT, null)
  assert.equal(periods[0].minT, null)
  assert.equal(periods[0].pop, null)
})

test('mergeForecastPeriods: merges day+night into one record per date, prefers daytime Wx', () => {
  const periods = parseCwaResponse(FIXTURE)
  const days = mergeForecastPeriods(periods, '2026-07-12')

  assert.equal(days.length, 2)

  assert.equal(days[0].date, '2026-07-12')
  assert.equal(days[0].maxT, 33) // max of 33/27
  assert.equal(days[0].minT, 25) // min of 26/25
  assert.equal(days[0].pop, 20)  // max of 20/10
  assert.equal(days[0].wxText, '多雲') // daytime period wins
  assert.equal(days[0].icon, 'partly_cloudy_day')

  assert.equal(days[1].date, '2026-07-13')
  assert.equal(days[1].wxText, '午後雷陣雨')
  assert.equal(days[1].icon, 'thunderstorm')
  assert.equal(days[1].pop, 70)
})

test('mergeForecastPeriods: drops dates before today and beyond the 7-day window', () => {
  const periods = parseCwaResponse(FIXTURE)
  // "today" is one day after the fixture's first date -> first date should be dropped
  const days = mergeForecastPeriods(periods, '2026-07-13')
  assert.equal(days.length, 1)
  assert.equal(days[0].date, '2026-07-13')
})

test('mergeForecastPeriods: a date with only a night period still produces a record', () => {
  const periods = parseCwaResponse(FIXTURE).filter((p) => p.startTime !== '2026-07-12 06:00:00')
  const days = mergeForecastPeriods(periods, '2026-07-12')
  assert.equal(days[0].date, '2026-07-12')
  assert.equal(days[0].wxText, '多雲時陰') // only period available, used as fallback
})
