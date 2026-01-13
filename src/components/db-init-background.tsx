import { useEffect, useRef } from 'react';
import {
  isDatabaseInitialized,
  initializeDatabase,
} from '@/lib/db/pglite';

export function DbInitBackground() {
  const initStarted = useRef(false);

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
      } catch (err) {
        console.error('Background database initialization failed:', err);
      }
    }

    initInBackground();
  }, []); // No language dependency - only runs once

  return null;
}
