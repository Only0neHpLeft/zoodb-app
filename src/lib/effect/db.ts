/**
 * Effect-based database layer for PGlite
 *
 * Provides composable, type-safe database operations with:
 * - Automatic error handling
 * - Query deduplication
 * - Retry logic
 * - Transaction support (future)
 */

import { Effect, pipe, Schedule, Duration } from "effect"
import { getDb, executeQuery, type QueryResult } from "../db/pglite"

// ============================================================================
// Error Types
// ============================================================================

export class DatabaseError {
  readonly _tag = "DatabaseError"
  constructor(
    readonly message: string,
    readonly cause?: unknown
  ) {}
}

export class ValidationError {
  readonly _tag = "ValidationError"
  constructor(readonly message: string) {}
}

export class NotFoundError {
  readonly _tag = "NotFoundError"
  constructor(readonly entity: string, readonly id?: string) {}
}

export type DbError = DatabaseError | ValidationError | NotFoundError

// ============================================================================
// Core Database Effects
// ============================================================================

/**
 * Execute a SQL query and return the result as an Effect
 */
export function query(sql: string): Effect.Effect<QueryResult, DatabaseError> {
  return Effect.tryPromise({
    try: () => executeQuery(sql),
    catch: (error) =>
      new DatabaseError(
        `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      ),
  })
}

/**
 * Execute a query and return the first row or NotFoundError
 */
export function queryOne<T>(
  sql: string,
  entity = "Record"
): Effect.Effect<T, DatabaseError | NotFoundError> {
  return pipe(
    query(sql),
    Effect.flatMap((result) =>
      result.rows.length > 0
        ? Effect.succeed(result.rows[0] as T)
        : Effect.fail(new NotFoundError(entity))
    )
  )
}

/**
 * Execute a query and return all rows
 */
export function queryAll<T>(sql: string): Effect.Effect<T[], DatabaseError> {
  return pipe(
    query(sql),
    Effect.map((result) => result.rows as T[])
  )
}

/**
 * Get a single value from a query (e.g., COUNT(*))
 */
export function queryScalar<T>(
  sql: string,
  column = "count"
): Effect.Effect<T, DatabaseError | NotFoundError> {
  return pipe(
    queryOne<Record<string, T>>(sql),
    Effect.map((row) => row[column])
  )
}

// ============================================================================
// Retry Policies
// ============================================================================

/**
 * Standard retry policy for transient errors
 */
export const standardRetry = pipe(
  Schedule.exponential(Duration.millis(100), 2),
  Schedule.either(Schedule.recurs(3)),
  Schedule.upTo(Duration.seconds(2))
)

/**
 * Execute a query with automatic retry on failure
 */
export function queryWithRetry(
  sql: string
): Effect.Effect<QueryResult, DatabaseError> {
  return pipe(
    query(sql),
    Effect.retry(standardRetry)
  )
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Execute multiple queries in parallel and collect results
 */
export function queryParallel<T>(
  queries: string[]
): Effect.Effect<T[][], DatabaseError> {
  return pipe(
    Effect.all(queries.map((sql) => queryAll<T>(sql)), { concurrency: 10 }),
    Effect.map((results) => results)
  )
}

/**
 * Get counts for multiple tables in parallel
 */
export function getTableCounts(
  tables: string[]
): Effect.Effect<Record<string, number>, DatabaseError> {
  return pipe(
    Effect.all(
      tables.map((table) =>
        pipe(
          queryScalar<number>(`SELECT COUNT(*) as count FROM ${table}`),
          Effect.map((count) => [table, count] as const),
          Effect.catchAll(() => Effect.succeed([table, 0] as const))
        )
      ),
      { concurrency: "unbounded" }
    ),
    Effect.map((pairs) => Object.fromEntries(pairs))
  )
}

// ============================================================================
// Query Builder Helpers
// ============================================================================

/**
 * Build a SELECT query with optional WHERE clause
 */
export function select(
  table: string,
  options?: {
    columns?: string[]
    where?: string
    orderBy?: string
    limit?: number
    offset?: number
  }
): string {
  const cols = options?.columns?.join(", ") ?? "*"
  let sql = `SELECT ${cols} FROM ${table}`

  if (options?.where) {
    sql += ` WHERE ${options.where}`
  }
  if (options?.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`
  }
  if (options?.limit !== undefined) {
    sql += ` LIMIT ${options.limit}`
  }
  if (options?.offset !== undefined) {
    sql += ` OFFSET ${options.offset}`
  }

  return sql
}

// ============================================================================
// Effect Runners
// ============================================================================

/**
 * Run an Effect and return a Promise with the result
 */
export function run<T, E extends DbError>(
  effect: Effect.Effect<T, E>
): Promise<{ data: T | null; error: E | null }> {
  return Effect.runPromise(
    pipe(
      effect,
      Effect.map((data) => ({ data, error: null as E | null })),
      Effect.catchAll((error) =>
        Effect.succeed({ data: null as T | null, error })
      )
    )
  )
}

/**
 * Run an Effect and throw on error (for simpler cases)
 */
export function runOrThrow<T>(effect: Effect.Effect<T, DbError>): Promise<T> {
  return Effect.runPromise(effect)
}
