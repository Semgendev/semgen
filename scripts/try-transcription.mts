// Throwaway manual test: runs one real transcription on the DEV project.
// Usage: node --env-file=.env.local scripts/try-transcription.mts "<project name>" [language]
import { createClient } from "@supabase/supabase-js";
import { tasks } from "@trigger.dev/sdk";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

const projectName = process.argv[2];
const language = process.argv[3] ?? null;
if (!projectName) throw new Error("Usage: try-transcription.mts <project name> [language]");

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient(url, requireEnv("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: project, error: projectError } = await admin
  .from("projects")
  .select("id, user_id, title, status")
  .ilike("title", `%${projectName}%`)
  .limit(1)
  .single();
if (projectError) throw projectError;
console.log(`Project: ${project.title} (${project.status})`);

const { data: userData, error: userError } = await admin.auth.admin.getUserById(project.user_id);
if (userError || !userData.user.email) throw userError ?? new Error("User has no email");

const balance = async (): Promise<number> => {
  const { data, error } = await admin
    .from("credit_ledger")
    .select("delta")
    .eq("user_id", project.user_id);
  if (error) throw error;
  return data.reduce((sum, row) => sum + Number(row.delta), 0);
};
const before = await balance();
console.log(`Credits before: ${before}`);

// Sign in as the project owner without sending an email, so request_transcription runs as that user.
const { data: link, error: linkError } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData.user.email,
});
if (linkError) throw linkError;
const userClient = createClient(url, requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: otpError } = await userClient.auth.verifyOtp({
  type: "magiclink",
  token_hash: link.properties.hashed_token,
});
if (otpError) throw otpError;

const { data: jobId, error: rpcError } = await userClient.rpc("request_transcription", {
  p_project_id: project.id,
  p_language: language,
});
if (rpcError) throw rpcError;
console.log(`Job created: ${jobId}`);

await tasks.trigger("transcribe-project", { jobId });
console.log("Task sent to Trigger.dev, waiting...");

for (;;) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const { data: job, error } = await admin
    .from("jobs")
    .select("status, progress, error_code, credits_reserved")
    .eq("id", jobId)
    .single();
  if (error) throw error;
  console.log(`  ${job.status} ${job.progress}%`);
  if (job.status === "succeeded" || job.status === "failed") {
    console.log(`Final: ${job.status}${job.error_code ? ` (${job.error_code})` : ""}`);
    break;
  }
}

const { data: transcript } = await admin
  .from("transcripts")
  .select("language, language_confidence, provider, text, words")
  .eq("job_id", jobId)
  .maybeSingle();
if (transcript) {
  console.log(
    `Language: ${transcript.language} (confidence ${transcript.language_confidence}), ` +
      `provider: ${transcript.provider}, words: ${transcript.words.length}`,
  );
  console.log(`Text start: ${String(transcript.text).slice(0, 200)}`);
}
console.log(`Credits after: ${await balance()}`);
