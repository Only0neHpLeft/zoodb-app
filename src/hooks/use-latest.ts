/**
 * useLatest - Store event handlers in refs for stable callbacks
 * Implements: advanced-use-latest, advanced-event-handler-refs rules
 *
 * This hook returns a stable ref that always contains the latest value.
 * Useful for callbacks that need access to current state without
 * causing re-renders or stale closures.
 */

import { useRef, useEffect, useCallback } from "react"

/**
 * Returns a ref object that always contains the latest value.
 * The ref identity is stable across re-renders.
 *
 * @example
 * function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
 *   const [query, setQuery] = useState('')
 *   const latestOnSearch = useLatest(onSearch)
 *
 *   useEffect(() => {
 *     const handler = () => latestOnSearch.current(query)
 *     window.addEventListener('keydown', handler)
 *     return () => window.removeEventListener('keydown', handler)
 *   }, [query]) // No need for onSearch in deps!
 * }
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value)

  // Update the ref synchronously during render (before effects run)
  // This ensures effects always see the latest value
  ref.current = value

  return ref
}

/**
 * Creates a stable callback that always calls the latest version of fn.
 * The returned callback identity never changes.
 *
 * Implements: rerender-functional-setstate rule
 *
 * @example
 * function Component({ onSave }: { onSave: (data: Data) => void }) {
 *   const [data, setData] = useState<Data>(initialData)
 *
 *   // This callback never changes identity, so child components won't re-render
 *   const handleSave = useStableCallback(() => {
 *     onSave(data)
 *   })
 *
 *   return <ExpensiveChild onSave={handleSave} />
 * }
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  fn: T
): T {
  const latestFn = useLatest(fn)

  // useCallback with empty deps = stable identity forever
  return useCallback(
    ((...args) => latestFn.current(...args)) as T,
    []
  )
}

/**
 * Memoize a value that updates when dependencies change,
 * but with a stable reference for object identity.
 *
 * Implements: rerender-derived-state rule
 *
 * @example
 * // Instead of creating new object on every render:
 * const config = { theme, language, user }
 *
 * // Use this for stable identity when values haven't changed:
 * const config = useStableMemo(
 *   () => ({ theme, language, user }),
 *   [theme, language, user]
 * )
 */
export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const ref = useRef<{ value: T; deps: React.DependencyList } | null>(null)

  // Check if deps have changed
  const depsChanged =
    ref.current === null ||
    deps.length !== ref.current.deps.length ||
    deps.some((dep, i) => !Object.is(dep, ref.current!.deps[i]))

  if (depsChanged) {
    ref.current = {
      value: factory(),
      deps,
    }
  }

  return ref.current.value
}

/**
 * Track the previous value of a variable.
 * Useful for comparing current vs previous in effects.
 *
 * @example
 * function Component({ id }: { id: string }) {
 *   const prevId = usePrevious(id)
 *
 *   useEffect(() => {
 *     if (prevId !== undefined && prevId !== id) {
 *       console.log(`ID changed from ${prevId} to ${id}`)
 *     }
 *   }, [id, prevId])
 * }
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  })

  return ref.current
}
