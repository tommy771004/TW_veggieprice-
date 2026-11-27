'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const register = async () => {
      try {
        // No explicit registration.update(): the browser already checks for a
        // new worker on navigation. Calling it on every page load, with the
        // HTTP cache bypassed, cost one /sw.js edge request per page view.
        // 'all' lets the short max-age on /sw.js (next.config.ts) absorb
        // repeat checks; browsers cap that cache at 24 hours regardless.
        await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'all',
        })
      } catch (error) {
        console.error('Service worker registration failed', error)
      }
    }

    void register()
  }, [])

  return null
}
