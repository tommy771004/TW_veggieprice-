import { DEFAULT_MARKET } from '@/lib/constants'

export type FontSize = 'small' | 'medium' | 'large'
export type Theme = 'light' | 'dark' | 'auto'

export interface UserPreferences {
  fontSize: FontSize
  theme: Theme
  preferredMarket: string
  preferredMarketType: 'Veg' | 'Fruit' // | 'Flower'
  priceAlert: boolean
  dailySummary: boolean
  locale: 'zh-TW'
}

const STORAGE_KEY = 'veggieprice_preferences:v1'
const STORAGE_KEY_LEGACY = 'veggieprice_preferences'

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  fontSize: 'medium',
  theme: 'light',
  preferredMarket: DEFAULT_MARKET,
  preferredMarketType: 'Veg',
  priceAlert: true,
  dailySummary: false,
  locale: 'zh-TW',
}

export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_PREFERENCES
  }

  try {
    const v1Raw = window.localStorage.getItem(STORAGE_KEY)
    if (v1Raw) {
      const parsed = JSON.parse(v1Raw) as Partial<UserPreferences>
      const prefs = { ...DEFAULT_USER_PREFERENCES, ...parsed }
      if (prefs.preferredMarket === '台北市場') {
        prefs.preferredMarket = '台北一'
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      }
      return prefs
    }
    // One-time migration from legacy key (no version suffix)
    const legacyRaw = window.localStorage.getItem(STORAGE_KEY_LEGACY)
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as Partial<UserPreferences>
      const prefs = { ...DEFAULT_USER_PREFERENCES, ...parsed }
      if (prefs.preferredMarket === '台北市場') {
        prefs.preferredMarket = '台北一'
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      window.localStorage.removeItem(STORAGE_KEY_LEGACY)
      return prefs
    }
  } catch {
    return DEFAULT_USER_PREFERENCES
  }

  return DEFAULT_USER_PREFERENCES
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme === 'dark' ? 'dark' : 'light'
}

export function applyUserPreferences(preferences: UserPreferences) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  const resolvedTheme = resolveTheme(preferences.theme)

  root.dataset.fontSize = preferences.fontSize
  root.dataset.theme = preferences.theme
  root.classList.toggle('dark', resolvedTheme === 'dark')
  root.style.colorScheme = resolvedTheme
}

export function saveUserPreferences(preferences: UserPreferences) {
  if (typeof window === 'undefined') {
    return preferences
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  applyUserPreferences(preferences)
  window.dispatchEvent(new CustomEvent<UserPreferences>('veggieprice:preferences-updated', { detail: preferences }))

  return preferences
}

export function updateUserPreferences(partial: Partial<UserPreferences>) {
  const next = { ...getUserPreferences(), ...partial }
  return saveUserPreferences(next)
}