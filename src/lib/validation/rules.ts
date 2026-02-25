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
