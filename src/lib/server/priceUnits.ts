/**
 * Wholesale veg/fruit open data is 元/公斤.
 * Product display for movers uses 台斤 (1 台斤 = 0.6 kg).
 */
export const KG_PER_TAIJIN = 0.6;

/** Convert a per-kg price to per-台斤. */
export function kgPriceToTaijin(pricePerKg: number): number {
  return Math.round(pricePerKg * KG_PER_TAIJIN * 10) / 10;
}
