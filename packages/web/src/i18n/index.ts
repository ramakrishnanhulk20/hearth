import { DEFAULT_LOCALE, type Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { zh } from "./messages/zh";
import { hi } from "./messages/hi";
import { es } from "./messages/es";
import { ru } from "./messages/ru";
import { ja } from "./messages/ja";
import { de } from "./messages/de";
import { fr } from "./messages/fr";
import { ko } from "./messages/ko";
import { ta } from "./messages/ta";

const DICTS: Record<Locale, Messages> = { en, zh, hi, es, ru, ja, de, fr, ko, ta };

export function getMessages(locale: Locale): Messages {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

export type { Messages };
