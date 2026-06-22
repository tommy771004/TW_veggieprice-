import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// Neon serverless 連線字串。優先讀取 DATABASE_URL，並相容 Vercel/Neon 整合
// 常見的其他環境變數名稱。未設定時所有 DB 操作會優雅降級。
const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.NEON_DATABASE_URL ??
  ''

let cached: NeonQueryFunction<false, false> | null = null

/**
 * 取得 Neon serverless SQL 連線（HTTP，單次查詢免連線池）。
 * 未設定 DATABASE_URL 時回傳 null，呼叫端可據此優雅降級：
 * 回饋寫入回傳 503，行為稽核則靜默略過。
 */
export function getSql(): NeonQueryFunction<false, false> | null {
  if (!connectionString) return null
  if (!cached) {
    cached = neon(connectionString)
  }
  return cached
}

/** 是否已設定資料庫連線字串。 */
export function isDbConfigured(): boolean {
  return Boolean(connectionString)
}
