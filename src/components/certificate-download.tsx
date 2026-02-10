import { useState, useRef, useCallback } from 'react';
import { Award } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, FieldContent, FieldTitle, FieldDescription } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CertificateView, loadCertificateFonts } from '@/components/certificate-view';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/hooks/use-auth';
import { useCompletionStats } from '@/lib/db/convex-db';
import { getSqlRank, type CertificateData } from '@/lib/certificate';
import { categoriesArray } from '@/data/categories';
import { toast } from 'sonner';

export function CertificateDownload() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const stats = useCompletionStats(user?.id);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const totalTasksInApp = categoriesArray.reduce((sum, cat) => sum + cat.tasks.length, 0);
  const completedTasks = stats?.completedTasks ?? 0;
  const completionRate = totalTasksInApp > 0 ? (completedTasks / totalTasksInApp) * 100 : 0;

  const certData: CertificateData | null =
    user && profile && stats
      ? {
          userName: profile.full_name || user.name || t.settings.notSet,
          userEmail: user.email || '',
          userRole: profile.role || 'student',
          completedTasks: stats.completedTasks,
          totalTasks: totalTasksInApp,
          completionRate,
          totalAttempts: stats.totalAttempts,
          totalTimeSeconds: stats.totalTimeSeconds,
          totalHintsUsed: stats.totalHintsUsed,
          byCategory: stats.byCategory,
          language,
        }
      : null;

  const rank = getSqlRank(completionRate);

  const handleExport = useCallback(async () => {
    if (!certRef.current) return;
    setExporting(true);
    try {
      // Enable export mode to reveal rank (hides scratch canvas)
      setExportMode(true);

      // Wait for React to flush + fonts
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 100)));
      await loadCertificateFonts();
      await document.fonts.ready;

      const el = certRef.current.querySelector('[data-certificate]') as HTMLElement;
      if (!el) throw new Error('Certificate element not found');

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FDFBF5',
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
      if (!blob) throw new Error('Failed to create PNG');

      const filePath = await save({
        title: t.certificate.saveDialogTitle,
        defaultPath: `${t.certificate.fileName}.png`,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });

      if (!filePath) {
        toast.info(t.certificate.cancelled);
        return;
      }

      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));
      toast.success(t.certificate.saved);
    } catch (error) {
      console.error('Failed to export certificate:', error);
      toast.error(t.certificate.error);
    } finally {
      setExportMode(false);
      setExporting(false);
    }
  }, [t]);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">{t.certificate.title}</h3>
      <div className="grid gap-4">
        <Field className="border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Award className="size-5 text-primary" />
            </div>
            <FieldContent className="flex-1">
              <FieldTitle>{t.certificate.title}</FieldTitle>
              <FieldDescription className="flex items-center gap-2">
                <span>{t.certificate.description}</span>
                {stats && (
                  <Badge variant="secondary">
                    {completedTasks}/{totalTasksInApp} {t.certificate.tasksCompleted}
                  </Badge>
                )}
              </FieldDescription>
            </FieldContent>
            <Button onClick={() => setOpen(true)} disabled={!stats}>
              {t.certificate.viewCertificate}
            </Button>
          </div>
        </Field>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.certificate.title}</DialogTitle>
            <DialogDescription>{t.certificate.dialogDescription}</DialogDescription>
          </DialogHeader>

          <div ref={certRef} className="flex justify-center py-4 overflow-x-auto">
            {certData && (
              <CertificateView
                data={certData}
                rank={rank}
                exportMode={exportMode}
                onScratchReveal={() => {}}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.certificate.close}
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? t.certificate.exporting : t.certificate.downloadPng}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
