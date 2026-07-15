"use client";

/**
 * Home Market Session — deep module for homepage fetch orchestration (C3).
 * Interface: category/market/reload + snapshot fields. Effects stay inside.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_MARKET,
  DEFAULT_HOME_MARKETS,
  isAggregateMarket,
} from "@/lib/constants";
import { resolveMarketInList } from "@/lib/markets";
import type { ProduceCategory } from "@/lib/produce";
import type {
  MarketOverview,
  PriceHistoryPoint,
  TopMover,
  MarketRestDay,
  MarketWeatherRiskSummary,
} from "@/lib/types";
import {
  fetchMarketList,
  fetchTopMovers,
  fetchMarketRestDays,
  fetchMarketWeatherRisk,
} from "@/lib/api";
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
  markets: string[];
  marketsCategory: ProduceCategory | null;
  loadingOverview: boolean;
  loadingMovers: boolean;
  activeCategory: ProduceCategory;
  selectedMarket: string;
  overviewError: string;
  moversError: string;
  reloadKey: number;
  nextRestDay: MarketRestDay | null;
  isClosedToday: boolean;
  weatherRisk: MarketWeatherRiskSummary | null;
  preferences: UserPreferences;
  setActiveCategory: (c: ProduceCategory) => void;
  setSelectedMarket: (m: string) => void;
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
  const [markets, setMarkets] = useState<string[]>(DEFAULT_HOME_MARKETS);
  const [marketsCategory, setMarketsCategory] = useState<
    ProduceCategory | null
  >("vegetable");
  const [loadingOverview, setLoadingOverview] = useState(!initialOverview);
  const [loadingMovers, setLoadingMovers] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<ProduceCategory>("vegetable");
  const [selectedMarket, setSelectedMarket] = useState(DEFAULT_MARKET);
  const [overviewError, setOverviewError] = useState("");
  const [moversError, setMoversError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [nextRestDay, setNextRestDay] = useState<MarketRestDay | null>(null);
  const [isClosedToday, setIsClosedToday] = useState(false);
  const [weatherRisk, setWeatherRisk] =
    useState<MarketWeatherRiskSummary | null>(null);
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);

  const selectedMarketRef = useRef(selectedMarket);
  useEffect(() => {
    selectedMarketRef.current = selectedMarket;
  }, [selectedMarket]);

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
    let cancelled = false;
    let marketType = "Veg";
    if (activeCategory === "fruit") marketType = "Fruit";
    else if (activeCategory === "meat") marketType = "meat";
    else if (activeCategory === "seafood") marketType = "seafood";

    setMarketsCategory((prev) => (prev === activeCategory ? prev : null));

    fetchMarketList(marketType)
      .then((list) => {
        if (cancelled) return;
        const filtered = list.filter((m) => m !== "全部市場");
        setMarkets(filtered);

        const prefs = getUserPreferences();
        const resolved = resolveMarketInList(
          selectedMarketRef.current,
          filtered,
          prefs.preferredMarket,
        );
        if (resolved !== selectedMarketRef.current) {
          setSelectedMarket(resolved);
        }
        setMarketsCategory(activeCategory);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setMarketsCategory(activeCategory);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

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
    function addDaysISO(iso: string, days: number) {
      const parts = iso.split("-").map(Number);
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().split("T")[0];
    }

    async function loadMarketStaticInsights() {
      const taiDate = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
      const today = taiDate.toISOString().split("T")[0];

      const [restResult, weatherResult] = await Promise.allSettled([
        fetchMarketRestDays({
          market: selectedMarket,
          startDate: today,
          endDate: addDaysISO(today, 45),
        }),
        isAggregateMarket(selectedMarket)
          ? Promise.resolve(null)
          : fetchMarketWeatherRisk(selectedMarket),
      ]);

      if (restResult.status === "fulfilled") {
        const next =
          restResult.value
            .filter((item) => item.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
        setNextRestDay(next);
        setIsClosedToday(next?.date === today);
      } else {
        setNextRestDay(null);
        setIsClosedToday(false);
      }

      if (weatherResult.status === "fulfilled") {
        setWeatherRisk(weatherResult.value);
      } else {
        setWeatherRisk(null);
      }
    }

    loadMarketStaticInsights();
  }, [selectedMarket, reloadKey]);

  useEffect(() => {
    if (marketsCategory !== activeCategory) {
      if (!hasInitialOverview.current) setLoadingOverview(true);
      return;
    }

    const ac = new AbortController();

    async function loadOverviewAndTrend() {
      if (
        skipDefaultPrefetchRoundtrip.current &&
        selectedMarket === DEFAULT_MARKET &&
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

      try {
        const [ovResult, trendResult] = await Promise.allSettled([
          fetch(
            `/api/prices/overview?market=${encodeURIComponent(selectedMarket)}&category=${activeCategory}`,
            { signal: ac.signal },
          ).then((r) => r.json().then((j: unknown) => ({ ok: r.ok, json: j }))),
          fetch(
            `/api/prices/overview/trend?market=${encodeURIComponent(selectedMarket)}&days=7&category=${activeCategory}`,
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
              : "暫時無法取得市場概況");
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
  }, [selectedMarket, activeCategory, reloadKey, marketsCategory]);

  const reload = useCallback(() => setReloadKey((v) => v + 1), []);

  const primaryDataLoading =
    (loadingOverview && !overview) || (loadingMovers && movers.length === 0);

  return {
    overview,
    movers,
    marketTrend,
    markets,
    marketsCategory,
    loadingOverview,
    loadingMovers,
    activeCategory,
    selectedMarket,
    overviewError,
    moversError,
    reloadKey,
    nextRestDay,
    isClosedToday,
    weatherRisk,
    preferences,
    setActiveCategory,
    setSelectedMarket,
    reload,
    primaryDataLoading,
  };
}
