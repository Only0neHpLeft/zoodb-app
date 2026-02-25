# Universal SQL Validation System

## Problem

Current validation uses per-task rules (keyword checks, row counts, pattern matching) that are:
- Bypassable — `SELECT 1 FROM Zvirata` passes A1 (correct count, wrong data)
- Not scalable — each new task needs hand-crafted rules
- Missing safety guards — no row cap, no query timeout

## Solution

Replace rule-based pass/fail with **reference query result comparison**. Keep existing rules as optional pedagogical hints.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Comparison scope | Full result set (all rows) | Max table is 4,912 rows — trivial for PGlite |
| Column strictness | Warn on extras, don't block | Teaches precision without frustrating (Option C) |
| Order comparison | Exact position match for `ordered` tasks | Beginners write basic ORDER BY, not COLLATE tricks |
| Bilingual handling | Store reference in Czech, compare values only | Data values are identical in both languages |
| Row cap | 5,000 hard block | Just above largest table (Osetruje: 4,912), catches all cross joins |
| Query timeout | 5 seconds | Prevents infinite CTEs and runaway queries |

## Data Structure

```typescript
interface TaskReference {
  taskId: string                      // "A1", "B2", etc.
  referenceQuery: string              // Correct SQL (Czech)
  compareMode: 'unordered' | 'ordered'
  strictColumns?: string[]            // Warn if student selects extras
  hints?: ValidationRule[]            // Old rules — teaching feedback only
}
```

## Comparison Engine

`compareResults(studentResult, referenceResult, compareMode) → ComparisonResult`

### Steps:
1. **Row count** — fast exit if mismatch
2. **Value comparison** — extract cell values (ignore column names), compare:
   - `unordered`: sort both by stringified values, compare element-by-element
   - `ordered`: compare row-by-row in position order
3. **Column warning** (non-blocking) — if `strictColumns` set, warn on extras
4. **Hint feedback** (on failure only) — run old rules for pedagogical guidance

### Return shape:
```typescript
interface ComparisonResult {
  passed: boolean
  message: string
  warnings?: string[]
  hintResults?: ValidationResult[]
}
```

## Safety Guards

### Row cap (in `executeQuery`)
- Wrap student queries: `SELECT * FROM ({query}) AS _q LIMIT 5001`
- If 5001 rows returned → hard block: "Query returned too many rows"
- Reference queries bypass this guard

### Query timeout (in PGlite init)
- `SET statement_timeout = '5000'`
- Aborts queries exceeding 5 seconds

## Table Sizes (Reference)

| Table | Rows |
|-------|------|
| Druhy / Types | 104 |
| Zvirata / Animals | 2,000 |
| Osetrovatele / Caretakers | 499 |
| Ma_rad / Likes | 1,421 |
| Osetruje / Treats | 4,912 |

Worst accidental cross join: Zvirata × Osetruje = 9.8M rows (caught by 5,000 cap).

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/validation/types.ts` | Add `TaskReference`, `ComparisonResult` types |
| `src/lib/validation/rules.ts` | Replace `VALIDATION_RULES` with `TASK_REFERENCES` |
| `src/lib/validation/validator.ts` | Add `compareResults()`, keep `validateRule()` for hints |
| `src/routes/editor.tsx` | Update validation flow (~15 lines) |
| `src/routes/editor.task.tsx` | Same update if it has validation |
| `src/lib/db/pglite.ts` | Add row cap in `executeQuery()`, timeout at init |

## Integration Flow

```
student runs query → executeQuery(sql)           → student result
                   → executeQuery(referenceSQL)   → reference result
                   → compareResults(student, ref) → pass/fail
                   → if failed + hints → run old rules for feedback
```

## Adding Future Tasks

One line per task:
```typescript
{ taskId: 'X1', referenceQuery: 'SELECT ...', compareMode: 'unordered' }
```

No per-task rules needed. Hints are optional.
