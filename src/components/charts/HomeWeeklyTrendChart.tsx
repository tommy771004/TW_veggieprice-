"use client";

import { useMemo, useState } from "react";
import type { PriceHistoryPoint } from "@/lib/types";
import { formatPrice, formatVolume } from "@/lib/utils";

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 220;
const PLOT_LEFT = 48;
const PLOT_RIGHT = 16;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 42;

interface HomeWeeklyTrendChartProps {
  points: PriceHistoryPoint[];
  scopeLabel: string;
  categoryLabel: string;
}

function pointY(
  value: number,
  minPrice: number,
  priceRange: number,
): number {
  const plotHeight = VIEWBOX_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const maxPrice = minPrice + priceRange;
  return PLOT_TOP + ((maxPrice - value) / priceRange) * plotHeight;
}

export function HomeWeeklyTrendChart({
  points,
  scopeLabel,
  categoryLabel,
}: HomeWeeklyTrendChartProps) {
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const metrics = useMemo(() => {
    const pricedPoints = points.filter(
      (point): point is PriceHistoryPoint & { avgPrice: number } =>
        point.avgPrice !== null,
    );
    const minPrice = pricedPoints.length
      ? Math.min(...pricedPoints.map((point) => point.avgPrice))
      : 0;
    const maxPrice = pricedPoints.length
      ? Math.max(...pricedPoints.map((point) => point.avgPrice))
      : 1;
    const priceRange = Math.max(maxPrice - minPrice, 1);
    const plotWidth = VIEWBOX_WIDTH - PLOT_LEFT - PLOT_RIGHT;
    const xForIndex = (index: number) =>
      PLOT_LEFT +
      (index / Math.max(points.length - 1, 1)) * plotWidth;
    const plottedPoints = points.map((point, index) => ({
      point,
      x: xForIndex(index),
      y: point.avgPrice === null
        ? PLOT_TOP + (VIEWBOX_HEIGHT - PLOT_TOP - PLOT_BOTTOM) / 2
        : pointY(point.avgPrice, minPrice, priceRange),
    }));
    const linePoints = plottedPoints
      .filter((item) => item.point.avgPrice !== null)
      .map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`)
      .join(" ");

    return {
      minPrice,
      maxPrice,
      priceRange,
      plottedPoints,
      linePoints,
    };
  }, [points]);

  const activePoint = metrics.plottedPoints.find(
    ({ point }) => point.date === activeDate,
  )?.point;
  const tickValues = [
    metrics.maxPrice,
    metrics.minPrice + metrics.priceRange / 2,
    metrics.minPrice,
  ];
  const closedPoints = points.filter((point) => point.isClosed === true);
  const chartLabel = `${scopeLabel} ${categoryLabel}均價走勢圖`;

  return (
    <figure className="mt-4" aria-label={chartLabel}>
      <div className="relative rounded-2xl bg-surface-container/55 border border-outline/15 px-2 pt-2 pb-1">
        <div
          role="img"
          aria-label={chartLabel}
          className="w-full h-52"
        >
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="w-full h-52"
            preserveAspectRatio="none"
          >
            <title>{chartLabel}</title>
            <desc>
            顯示每日均價、交易量、休市日與缺資料日；將滑鼠移到資料點可查看明細。
            </desc>

            {tickValues.map((value, index) => {
              const y = pointY(value, metrics.minPrice, metrics.priceRange);
              return (
                <g key={`${value}-${index}`}>
                  <line
                    x1={PLOT_LEFT}
                    x2={VIEWBOX_WIDTH - PLOT_RIGHT}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.14"
                    strokeDasharray={index === 1 ? "3 5" : undefined}
                  />
                  <text
                    x={PLOT_LEFT - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-on-surface-variant text-[11px]"
                  >
                    {formatPrice(value)}
                  </text>
                </g>
              );
            })}

            <text
              x={PLOT_LEFT}
              y={VIEWBOX_HEIGHT - 8}
              className="fill-on-surface-variant text-[11px]"
            >
              價格（元/公斤）
            </text>

            {metrics.linePoints && (
              <polyline
                points={metrics.linePoints}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              />
            )}

            {metrics.plottedPoints.map(({ point, x, y }) => {
              const isClosed = point.isClosed === true;
              return (
                <g key={point.date}>
                  {isClosed && (
                    <line
                      x1={x}
                      x2={x}
                      y1={PLOT_TOP}
                      y2={VIEWBOX_HEIGHT - PLOT_BOTTOM}
                      stroke="currentColor"
                      strokeOpacity="0.42"
                      strokeDasharray="4 5"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isClosed ? 5 : 4.5}
                    className={
                      point.avgPrice === null
                        ? "fill-outline"
                        : "fill-primary"
                    }
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={VIEWBOX_HEIGHT - 19}
                    textAnchor="middle"
                    className="fill-on-surface-variant text-[11px]"
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div
          className="pointer-events-none absolute inset-0"
          role="group"
          aria-label="每日資料點"
        >
          {metrics.plottedPoints.map(({ point, x, y }) => {
            const price = point.avgPrice;
            const pointLabel =
              price === null
                ? `${point.label}，${point.isClosed === true ? "休市" : "暫無資料"}，無均價`
                : `${point.label}，均價 ${formatPrice(price)} 元/公斤`;
            return (
              <button
                key={point.date}
                type="button"
                aria-label={pointLabel}
                className="pointer-events-auto absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface hover:bg-primary/10"
                style={{
                  left: `${(x / VIEWBOX_WIDTH) * 100}%`,
                  top: `${(y / VIEWBOX_HEIGHT) * 100}%`,
                }}
                onMouseEnter={() => setActiveDate(point.date)}
                onMouseLeave={() => setActiveDate(null)}
                onFocus={() => setActiveDate(point.date)}
                onBlur={() => setActiveDate(null)}
                onClick={() => setActiveDate(point.date)}
              />
            );
          })}
        </div>

        {activePoint && (
          <div
            role="status"
            aria-live="polite"
            className="absolute right-3 top-3 min-w-36 rounded-xl bg-zinc-950/95 px-3 py-2 text-xs text-white shadow-lg"
          >
            <p className="font-semibold">{activePoint.label}</p>
            <p className="mt-1 flex justify-between gap-3 text-white/75">
              <span>均價</span>
              <span className="font-semibold text-white">
                {activePoint.avgPrice === null
                  ? activePoint.isClosed === true
                    ? "休市"
                    : "暫無資料"
                  : `$${formatPrice(activePoint.avgPrice)}`}
              </span>
            </p>
            <p className="mt-1 flex justify-between gap-3 text-white/75">
              <span>交易量</span>
              <span className="font-semibold text-white">
                {activePoint.volume === null
                  ? "—"
                  : formatVolume(activePoint.volume)}
              </span>
            </p>
          </div>
        )}
      </div>

      {closedPoints.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-2xs text-on-surface-variant">
          {closedPoints.map((point) => (
            <span
              key={point.date}
              className="rounded-full border border-outline/30 px-2 py-0.5"
            >
              休市 {point.label}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}
