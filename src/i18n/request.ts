import { getRequestConfig } from "next-intl/server";

import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

const messages = {
  en: enMessages,
  fr: frMessages,
} as const;

type Locale = keyof typeof messages;

function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && value in messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : "en";

  return { locale, messages: messages[locale] };
});
