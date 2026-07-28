import { NextResponse } from 'next/server'
import { normalizeAffiliateOffer } from '@/lib/affiliates'
import { affiliateProjectName, getAffiliateSql } from '@/lib/server/db'
import { makeLogger } from '@/lib/server/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = makeLogger('api/affiliates')

/**
 * 聯盟資料只在 server 端使用 SUP_DATABASE_URL 查詢；回傳的只是版位內容，
 * 不會暴露資料庫連線字串。
 */
export async function GET() {
  const sql = getAffiliateSql()
  if (!sql) return NextResponse.json({ offers: [] }, { status: 503 })

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
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    log.error('讀取聯盟版位失敗', error)
    return NextResponse.json({ offers: [] }, { status: 500 })
  }
}
