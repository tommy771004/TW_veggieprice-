'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        // Playwright and some privacy-focused browsers can expose the
        // serviceWorker API while returning no registration object.
        if (registration?.update) await registration.update()
      } catch (error) {
        console.error('Service worker registration failed', error)
      }
    }

    void register()
  }, [])

  return null
}
