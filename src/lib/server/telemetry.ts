import { createHmac, randomUUID } from 'node:crypto'

type TelemetryValue = string | number | boolean | null
type TelemetryEvent = { name: string; properties?: Record<string, TelemetryValue> }

/**
 * Server-only relay to the shared admin console. Browser session ids, feedback
 * message/contact, user agents, and audit metadata are intentionally excluded.
 */
export function sendTelemetryBatch(events: TelemetryEvent[]): void {
  const url = process.env.TELEMETRY_INGEST_URL
  const project = process.env.TELEMETRY_PROJECT_KEY
  const key = process.env.TELEMETRY_INGEST_KEY
  if (!url || !project || !key || events.length === 0) return

  const raw = JSON.stringify({
    events: events.slice(0, 50).map((event) => ({
      id: randomUUID(),
      name: event.name,
      source: 'server',
      occurredAt: new Date().toISOString(),
      properties: event.properties ?? {},
    })),
  })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = `sha256=${createHmac('sha256', key).update(`${timestamp}.`).update(raw).digest('hex')}`

  void fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-telemetry-project': project,
      'x-telemetry-timestamp': timestamp,
      'x-telemetry-signature': signature,
    },
    body: raw,
  }).catch((err) => console.warn('[telemetry] forward failed:', err instanceof Error ? err.message : String(err)))
}

export function sendTelemetry(name: string, properties: Record<string, TelemetryValue> = {}): void {
  sendTelemetryBatch([{ name, properties }])
}
