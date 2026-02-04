import { getDb } from './pglite';

export interface QueuedOperation {
  id: number;
  operation: string; // 'convex_mutation'
  endpoint: string; // e.g., 'api.users.updateSettings'
  payload: string; // JSON stringified args
  retry_count: number;
  created_at: string;
  last_attempt_at?: string;
  error?: string;
}

export interface AuthCache {
  clerk_token: string;
  user_info: string; // JSON stringified user data
  membership_tier: string;
  cached_at: string;
  expires_at?: string;
}

// Initialize offline tables
export async function initializeOfflineTables(): Promise<void> {
  const db = await getDb();

  // Offline queue table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _offline_queue (
      id SERIAL PRIMARY KEY,
      operation VARCHAR(256) NOT NULL,
      endpoint VARCHAR(512) NOT NULL,
      payload TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_attempt_at TIMESTAMP,
      error TEXT
    )
  `);

  // Auth cache table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _auth_cache (
      id SERIAL PRIMARY KEY,
      clerk_token TEXT,
      user_info TEXT,
      membership_tier VARCHAR(256),
      cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    )
  `);
}

// Queue operations
export async function enqueueOperation(
  operation: string,
  endpoint: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO _offline_queue (operation, endpoint, payload, retry_count)
     VALUES ($1, $2, $3, 0)`,
    [operation, endpoint, JSON.stringify(payload)]
  );
}

export async function getQueuedOperations(): Promise<QueuedOperation[]> {
  const db = await getDb();
  const result = await db.query(`
    SELECT
      id,
      operation,
      endpoint,
      payload,
      retry_count,
      created_at::text,
      last_attempt_at::text,
      error
    FROM _offline_queue
    ORDER BY created_at ASC
  `);
  return result.rows as unknown as QueuedOperation[];
}

export async function updateOperationRetry(
  id: number,
  retryCount: number,
  error?: string
): Promise<void> {
  const db = await getDb();
  await db.query(
    `UPDATE _offline_queue
     SET retry_count = $1, last_attempt_at = CURRENT_TIMESTAMP, error = $2
     WHERE id = $3`,
    [retryCount, error || null, id]
  );
}

export async function removeOperation(id: number): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM _offline_queue WHERE id = $1`, [id]);
}

export async function getFailedOperations(): Promise<QueuedOperation[]> {
  const db = await getDb();
  const result = await db.query(`
    SELECT
      id,
      operation,
      endpoint,
      payload,
      retry_count,
      created_at::text,
      last_attempt_at::text,
      error
    FROM _offline_queue
    WHERE retry_count >= 5
    ORDER BY created_at ASC
  `);
  return result.rows as unknown as QueuedOperation[];
}

export async function clearFailedOperations(): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM _offline_queue WHERE retry_count >= 5`);
}

// Auth cache operations
export async function cacheAuth(
  token: string,
  userInfo: Record<string, unknown>,
  membershipTier: string,
  expiresAt?: Date
): Promise<void> {
  const db = await getDb();

  // Clear existing cache
  await db.exec(`DELETE FROM _auth_cache`);

  // Insert new cache
  await db.query(
    `INSERT INTO _auth_cache (clerk_token, user_info, membership_tier, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [token, JSON.stringify(userInfo), membershipTier, expiresAt?.toISOString() || null]
  );
}

export async function getCachedAuth(): Promise<AuthCache | null> {
  const db = await getDb();
  const result = await db.query(`
    SELECT
      clerk_token,
      user_info,
      membership_tier,
      cached_at::text,
      expires_at::text
    FROM _auth_cache
    ORDER BY cached_at DESC
    LIMIT 1
  `);

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as AuthCache;
}

export async function clearAuthCache(): Promise<void> {
  const db = await getDb();
  await db.exec(`DELETE FROM _auth_cache`);
}

export async function isAuthCacheValid(): Promise<boolean> {
  const cache = await getCachedAuth();
  if (!cache) return false;

  if (cache.expires_at) {
    const expiresAt = new Date(cache.expires_at);
    return expiresAt > new Date();
  }

  return true;
}
