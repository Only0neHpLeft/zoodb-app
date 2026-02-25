# Universal SQL Validation System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace bypassable rule-based validation with reference query result comparison, add safety guards (row cap + timeout).

**Architecture:** Each task stores a reference SQL query. On student submit, both queries run against PGlite, and results are compared by values (ignoring column names). Existing rules become optional hint feedback. A 5,000-row hard cap and 5-second timeout protect against runaway queries.

**Tech Stack:** TypeScript, PGlite (WASM Postgres), React

---

### Task 1: Add new types to `types.ts`

**Files:**
- Modify: `src/lib/validation/types.ts`

**Step 1: Add `TaskReference` and `ComparisonResult` types**

Append after the existing `QueryValidationContext` interface (after line 35):

```typescript
export interface TaskReference {
  taskId: string
  referenceQuery: string
  compareMode: 'unordered' | 'ordered'
  strictColumns?: string[]
  hints?: ValidationRule[]
}

export interface ComparisonResult {
  passed: boolean
  message: string
  warnings?: string[]
  hintResults?: ValidationResult[]
}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/validation/types.ts
git commit -m "Add TaskReference and ComparisonResult types for universal validation"
```

---

### Task 2: Add `compareResults()` to `validator.ts`

**Files:**
- Modify: `src/lib/validation/validator.ts`

**Step 1: Add the comparison function**

Add at the end of `validator.ts` (after line 312), before the closing of the file:

```typescript
// Normalize a cell value to a comparable string
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  return String(value).toLowerCase().trim()
}

// Extract row values as sorted string arrays (ignoring column names)
function rowToValues(row: Record<string, unknown>): string[] {
  return Object.values(row).map(normalizeValue)
}

// Serialize a row's values for sorting/comparison
function serializeRow(values: string[]): string {
  return values.join('\x00')
}

// Compare two result sets
export function compareResults(
  studentResult: { rows: Record<string, unknown>[]; rowCount: number; columns: string[] },
  referenceResult: { rows: Record<string, unknown>[]; rowCount: number; columns: string[] },
  compareMode: 'unordered' | 'ordered',
  strictColumns?: string[],
  hints?: ValidationRule[],
  sql?: string,
): ComparisonResult {
  const warnings: string[] = []

  // Step 1: Row count check (fast exit)
  if (studentResult.rowCount !== referenceResult.rowCount) {
    // Run hints for feedback if available
    let hintResults: ValidationResult[] | undefined
    if (hints && sql) {
      const context: QueryValidationContext = {
        sql,
        rowCount: studentResult.rowCount,
        columns: studentResult.columns,
        rows: studentResult.rows,
        executionTime: 0,
      }
      hintResults = hints.map(rule => validateRule(rule, context))
    }

    return {
      passed: false,
      message: `Expected ${referenceResult.rowCount} rows, got ${studentResult.rowCount}`,
      hintResults,
    }
  }

  // Step 2: Value comparison
  const studentValues = studentResult.rows.map(rowToValues)
  const referenceValues = referenceResult.rows.map(rowToValues)

  let mismatch = false

  if (compareMode === 'ordered') {
    // Position-by-position comparison
    for (let i = 0; i < referenceValues.length; i++) {
      const refSerialized = serializeRow(referenceValues[i])
      const stuSerialized = serializeRow(studentValues[i])
      if (refSerialized !== stuSerialized) {
        mismatch = true
        break
      }
    }
  } else {
    // Sort both and compare
    const refSorted = referenceValues.map(serializeRow).sort()
    const stuSorted = studentValues.map(serializeRow).sort()
    for (let i = 0; i < refSorted.length; i++) {
      if (refSorted[i] !== stuSorted[i]) {
        mismatch = true
        break
      }
    }
  }

  if (mismatch) {
    // Run hints for feedback if available
    let hintResults: ValidationResult[] | undefined
    if (hints && sql) {
      const context: QueryValidationContext = {
        sql,
        rowCount: studentResult.rowCount,
        columns: studentResult.columns,
        rows: studentResult.rows,
        executionTime: 0,
      }
      hintResults = hints.map(rule => validateRule(rule, context))
    }

    return {
      passed: false,
      message: compareMode === 'ordered'
        ? 'Row order doesn\'t match expected output'
        : 'Result data doesn\'t match expected output',
      hintResults,
    }
  }

  // Step 3: Column warning (non-blocking)
  if (strictColumns && strictColumns.length > 0) {
    const studentCols = studentResult.columns.map(c => c.toLowerCase())
    const expectedCols = strictColumns.map(c => c.toLowerCase())
    const extraCols = studentCols.filter(c => !expectedCols.includes(c))
    if (extraCols.length > 0) {
      warnings.push('Correct! Tip: try selecting only the columns you need')
    }
  }

  return {
    passed: true,
    message: 'Correct!',
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}
```

**Step 2: Make `validateRule` accessible to `compareResults`**

`validateRule` is already a module-level function in `validator.ts` (line 179). No change needed — `compareResults` can call it directly.

**Step 3: Add the import for the new types**

Update the import at line 1 of `validator.ts`:

```typescript
import type { ValidationRule, ValidationResult, QueryValidationContext, TaskValidation, ComparisonResult, TaskReference } from './types'
```

**Step 4: Verify build**

Run: `bun run build`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/lib/validation/validator.ts
git commit -m "Add compareResults() for reference query validation"
```

---

### Task 3: Replace `VALIDATION_RULES` with `TASK_REFERENCES` in `rules.ts`

**Files:**
- Modify: `src/lib/validation/rules.ts`

**Step 1: Rewrite `rules.ts` with reference queries + hints**

Replace the entire file content:

```typescript
import type { TaskReference } from './types'

// Reference queries for all tasks
// Pass/fail is determined by comparing student result to reference result.
// Hints are optional — shown as pedagogical feedback when student fails.

const TASK_REFERENCES: TaskReference[] = [
  // Category A - Basic Queries
  {
    taskId: 'A1',
    referenceQuery: 'SELECT * FROM Zvirata',
    compareMode: 'unordered',
    hints: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM'] },
      { type: 'tableUsed', value: 'Zvirata' },
    ],
  },
  {
    taskId: 'A2',
    referenceQuery: 'SELECT * FROM Zvirata WHERE vaha < 50',
    compareMode: 'unordered',
    hints: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'whereClause', value: 'vaha:<:50' },
    ],
  },
  {
    taskId: 'A3',
    referenceQuery: "SELECT * FROM Zvirata WHERE jmeno LIKE 'a%'",
    compareMode: 'unordered',
    hints: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE', 'LIKE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'sqlPattern', value: 'jmeno.*like.*[\'"]?a%[\'"]?' },
    ],
  },
  {
    taskId: 'A4',
    referenceQuery: 'SELECT * FROM Zvirata ORDER BY jmeno ASC',
    compareMode: 'ordered',
    hints: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'ORDER BY'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'orderBy', value: 'jmeno:asc' },
    ],
  },

  // Category B - JOIN Queries
  {
    taskId: 'B1',
    referenceQuery: "SELECT z.* FROM Zvirata z JOIN Druhy d ON z.druh = d.id WHERE d.nazev = 'slimak'",
    compareMode: 'unordered',
    hints: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'tableUsed', value: 'Druhy' },
      { type: 'sqlPattern', value: 'slimak|slug' },
    ],
  },
  {
    taskId: 'B2',
    referenceQuery: "SELECT z.* FROM Zvirata z JOIN Druhy d ON z.druh = d.id WHERE z.jmeno = 'julie'",
    compareMode: 'unordered',
    hints: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'tableUsed', value: 'Druhy' },
      { type: 'sqlPattern', value: 'julie' },
    ],
  },
  {
    taskId: 'B3',
    referenceQuery: "SELECT z.* FROM Zvirata z JOIN Druhy d ON z.druh = d.id WHERE z.jmeno = 'sisi' AND d.nazev = 'netopyr'",
    compareMode: 'unordered',
    hints: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'tableUsed', value: 'Druhy' },
      { type: 'sqlPattern', value: 'sisi' },
      { type: 'sqlPattern', value: 'netopyr|bat' },
    ],
  },
]

export function getTaskReference(taskId: string): TaskReference | null {
  return TASK_REFERENCES.find(r => r.taskId === taskId) || null
}
```

**Step 2: Update `index.ts` exports**

Replace line 3 of `src/lib/validation/index.ts`:

```typescript
export { getTaskReference } from './rules'
```

Full file becomes:

```typescript
export * from './types'
export * from './validator'
export { getTaskReference } from './rules'
```

**Step 3: Verify build**

Run: `bun run build`
Expected: Build errors in `editor.tsx` and `editor.task.tsx` (they still import old `getTaskRules` / `validateTask`). This is expected — we fix those in Task 4.

**Step 4: Commit**

```bash
git add src/lib/validation/rules.ts src/lib/validation/index.ts
git commit -m "Replace rule-based validation with reference query definitions"
```

---

### Task 4: Update `editor.tsx` to use `compareResults`

**Files:**
- Modify: `src/routes/editor.tsx:23,185-218`

**Step 1: Update imports**

Replace line 23:

```typescript
// Old:
import { validateTask, getTaskRules, type ValidationResult } from "@/lib/validation"

// New:
import { compareResults, getTaskReference, type ValidationResult, type ComparisonResult } from "@/lib/validation"
```

**Step 2: Update the validation block**

Replace lines 185-218 (the `if (category && taskParam)` block) with:

```typescript
      // Validate the result if we have a task selected
      if (category && taskParam) {
        const taskId = `${category.letter}${taskParam}`
        const taskRef = getTaskReference(taskId)

        if (taskRef) {
          const refResult = await executeQuery(taskRef.referenceQuery)
          const comparison = compareResults(
            queryResult,
            refResult,
            taskRef.compareMode,
            taskRef.strictColumns,
            taskRef.hints,
            sqlQuery,
          )

          // Map comparison to existing UI state
          const results: ValidationResult[] = comparison.hintResults || [
            { passed: comparison.passed, message: comparison.message }
          ]
          setValidationResults(results)
          setIsValidated(comparison.passed)

          if (comparison.passed) {
            markTaskComplete(category.letter, selectedTaskIndex)
            toast.success(t.task?.taskCompleted || "Task completed!", {
              description: t.task?.correctSolution || "Your solution is correct"
            })
            // Show column warning if any
            if (comparison.warnings?.length) {
              toast.info(comparison.warnings[0])
            }
          } else {
            const failedHints = results.filter(r => !r.passed)
            toast.error(t.task?.incorrectSolution || "Not quite right", {
              description: failedHints[0]?.message || comparison.message
            })
          }
        } else {
          // No reference for this task, just show execution success
          toast.success(t.task?.querySuccess || "Query executed", {
            description: `${queryResult.rowCount} ${queryResult.rowCount === 1 ? 'row' : 'rows'} in ${queryResult.executionTime.toFixed(2)}ms`
          })
        }
      }
```

**Step 3: Verify build**

Run: `bun run build`
Expected: Build error only in `editor.task.tsx` (fixed in Task 5)

**Step 4: Commit**

```bash
git add src/routes/editor.tsx
git commit -m "Wire editor to reference query comparison validation"
```

---

### Task 5: Update `editor.task.tsx` to use `compareResults`

**Files:**
- Modify: `src/routes/editor.task.tsx:21,160-192`

**Step 1: Update imports**

Replace line 21:

```typescript
// Old:
import { validateTask, getTaskRules, type ValidationResult } from "@/lib/validation"

// New:
import { compareResults, getTaskReference, type ValidationResult, type ComparisonResult } from "@/lib/validation"
```

**Step 2: Update the validation block**

Replace lines 160-192 (the `if (taskRules)` block and its else) with the same pattern as Task 4 but adapted to this file's variable names (`completeTask` instead of `markTaskComplete`, `taskIndex` instead of `selectedTaskIndex`, `t.task.validationSuccess` instead of `t.task?.taskCompleted`):

```typescript
        const taskRef = getTaskReference(taskId)

        if (taskRef) {
          const refResult = await executeQuery(taskRef.referenceQuery)
          const comparison = compareResults(
            queryResult,
            refResult,
            taskRef.compareMode,
            taskRef.strictColumns,
            taskRef.hints,
            sqlQuery,
          )

          const results: ValidationResult[] = comparison.hintResults || [
            { passed: comparison.passed, message: comparison.message }
          ]
          setValidationResults(results)
          setIsValidated(comparison.passed)

          if (comparison.passed) {
            completeTask(category.letter, taskIndex)
            toast.success(t.task.validationSuccess || "Query Validation: Passed")
            if (comparison.warnings?.length) {
              toast.info(comparison.warnings[0])
            }
          } else {
            const failedHints = results.filter(r => !r.passed)
            toast.error(t.task.validationFailed || "Query Validation: Failed", {
              description: failedHints[0]?.message || comparison.message
            })
          }
        } else {
          toast.success(t.task.querySuccess || "Query executed successfully", {
            description: `${queryResult.rowCount} ${queryResult.rowCount === 1 ? (t.task.row || 'row') : (t.task.rows || 'rows')} · ${queryResult.executionTime.toFixed(1)}ms`
          })
        }
```

Also update the line before this block — find where `taskId` is built and `getTaskRules(taskId)` is called, and remove the `getTaskRules` call (replace with `getTaskReference`).

**Step 3: Verify build**

Run: `bun run build`
Expected: PASS — all imports resolved, no type errors

**Step 4: Commit**

```bash
git add src/routes/editor.task.tsx
git commit -m "Wire task editor to reference query comparison validation"
```

---

### Task 6: Add safety guards to `pglite.ts`

**Files:**
- Modify: `src/lib/db/pglite.ts:136-146,517-539`

**Step 1: Add query timeout at PGlite init**

In `initializeDb()` (line 135-147), add `SET statement_timeout` after the PGlite instance is created. After line 140 (`dbReady = true;`):

```typescript
  // Safety: abort queries exceeding 5 seconds
  try {
    await db.exec('SET statement_timeout = 5000');
  } catch {
    // statement_timeout may not be supported in all PGlite versions — non-fatal
  }
```

**Step 2: Add row cap to `executeQuery()`**

Modify `executeQuery` (line 517-539) to accept an options parameter and wrap student queries:

```typescript
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
```

**Step 3: Update reference query calls in both editors**

In `editor.tsx` and `editor.task.tsx`, where we call `executeQuery(taskRef.referenceQuery)`, change to:

```typescript
const refResult = await executeQuery(taskRef.referenceQuery, { isReference: true })
```

**Step 4: Verify build**

Run: `bun run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/db/pglite.ts src/routes/editor.tsx src/routes/editor.task.tsx
git commit -m "Add 5s query timeout and 5000-row cap safety guards"
```

---

### Task 7: Verify reference queries match expected row counts

**Files:**
- None (manual verification)

**Step 1: Start the dev server**

Run: `bun run dev`

**Step 2: Test each reference query manually in the editor**

Open the app, navigate to each task, and run the reference query to verify it returns the expected number of rows:

| Task | Reference Query | Expected Rows |
|------|----------------|---------------|
| A1 | `SELECT * FROM Zvirata` | 2000 |
| A2 | `SELECT * FROM Zvirata WHERE vaha < 50` | 706 |
| A3 | `SELECT * FROM Zvirata WHERE jmeno LIKE 'a%'` | 192 |
| A4 | `SELECT * FROM Zvirata ORDER BY jmeno ASC` | 2000 |
| B1 | `SELECT z.* FROM Zvirata z JOIN Druhy d ON z.druh = d.id WHERE d.nazev = 'slimak'` | 22 |
| B2 | `SELECT z.* FROM Zvirata z JOIN Druhy d ON z.druh = d.id WHERE z.jmeno = 'julie'` | 3 |
| B3 | `SELECT z.* FROM Zvirata z JOIN Druhy d ON z.druh = d.id WHERE z.jmeno = 'sisi' AND d.nazev = 'netopyr'` | verify manually |

**Step 3: Test validation works**

- Run `SELECT * FROM Zvirata` on task A1 → should PASS
- Run `SELECT 1 FROM Zvirata` on task A1 → should FAIL (values don't match)
- Run `SELECT * FROM Zvirata` on task A2 → should FAIL (2000 rows vs 706 expected)
- Run `SELECT * FROM Zvirata ORDER BY jmeno ASC` on task A4 → should PASS
- Run `SELECT * FROM Zvirata ORDER BY jmeno DESC` on task A4 → should FAIL (wrong order)

**Step 4: Test safety guards**

- Run `SELECT * FROM Zvirata, Zvirata` → should error with "more than 5000 rows" message
- Run a query with `pg_sleep(10)` or similar → should timeout after 5 seconds

**Step 5: Test column warning**

If any task has `strictColumns` defined, verify the warning toast appears when student selects extra columns.

---

### Task 8: Clean up unused code

**Files:**
- Modify: `src/lib/validation/validator.ts`
- Modify: `src/lib/validation/types.ts`

**Step 1: Remove unused exports**

In `validator.ts`, remove `validateTask` and `getTaskValidation` (lines 300-312) — they are no longer called by any consumer. Keep `validateRule` as it's used internally by `compareResults`.

In `types.ts`, remove `TaskValidation` interface (lines 18-21) — replaced by `TaskReference`. Keep `ValidationRule`, `ValidationResult`, `QueryValidationContext` as they're still used by hints.

**Step 2: Update `index.ts` if needed**

Remove any re-exports of deleted functions.

**Step 3: Verify build**

Run: `bun run build`
Expected: PASS — no consumers reference deleted code

**Step 4: Commit**

```bash
git add src/lib/validation/
git commit -m "Remove unused rule-only validation functions"
```
