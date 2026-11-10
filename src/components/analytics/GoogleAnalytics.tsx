import Script from 'next/script'
import { GA_MEASUREMENT_ID } from '@/lib/env'

/**
 * Google Analytics 4（gtag.js）掛載點。
 * 以 next/script 的 lazyOnload 策略在瀏覽器閒置時才載入：gtag.js 約 180 KiB，
 * 用 afterInteractive 會在 hydration 期間佔用主執行緒（PageSpeed 長任務）。
 * dataLayer 先建立，所以載入前的 gtag() 呼叫會排隊、不會遺失。
 * gtag 的 config 會送出第一筆 page_view；App Router 的路由切換則由 GA4
 * 「加強型評估」的瀏覽器歷史記錄事件自動補送，故此處不重複手動送出。
 * 不渲染任何 UI。
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null

  return (
    <>
      <Script
        id="ga-gtag-src"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script id="ga-gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}
