"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { sendMagicLink, signInWithGoogle, type MagicLinkState } from "./actions";

const initialState: MagicLinkState = { status: "idle" };

type LoginFormProps = {
  locale: string;
  next?: string;
  linkError: boolean;
};

export function LoginForm({ locale, next, linkError }: LoginFormProps) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);
  const turnstile = useRef<TurnstileInstance>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  useEffect(() => {
    if (state.status === "error") turnstile.current?.reset();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t("sentTitle")}</h2>
        <p className="text-muted-foreground">{t("sentBody")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {linkError && state.status === "idle" ? (
        <p role="alert" className="text-destructive text-sm">
          {t("linkError")}
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            required
            maxLength={254}
          />
        </div>

        {siteKey ? <Turnstile ref={turnstile} siteKey={siteKey} /> : null}

        {state.status === "error" ? (
          <p role="alert" className="text-destructive text-sm">
            {t(`errors.${state.code}`)}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? t("sending") : t("submit")}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <span className="bg-border h-px flex-1" />
            {t("or")}
            <span className="bg-border h-px flex-1" />
          </div>
          <form action={signInWithGoogle}>
            <input type="hidden" name="locale" value={locale} />
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <Button type="submit" variant="outline" className="w-full">
              {t("google")}
            </Button>
          </form>
        </>
      ) : null}

      <p className="text-muted-foreground text-sm">{t("bonus")}</p>
    </div>
  );
}
