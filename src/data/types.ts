export type ValidationRule = {
  type: 'rowCount' | 'columnNames' | 'columnCount' | 'containsData' | 'customQuery'
  value?: any
  description?: string
}

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
