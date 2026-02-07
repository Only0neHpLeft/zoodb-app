import type { ValidationRule, ValidationResult, QueryValidationContext, TaskValidation } from './types'
import { tableNames, columnNames } from '../db/schema-mapping'

// Build bidirectional lookup maps for bilingual validation (CS ↔ EN)
const _tableVariants = new Map<string, string[]>()
for (const entry of Object.values(tableNames)) {
  const pair = [entry.cs, entry.en]
  _tableVariants.set(entry.cs.toLowerCase(), pair)
  _tableVariants.set(entry.en.toLowerCase(), pair)
}

const _columnEquiv = new Map<string, string>()
const _csToEn: [string, string][] = []
const _seen = new Set<string>()
for (const tableCol of Object.values(columnNames)) {
  for (const col of Object.values(tableCol as Record<string, { cs: string; en: string }>)) {
    const cs = col.cs.toLowerCase()
    const en = col.en.toLowerCase()
    if (cs !== en) {
      _columnEquiv.set(cs, en)
      _columnEquiv.set(en, cs)
      if (!_seen.has(cs)) { _csToEn.push([cs, en]); _seen.add(cs) }
    }
  }
}
_csToEn.sort((a, b) => b[0].length - a[0].length)

// Normalize SQL for comparison (remove extra whitespace, lowercase)
function normalizeSql(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),])\s*/g, '$1')
    .trim()
}

// Check if SQL contains a keyword
function checkKeyword(sql: string, keyword: string): boolean {
  const normalized = normalizeSql(sql)
  const keywordLower = keyword.toLowerCase()
  // Use word boundary-like matching
  const pattern = new RegExp(`\\b${keywordLower}\\b`, 'i')
  return pattern.test(normalized)
}

// Check if SQL uses a specific table (accepts both CS and EN names)
function checkTableUsed(sql: string, table: string): boolean {
  const normalized = normalizeSql(sql)
  const variants = _tableVariants.get(table.toLowerCase()) || [table]
  return variants.some(v => {
    const vLower = v.toLowerCase()
    const fromPattern = new RegExp(`\\bfrom\\s+${vLower}\\b`, 'i')
    const joinPattern = new RegExp(`\\bjoin\\s+${vLower}\\b`, 'i')
    return fromPattern.test(normalized) || joinPattern.test(normalized)
  })
}

// Check ORDER BY clause - returns detailed status
type OrderByStatus = 'pass' | 'missing_orderby' | 'wrong_column' | 'wrong_direction'

function checkOrderBy(sql: string, config: string): OrderByStatus {
  const normalized = normalizeSql(sql)

  // Parse config: "column:direction" e.g., "jmeno:asc" or just "column"
  const [column, direction] = config.toLowerCase().split(':')

  // Check if ORDER BY exists
  if (!checkKeyword(sql, 'ORDER BY')) return 'missing_orderby'

  // Extract ORDER BY clause
  const orderByMatch = normalized.match(/order\s+by\s+([^;]+)/i)
  if (!orderByMatch) return 'missing_orderby'

  const orderByClause = orderByMatch[1]

  // Check column presence in ORDER BY (accept both CS and EN names)
  const orderColVariants = [column, ...(_columnEquiv.has(column) ? [_columnEquiv.get(column)!] : [])]
  if (!orderColVariants.some(c => orderByClause.includes(c))) return 'wrong_column'

  // Check direction if specified
  if (direction) {
    if (direction === 'asc' && orderByClause.includes('desc')) return 'wrong_direction'
    if (direction === 'desc' && !orderByClause.includes('desc')) return 'wrong_direction'
  }

  return 'pass'
}

// Check WHERE clause pattern - returns detailed status
type WhereStatus = 'pass' | 'missing_where' | 'wrong_column' | 'wrong_operator' | 'wrong_value'

function checkWhereClause(sql: string, pattern: string): WhereStatus {
  const normalized = normalizeSql(sql)

  if (!checkKeyword(sql, 'WHERE')) return 'missing_where'

  // Extract WHERE clause
  const whereMatch = normalized.match(/where\s+([^;]+?)(?:\s+order|\s+group|\s+limit|;|$)/i)
  if (!whereMatch) return 'missing_where'

  const whereClause = whereMatch[1]

  // Pattern format: "column:operator:value" e.g., "vaha:<:50" or "jmeno:like:a%"
  const [column, operator, value] = pattern.toLowerCase().split(':')

  // Check column presence (accept both CS and EN names)
  const whereColVariants = [column, ...(_columnEquiv.has(column) ? [_columnEquiv.get(column)!] : [])]
  if (!whereColVariants.some(c => whereClause.includes(c))) return 'wrong_column'

  // Check operator
  if (operator) {
    const opMap: Record<string, string[]> = {
      '<': ['<', '< '],
      '>': ['>', '> '],
      '=': ['=', '= '],
      '<=': ['<=', '<= '],
      '>=': ['>=', '>= '],
      'like': ['like'],
      'in': ['in'],
      'between': ['between'],
    }
    const ops = opMap[operator] || [operator]
    if (!ops.some(op => whereClause.includes(op))) return 'wrong_operator'
  }

  // Check value if specified
  if (value && !whereClause.includes(value)) return 'wrong_value'

  return 'pass'
}

// Check if SQL pattern matches (regex, tries both CS and EN column names)
function checkPattern(sql: string, pattern: string): boolean {
  try {
    if (new RegExp(pattern, 'i').test(sql)) return true
    // Try with column names swapped to the other language
    let altPattern = pattern
    for (const [cs, en] of _csToEn) {
      if (altPattern.toLowerCase().includes(cs)) {
        altPattern = altPattern.replace(new RegExp(cs, 'gi'), en)
      } else if (altPattern.toLowerCase().includes(en)) {
        altPattern = altPattern.replace(new RegExp(en, 'gi'), cs)
      }
    }
    if (altPattern !== pattern) {
      return new RegExp(altPattern, 'i').test(sql)
    }
    return false
  } catch {
    return false
  }
}

// Check if result contains a specific value (searches all cells)
function checkResultContains(rows: Record<string, unknown>[], searchValue: string): boolean {
  const searchLower = searchValue.toLowerCase()

  for (const row of rows) {
    for (const cellValue of Object.values(row)) {
      if (cellValue === null || cellValue === undefined) continue

      // Convert to string and check - handles dates, numbers, etc.
      const strValue = String(cellValue).toLowerCase()

      // For dates, also check ISO format (YYYY-MM-DD)
      if (cellValue instanceof Date) {
        const isoDate = cellValue.toISOString().split('T')[0]
        if (isoDate.includes(searchLower)) return true
      }

      if (strValue.includes(searchLower)) return true
    }
  }

  return false
}

// Validate a single rule
function validateRule(rule: ValidationRule, context: QueryValidationContext): ValidationResult {
  const { type, value, message } = rule
  const { sql, rowCount, columns, rows } = context

  switch (type) {
    case 'rowCount': {
      const expected = value as number
      const passed = rowCount === expected
      return {
        passed,
        message: passed
          ? `Row count matches (${expected})`
          : message || `Expected ${expected} rows, got ${rowCount}`,
      }
    }

    case 'columnPresent': {
      const cols = Array.isArray(value) ? value : [value as string]
      const lowerColumns = columns.map(c => c.toLowerCase())
      const missing = cols.filter(c => !lowerColumns.includes(c.toLowerCase()))
      const passed = missing.length === 0
      return {
        passed,
        message: passed
          ? `Required columns present`
          : message || `Missing columns: ${missing.join(', ')}`,
      }
    }

    case 'sqlKeyword': {
      const keywords = Array.isArray(value) ? value : [value as string]
      const missing = keywords.filter(kw => !checkKeyword(sql, kw))
      const passed = missing.length === 0
      return {
        passed,
        message: passed
          ? `Required SQL keywords found`
          : message || `Query should use: ${missing.join(', ')}`,
      }
    }

    case 'tableUsed': {
      const tables = Array.isArray(value) ? value : [value as string]
      const missing = tables.filter(t => !checkTableUsed(sql, t))
      const passed = missing.length === 0
      const displayMissing = missing.map(t => {
        const v = _tableVariants.get(t.toLowerCase())
        return v ? v.join(' / ') : t
      })
      return {
        passed,
        message: passed
          ? `Required tables used`
          : message || `Query should use table: ${displayMissing.join(', ')}`,
      }
    }

    case 'orderBy': {
      const status = checkOrderBy(sql, value as string)
      const passed = status === 'pass'

      // Subtle hints based on what's wrong
      const hints: Record<OrderByStatus, string> = {
        'pass': 'ORDER BY clause correct',
        'missing_orderby': 'Consider how to sort your results',
        'wrong_column': 'Check which column you are sorting by',
        'wrong_direction': 'Think about the sorting direction (A→Z or Z→A)',
      }

      return {
        passed,
        message: passed ? hints.pass : (message || hints[status]),
      }
    }

    case 'whereClause': {
      const status = checkWhereClause(sql, value as string)
      const passed = status === 'pass'

      // Subtle hints based on what's wrong
      const hints: Record<WhereStatus, string> = {
        'pass': 'WHERE clause correct',
        'missing_where': 'Consider filtering your results',
        'wrong_column': 'Check which column you are filtering',
        'wrong_operator': 'Review your comparison operator',
        'wrong_value': 'Check the value you are comparing against',
      }

      return {
        passed,
        message: passed ? hints.pass : (message || hints[status]),
      }
    }

    case 'sqlPattern': {
      const passed = checkPattern(sql, value as string)
      return {
        passed,
        message: passed
          ? `Query structure correct`
          : message || `Query structure incorrect`,
      }
    }

    case 'resultContains': {
      const searchValue = value as string
      const passed = checkResultContains(rows, searchValue)
      return {
        passed,
        message: passed
          ? `Result contains expected value`
          : message || `Result should contain: ${searchValue}`,
      }
    }

    default:
      return { passed: false, message: `Unknown rule type: ${type}` }
  }
}

// Validate all rules for a task
export function validateTask(
  validation: TaskValidation,
  context: QueryValidationContext
): { passed: boolean; results: ValidationResult[] } {
  const results = validation.rules.map(rule => validateRule(rule, context))
  const passed = results.every(r => r.passed)
  return { passed, results }
}

// Get validation for a specific task
export function getTaskValidation(taskId: string, validations: TaskValidation[]): TaskValidation | null {
  return validations.find(v => v.taskId === taskId) || null
}
