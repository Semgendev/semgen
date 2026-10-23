// The subscription plans (docs/DECISIONS.md D21). Subscriptions are not sold yet: every account
// is on "free" until payments are wired (ROADMAP, step 3).

export const PLAN_IDS = ["free", "starter", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

// Export options reserved to some plans.
export type PlanFeature = "4k" | "60fps";

const FEATURES: Record<PlanId, readonly PlanFeature[]> = {
  free: [],
  starter: [],
  pro: [],
  business: ["4k", "60fps"],
};

export function planAllows(plan: PlanId, feature: PlanFeature): boolean {
  return FEATURES[plan].includes(feature);
}
