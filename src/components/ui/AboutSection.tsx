'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'

const FAQS = [
  {
    q: '農時價是免費使用的嗎？',
    a: '完全免費，無需登入或付費。所有蔬果批發行情、歷史走勢圖表與市場比價功能皆可直接使用。',
  },
  {
    q: '資料多久更新一次？',
    a: '價格資料來自農業部農產品產銷資訊整合查詢系統，每日收盤後更新。通常於當日下午至晚間可查閱最新批發行情。',
  },
  {
    q: '可以查哪些市場的資料？',
    a: '涵蓋台北、台中、台南、高雄等主要批發市場，以及部分縣市產地市場，可在搜尋頁或首頁切換市場篩選。',
  },
  {
    q: '歷史走勢可以看多久？',
    a: '作物詳情頁可查看近 30 日以上的每日均價、上下價與交易量走勢，幫助您判斷價格高低點。',
  },
  {
    q: '可以追蹤特定蔬果嗎？',
    a: '可以。前往「追蹤清單」頁面，將常買的作物加入釘選清單，每次開啟就能一眼看到今日行情與漲跌狀況。',
  },
  {
    q: '資料可以作為採購決策參考嗎？',
    a: '本站資料僅供參考，實際交易價格以各市場公告為準。批發價為市場交收均價，與零售端售價可能有所差異。',
  },
] as const

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left glass-card rounded-2xl px-5 py-4 flex items-center justify-between gap-4 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="text-body-md font-semibold text-on-surface">{q}</span>
        <m.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="material-symbols-outlined text-on-surface-variant flex-shrink-0"
          style={{ fontSize: '20px' }}
        >
          expand_more
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pt-2 pb-4 text-body-sm text-on-surface-variant leading-relaxed">
              {a}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

export function AboutSection() {
  return (
    <section className="space-y-8">
      {/* About */}
      <m.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <h2 className="text-headline-lg font-bold text-on-surface mb-3">關於農時價</h2>
        <p className="text-body-md text-on-surface-variant leading-relaxed">
          農時價是一款免費的台灣蔬果批發行情即時查詢工具，整合農業部農產品產銷資訊開放資料，提供全台主要批發市場的每日均價、歷史走勢圖表與跨市場比價。不論您是家庭主婦、小攤販、農產品採購或餐廳業者，都能透過農時價掌握今日菜價、追蹤長期行情波動，以及了解當季盛產作物的供應狀況。
        </p>
      </m.div>

      {/* FAQ */}
      <div>
        <m.h2
          className="text-headline-lg font-bold text-on-surface mb-4"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          常見問題 FAQ
        </m.h2>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
