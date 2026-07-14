'use client'

import React, { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { fetchMarketRestDays, fetchMarketWeatherRisk, fetchMarketWeatherForecast } from '@/lib/api'
import { isAggregateMarket } from '@/lib/constants'
import type { MarketRestDay, MarketWeatherRiskSummary, MarketWeatherForecast } from '@/lib/types'

export function InsightsClient() {
  const [market, setMarket] = useState('台北一')
  const [restDays, setRestDays] = useState<MarketRestDay[]>([])
  const [weatherRisk, setWeatherRisk] = useState<MarketWeatherRiskSummary | null>(null)
  const [forecast, setForecast] = useState<MarketWeatherForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    async function loadRestDays() {
      setLoading(true)
      setError(null)
      try {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        
        const startDate = new Date(firstDay)
        startDate.setDate(1 - firstDay.getDay())
        
        const endDate = new Date(lastDay)
        endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()))

        const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
        const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

        const data = await fetchMarketRestDays({
          market,
          startDate: startStr,
          endDate: endStr,
        })
        setRestDays(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗')
      } finally {
        setLoading(false)
      }
    }
    loadRestDays()
  }, [market, currentDate])

  useEffect(() => {
    async function loadWeather() {
      if (isAggregateMarket(market)) {
        setWeatherRisk(null)
        return
      }
      try {
        const riskData = await fetchMarketWeatherRisk(market)
        setWeatherRisk(riskData)
      } catch {
        setWeatherRisk(null)
      }
    }
    loadWeather()
  }, [market])

  useEffect(() => {
    async function loadForecast() {
      if (isAggregateMarket(market)) {
        setForecast(null)
        return
      }
      try {
        const data = await fetchMarketWeatherForecast(market)
        setForecast(data)
      } catch {
        setForecast(null)
      }
    }
    loadForecast()
  }, [market])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(1 - firstDay.getDay())
  const endDate = new Date(lastDay)
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()))
  
  const gridDates: Date[] = []
  const curr = new Date(startDate)
  while (curr <= endDate) {
    gridDates.push(new Date(curr))
    curr.setDate(curr.getDate() + 1)
  }

  const restDaysByDate = restDays.reduce((acc, rd) => {
    if (!acc[rd.date]) acc[rd.date] = []
    acc[rd.date].push(rd)
    return acc
  }, {} as Record<string, MarketRestDay[]>)

  const forecastByDate = (forecast?.days ?? []).reduce((acc, day) => {
    acc[day.date] = day
    return acc
  }, {} as Record<string, MarketWeatherForecast['days'][number]>)

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  let weatherIcon = ''
  if (weatherRisk) {
    const { maxRainfallMm, maxTemperatureC } = weatherRisk.metrics
    if (maxRainfallMm !== null && maxRainfallMm > 5) weatherIcon = 'rainy'
    else if (maxRainfallMm !== null && maxRainfallMm > 0) weatherIcon = 'partly_cloudy_day'
    else if (maxTemperatureC !== null && maxTemperatureC >= 30) weatherIcon = 'sunny'
    else weatherIcon = 'cloud'
  }

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-section-margin pt-6 md:pt-8 pb-4 space-y-6 md:space-y-8">
        <header className="space-y-2">
          <h1 className="text-display-sm font-black text-on-surface tracking-tight">洞察與分析</h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl">
            提供市場動態與天氣、休市日等進階數據
          </p>
        </header>

        <section className="glass-card-solid rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-title-lg font-bold text-on-surface">批發市場休市日</h2>
                {weatherIcon && (
                  <span 
                    className="material-symbols-outlined text-on-surface-variant text-[24px]" 
                    title={`${weatherRisk?.reasons[0] ?? ''}`}
                  >
                    {weatherIcon}
                  </span>
                )}
              </div>
              <p className="text-body-md text-on-surface-variant">行事曆檢視</p>
            </div>

            <div className="w-full md:w-64">
              <label htmlFor="market-select" className="sr-only">選擇市場</label>
              <div className="relative">
                <select
                  id="market-select"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="w-full appearance-none bg-surface-container hover:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl py-3 pl-4 pr-10 text-body-md font-medium text-on-surface cursor-pointer select-none transition-colors"
                >
                  <option value="全部市場">全部市場</option>
                  <option value="台北一">台北一</option>
                  <option value="台北二">台北二</option>
                  <option value="板橋區">板橋區</option>
                  <option value="三重區">三重區</option>
                  <option value="宜蘭市">宜蘭市</option>
                  <option value="桃農">桃農</option>
                  <option value="台中市">台中市</option>
                  <option value="豐原區">豐原區</option>
                  <option value="彰化市">彰化市</option>
                  <option value="南投市">南投市</option>
                  <option value="西螺鎮">西螺鎮</option>
                  <option value="高雄市">高雄市</option>
                  <option value="屏東市">屏東市</option>
                  <option value="花蓮市">花蓮市</option>
                  <option value="台東市">台東市</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none text-on-surface-variant">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className="min-h-[400px] relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-title-lg font-bold text-on-surface">
                {year} 年 {month + 1} 月
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 rounded-full bg-surface hover:bg-surface-container transition-colors text-on-surface-variant border border-surface-container">
                  <span className="material-symbols-outlined block text-[20px]">chevron_left</span>
                </button>
                <button onClick={goToToday} className="px-4 py-1.5 rounded-full bg-surface hover:bg-surface-container transition-colors text-label-md font-bold text-on-surface border border-surface-container">
                  本月
                </button>
                <button onClick={nextMonth} className="p-2 rounded-full bg-surface hover:bg-surface-container transition-colors text-on-surface-variant border border-surface-container">
                  <span className="material-symbols-outlined block text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-surface-container-high rounded-t-2xl overflow-hidden border border-surface-container-high">
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                <div key={day} className="bg-surface py-3 text-center text-label-md font-bold text-on-surface-variant">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-surface-container-high border-x border-b border-surface-container-high rounded-b-2xl overflow-hidden relative">
              {gridDates.map((date) => {
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                const isCurrentMonth = date.getMonth() === month
                const isToday = dateString === todayString
                const dayRestDays = restDaysByDate[dateString] || []
                const isRest = dayRestDays.length > 0
                const dayForecast = forecastByDate[dateString]

                return (
                  <div
                    key={dateString}
                    className={`bg-surface min-h-[100px] p-2 flex flex-col gap-1 transition-colors relative group
                      ${!isCurrentMonth ? 'opacity-40 bg-surface/50' : ''}
                      ${isRest ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-container-low'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-label-md font-medium w-7 h-7 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-primary text-on-primary' : 'text-on-surface'}
                        ${isRest && !isToday ? 'text-error' : ''}
                      `}>
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1">
                        {dayForecast && (
                          <span
                            className="material-symbols-outlined text-on-surface-variant text-[16px]"
                            title={`${dayForecast.wxText}${dayForecast.pop !== null ? ` · 降雨機率 ${dayForecast.pop}%` : ''}`}
                          >
                            {dayForecast.icon}
                          </span>
                        )}
                        {isRest && (
                          <span className="material-symbols-outlined text-error text-[20px] opacity-80" aria-hidden="true">
                            cancel
                          </span>
                        )}
                      </div>
                    </div>
                    {dayForecast && (
                      <div className="text-[10px] leading-tight text-on-surface-variant">
                        {dayForecast.maxT !== null ? `${Math.round(dayForecast.maxT)}°` : '--'}
                        {' / '}
                        {dayForecast.minT !== null ? `${Math.round(dayForecast.minT)}°` : '--'}
                      </div>
                    )}

                    <div className="flex-1 mt-1">
                      {isRest && (
                        <div className="flex flex-col gap-1">
                          {market === '全部市場' ? (
                            <div className="text-[11px] leading-tight text-error font-bold px-1.5 py-0.5 bg-error/10 rounded w-fit">
                              {dayRestDays.length} 個休市
                            </div>
                          ) : (
                            <div className="text-[11px] leading-tight text-error font-bold px-1.5 py-0.5 bg-error/10 rounded w-fit truncate">
                              休市
                            </div>
                          )}
                          {dayRestDays[0]?.note && (
                            <div className="text-[10px] leading-tight text-on-surface-variant line-clamp-2 px-1">
                              {dayRestDays[0].note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Hover Tooltip for ALL markets if there are many */}
                    {isRest && market === '全部市場' && dayRestDays.length > 0 && (
                      <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-3 bg-inverse-surface text-inverse-on-surface text-body-sm rounded-xl shadow-glass-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none">
                        <div className="font-bold mb-1 border-b border-inverse-on-surface/20 pb-1">{dateString}</div>
                        <div className="flex flex-wrap gap-1">
                          {dayRestDays.map((rd, i) => (
                            <span key={i} className="after:content-[',_'] last:after:content-['']">{rd.marketName}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              
              <AnimatePresence>
                {loading && (
                  <m.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-surface/50 backdrop-blur-sm flex flex-col items-center justify-center z-20"
                  >
                    <span className="material-symbols-outlined animate-spin text-[32px] text-primary">sync</span>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
            
            {error && !loading && (
              <div className="mt-4 app-shell-error-glass rounded-2xl p-4 text-center">
                <p className="text-body-md opacity-80 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  {error}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

