# 農時價 (TW VeggiePrice)

台灣批發行情查詢：以市場與品類呈現均價、漲跌與走勢，供日常採買參考。

## Language

**Market Overview**:
A single market's latest trading-day average price, volume, and change versus the previous trading day for one produce category.
_Avoid_: dashboard snapshot, hero stats (UI-only)

**Market Trend**:
An ordered series of daily market averages (null on closed or missing days) used for charts and for deriving Market Overview.
_Avoid_: price history (crop-level), sparkline (UI-only)

**Produce Category**:
The user-facing feed slice: vegetable, fruit, meat, or seafood (maps to distinct upstream sources).
_Avoid_: crop type alone when the whole market rollup is meant; N04/N05 (implementation codes)

**Trading Day**:
A calendar day with a non-null market average; closed or missing days are not trading days for change math.
_Avoid_: session, open day (ambiguous)

**Market Name**:
The wholesale market label used for filtering and display (aliases may map 台北一↔台北 across feeds).
_Avoid_: venue, station

**Top Mover**:
A crop (or livestock item) ranked by absolute price change between the latest and a recent baseline trading day.
_Avoid_: gainer, leaderboard item

**Home Market Session**:
The client-side coordination of market list, category, overview, trend, movers, and rest/weather for the homepage shell.
_Avoid_: HomeClient state (implementation), bootstrap endpoint (F5, deferred)
