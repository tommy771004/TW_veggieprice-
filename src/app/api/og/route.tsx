import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

const EYEBROW = '台灣蔬果批發行情'
const TITLE = '農時價'
const TAGLINE = '今日菜價・歷史走勢・跨市場比價'
const FOOTER = '全台批發市場每日更新・免費查詢'

// Module-level caches — persist across requests within the same process
const fontCache = new Map<number, ArrayBuffer | null>()
let backgroundCache: string | null = null

async function loadNotoSerifTC(weight: number, text: string): Promise<ArrayBuffer | null> {
  if (fontCache.has(weight)) return fontCache.get(weight) ?? null
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@${weight}&text=${encodeURIComponent(text)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' } }
    ).then((r) => r.text())
    // Satori cannot parse woff2; with `text=` Google Fonts serves TrueType.
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)\s+format\('(?:truetype|opentype|woff)'\)/)
    const data = match ? await fetch(match[1]).then((r) => r.arrayBuffer()) : null
    fontCache.set(weight, data)
    return data
  } catch {
    return null
  }
}

// Watercolor paper with the bamboo market basket on the right, composed from the app icon artwork.
async function loadBackground(): Promise<string> {
  if (backgroundCache) return backgroundCache
  const data = await readFile(join(process.cwd(), 'src/app/api/og/background.jpg'))
  backgroundCache = `data:image/jpeg;base64,${data.toString('base64')}`
  return backgroundCache
}

export async function GET() {
  const [titleFont, bodyFont, background] = await Promise.all([
    loadNotoSerifTC(900, TITLE),
    loadNotoSerifTC(600, EYEBROW + TAGLINE + FOOTER),
    loadBackground(),
  ])
  const fallback = "'PingFang TC','Microsoft JhengHei','Heiti TC',serif"
  const fonts = [
    titleFont && { name: 'SerifTitle', data: titleFont, style: 'normal' as const, weight: 900 as const },
    bodyFont && { name: 'SerifBody', data: bodyFont, style: 'normal' as const, weight: 600 as const },
  ].filter((f) => !!f)

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#F8F7F0' }}>
        <img src={background} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 0 0 96px',
            width: '640px',
            height: '100%',
            fontFamily: bodyFont ? 'SerifBody' : fallback,
          }}
        >
          <div style={{ display: 'flex', fontSize: '26px', fontWeight: 600, color: '#7A8466', letterSpacing: '6px' }}>
            {EYEBROW}
          </div>

          <div
            style={{
              display: 'flex',
              fontFamily: titleFont ? 'SerifTitle' : fallback,
              fontSize: '132px',
              fontWeight: 900,
              color: '#2F5A2A',
              lineHeight: 1.1,
              marginTop: '18px',
              letterSpacing: '8px',
            }}
          >
            {TITLE}
          </div>

          {/* Soft carrot-orange wash under the title */}
          <div
            style={{
              display: 'flex',
              width: '220px',
              height: '10px',
              borderRadius: '10px',
              marginTop: '14px',
              backgroundImage: 'linear-gradient(90deg, rgba(222,122,58,0.75), rgba(222,122,58,0.12))',
            }}
          />

          <div style={{ display: 'flex', fontSize: '34px', fontWeight: 600, color: '#3D4F34', marginTop: '34px' }}>
            {TAGLINE}
          </div>

          <div style={{ display: 'flex', fontSize: '24px', fontWeight: 600, color: '#8A8F78', marginTop: '18px' }}>
            {FOOTER}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // An empty array would override next/og's built-in fallback font and break layout.
      ...(fonts.length > 0 && { fonts }),
    }
  )
}
