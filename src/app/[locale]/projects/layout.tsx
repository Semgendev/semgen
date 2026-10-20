import { setRequestLocale } from "next-intl/server";

import { AppHeader } from "@/components/app-header";

// The language is set here, before the header asks for its texts: otherwise Next.js has to wait for
// the request and cannot prepare the page in advance.
export default async function ProjectsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
