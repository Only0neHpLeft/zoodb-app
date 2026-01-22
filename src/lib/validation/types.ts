// Validation rule types
export type ValidationRuleType =
  | 'rowCount'
  | 'columnPresent'
  | 'sqlKeyword'
  | 'sqlPattern'
  | 'tableUsed'
  | 'orderBy'
  | 'whereClause'
  | 'resultContains'

export interface ValidationRule {
  type: ValidationRuleType
  value: string | number | string[]
  message?: string // Custom error message
}

export interface TaskValidation {
  taskId: string // e.g., "A1", "A2", "B1"
  rules: ValidationRule[]
}

export interface ValidationResult {
  passed: boolean
  message: string
  details?: string
}

export interface QueryValidationContext {
  sql: string
  rowCount: number
  columns: string[]
  rows: Record<string, unknown>[]
  executionTime: number
}
