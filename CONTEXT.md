# 農時價 (TW VeggiePrice)

台灣批發行情查詢：以市場與品類呈現均價、漲跌與走勢，供日常採買參考。

## Language

**Market Overview**:
A scope's latest trading-day average price, volume, and change versus the previous trading day for one produce category. The scope may be a named wholesale market or the National Overview.
_Avoid_: dashboard snapshot, hero stats (UI-only)

**Market Trend**:
An ordered series of daily averages for one market scope (null on closed or missing days) used for charts and for deriving Market Overview.
_Avoid_: price history (crop-level), sparkline (UI-only)

**Homepage Weekly Trend**:
The homepage's 7-day National Overview chart for the active produce category. It is a readable line chart with a price scale, date labels, hover tooltip, and explicit closed-day markers; it is not a decorative sparkline.
_Avoid_: relative-height bar chart, unnamed weekly trend

**National Overview**:
The homepage's default scope: a national aggregate across eligible wholesale markets for an active produce category, used to understand broad price and supply movement rather than one named venue.
_Avoid_: 全國市場, market selector, single-market overview

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
A crop ranked by absolute % change of national avg price (元/公斤): simple mean of all markets' 平均價 that day, vs the same mean on the crop's previous priced day (volume ignored).
_Avoid_: gainer, leaderboard item; 其他 (misc bucket, excluded)

**Home Market Session**:
The client-side coordination of the homepage's National Overview category, overview, trend, and Top Mover data. Named-market filtering and market-specific rest/weather remain outside the homepage shell.
_Avoid_: HomeClient state (implementation), bootstrap endpoint (F5, deferred)
