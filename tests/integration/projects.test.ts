import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import {
  deleteProjectWithFiles,
  getProject,
  getVideoUrls,
  listProjects,
  renameProject,
} from "@/features/projects/service";

// Runs against the DEV Supabase project only (creates and deletes real users and files).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const configured = url !== "" && publishableKey !== "" && secretKey !== "";

const PASSWORD = `Test-${randomUUID()}`;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const createdUserIds: string[] = [];
const VIDEO_BYTES = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);

afterAll(async () => {
  if (!configured) return;
  const admin = createClient(url, secretKey, noSession);
  for (const id of createdUserIds) {
    const { data } = await admin.storage.from("videos").list(id);
    for (const folder of data ?? []) {
      const { data: files } = await admin.storage.from("videos").list(`${id}/${folder.name}`);
      const paths = (files ?? []).map((file) => `${id}/${folder.name}/${file.name}`);
      if (paths.length > 0) await admin.storage.from("videos").remove(paths);
    }
    await admin.auth.admin.deleteUser(id);
  }
});

async function createUser(admin: SupabaseClient) {
  const email = `test-${randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  return { id: data.user.id, email };
}

async function signIn(email: string): Promise<SupabaseClient> {
  const admin = createClient(url, secretKey, noSession);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;

  const client = createClient(url, publishableKey, noSession);
  const { error } = await client.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (error) throw error;
  return client;
}

async function createProject(client: SupabaseClient, title = "My video"): Promise<string> {
  const { data, error } = await client.from("projects").insert({ title }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

describe.skipIf(!configured)("projects and video storage (Supabase dev project)", () => {
  const admin = configured
    ? createClient(url, secretKey, noSession)
    : (null as unknown as SupabaseClient);

  it("keeps the bucket private with server-side size and type limits", async () => {
    const { data, error } = await admin.storage.getBucket("videos");
    expect(error).toBeNull();
    expect(data?.public).toBe(false);
    expect(data?.file_size_limit).toBe(52428800);
    expect(data?.allowed_mime_types).toEqual(
      expect.arrayContaining(["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"]),
    );
  });

  it("lets a user create, rename and see only their own projects", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const aliceClient = await signIn(alice.email);
    const bobClient = await signIn(bob.email);

    const projectId = await createProject(aliceClient);

    const { data: mine } = await aliceClient.from("projects").select("id, status, user_id");
    expect(mine).toEqual([{ id: projectId, status: "uploading", user_id: alice.id }]);

    const { data: theirs } = await bobClient.from("projects").select("id");
    expect(theirs).toEqual([]);

    const rename = await aliceClient
      .from("projects")
      .update({ title: "Renamed" })
      .eq("id", projectId);
    expect(rename.error).toBeNull();

    const steal = await bobClient.from("projects").update({ title: "Hacked" }).eq("id", projectId);
    expect(steal.error).toBeNull();
    const { data: after } = await admin
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .single();
    expect(after?.title).toBe("Renamed");
  });

  it("prevents users from setting ownership, status or video metadata", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const client = await signIn(alice.email);

    const spoof = await client.from("projects").insert({ title: "x", user_id: bob.id });
    expect(spoof.error).not.toBeNull();

    const projectId = await createProject(client);
    const status = await client.from("projects").update({ status: "ready" }).eq("id", projectId);
    expect(status.error).not.toBeNull();
    const key = await client.from("projects").update({ source_video_key: "x" }).eq("id", projectId);
    expect(key.error).not.toBeNull();
  });

  it("rejects invalid titles", async () => {
    const user = await createUser(admin);
    const client = await signIn(user.email);

    expect((await client.from("projects").insert({ title: "" })).error).not.toBeNull();
    expect((await client.from("projects").insert({ title: "x".repeat(121) })).error).not.toBeNull();
  });

  it("gives anonymous visitors no access", async () => {
    const anon = createClient(url, publishableKey, noSession);
    const { data } = await anon.from("projects").select("id");
    expect(data ?? []).toEqual([]);
    expect((await anon.from("projects").insert({ title: "x" })).error).not.toBeNull();
  });

  it("accepts an upload into the user's own project folder and marks it uploaded", async () => {
    const user = await createUser(admin);
    const client = await signIn(user.email);
    const projectId = await createProject(client);
    const path = `${user.id}/${projectId}/source.mp4`;

    const upload = await client.storage
      .from("videos")
      .upload(path, VIDEO_BYTES, { contentType: "video/mp4" });
    expect(upload.error).toBeNull();

    const mark = await client.rpc("mark_project_uploaded", { p_project_id: projectId });
    expect(mark.error).toBeNull();

    const { data: project } = await client
      .from("projects")
      .select("status, source_video_key, source_size_bytes")
      .eq("id", projectId)
      .single();
    expect(project).toEqual({
      status: "uploaded",
      source_video_key: path,
      source_size_bytes: VIDEO_BYTES.length,
    });

    const download = await client.storage.from("videos").download(path);
    expect(download.error).toBeNull();
  });

  it("refuses uploads outside the user's own projects or with the wrong type", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const aliceClient = await signIn(alice.email);
    const bobClient = await signIn(bob.email);
    const aliceProject = await createProject(aliceClient);
    const bobProject = await createProject(bobClient);

    const intoOtherFolder = await bobClient.storage
      .from("videos")
      .upload(`${alice.id}/${aliceProject}/source.mp4`, VIDEO_BYTES, { contentType: "video/mp4" });
    expect(intoOtherFolder.error).not.toBeNull();

    const intoUnknownProject = await bobClient.storage
      .from("videos")
      .upload(`${bob.id}/${randomUUID()}/source.mp4`, VIDEO_BYTES, { contentType: "video/mp4" });
    expect(intoUnknownProject.error).not.toBeNull();

    const wrongType = await bobClient.storage
      .from("videos")
      .upload(`${bob.id}/${bobProject}/source.txt`, new Blob(["hello"]), {
        contentType: "text/plain",
      });
    expect(wrongType.error).not.toBeNull();
  });

  it("does not let users read or complete other people's uploads", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const aliceClient = await signIn(alice.email);
    const bobClient = await signIn(bob.email);
    const projectId = await createProject(aliceClient);
    const path = `${alice.id}/${projectId}/source.mp4`;
    await aliceClient.storage
      .from("videos")
      .upload(path, VIDEO_BYTES, { contentType: "video/mp4" });

    expect((await bobClient.storage.from("videos").download(path)).error).not.toBeNull();
    const steal = await bobClient.rpc("mark_project_uploaded", { p_project_id: projectId });
    expect(steal.error).not.toBeNull();
    expect((await bobClient.storage.from("videos").remove([path])).data ?? []).toEqual([]);

    const anon = createClient(url, publishableKey, noSession);
    expect(
      (await anon.rpc("mark_project_uploaded", { p_project_id: projectId })).error,
    ).not.toBeNull();
  });

  it("refuses to mark a project uploaded when no file exists", async () => {
    const user = await createUser(admin);
    const client = await signIn(user.email);
    const projectId = await createProject(client);

    const mark = await client.rpc("mark_project_uploaded", { p_project_id: projectId });
    expect(mark.error?.message).toContain("upload_not_found");
  });
});

describe.skipIf(!configured)("project service (Supabase dev project)", () => {
  const admin = configured
    ? createClient(url, secretKey, noSession)
    : (null as unknown as SupabaseClient);

  async function uploadedProject(client: SupabaseClient, userId: string) {
    const projectId = await createProject(client);
    const path = `${userId}/${projectId}/source.mp4`;
    const upload = await client.storage
      .from("videos")
      .upload(path, VIDEO_BYTES, { contentType: "video/mp4" });
    expect(upload.error).toBeNull();
    await client.rpc("mark_project_uploaded", { p_project_id: projectId });
    return { projectId, path };
  }

  it("lists projects with signed video links, newest first", async () => {
    const user = await createUser(admin);
    const client = await signIn(user.email);
    await uploadedProject(client, user.id);
    const second = await createProject(client, "No video yet");

    const projects = await listProjects(client);
    expect(projects).toHaveLength(2);
    expect(projects[0]?.id).toBe(second);

    const urls = await getVideoUrls(client, projects);
    expect(Object.keys(urls)).toHaveLength(1);
    expect(Object.values(urls)[0]).toContain("/object/sign/videos/");
  });

  it("renames only the caller's project and validates the title", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const aliceClient = await signIn(alice.email);
    const bobClient = await signIn(bob.email);
    const projectId = await createProject(aliceClient);

    expect(await renameProject(aliceClient, projectId, "New name")).toEqual({ ok: true });
    expect(await renameProject(aliceClient, projectId, "   ")).toEqual({
      ok: false,
      code: "invalid",
    });
    expect(await renameProject(bobClient, projectId, "Hacked")).toEqual({
      ok: false,
      code: "not_found",
    });
    expect((await getProject(aliceClient, projectId))?.title).toBe("New name");
    expect(await getProject(bobClient, projectId)).toBeNull();
  });

  it("deletes the project and its video file together", async () => {
    const user = await createUser(admin);
    const client = await signIn(user.email);
    const { projectId, path } = await uploadedProject(client, user.id);

    expect(await deleteProjectWithFiles(client, user.id, projectId)).toEqual({ ok: true });

    expect(await getProject(client, projectId)).toBeNull();
    const { data: files } = await admin.storage.from("videos").list(`${user.id}/${projectId}`);
    expect(files ?? []).toEqual([]);
    const download = await admin.storage.from("videos").download(path);
    expect(download.error).not.toBeNull();
  });

  it("refuses to delete someone else's project and keeps their video", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const aliceClient = await signIn(alice.email);
    const bobClient = await signIn(bob.email);
    const { projectId, path } = await uploadedProject(aliceClient, alice.id);

    const attempt = await deleteProjectWithFiles(bobClient, bob.id, projectId);
    expect(attempt).toEqual({ ok: false, code: "not_found" });

    expect(await getProject(aliceClient, projectId)).not.toBeNull();
    expect((await admin.storage.from("videos").download(path)).error).toBeNull();
  });
});

describe.skipIf(!configured)("transcription jobs (Supabase dev project)", () => {
  const admin = configured
    ? createClient(url, secretKey, noSession)
    : (null as unknown as SupabaseClient);

  async function readyProject(client: SupabaseClient, userId: string) {
    const projectId = await createProject(client);
    await client.storage
      .from("videos")
      .upload(`${userId}/${projectId}/source.mp4`, VIDEO_BYTES, { contentType: "video/mp4" });
    await client.rpc("mark_project_uploaded", { p_project_id: projectId });
    return projectId;
  }

  it("queues one transcription job and blocks duplicates", async () => {
    const user = await createUser(admin);
    const client = await signIn(user.email);
    const projectId = await readyProject(client, user.id);

    const first = await client.rpc("request_transcription", {
      p_project_id: projectId,
      p_language: "fr",
    });
    expect(first.error).toBeNull();

    const { data: jobs } = await client.from("jobs").select("id, status, type, options");
    expect(jobs).toEqual([
      { id: first.data, status: "queued", type: "transcribe", options: { language: "fr" } },
    ]);
    const { data: project } = await client
      .from("projects")
      .select("status")
      .eq("id", projectId)
      .single();
    expect(project?.status).toBe("processing");

    const again = await client.rpc("request_transcription", { p_project_id: projectId });
    expect(again.error).not.toBeNull();
  });

  it("refuses projects that are not uploaded, not owned, or invalid languages", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const aliceClient = await signIn(alice.email);
    const bobClient = await signIn(bob.email);

    const notUploaded = await createProject(aliceClient);
    const pending = await aliceClient.rpc("request_transcription", { p_project_id: notUploaded });
    expect(pending.error?.message).toContain("project_not_ready");

    const projectId = await readyProject(aliceClient, alice.id);
    const steal = await bobClient.rpc("request_transcription", { p_project_id: projectId });
    expect(steal.error?.message).toContain("project_not_found");

    const badLanguage = await aliceClient.rpc("request_transcription", {
      p_project_id: projectId,
      p_language: "FR; drop table",
    });
    expect(badLanguage.error?.message).toContain("invalid_language");

    const anon = createClient(url, publishableKey, noSession);
    expect(
      (await anon.rpc("request_transcription", { p_project_id: projectId })).error,
    ).not.toBeNull();
  });

  it("keeps jobs and transcripts read-only for users", async () => {
    const user = await createUser(admin);
    const client = await signIn(user.email);
    const projectId = await readyProject(client, user.id);
    const { data: jobId } = await client.rpc("request_transcription", { p_project_id: projectId });

    const update = await client
      .from("jobs")
      .update({ status: "succeeded" })
      .eq("id", jobId)
      .select();
    expect(update.error !== null || update.data.length === 0).toBe(true);
    const insertJob = await client
      .from("jobs")
      .insert({ project_id: projectId, user_id: user.id, type: "render" });
    expect(insertJob.error).not.toBeNull();
    const insertTranscript = await client.from("transcripts").insert({
      project_id: projectId,
      user_id: user.id,
      language: "fr",
      provider: "assemblyai",
      text: "x",
      words: [],
      segments: [],
    });
    expect(insertTranscript.error).not.toBeNull();
  });
});
