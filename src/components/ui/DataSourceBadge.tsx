// Full-strength tokens: the faded /40–/70 variants failed WCAG AA contrast (PageSpeed accessibility audit).
export function DataSourceBadge() {
  return (
    <div className="flex flex-col items-center gap-1.5 py-6 text-center">
      <div className="flex items-center gap-1.5 text-on-surface-variant">
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '14px' }}>database</span>
        <span className="text-label-sm">資料來源</span>
      </div>
      <a
        href="https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx"
        target="_blank"
        rel="noopener noreferrer"
        className="text-label-sm text-primary hover:text-on-surface underline underline-offset-2 transition-colors"
      >
        農業部農產品產銷資訊整合查詢系統（開放資料）
      </a>
      <p className="text-2xs text-on-surface-variant mt-0.5">
        依 CC BY 4.0 授權使用 · 僅供參考，實際交易以各市場公告為準
      </p>
    </div>
  )
}
