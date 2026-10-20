"use client";

// The animation is plain CSS: the hero is visible as soon as the page arrives, without waiting for JavaScript.
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

export function HomeHero() {
  const t = useTranslations("hero");

  return (
    <section className="animate-in fade-in slide-in-from-bottom-3 flex flex-col gap-6 duration-500 motion-reduce:animate-none">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2 text-lg">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/projects/new" className={buttonVariants({ className: "w-full" })}>
            {t("cta")}
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
