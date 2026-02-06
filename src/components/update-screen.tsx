declare const __APP_VERSION__: string;

import { Download, RotateCw, CheckCircle2, Tag } from 'lucide-react';
import type { UpdateInfo } from '@/lib/updater';

const updateTexts = {
  en: {
    newVersionAvailable: 'New Version Available',
    currentVersion: 'Current version',
    downloadAndInstall: 'Download & Install',
    downloading: 'Downloading...',
    installing: 'Installing...',
    restarting: 'Restarting...',
    releaseNotes: 'Release Notes',
    updateFailed: 'Update failed. Please try again.',
    retry: 'Retry',
  },
  cz: {
    newVersionAvailable: 'Nová Verze k Dispozici',
    currentVersion: 'Aktuální verze',
    downloadAndInstall: 'Stáhnout a Nainstalovat',
    downloading: 'Stahování...',
    installing: 'Instalace...',
    restarting: 'Restartování...',
    releaseNotes: 'Poznámky k Vydání',
    updateFailed: 'Aktualizace selhala. Zkuste to znovu.',
    retry: 'Zkusit znovu',
  },
};

function getStoredLanguage(): 'en' | 'cz' {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('language');
    if (stored === 'cz') return 'cz';
  }
  return 'en';
}

interface UpdateScreenProps {
  updateInfo: UpdateInfo;
  phase: 'idle' | 'checking' | 'downloading' | 'installing' | 'restarting';
  downloadProgress: number;
  error: string | null;
  onInstall: () => void;
}

export function UpdateScreen({ updateInfo, phase, downloadProgress, error, onInstall }: UpdateScreenProps) {
  const lang = getStoredLanguage();
  const texts = updateTexts[lang];

  const isActive = phase === 'downloading' || phase === 'installing' || phase === 'restarting';

  const statusText = phase === 'downloading'
    ? texts.downloading
    : phase === 'installing'
      ? texts.installing
      : phase === 'restarting'
        ? texts.restarting
        : null;

  // Parse first few meaningful lines of release notes
  const noteLines = updateInfo.notes
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 6);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-background overflow-hidden">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 animate-pulse [animation-duration:4s]" />

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 animate-[fadeIn_1s_ease-out_0.3s_forwards]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--primary) / 0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Logo */}
      <div className="relative mb-6 opacity-0 animate-[fadeIn_0.6s_ease-out_0.1s_forwards]">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
          <Tag className="h-8 w-8 text-primary-foreground" />
        </div>
      </div>

      {/* Version badge */}
      <div className="mb-4 opacity-0 animate-[slideUp_0.5s_ease-out_0.2s_forwards]">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          v{updateInfo.version}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight opacity-0 animate-[slideUp_0.5s_ease-out_0.3s_forwards]">
        {texts.newVersionAvailable}
      </h1>

      {/* Current version */}
      <p className="text-muted-foreground text-sm mb-6 opacity-0 animate-[slideUp_0.5s_ease-out_0.4s_forwards]">
        {texts.currentVersion}: v{updateInfo.currentVersion}
      </p>

      {/* Release notes */}
      {noteLines.length > 0 && (
        <div className="w-full max-w-sm mb-8 opacity-0 animate-[slideUp_0.5s_ease-out_0.45s_forwards]">
          <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2 text-center">
            {texts.releaseNotes}
          </p>
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground max-h-32 overflow-y-auto">
            {noteLines.map((line, i) => (
              <p key={i} className="leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Action area */}
      <div className="opacity-0 animate-[slideUp_0.5s_ease-out_0.55s_forwards]">
        {/* Error state */}
        {error && (
          <div className="mb-4 text-center">
            <p className="text-sm text-destructive mb-2">{texts.updateFailed}</p>
            <button
              onClick={onInstall}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              {texts.retry}
            </button>
          </div>
        )}

        {/* Progress bar when active */}
        {isActive && !error && (
          <div className="w-56 text-center">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${phase === 'installing' || phase === 'restarting' ? 100 : downloadProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {phase === 'restarting' ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <RotateCw className="h-4 w-4 animate-spin" />
              )}
              <span>
                {statusText}
                {phase === 'downloading' && downloadProgress > 0 && ` ${downloadProgress}%`}
              </span>
            </div>
          </div>
        )}

        {/* Download & Install button when idle */}
        {!isActive && !error && (
          <button
            onClick={onInstall}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all"
          >
            <Download className="h-4 w-4" />
            {texts.downloadAndInstall}
          </button>
        )}
      </div>

      {/* Version footer */}
      <p className="absolute bottom-6 text-[10px] text-muted-foreground/30 opacity-0 animate-[fadeIn_0.5s_ease-out_0.8s_forwards]">
        v{__APP_VERSION__}
      </p>
    </div>
  );
}
