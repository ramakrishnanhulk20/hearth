"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CARD_PROSE, Card, CardPill, PageHeader } from "@/components/app/console";
import { useActions } from "@/hooks/useActions";
import { useDraws, useHearthConfig, useNow, usePoolState, useSaverState } from "@/hooks/useHearth";
import { useReveal } from "@/hooks/useReveal";
import { DrawCard } from "./DrawCard";

/**
 * The recent draws, newest first, one card each.
 *
 * The reads are the console's own hooks rather than props, because the layout mounts one wagmi
 * store and one query cache for every route under /app, so asking again here costs nothing and
 * hands back the same in-flight batch the shell's banners are already watching.
 */
export function DrawsScreen() {
  const t = useTranslations("draws");
  const config = useHearthConfig();
  const pool = usePoolState();
  const saver = useSaverState(config);
  const { draws, refetch: refetchDraws } = useDraws(pool.period);
  const reveal = useReveal();
  const now = useNow();

  // One wallet sends one transaction at a time, so one action instance drives every card and one
  // note reports it. Two instances would let the page claim two things are in flight.
  const money = useActions(config);
  // Which card started the run, so the note appears where the button was pressed rather than on
  // every card that happens to offer the same action.
  const [activeDraw, setActiveDraw] = useState<number | null>(null);

  const refresh = () => {
    pool.refetch();
    saver.refetch();
    refetchDraws();
  };

  // An empty list means three different things, and saying the wrong one states a fact about the
  // pool that is not true. The draw ids are derived from the period, so before that read lands
  // there is nothing to derive them from.
  const empty = !pool.known.period
    ? t("emptyReading")
    : pool.period <= 1
      ? t("emptyNone")
      : t("emptyFailed");

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        right={
          <CardPill>
            {pool.known.period ? t("count", { count: draws.length }) : t("reading")}
          </CardPill>
        }
      />

      {draws.length === 0 ? (
        <Card>
          <p className={CARD_PROSE}>{empty}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {draws.map((draw) => (
            <DrawCard
              key={draw.drawId}
              draw={draw}
              config={config}
              saver={saver}
              now={now}
              reveal={reveal}
              money={money}
              refresh={refresh}
              active={activeDraw === draw.drawId}
              onStart={setActiveDraw}
            />
          ))}
        </div>
      )}
    </>
  );
}
