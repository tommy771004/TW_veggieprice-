import type { MarketWeatherRiskSummary } from '@/lib/types'

export function WeatherRiskCard({ weatherRisk }: { weatherRisk: MarketWeatherRiskSummary | null }) {
  if (!weatherRisk) return null

  const weatherRiskTone = weatherRisk.level === 'high'
    ? 'text-error border-error/30 bg-error/10'
    : weatherRisk.level === 'medium'
      ? 'text-amber-800 border-amber-300/60 bg-amber-100/70'
      : 'text-primary border-primary/25 bg-primary/8'

  const scoreTextTone = weatherRisk.level === 'high'
    ? 'text-error'
    : weatherRisk.level === 'medium'
      ? 'text-amber-600'
      : 'text-primary'

  const levelText = weatherRisk.level === 'high'
    ? '高風險'
    : weatherRisk.level === 'medium'
      ? '中風險'
      : '低風險'

  return (
    <div className={`rounded-2xl border backdrop-blur-sm px-4 py-3 ${weatherRiskTone}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-label-bold flex items-center gap-1">
          天氣波動風險 (選定市場)
          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${weatherRisk.level === 'high' ? 'bg-error/20 text-error' : weatherRisk.level === 'medium' ? 'bg-amber-500/20 text-amber-800' : 'bg-primary/20 text-primary'}`}>
            {levelText}
          </span>
        </p>
        <div className={`text-title-md font-bold ${scoreTextTone}`}>
          {weatherRisk.score} <span className="text-body-sm font-normal text-on-surface-variant">分</span>
        </div>
      </div>
      
      <p className="text-body-sm mb-3">
        {weatherRisk.reasons.length > 0 ? weatherRisk.reasons[0] : '近期天氣條件平穩'}
      </p>

      {/* Metrics Row */}
      <div className="flex justify-between items-center bg-white/50 rounded-xl p-2.5 border border-outline-variant/30 mt-2">
        <div className="flex flex-col items-center flex-1">
          <span className="text-[10px] text-on-surface-variant mb-0.5">最高溫</span>
          <span className="text-label-bold text-on-surface">
            {weatherRisk.metrics.maxTemperatureC !== null ? `${Math.round(weatherRisk.metrics.maxTemperatureC)}°C` : '--'}
          </span>
        </div>
        <div className="w-px h-6 bg-outline-variant/50 mx-1"></div>
        <div className="flex flex-col items-center flex-1">
          <span className="text-[10px] text-on-surface-variant mb-0.5">最低溫</span>
          <span className="text-label-bold text-on-surface">
            {weatherRisk.metrics.minTemperatureC !== null ? `${Math.round(weatherRisk.metrics.minTemperatureC)}°C` : '--'}
          </span>
        </div>
        <div className="w-px h-6 bg-outline-variant/50 mx-1"></div>
        <div className="flex flex-col items-center flex-1">
          <span className="text-[10px] text-on-surface-variant mb-0.5">強降雨</span>
          <span className="text-label-bold text-on-surface">
            {weatherRisk.metrics.maxRainfallMm !== null ? `${weatherRisk.metrics.maxRainfallMm}mm` : '--'}
          </span>
        </div>
        <div className="w-px h-6 bg-outline-variant/50 mx-1"></div>
        <div className="flex flex-col items-center flex-1">
          <span className="text-[10px] text-on-surface-variant mb-0.5">均濕度</span>
          <span className="text-label-bold text-on-surface">
            {weatherRisk.metrics.avgHumidityPct !== null ? `${Math.round(weatherRisk.metrics.avgHumidityPct)}%` : '--'}
          </span>
        </div>
      </div>
    </div>
  )
}
