/**
 * Utility functions for validating online-only operations
 */

export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}

/**
 * Check if the user is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Validate that the user is online before performing an operation
 * Throws an OfflineError if offline
 */
export function requireOnline(operationName: string): void {
  if (!isOnline()) {
    throw new OfflineError(
      `You need an internet connection to ${operationName}. Please connect to the internet and try again.`
    );
  }
}

/**
 * Specific validators for common online-only operations
 */
export const onlineValidators = {
  upgradePlan: () => requireOnline('upgrade your plan'),
  login: () => requireOnline('sign in'),
  sync: () => requireOnline('sync your data'),
  convexOperation: (operation: string) => requireOnline(`perform ${operation}`),
};

/**
 * Helper to show user-friendly error messages for offline operations
 */
export function getOfflineErrorMessage(operation: string): string {
  return `You need an internet connection to ${operation}. Please connect to the internet and try again.`;
}
