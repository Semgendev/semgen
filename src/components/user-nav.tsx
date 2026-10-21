import { Coins } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCreditBalance } from "@/features/credits/queries";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function UserNavContent() {
  // Read the session first: it is the request-time access that makes the rest dynamic.
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const t = await getTranslations();

  if (!data?.claims) {
    return (
      <Link href="/account" className={cn(buttonVariants({ variant: "ghost" }), "max-lg:min-h-11")}>
        {t("account.signIn")}
      </Link>
    );
  }

  const balance = await getCreditBalance(supabase);

  return (
    <>
      <Link
        href="/account/credits"
        aria-label={t("credits.balanceLabel", { count: balance })}
        className={cn(
          buttonVariants({ variant: "outline" }),
          // The "spark" accent is reserved for credits and AI actions (D15).
          "border-spark/40 text-spark-text hover:bg-spark/10 max-lg:min-h-11",
        )}
      >
        <Coins className="size-4" aria-hidden="true" />
        {t("credits.balance", { count: balance })}
      </Link>
      <Link href="/account" className={cn(buttonVariants({ variant: "ghost" }), "max-lg:min-h-11")}>
        {t("account.myAccount")}
      </Link>
    </>
  );
}

export function UserNav() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-24" />}>
      <UserNavContent />
    </Suspense>
  );
}
