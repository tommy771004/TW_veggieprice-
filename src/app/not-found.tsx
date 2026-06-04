import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '找不到頁面',
  description: '您要找的頁面不存在或已被移除。',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-section-margin py-16">
      <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4">
        sentiment_dissatisfied
      </span>
      <h1 className="text-headline-lg font-black text-on-surface mb-2">找不到頁面</h1>
      <p className="text-body-lg text-on-surface-variant max-w-md mb-8">
        您要找的頁面不存在或已被移除，試試從首頁重新查詢蔬果批發行情。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary text-on-primary rounded-full px-6 py-3 text-label-bold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          回首頁
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 bg-surface-container text-on-surface rounded-full px-6 py-3 text-label-bold hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
          搜尋菜價
        </Link>
      </div>
    </div>
  )
}
