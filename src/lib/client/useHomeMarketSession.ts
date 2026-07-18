"use client";

/**
 * Home Market Session — deep module for homepage fetch orchestration (C3).
 * Interface: category/national-overview-scope/reload + snapshot fields.
 * Effects stay inside.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ALL_MARKET_SENTINEL } from "@/lib/constants";
import type { ProduceCategory } from "@/lib/produce";
import type {
  MarketOverview,
  PriceHistoryPoint,
  TopMover,
} from "@/lib/types";
import { fetchTopMovers } from "@/lib/api";
import {
  getUserPreferences,
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@/lib/preferences";

export type HomeMarketSessionInput = {
  initialTrend?: PriceHistoryPoint[];
  initialOverview?: MarketOverview | null;
};

export type HomeMarketSession = {
  overview: MarketOverview | null;
  movers: TopMover[];
  marketTrend: PriceHistoryPoint[];
  loadingOverview: boolean;
  loadingMovers: boolean;
  activeCategory: ProduceCategory;
  overviewError: string;
  moversError: string;
  reloadKey: number;
  preferences: UserPreferences;
  setActiveCategory: (c: ProduceCategory) => void;
  reload: () => void;
  primaryDataLoading: boolean;
};

export function useHomeMarketSession(
  input: HomeMarketSessionInput = {},
): HomeMarketSession {
  const initialTrend = input.initialTrend ?? [];
  const initialOverview = input.initialOverview ?? null;

  const [overview, setOverview] = useState<MarketOverview | null>(
    initialOverview,
  );
  const [movers, setMovers] = useState<TopMover[]>([]);
  const [marketTrend, setMarketTrend] =
    useState<PriceHistoryPoint[]>(initialTrend);
  const [loadingOverview, setLoadingOverview] = useState(!initialOverview);
  const [loadingMovers, setLoadingMovers] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<ProduceCategory>("vegetable");
  const [overviewError, setOverviewError] = useState("");
  const [moversError, setMoversError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);

  const hasInitialOverview = useRef(!!initialOverview);
  const skipDefaultPrefetchRoundtrip = useRef(
    !!initialOverview && initialTrend.length > 0,
  );

  useEffect(() => {
    const prefs = getUserPreferences();
    setPreferences(prefs);
    if (prefs.preferredMarketType === "Fruit") {
      setActiveCategory("fruit");
    }
  }, []);

  useEffect(() => {
    setLoadingMovers(true);
    setMoversError("");
    fetchTopMovers(undefined, activeCategory)
      .then(setMovers)
      .catch((err) =>
        setMoversError(
          err instanceof Error ? err.message : "暫時無法取得波動排行",
        ),
      )
      .finally(() => setLoadingMovers(false));
  }, [activeCategory]);

  useEffect(() => {
    const ac = new AbortController();

    async function loadOverviewAndTrend() {
      if (
        skipDefaultPrefetchRoundtrip.current &&
        activeCategory === "vegetable" &&
        reloadKey === 0
      ) {
        skipDefaultPrefetchRoundtrip.current = false;
        hasInitialOverview.current = false;
        setLoadingOverview(false);
        return;
      }
      skipDefaultPrefetchRoundtrip.current = false;

      if (!hasInitialOverview.current) setLoadingOverview(true);
      hasInitialOverview.current = false;
      setOverviewError("");

      const market = encodeURIComponent(ALL_MARKET_SENTINEL);

      try {
        const [ovResult, trendResult] = await Promise.allSettled([
          fetch(
            `/api/prices/overview?market=${market}&category=${activeCategory}`,
            { signal: ac.signal },
          ).then((r) => r.json().then((j: unknown) => ({ ok: r.ok, json: j }))),
          fetch(
            `/api/prices/overview/trend?market=${market}&days=7&category=${activeCategory}`,
            { signal: ac.signal },
          ).then((r) => r.json().then((j: unknown) => ({ ok: r.ok, json: j }))),
        ]);

        if (ac.signal.aborted) return;

        if (ovResult.status === "fulfilled" && ovResult.value.ok) {
          setOverview(ovResult.value.json as MarketOverview);
          setOverviewError("");
        } else {
          const json =
            ovResult.status === "fulfilled"
              ? (ovResult.value.json as { error?: string })
              : null;
          let errStr =
            json?.error ||
            (ovResult.status === "rejected"
              ? String(ovResult.reason?.message ?? ovResult.reason)
              : "暫時無法取得全國概況");
          if (errStr.includes("fetch") || errStr.includes("abort"))
            errStr = "連線至伺服器失敗，請檢查網路狀態或稍後再試";
          if (ovResult.status === "rejected" && ac.signal.aborted) return;
          setOverviewError(errStr);
        }

        if (trendResult.status === "fulfilled" && trendResult.value.ok) {
          setMarketTrend(trendResult.value.json as PriceHistoryPoint[]);
        } else if (!ac.signal.aborted) {
          setMarketTrend([]);
        }
      } finally {
        if (!ac.signal.aborted) setLoadingOverview(false);
      }
    }

    loadOverviewAndTrend();
    return () => ac.abort();
  }, [activeCategory, reloadKey]);

  const reload = useCallback(() => setReloadKey((v) => v + 1), []);

  const primaryDataLoading =
    loadingOverview || (loadingMovers && movers.length === 0);

  return {
    overview,
    movers,
    marketTrend,
    loadingOverview,
    loadingMovers,
    activeCategory,
    overviewError,
    moversError,
    reloadKey,
    preferences,
    setActiveCategory,
    reload,
    primaryDataLoading,
  };
}
