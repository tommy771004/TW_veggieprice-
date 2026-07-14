import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aggregateCwaCountyWeather, mapCwaCountyWeatherObservations } from './cwaObservation.ts'

test('aggregates valid CWA observations for a normalized county', () => {
  const result = aggregateCwaCountyWeather('嘉義', [
    {
      GeoInfo: { CountyName: '嘉義縣' },
      WeatherElement: {
        AirTemperature: '25.2',
        RelativeHumidity: '80',
        Now: { Precipitation: '1.0' },
      },
    },
    {
      GeoInfo: { CountyName: '嘉義市' },
      WeatherElement: {
        AirTemperature: '26.8',
        RelativeHumidity: '70',
        Now: { Precipitation: '3.0' },
      },
    },
    {
      GeoInfo: { CountyName: '台南市' },
      WeatherElement: {
        AirTemperature: '30',
        RelativeHumidity: '60',
        Now: { Precipitation: '9.0' },
      },
    },
  ])

  assert.deepEqual(result, {
    county: '嘉義',
    temp: 26,
    humidity: 75,
    rainfall: 2,
  })
})

test('ignores CWA sentinel values and returns no observation when all fields are invalid', () => {
  const result = aggregateCwaCountyWeather('台北', [
    {
      GeoInfo: { CountyName: '臺北市' },
      WeatherElement: {
        AirTemperature: '-99',
        RelativeHumidity: '-999',
        Now: { Precipitation: 'T' },
      },
    },
  ])

  assert.equal(result, null)
})

test('maps valid CWA stations into the shared market weather shape', () => {
  const items = mapCwaCountyWeatherObservations('台北', [
    {
      StationId: 'A',
      StationName: '測站 A',
      ObsTime: { DateTime: '2026-07-14T10:00:00+08:00' },
      GeoInfo: { CountyName: '臺北市' },
      WeatherElement: {
        AirTemperature: '31.2',
        RelativeHumidity: '72',
        Now: { Precipitation: '0.5' },
      },
    },
    {
      StationName: '無效測站',
      GeoInfo: { CountyName: '臺北市' },
      WeatherElement: {
        AirTemperature: '-99',
        RelativeHumidity: '-999',
        Now: { Precipitation: 'T' },
      },
    },
  ], 20)

  assert.deepEqual(items, [{
    stationName: '測站 A',
    county: '台北',
    observedAt: '2026-07-14T10:00:00+08:00',
    temperatureC: 31.2,
    rainfallMm: 0.5,
    humidityPct: 72,
  }])
})
