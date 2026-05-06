import type { Metadata } from 'next'
import { SettingsClient } from '@/components/pages/SettingsClient'

export const metadata: Metadata = {
  title: '系統設定 | 農時價',
  description: '設定您的偏好市場、通知方式、字體大小與顯示主題。',
}

export default function SettingsPage() {
  return <SettingsClient />
}
