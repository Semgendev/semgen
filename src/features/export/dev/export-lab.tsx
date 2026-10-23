"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PLAN_IDS, type PlanId } from "@/features/billing/plans";

import { ExportPanel } from "../export-panel";
import type { RenderJob } from "../queries";

const SOURCES = {
  hd: { width: 1920, height: 1080 },
  uhd: { width: 3840, height: 2160 },
} as const;

const JOB_ID = "b28f9644-c3c7-4a31-8225-017f8b8bad2a";

// Builds a job in the state named by ?job= (none, queued, running, done, failed, insufficient)
// and ?q= (the quality it was asked with), so each dialog screen can be checked without a login.
function jobFromParams(state: string | null, quality: string | null): RenderJob | null {
  const options = { quality: quality ?? "1080p" };
  switch (state) {
    case "queued":
      return { id: JOB_ID, status: "queued", progress: 0, error_code: null, options };
    case "running":
      return { id: JOB_ID, status: "running", progress: 40, error_code: null, options };
    case "done":
      return { id: JOB_ID, status: "succeeded", progress: 100, error_code: null, options };
    case "failed":
      return { id: JOB_ID, status: "failed", progress: 0, error_code: "render_failed", options };
    case "insufficient":
      return {
        id: JOB_ID,
        status: "failed",
        progress: 0,
        error_code: "insufficient_credits",
        options,
      };
    default:
      return null;
  }
}

export function ExportLab() {
  const params = useSearchParams();
  const source = SOURCES[params.get("src") === "uhd" ? "uhd" : "hd"];
  const asked = params.get("plan");
  const plan: PlanId = PLAN_IDS.find((id) => id === asked) ?? "free";
  const [open, setOpen] = useState(true);
  const [job, setJob] = useState<RenderJob | null>(
    jobFromParams(params.get("job"), params.get("q")),
  );

  return (
    <div className="flex justify-end">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button size="sm" />}>Export</PopoverTrigger>
        <PopoverContent className="w-[min(16.25rem,calc(100vw-2rem))]">
          <ExportPanel
            projectId={JOB_ID}
            source={source}
            durationSeconds={90}
            plan={plan}
            job={job}
            onJob={setJob}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
