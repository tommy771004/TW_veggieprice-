export function rocToISO(rocDate: string): string {
  const normalized = rocDate.replace(/\//g, '.')
  const parts = normalized.split('.')
  if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) return ''
  const year = parseInt(parts[0], 10) + 1911
  return `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
}

export function isoToROC(iso: string): string {
  const d = new Date(iso)
  const year = d.getFullYear() - 1911
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export function dateToROC(date: Date): string {
  return isoToROC(date.toISOString().split('T')[0])
}

export function formatPrice(price: number): string {
  return price.toFixed(1)
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} 公噸`
  return `${kg.toFixed(0)} 公斤`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

/** A locale-stable calendar date for values shown in both SSR and hydration. */
export function formatTaipeiDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const fields = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return `${fields.year}/${fields.month}/${fields.day}`
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

const CROP_EMOJI_MAP: Record<string, string> = {
  '高麗菜': '🥬', '番茄': '🍅', '牛番茄': '🍅', '洋蔥': '🧅',
  '胡蘿蔔': '🥕', '白蘿蔔': '🥕', '蘿蔔': '🥕',
  '蘋果': '🍎', '香蕉': '🍌', '芭樂': '🍈', '鳳梨': '🍍',
  '芒果': '🥭', '葡萄': '🍇', '西瓜': '🍉', '柳橙': '🍊',
  '橘子': '🍊', '橙': '🍊', '檸檬': '🍋', '草莓': '🍓',
  '藍莓': '🫐', '桃子': '🍑', '梨': '🍐', '水梨': '🍐',
  '青椒': '🫑', '辣椒': '🌶️', '菠菜': '🥬', '青江菜': '🥬',
  '花椰菜': '🥦', '青花菜': '🥦', '地瓜': '🍠', '馬鈴薯': '🥔',
  '玉米': '🌽', '南瓜': '🎃', '茄子': '🍆', '小黃瓜': '🥒',
  '黃瓜': '🥒', '豌豆': '🫛', '毛豆': '🫛', '香菇': '🍄',
  '金針菇': '🍄', '杏鮑菇': '🍄', '菊花': '🌸', '玫瑰': '🌹',
  '百合': '💐', '蘭花': '🌺', '薑': '🫚', '蒜頭': '🧄',
  '青蔥': '🌿', '韭菜': '🌿', '芹菜': '🌿', '空心菜': '🌿',
  '茼蒿': '🌿', '生菜': '🥬', '萵苣': '🥬',

  // Meat/Poultry
  '毛豬': '🐖', '豬': '🐖',
  '白肉雞': '🐔', '雞': '🐔',
  '肉鵝': '🦢', '鵝': '🦢',
  '肉鴨': '🦆', '鴨': '🦆',
  '羊': '🐑', 
  '雞蛋': '🥚', '蛋': '🥚',

  // Seafood
  '蝦': '🦐',
  '蟹': '🦀',
  '蛤': '🦪', '蚵': '🦪', '牡蠣': '🦪',
  '魷': '🦑', '花枝': '🦑', '透抽': '🦑', '軟絲': '🦑',
  '章魚': '🐙',
  '吳郭魚': '🐟', '鯉魚': '🐟', '草魚': '🐟', '大頭鰱': '🐟',
  '虱目魚': '🐟', '鱸': '🐟', '鯛': '🐟', '石斑': '🐟',
  '鰺': '🐟', '香魚': '🐟', '鯧': '🐟', '魚': '🐟', '海鮮': '🐟',
}

export function getCropEmoji(cropName: string): string {
  if (!cropName) return '🌿'
  for (const [key, emoji] of Object.entries(CROP_EMOJI_MAP)) {
    if (cropName.includes(key)) return emoji
  }
  return '🌿'
}

// eslint-disable-next-line
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function cleanErrorMessage(err: unknown, fallback = '無法取得資料'): string {
  if (!err) return fallback
  
  let msg = ''
  if (err instanceof Error) {
    msg = err.message
  } else if (typeof err === 'string') {
    msg = err
  } else if (typeof err === 'object' && err !== null && 'message' in err) {
    msg = String((err as { message: unknown }).message)
  } else {
    msg = String(err)
  }

  const lowercase = msg.toLowerCase()
  if (
    lowercase.includes('failed to fetch') || 
    lowercase.includes('fetch failed') || 
    lowercase.includes('networkerror') || 
    lowercase.includes('abort') || 
    lowercase.includes('timeout') ||
    lowercase.includes('connection')
  ) {
    return '無法連線至農業部統計資料庫，請檢查您的網路或稍後再試。'
  }
  
  if (lowercase.includes('http') || lowercase.includes('status')) {
    return '資料服務器回應異常，請稍後再試。'
  }

  if (lowercase.includes('json') || lowercase.includes('parse')) {
    return '資料處理異常，請稍後再試。'
  }

  return msg || fallback
}

