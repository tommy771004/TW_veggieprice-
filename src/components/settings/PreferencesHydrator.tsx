'use client'

import { useEffect } from 'react'
import { applyUserPreferences, getUserPreferences } from '@/lib/preferences'

export function PreferencesHydrator() {
  useEffect(() => {
    applyUserPreferences(getUserPreferences())
  }, [])

  return null
}