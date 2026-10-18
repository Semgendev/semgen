import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

// Runs against the DEV Supabase project only. Never point these variables at production:
// the suite creates and deletes real users.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const configured = url !== "" && publishableKey !== "" && secretKey !== "";

const PASSWORD = `Test-${randomUUID()}`;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const createdUserIds: string[] = [];

function adminClient(): SupabaseClient {
  return createClient(url, secretKey, noSession);
}

async function createUser(admin: SupabaseClient, confirmed: boolean) {
  const email = `test-${randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: confirmed,
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

async function balanceOf(admin: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await admin.from("credit_ledger").select("delta").eq("user_id", userId);
  if (error) throw error;
  return data.reduce((sum, row: { delta: number }) => sum + row.delta, 0);
}

describe.skipIf(!configured)("credits and profiles (Supabase dev project)", () => {
  const admin = configured ? adminClient() : (null as unknown as SupabaseClient);

  afterAll(async () => {
    for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);
  });

  it("creates a profile and grants 10 credits to a verified user", async () => {
    const user = await createUser(admin, true);

    const { data: profile } = await admin.from("profiles").select("id").eq("id", user.id).single();
    expect(profile?.id).toBe(user.id);
    expect(await balanceOf(admin, user.id)).toBe(10);
  });

  it("grants the bonus only once the email is verified, and only once", async () => {
    const user = await createUser(admin, false);
    expect(await balanceOf(admin, user.id)).toBe(0);

    const confirm = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    expect(confirm.error).toBeNull();
    expect(await balanceOf(admin, user.id)).toBe(10);

    const touch = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { touched: true },
    });
    expect(touch.error).toBeNull();
    expect(await balanceOf(admin, user.id)).toBe(10);

    const newEmail = await admin.auth.admin.updateUserById(user.id, {
      email: `test-${randomUUID()}@example.com`,
      email_confirm: true,
    });
    expect(newEmail.error).toBeNull();
    expect(await balanceOf(admin, user.id)).toBe(10);
  });

  it("never grants a second bonus to the same mailbox after account deletion", async () => {
    const first = await createUser(admin, true);
    expect(await balanceOf(admin, first.id)).toBe(10);
    await admin.auth.admin.deleteUser(first.id);

    const { data, error } = await admin.auth.admin.createUser({
      email: first.email.toUpperCase(),
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    createdUserIds.push(data.user.id);
    expect(await balanceOf(admin, data.user.id)).toBe(0);
  });

  it("treats Gmail dots and +aliases as the same mailbox", async () => {
    const local = `semgentest${randomUUID().slice(0, 8)}`;
    const emails = [
      `${local}@gmail.com`,
      `${local.slice(0, 4)}.${local.slice(4)}+promo@googlemail.com`,
    ];
    const balances: number[] = [];

    for (const email of emails) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (error) throw error;
      createdUserIds.push(data.user.id);
      balances.push(await balanceOf(admin, data.user.id));
    }

    expect(balances).toEqual([10, 0]);
  });

  it("stores the signup locale on the profile", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `test-${randomUUID()}@example.com`,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { locale: "fr" },
    });
    if (error) throw error;
    createdUserIds.push(data.user.id);

    const { data: profile } = await admin
      .from("profiles")
      .select("locale")
      .eq("id", data.user.id)
      .single();
    expect(profile?.locale).toBe("fr");
  });

  it("gives anonymous visitors no access to credits", async () => {
    const user = await createUser(admin, true);
    const anon = createClient(url, publishableKey, noSession);

    const { data: rows } = await anon.from("credit_ledger").select("id");
    expect(rows ?? []).toEqual([]);

    expect((await anon.rpc("get_my_credit_balance")).error).not.toBeNull();
    const reserve = await anon.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: randomUUID(),
      p_amount: 1,
    });
    expect(reserve.error).not.toBeNull();
    expect(await balanceOf(admin, user.id)).toBe(10);
  });

  it("lets a user read only their own credits", async () => {
    const alice = await createUser(admin, true);
    const bob = await createUser(admin, true);
    const client = await signIn(alice.email);

    const { data: own } = await client.from("credit_ledger").select("user_id");
    expect(own?.length).toBeGreaterThan(0);
    expect(own?.every((row) => row.user_id === alice.id)).toBe(true);

    const { data: others } = await client.from("credit_ledger").select("id").eq("user_id", bob.id);
    expect(others).toEqual([]);

    const { data: balance } = await client.rpc("get_my_credit_balance");
    expect(balance).toBe(10);
  });

  it("prevents a user from giving themselves credits", async () => {
    const user = await createUser(admin, true);
    const client = await signIn(user.email);

    const insert = await client
      .from("credit_ledger")
      .insert({ user_id: user.id, delta: 1000, reason: "purchase", payment_id: randomUUID() });
    expect(insert.error).not.toBeNull();

    const refund = await client.rpc("refund_credits", { p_job_id: randomUUID() });
    expect(refund.error).not.toBeNull();

    const reserve = await client.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: randomUUID(),
      p_amount: 1,
    });
    expect(reserve.error).not.toBeNull();

    const update = await client
      .from("credit_ledger")
      .update({ delta: 1000 })
      .eq("user_id", user.id)
      .select();
    expect(update.error !== null || update.data.length === 0).toBe(true);

    const remove = await client.from("credit_ledger").delete().eq("user_id", user.id).select();
    expect(remove.error !== null || remove.data.length === 0).toBe(true);

    expect(await balanceOf(admin, user.id)).toBe(10);
  });

  it("keeps the ledger append-only even for the server", async () => {
    const user = await createUser(admin, true);

    const update = await admin.from("credit_ledger").update({ delta: 1000 }).eq("user_id", user.id);
    expect(update.error).not.toBeNull();

    const remove = await admin.from("credit_ledger").delete().eq("user_id", user.id);
    expect(remove.error).not.toBeNull();

    expect(await balanceOf(admin, user.id)).toBe(10);
  });

  it("does not let a user edit someone else's profile", async () => {
    const alice = await createUser(admin, true);
    const bob = await createUser(admin, true);
    const client = await signIn(alice.email);

    await client.from("profiles").update({ display_name: "Hacked" }).eq("id", bob.id);

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", bob.id)
      .single();
    expect(profile?.display_name).toBeNull();
  });

  it("lets a user edit allowed profile fields only", async () => {
    const user = await createUser(admin, true);
    const client = await signIn(user.email);

    const allowed = await client
      .from("profiles")
      .update({ display_name: "Ashanti" })
      .eq("id", user.id);
    expect(allowed.error).toBeNull();

    const forbidden = await client
      .from("profiles")
      .update({ created_at: "2000-01-01T00:00:00Z" })
      .eq("id", user.id);
    expect(forbidden.error).not.toBeNull();
  });

  it("reserves credits, refuses double debit and overspending", async () => {
    const user = await createUser(admin, true);
    const jobId = randomUUID();

    const first = await admin.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: jobId,
      p_amount: 4,
    });
    expect(first.error).toBeNull();
    expect(first.data).toBe(6);

    const again = await admin.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: jobId,
      p_amount: 4,
    });
    expect(again.error?.message).toContain("job_already_reserved");

    const tooMuch = await admin.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: randomUUID(),
      p_amount: 100,
    });
    expect(tooMuch.error?.message).toContain("insufficient_credits");

    const invalid = await admin.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: randomUUID(),
      p_amount: 0,
    });
    expect(invalid.error?.message).toContain("invalid_arguments");

    expect(await balanceOf(admin, user.id)).toBe(6);
  });

  it("allows spending the balance down to exactly zero", async () => {
    const user = await createUser(admin, true);

    const all = await admin.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: randomUUID(),
      p_amount: 10,
    });
    expect(all.error).toBeNull();
    expect(all.data).toBe(0);

    const more = await admin.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: randomUUID(),
      p_amount: 1,
    });
    expect(more.error?.message).toContain("insufficient_credits");
  });

  it("refuses to reuse a job id across users", async () => {
    const alice = await createUser(admin, true);
    const bob = await createUser(admin, true);
    const jobId = randomUUID();

    const first = await admin.rpc("reserve_credits", {
      p_user_id: alice.id,
      p_job_id: jobId,
      p_amount: 2,
    });
    expect(first.error).toBeNull();

    const second = await admin.rpc("reserve_credits", {
      p_user_id: bob.id,
      p_job_id: jobId,
      p_amount: 2,
    });
    expect(second.error?.message).toContain("job_already_reserved");
    expect(await balanceOf(admin, bob.id)).toBe(10);
  });

  it("refunds a failed job exactly once", async () => {
    const user = await createUser(admin, true);
    const jobId = randomUUID();
    const reserved = await admin.rpc("reserve_credits", {
      p_user_id: user.id,
      p_job_id: jobId,
      p_amount: 3,
    });
    expect(reserved.error).toBeNull();

    const first = await admin.rpc("refund_credits", { p_job_id: jobId });
    expect(first.data).toBe(3);

    const second = await admin.rpc("refund_credits", { p_job_id: jobId });
    expect(second.data).toBe(0);

    const unknown = await admin.rpc("refund_credits", { p_job_id: randomUUID() });
    expect(unknown.error?.message).toContain("job_not_reserved");

    expect(await balanceOf(admin, user.id)).toBe(10);
  });

  it("never lets two simultaneous reservations overspend", async () => {
    const user = await createUser(admin, true);

    const results = await Promise.all(
      [1, 2, 3].map(() =>
        admin.rpc("reserve_credits", { p_user_id: user.id, p_job_id: randomUUID(), p_amount: 6 }),
      ),
    );

    expect(results.filter((result) => result.error === null)).toHaveLength(1);
    expect(await balanceOf(admin, user.id)).toBe(4);
  });
});
