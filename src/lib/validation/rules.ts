import type { TaskValidation } from './types'

// Validation rules for all tasks
// Since repo is private, no need for encoding

const VALIDATION_RULES: TaskValidation[] = [
  // Category A - Basic Queries
  {
    taskId: 'A1',
    rules: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'rowCount', value: 2000 },
    ],
  },
  {
    taskId: 'A2',
    rules: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'whereClause', value: 'vaha:<:50' },
      { type: 'rowCount', value: 706 },
    ],
  },
  {
    taskId: 'A3',
    rules: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE', 'LIKE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'sqlPattern', value: 'jmeno.*like.*[\'"]?a%[\'"]?' },
      { type: 'rowCount', value: 192 },
    ],
  },
  {
    taskId: 'A4',
    rules: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'ORDER BY'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'orderBy', value: 'jmeno:asc' },
      { type: 'rowCount', value: 2000 },
    ],
  },

  // Category B - JOIN Queries
  {
    taskId: 'B1',
    rules: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'tableUsed', value: 'Druhy' },
      { type: 'sqlPattern', value: 'slimak|slug' },
      { type: 'rowCount', value: 22 },
    ],
  },
  {
    taskId: 'B2',
    rules: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'tableUsed', value: 'Druhy' },
      { type: 'sqlPattern', value: 'julie' },
      { type: 'rowCount', value: 3 },
    ],
  },
  {
    taskId: 'B3',
    rules: [
      { type: 'sqlKeyword', value: ['SELECT', 'FROM', 'WHERE'] },
      { type: 'tableUsed', value: 'Zvirata' },
      { type: 'tableUsed', value: 'Druhy' },
      { type: 'sqlPattern', value: 'sisi' },
      { type: 'sqlPattern', value: 'netopyr|bat' },
      { type: 'resultContains', value: '1948-10-31' },
    ],
  },
]

export function getValidationRules(): TaskValidation[] {
  return VALIDATION_RULES
}

export function getTaskRules(taskId: string): TaskValidation | null {
  return VALIDATION_RULES.find(r => r.taskId === taskId) || null
}
