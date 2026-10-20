import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { z } from "zod";

export const creditEntrySchema = z.object({
  id: z.number(),
  delta: z.number().int(),
  reason: z.enum(["signup_bonus", "purchase", "job", "refund"]),
  created_at: z.string(),
});

export type CreditEntry = z.infer<typeof creditEntrySchema>;

const balanceSchema = z.number().int();

export function parseCreditHistory(rows: unknown): CreditEntry[] {
  return z.array(creditEntrySchema).parse(rows);
}

// Cached per request (per Supabase client): the header and the page both show the balance.
export const getCreditBalance = cache(async (supabase: SupabaseClient): Promise<number> => {
  const { data, error } = await supabase.rpc("get_my_credit_balance");
  if (error) throw error;
  return balanceSchema.parse(data);
});

export async function getCreditHistory(supabase: SupabaseClient, limit = 50) {
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("id, delta, reason, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return parseCreditHistory(data);
}
