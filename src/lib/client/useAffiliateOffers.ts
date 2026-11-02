'use client'

import { useEffect, useState } from 'react'
import { fetchAffiliateOffers, type AffiliateOffer } from '@/lib/affiliates'

/**
 * Load offers once per session. The shared fetcher answers from memory or
 * sessionStorage until the session TTL expires, so returning to the tab or
 * reconnecting only reaches the network after expiry or a failed load.
 */
export function useAffiliateOffers() {
  const [offers, setOffers] = useState<AffiliateOffer[]>([])
  useEffect(() => {
    let active = true
    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      void fetchAffiliateOffers().then((loaded) => {
        if (active) setOffers(loaded)
      })
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [])
  return offers
}
