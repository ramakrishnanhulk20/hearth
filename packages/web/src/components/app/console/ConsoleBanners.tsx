"use client";

import { Banners } from "@/components/app/Banners";
import { Banner } from "@/components/ui";
import { CONFIGURED } from "@/lib/chain/addresses";
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
 * are on: a paused token, a wrong network or an observer on the confidential USDC changes what
 * deposit, withdraw and claim all mean.
 */
export function ConsoleBanners() {
  const config = useHearthConfig();
  const pool = usePoolState();
  const saver = useSaverState(config);
  const token = useTokenLayer(config);
  const { activity, error: activityError } = useActivity();

  if (!CONFIGURED) {
    return (
      <div className="mb-6">
        <Banner tone="bad" title="Hearth is not configured.">
          NEXT_PUBLIC_HEARTH_VAULT, NEXT_PUBLIC_HEARTH_POOL and NEXT_PUBLIC_HEARTH_SOURCE have to be
          set for these screens to read anything. They are in packages/web/.env.example.
        </Banner>
      </div>
    );
  }

  // Banners renders nothing at all when there is nothing wrong, and an empty column must not push
  // the page title down, so the gap only appears once a banner is inside it.
  return (
    <div className="[&:has(>div>*)]:mb-6">
      <Banners
        pool={pool}
        saver={saver}
        token={token}
        activity={activity}
        activityError={activityError}
        periodLength={config.periodLength}
      />
    </div>
  );
}
