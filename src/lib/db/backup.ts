import { PGlite } from '@electric-sql/pglite';

let backupDb: PGlite | null = null;
let backupInitialized = false;

/**
 * Initialize the backup database with factory data
 * This is called ONCE on first app startup
 */
export async function initializeBackupDb(): Promise<void> {
  // Check if backup already exists
  if (backupInitialized) {
    console.log('Backup DB already initialized');
    return;
  }

  try {
    // Create backup database instance
    backupDb = await PGlite.create({
      dataDir: 'idb://zoodb-backup',
      relaxedDurability: true,
    });

    console.log('Backup DB initialized at idb://zoodb-backup');
    backupInitialized = true;

    // Import factory data (will be done by the same initialization flow)
  } catch (error) {
    console.error('Failed to initialize backup DB:', error);
    throw error;
  }
}

/**
 * Get the backup database instance
 */
export async function getBackupDb(): Promise<PGlite> {
  if (!backupDb) {
    await initializeBackupDb();
  }
  return backupDb!;
}

/**
 * Check if backup database exists and has data
 */
export async function hasBackup(): Promise<boolean> {
  try {
    const db = await getBackupDb();
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '_zoodb_init'
      ) as initialized
    `);
    return (result.rows[0] as { initialized: boolean })?.initialized ?? false;
  } catch {
    return false;
  }
}

/**
 * Get backup creation timestamp
 */
export async function getBackupTimestamp(): Promise<Date | null> {
  try {
    const db = await getBackupDb();
    const result = await db.query(`
      SELECT initialized_at
      FROM _zoodb_init
      ORDER BY initialized_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as { initialized_at: string };
    return new Date(row.initialized_at);
  } catch {
    return null;
  }
}

/**
 * Restore Main DB from Backup DB
 * WARNING: This will DELETE all user data in Main DB!
 */
export async function restoreFromBackup(
  onProgress?: (message: string) => void
): Promise<{ success: boolean; error?: Error }> {
  try {
    onProgress?.('Preparing restore...');

    // Import main DB functions and schemas
    const { getDb, createAllSchemas } = await import('./pglite');
    const mainDb = await getDb();
    const backup = await getBackupDb();

    // List of all possible tables
    const allTables = [
      'types', 'animals', 'caretakers', 'likes', 'treats',
      'druhy', 'zvirata', 'osetrovatele', 'ma_rad', 'osetruje',
      '_zoodb_init'
    ];

    // Drop all tables in main DB
    onProgress?.('Clearing current data...');
    await Promise.all(
      allTables.map(table => mainDb.exec(`DROP TABLE IF EXISTS ${table} CASCADE`))
    );

    // Recreate schemas using the original schema definitions
    onProgress?.('Creating schemas...');
    await createAllSchemas();

    // Get list of tables that exist in backup
    const tablesResult = await backup.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != '_zoodb_init'
    `);

    const tables = tablesResult.rows.map(
      (row: any) => row.table_name
    ) as string[];

    onProgress?.(`Restoring ${tables.length} tables...`);

    // Copy data from backup to main
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      onProgress?.(`Restoring ${table} (${i + 1}/${tables.length})...`);

      // Get all data from backup
      const dataResult = await backup.query(`SELECT * FROM ${table}`);

      if (dataResult.rows.length > 0) {
        const columnNames = Object.keys(dataResult.rows[0]).filter(col => col !== 'id');
        const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
        const insertSql = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${placeholders})`;

        for (const row of dataResult.rows) {
          const values = columnNames.map(col => (row as any)[col]);
          try {
            await mainDb.query(insertSql, values);
          } catch (error) {
            console.warn(`Failed to insert row into ${table}:`, error);
          }
        }
      }
    }

    // Recreate init marker
    await mainDb.exec(`
      CREATE TABLE IF NOT EXISTS _zoodb_init (
        id SERIAL PRIMARY KEY,
        initialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await mainDb.query('INSERT INTO _zoodb_init (initialized_at) VALUES (CURRENT_TIMESTAMP)');

    onProgress?.('Restore complete!');

    // Notify that database data has changed
    const { notifyDataChange } = await import('./events');
    notifyDataChange();

    return { success: true };
  } catch (error) {
    console.error('Restore failed:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Close backup database connection
 */
export async function closeBackupDb(): Promise<void> {
  if (backupDb) {
    try {
      await backupDb.close();
      console.log('Backup DB closed');
    } catch (error) {
      console.warn('Error closing backup DB:', error);
    } finally {
      backupDb = null;
      backupInitialized = false;
    }
  }
}

/**
 * Check if backup DB is initialized
 */
export function isBackupDbInitialized(): boolean {
  return backupInitialized;
}
