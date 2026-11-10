'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * 意見回饋彈窗。入口在側邊選單的「意見回饋」，由 TopAppBar 控制開關；
 * 手機與桌面都是置中的彈窗。填到一半關掉再開，內容會留著。
 */
export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const [category, setCategory] = useState<Category>('suggestion')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 每次開啟：清掉上次的錯誤與「已送出」畫面，並記錄回饋漏斗起點
  useEffect(() => {
    if (!open) return
    setError(null)
    setStatus((prev) => (prev === 'success' ? 'idle' : prev))
    trackEvent('feedback_open')
  }, [open])

  // 開啟時鎖住背景捲動，按 Escape 關閉
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  // 開啟且為填寫狀態時，聚焦輸入框
  useEffect(() => {
    if (open && status === 'idle') {
      textareaRef.current?.focus()
    }
  }, [open, status])

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

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label="意見回饋"
        aria-modal="true"
        className="relative z-10 flex max-h-[85vh] w-full max-w-[340px] flex-col overflow-y-auto rounded-3xl bg-surface text-on-surface shadow-elevation-5 md:max-w-[380px]"
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
              onClick={onClose}
              className="mt-4 w-full rounded-full bg-primary py-2.5 text-label-bold font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              關閉
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-3 border-b border-black/5 p-4">
              <div>
                <h3 className="text-label-bold font-semibold text-primary">意見回饋</h3>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  你的建議能幫助農時價變得更好。
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="關閉意見回饋"
                className="touch-target -mr-2 -mt-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.375rem' }}>
                  close
                </span>
              </button>
            </div>

            <div className="space-y-3 p-4">
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
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
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
                className="w-full rounded-full bg-primary py-2.5 text-label-bold font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === 'submitting' ? '送出中…' : '送出回饋'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
