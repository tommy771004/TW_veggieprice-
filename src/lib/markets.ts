/**
 * Cross-category market name helpers.
 * Vegetable markets use names like 台北一/台北二; seafood often uses 台北/台中.
 */

function lightNormalize(name: string): string {
  return name.replace(/(市|區|鎮|鄉|縣)$/g, "").replace(/臺/g, "台");
}

/** True when two market labels refer to the same physical market across categories. */
export function marketsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  const la = lightNormalize(a);
  const lb = lightNormalize(b);
  if (la === lb) return true;

  // 台北一 / 台北二 → 台北 (seafood-style short names)
  for (const [full, other] of [
    [a, b],
    [b, a],
  ] as const) {
    if (full.endsWith("一") || full.endsWith("二")) {
      const base = lightNormalize(full.slice(0, -1));
      if (base === lightNormalize(other)) return true;
    }
  }

  return false;
}

/**
 * Pick a market from `markets` that best matches the user's current selection
 * (or preferred market). Falls back to 台北一 / 台北 / first entry.
 */
export function resolveMarketInList(
  current: string,
  markets: string[],
  preferred?: string,
): string {
  if (markets.length === 0) return current;
  if (markets.includes(current)) return current;

  if (preferred && markets.includes(preferred)) return preferred;

  const fuzzyCurrent = markets.find((m) => marketsMatch(m, current));
  if (fuzzyCurrent) return fuzzyCurrent;

  if (preferred) {
    const fuzzyPreferred = markets.find((m) => marketsMatch(m, preferred));
    if (fuzzyPreferred) return fuzzyPreferred;
  }

  if (markets.includes("台北一")) return "台北一";
  if (markets.includes("台北")) return "台北";
  return markets[0];
}
