/**
 * Effect-based async utilities for parallel fetching and error handling
 * Applies Vercel React Best Practices: async-parallel, async-dependencies
 */

import { Effect, Schedule, pipe, Duration } from "effect"

// ============================================================================
// Types
// ============================================================================

export interface FetchResult<T> {
  data: T | null
  error: Error | null
}

// ============================================================================
// Core Effect Utilities
// ============================================================================

/**
 * Convert a Promise-returning function to an Effect
 * Captures errors as typed failures
 */
export function fromPromise<T>(
  promise: () => Promise<T>
): Effect.Effect<T, Error> {
  return Effect.tryPromise({
    try: promise,
    catch: (error) => error instanceof Error ? error : new Error(String(error)),
  })
}

/**
 * Run an Effect and return a FetchResult
 * Useful for gradual migration from Promise-based code
 */
export async function runEffect<T>(
  effect: Effect.Effect<T, Error>
): Promise<FetchResult<T>> {
  return Effect.runPromise(
    pipe(
      effect,
      Effect.map((data): FetchResult<T> => ({ data, error: null })),
      Effect.catchAll((error) =>
        Effect.succeed({ data: null, error } as FetchResult<T>)
      )
    )
  )
}

// ============================================================================
// Parallel Fetching (async-parallel rule)
// ============================================================================

/**
 * Fetch multiple independent resources in parallel
 * Replaces sequential await chains with Promise.all-like behavior
 *
 * @example
 * const [profile, membership] = await parallel([
 *   () => getProfile(userId),
 *   () => getMembership(userId)
 * ])
 */
export async function parallel<T extends readonly unknown[]>(
  fetchers: { [K in keyof T]: () => Promise<T[K]> }
): Promise<{ [K in keyof T]: FetchResult<T[K]> }> {
  const effects = fetchers.map((fn) =>
    pipe(
      fromPromise(fn),
      Effect.map((data): FetchResult<unknown> => ({ data, error: null })),
      Effect.catchAll((error) =>
        Effect.succeed({ data: null, error } as FetchResult<unknown>)
      )
    )
  )

  const results = await Effect.runPromise(Effect.all(effects))
  return results as { [K in keyof T]: FetchResult<T[K]> }
}

/**
 * Fetch all items in an array in parallel with a concurrency limit
 *
 * @example
 * const counts = await parallelMap(
 *   tableNames,
 *   (table) => db.query(`SELECT COUNT(*) FROM ${table}`),
 *   { concurrency: 5 }
 * )
 */
export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: { concurrency?: number } = {}
): Promise<FetchResult<R>[]> {
  const { concurrency = 10 } = options

  const effects = items.map((item, index) =>
    pipe(
      fromPromise(() => fn(item, index)),
      Effect.map((data): FetchResult<R> => ({ data, error: null })),
      Effect.catchAll((error) =>
        Effect.succeed({ data: null, error } as FetchResult<R>)
      )
    )
  )

  return Effect.runPromise(
    Effect.all(effects, { concurrency })
  )
}

// ============================================================================
// Retry with Backoff
// ============================================================================

/**
 * Retry a fetch operation with exponential backoff
 * Replaces manual setTimeout retry loops
 *
 * @example
 * const profile = await withRetry(
 *   () => getProfile(userId),
 *   { maxRetries: 5, initialDelay: 500 }
 * )
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    factor?: number
  } = {}
): Promise<FetchResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    factor = 2,
  } = options

  const schedule = pipe(
    Schedule.exponential(Duration.millis(initialDelay), factor),
    Schedule.either(Schedule.recurs(maxRetries)),
    Schedule.upTo(Duration.millis(maxDelay))
  )

  return runEffect(
    pipe(
      fromPromise(fn),
      Effect.retry(schedule)
    )
  )
}

/**
 * Retry until a condition is met (e.g., waiting for a resource to exist)
 *
 * @example
 * const profile = await retryUntil(
 *   () => getProfile(userId),
 *   (result) => result.data !== null,
 *   { maxRetries: 5, delay: 500 }
 * )
 */
export async function retryUntil<T>(
  fn: () => Promise<FetchResult<T>>,
  condition: (result: FetchResult<T>) => boolean,
  options: { maxRetries?: number; delay?: number } = {}
): Promise<FetchResult<T>> {
  const { maxRetries = 5, delay = 500 } = options

  let result = await fn()
  let attempts = 0

  while (!condition(result) && attempts < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, delay))
    result = await fn()
    attempts++
  }

  return result
}

// ============================================================================
// Race & Timeout
// ============================================================================

/**
 * Race multiple fetchers, return first successful result
 *
 * @example
 * const data = await race([
 *   () => fetchFromCache(key),
 *   () => fetchFromNetwork(key)
 * ])
 */
export async function race<T>(
  fetchers: Array<() => Promise<T>>
): Promise<FetchResult<T>> {
  const effects = fetchers.map((fn) => fromPromise(fn))

  return runEffect(Effect.race(Effect.all(effects)))
}

/**
 * Add a timeout to any fetch operation
 *
 * @example
 * const data = await withTimeout(
 *   () => slowFetch(),
 *   { timeout: 5000 }
 * )
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  options: { timeout: number }
): Promise<FetchResult<T>> {
  return runEffect(
    pipe(
      fromPromise(fn),
      Effect.timeout(Duration.millis(options.timeout)),
      Effect.map((option) =>
        option._tag === "Some" ? option.value : null
      ),
      Effect.mapError(() => new Error("Timeout exceeded"))
    )
  ) as Promise<FetchResult<T>>
}

// ============================================================================
// Deduplication
// ============================================================================

type PendingRequest<T> = Promise<FetchResult<T>>
const pendingRequests = new Map<string, PendingRequest<unknown>>()

/**
 * Deduplicate concurrent requests with the same key
 * Prevents duplicate API calls when multiple components request the same data
 *
 * @example
 * // These will only make one API call
 * const [a, b] = await Promise.all([
 *   dedupe('user-123', () => getUser(123)),
 *   dedupe('user-123', () => getUser(123))
 * ])
 */
export async function dedupe<T>(
  key: string,
  fn: () => Promise<T>
): Promise<FetchResult<T>> {
  const existing = pendingRequests.get(key) as PendingRequest<T> | undefined
  if (existing) {
    return existing
  }

  const promise = runEffect(fromPromise(fn))
  pendingRequests.set(key, promise as PendingRequest<unknown>)

  try {
    return await promise
  } finally {
    pendingRequests.delete(key)
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch multiple operations and execute with a single await point
 * Useful for reducing waterfall effects in sequential operations
 *
 * @example
 * const results = await batch()
 *   .add('profile', () => getProfile(userId))
 *   .add('settings', () => getSettings(userId))
 *   .add('membership', () => getMembership(userId))
 *   .execute()
 */
export function batch() {
  const operations: Map<string, () => Promise<unknown>> = new Map()

  return {
    add<T>(key: string, fn: () => Promise<T>) {
      operations.set(key, fn)
      return this
    },

    async execute(): Promise<Map<string, FetchResult<unknown>>> {
      const entries = Array.from(operations.entries())
      const results = await parallelMap(
        entries,
        ([, fn]) => fn()
      )

      const resultMap = new Map<string, FetchResult<unknown>>()
      entries.forEach(([key], index) => {
        resultMap.set(key, results[index])
      })

      return resultMap
    },
  }
}
