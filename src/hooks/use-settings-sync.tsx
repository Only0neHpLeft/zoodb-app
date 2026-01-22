// Settings Sync Provider - syncs user settings across sessions
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { syncProgressWithUser } from '@/lib/student-tracking'

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
  const { userId, isSignedIn } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)

  // Sync progress with database when authenticated
  useEffect(() => {
    if (isSignedIn && userId) {
      setIsSyncing(true)
      syncProgressWithUser(userId)
        .catch(console.error)
        .finally(() => setIsSyncing(false))
    }
  }, [isSignedIn, userId])

  return (
    <SettingsSyncContext.Provider value={{ isSyncing, userId: userId ?? null }}>
      {children}
    </SettingsSyncContext.Provider>
  )
}
