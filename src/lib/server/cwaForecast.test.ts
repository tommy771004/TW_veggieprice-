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

// Real CWA F-D0047-091 response shape: records.Locations[0].Location[] holds one entry
// per county (22 total, in no guaranteed order, not filtered server-side by the caller's
// query param -- parseCwaResponse must filter client-side by LocationName). Each county's
// WeatherElement[] carries ElementName '天氣現象'/'最高溫度'/'最低溫度'/'12小時降雨機率',
// each with a Time[] of StartTime/EndTime (full ISO8601 with +08:00 offset) and an
// ElementValue[] array whose single object holds the element-specific field.
const FIXTURE = {
  records: {
    Locations: [
      {
        LocationsName: '台灣',
        Location: [
          {
            LocationName: '高雄市',
            WeatherElement: [
              {
                ElementName: '天氣現象',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ Weather: '晴天', WeatherCode: '1' }] },
                ],
              },
              {
                ElementName: '最高溫度',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ MaxTemperature: '99' }] },
                ],
              },
              {
                ElementName: '最低溫度',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ MinTemperature: '88' }] },
                ],
              },
              {
                ElementName: '12小時降雨機率',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '5' }] },
                ],
              },
            ],
          },
          {
            LocationName: '臺北市',
            WeatherElement: [
              {
                ElementName: '天氣現象',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ Weather: '多雲', WeatherCode: '4' }] },
                  { StartTime: '2026-07-12T18:00:00+08:00', EndTime: '2026-07-13T06:00:00+08:00', ElementValue: [{ Weather: '多雲時陰', WeatherCode: '7' }] },
                  { StartTime: '2026-07-13T06:00:00+08:00', EndTime: '2026-07-13T18:00:00+08:00', ElementValue: [{ Weather: '午後雷陣雨', WeatherCode: '15' }] },
                  { StartTime: '2026-07-13T18:00:00+08:00', EndTime: '2026-07-14T06:00:00+08:00', ElementValue: [{ Weather: '多雲', WeatherCode: '4' }] },
                ],
              },
              {
                ElementName: '最高溫度',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ MaxTemperature: '33' }] },
                  { StartTime: '2026-07-12T18:00:00+08:00', EndTime: '2026-07-13T06:00:00+08:00', ElementValue: [{ MaxTemperature: '27' }] },
                  { StartTime: '2026-07-13T06:00:00+08:00', EndTime: '2026-07-13T18:00:00+08:00', ElementValue: [{ MaxTemperature: '31' }] },
                  { StartTime: '2026-07-13T18:00:00+08:00', EndTime: '2026-07-14T06:00:00+08:00', ElementValue: [{ MaxTemperature: '26' }] },
                ],
              },
              {
                ElementName: '最低溫度',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ MinTemperature: '26' }] },
                  { StartTime: '2026-07-12T18:00:00+08:00', EndTime: '2026-07-13T06:00:00+08:00', ElementValue: [{ MinTemperature: '25' }] },
                  { StartTime: '2026-07-13T06:00:00+08:00', EndTime: '2026-07-13T18:00:00+08:00', ElementValue: [{ MinTemperature: '25' }] },
                  { StartTime: '2026-07-13T18:00:00+08:00', EndTime: '2026-07-14T06:00:00+08:00', ElementValue: [{ MinTemperature: '24' }] },
                ],
              },
              {
                ElementName: '12小時降雨機率',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '20' }] },
                  { StartTime: '2026-07-12T18:00:00+08:00', EndTime: '2026-07-13T06:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '10' }] },
                  { StartTime: '2026-07-13T06:00:00+08:00', EndTime: '2026-07-13T18:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '70' }] },
                  { StartTime: '2026-07-13T18:00:00+08:00', EndTime: '2026-07-14T06:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '30' }] },
                ],
              },
            ],
          },
          {
            LocationName: '臺中市',
            WeatherElement: [
              {
                ElementName: '天氣現象',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ Weather: '陰短暫雨', WeatherCode: '11' }] },
                ],
              },
              {
                ElementName: '最高溫度',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ MaxTemperature: '77' }] },
                ],
              },
              {
                ElementName: '最低溫度',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ MinTemperature: '66' }] },
                ],
              },
              {
                ElementName: '12小時降雨機率',
                Time: [
                  { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '60' }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
}

test('parseCwaResponse: extracts one flat period per Wx time entry for the requested county', () => {
  const periods = parseCwaResponse(FIXTURE, '臺北市')
  assert.equal(periods.length, 4)
  assert.equal(periods[0].wx, '多雲')
  assert.equal(periods[0].maxT, 33)
  assert.equal(periods[0].minT, 26)
  assert.equal(periods[0].pop, 20)
  assert.equal(periods[2].wx, '午後雷陣雨')
})

test('parseCwaResponse: filters by county name, ignoring other counties in the same payload', () => {
  const taipei = parseCwaResponse(FIXTURE, '臺北市')
  const kaohsiung = parseCwaResponse(FIXTURE, '高雄市')
  const taichung = parseCwaResponse(FIXTURE, '臺中市')

  assert.equal(taipei.length, 4)
  assert.equal(kaohsiung.length, 1)
  assert.equal(taichung.length, 1)

  assert.equal(kaohsiung[0].wx, '晴天')
  assert.equal(kaohsiung[0].maxT, 99)
  assert.equal(kaohsiung[0].minT, 88)
  assert.equal(kaohsiung[0].pop, 5)

  assert.equal(taichung[0].wx, '陰短暫雨')
  assert.equal(taichung[0].maxT, 77)

  // Sanity: Kaohsiung's/Taichung's values must not have leaked into Taipei's result.
  assert.notEqual(taipei[0].maxT, kaohsiung[0].maxT)
  assert.notEqual(taipei[0].maxT, taichung[0].maxT)
})

test('parseCwaResponse: unknown county returns empty array', () => {
  assert.deepEqual(parseCwaResponse(FIXTURE, '不存在市'), [])
})

test('parseCwaResponse: missing records structure returns empty array', () => {
  assert.deepEqual(parseCwaResponse({}, '臺北市'), [])
  assert.deepEqual(parseCwaResponse(null, '臺北市'), [])
  assert.deepEqual(parseCwaResponse({ records: { Locations: [{ Location: [] }] } }, '臺北市'), [])
})

test('parseCwaResponse: pairs elements by StartTime, not array position (reordered/missing entries)', () => {
  // Wx has two periods, A then B. MaxT/MinT/PoP12h are reordered (B before A) and MaxT
  // is additionally missing an entry for A entirely. A naive index-based zip would pair
  // Wx[0] (A) with MaxT[0]/MinT[0]/PoP[0] (which are actually B's values) -- wrong.
  const REORDERED_FIXTURE = {
    records: {
      Locations: [
        {
          Location: [
            {
              LocationName: '臺北市',
              WeatherElement: [
                {
                  ElementName: '天氣現象',
                  Time: [
                    { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ Weather: '多雲' }] }, // A
                    { StartTime: '2026-07-12T18:00:00+08:00', EndTime: '2026-07-13T06:00:00+08:00', ElementValue: [{ Weather: '晴天' }] }, // B
                  ],
                },
                {
                  ElementName: '最高溫度',
                  Time: [
                    // Only B's entry present, and listed first (reordered) -- A's entry is missing entirely.
                    { StartTime: '2026-07-12T18:00:00+08:00', EndTime: '2026-07-13T06:00:00+08:00', ElementValue: [{ MaxTemperature: '20' }] }, // B
                  ],
                },
                {
                  ElementName: '最低溫度',
                  Time: [
                    // Reordered: B before A.
                    { StartTime: '2026-07-12T18:00:00+08:00', EndTime: '2026-07-13T06:00:00+08:00', ElementValue: [{ MinTemperature: '15' }] }, // B
                    { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ MinTemperature: '22' }] }, // A
                  ],
                },
                {
                  ElementName: '12小時降雨機率',
                  Time: [
                    { StartTime: '2026-07-12T18:00:00+08:00', EndTime: '2026-07-13T06:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '5' }] }, // B
                    { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '50' }] }, // A
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  }

  const periods = parseCwaResponse(REORDERED_FIXTURE, '臺北市')
  assert.equal(periods.length, 2)

  const periodA = periods.find((p) => p.startTime === '2026-07-12T06:00:00+08:00')!
  const periodB = periods.find((p) => p.startTime === '2026-07-12T18:00:00+08:00')!

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
      Locations: [
        {
          Location: [
            {
              LocationName: '臺北市',
              WeatherElement: [
                {
                  ElementName: '天氣現象',
                  Time: [
                    { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ Weather: '多雲' }] },
                  ],
                },
                {
                  ElementName: '最高溫度',
                  Time: [
                    { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ MaxTemperature: '' }] },
                  ],
                },
                {
                  ElementName: '最低溫度',
                  Time: [], // entirely missing entry for this startTime
                },
                {
                  ElementName: '12小時降雨機率',
                  Time: [
                    { StartTime: '2026-07-12T06:00:00+08:00', EndTime: '2026-07-12T18:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '' }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  }

  const periods = parseCwaResponse(BLANK_FIXTURE, '臺北市')
  assert.equal(periods.length, 1)
  assert.equal(periods[0].maxT, null)
  assert.equal(periods[0].minT, null)
  assert.equal(periods[0].pop, null)
})

test('mergeForecastPeriods: merges day+night into one record per date, prefers daytime Wx', () => {
  const periods = parseCwaResponse(FIXTURE, '臺北市')
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
  const periods = parseCwaResponse(FIXTURE, '臺北市')
  // "today" is one day after the fixture's first date -> first date should be dropped
  const days = mergeForecastPeriods(periods, '2026-07-13')
  assert.equal(days.length, 1)
  assert.equal(days[0].date, '2026-07-13')
})

test('mergeForecastPeriods: a date with only a night period still produces a record', () => {
  const periods = parseCwaResponse(FIXTURE, '臺北市').filter((p) => p.startTime !== '2026-07-12T06:00:00+08:00')
  const days = mergeForecastPeriods(periods, '2026-07-12')
  assert.equal(days[0].date, '2026-07-12')
  assert.equal(days[0].wxText, '多雲時陰') // only period available, used as fallback
})
