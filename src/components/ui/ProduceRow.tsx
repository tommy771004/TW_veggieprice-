import Link from "next/link";
import { memo } from "react";
import { TrendChip } from "./TrendChip";
import { CropIcon } from "./CropIcon";
import { formatPrice, formatVolume } from "@/lib/utils";
import type { ProducePrice } from "@/lib/types";
import { m } from "framer-motion";

interface ProduceRowProps {
  item: ProducePrice & { priceChange?: number; emoji?: string };
  showDetails?: boolean;
}

export const ProduceRow = memo(function ProduceRow({
  item,
  showDetails = false,
}: ProduceRowProps) {
  const change = item.priceChange ?? 0;

  return (
    <Link
      href={`/produce/${encodeURIComponent(item.cropName)}`}
      prefetch={false}
      className="block group"
    >
      <m.div
        whileHover={{
          scale: 0.99,
          filter: "brightness(0.96)",
        }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="glass-card-solid rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group/row"
      >
        <div className="flex items-center gap-4 relative z-10 w-full overflow-hidden">
          <div className="w-14 h-14 bg-surface-container border border-outline-variant/30 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_rgba(255,255,255,0.8)] shrink-0 group-hover/row:scale-[1.03] transition-transform duration-300">
            <CropIcon name={item.cropName} className="w-8 h-8" />
          </div>
          <div className="flex flex-col justify-center flex-grow min-w-0 pr-2 pb-0.5">
            <h3 className="text-headline-md font-bold text-on-surface leading-tight truncate tracking-tight">
              {item.cropName}
            </h3>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-1 mt-1 opacity-90 truncate">
              <span className="material-symbols-outlined text-[14px] opacity-70 shrink-0">
                storefront
              </span>
              <span className="truncate">{item.marketName}</span>
              <span className="mx-0.5 opacity-40 shrink-0">·</span>
              <span className="material-symbols-outlined text-[14px] opacity-70 shrink-0">
                scale
              </span>
              <span className="truncate">{formatVolume(item.transWeight)}</span>
            </p>
            {showDetails && (
              <p className="hidden md:block text-xs text-on-surface-variant mt-0.5 opacity-80 truncate font-mono">
                上 ${formatPrice(item.upperPrice)}・中 $
                {formatPrice(item.middlePrice)}・下 $
                {formatPrice(item.lowerPrice)}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col items-end justify-center shrink-0 relative z-10 ml-auto border-l border-outline-variant/30 pl-4 py-1">
            <div className="text-headline-lg font-black text-on-surface tracking-tighter mb-1.5 flex items-baseline gap-0.5">
              <span className="text-body-sm font-medium text-on-surface-variant opacity-70">
                $
              </span>
              {formatPrice(item.avgPrice)}
            </div>
            <div className="flex justify-end">
              <TrendChip change={change} size="sm" />
            </div>
          </div>
        </div>
      </m.div>
    </Link>
  );
});
