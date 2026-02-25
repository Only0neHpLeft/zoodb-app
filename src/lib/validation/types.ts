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
