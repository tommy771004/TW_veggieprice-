import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_USER_PREFERENCES,
  isNotificationsMuted,
  normalizeUserPreferences,
} from './preferences.ts'

describe('notification preferences', () => {
  it('starts new users with notifications off until a delivery permission is chosen', () => {
    assert.equal(DEFAULT_USER_PREFERENCES.notifications.priceActivity.enabled, false)
    assert.equal(DEFAULT_USER_PREFERENCES.notifications.priceActivity.channels.browser, true)
    assert.equal(DEFAULT_USER_PREFERENCES.notifications.dailySummary.enabled, false)
  })

  it('migrates the legacy flat notification fields into v2 preferences', () => {
    const preferences = normalizeUserPreferences({ priceAlert: true, dailySummary: true })

    assert.equal(preferences.notifications.priceActivity.enabled, true)
    assert.equal(preferences.notifications.dailySummary.enabled, true)
    assert.equal(preferences.notifications.priceActivity.frequency, 'daily')
  })

  it('preserves nested channel and frequency choices while filling missing defaults', () => {
    const preferences = normalizeUserPreferences({
      notifications: {
        priceActivity: {
          enabled: true,
          frequency: 'weekly',
          channels: { browser: false },
        },
      },
    })

    assert.equal(preferences.notifications.priceActivity.frequency, 'weekly')
    assert.equal(preferences.notifications.priceActivity.channels.browser, false)
    assert.equal(preferences.notifications.priceActivity.channels.inApp, false)
    assert.equal(preferences.notifications.dailySummary.channels.inApp, true)
  })

  it('removes unsupported channels and keeps the summary on its supported daily rhythm', () => {
    const preferences = normalizeUserPreferences({
      notifications: {
        priceActivity: {
          channels: { inApp: true, browser: false },
        },
        dailySummary: {
          enabled: true,
          frequency: 'weekly',
          channels: { inApp: false, browser: true },
        },
      },
    })

    assert.equal(preferences.notifications.priceActivity.channels.inApp, false)
    assert.equal(preferences.notifications.priceActivity.channels.browser, false)
    assert.equal(preferences.notifications.dailySummary.channels.inApp, false)
    assert.equal(preferences.notifications.dailySummary.channels.browser, false)
    assert.equal(preferences.notifications.dailySummary.frequency, 'daily')
  })
})

describe('notification mute state', () => {
  it('recognizes an active timed mute and ignores an expired one', () => {
    const timed = {
      ...DEFAULT_USER_PREFERENCES,
      notifications: {
        ...DEFAULT_USER_PREFERENCES.notifications,
        muteUntil: '2026-08-08T12:00:00.000Z' as const,
      },
    }

    assert.equal(isNotificationsMuted(timed, Date.parse('2026-08-08T11:00:00.000Z')), true)
    assert.equal(isNotificationsMuted(timed, Date.parse('2026-08-08T13:00:00.000Z')), false)
  })

  it('keeps an indefinite mute active', () => {
    const muted = {
      ...DEFAULT_USER_PREFERENCES,
      notifications: {
        ...DEFAULT_USER_PREFERENCES.notifications,
        muteUntil: 'indefinite' as const,
      },
    }

    assert.equal(isNotificationsMuted(muted), true)
  })
})
