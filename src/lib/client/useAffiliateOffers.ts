'use client'

import { useEffect, useState } from 'react'
import { AFFILIATE_REFRESH_CHECK_MS, fetchAffiliateOffers, type AffiliateOffer } from '@/lib/affiliates'

/** Revalidate visible placements; the shared fetcher deduplicates all requests. */
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
    const timer = window.setInterval(refresh, AFFILIATE_REFRESH_CHECK_MS)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [])
  return offers
}
