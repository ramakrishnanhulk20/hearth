import {
  Archivo,
  Inter,
  Inter_Tight,
  Noto_Kufi_Arabic,
  Noto_Sans_Arabic,
  Noto_Sans_Devanagari,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Noto_Sans_TC,
  Noto_Sans_Tamil,
} from "next/font/google";
import type { Script } from "@/i18n/routing";

/**
 * The house faces. Archivo carries every display line and Inter every sentence, and they hold the
 * Latin, Latin Extended and Vietnamese blocks between them, which is thirteen of the sixteen
 * languages plus every ticker, address and figure in the app.
 *
 * next/font wants literal arguments at the top level of a module, so all eleven faces are declared
 * here and the layout picks one script font per request. Each one gets its own variable name and
 * the layout composes the stacks, because two fonts writing the same variable would race on class
 * order rather than fall back.
 */
const archivo = Archivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--face-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--face-inter",
  display: "swap",
});

/** Archivo has no Cyrillic, so Russian display type moves to the closest grotesque that does. */
const interTight = Inter_Tight({
  subsets: ["latin", "cyrillic"],
  variable: "--face-inter-tight",
  display: "swap",
  preload: false,
});

const interCyrillic = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--face-inter-cyrillic",
  display: "swap",
  preload: false,
});

/**
 * Every script face below is `preload: false` on purpose. A visitor reading Tamil should download
 * Tamil and nothing else, and preloading eleven faces on an English page would cost more than the
 * page itself.
 */
const notoSC = Noto_Sans_SC({ subsets: ["latin"], variable: "--face-script", display: "swap", preload: false });
const notoTC = Noto_Sans_TC({ subsets: ["latin"], variable: "--face-script", display: "swap", preload: false });
const notoJP = Noto_Sans_JP({ subsets: ["latin"], variable: "--face-script", display: "swap", preload: false });
const notoKR = Noto_Sans_KR({ subsets: ["latin"], variable: "--face-script", display: "swap", preload: false });
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--face-script",
  display: "swap",
  preload: false,
});
const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  variable: "--face-script",
  display: "swap",
  preload: false,
});

/** Arabic is the one script that wants a different face for headings and for body. */
const kufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--face-script-display",
  display: "swap",
  preload: false,
});
const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--face-script",
  display: "swap",
  preload: false,
});

export type FontChoice = {
  /** The class list for <html>, which is what puts the variables on the page. */
  className: string;
  /** The composed stacks, house face first so tickers, figures and the wordmark never change. */
  display: string;
  sans: string;
  /**
   * Set only where the script needs it. CJK and Tamil carry tall marks that collide at the 0.9
   * leading the English display type is set in.
   */
  displayLeading: string | null;
};

const HOUSE_DISPLAY = "var(--face-archivo)";
const HOUSE_SANS = "var(--face-inter)";

export function fontsFor(script: Script): FontChoice {
  if (script === "latin") {
    return {
      className: `${archivo.variable} ${inter.variable}`,
      display: HOUSE_DISPLAY,
      sans: HOUSE_SANS,
      displayLeading: null,
    };
  }

  if (script === "cyrillic") {
    return {
      className: `${archivo.variable} ${inter.variable} ${interTight.variable} ${interCyrillic.variable}`,
      display: `${HOUSE_DISPLAY}, var(--face-inter-tight)`,
      sans: `${HOUSE_SANS}, var(--face-inter-cyrillic)`,
      displayLeading: null,
    };
  }

  if (script === "arabic") {
    return {
      className: `${archivo.variable} ${inter.variable} ${kufiArabic.variable} ${notoArabic.variable}`,
      display: `${HOUSE_DISPLAY}, var(--face-script-display)`,
      sans: `${HOUSE_SANS}, var(--face-script)`,
      displayLeading: "1.16",
    };
  }

  const face = {
    sc: notoSC,
    tc: notoTC,
    jp: notoJP,
    kr: notoKR,
    devanagari: notoDevanagari,
    tamil: notoTamil,
  }[script];

  const loose = script === "sc" || script === "tc" || script === "jp" || script === "tamil";

  return {
    className: `${archivo.variable} ${inter.variable} ${face.variable}`,
    display: `${HOUSE_DISPLAY}, var(--face-script)`,
    sans: `${HOUSE_SANS}, var(--face-script)`,
    displayLeading: loose ? "1.14" : null,
  };
}
