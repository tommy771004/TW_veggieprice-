import Script from 'next/script'
import { GA_MEASUREMENT_ID } from '@/lib/env'

/**
 * Google Analytics 4（gtag.js）掛載點。
 * 以 next/script 的 afterInteractive 策略載入，避免阻擋首屏渲染。
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
        strategy="afterInteractive"
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
