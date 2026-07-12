/*
 * Builds a compact, server-only reference index from the selected government
 * datasets. Source downloads stay out of the runtime path, while the generated
 * JSON is small enough to ship with a Next.js deployment.
 */
const fs = require('fs/promises')
const path = require('path')
const { inflateRawSync } = require('zlib')

const NUTRITION_URL = 'https://data.fda.gov.tw/data/opendata/export/20/json'
const SEASONAL_URL = 'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=061&IsTransData=1'
const ORIGIN_PRICE_URL = 'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=WVOiWSdDjWxx&IsTransData=1'
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'generated', 'government-reference.json')

const NUTRIENT_FIELDS = {
  '熱量': 'energyKcal',
  '修正熱量': 'energyKcal',
  '粗蛋白': 'proteinG',
  '膳食纖維': 'fiberG',
  '鉀': 'potassiumMg',
  '維生素C': 'vitaminCMg',
}

function normalizeName(value) {
  return String(value ?? '')
    .replace(/臺/g, '台')
    .replace(/[\s　]/g, '')
    .replace(/[()（）\[\]【】]/g, '')
    .replace(/[-－]/g, '')
    .toLowerCase()
}

function parseNumber(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized || normalized.includes('/')) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function splitAliases(value) {
  return String(value ?? '')
    .split(/[、,，;/；]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function extractSingleZipEntry(buffer) {
  const endOfCentralDirectory = Buffer.from([0x50, 0x4b, 0x05, 0x06])
  const centralDirectory = Buffer.from([0x50, 0x4b, 0x01, 0x02])
  const localFile = Buffer.from([0x50, 0x4b, 0x03, 0x04])
  const endOffset = buffer.lastIndexOf(endOfCentralDirectory)

  if (endOffset < 0) throw new Error('Nutrition source is not a valid ZIP archive')
  const centralOffset = buffer.readUInt32LE(endOffset + 16)
  if (!buffer.subarray(centralOffset, centralOffset + 4).equals(centralDirectory)) {
    throw new Error('Nutrition ZIP central directory is invalid')
  }

  const compressionMethod = buffer.readUInt16LE(centralOffset + 10)
  const compressedSize = buffer.readUInt32LE(centralOffset + 20)
  const localOffset = buffer.readUInt32LE(centralOffset + 42)
  if (!buffer.subarray(localOffset, localOffset + 4).equals(localFile)) {
    throw new Error('Nutrition ZIP local entry is invalid')
  }

  const filenameLength = buffer.readUInt16LE(localOffset + 26)
  const extraLength = buffer.readUInt16LE(localOffset + 28)
  const dataStart = localOffset + 30 + filenameLength + extraLength
  const compressed = buffer.subarray(dataStart, dataStart + compressedSize)

  if (compressionMethod === 0) return compressed
  if (compressionMethod === 8) return inflateRawSync(compressed)
  throw new Error(`Unsupported nutrition ZIP compression method: ${compressionMethod}`)
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${url}`)
  return response.json()
}

async function fetchNutritionRows() {
  const response = await fetch(NUTRITION_URL, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok) throw new Error(`Nutrition download failed (${response.status})`)
  const zip = Buffer.from(await response.arrayBuffer())
  return JSON.parse(extractSingleZipEntry(zip).toString('utf8'))
}

function buildNutritionIndex(rows) {
  const samples = new Map()

  for (const row of rows) {
    const id = String(row['整合編號'] ?? '')
    const sampleName = String(row['樣品名稱'] ?? '').trim()
    if (!id || !sampleName) continue

    const sample = samples.get(id) ?? {
      id,
      sampleName,
      aliases: splitAliases(row['俗名']),
      category: String(row['食品分類'] ?? ''),
      description: String(row['內容物描述'] ?? '').trim(),
      nutrients: {},
    }

    const targetField = NUTRIENT_FIELDS[String(row['分析項'] ?? '')]
    const value = parseNumber(row['每100克含量'])
    if (targetField && value !== null && sample.nutrients[targetField] === undefined) {
      sample.nutrients[targetField] = value
    }
    samples.set(id, sample)
  }

  return [...samples.values()]
    .filter((sample) => Object.keys(sample.nutrients).length > 0)
    .sort((a, b) => a.sampleName.localeCompare(b.sampleName, 'zh-Hant'))
}

function buildSeasonalIndex(rows) {
  const crops = new Map()

  for (const row of rows) {
    const crop = String(row.crop ?? '').trim()
    const month = Number(row.month)
    const county = String(row.county ?? '').trim()
    const town = String(row.town ?? '').trim()
    if (!crop || !Number.isInteger(month) || month < 1 || month > 12 || !county) continue

    const key = normalizeName(crop)
    const entry = crops.get(key) ?? { crop, months: new Set(), origins: new Map() }
    entry.months.add(month)
    const towns = entry.origins.get(county) ?? new Set()
    if (town) towns.add(town)
    entry.origins.set(county, towns)
    crops.set(key, entry)
  }

  return [...crops.values()]
    .map((entry) => ({
      crop: entry.crop,
      months: [...entry.months].sort((a, b) => a - b),
      origins: [...entry.origins.entries()]
        .map(([county, towns]) => ({ county, towns: [...towns].sort() }))
        .sort((a, b) => a.county.localeCompare(b.county, 'zh-Hant')),
    }))
    .sort((a, b) => a.crop.localeCompare(b.crop, 'zh-Hant'))
}

function periodRank(period) {
  return { '上旬': 1, '中旬': 2, '下旬': 3 }[period] ?? 0
}

function buildOriginPriceIndex(rows) {
  const grouped = new Map()

  for (const row of rows) {
    const productName = String(row.PRODUCTNAME ?? '').trim()
    const year = Number(row.YEAR)
    const month = Number(row.MONTH)
    const period = String(row.PERIOD ?? '').trim()
    const price = parseNumber(row.AVGPRICE)
    if (!productName || !year || !month || price === null) continue

    const stamp = year * 1000 + month * 10 + periodRank(period)
    const key = normalizeName(productName)
    const current = grouped.get(key)
    if (!current || stamp > current.stamp) {
      grouped.set(key, { productName, year, month, period, stamp, prices: [price], reporters: new Set([String(row.ORGNAME ?? '').trim()]) })
    } else if (stamp === current.stamp) {
      current.prices.push(price)
      current.reporters.add(String(row.ORGNAME ?? '').trim())
    }
  }

  return [...grouped.values()]
    .map((entry) => ({
      productName: entry.productName,
      year: entry.year,
      month: entry.month,
      period: entry.period,
      averagePrice: Number((entry.prices.reduce((sum, price) => sum + price, 0) / entry.prices.length).toFixed(2)),
      reporterCount: [...entry.reporters].filter(Boolean).length,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName, 'zh-Hant'))
}

async function main() {
  const [nutritionRows, seasonalRows, originPriceRows] = await Promise.all([
    fetchNutritionRows(),
    fetchJson(SEASONAL_URL),
    fetchJson(ORIGIN_PRICE_URL),
  ])

  const output = {
    generatedAt: new Date().toISOString(),
    sources: {
      nutrition: { datasetId: 8543, url: 'https://data.gov.tw/dataset/8543' },
      seasonal: { datasetId: 8120, url: 'https://data.gov.tw/dataset/8120' },
      originPrice: { datasetId: 70930, url: 'https://data.gov.tw/dataset/70930' },
    },
    nutrition: buildNutritionIndex(nutritionRows),
    seasonal: buildSeasonalIndex(seasonalRows),
    originPrices: buildOriginPriceIndex(originPriceRows),
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, 'utf8')
  console.log(`Wrote ${OUTPUT_PATH}`)
  console.log(`Nutrition samples: ${output.nutrition.length}`)
  console.log(`Seasonal crops: ${output.seasonal.length}`)
  console.log(`Origin price products: ${output.originPrices.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
