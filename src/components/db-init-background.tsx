import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  isDatabaseInitialized,
  initializeDatabase,
} from '@/lib/db/pglite';

const DbReadyContext = createContext(false);

export function useDbReady() {
  return useContext(DbReadyContext);
}

export function DbInitProvider({ children }: { children: ReactNode }) {
  const initStarted = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    async function initInBackground() {
      try {
        let initialized = false;

        try {
          initialized = await isDatabaseInitialized();
        } catch {
          initialized = false;
        }

        // Only initialize if not already done - creates BOTH language schemas
        if (!initialized) {
          console.log('Initializing local database in background...');
          await initializeDatabase();
          console.log('Local database initialized with both language schemas');
        }

        setReady(true);
      } catch (err) {
        console.error('Background database initialization failed:', err);
        // Still mark ready so the app doesn't hang — pages will show empty state
        setReady(true);
      }
    }

    initInBackground();
  }, []);

  return (
    <DbReadyContext.Provider value={ready}>
      {children}
    </DbReadyContext.Provider>
  );
}
