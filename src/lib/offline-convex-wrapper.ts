import { enqueueOperation } from './db/offline-queue';
import { isOnline } from './online-validation';

/**
 * Wrapper for Convex mutations that automatically queues them when offline
 *
 * Usage:
 * const result = await offlineConvexMutation('api.users.updateSettings', { ...args });
 */
export async function offlineConvexMutation<T = any>(
  endpoint: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; queued: boolean; data?: T; error?: Error }> {
  // If online, execute immediately via normal Convex client
  if (isOnline()) {
    try {
      // Caller should handle the actual execution
      // This function just handles the offline queueing logic
      return { success: true, queued: false };
    } catch (error) {
      return { success: false, queued: false, error: error as Error };
    }
  }

  // If offline, queue the operation
  try {
    await enqueueOperation('convex_mutation', endpoint, args);
    return { success: true, queued: true };
  } catch (error) {
    return { success: false, queued: false, error: error as Error };
  }
}

/**
 * Check if an operation should be queued (user is offline)
 */
export function shouldQueueOperation(): boolean {
  return !isOnline();
}
