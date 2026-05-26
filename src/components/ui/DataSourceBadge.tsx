export function DataSourceBadge() {
  return (
    <div className="flex flex-col items-center gap-1.5 py-6 text-center">
      <div className="flex items-center gap-1.5 text-on-surface-variant/60">
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>database</span>
        <span className="text-label-sm">資料來源</span>
      </div>
      <a
        href="https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx"
        target="_blank"
        rel="noopener noreferrer"
        className="text-label-sm text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
      >
        農業部農產品產銷資訊整合查詢系統（開放資料）
      </a>
      <p className="text-2xs text-on-surface-variant/40 mt-0.5">
        依 CC BY 4.0 授權使用 · 僅供參考，實際交易以各市場公告為準
      </p>
    </div>
  )
}
