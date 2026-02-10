export interface CertificateData {
  userName: string;
  userEmail: string;
  userRole: string;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  totalAttempts: number;
  totalTimeSeconds: number;
  totalHintsUsed: number;
  byCategory: Record<string, { total: number; completed: number }>;
  language: 'en' | 'cz';
}

export interface SqlRank {
  key: string;
  en: string;
  cz: string;
}

export const SQL_RANKS: SqlRank[] = [
  { key: 'sqlApprentice', en: 'SQL Apprentice', cz: 'SQL Učeň' },
  { key: 'queryBuilder', en: 'Query Builder', cz: 'Tvůrce Dotazů' },
  { key: 'dataExplorer', en: 'Data Explorer', cz: 'Průzkumník Dat' },
  { key: 'sqlMaster', en: 'SQL Master', cz: 'SQL Mistr' },
  { key: 'sqlLegend', en: 'SQL Legend', cz: 'SQL Legenda' },
];

export function getSqlRank(completionRate: number): SqlRank {
  if (completionRate >= 100) return SQL_RANKS[4];
  if (completionRate >= 75) return SQL_RANKS[3];
  if (completionRate >= 50) return SQL_RANKS[2];
  if (completionRate >= 25) return SQL_RANKS[1];
  return SQL_RANKS[0];
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatDate(language: 'en' | 'cz'): string {
  return new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'cs-CZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
