import { getRequestConfig } from "next-intl/server";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

const messages = {
  en: enMessages,
  fr: frMessages,
} as const;

export default getRequestConfig(async ({ locale }) => {
  const localeStr = (locale && locale in messages ? locale : "en") as keyof typeof messages;

  return {
    locale: localeStr,
    messages: messages[localeStr],
  };
});
