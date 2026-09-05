import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/env'

export const metadata: Metadata = {
  title: '隱私與合作揭露',
  description: '了解農時價如何使用裝置偏好、意見回饋與網站使用紀錄，以及合作推薦與贊助連結的揭露說明。',
  alternates: { canonical: `${SITE_URL}/privacy` },
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-section-margin py-8 md:py-12">
      <header className="mb-8">
        <p className="section-kicker">農時價・使用說明</p>
        <h1 className="mt-2 text-headline-lg font-semibold text-on-surface">隱私與合作揭露</h1>
        <p className="mt-3 text-body-lg text-on-surface-variant">
          查菜價不需要建立帳號。以下說明網站在提供行情、記住偏好與接收回饋時，會使用哪些資料。
        </p>
      </header>

      <div className="space-y-6 text-body-md leading-relaxed text-on-surface-variant">
        <section className="section-shell" aria-labelledby="local-data-heading">
          <h2 id="local-data-heading" className="mb-3 text-headline-md font-semibold text-on-surface">留在裝置上的資料</h2>
          <p>市場偏好、外觀設定、自選清單與通知檢查紀錄會保存在瀏覽器儲存空間。網站也使用 Service Worker 快取部分資源與 API 回應，以改善載入與網路不穩時的使用體驗。</p>
          <p className="mt-3">你可以在瀏覽器的網站資料設定中清除這些資料；清除後，偏好與自選清單可能一併消失。裝置通知權限可在瀏覽器或系統設定中撤回。清除本機資料不會刪除已送出的回饋或伺服器紀錄。</p>
        </section>

        <section className="section-shell" aria-labelledby="usage-data-heading">
          <h2 id="usage-data-heading" className="mb-3 text-headline-md font-semibold text-on-surface">使用紀錄與分析</h2>
          <p>網站會為瀏覽器建立隨機訪客識別碼，並將部分瀏覽、導覽、搜尋與回饋操作送至本站 API。紀錄可能包含頁面路徑、操作目標、事件附加資訊、時間與瀏覽器資訊，用來了解功能使用情況及排查問題。訪客識別碼不是你的姓名，但可以串連同一瀏覽器的操作。</p>
          <p className="mt-3">若部署時啟用 Google Analytics，網站也會載入 Google 的分析服務，可能使用 Cookie 與裝置資訊衡量瀏覽情況。若啟用伺服器遙測，會轉送事件名稱與部分路徑或分類資訊，不包含回饋本文、聯絡方式、訪客識別碼、瀏覽器資訊或完整事件附加資訊。</p>
          <p className="mt-3">資料庫連線未設定時，本站行為紀錄不會寫入資料庫。主機平台也可能保留請求與錯誤日誌；寫入 API 的防濫用檢查會在受信任代理提供 IP 時，暫存其雜湊值作為限流識別。</p>
        </section>

        <section className="section-shell" aria-labelledby="feedback-heading">
          <h2 id="feedback-heading" className="mb-3 text-headline-md font-semibold text-on-surface">意見回饋與資料詢問</h2>
          <p>送出回饋時，本站會接收你填寫的分類、內容與選填聯絡方式，以及頁面路徑、訪客識別碼和瀏覽器資訊，以便排查問題及回覆。請勿填入密碼、金融資料或其他不必要的敏感資訊。</p>
          <p className="mt-3">若要詢問已提交資料的處理，請透過網站的意見回饋入口提出，並提供足以辨識該筆回饋的資訊。網站目前沒有自助刪除伺服器資料的功能。</p>
        </section>

        <section id="disclosure" className="section-shell scroll-mt-24" aria-labelledby="disclosure-heading">
          <h2 id="disclosure-heading" className="mb-3 text-headline-md font-semibold text-on-surface">合作推薦與贊助揭露</h2>
          <p>部分推薦服務包含聯盟、合作或贊助連結。當你點擊連結或透過連結購買，我們可能獲得分潤或其他收益；付費贊助內容會以「贊助」標示，其他合作版位會以「合作推薦」或揭露文字說明。</p>
          <p className="mt-3">合作版位可能依食材類別、作物名稱與設定的排序權重顯示，不代表完整的市場比較或品質保證。合作內容與農業部行情資料是不同來源，不應將推薦服務視為政府背書。</p>
          <p className="mt-3">前往外部服務後，其資料蒐集、商品價格、交易條件與售後服務，依該服務的規範辦理。請在提供資料或購買前閱讀對方的隱私與交易說明。</p>
        </section>
      </div>

      <nav aria-label="相關頁面" className="mt-8 flex flex-wrap gap-4">
        <Link href="/" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">回到今日行情</Link>
        <Link href="/settings" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">管理裝置偏好</Link>
      </nav>
    </article>
  )
}
