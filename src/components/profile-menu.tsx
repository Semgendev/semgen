"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  History,
  Languages,
  LogOut,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { useLanguages } from "@/components/language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { useRouter } from "@/i18n/routing";

// The round profile button of the header (the first letter of the e-mail) and its menu: credits,
// account, language and sign-out. The menu stays narrow and opens in the free strip at the right of
// the page; "Language" swaps the menu's content for the list of languages (nothing opens aside).
export function ProfileMenu({ email, balance }: { email: string; balance: number }) {
  const t = useTranslations("account");
  const tc = useTranslations("credits");
  const tl = useTranslations("language");
  const router = useRouter();
  const { locale, languages, changeLanguage } = useLanguages();
  const signOutForm = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "language">("main");
  const initial = email.trim().charAt(0).toLocaleUpperCase() || "?";

  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setView("main");
        }}
      >
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={t("profileMenu")}
              className="focus-visible:ring-focus flex size-9 shrink-0 items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 max-lg:size-11"
            />
          }
        >
          {/* A frosted bubble in the colour of the chosen palette: a light ring around a brand-tinted
              disc with a soft highlight on top, the letter in the middle. */}
          <span
            aria-hidden="true"
            className="border-brand/50 text-brand-text flex size-full items-center justify-center rounded-full border bg-[linear-gradient(160deg,color-mix(in_oklab,var(--brand)_34%,var(--surface)),color-mix(in_oklab,var(--brand)_14%,var(--surface)))] text-sm font-semibold shadow-[inset_0_1px_0_color-mix(in_oklab,var(--surface)_80%,transparent),0_0_0_3px_color-mix(in_oklab,var(--brand)_14%,transparent),0_1px_2px_color-mix(in_oklab,var(--brand)_30%,transparent)] transition-transform hover:scale-105"
          >
            {initial}
          </span>
        </DropdownMenuTrigger>
        {/* The background follows the chosen palette: its brand colour tints the surface. */}
        <DropdownMenuContent
          align="end"
          // opens at the right edge of the screen, under the export button (as the export panel),
          // not under the round profile button
          anchor={() => document.getElementById("editor-slot-export")?.firstElementChild ?? null}
          className="w-65 bg-[color-mix(in_oklab,var(--brand)_7%,var(--surface))]"
        >
          {view === "main" ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="truncate text-sm">{email}</DropdownMenuLabel>
              </DropdownMenuGroup>
              {/* The credits come first, right under the e-mail (the spark accent is theirs, D15). */}
              <DropdownMenuItem
                onClick={() => router.push("/account/credits")}
                className="border-spark/40 bg-spark/10 text-spark-text mx-0.5 my-1 border font-medium max-lg:min-h-11"
              >
                <Coins aria-hidden="true" />
                {tc("balance", { count: balance })}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/account")} className="max-lg:min-h-11">
                <UserRound aria-hidden="true" />
                {t("menuAccount")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/account/credits")}
                className="max-lg:min-h-11"
              >
                <History aria-hidden="true" />
                {tc("title")}
              </DropdownMenuItem>
              <DropdownMenuItem
                closeOnClick={false}
                onClick={() => setView("language")}
                className="max-lg:min-h-11"
              >
                <Languages aria-hidden="true" />
                {tl("menu")}
                <ChevronRight className="ms-auto rtl:rotate-180" aria-hidden="true" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOutForm.current?.requestSubmit()}
                className="max-lg:min-h-11"
              >
                <LogOut aria-hidden="true" />
                {t("signOut")}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                closeOnClick={false}
                onClick={() => setView("main")}
                className="font-medium max-lg:min-h-11"
              >
                <ChevronLeft className="rtl:rotate-180" aria-hidden="true" />
                {tl("menu")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* two columns: the whole list fits in the blank above a 16:9 video */}
              <div className="grid max-h-[calc(var(--available-height)-4rem)] grid-cols-2 gap-x-0.5 overflow-y-auto">
                {languages.map(({ value, label }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => changeLanguage(value)}
                    className="max-lg:min-h-11"
                  >
                    <span className="truncate">{label}</span>
                    {value === locale ? (
                      <Check className="text-brand ms-auto size-3.5 shrink-0" aria-hidden="true" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={signOutForm} action={signOut} hidden>
        <input type="hidden" name="locale" value={locale} />
      </form>
    </>
  );
}
