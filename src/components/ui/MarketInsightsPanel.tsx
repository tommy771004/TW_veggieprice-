'use client'

import { useMemo } from 'react'
import { m } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import type { MarketRestDay, MarketWeatherRiskSummary } from '@/lib/types'

interface MarketInsightsPanelProps {
  nextRestDay: MarketRestDay | null
  isClosedToday: boolean
  weatherRisk: MarketWeatherRiskSummary | null
}

// Helper to determine Taiwan day of week (e.g. 星期二)
function getTaiwanDayOfWeek(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-').map(Number)
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    const days = ['日', '一', '二', '三', '四', '五', '六']
    return `星期${days[date.getDay()]}`
  } catch {
    return ''
  }
}

// Helper to calculate days remaining until target date (Taiwan timezone aligned)
function getDaysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  try {
    const taiDate = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    const todayStr = taiDate.toISOString().split('T')[0]
    
    if (dateStr === todayStr) return 0

    const todayParts = todayStr.split('-').map(Number)
    const targetParts = dateStr.split('-').map(Number)

    const todayObj = new Date(todayParts[0], todayParts[1] - 1, todayParts[2])
    const targetObj = new Date(targetParts[0], targetParts[1] - 1, targetParts[2])

    const diffTime = targetObj.getTime() - todayObj.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

// Beautiful miniature calendar sheet icon/graphic
function MiniCalendarSheet({ dateStr }: { dateStr: string }) {
  const info = useMemo(() => {
    if (!dateStr) return { month: '農時', day: '價', weekday: '' }
    try {
      const parts = dateStr.split('-').map(Number)
      const days = ['日', '一', '二', '三', '四', '五', '六']
      const date = new Date(parts[0], parts[1] - 1, parts[2])
      return {
        month: `${parts[1]} 月`,
        day: String(parts[2]),
        weekday: `週${days[date.getDay()]}`
      }
    } catch {
      return { month: '休市', day: '日', weekday: '' }
    }
  }, [dateStr])

  return (
    <div className="flex flex-col items-center justify-center w-12 h-14 bg-white dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm border border-black/5 dark:border-white/10 flex-shrink-0 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full bg-primary/10 dark:bg-primary/20 text-center py-0.5 text-[9px] font-bold text-primary dark:text-primary-container tracking-wider uppercase">
        {info.month}
      </div>
      <div className="flex-1 flex items-center justify-center text-lg font-black text-on-surface dark:text-zinc-100 tabular-nums leading-none">
        {info.day}
      </div>
      {info.weekday && (
        <div className="w-full text-center pb-0.5 text-[8.5px] font-medium text-outline">
          {info.weekday}
        </div>
      )}
    </div>
  )
}

export function MarketInsightsPanel({
  nextRestDay,
  isClosedToday,
  weatherRisk,
}: MarketInsightsPanelProps) {
  
  // Calculate remaining days until rest day
  const daysUntilRest = useMemo(() => {
    if (!nextRestDay) return null
    return getDaysUntil(nextRestDay.date)
  }, [nextRestDay])

  // Get dynamic weather icon & layout color theme based on score/level
  const weatherConfig = useMemo(() => {
    if (!weatherRisk) {
      return {
        icon: 'wb_sunny',
        colorClass: 'text-primary border-primary/25 bg-primary/5',
        badgeColor: 'bg-primary/15 text-primary',
        glowColor: 'bg-primary/20',
        scoreColor: 'text-primary'
      }
    }

    const { level, score, metrics } = weatherRisk
    const isHeavyRain = metrics.maxRainfallMm !== null && metrics.maxRainfallMm > 15
    const isExtremeHot = metrics.maxTemperatureC !== null && metrics.maxTemperatureC >= 34

    let icon = 'wb_sunny'
    if (level === 'high' || score >= 70) {
      icon = isHeavyRain ? 'thunderstorm' : 'rainy'
      return {
        icon,
        colorClass: 'text-error border-error/25 bg-error/5',
        badgeColor: 'bg-error/15 text-error',
        glowColor: 'bg-error/20',
        scoreColor: 'text-error'
      }
    } else if (level === 'medium' || score >= 45) {
      icon = isExtremeHot ? 'thermostat' : 'partly_cloudy_day'
      return {
        icon,
        colorClass: 'text-amber-700 dark:text-amber-500 border-amber-500/25 bg-amber-500/5',
        badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        glowColor: 'bg-amber-500/20',
        scoreColor: 'text-amber-600 dark:text-amber-400'
      }
    } else {
      icon = isExtremeHot ? 'thermostat' : 'sunny'
      return {
        icon,
        colorClass: 'text-primary border-primary/25 bg-primary/5',
        badgeColor: 'bg-primary/15 text-primary',
        glowColor: 'bg-primary/20',
        scoreColor: 'text-primary'
      }
    }
  }, [weatherRisk])

  const restDayTag = useMemo(() => {
    if (isClosedToday) {
      return {
        text: '本日休市',
        colorClass: 'bg-error/15 text-error border-error/20'
      }
    }
    return {
      text: '正常交易',
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15'
    }
  }, [isClosedToday])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mb-4 w-full" id="market-insights-panel">
      
      {/* CARD 1: MARKET REST DAY CARD */}
      <GlassCard 
        className="flex flex-col justify-between h-full p-4 sm:p-5 relative overflow-hidden transition-all duration-300"
        id="card-market-holiday"
      >
        {/* Subtle decorative glow */}
        <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 dark:opacity-10 pointer-events-none rounded-full ${isClosedToday ? 'bg-error' : 'bg-primary'}`} />
        
        <div>
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">calendar_month</span>
              <span className="text-label-bold font-bold text-xs uppercase tracking-wider">市場休市避雷</span>
            </div>
            <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border shadow-sm ${restDayTag.colorClass}`}>
              {restDayTag.text}
            </span>
          </div>

          {/* Main content body */}
          <div className="flex items-start gap-3.5 mt-2">
            {nextRestDay ? (
              <>
                <MiniCalendarSheet dateStr={nextRestDay.date} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-body-md font-bold text-on-surface dark:text-zinc-100">
                      {isClosedToday ? '今日休市公告' : '下次預定休市'}
                    </p>
                    {daysUntilRest !== null && daysUntilRest > 0 && (
                      <span className="inline-flex text-[10px] font-black px-1.5 py-0.5 rounded-md bg-primary/10 text-primary dark:bg-primary/20">
                        還有 {daysUntilRest} 天
                      </span>
                    )}
                    {daysUntilRest === 1 && (
                      <span className="inline-flex text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        明天休市
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-on-surface-variant font-semibold mt-1">
                    {nextRestDay.date.replace(/-/g, '/')} ({getTaiwanDayOfWeek(nextRestDay.date)})
                  </p>
                  {nextRestDay.note && (
                    <p className="text-body-xs text-primary dark:text-primary-container font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                      備註：{nextRestDay.note}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="py-2.5 flex items-center gap-3">
                <span className="material-symbols-outlined text-[1.75rem] text-primary/60" aria-hidden="true">storefront</span>
                <p className="text-body-sm text-on-surface-variant font-medium">
                  近 45 日內此市場暫無休市公告
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info tip */}
        <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between text-[10px] text-outline font-medium">
          <span>※ 資料來源：行政院農委會</span>
          <span className="flex items-center gap-0.5">
            休市避開採購潮
            <span className="material-symbols-outlined text-[10px]">tips_and_updates</span>
          </span>
        </div>
      </GlassCard>

      {/* CARD 2: WEATHER RISK CARD WITH GRAPHIC SYMBOLS */}
      <GlassCard 
        className="flex flex-col justify-between h-full p-4 sm:p-5 relative overflow-hidden transition-all duration-300"
        id="card-weather-risk"
      >
        {/* Subtle decorative glow matching risk status */}
        <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 dark:opacity-10 pointer-events-none rounded-full ${weatherConfig.glowColor}`} />

        <div>
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">umbrella</span>
              <span className="text-label-bold font-bold text-xs uppercase tracking-wider">產地天氣波動風險</span>
            </div>
            
            {weatherRisk && (
              <div className="flex items-center gap-1.5">
                <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border shadow-sm ${weatherConfig.badgeColor}`}>
                  {weatherRisk.level === 'high' ? '高風險' : weatherRisk.level === 'medium' ? '中風險' : '低風險'}
                </span>
                <span className={`text-body-md font-extrabold font-mono ${weatherConfig.scoreColor}`}>
                  {weatherRisk.score} <span className="text-2xs font-bold text-outline">分</span>
                </span>
              </div>
            )}
          </div>

          {/* Main content body with Weather Icon */}
          <div className="flex items-start gap-3.5 mt-2">
            {weatherRisk ? (
              <>
                {/* Dynamic Weather Icon Card Graphic */}
                <div className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl flex-shrink-0 border border-black/5 dark:border-white/10 ${weatherConfig.colorClass}`}>
                  <span 
                    className="material-symbols-outlined text-[1.6rem] animate-pulse duration-1000" 
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {weatherConfig.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body-md font-bold text-on-surface dark:text-zinc-100 truncate">
                    {weatherRisk.county}周邊產地
                  </p>
                  <p className="text-body-sm text-on-surface-variant font-medium mt-1 leading-snug">
                    {weatherRisk.reasons.length > 0 ? weatherRisk.reasons[0] : '近期天氣條件平穩，利於蔬果運銷'}
                  </p>
                </div>
              </>
            ) : (
              <div className="py-2.5 flex items-center gap-3">
                <span className="material-symbols-outlined text-[1.75rem] text-outline/60" aria-hidden="true">cloud_off</span>
                <p className="text-body-sm text-on-surface-variant font-medium">
                  暫無此市場周邊產地氣象資訊
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        {weatherRisk && (
          <div className="grid grid-cols-4 gap-1 p-2 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/[0.04] dark:border-white/[0.04] mt-4">
            
            {/* Temp Max */}
            <div className="flex flex-col items-center text-center">
              <span className="text-[9px] text-outline font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[8px] text-error">device_thermostat</span>
                最高溫
              </span>
              <span className="text-label-bold text-xs font-black text-on-surface mt-0.5 tabular-nums">
                {weatherRisk.metrics.maxTemperatureC !== null ? `${Math.round(weatherRisk.metrics.maxTemperatureC)}°C` : '--'}
              </span>
            </div>
            
            {/* Temp Min */}
            <div className="flex flex-col items-center text-center border-l border-black/[0.05] dark:border-white/[0.05]">
              <span className="text-[9px] text-outline font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[8px] text-primary">device_thermostat</span>
                最低溫
              </span>
              <span className="text-label-bold text-xs font-black text-on-surface mt-0.5 tabular-nums">
                {weatherRisk.metrics.minTemperatureC !== null ? `${Math.round(weatherRisk.metrics.minTemperatureC)}°C` : '--'}
              </span>
            </div>

            {/* Precipitation */}
            <div className="flex flex-col items-center text-center border-l border-black/[0.05] dark:border-white/[0.05]">
              <span className="text-[9px] text-outline font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[8px] text-info">rainy</span>
                強降雨
              </span>
              <span className="text-label-bold text-xs font-black text-on-surface mt-0.5 tabular-nums">
                {weatherRisk.metrics.maxRainfallMm !== null ? `${weatherRisk.metrics.maxRainfallMm}mm` : '--'}
              </span>
            </div>

            {/* Humidity */}
            <div className="flex flex-col items-center text-center border-l border-black/[0.05] dark:border-white/[0.05]">
              <span className="text-[9px] text-outline font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[8px] text-teal-500">water_drop</span>
                均濕度
              </span>
              <span className="text-label-bold text-xs font-black text-on-surface mt-0.5 tabular-nums">
                {weatherRisk.metrics.avgHumidityPct !== null ? `${Math.round(weatherRisk.metrics.avgHumidityPct)}%` : '--'}
              </span>
            </div>

          </div>
        )}

      </GlassCard>

    </div>
  )
}
