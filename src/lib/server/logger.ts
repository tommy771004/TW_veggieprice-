/**
 * 極簡結構化日誌模組
 *
 * 在 Vercel / Serverless 環境中，所有輸出最終都進入 stdout/stderr 並被
 * Vercel Log Drains 轉收。輸出為 JSON Lines 格式，方便 Datadog / Logtail
 * 等工具以 `level`、`service`、`ts` 欄位做過濾與告警。
 *
 * 使用方式：
 *   import { makeLogger } from '@/lib/server/logger'
 *   const log = makeLogger('moa')
 *   log.info('fetch complete', { url, status: 200, durationMs: 123 })
 *
 * 輸出範例：
 *   {"level":"info","service":"moa","msg":"fetch complete","url":"...","status":200,"durationMs":123,"ts":"2026-04-25T12:00:00.000Z"}
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  service: string
  msg: string
  ts: string
  [key: string]: unknown
}

function emit(
  level: LogLevel,
  service: string,
  msg: string,
  meta?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    level,
    service,
    msg,
    ...meta,
    ts: new Date().toISOString(),
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void
  info(msg: string, meta?: Record<string, unknown>): void
  warn(msg: string, meta?: Record<string, unknown>): void
  error(msg: string, meta?: Record<string, unknown>): void
}

/**
 * 建立帶有固定 `service` 標籤的 logger 實例。
 * 每個模組呼叫一次，取得的 logger 可安全地在模組頂層共用。
 */
export function makeLogger(service: string): Logger {
  return {
    debug: (msg, meta) => emit('debug', service, msg, meta),
    info:  (msg, meta) => emit('info',  service, msg, meta),
    warn:  (msg, meta) => emit('warn',  service, msg, meta),
    error: (msg, meta) => emit('error', service, msg, meta),
  }
}
