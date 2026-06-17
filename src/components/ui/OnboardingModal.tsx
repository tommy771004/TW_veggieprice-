'use client'

import { useEffect, useRef, useState } from 'react'
import { triggerHaptic, hapticPatterns } from '@/lib/haptics'

const STORAGE_KEY = 'veggieprice_onboarding_seen'

const STEPS = [
  {
    emoji: '🥬',
    title: '查全台批發價',
    body: '即時掌握台北、台中、彰化等全台各大批發市場的蔬果行情，再也不怕買貴！',
  },
  {
    emoji: '📈',
    title: '看歷史漲跌趨勢',
    body: '切換 1週 / 1個月 / 3個月 走勢圖，輕鬆研判最佳採購時機。',
  },
  {
    emoji: '❤️',
    title: '追蹤常買的菜',
    body: '點擊愛心，把高麗菜、青江菜等常買作物加入關注清單，一鍵查看最新行情。',
  },
]

export function OnboardingModal() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  // Move focus into the dialog on open and restore it on close. Trap Tab and
  // close on Escape so keyboard users aren't stranded behind the backdrop.
  useEffect(() => {
    if (!visible) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const node = dialogRef.current
    const focusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute('disabled'))

    focusable()[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismiss()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  function dismiss() {
    triggerHaptic(hapticPatterns.success)
    setExiting(true)
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1')
      setVisible(false)
    }, 300)
  }

  function next() {
    if (step < STEPS.length - 1) {
      triggerHaptic(hapticPatterns.tick)
      setStep((s) => s + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="新手導覽"
        className={`relative z-10 w-full sm:max-w-sm mx-4 sm:mx-0 bg-surface rounded-t-3xl sm:rounded-3xl px-8 pt-10 pb-8 shadow-2xl transition-transform duration-300 ${exiting ? 'translate-y-8 opacity-0' : 'translate-y-0'}`}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-outline hover:bg-surface-container transition-colors"
          aria-label="關閉導覽"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
        </button>

        {/* Step indicator */}
        <div className="flex gap-1.5 justify-center mb-8">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`block h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-outline-variant'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center">
          <div className="text-7xl mb-6 leading-none select-none" aria-hidden="true">
            {current.emoji}
          </div>
          <h2 className="text-headline-lg font-bold text-on-surface mb-3">
            {current.title}
          </h2>
          <p className="text-body-lg text-on-surface-variant leading-relaxed">
            {current.body}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={next}
            className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-label-bold transition-transform active:scale-95"
          >
            {step < STEPS.length - 1 ? '下一步' : '開始使用 🚀'}
          </button>
          {step < STEPS.length - 1 && (
            <button
              onClick={dismiss}
              className="text-outline text-label-bold py-1 hover:text-on-surface transition-colors"
            >
              跳過導覽
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
