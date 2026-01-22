// Student Progress Tracking System
import { saveTaskProgress, getStudentTaskProgress, type LegacyTaskProgressRecord as TaskProgressRecord } from './db/convex-db'

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

// Helper to save to database (non-blocking)
// userId is passed as parameter to avoid module-level state
async function saveToDb(userId: string | null, categoryLetter: string, taskIndex: number, progress: {
  completed?: boolean
  attemptCount?: number
  successfulAttempts?: number
  hintsUsed?: number
  timeSpentSeconds?: number
}) {
  if (!userId) return

  try {
    await saveTaskProgress(userId, categoryLetter, taskIndex, progress)
  } catch (error) {
    console.error('Failed to save progress to database:', error)
    // localStorage serves as fallback
  }
}

// Sync progress from database to localStorage
export async function syncProgressWithUser(userId: string): Promise<void> {
  try {
    const { data: dbProgress } = await getStudentTaskProgress(userId)
    if (!dbProgress || dbProgress.length === 0) {
      // No DB data, migrate localStorage to DB if exists
      const analytics = getAllStudentAnalytics()
      if (analytics.students[userId]) {
        const student = analytics.students[userId]
        for (const [, task] of Object.entries(student.tasks)) {
          await saveTaskProgress(userId, task.categoryLetter, task.taskIndex, {
            completed: task.completed,
            attemptCount: task.attempts.length,
            successfulAttempts: task.attempts.filter(a => a.success).length,
            hintsUsed: task.hintsUsed.length,
            timeSpentSeconds: task.timeSpent,
          })
        }
      }
      return
    }

    // Update localStorage with DB data
    const analytics = getAllStudentAnalytics()
    if (!analytics.students[userId]) {
      // Get user info from current student or create placeholder
      const currentStudent = getCurrentStudent()
      analytics.students[userId] = {
        studentId: userId,
        studentName: currentStudent?.name || 'Unknown',
        studentEmail: currentStudent?.email || '',
        tasks: {},
        totalTimeSpent: 0,
        tasksCompleted: 0,
        totalAttempts: 0,
        totalHintsUsed: 0,
        lastActive: Date.now(),
      }
    }

    // Merge DB progress into localStorage
    for (const record of dbProgress) {
      const taskKey = `${record.category_letter}-${record.task_index}`
      const existingTask = analytics.students[userId].tasks[taskKey]

      // Only update if DB has more recent data
      const dbLastAttempt = new Date(record.last_attempt_at).getTime()
      const localLastAttempt = existingTask?.lastAttemptAt || 0

      if (!existingTask || dbLastAttempt > localLastAttempt) {
        analytics.students[userId].tasks[taskKey] = {
          taskId: taskKey,
          categoryLetter: record.category_letter,
          taskIndex: record.task_index,
          attempts: existingTask?.attempts || [],
          hintsUsed: existingTask?.hintsUsed || [],
          timeSpent: record.time_spent_seconds,
          completed: record.completed,
          completedAt: record.completed_at ? new Date(record.completed_at).getTime() : undefined,
          firstAttemptAt: new Date(record.first_attempt_at).getTime(),
          lastAttemptAt: dbLastAttempt,
        }
      }
    }

    // Recalculate totals
    let totalTime = 0
    let totalCompleted = 0
    let totalAttempts = 0
    let totalHints = 0

    for (const task of Object.values(analytics.students[userId].tasks)) {
      totalTime += task.timeSpent
      if (task.completed) totalCompleted++
      totalAttempts += task.attempts.length
      totalHints += task.hintsUsed.length
    }

    analytics.students[userId].totalTimeSpent = totalTime
    analytics.students[userId].tasksCompleted = totalCompleted
    analytics.students[userId].totalAttempts = totalAttempts
    analytics.students[userId].totalHintsUsed = totalHints
    analytics.students[userId].lastActive = Date.now()

    saveStudentAnalytics(analytics)
  } catch (error) {
    console.error('Failed to sync progress with database:', error)
  }
}

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
export function saveStudentAnalytics(analytics: StudentAnalytics) {
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

// Re-export mock data generator from separate module (for backward compatibility)
// Import from '@/lib/mocks/student-tracking.mock' directly for new code
export { generateMockStudents } from './mocks/student-tracking.mock'
