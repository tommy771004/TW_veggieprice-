export interface MarketOverviewTrendPoint {
  date: string;
  label: string;
  avgPrice: number | null;
  volume: number | null;
  isClosed: boolean;
}

export interface MarketOverviewTrendResult {
  points: MarketOverviewTrendPoint[];
  error?: string;
}
