import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

// Runs against the DEV Supabase project only (creates and deletes real users and files).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const configured = url !== "" && publishableKey !== "" && secretKey !== "";

const PASSWORD = `Test-${randomUUID()}`;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const createdUserIds: string[] = [];
const VIDEO_BYTES = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);

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
  const client = createClient(url, publishableKey, noSession);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
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

  afterAll(async () => {
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
