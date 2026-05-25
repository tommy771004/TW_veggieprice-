import { ImageResponse } from 'next/og'

// Module-level cache — persists across requests within the same process
let fontCache: ArrayBuffer | null = null

async function loadNotoSansTCFont(): Promise<ArrayBuffer | null> {
  if (fontCache) return fontCache
  try {
    const chars = encodeURIComponent('農時價台灣蔬果批發行情即時查詢今日菜歷史走勢市場比免費立刻格趨')
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@700&text=${chars}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' } }
    ).then((r) => r.text())
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)\s+format\('woff2'\)/)
    if (!match) return null
    fontCache = await fetch(match[1]).then((r) => r.arrayBuffer())
    return fontCache
  } catch {
    return null
  }
}

export async function GET() {
  const font = await loadNotoSansTCFont()
  const fontFamily = font ? 'NotoTC' : "'PingFang TC','Microsoft JhengHei','Heiti TC',sans-serif"

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundImage: 'linear-gradient(135deg, #EDF7E8 0%, #D7F0CF 60%, #C8E6C9 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily,
        }}
      >
        {/* Background decorative circles */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '380px', height: '380px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-30px', right: '200px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(13,99,27,0.07)', display: 'flex' }} />

        {/* Left content card */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 48px 56px 64px', width: '730px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.91)',
            borderRadius: '32px',
            padding: '52px 56px',
            display: 'flex',
            flexDirection: 'column',
            border: '1.5px solid rgba(255,255,255,0.75)',
          }}>
            {/* Platform badge */}
            <div style={{ display: 'flex', marginBottom: '20px' }}>
              <div style={{ background: '#E8F5E2', borderRadius: '100px', padding: '6px 18px', border: '1px solid #C8E6C9', display: 'flex' }}>
                <span style={{ color: '#2E7D32', fontSize: '18px', fontWeight: 700 }}>🌿 台灣農產品批發行情平台</span>
              </div>
            </div>

            {/* Title */}
            <div style={{ display: 'flex', fontSize: '76px', fontWeight: 700, color: '#0D631B', lineHeight: 1 }}>
              農時價
            </div>

            {/* Tagline */}
            <div style={{ display: 'flex', fontSize: '26px', fontWeight: 600, color: '#2E5E2E', marginTop: '14px' }}>
              蔬果批發行情即時查詢
            </div>

            {/* Description */}
            <div style={{ display: 'flex', fontSize: '20px', color: '#4A6E4A', marginTop: '10px' }}>
              查今日菜價 · 歷史走勢 · 跨市場比價
            </div>

            {/* Feature pills */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '26px' }}>
              {['📊 即時行情', '📈 價格趨勢', '🏪 市場比價'].map((label) => (
                <div key={label} style={{ background: '#F1F8EE', border: '1.5px solid #A5D6A7', borderRadius: '100px', padding: '8px 18px', display: 'flex' }}>
                  <span style={{ color: '#1B5E20', fontSize: '17px' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <div style={{ display: 'flex', marginTop: '32px' }}>
              <div style={{ background: '#0D631B', borderRadius: '100px', padding: '14px 38px', display: 'flex' }}>
                <span style={{ color: '#F5FFF5', fontSize: '22px', fontWeight: 700 }}>免費查詢 →</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right illustration */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <div style={{ display: 'flex', fontSize: '100px', lineHeight: 1 }}>🥬</div>
          <div style={{ display: 'flex', fontSize: '76px', lineHeight: 1 }}>🍊</div>
          <div style={{ display: 'flex', fontSize: '60px', lineHeight: 1 }}>🍅</div>
          <div style={{ display: 'flex', fontSize: '44px', lineHeight: 1, marginTop: '12px' }}>📊</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(font && { fonts: [{ name: 'NotoTC', data: font, style: 'normal', weight: 700 }] }),
    }
  )
}
