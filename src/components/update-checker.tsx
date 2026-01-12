'use client';

import { useUpdater } from '@/hooks/use-updater';
import { useLanguage } from '@/contexts/language-context';
import { isTauri } from '@/lib/tauri';
import { useEffect, useState, Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

const UPDATE_APPLIED_KEY = 'zoo-update-applied';

// Error boundary to catch any updater crashes
class UpdateErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Update checker error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function UpdateNotifier() {
  const {
    updateInfo,
    isDownloading,
    downloadProgress,
  } = useUpdater();

  const { t } = useLanguage();

  // Check if we just updated and clean up storage
  useEffect(() => {
    const updateApplied = localStorage.getItem(UPDATE_APPLIED_KEY);
    if (updateApplied) {
      localStorage.removeItem(UPDATE_APPLIED_KEY);
    }
  }, []);

  // Store update info before install so we can show it after restart
  useEffect(() => {
    if (updateInfo && isDownloading) {
      localStorage.setItem(UPDATE_APPLIED_KEY, JSON.stringify({
        version: updateInfo.version,
        notes: updateInfo.notes,
        isCritical: updateInfo.isCritical,
      }));
    }
  }, [updateInfo, isDownloading]);

  // Critical update: show full-screen overlay during install
  if (updateInfo?.isCritical && isDownloading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto animate-pulse" />
          <h2 className="text-xl font-bold">
            {t.updater?.criticalUpdate || 'Critical Security Update'}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {t.updater?.criticalUpdateDesc || 'A critical update is being installed. The app will restart automatically.'}
          </p>
          <div className="w-64 mx-auto">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-sm mt-2">{downloadProgress}%</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * UpdateChecker component that handles automatic updates in Tauri environment
 * - Normal updates: silent download, install on app close
 * - Critical updates: auto download + restart, show changes after restart
 */
export function UpdateChecker() {
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const inTauri = isTauri();
      setIsTauriEnv(inTauri);
      if (inTauri) {
        const timer = setTimeout(() => {
          setIsReady(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error('Failed to detect Tauri environment:', e);
    }
  }, []);

  if (!isTauriEnv || !isReady) {
    return null;
  }

  return (
    <UpdateErrorBoundary>
      <UpdateNotifier />
    </UpdateErrorBoundary>
  );
}
