// Settings Sync Provider - syncs user settings & progress across sessions via Convex hooks
// This provider MUST live inside AuthProvider.
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useSession } from '@/lib/auth-client'
import { useStudentProgress, useSaveTaskProgress, useSettings, useUpdateSettings } from '@/lib/db/convex-db'
import { useLanguage } from '@/contexts/language-context'
import {
  getAllStudentAnalytics,
  saveStudentAnalytics,
  getCurrentStudent,
} from '@/lib/student-tracking'

interface SettingsSyncContextValue {
  isSyncing: boolean
  userId: string | null
}

const SettingsSyncContext = createContext<SettingsSyncContextValue>({
  isSyncing: false,
  userId: null,
})

export function useSettingsSync() {
  return useContext(SettingsSyncContext)
}

interface SettingsSyncProviderProps {
  children: ReactNode
}

export function SettingsSyncProvider({ children }: SettingsSyncProviderProps) {
  const { data: session, isPending } = useSession()
  const isSignedIn = !!session?.user
  const userId = session?.user?.id ?? null

  // ---- Language & Theme DB sync ----
  const dbSettings = useSettings(userId ?? undefined)
  const updateSettings = useUpdateSettings()
  const { language, setLanguage } = useLanguage()
  const hasSettingsSyncedRef = useRef<string | null>(null)

  // On sign-in: pull language/theme from DB → localStorage
  useEffect(() => {
    if (!userId || dbSettings === undefined || dbSettings === null) return
    if (hasSettingsSyncedRef.current === userId) return
    hasSettingsSyncedRef.current = userId

    // Sync language
    if (dbSettings.language) {
      const dbLang = dbSettings.language as 'en' | 'cz'
      if (dbLang !== language) {
        setLanguage(dbLang)
      }
    }

    // Sync theme
    if (dbSettings.theme) {
      const localTheme = localStorage.getItem('selected-theme')
      if (dbSettings.theme !== localTheme) {
        localStorage.setItem('selected-theme', dbSettings.theme)
        document.documentElement.setAttribute('data-theme', dbSettings.theme)
        window.dispatchEvent(new CustomEvent('theme-change'))
      }
    }
    // Intentionally omit language and setLanguage to prevent sync loops on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dbSettings])

  // When language changes (user action), persist to DB
  useEffect(() => {
    if (!userId || !hasSettingsSyncedRef.current) return
    // Only persist if we've already done the initial sync (avoid writing local value over DB on mount)
    updateSettings({ userId, language }).catch((err: unknown) => {
      console.error('Failed to save language to database:', err)
    })
    // Intentionally omit userId and updateSettings — both are stable refs; including them would re-trigger on every auth state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // ---- Task Progress sync ----
  const dbProgress = useStudentProgress(userId ?? undefined)
  const saveTaskProgress = useSaveTaskProgress()
  const hasProgressSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isSignedIn || !userId || dbProgress === undefined) return
    if (hasProgressSyncedRef.current === userId) return
    hasProgressSyncedRef.current = userId

    async function mergeProgress() {
      try {
        if (!dbProgress || dbProgress.length === 0) {
          // No DB data — migrate localStorage to DB if it exists
          const analytics = getAllStudentAnalytics()
          const student = analytics.students[userId!]
          if (student) {
            for (const task of Object.values(student.tasks)) {
              await saveTaskProgress({
                userId: userId!,
                categoryLetter: task.categoryLetter,
                taskIndex: task.taskIndex,
                taskId: `${task.categoryLetter}-${task.taskIndex}`,
                completed: task.completed,
                hintsUsed: task.hintsUsed.length,
                timeSpentSeconds: task.timeSpent,
              })
            }
          }
          return
        }

        // Merge DB progress into localStorage
        const analytics = getAllStudentAnalytics()
        if (!analytics.students[userId!]) {
          const currentStudent = getCurrentStudent()
          analytics.students[userId!] = {
            studentId: userId!,
            studentName: currentStudent?.name || 'Unknown',
            studentEmail: currentStudent?.email || '',
            tasks: {},
            totalTimeSpent: 0,
            tasksCompleted: 0,
            totalAttempts: 0,
            totalHintsUsed: 0,
            lastActive: Date.now(),
          }
        }

        for (const record of dbProgress) {
          const taskKey = `${record.categoryLetter}-${record.taskIndex}`
          const existingTask = analytics.students[userId!].tasks[taskKey]

          const dbLastAttempt = record.lastAttemptAt
          const localLastAttempt = existingTask?.lastAttemptAt || 0

          if (!existingTask || dbLastAttempt > localLastAttempt) {
            analytics.students[userId!].tasks[taskKey] = {
              taskId: taskKey,
              categoryLetter: record.categoryLetter,
              taskIndex: record.taskIndex,
              attempts: existingTask?.attempts || [],
              hintsUsed: existingTask?.hintsUsed || [],
              timeSpent: record.timeSpentSeconds,
              completed: record.completed,
              completedAt: record.completedAt ?? undefined,
              firstAttemptAt: record.firstAttemptAt,
              lastAttemptAt: dbLastAttempt,
            }
          }
        }

        // Recalculate totals
        let totalTime = 0
        let totalCompleted = 0
        let totalAttempts = 0
        let totalHints = 0

        for (const task of Object.values(analytics.students[userId!].tasks)) {
          totalTime += task.timeSpent
          if (task.completed) totalCompleted++
          totalAttempts += task.attempts.length
          totalHints += task.hintsUsed.length
        }

        analytics.students[userId!].totalTimeSpent = totalTime
        analytics.students[userId!].tasksCompleted = totalCompleted
        analytics.students[userId!].totalAttempts = totalAttempts
        analytics.students[userId!].totalHintsUsed = totalHints
        analytics.students[userId!].lastActive = Date.now()

        saveStudentAnalytics(analytics)
      } catch (error) {
        console.error('Failed to sync progress:', error)
      }
    }

    mergeProgress()
  }, [isSignedIn, userId, dbProgress, saveTaskProgress])

  // isSyncing: true while we haven't synced yet and user is signed in
  const isSyncing = !!(isSignedIn && userId && hasProgressSyncedRef.current !== userId)

  return (
    <SettingsSyncContext.Provider value={{ isSyncing, userId }}>
      {children}
    </SettingsSyncContext.Provider>
  )
}
