import type { MutationCtx } from "./_generated/server";

const ONE_HOUR_MS = 3_600_000;

/**
 * Check and increment a rate limit counter for a user + action.
 * Uses a fixed-window approach: requests are bucketed by hour.
 * Throws an error if the limit is exceeded.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  userId: string,
  action: string,
  limit: number,
): Promise<void> {
  const windowKey = Math.floor(Date.now() / ONE_HOUR_MS);

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_action_window", (q) =>
      q.eq("userId", userId).eq("action", action).eq("windowKey", windowKey),
    )
    .first();

  if (existing) {
    if (existing.count >= limit) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  } else {
    await ctx.db.insert("rateLimits", {
      userId,
      action,
      windowKey,
      count: 1,
    });
  }
}
