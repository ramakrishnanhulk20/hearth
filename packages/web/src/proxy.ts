import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Picks the language before anything renders.
 *
 * First visit: the browser's own Accept-Language header decides, and anything but English is
 * redirected to its prefix. After that the NEXT_LOCALE cookie wins, so a reader who switched to
 * Japanese on an English-speaking machine stays in Japanese.
 *
 * Next 16 renamed this file convention from middleware to proxy. The handler itself is unchanged.
 */
export default createMiddleware(routing);

export const config = {
  // The activity endpoint answers JSON, the social card is an image, and neither has a language.
  // Anything with a dot in the last segment is a file, so it is left alone too.
  matcher: ["/((?!api|_next|_vercel|opengraph-image|icon|favicon|.*\\..*).*)"],
};
