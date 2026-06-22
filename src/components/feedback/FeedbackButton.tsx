'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getSessionId, trackEvent } from '@/lib/analytics'
import { triggerHaptic, hapticPatterns } from '@/lib/haptics'

const CATEGORIES = [
  { value: 'suggestion', label: '建議', icon: 'lightbulb' },
  { value: 'bug', label: '錯誤', icon: 'bug_report' },
  { value: 'data', label: '資料', icon: 'dataset' },
  { value: 'other', label: '其他', icon: 'more_horiz' },
] as const

type Category = (typeof CATEGORIES)[number]['value']
type Status = 'idle' | 'submitting' | 'success'

const MAX_MESSAGE = 2000

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('suggestion')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 點擊外部或按 Escape 時關閉
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 開啟且為填寫狀態時，聚焦輸入框
  useEffect(() => {
    if (open && status === 'idle') {
      textareaRef.current?.focus()
    }
  }, [open, status])

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev
      if (next) {
        setError(null)
        if (status === 'success') setStatus('idle')
        trackEvent('feedback_open')
      }
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || status === 'submitting') return

    setStatus('submitting')
    setError(null)
    trackEvent('feedback_submit', category, {
      length: trimmed.length,
      hasContact: Boolean(contact.trim()),
    })

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          category,
          contact: contact.trim() || undefined,
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          sessionId: getSessionId(),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(json.error || '送出失敗，請稍後再試。')
        setStatus('idle')
        return
      }
      triggerHaptic(hapticPatterns.success)
      setMessage('')
      setContact('')
      setStatus('success')
    } catch {
      setError('網路連線異常，請稍後再試。')
      setStatus('idle')
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="意見回饋"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="app-shell-icon-button touch-target flex-shrink-0 flex items-center justify-center rounded-full transition-colors text-primary"
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.5rem' }}>
          feedback
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="意見回饋"
          aria-modal="false"
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] glass-card-solid rounded-2xl overflow-hidden shadow-glass z-50"
        >
          {status === 'success' ? (
            <div className="p-6 text-center">
              <span
                className="material-symbols-outlined text-primary"
                aria-hidden="true"
                style={{ fontSize: '2.5rem' }}
              >
                check_circle
              </span>
              <h3 className="mt-2 text-label-bold font-semibold text-on-surface">感謝你的回饋！</h3>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                我們會仔細閱讀每一則意見。
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full rounded-full bg-primary py-2.5 text-label-bold font-semibold text-on-primary transition-opacity hover:opacity-90"
              >
                關閉
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="p-4 border-b border-black/5">
                <h3 className="text-label-bold font-semibold text-primary">意見回饋</h3>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  你的建議能幫助農時價變得更好。
                </p>
              </div>

              <div className="p-4 space-y-3">
                {/* 類別選擇 */}
                <div className="flex gap-1.5" role="group" aria-label="回饋類別">
                  {CATEGORIES.map((c) => {
                    const selected = c.value === category
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        aria-pressed={selected}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-medium transition-colors ${
                          selected
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">
                          {c.icon}
                        </span>
                        {c.label}
                      </button>
                    )
                  })}
                </div>

                {/* 回饋內容 */}
                <div>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={MAX_MESSAGE}
                    placeholder="告訴我們你的想法、遇到的問題或希望新增的功能…"
                    aria-label="回饋內容"
                    className="w-full resize-none rounded-xl bg-surface-container px-3 py-2.5 text-body-md text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="mt-1 text-right text-[11px] text-on-surface-variant">
                    {message.length}/{MAX_MESSAGE}
                  </div>
                </div>

                {/* 聯絡方式（選填） */}
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={200}
                  placeholder="聯絡方式（選填，方便我們回覆）"
                  aria-label="聯絡方式（選填）"
                  className="w-full rounded-xl bg-surface-container px-3 py-2.5 text-body-md text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                {error && (
                  <p className="text-body-sm text-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!message.trim() || status === 'submitting'}
                  className="w-full rounded-full bg-primary py-2.5 text-label-bold font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? '送出中…' : '送出回饋'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
