import { useState, useEffect } from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldTitle, FieldDescription } from '@/components/ui/field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/language-context';
import { hasBackup, getBackupTimestamp, restoreFromBackup } from '@/lib/db/backup';
import { toast } from 'sonner';

export function BackupRestore() {
  const { t } = useLanguage();
  const [backupExists, setBackupExists] = useState(false);
  const [backupDate, setBackupDate] = useState<Date | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');
  const [loading, setLoading] = useState(true);

  // Load backup info on mount with cleanup
  useEffect(() => {
    let cancelled = false;

    const loadBackupInfo = async () => {
      try {
        const exists = await hasBackup();
        if (cancelled) return;
        setBackupExists(exists);

        if (exists) {
          const timestamp = await getBackupTimestamp();
          if (cancelled) return;
          setBackupDate(timestamp);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load backup info:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBackupInfo();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRestoreClick = () => {
    setShowConfirmDialog(true);
    setConfirmText('');
  };

  const handleConfirmRestore = async () => {
    if (confirmText !== 'RESTORE') {
      toast.error(t.backup.confirmDialog.typeToConfirm);
      return;
    }

    setIsRestoring(true);
    setShowConfirmDialog(false);

    const result = await restoreFromBackup((message) => {
      setRestoreProgress(message);
    });

    setIsRestoring(false);

    if (result.success) {
      toast.success(t.backup.success);
      // Reload the page to reflect restored data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      toast.error(t.backup.error);
      console.error('Restore error:', result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">{t.backup.title}</h3>
        <Field className="border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Database className="size-5 animate-pulse" />
            </div>
            <FieldContent>
              <FieldTitle>Loading...</FieldTitle>
            </FieldContent>
          </div>
        </Field>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">{t.backup.dangerZone}</h3>
        </div>

        <Field className="border-2 border-destructive/50 rounded-lg p-4 bg-destructive/5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/20">
              <Database className="size-5 text-destructive" />
            </div>
            <FieldContent className="flex-1">
              <FieldTitle>{t.backup.title}</FieldTitle>
              <FieldDescription>
                <span className="block space-y-2">
                  <span className="block">{t.backup.description}</span>
                  {backupExists && backupDate && (
                    <span className="block text-xs">
                      <span className="font-medium">{t.backup.createdOn}:</span>{' '}
                      {backupDate.toLocaleDateString()} {backupDate.toLocaleTimeString()}
                    </span>
                  )}
                  {!backupExists && (
                    <span className="block text-xs text-muted-foreground">{t.backup.noBackup}</span>
                  )}
                </span>
              </FieldDescription>
            </FieldContent>
            <Button
              variant="destructive"
              onClick={handleRestoreClick}
              disabled={!backupExists || isRestoring}
            >
              {isRestoring ? t.backup.progress.restoring : t.backup.restoreButton}
            </Button>
          </div>

          {isRestoring && (
            <div className="mt-4 space-y-2">
              <Progress value={undefined} className="h-2" />
              <p className="text-sm text-muted-foreground">{restoreProgress}</p>
            </div>
          )}
        </Field>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              {t.backup.confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-muted-foreground text-sm">
                <p>{t.backup.confirmDialog.description}</p>
                <p className="font-semibold text-destructive">
                  {t.backup.confirmDialog.warningCount}
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t.backup.confirmDialog.typeToConfirm}
                  </label>
                  <div className="relative">
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={t.backup.confirmDialog.placeholder}
                      className={`font-mono transition-all ${
                        confirmText === 'RESTORE'
                          ? 'border-green-500 ring-2 ring-green-500/20'
                          : ''
                      }`}
                    />
                    {confirmText === 'RESTORE' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-in fade-in zoom-in duration-200">
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.backup.confirmDialog.cancelButton}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={confirmText !== 'RESTORE'}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t.backup.confirmDialog.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
