import { PGlite } from '@electric-sql/pglite';
import { initializeOfflineTables } from './offline-queue';

let db: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;
let initializationLock: Promise<DbStatus> | null = null;
let dbReady = false;

// Schema definitions for English and Czech
const englishSchema = `
CREATE TABLE IF NOT EXISTS types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(256),
  weight_min NUMERIC(10, 0),
  weight_max NUMERIC(10, 0)
);

CREATE TABLE IF NOT EXISTS animals (
  id SERIAL PRIMARY KEY,
  type INTEGER,
  name VARCHAR(256),
  weight NUMERIC(10, 0),
  born DATE,
  consumption INTEGER
);

CREATE TABLE IF NOT EXISTS caretakers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(256),
  born DATE
);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  caretaker INTEGER,
  type INTEGER
);

CREATE TABLE IF NOT EXISTS treats (
  id SERIAL PRIMARY KEY,
  caretaker INTEGER,
  animal INTEGER
);
`;

const czechSchema = `
CREATE TABLE IF NOT EXISTS druhy (
  id SERIAL PRIMARY KEY,
  nazev VARCHAR(256),
  vaha_min NUMERIC(10, 0),
  vaha_max NUMERIC(10, 0)
);

CREATE TABLE IF NOT EXISTS zvirata (
  id SERIAL PRIMARY KEY,
  druh INTEGER,
  jmeno VARCHAR(256),
  vaha NUMERIC(10, 0),
  narozen DATE,
  spotreba INTEGER
);

CREATE TABLE IF NOT EXISTS osetrovatele (
  id SERIAL PRIMARY KEY,
  jmeno VARCHAR(256),
  narozen DATE
);

CREATE TABLE IF NOT EXISTS ma_rad (
  id SERIAL PRIMARY KEY,
  osetrovatel INTEGER,
  druh INTEGER
);

CREATE TABLE IF NOT EXISTS osetruje (
  id SERIAL PRIMARY KEY,
  osetrovatel INTEGER,
  zvire INTEGER
);
`;

export type Language = 'en' | 'cz';

// Whitelist of allowed table names for SQL injection protection
const ALLOWED_TABLES = new Set([
  // English schema
  'types', 'animals', 'caretakers', 'likes', 'treats',
  // Czech schema
  'druhy', 'zvirata', 'osetrovatele', 'ma_rad', 'osetruje',
  // System tables
  '_zoodb_init'
]);

function isValidTableName(table: string): boolean {
  return ALLOWED_TABLES.has(table.toLowerCase());
}

export interface DbStatus {
  initialized: boolean;
  language: Language | null;
  tableCount: number;
  rowCounts: Record<string, number>;
}

// CSV to table mapping
export const csvTableMapping = {
  en: {
    'Types.csv': 'types',
    'Animals.csv': 'animals',
    'Caretakers.csv': 'caretakers',
    'Likes.csv': 'likes',
    'Treats.csv': 'treats',
  },
  cz: {
    'Druhy.csv': 'druhy',
    'Zvirata.csv': 'zvirata',
    'Osetrovatele.csv': 'osetrovatele',
    'Ma_rad.csv': 'ma_rad',
    'Osetruje.csv': 'osetruje',
  },
} as const;

// Get the PGlite instance, initializing if needed
export async function getDb(): Promise<PGlite> {
  if (db) return db;

  if (!initPromise) {
    initPromise = initializeDb();
  }

  return initPromise;
}

// Initialize the database with IndexedDB persistence — no timeouts, no memory fallback
async function initializeDb(): Promise<PGlite> {
  db = await PGlite.create({
    dataDir: 'idb://zoodb-local',
    relaxedDurability: true,
  });
  dbReady = true;

  // Safety: abort queries exceeding 5 seconds
  try {
    await db.exec('SET statement_timeout = 5000');
  } catch {
    // statement_timeout may not be supported in all PGlite versions — non-fatal
  }

  // PGlite initialized with IndexedDB persistence

  // Initialize offline tables (non-blocking, deferred)
  initializeOfflineTables().catch(console.error);

  return db;
}

// Close stale connections on Vite HMR so the new module can reopen IDB
if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    if (db) {
      try { await db.close(); } catch { /* ignore */ }
      db = null;
      initPromise = null;
      initializationLock = null;
      dbReady = false;
    }
  });
}

// Check if database has been set up with schema (checks IDB marker table)
export async function isDatabaseInitialized(): Promise<boolean> {
  const database = await getDb();
  try {
    const result = await database.query(`
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

// Get current database language - deprecated, returns null since both languages are always initialized
export async function getDatabaseLanguage(): Promise<Language | null> {
  // Both languages are always initialized now, return null
  return null;
}

// Create schemas for BOTH languages (called once on initialization)
export async function createAllSchemas(): Promise<void> {
  const database = await getDb();

  // Create both English and Czech schemas
  await database.exec(englishSchema);
  await database.exec(czechSchema);
}

// Parse CSV content into rows
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    return values;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

// Import CSV data into a table
export async function importCSV(
  tableName: string,
  csvContent: string,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  // Validate table name against whitelist to prevent SQL injection
  if (!isValidTableName(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const database = await getDb();
  const { headers, rows } = parseCSV(csvContent);

  if (headers.length === 0 || rows.length === 0) {
    return 0;
  }

  const columns = headers.join(', ');
  const BATCH_SIZE = 50;
  let importedCount = 0;

  for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
    const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
    const allValues: (string | null)[] = [];
    const valueTuples: string[] = [];

    for (let r = 0; r < batch.length; r++) {
      const row = batch[r];
      const offset = r * headers.length;
      const tuple = headers.map((_, i) => `$${offset + i + 1}`).join(', ');
      valueTuples.push(`(${tuple})`);
      for (const val of row) {
        allValues.push(val === 'NULL' || val === '' || val === 'null' ? null : val);
      }
    }

    const batchSql = `INSERT INTO ${tableName} (${columns}) VALUES ${valueTuples.join(', ')}`;

    try {
      await database.query(batchSql, allValues);
      importedCount += batch.length;
    } catch {
      // Fallback: insert rows individually to skip bad rows
      for (let i = 0; i < batch.length; i++) {
        const values = batch[i].map((val) =>
          val === 'NULL' || val === '' || val === 'null' ? null : val
        );
        const placeholders = headers.map((_, j) => `$${j + 1}`).join(', ');
        try {
          await database.query(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`, values);
          importedCount++;
        } catch (rowErr) {
          console.warn(`Failed to import row ${batchStart + i + 1}:`, rowErr);
        }
      }
    }

    if (onProgress) {
      onProgress(Math.min(batchStart + BATCH_SIZE, rows.length), rows.length);
    }
  }

  return importedCount;
}

/**
 * Full database initialization - creates BOTH language schemas and imports ALL CSV data
 *
 * OPTIMIZATION (async-parallel rule):
 * BEFORE: Sequential fetch + import of 10 CSV files (~5-10s)
 * AFTER: Parallel fetch all CSVs, then parallel import (~1-2s)
 */
export async function initializeDatabase(
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<DbStatus> {
  if (initializationLock) {
    return initializationLock;
  }

  initializationLock = performDatabaseInitialization(onProgress);

  try {
    return await initializationLock;
  } catch (error) {
    initializationLock = null;
    throw error;
  }
}

async function performDatabaseInitialization(
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<DbStatus> {
  const database = await getDb();

  // All tables that could exist
  const allTables = [
    'types', 'animals', 'caretakers', 'likes', 'treats',
    'druhy', 'zvirata', 'osetrovatele', 'ma_rad', 'osetruje',
    '_zoodb_init'
  ];

  // Drop all existing tables in parallel
  onProgress?.('Dropping old tables...', 0, 1);
  await Promise.all(
    allTables.map(table => database.exec(`DROP TABLE IF EXISTS ${table} CASCADE`))
  );

  // Create schemas for BOTH languages
  onProgress?.('Creating schemas...', 0, 2);
  await createAllSchemas();
  onProgress?.('Creating schemas...', 2, 2);

  // Build list of all CSV imports needed
  const languages: Language[] = ['en', 'cz'];
  const importTasks: Array<{ lang: Language; csvFile: string; tableName: string }> = [];

  for (const lang of languages) {
    const mapping = csvTableMapping[lang];
    for (const [csvFile, tableName] of Object.entries(mapping)) {
      importTasks.push({ lang, csvFile, tableName });
    }
  }

  const totalFiles = importTasks.length;
  onProgress?.('Fetching CSV files...', 0, totalFiles);

  // PHASE 1: Parallel fetch ALL CSV files at once (async-parallel rule)
  const baseUrl = window.location.origin;
  const fetchResults = await Promise.all(
    importTasks.map(async ({ lang, csvFile, tableName }) => {
      try {
        const csvUrl = `${baseUrl}/data/${lang}/${csvFile}`;
        const response = await fetch(csvUrl);
        if (!response.ok) {
          console.warn(`Failed to fetch ${csvFile}: ${response.status}`);
          return { tableName, content: null, csvFile, lang };
        }
        const content = await response.text();
        return { tableName, content, csvFile, lang };
      } catch (error) {
        console.error(`Error fetching ${csvFile}:`, error);
        return { tableName, content: null, csvFile, lang };
      }
    })
  );

  onProgress?.('Importing data...', 0, totalFiles);

  // PHASE 2: Import CSV data (sequential for DB consistency, but data is pre-fetched)
  const rowCounts: Record<string, number> = {};
  let processedFiles = 0;

  for (const { tableName, content, csvFile, lang } of fetchResults) {
    if (content) {
      try {
        const count = await importCSV(tableName, content, (current, total) => {
          const progress = processedFiles + (current / total);
          onProgress?.(`Importing ${csvFile} (${lang})...`, progress, totalFiles);
        });
        rowCounts[tableName] = count;
      } catch (error) {
        console.error(`Error importing ${csvFile}:`, error);
        rowCounts[tableName] = 0;
      }
    } else {
      rowCounts[tableName] = 0;
    }
    processedFiles++;
    onProgress?.(`Importing ${csvFile} (${lang})...`, processedFiles, totalFiles);
  }

  // Create marker table to indicate initialization is complete
  await database.exec(`
    CREATE TABLE IF NOT EXISTS _zoodb_init (
      id SERIAL PRIMARY KEY,
      initialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await database.query('INSERT INTO _zoodb_init (initialized_at) VALUES (CURRENT_TIMESTAMP)');

  // Initialize backup database if it doesn't exist
  const { hasBackup, initializeBackupDb, getBackupDb } = await import('./backup');
  const backupExists = await hasBackup();

  if (!backupExists) {
    onProgress?.('Creating backup database...', 0, 1);
    await initializeBackupDb();
    const backupDb = await getBackupDb();

    // Create same schemas in backup
    await backupDb.exec(englishSchema);
    await backupDb.exec(czechSchema);

    // Import same data into backup
    for (const { tableName, content, csvFile } of fetchResults) {
      if (content) {
        try {
          const { headers, rows } = parseCSV(content);
          if (headers.length === 0 || rows.length === 0) continue;

          const columns = headers.join(', ');
          const BATCH_SIZE = 50;

          for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
            const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
            const allValues: (string | null)[] = [];
            const valueTuples: string[] = [];

            for (let r = 0; r < batch.length; r++) {
              const offset = r * headers.length;
              valueTuples.push(`(${headers.map((_, i) => `$${offset + i + 1}`).join(', ')})`);
              for (const val of batch[r]) {
                allValues.push(val === 'NULL' || val === '' || val === 'null' ? null : val);
              }
            }

            await backupDb.query(
              `INSERT INTO ${tableName} (${columns}) VALUES ${valueTuples.join(', ')}`,
              allValues
            );
          }
        } catch (error) {
          console.warn(`Failed to import ${csvFile} to backup:`, error);
        }
      }
    }

    // Create marker table in backup
    await backupDb.exec(`
      CREATE TABLE IF NOT EXISTS _zoodb_init (
        id SERIAL PRIMARY KEY,
        initialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await backupDb.query('INSERT INTO _zoodb_init (initialized_at) VALUES (CURRENT_TIMESTAMP)');

    onProgress?.('Backup created!', 1, 1);
  }

  onProgress?.('Complete!', totalFiles, totalFiles);

  return {
    initialized: true,
    language: null, // Both languages initialized
    tableCount: totalFiles,
    rowCounts,
  };
}

// Execute a query and return results
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

// Format date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Process row values - convert dates to YYYY-MM-DD format
function processRowValue(value: unknown): unknown {
  if (value instanceof Date) {
    return formatDate(value);
  }
  return value;
}

// Process all rows to format dates
function processRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const processedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      processedRow[key] = processRowValue(value);
    }
    return processedRow;
  });
}

const MAX_STUDENT_ROWS = 5000

export async function executeQuery(sql: string, options?: { isReference?: boolean }): Promise<QueryResult> {
  const database = await getDb();
  const startTime = performance.now();

  let result;
  if (options?.isReference) {
    // Reference queries run without the row cap
    result = await database.query(sql);
  } else {
    // Student queries get a row cap to prevent cross-join memory bombs
    result = await database.query(`SELECT * FROM (${sql}) AS _q LIMIT ${MAX_STUDENT_ROWS + 1}`);
    if (result.rows.length > MAX_STUDENT_ROWS) {
      throw new Error(
        `Query returned more than ${MAX_STUDENT_ROWS} rows. Check for missing WHERE clause or accidental cross joins.`
      );
    }
  }

  const executionTime = performance.now() - startTime;

  // Extract column names from first row if available
  const columns = result.rows.length > 0
    ? Object.keys(result.rows[0] as Record<string, unknown>)
    : result.fields?.map(f => f.name) ?? [];

  // Process rows to format dates as YYYY-MM-DD
  const processedRows = processRows(result.rows as Record<string, unknown>[]);

  return {
    columns,
    rows: processedRows,
    rowCount: result.rows.length,
    executionTime,
  };
}

/**
 * Get database status with row counts
 *
 * OPTIMIZATION (async-parallel rule):
 * BEFORE: Sequential COUNT queries for each table
 * AFTER: Parallel COUNT queries
 */
export async function getDbStatus(): Promise<DbStatus> {
  const initialized = await isDatabaseInitialized();

  if (!initialized) {
    return {
      initialized: false,
      language: null,
      tableCount: 0,
      rowCounts: {},
    };
  }

  const database = await getDb();
  // Get all tables from both languages
  const allTables = [
    ...Object.values(csvTableMapping.en),
    ...Object.values(csvTableMapping.cz),
  ];

  // Parallel fetch all table counts (async-parallel rule)
  const counts = await Promise.all(
    allTables.map(async (table) => {
      try {
        // Validate table name against whitelist to prevent SQL injection
        if (!isValidTableName(table)) {
          console.warn(`Invalid table name: ${table}`);
          return [table, 0] as const;
        }
        const result = await database.query(`SELECT COUNT(*) as count FROM ${table}`);
        return [table, Number((result.rows[0] as { count: string | number })?.count ?? 0)] as const;
      } catch {
        return [table, 0] as const;
      }
    })
  );

  return {
    initialized,
    language: null, // Both languages initialized
    tableCount: allTables.length,
    rowCounts: Object.fromEntries(counts),
  };
}

// Reset database (drop all tables)
export async function resetDatabase(): Promise<void> {
  const database = await getDb();

  // Drop all possible tables
  const allTables = [
    'types', 'animals', 'caretakers', 'likes', 'treats',
    'druhy', 'zvirata', 'osetrovatele', 'ma_rad', 'osetruje',
    '_zoodb_init'
  ];

  for (const table of allTables) {
    await database.exec(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  // Clear initialization lock so the DB can be re-initialized
  initializationLock = null;
}

/**
 * Close the database connection and clean up resources
 * Call this when the app is unmounting or before a hot reload
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    try {
      await db.close();
      // PGlite database closed successfully
    } catch (error) {
      console.warn('Error closing PGlite database:', error);
    } finally {
      // Reset state so a new connection can be established
      db = null;
      initPromise = null;
      initializationLock = null;
      dbReady = false;
    }
  }
}

/**
 * Check if the database connection is active
 */
export function isDatabaseConnected(): boolean {
  return db !== null && dbReady;
}
