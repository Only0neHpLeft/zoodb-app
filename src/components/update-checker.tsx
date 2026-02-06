'use client';

import { useLanguage } from '@/contexts/language-context';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Sparkles, AlertTriangle } from 'lucide-react';

const UPDATE_APPLIED_KEY = 'zoo-update-applied';

/**
 * UpdateToast — shows a toast after the app restarts following an update.
 * Reads the `zoo-update-applied` localStorage key set before restart.
 */
export function UpdateToast() {
  const { t } = useLanguage();

  useEffect(() => {
    const updateApplied = localStorage.getItem(UPDATE_APPLIED_KEY);
    if (updateApplied) {
      try {
        const { version, notes, isCritical } = JSON.parse(updateApplied);
        localStorage.removeItem(UPDATE_APPLIED_KEY);

        const notesLines = notes.split('\n').filter((line: string) => line.trim());
        const description = notesLines.slice(0, 3).join(' ').substring(0, 200);

        toast(
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-medium">
              {isCritical ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              {isCritical
                ? (t.updater?.criticalApplied || `Critical update v${version} applied`)
                : (t.updater?.updateApplied || `Updated to v${version}`)}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>,
          {
            duration: 8000,
          }
        );
      } catch (e) {
        console.error('Failed to parse update info:', e);
        localStorage.removeItem(UPDATE_APPLIED_KEY);
      }
    }
  }, [t]);

  return null;
}

/**
 * Stores update info in localStorage before restart so UpdateToast can show it.
 */
export function storeUpdateApplied(updateInfo: { version: string; notes: string; isCritical: boolean }) {
  localStorage.setItem(UPDATE_APPLIED_KEY, JSON.stringify(updateInfo));
}
