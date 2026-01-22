// Mock data generator for student tracking - for development/testing only
import type { StudentAnalytics } from '../student-tracking'
import { saveStudentAnalytics } from '../student-tracking'

/**
 * Generate mock students for testing the student tracking system.
 * This function creates sample data with Czech names to simulate
 * real student progress data and saves it to localStorage.
 *
 * @returns Mock StudentAnalytics data
 */
export function generateMockStudents(): StudentAnalytics {
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
