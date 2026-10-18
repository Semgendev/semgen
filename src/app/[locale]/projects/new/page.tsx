import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { UploadForm } from "@/features/projects/upload-form";

export default async function NewProjectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center p-6">
      <Card>
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
