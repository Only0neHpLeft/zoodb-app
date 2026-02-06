'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  checkForUpdates,
  downloadAndInstallUpdate,
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
  /** Download progress percentage (0-100) */
  downloadProgress: number;
  /** Error message if update check or download failed */
  error: string | null;
  /** Current phase of the update process */
  phase: 'idle' | 'checking' | 'downloading' | 'installing' | 'restarting';
  /** Function to download and install the update */
  installUpdate: () => Promise<void>;
  /** Function to manually trigger an update check */
  checkUpdate: () => Promise<void>;
}

export function useUpdater(): UseUpdaterReturn {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<UseUpdaterReturn['phase']>('idle');
  const hasChecked = useRef(false);

  const checkUpdate = useCallback(async () => {
    if (!isTauri()) return;

    setIsChecking(true);
    setPhase('checking');
    setError(null);

    try {
      const info = await checkForUpdates();
      if (info) {
        setUpdateInfo(info);
      }
      setPhase('idle');
    } catch (err) {
      console.error('[useUpdater] Update check failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
      setPhase('idle');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (hasChecked.current) return;
    if (!isTauri()) return;

    const timer = setTimeout(() => {
      hasChecked.current = true;
      console.log('[useUpdater] Starting update check...');
      checkUpdate().catch((err) => {
        console.error('[useUpdater] Update check failed:', err);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkUpdate]);

  const installUpdate = useCallback(async () => {
    if (!updateInfo) return;

    setError(null);
    setIsDownloading(true);
    setPhase('downloading');

    try {
      await downloadAndInstallUpdate((progress) => {
        setDownloadProgress(progress);
        if (progress === 100) {
          setPhase('installing');
        }
      });
      setPhase('restarting');
      // App will restart after install
    } catch (err) {
      console.error('[useUpdater] Update installation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to install update');
      setIsDownloading(false);
      setPhase('idle');
    }
  }, [updateInfo]);

  return {
    updateInfo,
    isChecking,
    isDownloading,
    downloadProgress,
    error,
    phase,
    installUpdate,
    checkUpdate,
  };
}
