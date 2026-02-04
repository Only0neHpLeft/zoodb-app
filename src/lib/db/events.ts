/**
 * Simple event emitter for database changes
 * Used to notify components when data changes
 */

type Listener = () => void;

class DatabaseEvents {
  private listeners: Set<Listener> = new Set();

  /**
   * Subscribe to database changes
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners that database changed
   */
  notify(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Database event listener error:', error);
      }
    });
  }

  /**
   * Clear all listeners (for cleanup/testing)
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const dbEvents = new DatabaseEvents();

/**
 * Notify that database data has changed
 * Call this after any INSERT, UPDATE, DELETE
 */
export function notifyDataChange(): void {
  dbEvents.notify();
}
