"use client";

import { useState, useEffect, useRef } from "react";
import { m } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { TrendChip } from "@/components/ui/TrendChip";
import { fetchLivestock } from "@/lib/api";
import type { LivestockPrices } from "@/lib/types";
import { formatTaipeiDate } from "@/lib/utils";

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
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

export function LivestockSection({
  initialLivestock = null,
  reloadKey = 0,
}: {
  initialLivestock?: LivestockPrices | null;
  reloadKey?: number;
}) {
  const [livestock, setLivestock] = useState<LivestockPrices | null>(
    initialLivestock,
  );
  const [loadingLivestock, setLoadingLivestock] = useState(!initialLivestock);
  const [livestockError, setLivestockError] = useState("");
  const skipInitialFetch = useRef(!!initialLivestock);
  const [localReloadKey, setLocalReloadKey] = useState(0);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    setLoadingLivestock(true);
    setLivestockError("");
    fetchLivestock()
      .then(setLivestock)
      .catch((e) => {
        setLivestock(null);
        setLivestockError(e.message || "暫停服務或查無資料");
      })
      .finally(() => setLoadingLivestock(false));
  }, [reloadKey, localReloadKey]);

  return (
    <section>
      <h2 className="text-headline-md font-bold text-on-surface mb-4">
        民生物資行情
      </h2>
      <m.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-30px" }}
      >
        {loadingLivestock ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : livestockError ? (
          <GlassCard className="p-container-padding text-center sm:col-span-2">
            <p className="text-body-sm text-on-surface-variant">
              無法取得民生物資資料 ({livestockError})
            </p>
            <button
              onClick={() => setLocalReloadKey((v) => v + 1)}
              className="mt-2 text-primary text-label-bold hover:underline"
            >
              重新載入
            </button>
          </GlassCard>
        ) : (
          <>
            <m.div variants={cardVariant}>
              <GlassCard className="p-container-padding h-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🥚</span>
                  <span className="text-body-sm text-on-surface-variant">
                    雞蛋大運輸價（元/台斤）
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-headline-lg font-bold text-on-surface tabular-nums">
                    {livestock?.eggPrice != null
                      ? `$${livestock.eggPrice.toFixed(1)}`
                      : "—"}
                  </span>
                  {livestock?.eggPriceChange != null && (
                    <TrendChip change={livestock.eggPriceChange} size="sm" />
                  )}
                </div>
                {livestock?.eggProducerPrice != null && (
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    產地價 ${livestock.eggProducerPrice.toFixed(1)} / 台斤
                  </p>
                )}
              </GlassCard>
            </m.div>

            <m.div variants={cardVariant}>
              <GlassCard className="p-container-padding h-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🐷</span>
                  <span className="text-body-sm text-on-surface-variant">
                    毛豬全國加權均價（元/公斤）
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-headline-lg font-bold text-on-surface tabular-nums">
                    {livestock?.porkAvgPrice != null
                      ? `$${livestock.porkAvgPrice.toFixed(1)}`
                      : "—"}
                  </span>
                  {livestock?.porkPriceChange != null && (
                    <TrendChip change={livestock.porkPriceChange} size="sm" />
                  )}
                </div>
                {livestock?.date && (
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    資料日期：{formatTaipeiDate(livestock.date)}
                  </p>
                )}
              </GlassCard>
            </m.div>
          </>
        )}
      </m.div>
    </section>
  );
}
