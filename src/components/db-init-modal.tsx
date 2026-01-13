import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Database, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import {
  isDatabaseInitialized,
  getDatabaseLanguage,
  initializeDatabase,
  type Language,
} from '@/lib/db/pglite';

interface DbInitModalProps {
  onComplete?: () => void;
}

export function DbInitModal({ onComplete }: DbInitModalProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'checking' | 'initializing' | 'complete' | 'idle'>('checking');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAndInitialize() {
      try {
        setStatus('checking');

        let initialized = false;
        let dbLanguage: Language | null = null;

        try {
          initialized = await isDatabaseInitialized();
          dbLanguage = await getDatabaseLanguage();
        } catch (checkError) {
          // Database check failed, need to initialize
          console.warn('Database check failed, will initialize:', checkError);
          initialized = false;
        }

        // If not initialized or language changed, initialize
        if (!initialized || dbLanguage !== language) {
          setOpen(true);
          setStatus('initializing');
          setProgress(0);
          setCurrentStage('Initializing database...');

          await initializeDatabase(language as Language, (stage, current, total) => {
            setCurrentStage(stage);
            setProgress(Math.round((current / total) * 100));
          });

          setStatus('complete');
          setProgress(100);

          // Close after a short delay
          setTimeout(() => {
            setOpen(false);
            setStatus('idle');
            onComplete?.();
          }, 1500);
        } else {
          setStatus('idle');
          onComplete?.();
        }
      } catch (err) {
        console.error('Database initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
        // Still close modal after error so app can continue
        setTimeout(() => {
          setOpen(false);
          setStatus('idle');
          onComplete?.();
        }, 3000);
      }
    }

    checkAndInitialize();
  }, [language, onComplete]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {status === 'complete' ? 'Database Ready' : 'Setting Up Database'}
          </DialogTitle>
          <DialogDescription>
            {status === 'complete'
              ? 'Your local database has been initialized successfully.'
              : 'Please wait while we set up your local database...'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {status === 'initializing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{currentStage}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% complete
              </p>
            </div>
          )}

          {status === 'complete' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm text-muted-foreground">
                All data has been imported.
              </p>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive text-center">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
