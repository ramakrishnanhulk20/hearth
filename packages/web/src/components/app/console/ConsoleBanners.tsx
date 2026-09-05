"use client";

import { Banners } from "@/components/app/Banners";
import {
  useActivity,
  useHearthConfig,
  usePoolState,
  useSaverState,
  useTokenLayer,
} from "@/hooks/useHearth";

/**
 * The warnings, read once for the whole console and shown above every screen.
 *
 * They belong to the shell rather than to a page because none of them are about the screen you
 * are on: a paused token, a wrong network or an observer on the confidential token changes what
 * deposit, withdraw and claim all mean.
 */
export function ConsoleBanners() {
  const config = useHearthConfig();
  const pool = usePoolState();
  const saver = useSaverState(config);
  const token = useTokenLayer(config);
  const { activity, error: activityError } = useActivity();

  // A token with no pool has no vault to warn about, and the screen under this says so in full.
  if (config.restricted) return null;

  // Banners renders nothing at all when there is nothing wrong, and an empty column must not push
  // the page title down, so the gap only appears once a banner is inside it.
  return (
    <div className="[&:has(>div>*)]:mb-6">
      <Banners
        pool={pool}
        saver={saver}
        token={token}
        symbol={config.symbol}
        activity={activity}
        activityError={activityError}
        periodLength={config.periodLength}
      />
    </div>
  );
}
