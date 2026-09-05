"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Dead, DeadAction, DeadLink } from "@/components/Dead";

/**
 * A page that threw.
 *
 * Next hides the message in production, so the digest is the only thing that ties what a reader
 * saw to what the server logged. It is printed rather than swallowed, because "something went
 * wrong" with no handle on it is a bug report nobody can act on.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.crashed");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Dead
      code="500"
      title={t("title")}
      body={t("body")}
      detail={
        error.digest ? (
          <p className="mt-3 font-sans text-[12.5px] tabular-nums text-faint">
            {t("digest", { digest: error.digest })}
          </p>
        ) : undefined
      }
      action={
        <>
          <DeadLink href="/">{t("home")}</DeadLink>
          <DeadAction onClick={reset}>{t("retry")}</DeadAction>
        </>
      }
    />
  );
}
