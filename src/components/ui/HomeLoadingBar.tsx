"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";

interface HomeLoadingBarProps {
  active: boolean;
}

const PROGRESS_CEILING = 90;
const PROGRESS_TICK_MS = 120;
const FADE_OUT_MS = 240;

/**
 * A simulated top-loading indicator for the homepage's primary data requests.
 * Its percentage is intentionally not exposed to assistive technology because
 * it represents perceived progress rather than a measurable completion value.
 */
export function HomeLoadingBar({ active }: HomeLoadingBarProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(active);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const previousActiveRef = useRef(active);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (active) {
      // Reset on every new loading cycle, including category/market changes.
      progressRef.current = 0;
      setProgress(0);
      setVisible(true);
      previousActiveRef.current = true;

      const interval = window.setInterval(() => {
        // Ease toward the ceiling forever so a slow request never looks frozen.
        const next =
          PROGRESS_CEILING -
          (PROGRESS_CEILING - progressRef.current) * 0.08;
        progressRef.current = next;
        setProgress(next);
      }, PROGRESS_TICK_MS);

      return () => window.clearInterval(interval);
    }

    if (!previousActiveRef.current) {
      setVisible(false);
      return;
    }

    previousActiveRef.current = false;
    progressRef.current = 100;
    setProgress(100);
    setVisible(true);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, FADE_OUT_MS);

    return () => {
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [active]);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <m.div
          key="home-loading-bar"
          data-testid="homepage-loading-bar"
          aria-hidden="true"
          className="home-loading-bar pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : active ? 0.12 : 0.24,
            ease: "easeOut",
          }}
        >
          <m.div
            className="h-full bg-primary-fixed shadow-[0_0_10px_rgba(163,246,156,0.7)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.18,
              ease: "linear",
            }}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
}
