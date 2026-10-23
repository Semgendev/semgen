import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ProfileMenu } from "@/components/profile-menu";
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
    // visitors have no profile menu: the language button stays in sight
    return (
      <>
        <Link
          href="/account"
          className={cn(buttonVariants({ variant: "ghost" }), "max-lg:min-h-11")}
        >
          {t("account.signIn")}
        </Link>
        <LanguageSwitcher />
      </>
    );
  }

  const balance = await getCreditBalance(supabase);

  return (
    <ProfileMenu
      email={typeof data.claims.email === "string" ? data.claims.email : ""}
      balance={balance}
    />
  );
}

export function UserNav() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-24" />}>
      <UserNavContent />
    </Suspense>
  );
}
