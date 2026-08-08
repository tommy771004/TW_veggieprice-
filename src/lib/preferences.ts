import { DEFAULT_MARKET } from './constants.ts'

export type FontSize = 'small' | 'medium' | 'large'
export type Theme = 'light' | 'dark' | 'auto'
export type NotificationChannel = 'inApp' | 'browser'
export type NotificationFrequency = 'onOpen' | 'daily' | 'weekly'
export type NotificationMuteUntil = string | 'indefinite' | null
export type NotificationCategory = 'priceActivity' | 'dailySummary'

export const SUPPORTED_NOTIFICATION_CHANNELS: Record<NotificationCategory, readonly NotificationChannel[]> = {
  priceActivity: ['browser'],
  dailySummary: ['inApp'],
}

export interface NotificationPreference {
  enabled: boolean
  channels: Record<NotificationChannel, boolean>
  frequency: NotificationFrequency
}

export interface NotificationPreferences {
  priceActivity: NotificationPreference
  dailySummary: NotificationPreference
  muteUntil: NotificationMuteUntil
}

export interface UserPreferences {
  fontSize: FontSize
  theme: Theme
  preferredMarket: string
  preferredMarketType: 'Veg' | 'Fruit' // | 'Flower'
  notifications: NotificationPreferences
  locale: 'zh-TW'
}

type StoredNotificationPreference = Omit<Partial<NotificationPreference>, 'channels'> & {
  channels?: Partial<Record<NotificationChannel, boolean>>
}

type StoredNotificationPreferences = Omit<Partial<NotificationPreferences>, 'priceActivity' | 'dailySummary'> & {
  priceActivity?: StoredNotificationPreference
  dailySummary?: StoredNotificationPreference
}

type StoredUserPreferences = Omit<Partial<UserPreferences>, 'notifications'> & {
  notifications?: StoredNotificationPreferences
  priceAlert?: boolean
  dailySummary?: boolean
}

const STORAGE_KEY = 'veggieprice_preferences:v2'
const STORAGE_KEY_PREVIOUS = 'veggieprice_preferences:v1'
const STORAGE_KEY_LEGACY = 'veggieprice_preferences'
const ALERT_PERIOD_STORAGE_KEYS = [
  'veggieprice_last_price_alert_period',
  'veggieprice_last_alert_date',
] as const

const FONT_SCALE: Record<FontSize, string> = {
  small: '0.94',
  medium: '1',
  large: '1.08',
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  fontSize: 'medium',
  theme: 'light',
  preferredMarket: DEFAULT_MARKET,
  preferredMarketType: 'Veg',
  notifications: {
    priceActivity: {
      enabled: false,
      channels: { inApp: false, browser: true },
      frequency: 'daily',
    },
    dailySummary: {
      enabled: false,
      channels: { inApp: true, browser: false },
      frequency: 'daily',
    },
    muteUntil: null,
  },
  locale: 'zh-TW',
}

function normalizeNotificationChannels(
  category: NotificationCategory,
  rawChannels: Partial<Record<NotificationChannel, boolean>> | undefined,
) {
  const defaults = DEFAULT_USER_PREFERENCES.notifications[category].channels
  return {
    inApp: SUPPORTED_NOTIFICATION_CHANNELS[category].includes('inApp')
      ? typeof rawChannels?.inApp === 'boolean' ? rawChannels.inApp : defaults.inApp
      : false,
    browser: SUPPORTED_NOTIFICATION_CHANNELS[category].includes('browser')
      ? typeof rawChannels?.browser === 'boolean' ? rawChannels.browser : defaults.browser
      : false,
  }
}

export function normalizeUserPreferences(raw: StoredUserPreferences): UserPreferences {
  const {
    notifications: rawNotifications,
    priceAlert: legacyPriceAlert,
    dailySummary: legacyDailySummary,
    ...rest
  } = raw

  const rawPriceActivity = rawNotifications?.priceActivity
  const rawDailySummary = rawNotifications?.dailySummary
  const priceActivityEnabled = typeof rawPriceActivity?.enabled === 'boolean'
    ? rawPriceActivity.enabled
    : typeof legacyPriceAlert === 'boolean'
      ? legacyPriceAlert
      : DEFAULT_USER_PREFERENCES.notifications.priceActivity.enabled
  const dailySummaryEnabled = typeof rawDailySummary?.enabled === 'boolean'
    ? rawDailySummary.enabled
    : typeof legacyDailySummary === 'boolean'
      ? legacyDailySummary
      : DEFAULT_USER_PREFERENCES.notifications.dailySummary.enabled

  return {
    ...DEFAULT_USER_PREFERENCES,
    ...rest,
    notifications: {
      ...DEFAULT_USER_PREFERENCES.notifications,
      ...rawNotifications,
      priceActivity: {
        ...DEFAULT_USER_PREFERENCES.notifications.priceActivity,
        ...rawPriceActivity,
        enabled: priceActivityEnabled,
        channels: normalizeNotificationChannels('priceActivity', rawPriceActivity?.channels),
      },
      dailySummary: {
        ...DEFAULT_USER_PREFERENCES.notifications.dailySummary,
        ...rawDailySummary,
        enabled: dailySummaryEnabled,
        frequency: 'daily',
        channels: normalizeNotificationChannels('dailySummary', rawDailySummary?.channels),
      },
      muteUntil: rawNotifications?.muteUntil ?? DEFAULT_USER_PREFERENCES.notifications.muteUntil,
    },
  }
}

export function isNotificationsMuted(
  preferences: Pick<UserPreferences, 'notifications'>,
  now = Date.now(),
) {
  const muteUntil = preferences.notifications.muteUntil
  if (muteUntil === 'indefinite') return true
  if (!muteUntil) return false

  const expiresAt = Date.parse(muteUntil)
  return Number.isFinite(expiresAt) && expiresAt > now
}

export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_PREFERENCES
  }

  try {
    const storedEntries = [
      [STORAGE_KEY, window.localStorage.getItem(STORAGE_KEY)],
      [STORAGE_KEY_PREVIOUS, window.localStorage.getItem(STORAGE_KEY_PREVIOUS)],
      [STORAGE_KEY_LEGACY, window.localStorage.getItem(STORAGE_KEY_LEGACY)],
    ] as const
    const storedEntry = storedEntries.find(([, value]) => value)

    if (storedEntry && storedEntry[1]) {
      const [sourceKey, raw] = storedEntry
      const parsed = JSON.parse(raw) as StoredUserPreferences
      const prefs = normalizeUserPreferences(parsed)

      if (prefs.preferredMarket === '台北市場') {
        prefs.preferredMarket = '台北一'
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      if (sourceKey !== STORAGE_KEY) {
        window.localStorage.removeItem(sourceKey)
      }
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

  root.style.setProperty('--font-scale', FONT_SCALE[preferences.fontSize])
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

export function resetUserPreferences() {
  const next = normalizeUserPreferences({})

  if (typeof window === 'undefined') {
    return next
  }

  window.localStorage.removeItem(STORAGE_KEY_PREVIOUS)
  window.localStorage.removeItem(STORAGE_KEY_LEGACY)
  ALERT_PERIOD_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))

  return saveUserPreferences(next)
}
