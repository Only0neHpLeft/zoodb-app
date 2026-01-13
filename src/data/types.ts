// Generic query result row type
export type QueryResultRow = Record<string, unknown>

// Value types for different validation rules
export type RowCountValue = number | { min?: number; max?: number }
export type ColumnNamesValue = string[] | { required?: string[]; optional?: string[]; anyOf?: string[][] }
export type ColumnCountValue = number | { min?: number; max?: number }
export type ContainsDataValue = { column: string; values: unknown[] } | { column: string; pattern: string }

export type ValidationRule =
  | { type: 'rowCount'; value: RowCountValue; description?: string }
  | { type: 'columnNames'; value: ColumnNamesValue; description?: string }
  | { type: 'columnCount'; value: ColumnCountValue; description?: string }
  | { type: 'containsData'; value: ContainsDataValue; description?: string }
  | { type: 'customQuery'; value?: string; description?: string }

export type TaskValidation = {
  // Expected query patterns (for reference/hints)
  expectedQueries?: string[]

  // Validation rules to check
  rules: ValidationRule[]

  // Optional: A reference query to compare results against
  referenceQuery?: string

  // Should the results match exactly with reference query?
  exactMatch?: boolean
}

export type Task = {
  id: string
  title: string
  description: string
  hint: string
  showHint: boolean
  difficulty: "Easy" | "Medium" | "Hard"
  validation?: TaskValidation
}

export type Category = {
  letter: string
  title: string
  description: string
  tasks: Task[]
}

export type Categories = {
  [key: number]: Category
}

export type ValidationResult = {
  isValid: boolean
  errors: string[]
  warnings: string[]
  details: {
    expectedRowCount?: number
    actualRowCount?: number
    expectedColumns?: string[]
    actualColumns?: string[]
    missingColumns?: string[]
    extraColumns?: string[]
  }
}
