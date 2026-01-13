import { PGlite } from '@electric-sql/pglite';

let db: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;
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

// Initialize the database with IndexedDB persistence
async function initializeDb(): Promise<PGlite> {
  // Try IndexedDB first for persistence
  try {
    db = await PGlite.create({
      dataDir: 'idb://zoodb-local',
      relaxedDurability: true,
    });
    dbReady = true;
    console.log('PGlite initialized with IndexedDB persistence');
    return db;
  } catch (idbError) {
    console.warn('IndexedDB failed, trying in-memory mode:', idbError);
  }

  // Fallback to in-memory mode
  try {
    db = await PGlite.create('memory://');
    dbReady = true;
    console.log('PGlite initialized in memory mode (no persistence)');
    return db;
  } catch (error) {
    console.error('PGlite initialization failed:', error);
    throw error;
  }
}

// Check if database has been set up with schema
export async function isDatabaseInitialized(): Promise<boolean> {
  // For in-memory mode, check if we've already initialized in this session
  if (!dbReady) return false;

  const database = await getDb();
  try {
    // Check for marker table that indicates initialization is complete
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
  const database = await getDb();
  const { headers, rows } = parseCSV(csvContent);

  if (headers.length === 0 || rows.length === 0) {
    return 0;
  }

  // Prepare insert statement
  const columns = headers.join(', ');
  const placeholders = headers.map((_, i) => `$${i + 1}`).join(', ');
  const insertSql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

  let importedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Convert values, handling NULL and type conversion
    const values = row.map((val) => {
      if (val === 'NULL' || val === '' || val === 'null') {
        return null;
      }
      return val;
    });

    try {
      await database.query(insertSql, values);
      importedCount++;
    } catch (error) {
      console.warn(`Failed to import row ${i + 1}:`, error);
    }

    if (onProgress && i % 100 === 0) {
      onProgress(i + 1, rows.length);
    }
  }

  if (onProgress) {
    onProgress(rows.length, rows.length);
  }

  return importedCount;
}

// Full database initialization - creates BOTH language schemas and imports ALL CSV data
export async function initializeDatabase(
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<DbStatus> {
  const database = await getDb();

  // All tables that could exist
  const allTables = [
    'types', 'animals', 'caretakers', 'likes', 'treats',
    'druhy', 'zvirata', 'osetrovatele', 'ma_rad', 'osetruje',
    '_zoodb_init'
  ];

  // Drop all existing tables
  for (const table of allTables) {
    await database.exec(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  // Create schemas for BOTH languages
  onProgress?.('Creating schemas...', 0, 2);
  await createAllSchemas();
  onProgress?.('Creating schemas...', 2, 2);

  // Import CSVs for BOTH languages
  const languages: Language[] = ['en', 'cz'];
  const rowCounts: Record<string, number> = {};
  let totalFiles = 0;
  let processedFiles = 0;

  // Count total files
  for (const lang of languages) {
    totalFiles += Object.keys(csvTableMapping[lang]).length;
  }

  for (const lang of languages) {
    const mapping = csvTableMapping[lang];
    const csvFiles = Object.keys(mapping) as (keyof typeof mapping)[];

    for (const csvFile of csvFiles) {
      const tableName = mapping[csvFile];

      onProgress?.(`Importing ${csvFile} (${lang})...`, processedFiles, totalFiles);

      try {
        // Fetch CSV file - use absolute URL for Tauri compatibility
        const baseUrl = window.location.origin;
        const csvUrl = `${baseUrl}/data/${lang}/${csvFile}`;
        const response = await fetch(csvUrl);
        if (!response.ok) {
          console.warn(`Failed to fetch ${csvFile}: ${response.status}`);
          processedFiles++;
          continue;
        }

        const csvContent = await response.text();
        const count = await importCSV(tableName, csvContent, (current, total) => {
          const progress = processedFiles + (current / total);
          onProgress?.(`Importing ${csvFile} (${lang})...`, progress, totalFiles);
        });

        rowCounts[tableName] = count;
      } catch (error) {
        console.error(`Error importing ${csvFile}:`, error);
      }

      processedFiles++;
    }
  }

  // Create marker table to indicate initialization is complete
  await database.exec(`
    CREATE TABLE IF NOT EXISTS _zoodb_init (
      id SERIAL PRIMARY KEY,
      initialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await database.query('INSERT INTO _zoodb_init (initialized_at) VALUES (CURRENT_TIMESTAMP)');

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

export async function executeQuery(sql: string): Promise<QueryResult> {
  const database = await getDb();
  const startTime = performance.now();

  const result = await database.query(sql);

  const executionTime = performance.now() - startTime;

  // Extract column names from first row if available
  const columns = result.rows.length > 0
    ? Object.keys(result.rows[0] as Record<string, unknown>)
    : result.fields?.map(f => f.name) ?? [];

  return {
    columns,
    rows: result.rows as Record<string, unknown>[],
    rowCount: result.rows.length,
    executionTime,
  };
}

// Get database status
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
  const rowCounts: Record<string, number> = {};

  for (const table of allTables) {
    try {
      const result = await database.query(`SELECT COUNT(*) as count FROM ${table}`);
      rowCounts[table] = Number((result.rows[0] as { count: string | number })?.count ?? 0);
    } catch {
      rowCounts[table] = 0;
    }
  }

  return {
    initialized,
    language: null, // Both languages initialized
    tableCount: allTables.length,
    rowCounts,
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
}
