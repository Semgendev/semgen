import { AlertTriangle, CheckCircle2, Info, Sparkles, XCircle } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AppearanceSettings } from "@/features/appearance/appearance-settings";

// Internal QA page (not translated on purpose): every building block in the current palette/mode.
// Hidden in production unless SEMGEN_DEV_PAGES=1 (used by the qa-tester agent and local checks).
const STATES = [
  { label: "Success", Icon: CheckCircle2, className: "text-success bg-success/12" },
  { label: "Warning", Icon: AlertTriangle, className: "text-warning bg-warning/12" },
  { label: "Danger", Icon: XCircle, className: "text-danger bg-danger/12" },
  { label: "Info", Icon: Info, className: "text-info bg-info/12" },
];

export default async function DevThemesPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.SEMGEN_DEV_PAGES !== "1") notFound();
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 p-6 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Design system — /dev/themes</h1>
        <ThemeToggle />
      </div>
      <AppearanceSettings />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Typography</h2>
        <p className="font-heading text-4xl font-extrabold">Plus Jakarta Sans 800 — Sous-titres</p>
        <p className="text-text">Text — Geist body, the default reading colour.</p>
        <p className="text-text-2">Text 2 — secondary information.</p>
        <p className="text-text-3">Text 3 — help and placeholders (never lighter).</p>
        <p className="text-text-2 font-mono text-sm">00:01:42.300 — Geist Mono timecode</p>
        <a href="#" className="text-brand-text underline underline-offset-4">
          Brand link
        </a>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary (one per screen)</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Button className="bg-spark text-on-spark hover:bg-spark/90">
            <Sparkles aria-hidden="true" />
            AI action · 12 credits
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">States (icon + text, never colour alone)</h2>
        <div className="flex flex-wrap gap-3">
          {STATES.map(({ label, Icon, className }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${className}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </span>
          ))}
          <span className="bg-spark text-on-spark inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold">
            10 credits
          </span>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Card on surface</CardTitle>
            <CardDescription>Panels stay neutral: the user’s video is the star.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Label htmlFor="dev-input">Field (border-strong ≥ 3:1)</Label>
            <Input id="dev-input" placeholder="Placeholder in text-3" />
          </CardContent>
        </Card>
        <div className="bg-surface-2 flex flex-col gap-3 rounded-xl p-6">
          <p className="font-medium">Surface 2 + loading (skeleton on surface)</p>
          <div className="bg-surface flex flex-col gap-3 rounded-lg p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </section>
    </main>
  );
}
