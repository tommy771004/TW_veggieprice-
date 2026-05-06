export function isoToROC(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) {
    return iso
  }
  return `${parseInt(year, 10) - 1911}.${month}.${day}`
}

export function rocToISO(roc: string): string {
  const parts = roc.replace(/\//g, '.').split('.')
  if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
    return ''
  }
  const year = parseInt(parts[0], 10) + 1911
  return `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
}

export function subtractDays(iso: string, days: number): string {
  const date = new Date(iso)
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

export function dateRange(startISO: string, endISO: string): string[] {
  const dates: string[] = []
  const current = new Date(startISO)
  const end = new Date(endISO)

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function periodToDays(period: string): number {
  const map: Record<string, number> = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '1Y': 365,
  }

  return map[period] ?? 30
}