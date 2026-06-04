import { SITE_URL } from '@/lib/env'
import { FaqSection, type FaqItem } from './FaqSection'

function buildFaqItems(cropName: string): FaqItem[] {
  return [
    {
      q: `${cropName}今日批發價多少？要去哪裡查？`,
      a: `在農時價的「${cropName}行情」頁面，可即時查看${cropName}在台北、台中、高雄等全台各大批發市場的今日均價、上價、下價與交易量。資料來源為農業部農產品產銷資訊整合查詢平台，每日更新。`,
    },
    {
      q: `${cropName}的批發價多久更新一次？`,
      a: `${cropName}批發行情每日依農業部公布的批發市場實際交易資料更新。遇市場休市日（如假日或天災停市）當日無成交，價格不列入計算，圖表會標示為休市。`,
    },
    {
      q: `批發價和市場上看到的零售價差在哪？`,
      a: `批發價是批發市場大宗交易的每公斤成交均價，通常明顯低於零售價；零售價另外包含店家進貨運費、損耗、人事與利潤，因此一般民眾在傳統市場或超市買到的價格會高於此處顯示的批發均價。`,
    },
    {
      q: `怎麼用${cropName}的價格判斷現在買划不划算？`,
      a: `可比對${cropName}的歷史走勢圖與近月平均價：若今日均價低於近一個月的平均，代表目前相對便宜、適合採買；若價格明顯高於均值且呈上漲趨勢，則可考慮延後購買或改買當季其他盛產蔬果。`,
    },
  ]
}

export function ProduceFaqSection({ cropName }: { cropName: string }) {
  return (
    <FaqSection
      heading={`${cropName} 價格常見問題`}
      items={buildFaqItems(cropName)}
      url={`${SITE_URL}/produce/${encodeURIComponent(cropName)}`}
    />
  )
}
