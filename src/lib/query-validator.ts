import { executeSQL } from './db/tauri-db'
import type {
  TaskValidation,
  ValidationResult,
  ValidationRule,
  QueryResultRow,
  RowCountValue,
  ColumnNamesValue,
  ColumnCountValue,
  ContainsDataValue
} from '@/data/types'

/**
 * Validates a user's SQL query against task requirements
 */
export async function validateQuery(
  userQuery: string,
  validation: TaskValidation,
  userResults: QueryResultRow[]
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    details: {}
  }

  // Run each validation rule
  for (const rule of validation.rules) {
    await runValidationRule(rule, userQuery, userResults, validation, result)
  }

  // If we have a reference query, validate against it
  if (validation.referenceQuery) {
    await validateAgainstReference(validation.referenceQuery, userResults, validation.exactMatch || false, result)
  }

  // Set isValid based on whether there are any errors
  result.isValid = result.errors.length === 0

  return result
}

/**
 * Run a single validation rule
 */
async function runValidationRule(
  rule: ValidationRule,
  _userQuery: string,
  userResults: QueryResultRow[],
  _validation: TaskValidation,
  result: ValidationResult
): Promise<void> {
  switch (rule.type) {
    case 'rowCount':
      validateRowCount(userResults, rule.value, result)
      break

    case 'columnNames':
      validateColumnNames(userResults, rule.value, result)
      break

    case 'columnCount':
      validateColumnCount(userResults, rule.value, result)
      break

    case 'containsData':
      validateContainsData(userResults, rule.value, result)
      break

    case 'customQuery':
      // Custom query validation can be added here
      break
  }
}

/**
 * Validate row count
 */
function validateRowCount(
  userResults: QueryResultRow[],
  expectedCount: RowCountValue,
  result: ValidationResult
): void {
  const actualCount = userResults.length
  result.details.actualRowCount = actualCount

  if (typeof expectedCount === 'number') {
    result.details.expectedRowCount = expectedCount
    if (actualCount !== expectedCount) {
      result.errors.push(
        `Expected ${expectedCount} rows, but got ${actualCount} rows`
      )
    }
  } else {
    // Range validation
    if (expectedCount.min !== undefined && actualCount < expectedCount.min) {
      result.errors.push(
        `Expected at least ${expectedCount.min} rows, but got ${actualCount} rows`
      )
    }
    if (expectedCount.max !== undefined && actualCount > expectedCount.max) {
      result.errors.push(
        `Expected at most ${expectedCount.max} rows, but got ${actualCount} rows`
      )
    }
  }
}

/**
 * Validate column names
 */
function validateColumnNames(
  userResults: QueryResultRow[],
  expectedColumns: ColumnNamesValue,
  result: ValidationResult
): void {
  if (userResults.length === 0) {
    result.warnings.push('No results to validate column names')
    return
  }

  const actualColumns = Object.keys(userResults[0])
  result.details.actualColumns = actualColumns

  if (Array.isArray(expectedColumns)) {
    // Simple array of required columns
    result.details.expectedColumns = expectedColumns
    const missing = expectedColumns.filter(col => !actualColumns.includes(col))
    const extra = actualColumns.filter(col => !expectedColumns.includes(col))

    if (missing.length > 0) {
      result.details.missingColumns = missing
      result.errors.push(`Missing required columns: ${missing.join(', ')}`)
    }

    if (extra.length > 0) {
      result.details.extraColumns = extra
      // Extra columns are warnings, not errors
      result.warnings.push(`Extra columns found: ${extra.join(', ')}`)
    }
  } else {
    // Complex validation with required/optional/anyOf
    if (expectedColumns.required) {
      const missing = expectedColumns.required.filter(col => !actualColumns.includes(col))
      if (missing.length > 0) {
        result.details.missingColumns = missing
        result.errors.push(`Missing required columns: ${missing.join(', ')}`)
      }
    }

    if (expectedColumns.anyOf) {
      // At least one set of columns from anyOf must be present
      const hasValidSet = expectedColumns.anyOf.some(columnSet =>
        columnSet.every(col => actualColumns.includes(col))
      )

      if (!hasValidSet) {
        result.errors.push(
          `Query must include one of these column sets: ${expectedColumns.anyOf
            .map(set => `[${set.join(', ')}]`)
            .join(' or ')}`
        )
      }
    }
  }
}

/**
 * Validate column count
 */
function validateColumnCount(
  userResults: QueryResultRow[],
  expectedCount: ColumnCountValue,
  result: ValidationResult
): void {
  if (userResults.length === 0) {
    result.warnings.push('No results to validate column count')
    return
  }

  const actualCount = Object.keys(userResults[0]).length

  if (typeof expectedCount === 'number') {
    if (actualCount !== expectedCount) {
      result.errors.push(
        `Expected ${expectedCount} columns, but got ${actualCount} columns`
      )
    }
  } else {
    // Range validation
    if (expectedCount.min !== undefined && actualCount < expectedCount.min) {
      result.errors.push(
        `Expected at least ${expectedCount.min} columns, but got ${actualCount} columns`
      )
    }
    if (expectedCount.max !== undefined && actualCount > expectedCount.max) {
      result.errors.push(
        `Expected at most ${expectedCount.max} columns, but got ${actualCount} columns`
      )
    }
  }
}

/**
 * Validate that results contain specific data
 */
function validateContainsData(
  userResults: QueryResultRow[],
  expectedData: ContainsDataValue,
  result: ValidationResult
): void {
  if (userResults.length === 0) {
    result.errors.push('Query returned no results')
    return
  }

  const column = expectedData.column
  const columnExists = userResults.some(row => column in row)

  if (!columnExists) {
    result.errors.push(`Column '${column}' not found in results`)
    return
  }

  if ('values' in expectedData) {
    // Check if specific values are present
    const actualValues = userResults.map(row => row[column])
    const missing = expectedData.values.filter(val => !actualValues.includes(val))

    if (missing.length > 0) {
      result.errors.push(
        `Missing expected values in column '${column}': ${missing.join(', ')}`
      )
    }
  } else if ('pattern' in expectedData) {
    // Check if values match a pattern
    const regex = new RegExp(expectedData.pattern)
    const allMatch = userResults.every(row => regex.test(String(row[column])))

    if (!allMatch) {
      result.errors.push(
        `Not all values in column '${column}' match pattern: ${expectedData.pattern}`
      )
    }
  }
}

/**
 * Validate against a reference query
 */
async function validateAgainstReference(
  referenceQuery: string,
  userResults: QueryResultRow[],
  exactMatch: boolean,
  result: ValidationResult
): Promise<void> {
  try {
    const { data: referenceResults, error } = await executeSQL(referenceQuery)

    if (error) {
      result.warnings.push(`Could not run reference query: ${error.message}`)
      return
    }

    if (!referenceResults || !Array.isArray(referenceResults)) {
      result.warnings.push('Reference query returned invalid results')
      return
    }

    // Compare row counts
    if (userResults.length !== referenceResults.length) {
      result.errors.push(
        `Row count mismatch: expected ${referenceResults.length} rows, got ${userResults.length} rows`
      )
      return
    }

    if (exactMatch) {
      // Deep comparison of results
      const resultsMatch = compareResults(userResults, referenceResults)
      if (!resultsMatch) {
        result.errors.push('Query results do not match expected results')
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.warnings.push(`Error validating against reference: ${errorMessage}`)
  }
}

/**
 * Compare two result sets
 */
function compareResults(results1: QueryResultRow[], results2: QueryResultRow[]): boolean {
  if (results1.length !== results2.length) {
    return false
  }

  // Convert to JSON strings for deep comparison
  // Sort both arrays to handle different ordering
  const sorted1 = JSON.stringify(
    results1.map(r => JSON.stringify(r)).sort()
  )
  const sorted2 = JSON.stringify(
    results2.map(r => JSON.stringify(r)).sort()
  )

  return sorted1 === sorted2
}

/**
 * Normalize SQL query for comparison
 * Removes extra whitespace, converts to lowercase, etc.
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s+/g, ',')
    .trim()
}
