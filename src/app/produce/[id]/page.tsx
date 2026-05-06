import type { Metadata } from 'next'
import { ProduceClient } from '@/components/pages/ProduceClient'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const cropName = decodeURIComponent(id)
  return {
    title: `${cropName} 今日批發價與歷史走勢 | 農時價`,
    description: `即時查詢${cropName}全台批發市場均價、漲跌幅與歷史價格走勢圖表，助您避免買貴。`,
    openGraph: {
      title: `${cropName} 批發行情 | 農時價`,
      description: `${cropName}今日均價、歷史走勢與全台市場比價。`,
    },
  }
}

export default async function ProducePage({ params }: Props) {
  const { id } = await params
  return <ProduceClient cropName={decodeURIComponent(id)} />
}
