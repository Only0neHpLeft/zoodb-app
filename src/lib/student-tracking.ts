// Student Progress Tracking System

export type QueryAttempt = {
  query: string
  timestamp: number
  success: boolean
  error?: string
  executionTime?: number
}

export type HintUsage = {
  taskId: string
  timestamp: number
}

export type TaskProgress = {
  taskId: string
  categoryLetter: string
  taskIndex: number
  attempts: QueryAttempt[]
  hintsUsed: HintUsage[]
  timeSpent: number // in seconds
  completed: boolean
  completedAt?: number
  firstAttemptAt: number
  lastAttemptAt: number
}

export type StudentProgress = {
  studentId: string
  studentName: string
  studentEmail: string
  tasks: { [key: string]: TaskProgress } // key: `${categoryLetter}-${taskIndex}`
  totalTimeSpent: number
  tasksCompleted: number
  totalAttempts: number
  totalHintsUsed: number
  lastActive: number
}

export type StudentAnalytics = {
  students: { [studentId: string]: StudentProgress }
  lastUpdated: number
}

// Storage keys
const STUDENT_ANALYTICS_KEY = 'studentAnalytics'
const CURRENT_STUDENT_KEY = 'currentStudent'

// Get all student analytics (for teachers)
export function getAllStudentAnalytics(): StudentAnalytics {
  if (typeof window === 'undefined') return { students: {}, lastUpdated: Date.now() }

  const stored = localStorage.getItem(STUDENT_ANALYTICS_KEY)
  if (!stored) {
    return { students: {}, lastUpdated: Date.now() }
  }

  try {
    return JSON.parse(stored)
  } catch {
    return { students: {}, lastUpdated: Date.now() }
  }
}

// Save student analytics
function saveStudentAnalytics(analytics: StudentAnalytics) {
  if (typeof window === 'undefined') return

  analytics.lastUpdated = Date.now()
  localStorage.setItem(STUDENT_ANALYTICS_KEY, JSON.stringify(analytics))
}

// Get or create student progress
export function getStudentProgress(studentId: string, studentName: string, studentEmail: string): StudentProgress {
  const analytics = getAllStudentAnalytics()

  if (!analytics.students[studentId]) {
    analytics.students[studentId] = {
      studentId,
      studentName,
      studentEmail,
      tasks: {},
      totalTimeSpent: 0,
      tasksCompleted: 0,
      totalAttempts: 0,
      totalHintsUsed: 0,
      lastActive: Date.now(),
    }
    saveStudentAnalytics(analytics)
  }

  return analytics.students[studentId]
}

// Track query attempt
export function trackQueryAttempt(
  studentId: string,
  studentName: string,
  studentEmail: string,
  categoryLetter: string,
  taskIndex: number,
  query: string,
  success: boolean,
  error?: string,
  executionTime?: number
) {
  const analytics = getAllStudentAnalytics()
  const student = analytics.students[studentId] || getStudentProgress(studentId, studentName, studentEmail)

  const taskKey = `${categoryLetter}-${taskIndex}`
  if (!student.tasks[taskKey]) {
    student.tasks[taskKey] = {
      taskId: taskKey,
      categoryLetter,
      taskIndex,
      attempts: [],
      hintsUsed: [],
      timeSpent: 0,
      completed: false,
      firstAttemptAt: Date.now(),
      lastAttemptAt: Date.now(),
    }
  }

  const attempt: QueryAttempt = {
    query,
    timestamp: Date.now(),
    success,
    error,
    executionTime,
  }

  student.tasks[taskKey].attempts.push(attempt)
  student.tasks[taskKey].lastAttemptAt = Date.now()
  student.totalAttempts += 1
  student.lastActive = Date.now()

  analytics.students[studentId] = student
  saveStudentAnalytics(analytics)
}

// Track hint usage
export function trackHintUsage(
  studentId: string,
  studentName: string,
  studentEmail: string,
  categoryLetter: string,
  taskIndex: number
) {
  const analytics = getAllStudentAnalytics()
  const student = analytics.students[studentId] || getStudentProgress(studentId, studentName, studentEmail)

  const taskKey = `${categoryLetter}-${taskIndex}`
  if (!student.tasks[taskKey]) {
    student.tasks[taskKey] = {
      taskId: taskKey,
      categoryLetter,
      taskIndex,
      attempts: [],
      hintsUsed: [],
      timeSpent: 0,
      completed: false,
      firstAttemptAt: Date.now(),
      lastAttemptAt: Date.now(),
    }
  }

  student.tasks[taskKey].hintsUsed.push({
    taskId: taskKey,
    timestamp: Date.now(),
  })

  student.totalHintsUsed += 1
  student.lastActive = Date.now()

  analytics.students[studentId] = student
  saveStudentAnalytics(analytics)
}

// Track task completion
export function trackTaskCompletion(
  studentId: string,
  studentName: string,
  studentEmail: string,
  categoryLetter: string,
  taskIndex: number
) {
  const analytics = getAllStudentAnalytics()
  const student = analytics.students[studentId] || getStudentProgress(studentId, studentName, studentEmail)

  const taskKey = `${categoryLetter}-${taskIndex}`
  if (!student.tasks[taskKey]) {
    student.tasks[taskKey] = {
      taskId: taskKey,
      categoryLetter,
      taskIndex,
      attempts: [],
      hintsUsed: [],
      timeSpent: 0,
      completed: false,
      firstAttemptAt: Date.now(),
      lastAttemptAt: Date.now(),
    }
  }

  if (!student.tasks[taskKey].completed) {
    student.tasks[taskKey].completed = true
    student.tasks[taskKey].completedAt = Date.now()
    student.tasksCompleted += 1
  }

  student.lastActive = Date.now()

  analytics.students[studentId] = student
  saveStudentAnalytics(analytics)
}

// Track time spent on task
export function trackTimeSpent(
  studentId: string,
  categoryLetter: string,
  taskIndex: number,
  seconds: number
) {
  const analytics = getAllStudentAnalytics()
  const student = analytics.students[studentId]

  if (!student) return

  const taskKey = `${categoryLetter}-${taskIndex}`
  if (student.tasks[taskKey]) {
    student.tasks[taskKey].timeSpent += seconds
    student.totalTimeSpent += seconds
  }

  analytics.students[studentId] = student
  saveStudentAnalytics(analytics)
}

// Get student statistics
export function getStudentStats(studentId: string) {
  const analytics = getAllStudentAnalytics()
  const student = analytics.students[studentId]

  if (!student) return null

  const taskCount = Object.keys(student.tasks).length
  const completedTasks = Object.values(student.tasks).filter(t => t.completed).length
  const averageAttempts = taskCount > 0 ? student.totalAttempts / taskCount : 0
  const successRate = student.totalAttempts > 0
    ? Object.values(student.tasks).reduce((acc, task) => {
        const successfulAttempts = task.attempts.filter(a => a.success).length
        return acc + successfulAttempts
      }, 0) / student.totalAttempts * 100
    : 0

  return {
    totalTasks: taskCount,
    completedTasks,
    completionRate: taskCount > 0 ? (completedTasks / taskCount) * 100 : 0,
    totalAttempts: student.totalAttempts,
    averageAttempts: Math.round(averageAttempts * 10) / 10,
    totalHintsUsed: student.totalHintsUsed,
    totalTimeSpent: student.totalTimeSpent,
    successRate: Math.round(successRate * 10) / 10,
    lastActive: student.lastActive,
  }
}

// Get current student (for auto-tracking)
export function getCurrentStudent(): { id: string; name: string; email: string } | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(CURRENT_STUDENT_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

// Set current student
export function setCurrentStudent(id: string, name: string, email: string) {
  if (typeof window === 'undefined') return

  localStorage.setItem(CURRENT_STUDENT_KEY, JSON.stringify({ id, name, email }))
}

// Clear current student
export function clearCurrentStudent() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(CURRENT_STUDENT_KEY)
}

// Generate mock students for testing
export function generateMockStudents() {
  const mockStudents: StudentAnalytics = {
    students: {
      'student-1': {
        studentId: 'student-1',
        studentName: 'Jan Novák',
        studentEmail: 'jan.novak@example.com',
        tasks: {
          'A-0': {
            taskId: 'A-0',
            categoryLetter: 'A',
            taskIndex: 0,
            attempts: [
              {
                query: 'SELECT * FROM animals;',
                timestamp: Date.now() - 7200000,
                success: true,
                executionTime: 45
              },
              {
                query: 'SELECT * FORM animals;',
                timestamp: Date.now() - 7300000,
                success: false,
                error: 'Syntax error: FORM should be FROM',
                executionTime: 12
              }
            ],
            hintsUsed: [],
            timeSpent: 420,
            completed: true,
            completedAt: Date.now() - 7000000,
            firstAttemptAt: Date.now() - 7500000,
            lastAttemptAt: Date.now() - 7200000
          },
          'A-1': {
            taskId: 'A-1',
            categoryLetter: 'A',
            taskIndex: 1,
            attempts: [
              {
                query: 'SELECT name FROM animals WHERE type = "lion";',
                timestamp: Date.now() - 3600000,
                success: true,
                executionTime: 38
              }
            ],
            hintsUsed: [
              {
                taskId: 'A-1',
                timestamp: Date.now() - 3700000
              }
            ],
            timeSpent: 320,
            completed: true,
            completedAt: Date.now() - 3500000,
            firstAttemptAt: Date.now() - 3800000,
            lastAttemptAt: Date.now() - 3600000
          },
          'B-0': {
            taskId: 'B-0',
            categoryLetter: 'B',
            taskIndex: 0,
            attempts: [
              {
                query: 'SELECT COUNT(*) FROM animals;',
                timestamp: Date.now() - 1800000,
                success: false,
                error: 'Incomplete query',
                executionTime: 15
              }
            ],
            hintsUsed: [],
            timeSpent: 180,
            completed: false,
            firstAttemptAt: Date.now() - 2000000,
            lastAttemptAt: Date.now() - 1800000
          }
        },
        totalTimeSpent: 920,
        tasksCompleted: 2,
        totalAttempts: 4,
        totalHintsUsed: 1,
        lastActive: Date.now() - 1800000
      },
      'student-2': {
        studentId: 'student-2',
        studentName: 'Marie Svobodová',
        studentEmail: 'marie.svobodova@example.com',
        tasks: {
          'A-0': {
            taskId: 'A-0',
            categoryLetter: 'A',
            taskIndex: 0,
            attempts: [
              {
                query: 'SELECT * FROM animals;',
                timestamp: Date.now() - 5400000,
                success: true,
                executionTime: 52
              }
            ],
            hintsUsed: [],
            timeSpent: 240,
            completed: true,
            completedAt: Date.now() - 5300000,
            firstAttemptAt: Date.now() - 5500000,
            lastAttemptAt: Date.now() - 5400000
          },
          'A-1': {
            taskId: 'A-1',
            categoryLetter: 'A',
            taskIndex: 1,
            attempts: [
              {
                query: 'SELECT name FROM animals;',
                timestamp: Date.now() - 4800000,
                success: false,
                error: 'Missing WHERE clause',
                executionTime: 25
              },
              {
                query: 'SELECT name FROM animals WHERE type = "cat";',
                timestamp: Date.now() - 4500000,
                success: true,
                executionTime: 48
              }
            ],
            hintsUsed: [
              {
                taskId: 'A-1',
                timestamp: Date.now() - 4700000
              }
            ],
            timeSpent: 480,
            completed: true,
            completedAt: Date.now() - 4400000,
            firstAttemptAt: Date.now() - 4900000,
            lastAttemptAt: Date.now() - 4500000
          },
          'A-2': {
            taskId: 'A-2',
            categoryLetter: 'A',
            taskIndex: 2,
            attempts: [
              {
                query: 'SELECT * FROM animals ORDER BY name;',
                timestamp: Date.now() - 3600000,
                success: true,
                executionTime: 41
              }
            ],
            hintsUsed: [],
            timeSpent: 360,
            completed: true,
            completedAt: Date.now() - 3500000,
            firstAttemptAt: Date.now() - 3800000,
            lastAttemptAt: Date.now() - 3600000
          },
          'B-0': {
            taskId: 'B-0',
            categoryLetter: 'B',
            taskIndex: 0,
            attempts: [
              {
                query: 'SELECT COUNT(*) FROM animals;',
                timestamp: Date.now() - 2700000,
                success: true,
                executionTime: 35
              }
            ],
            hintsUsed: [],
            timeSpent: 280,
            completed: true,
            completedAt: Date.now() - 2600000,
            firstAttemptAt: Date.now() - 2900000,
            lastAttemptAt: Date.now() - 2700000
          },
          'B-1': {
            taskId: 'B-1',
            categoryLetter: 'B',
            taskIndex: 1,
            attempts: [
              {
                query: 'SELECT type, COUNT(*) FROM animals GROUP BY type;',
                timestamp: Date.now() - 1200000,
                success: true,
                executionTime: 67
              }
            ],
            hintsUsed: [
              {
                taskId: 'B-1',
                timestamp: Date.now() - 1500000
              },
              {
                taskId: 'B-1',
                timestamp: Date.now() - 1300000
              }
            ],
            timeSpent: 620,
            completed: true,
            completedAt: Date.now() - 1100000,
            firstAttemptAt: Date.now() - 1600000,
            lastAttemptAt: Date.now() - 1200000
          }
        },
        totalTimeSpent: 1980,
        tasksCompleted: 5,
        totalAttempts: 6,
        totalHintsUsed: 3,
        lastActive: Date.now() - 1200000
      },
      'student-3': {
        studentId: 'student-3',
        studentName: 'Petr Dvořák',
        studentEmail: 'petr.dvorak@example.com',
        tasks: {
          'A-0': {
            taskId: 'A-0',
            categoryLetter: 'A',
            taskIndex: 0,
            attempts: [
              {
                query: 'SELCT * FROM animals;',
                timestamp: Date.now() - 9000000,
                success: false,
                error: 'Syntax error: SELCT should be SELECT',
                executionTime: 10
              },
              {
                query: 'SELECT * FORM animals;',
                timestamp: Date.now() - 8900000,
                success: false,
                error: 'Syntax error: FORM should be FROM',
                executionTime: 11
              },
              {
                query: 'SELECT * FROM animals;',
                timestamp: Date.now() - 8800000,
                success: true,
                executionTime: 43
              }
            ],
            hintsUsed: [
              {
                taskId: 'A-0',
                timestamp: Date.now() - 8950000
              }
            ],
            timeSpent: 720,
            completed: true,
            completedAt: Date.now() - 8700000,
            firstAttemptAt: Date.now() - 9100000,
            lastAttemptAt: Date.now() - 8800000
          },
          'A-1': {
            taskId: 'A-1',
            categoryLetter: 'A',
            taskIndex: 1,
            attempts: [
              {
                query: 'SELECT name FROM animals;',
                timestamp: Date.now() - 7200000,
                success: false,
                error: 'Missing WHERE clause',
                executionTime: 22
              },
              {
                query: 'SELECT * FROM animals WHERE type = "dog";',
                timestamp: Date.now() - 7000000,
                success: false,
                error: 'Should select only name column',
                executionTime: 33
              }
            ],
            hintsUsed: [
              {
                taskId: 'A-1',
                timestamp: Date.now() - 7300000
              },
              {
                taskId: 'A-1',
                timestamp: Date.now() - 7100000
              }
            ],
            timeSpent: 540,
            completed: false,
            firstAttemptAt: Date.now() - 7400000,
            lastAttemptAt: Date.now() - 7000000
          }
        },
        totalTimeSpent: 1260,
        tasksCompleted: 1,
        totalAttempts: 5,
        totalHintsUsed: 3,
        lastActive: Date.now() - 7000000
      }
    },
    lastUpdated: Date.now()
  }

  saveStudentAnalytics(mockStudents)
  return mockStudents
}
