'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  checkForUpdates,
  downloadUpdateInBackground,
  downloadAndInstallUpdate,
  installPendingUpdate,
  hasPendingUpdate,
  UpdateInfo
} from '@/lib/updater';
import { isTauri } from '@/lib/tauri';

export interface UseUpdaterReturn {
  /** Information about the available update, null if no update */
  updateInfo: UpdateInfo | null;
  /** Whether the app is currently checking for updates */
  isChecking: boolean;
  /** Whether the app is currently downloading an update */
  isDownloading: boolean;
  /** Whether download is complete and ready to install */
  isReadyToInstall: boolean;
  /** Download progress percentage (0-100) */
  downloadProgress: number;
  /** Error message if update check or download failed */
  error: string | null;
  /** Function to install the update and restart */
  installUpdate: () => Promise<void>;
  /** Function to manually trigger an update check */
  checkUpdate: () => Promise<void>;
}

export function useUpdater(): UseUpdaterReturn {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasChecked = useRef(false);

  const checkUpdate = useCallback(async () => {
    if (!isTauri()) return;

    setIsChecking(true);
    setError(null);

    try {
      const info = await checkForUpdates();
      if (info) {
        setUpdateInfo(info);

        // Critical updates: download and install immediately
        if (info.isCritical) {
          console.log('[useUpdater] Critical update detected, auto-installing...');
          setIsDownloading(true);
          await downloadAndInstallUpdate((progress) => {
            setDownloadProgress(progress);
          });
          // App will restart, won't reach here
        } else {
          // Normal updates: download in background
          console.log('[useUpdater] Normal update, downloading in background...');
          setIsDownloading(true);
          const success = await downloadUpdateInBackground((progress) => {
            setDownloadProgress(progress);
          });
          setIsDownloading(false);

          if (success) {
            setIsReadyToInstall(true);
            console.log('[useUpdater] Update downloaded and ready to install');
          }
        }
      }
    } catch (err) {
      console.error('[useUpdater] Update check failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
      setIsDownloading(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Check for updates on app startup
    // Only check once per session
    if (hasChecked.current) return;
    if (!isTauri()) return;

    const timer = setTimeout(() => {
      hasChecked.current = true;
      console.log('[useUpdater] Starting update check...');
      checkUpdate().catch((err) => {
        console.error('[useUpdater] Update check failed:', err);
      });
    }, 2000); // Wait 2 seconds after app load

    return () => clearTimeout(timer);
  }, [checkUpdate]);

  // Install on app close - set up listener
  useEffect(() => {
    if (!isTauri()) return;

    let isClosing = false; // Prevent recursive close handling
    let unlisten: (() => void) | undefined;

    const setupCloseListener = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const currentWindow = getCurrentWindow();

        unlisten = await currentWindow.onCloseRequested(async (event) => {
          // Prevent recursive calls
          if (isClosing) {
            return;
          }

          // Check if there's a pending update
          const hasPending = hasPendingUpdate();
          console.log('[useUpdater] Close requested, hasPendingUpdate:', hasPending);

          if (!hasPending) {
            // No pending update, allow normal close immediately
            console.log('[useUpdater] No pending update, allowing close');
            return;
          }

          // Has pending update - try to install it
          console.log('[useUpdater] App closing, installing pending update...');
          event.preventDefault();
          isClosing = true;

          // Set a timeout to force close if install takes too long
          const forceCloseTimeout = setTimeout(async () => {
            console.log('[useUpdater] Install timeout, forcing close...');
            try {
              await currentWindow.destroy();
            } catch (e) {
              console.error('[useUpdater] Force close failed:', e);
            }
          }, 10000); // 10 second timeout

          try {
            await installPendingUpdate();
            // App will restart after install
            clearTimeout(forceCloseTimeout);
          } catch (err) {
            console.error('[useUpdater] Failed to install on close:', err);
            clearTimeout(forceCloseTimeout);
            // Force close - destroy bypasses the close handler
            try {
              await currentWindow.destroy();
            } catch (e) {
              console.error('[useUpdater] Destroy failed:', e);
            }
          }
        });
      } catch (err) {
        console.error('[useUpdater] Failed to setup close listener:', err);
      }
    };

    setupCloseListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const installUpdate = useCallback(async () => {
    if (!updateInfo) return;

    setError(null);

    try {
      if (isReadyToInstall) {
        // Update already downloaded, just install
        await installPendingUpdate();
      } else {
        // Download and install
        setIsDownloading(true);
        await downloadAndInstallUpdate((progress) => {
          setDownloadProgress(progress);
        });
      }
      // App will restart after install
    } catch (err) {
      console.error('[useUpdater] Update installation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to install update');
      setIsDownloading(false);
    }
  }, [updateInfo, isReadyToInstall]);

  return {
    updateInfo,
    isChecking,
    isDownloading,
    isReadyToInstall,
    downloadProgress,
    error,
    installUpdate,
    checkUpdate,
  };
}
