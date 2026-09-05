"use client";

import { useTranslations } from "next-intl";
import { Dead, DeadAction, DeadLink } from "@/components/Dead";

/**
 * A page that is not here.
 *
 * The two ways to arrive are a stale link to a docs page that moved and a token slug that is not
 * in this build's deployment file, so both of the exits below are real answers to those and not
 * decoration.
 */
export default function NotFound() {
  const t = useTranslations("errors.notFound");

  return (
    <Dead
      code="404"
      title={t("title")}
      body={t("body")}
      action={
        <>
          <DeadLink href="/">{t("home")}</DeadLink>
          <DeadAction href="/app">{t("pool")}</DeadAction>
          <DeadAction href="/docs">{t("docs")}</DeadAction>
        </>
      }
    />
  );
}
