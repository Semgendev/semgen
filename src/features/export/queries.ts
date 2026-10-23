import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const renderJobSchema = z.object({
  id: z.uuid(),
  status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
  progress: z.number().int(),
  error_code: z.string().nullable(),
  // what was asked for: tells whether credits were taken (only 4K costs some)
  options: z.object({ quality: z.string().nullable().optional() }).nullable().optional(),
});

export type RenderJob = z.infer<typeof renderJobSchema>;

export const RENDER_JOB_COLUMNS = "id, status, progress, error_code, options";

// The newest export of a project (row-level security keeps it to its owner).
export async function getLatestRenderJob(
  supabase: SupabaseClient,
  projectId: string,
): Promise<RenderJob | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select(RENDER_JOB_COLUMNS)
    .eq("project_id", projectId)
    .eq("type", "render")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? renderJobSchema.parse(data) : null;
}
