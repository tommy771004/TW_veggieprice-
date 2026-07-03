import { SITE_URL } from '@/lib/env'

export const MOA_OPEN_DATA_URL = 'https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx'

export function safeJsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '農時價 VeggiePrice TW',
    alternateName: '農時價',
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.svg`,
    description: '台灣農產品批發市場即時價格查詢平台，每日更新全台超過20個批發市場交易數據',
    inLanguage: 'zh-TW',
    knowsAbout: ['台灣農產品價格', '批發市場行情', '蔬菜價格', '水果價格', '農業數據'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['zh-TW'],
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function WebSiteJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '農時價 VeggiePrice TW',
    alternateName: '農時價',
    url: SITE_URL,
    inLanguage: 'zh-TW',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function WebAppJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '農時價 VeggiePrice TW',
    url: SITE_URL,
    description: '台灣農產品批發市場即時價格查詢，支援歷史走勢圖表與各市場比價',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    inLanguage: 'zh-TW',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
    featureList: ['今日批發均價查詢', '歷史價格走勢', '跨市場比價', '休市日補點', '當季蔬果指南'],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function BreadcrumbListJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function WebPageJsonLd({
  name,
  description,
  url,
  keywords = [],
}: {
  name: string
  description: string
  url: string
  keywords?: string[]
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
    inLanguage: 'zh-TW',
    isPartOf: {
      '@type': 'WebSite',
      name: '農時價 VeggiePrice TW',
      url: SITE_URL,
    },
    ...(keywords.length > 0 && { keywords }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function ItemListJsonLd({
  name,
  description,
  url,
  items,
}: {
  name: string
  description: string
  url: string
  items: Array<{ name: string; url: string; description?: string }>
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    url,
    inLanguage: 'zh-TW',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
      ...(item.description && { description: item.description }),
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function HowToJsonLd({
  name,
  description,
  steps,
}: {
  name: string
  description: string
  steps: string[]
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    inLanguage: 'zh-TW',
    step: steps.map((text, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function ProduceDatasetJsonLd({ cropName, url }: { cropName: string; url: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${cropName} 台灣批發市場價格資料`,
    description: `${cropName}在台灣各大批發市場的歷史批發價格資料，包含均價、上價、下價及交易量`,
    url,
    keywords: [`${cropName}`, '台灣批發市場', '農產品價格', '菜價', '批發行情'],
    creator: { '@type': 'Organization', name: '農業部農產品產銷資訊整合查詢' },
    isBasedOn: MOA_OPEN_DATA_URL,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    inLanguage: 'zh-TW',
    // Daily-refreshed dataset — surface freshness so Search/AI engines know the
    // page is up-to-date (a positive signal for both indexing and citation).
    dateModified: new Date().toISOString().slice(0, 10),
    temporalCoverage: '2020/..',
    variableMeasured: ['平均價', '上價', '下價', '交易量'],
    measurementTechnique: '依批發市場每日實際成交資料彙整',
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function ProduceFAQJsonLd({ cropName }: { cropName: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `今日${cropName}批發價格是多少？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${cropName}今日批發均價可在農時價即時查詢，資料來源為農業部農產品交易資料，每日更新全台超過20個批發市場成交數據，包含均價、上價、下價與交易量。`,
        },
      },
      {
        '@type': 'Question',
        name: `${cropName}哪個批發市場價格最便宜？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `農時價提供${cropName}全台批發市場即時比價功能，可一次比較台北一、台北二、台中、台南、高雄等主要市場的當日均價與漲跌幅，幫助您找到最有利的採購時機。`,
        },
      },
      {
        '@type': 'Question',
        name: `${cropName}近期價格走勢如何？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `農時價提供${cropName}歷史價格走勢圖表，涵蓋最近30日每日批發均價變化，資料來源為農業部農產品產銷資訊，可清楚掌握季節性漲跌規律。`,
        },
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function ProduceBreadcrumbJsonLd({ cropName, cropId }: { cropName: string; cropId: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '搜尋農產品', item: `${SITE_URL}/search` },
      { '@type': 'ListItem', position: 3, name: `${cropName} 批發行情`, item: `${SITE_URL}/produce/${cropId}` },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export function MarketDataMethodJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '台灣蔬果批發行情資料方法',
    url: SITE_URL,
    inLanguage: 'zh-TW',
    isPartOf: {
      '@type': 'WebSite',
      name: '農時價 VeggiePrice TW',
      url: SITE_URL,
    },
    about: [
      { '@type': 'Thing', name: '台灣蔬果批發行情' },
      { '@type': 'Thing', name: '農產品批發市場價格' },
      { '@type': 'Thing', name: '今日菜價查詢' },
    ],
    citation: MOA_OPEN_DATA_URL,
    mainEntity: {
      '@type': 'Dataset',
      name: '台灣農產品批發市場每日交易行情整理',
      description:
        '農時價整理農業部農產品產銷資訊開放資料，提供台灣主要批發市場蔬菜、水果與菇類每日均價、上價、下價與交易量查詢。',
      creator: { '@type': 'Organization', name: '農業部' },
      license: 'https://creativecommons.org/licenses/by/4.0/',
      isBasedOn: MOA_OPEN_DATA_URL,
      inLanguage: 'zh-TW',
      variableMeasured: ['平均價', '上價', '下價', '交易量', '市場', '交易日期'],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
