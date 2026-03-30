import type { MutationCtx } from "./_generated/server";

/**
 * Record an audit log entry. Call from any mutation to track
 * security-relevant actions for later review.
 */
export async function audit(
  ctx: MutationCtx,
  userId: string,
  action: string,
  options?: {
    readonly detail?: string;
    readonly targetId?: string;
    readonly success?: boolean;
  },
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    userId,
    action,
    detail: options?.detail,
    targetId: options?.targetId,
    success: options?.success ?? true,
    timestamp: Date.now(),
  });
}
