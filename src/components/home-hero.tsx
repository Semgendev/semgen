"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

export function HomeHero() {
  const t = useTranslations("hero");

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6"
    >
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
    </motion.section>
  );
}
