import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { UploadForm } from "@/features/projects/upload-form";

export default async function NewProjectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center p-4 sm:p-6">
      <Card className="rounded-xl">
        <CardHeader>
          <h1 className="text-2xl leading-none font-semibold">{t("newTitle")}</h1>
          <CardDescription>{t("newSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>
    </main>
  );
}
