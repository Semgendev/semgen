import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale } from "./config";

// One language file is loaded per request (not all of them in every bundle).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)) as { default: object };

  return { locale, messages: messages.default };
});
