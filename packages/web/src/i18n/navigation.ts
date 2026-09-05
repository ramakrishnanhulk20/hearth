import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Link, useRouter, usePathname and redirect that know about the locale prefix.
 *
 * Every internal navigation in the app goes through these rather than next/navigation, so a reader
 * in Japanese who presses a link on the dashboard stays in Japanese. `usePathname` here returns the
 * path without the prefix, which is what the pool picker's slug swap and the console rail both
 * want: they reason about /app/usdc/deposit and never about /ja/app/usdc/deposit.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
