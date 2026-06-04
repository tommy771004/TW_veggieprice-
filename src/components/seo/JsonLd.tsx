import { SITE_URL } from '@/lib/env'

export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '農時價 VeggiePrice TW',
    alternateName: '農時價',
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.svg`,
    description: '台灣農產品批發市場即時價格查詢平台，整合農業部開放資料提供蔬果批發行情、歷史走勢與跨市場比價。',
    inLanguage: 'zh-TW',
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
    // Enables the Google sitelinks search box and signals the in-site search to AI engines
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
    license: 'https://creativecommons.org/licenses/by/4.0/',
    inLanguage: 'zh-TW',
    temporalCoverage: '2020/..',
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function ProduceProductJsonLd({ cropName, url, price }: { cropName: string; url: string; price: number }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${cropName} 批發行情`,
    description: `${cropName}今日最新批發均價與市場行情`,
    url,
    offers: {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: 'TWD',
      availability: 'https://schema.org/InStock',
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
