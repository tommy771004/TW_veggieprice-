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
  const parts = iso.split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }
  const utcMs = Date.UTC(parts[0], parts[1] - 1, parts[2])
  const d = new Date(utcMs)
  d.setUTCDate(d.getUTCDate() - days)
  
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const date = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export function todayISO(): string {
  const d = new Date()
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(d)
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
  }

  return map[period] ?? 30
}
