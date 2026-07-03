import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import './globals.css'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopAppBar } from '@/components/layout/TopAppBar'
import { WebAppJsonLd, OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd'
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar'
import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker'
import { PreferencesHydrator } from '@/components/settings/PreferencesHydrator'
import { ClientSettingsProviders } from '@/components/settings/ClientSettingsProviders'
import { FramerMotionProvider } from '@/components/providers/FramerMotionProvider'

const OnboardingModal = dynamic(() => import('@/components/ui/OnboardingModal').then(mod => mod.OnboardingModal))

import { SITE_URL, GOOGLE_SITE_VERIFICATION } from '@/lib/env'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '農時價 — 台灣蔬果批發行情即時查詢',
    template: '%s | 農時價',
  },
  description: '免費查詢台灣全台批發市場今日菜價、歷史漲跌趨勢與各市場比價，蔬菜、水果、菇類行情一站掌握。',
  keywords: ['台灣菜價', '批發市場行情', '今日菜價查詢', '農產品歷史價格', '蔬菜價格', '水果價格', '批發價'],
  authors: [{ name: '農時價 VeggiePrice TW' }],
  creator: '農時價 VeggiePrice TW',
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: SITE_URL,
    siteName: '農時價 VeggiePrice TW',
    title: '農時價 — 台灣蔬果批發行情即時查詢',
    description: '免費查詢台灣全台批發市場今日菜價、歷史漲跌趨勢與各市場比價',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: '農時價 VeggiePrice TW' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '農時價 — 台灣蔬果批發行情即時查詢',
    description: '免費查詢台灣全台批發市場今日菜價、歷史漲跌趨勢與各市場比價',
    images: ['/api/og'],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
    apple: '/icons/icon-192.svg',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: SITE_URL,
    languages: { 'zh-TW': SITE_URL },
  },
  robots: { index: true, follow: true },
  ...(GOOGLE_SITE_VERIFICATION && {
    verification: { google: GOOGLE_SITE_VERIFICATION },
  }),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d631b',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <WebAppJsonLd />
      </head>
      <body className="font-sans min-h-dvh bg-background pb-32 md:pb-0" suppressHydrationWarning>
        <PreferencesHydrator />
        <ClientSettingsProviders />
        <ServiceWorkerRegistrar />
        <AnalyticsTracker />
        <TopAppBar />
        <FramerMotionProvider>
          <div className="md:flex">
            <main className="flex-1 max-w-7xl mx-auto w-full">{children}</main>
          </div>
        </FramerMotionProvider>
        <BottomNav />
        <OnboardingModal />
      </body>
    </html>
  )
}
