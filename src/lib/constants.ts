export const ALL_MARKET_SENTINEL = '全部市場'
export const NATIONWIDE_MARKET = '全國平均'
export const NATIONAL_OVERVIEW_LABEL = '全國概況'
export const DEFAULT_MARKET = '台北一'
export const DEFAULT_MARKETS = [ALL_MARKET_SENTINEL, '台北一', '台北二', '台中市', '高雄市', '西螺鎮', '彰化市場', '嘉義市', '屏東市']
export const DEFAULT_HOME_MARKETS = DEFAULT_MARKETS.filter((market) => market !== ALL_MARKET_SENTINEL)

/** Weather observations are location-based and cannot represent an aggregate market. */
export function isAggregateMarket(market: string): boolean {
  return market === ALL_MARKET_SENTINEL || market === NATIONWIDE_MARKET
}
