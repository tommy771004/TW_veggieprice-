'use client'

import React, { useState, useEffect } from 'react'
import { fetchMarketRestDays } from '@/lib/api'
import type { MarketRestDay } from '@/lib/types'

const PAGE_SIZE = 24

export function InsightsClient() {
  // Default to a single market — "全部市場" over a 60-day window renders hundreds
  // of cards (an endless scroll on mobile). Users can still opt into 全部市場.
  const [market, setMarket] = useState('台北一')
  const [restDays, setRestDays] = useState<MarketRestDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [market])

  useEffect(() => {
    async function loadRestDays() {
      setLoading(true)
      setError(null)
      try {
        const today = new Date()
        const pre30 = new Date()
        pre30.setDate(today.getDate() - 30)

        const next30 = new Date()
        next30.setDate(today.getDate() + 30)

        const data = await fetchMarketRestDays({
          market,
          startDate: pre30.toISOString().split('T')[0],
          endDate: next30.toISOString().split('T')[0],
        })
        setRestDays(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗')
      } finally {
        setLoading(false)
      }
    }
    loadRestDays()
  }, [market])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-section-margin py-6 md:py-8 space-y-6 md:space-y-8">
        <header className="space-y-2">
          <h1 className="text-display-sm font-black text-on-surface tracking-tight">洞察與分析</h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl">
            提供市場動態與天氣、休市日等進階數據
          </p>
        </header>

        <section className="glass-card-solid rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container py-4">
            <div>
              <h2 className="text-title-lg font-bold text-on-surface">批發市場休市日</h2>
              <p className="text-body-md text-on-surface-variant">查詢前後 30 天之休市日</p>
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

          <div className="min-h-[240px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant gap-4 animate-in fade-in">
                <span className="material-symbols-outlined animate-spin text-[32px]">sync</span>
                <span className="text-body-md font-medium">載入休市日資訊中...</span>
              </div>
            ) : error ? (
              <div className="app-shell-error-glass rounded-2xl p-6 text-center animate-in fade-in">
                <span className="material-symbols-outlined text-[32px] mb-2">warning</span>
                <h3 className="text-title-md font-bold mb-1">無法載入資料</h3>
                <p className="text-body-md opacity-80">{error}</p>
              </div>
            ) : restDays.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant gap-4 bg-surface-container/50 rounded-2xl animate-in fade-in">
                <span className="material-symbols-outlined text-[48px] opacity-50">event_available</span>
                <div className="text-center">
                  <h3 className="text-title-md font-bold mb-1 text-on-surface">無休市日</h3>
                  <p className="text-body-sm">指定期間內查無紀錄</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-body-sm text-on-surface-variant">
                  共 {restDays.length} 筆休市紀錄{restDays.length > visibleCount ? `，顯示前 ${visibleCount} 筆` : ''}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
                  {restDays.slice(0, visibleCount).map((ds, idx) => (
                    <div key={`${ds.marketName}_${ds.date}_${idx}`} className="flex items-start gap-4 p-4 rounded-2xl bg-surface hover:bg-surface-container-high border border-surface-container transition-colors">
                      <div className="flex-shrink-0 w-12 h-12 bg-error/10 text-error rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined block" aria-hidden="true">event_busy</span>
                      </div>
                      <div>
                        <div className="text-label-lg font-bold text-on-surface mb-0.5">{ds.marketName}</div>
                        <div className="text-body-md text-on-surface-variant">{ds.date}</div>
                        {ds.note && (
                          <div className="mt-2 text-label-sm font-medium px-2 py-1 bg-surface-container rounded inline-block text-on-surface-variant">
                            {ds.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {restDays.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="px-6 py-2.5 rounded-full text-label-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      載入更多（剩 {restDays.length - visibleCount} 筆）
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
