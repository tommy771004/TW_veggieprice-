import { NextResponse } from 'next/server'
import { normalizeAffiliateOffer } from '@/lib/affiliates'
import { affiliateProjectName, getAffiliateSql } from '@/lib/server/db'
import { makeLogger } from '@/lib/server/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = makeLogger('api/affiliates')

/**
 * 成功結果交給 Vercel CDN 共用 5 分鐘：同一 region 的所有使用者共用一次
 * SELECT，資料庫查詢量不再隨流量成長。瀏覽器端不快取（max-age=0），
 * session 暫存由前端 sessionStorage 負責。
 */
const SUCCESS_CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600'
/** 失敗回應不可被 CDN 留住，否則一次故障會讓整個 region 數分鐘看不到版位。 */
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

/**
 * 聯盟資料只在 server 端使用 SUP_DATABASE_URL 查詢；回傳的只是版位內容，
 * 不會暴露資料庫連線字串。
 */
export async function GET() {
  const sql = getAffiliateSql()
  if (!sql) return NextResponse.json({ offers: [] }, { status: 503, headers: NO_STORE })

  try {
    const rows = await sql`
      SELECT
        project_name AS "projectName",
        id,
        enabled,
        sponsored,
        title,
        description,
        cta_label AS "ctaLabel",
        url,
        icon,
        categories,
        crops,
        priority,
        partner
      FROM affiliates
      WHERE project_name = ${affiliateProjectName}
        AND enabled = TRUE
      ORDER BY priority DESC, id ASC
    `

    const offers = rows.flatMap((row) => {
      const offer = normalizeAffiliateOffer(row)
      return offer ? [offer] : []
    })

    return NextResponse.json(
      { offers },
      { headers: { 'Cache-Control': SUCCESS_CACHE_CONTROL } },
    )
  } catch (error) {
    log.error('讀取聯盟版位失敗', error)
    return NextResponse.json({ offers: [] }, { status: 500, headers: NO_STORE })
  }
}
