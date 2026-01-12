import { isTauri } from './tauri';

export interface UpdateInfo {
  version: string;
  notes: string;
  date: string;
  currentVersion: string;
  isCritical: boolean;
}

// Store the pending update for installation on app close
let pendingUpdate: Awaited<ReturnType<typeof import('@tauri-apps/plugin-updater').check>> | null = null;

/**
 * Check if update is critical based on release notes
 */
function isCriticalUpdate(notes: string): boolean {
  const criticalMarkers = ['[CRITICAL]', '[SECURITY]', '[URGENT]'];
  const upperNotes = notes.toUpperCase();
  return criticalMarkers.some(marker => upperNotes.includes(marker));
}

/**
 * Check for available updates from GitHub releases
 * Returns update info if a newer version is available, null otherwise
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  if (!isTauri()) {
    console.log('[Updater] Not in Tauri environment, skipping update check');
    return null;
  }

  try {
    console.log('[Updater] Starting update check...');

    // Get current app version for comparison
    try {
      const { getVersion } = await import('@tauri-apps/api/app');
      const currentVersion = await getVersion();
      console.log('[Updater] Current app version:', currentVersion);
    } catch (e) {
      console.log('[Updater] Could not get app version:', e);
    }

    // Dynamic import to avoid loading in non-Tauri environments
    const updaterModule = await import('@tauri-apps/plugin-updater');
    if (!updaterModule || !updaterModule.check) {
      console.warn('[Updater] Module not available');
      return null;
    }

    console.log('[Updater] Calling check()...');
    const update = await updaterModule.check();

    if (update?.available) {
      const notes = update.body || '';
      const isCritical = isCriticalUpdate(notes);

      console.log('[Updater] Update available:', {
        version: update.version,
        currentVersion: update.currentVersion,
        isCritical,
      });

      return {
        version: update.version,
        notes,
        date: update.date || new Date().toISOString(),
        currentVersion: update.currentVersion,
        isCritical,
      };
    }

    console.log('[Updater] No update available (current version is latest)');
    return null;
  } catch (error) {
    console.error('[Updater] Check failed:', error);
    return null;
  }
}

/**
 * Download update in background without installing
 * Returns true if download successful
 */
export async function downloadUpdateInBackground(
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    console.log('[Updater] Starting background download...');

    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (!update?.available) {
      console.log('[Updater] No update to download');
      return false;
    }

    // Store for later installation
    pendingUpdate = update;

    let downloaded = 0;
    let contentLength = 0;

    // Download only (don't install yet)
    await update.download((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0;
          console.log('[Updater] Download started, size:', contentLength);
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          if (contentLength > 0 && onProgress) {
            const progress = Math.round((downloaded / contentLength) * 100);
            onProgress(progress);
          }
          break;
        case 'Finished':
          console.log('[Updater] Download finished');
          if (onProgress) onProgress(100);
          break;
      }
    });

    console.log('[Updater] Background download complete');
    return true;
  } catch (error) {
    console.error('[Updater] Background download failed:', error);
    pendingUpdate = null;
    return false;
  }
}

/**
 * Install the pending update and restart
 */
export async function installPendingUpdate(): Promise<void> {
  if (!isTauri() || !pendingUpdate) {
    console.log('[Updater] No pending update to install');
    return;
  }

  try {
    console.log('[Updater] Installing pending update...');
    await pendingUpdate.install();

    // Restart the app
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch (error) {
    console.error('[Updater] Install failed:', error);
    throw error;
  }
}

/**
 * Check if there's a pending update ready to install
 */
export function hasPendingUpdate(): boolean {
  return pendingUpdate !== null;
}

/**
 * Download and install update immediately (for critical updates)
 */
export async function downloadAndInstallUpdate(
  onProgress?: (progress: number) => void
): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (update?.available) {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0 && onProgress) {
              const progress = Math.round((downloaded / contentLength) * 100);
              onProgress(progress);
            }
            break;
          case 'Finished':
            if (onProgress) {
              onProgress(100);
            }
            break;
        }
      });

      // Restart the app after installation
      try {
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      } catch (relaunchError) {
        // Relaunch fails in dev mode - show message instead
        console.warn('[Updater] Relaunch failed (expected in dev mode):', relaunchError);
        alert('Update installed! Please restart the app manually.');
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Updater] Failed to download and install update:', errorMessage, error);
    throw new Error(`Update failed: ${errorMessage}`);
  }
}

/**
 * Get the GitHub release URL for viewing details
 */
export function getGitHubReleaseUrl(version: string): string {
  return `https://github.com/Only0neHpLeft/zoo-databejs/releases/tag/v${version}`;
}
