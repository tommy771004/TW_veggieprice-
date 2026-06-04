"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { TrendChip } from "@/components/ui/TrendChip";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  SkeletonCard,
  SkeletonList,
  SkeletonRow,
} from "@/components/ui/SkeletonCard";
import { formatPrice } from "@/lib/utils";
import { DEFAULT_MARKET, DEFAULT_HOME_MARKETS } from "@/lib/constants";

const WeatherRiskCard = dynamic(() =>
  import("@/components/ui/WeatherRiskCard").then((mod) => mod.WeatherRiskCard),
);
const ExploreSection = dynamic(
  () =>
    import("@/components/ui/ExploreSection").then((mod) => mod.ExploreSection),
  { loading: () => null },
);
const AboutSection = dynamic(
  () => import("@/components/ui/AboutSection").then((mod) => mod.AboutSection),
  { loading: () => null },
);
const RecommendedLinks = dynamic(
  () =>
    import("@/components/ui/RecommendedLinks").then(
      (mod) => mod.RecommendedLinks,
    ),
  { loading: () => null },
);
const DataSourceBadge = dynamic(
  () =>
    import("@/components/ui/DataSourceBadge").then(
      (mod) => mod.DataSourceBadge,
    ),
  { loading: () => null },
);
const LivestockSection = dynamic(
  () =>
    import("@/components/pages/HomeSections/LivestockSection").then(
      (mod) => mod.LivestockSection,
    ),
  { loading: () => null },
);
const SeasonalGuideSection = dynamic(
  () =>
    import("@/components/pages/HomeSections/SeasonalGuideSection").then(
      (mod) => mod.SeasonalGuideSection,
    ),
  { loading: () => null },
);

import {
  getProduceCategory,
  getSeasonalGuide,
  type ProduceCategory,
} from "@/lib/produce";
import type {
  MarketOverview,
  PriceHistoryPoint,
  TopMover,
  LivestockPrices,
  SeasonalItem,
  MarketRestDay,
  MarketWeatherRiskSummary,
} from "@/lib/types";
import {
  fetchMarketList,
  fetchTopMovers,
  fetchLivestock,
  fetchSeasonal,
  fetchMarketRestDays,
  fetchMarketWeatherRisk,
} from "@/lib/api";
import {
  getUserPreferences,
  DEFAULT_USER_PREFERENCES,
} from "@/lib/preferences";

const CATEGORIES: ReadonlyArray<{ label: string; value: ProduceCategory }> = [
  { label: "🥬 蔬菜類", value: "vegetable" },
  { label: "🍎 水果類", value: "fruit" },
  // { label: '🌸 花卉類', value: 'flower' },
  //{ label: '🍄 菇類', value: 'mushroom' },
  { label: "🐖 肉品家禽", value: "meat" },
  { label: "🐟 漁產", value: "seafood" },
];

// ── Shared animation variants ──────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

const moverVariant = {
  hidden: { opacity: 0, x: -12, scale: 0.97 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 340, damping: 26 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

interface HomeClientProps {
  initialTrend?: PriceHistoryPoint[];
  initialLivestock?: LivestockPrices | null;
  initialOverview?: MarketOverview | null;
}

export function HomeClient({
  initialTrend = [],
  initialLivestock = null,
  initialOverview = null,
}: HomeClientProps) {
  const [overview, setOverview] = useState<MarketOverview | null>(
    initialOverview,
  );
  const [movers, setMovers] = useState<TopMover[]>([]);
  const [marketTrend, setMarketTrend] =
    useState<PriceHistoryPoint[]>(initialTrend);
  const [markets, setMarkets] = useState<string[]>(DEFAULT_HOME_MARKETS);
  const [loadingOverview, setLoadingOverview] = useState(!initialOverview);
  const [loadingMovers, setLoadingMovers] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<ProduceCategory>("vegetable");
  const [selectedMarket, setSelectedMarket] = useState(DEFAULT_MARKET);
  const [overviewError, setOverviewError] = useState("");
  const [moversError, setMoversError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [nextRestDay, setNextRestDay] = useState<MarketRestDay | null>(null);
  const [isClosedToday, setIsClosedToday] = useState(false);
  const [weatherRisk, setWeatherRisk] =
    useState<MarketWeatherRiskSummary | null>(null);
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const pulseScrollRef = useRef<HTMLDivElement>(null);
  const insightsScrollRef = useRef<HTMLDivElement>(null);
  const selectedMarketRef = useRef(selectedMarket);

  useEffect(() => {
    selectedMarketRef.current = selectedMarket;
  }, [selectedMarket]);

  // Suppress loading flash on first mount when server pre-fetched data is available.
  const hasInitialOverview = useRef(!!initialOverview);

  const scrollPulse = (dir: "left" | "right") => {
    if (pulseScrollRef.current) {
      const scrollAmount = dir === "left" ? -280 : 280;
      pulseScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollInsights = (dir: "left" | "right") => {
    if (insightsScrollRef.current) {
      const scrollAmount = dir === "left" ? -260 : 260;
      insightsScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const loading = loadingMovers;
  const activeCategoryLabel = useMemo(
    () =>
      CATEGORIES.find((item) => item.value === activeCategory)
        ?.label.split(" ")
        .at(-1) ?? "蔬菜類",
    [activeCategory],
  );

  useEffect(() => {
    setAlertDismissed(false);
  }, [selectedMarket]);

  useEffect(() => {
    const prefs = getUserPreferences();
    setPreferences(prefs);
    if (prefs.preferredMarketType === "Fruit") {
      setActiveCategory("fruit");
    }
  }, []);

  useEffect(() => {
    let marketType = "Veg";
    if (activeCategory === "fruit") marketType = "Fruit";
    else if (activeCategory === "meat") marketType = "meat";
    else if (activeCategory === "seafood") marketType = "seafood";

    fetchMarketList(marketType)
      .then((list) => {
        const filtered = list.filter((m) => m !== "全部市場");
        setMarkets(filtered);

        // If the current market is not in this new list, fallback to preferred or first
        if (
          filtered.length > 0 &&
          !filtered.includes(selectedMarketRef.current)
        ) {
          const prefs = getUserPreferences();
          if (filtered.includes(prefs.preferredMarket)) {
            setSelectedMarket(prefs.preferredMarket);
          } else if (filtered.includes("台北一")) {
            setSelectedMarket("台北一");
          } else {
            setSelectedMarket(filtered[0]);
          }
        }
      })
      .catch(console.error);
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

  // ── Market-Dependent Static Metadata ────────────────────────
  useEffect(() => {
    function addDaysISO(iso: string, days: number) {
      const parts = iso.split("-").map(Number);
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().split("T")[0];
    }

    async function loadMarketStaticInsights() {
      // Calculate today's date in Taiwan Time (UTC+8)
      const taiDate = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
      const today = taiDate.toISOString().split("T")[0];

      const [restResult, weatherResult] = await Promise.allSettled([
        fetchMarketRestDays({
          market: selectedMarket,
          startDate: today,
          endDate: addDaysISO(today, 45),
        }),
        fetchMarketWeatherRisk(selectedMarket),
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

  // ── Category-Dependent Overview & Trend Fetch ────────────────
  useEffect(() => {
    async function loadOverviewAndTrend() {
      if (!hasInitialOverview.current) setLoadingOverview(true);
      hasInitialOverview.current = false;
      setOverviewError("");

      const [ovResult, trendResult] = await Promise.allSettled([
        fetch(
          `/api/prices/overview?market=${encodeURIComponent(selectedMarket)}&category=${activeCategory}`,
        ).then((r) => r.json().then((j: unknown) => ({ ok: r.ok, json: j }))),
        fetch(
          `/api/prices/overview/trend?market=${encodeURIComponent(selectedMarket)}&days=7&category=${activeCategory}`,
        ).then((r) => r.json().then((j: unknown) => ({ ok: r.ok, json: j }))),
      ]);

      if (ovResult.status === "fulfilled" && ovResult.value.ok) {
        setOverview(ovResult.value.json as MarketOverview);
      } else {
        const json =
          ovResult.status === "fulfilled"
            ? (ovResult.value.json as { error?: string })
            : null;
        let errStr =
          json?.error ||
          (ovResult.status === "rejected"
            ? ovResult.reason.message
            : "暫時無法取得市場概況");
        if (errStr.includes("fetch"))
          errStr = "連線至伺服器失敗，請檢查網路狀態或稍後再試";
        setOverviewError(errStr);
      }

      if (trendResult.status === "fulfilled" && trendResult.value.ok) {
        setMarketTrend(trendResult.value.json as PriceHistoryPoint[]);
      } else {
        setMarketTrend([]);
      }

      setLoadingOverview(false);
    }
    loadOverviewAndTrend();
  }, [selectedMarket, activeCategory, reloadKey]);

  const filteredMovers = useMemo(
    () =>
      movers.filter(
        (item) => getProduceCategory(item.cropName) === activeCategory,
      ),
    [activeCategory, movers],
  );

  const trendMetrics = useMemo(() => {
    const trendSeries = marketTrend;
    const trendPoints = trendSeries.filter((point) => point.avgPrice !== null);
    let maxTrend = 1;
    let minTrend = Infinity;

    for (const point of trendPoints) {
      const value = point.avgPrice ?? 0;
      if (value > maxTrend) maxTrend = value;
      if (value < minTrend) minTrend = value;
    }

    if (minTrend === Infinity) minTrend = maxTrend;

    const trendRange = Math.max(maxTrend - minTrend, 1);
    const trendChange =
      trendPoints.length > 1
        ? (((trendPoints[trendPoints.length - 1].avgPrice ?? 0) -
            (trendPoints[0].avgPrice ?? 0)) /
            Math.max(trendPoints[0].avgPrice ?? 1, 1)) *
          100
        : 0;

    const heroLinePoints =
      trendPoints.length > 1
        ? trendPoints
            .map((point, index) => {
              const value = point.avgPrice ?? 0;
              const x = (index / (trendPoints.length - 1)) * 400;
              const y = 40 - ((value - minTrend) / trendRange) * 32 - 4;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ")
        : "";

    return {
      trendSeries,
      trendPoints,
      minTrend,
      trendRange,
      trendChange,
      heroLinePoints,
    };
  }, [marketTrend]);

  const {
    trendSeries,
    trendPoints,
    minTrend,
    trendRange,
    trendChange,
    heroLinePoints,
  } = trendMetrics;
  const weatherRiskLevelLabel =
    weatherRisk?.level === "high"
      ? "高風險"
      : weatherRisk?.level === "medium"
        ? "中風險"
        : "低風險";

  const marketPulseCards = useMemo(() => {
    if (!overview) return [];

    return [
      {
        label: "今日均價",
        value: `$${formatPrice(overview.avgPrice)}`,
        meta: `${overview.marketName}`,
      },
      {
        label: "交易量",
        value: `${(overview.totalVolume / 1000).toFixed(0)}`,
        meta: "公噸",
      },
      {
        label: "近週走勢",
        value: `${trendChange >= 0 ? "+" : ""}${trendChange.toFixed(1)}%`,
        meta:
          trendSeries.length > 0 ? `${trendSeries.length} 日樣本` : "等待資料",
      },
    ];
  }, [overview, trendChange, trendSeries.length]);

  const heroStatusChips = useMemo(() => {
    const chips: Array<{ label: string; tone?: "critical" | "warm" }> = [
      { label: selectedMarket },
      { label: activeCategoryLabel },
      { label: isClosedToday ? "今日休市" : "正常交易" },
    ];

    if (weatherRisk) {
      chips.push({
        label: `天氣${weatherRisk.score}分`,
        tone:
          weatherRisk.level === "high"
            ? "critical"
            : weatherRisk.level === "medium"
              ? "warm"
              : undefined,
      });
    }

    return chips;
  }, [activeCategoryLabel, isClosedToday, selectedMarket, weatherRisk]);

  const heroInsightCards = useMemo(() => {
    if (!overview) return [];

    return [
      {
        label: "量能變化",
        value: `${overview.volumeChange >= 0 ? "+" : ""}${overview.volumeChange.toFixed(1)}%`,
        meta: "相較昨日交易量",
      },
      {
        label: "市場節奏",
        value: isClosedToday ? "今日休市" : "正常交易",
        meta: nextRestDay
          ? `下次休市 ${nextRestDay.date.replace(/-/g, "/")}${nextRestDay.note ? ` · ${nextRestDay.note}` : ""}`
          : "近 45 日暫無休市公告",
      },
      {
        label: weatherRisk ? "天氣風險" : "近週走勢",
        value: weatherRisk
          ? `${weatherRisk.score} 分`
          : `${trendChange >= 0 ? "+" : ""}${trendChange.toFixed(1)}%`,
        meta: weatherRisk
          ? `${weatherRiskLevelLabel} · ${weatherRisk.reasons[0] ?? "近期天氣條件平穩"}`
          : `${trendSeries.length || trendPoints.length} 日樣本`,
      },
    ];
  }, [
    isClosedToday,
    nextRestDay,
    overview,
    trendChange,
    trendPoints.length,
    trendSeries.length,
    weatherRisk,
    weatherRiskLevelLabel,
  ]);

  const showErrorCard =
    !loadingOverview &&
    !loadingMovers &&
    overviewError !== "" &&
    moversError !== "";
  const combinedError = overviewError || moversError;
  const sparkColor = trendChange >= 0 ? "#fcd34d" : "#86efac";
  const weatherMarkerTone =
    weatherRisk?.level === "high"
      ? "bg-error text-white"
      : weatherRisk?.level === "medium"
        ? "bg-amber-500 text-white"
        : "bg-primary text-white";

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="home-dashboard-shell px-section-margin py-6 space-y-section-margin">
        {/* ── Market Overview Hero ───────────────────────── */}
        <m.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="home-market-stage -mx-3 md:-mx-6 px-3 md:px-6 py-2 md:py-4"
        >
          <div className="section-heading-row mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface">
                今日市場概況
              </h1>
              <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl font-medium">
                掌握 {selectedMarket} 的均價、量能與近週節奏。
              </p>
              {overview?.updatedAt && (
                <p className="text-label-sm text-outline flex items-center gap-1 mt-1 font-mono">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "14px" }}
                  >
                    update
                  </span>
                  更新時間：
                  <span suppressHydrationWarning>
                    {typeof window !== "undefined"
                      ? new Date(overview.updatedAt).toLocaleString("zh-TW", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "..."}
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              {heroStatusChips.map((chip) => (
                <span
                  key={chip.label}
                  className={[
                    "market-status-chip",
                    chip.tone === "critical"
                      ? "market-status-chip--critical"
                      : chip.tone === "warm"
                        ? "market-status-chip--warm"
                        : "",
                  ]
                    .join(" ")
                    .trim()}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {(nextRestDay || weatherRisk) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <div className="rounded-2xl border border-primary/20 bg-white/70 backdrop-blur-sm px-4 py-3">
                <p className="text-label-bold text-primary">市場休市避雷</p>
                {nextRestDay ? (
                  <p className="text-body-sm text-on-surface mt-1">
                    下次休市：{nextRestDay.date.replace(/-/g, "/")}{" "}
                    {nextRestDay.note ? `(${nextRestDay.note})` : ""}
                  </p>
                ) : (
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    近 45 日暫無休市公告
                  </p>
                )}
              </div>
              <WeatherRiskCard weatherRisk={weatherRisk} />
            </div>
          )}

          {/* Pulse Marquee */}
          {marketPulseCards.length > 0 && (
            <div className="mb-4 overflow-hidden bg-surface/60 backdrop-blur-md border border-outline/20 rounded-2xl flex items-center shadow-glass-sm py-2 group/marquee cursor-default relative">
              <m.div
                className="flex whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
                style={{ width: "fit-content" }}
              >
                {[...marketPulseCards, ...marketPulseCards].map((card, i) => (
                  <div
                    key={`${card.label}-${i}`}
                    className="inline-flex items-center gap-3 px-8 shrink-0 relative after:content-[''] after:absolute after:right-0 after:-translate-y-1/2 after:top-1/2 after:w-1 after:h-1 after:rounded-full after:bg-outline/50 last:after:hidden"
                  >
                    <span className="text-label-sm font-bold text-primary/80 uppercase tracking-widest">
                      {card.label}
                    </span>
                    <strong className="text-body-md font-black text-on-surface tabular-nums">
                      {card.value}
                    </strong>
                    <small className="text-xs font-medium text-on-surface-variant bg-surface-variant/50 px-2 py-0.5 rounded-md">
                      {card.meta}
                    </small>
                  </div>
                ))}
              </m.div>
            </div>
          )}

          {/* Daily summary banner */}
          <AnimatePresence>
            {!summaryDismissed &&
              preferences.dailySummary &&
              overview &&
              !loadingOverview && (
                <m.div
                  key="summary"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 flex items-center justify-between text-body-sm text-on-surface">
                    <span className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: "1.125rem" }}
                      >
                        analytics
                      </span>
                      {overview.marketName} 今日均價 $
                      {formatPrice(overview.avgPrice)}，較昨日&nbsp;
                      <TrendChip change={overview.priceChange} size="sm" />
                      ，總交易量 {(overview.totalVolume / 1000).toFixed(0)} 公噸
                    </span>
                    <button
                      aria-label="關閉摘要"
                      onClick={() => setSummaryDismissed(true)}
                      className="ml-3 text-outline hover:text-on-surface leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                </m.div>
              )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {loadingOverview ? (
              <m.div
                key="hero-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="home-hero-card rounded-3xl p-6 animate-pulse min-h-[220px]"
              >
                <div
                  className="h-3 w-28 rounded-full mb-5"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                />
                <div
                  className="h-14 w-44 rounded-xl mb-6"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
                <div
                  className="h-9 w-full rounded-lg"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                />
              </m.div>
            ) : showErrorCard ? (
              <m.div
                key="hero-error"
                variants={fadeUp}
                initial="hidden"
                animate="show"
              >
                <GlassCard className="p-container-padding text-center">
                  <div className="text-4xl mb-2">🧺</div>
                  <p className="text-body-lg font-semibold text-on-surface">
                    首頁資料暫時無法載入
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {combinedError}
                  </p>
                  <button
                    onClick={() => setReloadKey((v) => v + 1)}
                    className="mt-4 text-primary text-label-bold hover:underline"
                  >
                    重新載入
                  </button>
                </GlassCard>
              </m.div>
            ) : overviewError ? (
              <m.div
                key="hero-ov-error"
                variants={fadeUp}
                initial="hidden"
                animate="show"
              >
                <GlassCard className="p-container-padding text-center">
                  <div className="text-4xl mb-2">🧺</div>
                  <p className="text-body-lg font-semibold text-on-surface">
                    市場概況暫時無法載入
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {overviewError}
                  </p>
                  <button
                    onClick={() => setReloadKey((v) => v + 1)}
                    className="mt-4 text-primary text-label-bold hover:underline"
                  >
                    重新載入
                  </button>
                </GlassCard>
              </m.div>
            ) : overview ? (
              <m.div
                key="hero-data"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
              >
                <Link
                  href={`/search?market=${encodeURIComponent(selectedMarket)}&type=${
                    activeCategory === "fruit"
                      ? "Fruit"
                      : activeCategory === "meat"
                        ? "meat"
                        : activeCategory === "seafood"
                          ? "seafood"
                          : "Veg"
                  }`}
                  className="block home-hero-card rounded-3xl overflow-hidden card-lift"
                >
                  <div
                    className={`px-6 pt-6 pb-5 relative ${isClosedToday ? "opacity-60 grayscale transition-all" : ""}`}
                  >
                    {isClosedToday && (
                      <div className="absolute top-4 right-6 bg-surface-variant/90 text-on-surface-variant px-2 py-1 rounded text-xs font-bold ring-1 ring-outline/20 backdrop-blur-md flex items-center gap-1 z-10 shadow-sm">
                        <span className="material-symbols-outlined text-sm">
                          event_busy
                        </span>
                        本日休市
                      </div>
                    )}
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_19rem]">
                      <div className="min-w-0 space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="market-status-chip market-status-chip--hero">
                            {overview.marketName}
                          </span>
                          <span className="market-status-chip market-status-chip--hero">
                            {activeCategoryLabel}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p
                            className="text-label-sm tracking-wide uppercase font-semibold mb-2"
                            style={{ color: "rgba(255,255,255,0.6)" }}
                          >
                            均價 · 元 / 公斤
                          </p>
                          <div className="flex items-baseline gap-3 flex-wrap">
                            <m.span
                              className="text-6xl sm:text-7xl leading-none font-bold tabular-nums tracking-tighter"
                              style={{ color: "#ffffff" }}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 20,
                                delay: 0.1,
                              }}
                            >
                              ${formatPrice(overview.avgPrice)}
                            </m.span>
                            <div className="pb-1 sm:pb-2 shrink-0">
                              <TrendChip change={overview.priceChange} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {trendPoints.length > 1 && (
                    <div
                      className={`px-5 pb-5 ${isClosedToday ? "opacity-60 grayscale transition-all" : ""}`}
                    >
                      <svg
                        viewBox="0 0 400 44"
                        className="w-full h-11"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient
                            id="hero-area"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={sparkColor}
                              stopOpacity="0.22"
                            />
                            <stop
                              offset="100%"
                              stopColor={sparkColor}
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <polygon
                          points={`0,44 ${heroLinePoints} 400,44`}
                          fill="url(#hero-area)"
                        />
                        <polyline
                          points={heroLinePoints}
                          fill="none"
                          stroke={sparkColor}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.8"
                        />
                      </svg>
                      <div
                        className="hero-chart-caption"
                        style={{ marginTop: "2px" }}
                      >
                        <span
                          style={{
                            fontSize: "0.625rem",
                            color: "rgba(255,255,255,0.28)",
                          }}
                        >
                          {trendPoints[0]?.date.slice(5).replace("-", "/")}
                        </span>
                        <span
                          style={{
                            fontSize: "0.625rem",
                            color: "rgba(255,255,255,0.38)",
                            fontWeight: 500,
                          }}
                        >
                          近 {trendSeries.length || trendPoints.length} 日走勢
                        </span>
                        <span
                          style={{
                            fontSize: "0.625rem",
                            color: "rgba(255,255,255,0.28)",
                          }}
                        >
                          {trendPoints[trendPoints.length - 1]?.date
                            .slice(5)
                            .replace("-", "/")}
                        </span>
                      </div>
                    </div>
                  )}
                </Link>
              </m.div>
            ) : null}
          </AnimatePresence>
        </m.section>

        {/* ── Category Filter & Market Select ───────────────────────────── */}
        <section className="-mx-section-margin px-section-margin overflow-x-auto hide-scrollbar">
          <div className="flex gap-2 w-max pb-1 items-center">
            <select
              suppressHydrationWarning
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="bg-white border border-outline-variant/40 rounded-full px-4 py-2 text-label-bold text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm touch-target shrink-0"
            >
              {markets.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="w-[1px] h-6 bg-outline-variant/50 mx-1 shrink-0"></div>
            {CATEGORIES.map((cat) => (
              <m.button
                key={cat.value}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-5 py-2.5 rounded-full text-label-bold whitespace-nowrap flex items-center gap-2 transition-colors touch-target ${
                  activeCategory === cat.value
                    ? "bg-primary text-white shadow-md"
                    : "glass-chip text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                {cat.label}
              </m.button>
            ))}
          </div>
        </section>

        {/* ── Top Movers ────────────────────────────────── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-headline-md font-bold text-on-surface">
              價格波動榜
            </h2>
            <Link
              href={`/search?market=${encodeURIComponent(selectedMarket)}&type=${
                activeCategory === "fruit"
                  ? "Fruit"
                  : activeCategory === "meat"
                    ? "meat"
                    : activeCategory === "seafood"
                      ? "seafood"
                      : "Veg"
              }`}
              className="text-primary text-label-bold hover:underline flex items-center gap-0.5"
            >
              查看全部
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "1.125rem" }}
              >
                chevron_right
              </span>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <m.div
                key={activeCategory}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {filteredMovers.length > 0 ? (
                  filteredMovers.map((item, i) => (
                    <m.div
                      key={`${item.cropCode}_${item.marketName}_${i}`}
                      variants={moverVariant}
                      className="mover-entry"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <Link
                        href={`/produce/${encodeURIComponent(item.cropName)}`}
                        prefetch={false}
                        className="glass-card card-lift rounded-2xl flex items-center justify-between p-3.5 hover:bg-white/60 transition-colors touch-target block"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className="w-11 h-11 rounded-xl bg-white/60 border border-white/50 flex items-center justify-center shadow-sm">
                              <CropIcon
                                name={item.cropName}
                                className="w-7 h-7"
                              />
                            </div>
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-on-primary text-2xs font-black rounded-full flex items-center justify-center leading-none shadow-sm">
                              {i + 1}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-body-lg font-bold text-on-surface dark:text-zinc-100 truncate">
                              {item.cropName}
                            </h3>
                            <p className="text-body-sm text-on-surface-variant dark:text-zinc-400 truncate font-medium">
                              {item.marketName}
                              <span className="opacity-40 mx-1">·</span>
                              {item.grade}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className="text-headline-md font-black text-on-surface dark:text-zinc-100 tabular-nums">
                            ${formatPrice(item.currentPrice)}
                          </div>
                          <div className="mt-1">
                            <TrendChip change={item.priceChange} size="sm" />
                          </div>
                        </div>
                      </Link>
                    </m.div>
                  ))
                ) : (
                  <m.div
                    variants={fadeUp}
                    className="md:col-span-2 lg:col-span-3"
                  >
                    <GlassCard className="p-container-padding text-center">
                      <p className="text-body-md text-on-surface">
                        目前沒有符合此分類的波動作物
                      </p>
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        請切換其他分類查看
                      </p>
                    </GlassCard>
                  </m.div>
                )}
              </m.div>
            </AnimatePresence>
          )}
        </section>

        {/* ── Livestock Prices ──────────────────────────── */}
        <LivestockSection
          initialLivestock={initialLivestock}
          reloadKey={reloadKey}
        />

        {/* ── Weekly Trend + Seasonal Guide ─────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <m.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-30px" }}
          >
            <GlassCard className="p-container-padding flex flex-col justify-between min-h-[160px] h-full">
              <div>
                <h3 className="text-body-lg font-semibold text-on-surface">
                  本週蔬菜均價走勢
                </h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {selectedMarket} 近 {trendSeries.length} 日&nbsp;
                  <span
                    className={trendChange >= 0 ? "text-error" : "text-primary"}
                  >
                    {trendChange >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(trendChange).toFixed(1)}%
                  </span>
                </p>
              </div>
              {trendSeries.length > 0 ? (
                <div className="h-20 flex items-end justify-between gap-1.5 mt-4">
                  {trendSeries.map((point, i) => {
                    const isClosedDay = point.avgPrice === null;
                    const currentValue = point.avgPrice ?? minTrend;
                    const height = isClosedDay
                      ? 22
                      : 24 + ((currentValue - minTrend) / trendRange) * 76;
                    return (
                      <div
                        key={point.date}
                        className={`w-full relative overflow-visible ${isClosedDay ? "border-t border-dashed border-outline/70" : "rounded-t-md"}`}
                        style={{
                          height: `${height}%`,
                          backgroundColor: isClosedDay
                            ? "transparent"
                            : `rgba(46, 125, 50, ${0.35 + (height / 100) * 0.35})`,
                        }}
                      >
                        {isClosedDay && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-surface-container text-outline text-2xs font-semibold px-1.5 py-0.5 rounded border border-outline-variant/40 whitespace-nowrap">
                            休
                          </span>
                        )}
                        {i === trendSeries.length - 1 && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-primary text-2xs font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                            今日
                          </span>
                        )}
                        {i === trendSeries.length - 1 && weatherRisk && (
                          <span
                            className={`absolute -top-12 left-1/2 -translate-x-1/2 text-2xs font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap ${weatherMarkerTone}`}
                          >
                            風險 {weatherRisk.score}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-body-sm text-on-surface-variant mt-4">
                  近 7 日暫無足夠趨勢資料
                </div>
              )}
            </GlassCard>
          </m.div>

          <SeasonalGuideSection />
        </section>

        {/* ── Explore Features ──────────────────────────── */}
        <ExploreSection />

        {/* ── About + FAQ ───────────────────────────────── */}
        <AboutSection />

        {/* ── Data Source Attribution ───────────────────── */}
        <DataSourceBadge />

        {/* ── Other Projects ────────────────────────────── */}
        <RecommendedLinks />

        {/* ── Floating Price Alert (Glassmorphism) ───────── */}
        <AnimatePresence>
          {overview &&
            !loadingOverview &&
            !alertDismissed &&
            Math.abs(overview.priceChange) >= 10 && (
              <m.div
                initial={{ opacity: 0, y: 36, scale: 0.95, x: "-50%" }}
                animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                exit={{ opacity: 0, y: 24, scale: 0.95, x: "-50%" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-[5.25rem] md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 px-4.5 py-2.5 rounded-full glass-card border border-white/45 dark:bg-zinc-900/90 dark:border-zinc-700/50 shadow-glass-md dark:shadow-black/60 text-zinc-900 dark:text-zinc-100 text-body-sm font-medium w-max max-w-[calc(100vw-2.5rem)] text-ellipsis overflow-hidden"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span
                    className="text-base leading-none shrink-0"
                    aria-hidden="true"
                  >
                    {overview.priceChange >= 0 ? "📈" : "📉"}
                  </span>
                  <span className="text-secondary dark:text-orange-300 font-extrabold tracking-tight shrink-0 text-xs sm:text-sm">
                    【波動警報】
                  </span>
                  <span className="text-zinc-800 dark:text-zinc-100 text-xs sm:text-sm truncate">
                    {overview.marketName} 今日均價 $
                    {formatPrice(overview.avgPrice)}，較昨日
                    {overview.priceChange >= 0 ? "上漲" : "下跌"}{" "}
                    <span
                      className={`font-black ${overview.priceChange >= 0 ? "text-error dark:text-red-400" : "text-primary dark:text-emerald-400"}`}
                    >
                      {Math.abs(overview.priceChange).toFixed(1)}%
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setAlertDismissed(true)}
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 leading-none text-xs flex-shrink-0 transition-colors"
                  aria-label="關閉警報"
                >
                  ×
                </button>
              </m.div>
            )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
