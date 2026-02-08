import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import {
  getQueuedOperations,
  updateOperationRetry,
  removeOperation,
  getFailedOperations,
  clearFailedOperations,
  QueuedOperation,
} from '@/lib/db/offline-queue';
import { isDatabaseInitialized } from '@/lib/db/pglite';
import { useConvex } from 'convex/react';

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  failedOperations: QueuedOperation[];
  queuedCount: number;
  syncQueue: () => Promise<void>;
  clearFailedOps: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

const MAX_RETRIES = 5;

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useNetworkStatus();
  const convex = useConvex();
  const [isSyncing, setIsSyncing] = useState(false);
  const [failedOperations, setFailedOperations] = useState<QueuedOperation[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);

  // Use ref for transient syncing state to avoid dependency issues
  const isSyncingRef = useRef(false);

  const loadFailedOperations = useCallback(async () => {
    try {
      // Check if database is ready first
      const dbReady = await isDatabaseInitialized();
      if (!dbReady) return;

      const failed = await getFailedOperations();
      setFailedOperations(failed);
    } catch (error) {
      // Silently fail if database not ready yet
      if (error instanceof Error && !error.message.includes('timed out')) {
        console.error('Failed to load failed operations:', error);
      }
    }
  }, []);

  const loadQueuedCount = useCallback(async () => {
    try {
      // Check if database is ready first
      const dbReady = await isDatabaseInitialized();
      if (!dbReady) return;

      const ops = await getQueuedOperations();
      setQueuedCount(ops.filter(op => op.retry_count < MAX_RETRIES).length);
    } catch (error) {
      // Silently fail if database not ready yet
      if (error instanceof Error && !error.message.includes('timed out')) {
        console.error('Failed to load queued count:', error);
      }
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return;

    // Check if database is ready first
    const dbReady = await isDatabaseInitialized();
    if (!dbReady) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const operations = await getQueuedOperations();

      for (const op of operations) {
        // Skip if already exceeded max retries
        if (op.retry_count >= MAX_RETRIES) {
          continue;
        }

        try {
          // Parse payload
          const payload = JSON.parse(op.payload);

          // Execute based on operation type
          if (op.operation === 'convex_mutation') {
            // Dynamic import of the mutation endpoint
            const { api } = await import('../../convex/_generated/api');
            const endpointParts = op.endpoint.split('.');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic mutation resolution requires runtime API traversal
            let mutationFn: any = api;
            for (const part of endpointParts) {
              mutationFn = mutationFn[part];
            }

            await convex.mutation(mutationFn, payload);
          }

          // Success - remove from queue
          await removeOperation(op.id);
        } catch (error) {
          // Increment retry count
          const newRetryCount = op.retry_count + 1;
          await updateOperationRetry(
            op.id,
            newRetryCount,
            error instanceof Error ? error.message : 'Unknown error'
          );

          console.error(`Failed to sync operation ${op.id}, retry ${newRetryCount}:`, error);
        }
      }

      // Reload state
      await loadFailedOperations();
      await loadQueuedCount();
    } catch (error) {
      // Silently fail if database not ready yet
      if (error instanceof Error && !error.message.includes('timed out')) {
        console.error('Queue sync failed:', error);
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, convex, loadFailedOperations, loadQueuedCount]);

  const clearFailedOps = useCallback(async () => {
    await clearFailedOperations();
    await loadFailedOperations();
    await loadQueuedCount();
  }, [loadFailedOperations, loadQueuedCount]);

  // Load failed operations and queue count on mount (one-time only)
  useEffect(() => {
    loadFailedOperations();
    loadQueuedCount();
    // Intentionally empty deps — one-time mount effect; callbacks are stable refs via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-sync when coming back online (with delay to ensure DB is ready)
  useEffect(() => {
    if (isOnline && !isSyncingRef.current) {
      // Delay sync to give database time to initialize
      const timer = setTimeout(() => {
        syncQueue();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncQueue]);

  // Retry loading queue info when database becomes ready (stops when ready)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let stopped = false;

    const checkDbAndLoad = async () => {
      const dbReady = await isDatabaseInitialized();
      if (dbReady && !stopped) {
        await loadFailedOperations();
        await loadQueuedCount();
        stopped = true;
        if (interval) clearInterval(interval);
      }
    };

    // Initial check
    checkDbAndLoad();

    // Check periodically until database is ready
    interval = setInterval(() => {
      if (!stopped) checkDbAndLoad();
    }, 2000);

    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
    };
  }, [loadFailedOperations, loadQueuedCount]);

  const value: OfflineContextValue = {
    isOnline,
    isSyncing,
    failedOperations,
    queuedCount,
    syncQueue,
    clearFailedOps,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

const defaultOfflineContext: OfflineContextValue = {
  isOnline: true,
  isSyncing: false,
  failedOperations: [],
  queuedCount: 0,
  syncQueue: async () => {},
  clearFailedOps: async () => {},
};

export function useOffline() {
  const context = useContext(OfflineContext);
  return context ?? defaultOfflineContext;
}
