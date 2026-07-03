'use client'

import { useEffect, useState } from 'react'
import { m, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion'
import { triggerHaptic, hapticPatterns } from '@/lib/haptics'

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      // Show when scrolled down more than 200px
      if (window.scrollY > 200) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true })
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    triggerHaptic(hapticPatterns.success)
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {visible && (
          <m.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-8 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-white/45 dark:bg-black/30 backdrop-blur-[45px] border border-white/40 dark:border-zinc-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.1),_inset_0_1px_2.5px_rgba(255,255,255,0.65)] text-[#0d631b] dark:text-[#88d982] hover:bg-white/70 dark:hover:bg-black/50 transition-colors"
            aria-label="回至頂部"
          >
            <span
              className="material-symbols-outlined font-bold text-2xl"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}
              aria-hidden="true"
            >
              arrow_upward
            </span>
          </m.button>
        )}
      </AnimatePresence>
    </LazyMotion>
  )
}
