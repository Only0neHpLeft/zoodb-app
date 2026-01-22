import { neon } from '@neondatabase/serverless'

// Initialize NeonDB connection
const sql = neon(import.meta.env.VITE_DATABASE_URL)

// SQL Query Sanitization
const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE', 'REPLACE',
  '--', ';--', '/*', '*/', 'XP_', 'SP_', 'WAITFOR', 'SHUTDOWN'
]

const ALLOWED_COMMANDS = ['SELECT', 'WITH', 'EXPLAIN']

/**
 * Validates that a query is safe to execute (SELECT-only for user queries)
 */
function validateQuerySafety(query: string): { safe: boolean; error?: string } {
  const normalizedQuery = query.trim().toUpperCase()

  // Check if query starts with allowed command
  const startsWithAllowed = ALLOWED_COMMANDS.some(cmd =>
    normalizedQuery.startsWith(cmd)
  )

  if (!startsWithAllowed) {
    return {
      safe: false,
      error: 'Only SELECT queries are allowed. Data modification queries are not permitted.'
    }
  }

  // Check for dangerous keywords that could indicate SQL injection
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (normalizedQuery.includes(keyword)) {
      return {
        safe: false,
        error: `Query contains prohibited keyword: ${keyword}`
      }
    }
  }

  // Check for multiple statements (semicolon followed by another statement)
  const statements = query.split(';').filter(s => s.trim().length > 0)
  if (statements.length > 1) {
    return {
      safe: false,
      error: 'Multiple SQL statements are not allowed'
    }
  }

  return { safe: true }
}

// Types
export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role?: 'student' | 'teacher' | 'admin'
  is_admin?: boolean
  language?: 'en' | 'cz'
  theme?: string
  dark_mode?: boolean
  custom_theme_css?: string
  onboarding_completed?: boolean
  last_seen_at?: string
  created_at?: string
  updated_at?: string
}

export interface UserSettings {
  language: 'en' | 'cz'
  theme: string
  dark_mode: boolean
  custom_theme_css: string | null
}

export interface Class {
  id: string
  name: string
  description?: string
  code: string
  teacher_id: string
  language: 'en' | 'cz'
  max_students: number
  is_active: boolean
  allow_join: boolean
  start_date?: string
  end_date?: string
  student_count: number
  created_at: string
  updated_at: string
}

export interface ClassEnrollment {
  id: string
  class_id: string
  student_id: string
  status: 'active' | 'inactive' | 'removed'
  joined_at: string
  removed_at?: string
  removed_by?: string
}

export interface ClassStudent {
  student_id: string
  student_name: string
  student_email: string
  status: 'active' | 'inactive' | 'removed'
  joined_at: string
  tasks_completed: number
  total_attempts: number
  last_active?: string
}

export interface TaskProgressRecord {
  id: string
  user_id: string
  category_letter: string
  task_index: number
  task_id: string
  completed: boolean
  completed_at?: string
  first_attempt_at: string
  last_attempt_at: string
  attempt_count: number
  successful_attempts: number
  hints_used: number
  time_spent_seconds: number
}

export interface UserMembership {
  id: string
  user_id: string
  plan_type: string
  license_key: string | null
  license_status: string | null
  license_expires_at: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Get a profile by user ID
 */
export async function getProfile(userId: string): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    const result = await sql`
      SELECT id, email, full_name, role, is_admin, created_at, updated_at
      FROM user_profiles
      WHERE id = ${userId}
      LIMIT 1
    `

    if (result.length === 0) {
      return { data: null, error: null }
    }

    const row = result[0]
    return {
      data: {
        id: row.id as string,
        email: row.email as string,
        full_name: row.full_name as string | undefined,
        role: row.role as UserProfile['role'],
        is_admin: row.is_admin as boolean | undefined,
        created_at: row.created_at as string | undefined,
        updated_at: row.updated_at as string | undefined,
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Create or update a profile
 */
export async function upsertProfile(
  userId: string,
  email: string,
  fullName?: string,
  role: 'student' | 'teacher' | 'admin' = 'student'
): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    const result = await sql`
      INSERT INTO user_profiles (id, email, full_name, role, created_at, updated_at)
      VALUES (${userId}, ${email}, ${fullName || null}, ${role}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, email, full_name, role, is_admin, created_at, updated_at
    `

    if (result.length === 0) {
      return { data: null, error: null }
    }

    const row = result[0]
    return {
      data: {
        id: row.id as string,
        email: row.email as string,
        full_name: row.full_name as string | undefined,
        role: row.role as UserProfile['role'],
        is_admin: row.is_admin as boolean | undefined,
        created_at: row.created_at as string | undefined,
        updated_at: row.updated_at as string | undefined,
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get membership for a user
 */
export async function getMembership(userId: string): Promise<{ data: UserMembership | null; error: Error | null }> {
  try {
    const result = await sql`
      SELECT id, user_id, plan_type, license_key, license_status, license_expires_at, created_at, updated_at
      FROM user_memberships
      WHERE user_id = ${userId}
      LIMIT 1
    `

    if (result.length === 0) {
      // Create a free membership if none exists
      const newMembership = await sql`
        INSERT INTO user_memberships (user_id, plan_type, created_at, updated_at)
        VALUES (${userId}, 'free', NOW(), NOW())
        RETURNING id, user_id, plan_type, license_key, license_status, license_expires_at, created_at, updated_at
      `

      if (newMembership.length === 0) {
        return { data: null, error: null }
      }

      const row = newMembership[0]
      return {
        data: {
          id: row.id as string,
          user_id: row.user_id as string,
          plan_type: row.plan_type as string,
          license_key: row.license_key as string | null,
          license_status: row.license_status as string | null,
          license_expires_at: row.license_expires_at as string | null,
          created_at: row.created_at as string | null,
          updated_at: row.updated_at as string | null,
        },
        error: null
      }
    }

    const row = result[0]
    return {
      data: {
        id: row.id as string,
        user_id: row.user_id as string,
        plan_type: row.plan_type as string,
        license_key: row.license_key as string | null,
        license_status: row.license_status as string | null,
        license_expires_at: row.license_expires_at as string | null,
        created_at: row.created_at as string | null,
        updated_at: row.updated_at as string | null,
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Update membership for a user
 */
export async function updateMembership(
  userId: string,
  planType: string,
  licenseKey?: string,
  licenseStatus?: string,
  expiresAt?: string
): Promise<{ data: UserMembership | null; error: Error | null }> {
  try {
    const result = await sql`
      UPDATE user_memberships
      SET
        plan_type = ${planType},
        license_key = ${licenseKey || null},
        license_status = ${licenseStatus || null},
        license_expires_at = ${expiresAt || null},
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING id, user_id, plan_type, license_key, license_status, license_expires_at, created_at, updated_at
    `

    if (result.length === 0) {
      return { data: null, error: new Error('Membership not found') }
    }

    const row = result[0]
    return {
      data: {
        id: row.id as string,
        user_id: row.user_id as string,
        plan_type: row.plan_type as string,
        license_key: row.license_key as string | null,
        license_status: row.license_status as string | null,
        license_expires_at: row.license_expires_at as string | null,
        created_at: row.created_at as string | null,
        updated_at: row.updated_at as string | null,
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Execute a SQL query (for data pages)
 * Validates query safety before execution - only SELECT queries allowed
 */
export async function executeSQL<T = Record<string, unknown>>(
  query: string
): Promise<{ data: T[] | null; error: Error | null }> {
  // Validate query safety before execution
  const validation = validateQuerySafety(query)
  if (!validation.safe) {
    return { data: null, error: new Error(validation.error) }
  }

  try {
    // Use sql() directly for dynamic queries - Neon serverless returns a callable function
    const result = await sql(query)
    return { data: result as T[], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Execute a raw SQL query (for SQL editor)
 * Validates query safety before execution - only SELECT queries allowed
 */
export async function executeRawSQL<T = Record<string, unknown>>(
  query: string
): Promise<{ data: T[] | null; error: Error | null }> {
  // Validate query safety before execution
  const validation = validateQuerySafety(query)
  if (!validation.safe) {
    return { data: null, error: new Error(validation.error) }
  }

  try {
    // Use sql() directly for dynamic queries - Neon serverless returns a callable function
    const result = await sql(query)
    return { data: result as T[], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Fork template data for a new user
 */
export async function forkTemplateData(userId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Copy template data (where user_id IS NULL) to user's data
    await sql`
      INSERT INTO zvirata (user_id, druh, jmeno, vaha, narozen, spotreba)
      SELECT ${userId}, druh, jmeno, vaha, narozen, spotreba
      FROM zvirata WHERE user_id IS NULL
    `
    await sql`
      INSERT INTO druhy (user_id, nazev, vaha_min, vaha_max)
      SELECT ${userId}, nazev, vaha_min, vaha_max
      FROM druhy WHERE user_id IS NULL
    `
    await sql`
      INSERT INTO osetrovatele (user_id, jmeno, narozen)
      SELECT ${userId}, jmeno, narozen
      FROM osetrovatele WHERE user_id IS NULL
    `
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * Delete all user data
 */
export async function deleteUserData(userId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    await sql`DELETE FROM ma_rad WHERE user_id = ${userId}`
    await sql`DELETE FROM osetruje WHERE user_id = ${userId}`
    await sql`DELETE FROM zvirata WHERE user_id = ${userId}`
    await sql`DELETE FROM osetrovatele WHERE user_id = ${userId}`
    await sql`DELETE FROM druhy WHERE user_id = ${userId}`
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * Reset user database to template state
 */
export async function resetUserDatabase(userId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Delete existing user data
    const deleteResult = await deleteUserData(userId)
    if (deleteResult.error) {
      return deleteResult
    }

    // Fork fresh template data
    return await forkTemplateData(userId)
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * Get template counts for schema display
 */
export async function getTemplateCounts(language: string): Promise<{
  animals: number
  types: number
  caretakers: number
  food: number
}> {
  try {
    const isCs = language === 'cs' || language === 'cz'

    const [animals, types, caretakers] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM ${isCs ? sql`zvirata` : sql`animals`} WHERE user_id IS NULL`,
      sql`SELECT COUNT(*) as count FROM ${isCs ? sql`druhy` : sql`types`} WHERE user_id IS NULL`,
      sql`SELECT COUNT(*) as count FROM ${isCs ? sql`osetrovatele` : sql`caretakers`} WHERE user_id IS NULL`,
    ])

    return {
      animals: Number(animals[0]?.count || 0),
      types: Number(types[0]?.count || 0),
      caretakers: Number(caretakers[0]?.count || 0),
      food: 0,
    }
  } catch {
    return { animals: 0, types: 0, caretakers: 0, food: 0 }
  }
}

// user_profiles table with clerk_id column for Clerk user ID mapping

/**
 * Get user settings from user_profiles table
 */
export async function getUserSettings(clerkId: string): Promise<{ data: UserSettings | null; error: Error | null }> {
  try {
    const result = await sql`
      SELECT language, theme, dark_mode, custom_theme_css
      FROM user_profiles
      WHERE clerk_id = ${clerkId}
    `
    if (result.length === 0) return { data: null, error: null }
    return {
      data: {
        language: result[0].language as 'en' | 'cz',
        theme: result[0].theme as string,
        dark_mode: result[0].dark_mode as boolean,
        custom_theme_css: result[0].custom_theme_css as string | null,
      },
      error: null,
    }
  } catch (error) {
    console.error('Failed to get user settings:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update user settings in user_profiles table
 * Creates a new record if one doesn't exist for this clerk_id
 */
export async function updateUserSettings(
  clerkId: string,
  settings: Partial<UserSettings>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Check if user profile exists
    const existing = await sql`
      SELECT id FROM user_profiles WHERE clerk_id = ${clerkId}
    `

    if (existing.length === 0) {
      // Create new profile
      await sql`
        INSERT INTO user_profiles (clerk_id, language, theme, dark_mode, custom_theme_css)
        VALUES (
          ${clerkId},
          ${settings.language || 'en'},
          ${settings.theme || 'caffeine'},
          ${settings.dark_mode ?? false},
          ${settings.customThemeCss || null}
        )
      `
    } else {
      // Update existing profile - only update provided fields
      if (settings.language !== undefined) {
        await sql`UPDATE user_profiles SET language = ${settings.language} WHERE clerk_id = ${clerkId}`
      }
      if (settings.theme !== undefined) {
        await sql`UPDATE user_profiles SET theme = ${settings.theme} WHERE clerk_id = ${clerkId}`
      }
      if (settings.dark_mode !== undefined) {
        await sql`UPDATE user_profiles SET dark_mode = ${settings.dark_mode} WHERE clerk_id = ${clerkId}`
      }
      if (settings.customThemeCss !== undefined) {
        await sql`UPDATE user_profiles SET custom_theme_css = ${settings.customThemeCss} WHERE clerk_id = ${clerkId}`
      }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Failed to update user settings:', error)
    return { success: false, error: error as Error }
  }
}

// task_progress table exists in NeonDB
const TASK_PROGRESS_TABLE_EXISTS = true

/**
 * Save task progress to database
 */
export async function saveTaskProgress(
  userId: string,
  categoryLetter: string,
  taskIndex: number,
  progress: {
    completed?: boolean
    attemptCount?: number
    successfulAttempts?: number
    hintsUsed?: number
    timeSpentSeconds?: number
  }
): Promise<{ success: boolean; error: Error | null }> {
  if (!TASK_PROGRESS_TABLE_EXISTS) {
    return { success: true, error: null }
  }

  try {
    const taskId = `${categoryLetter}-${taskIndex}`

    await sql`
      INSERT INTO task_progress (
        user_id, category_letter, task_index, task_id,
        completed, attempt_count, successful_attempts, hints_used, time_spent_seconds
      )
      VALUES (
        ${userId}, ${categoryLetter}, ${taskIndex}, ${taskId},
        ${progress.completed ?? false},
        ${progress.attemptCount ?? 0},
        ${progress.successfulAttempts ?? 0},
        ${progress.hintsUsed ?? 0},
        ${progress.timeSpentSeconds ?? 0}
      )
      ON CONFLICT (user_id, category_letter, task_index)
      DO UPDATE SET
        completed = COALESCE(EXCLUDED.completed, task_progress.completed),
        attempt_count = task_progress.attempt_count + COALESCE(EXCLUDED.attempt_count, 0),
        successful_attempts = task_progress.successful_attempts + COALESCE(EXCLUDED.successful_attempts, 0),
        hints_used = task_progress.hints_used + COALESCE(EXCLUDED.hints_used, 0),
        time_spent_seconds = task_progress.time_spent_seconds + COALESCE(EXCLUDED.time_spent_seconds, 0),
        last_attempt_at = NOW()
    `

    return { success: true, error: null }
  } catch (error) {
    console.error('Failed to save task progress:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Get student task progress from database
 */
export async function getStudentTaskProgress(
  userId: string
): Promise<{ data: TaskProgressRecord[] | null; error: Error | null }> {
  if (!TASK_PROGRESS_TABLE_EXISTS) {
    return { data: [], error: null }
  }

  try {
    const result = await sql`
      SELECT
        id, user_id, category_letter, task_index, task_id,
        completed, completed_at, first_attempt_at, last_attempt_at,
        attempt_count, successful_attempts, hints_used, time_spent_seconds
      FROM task_progress
      WHERE user_id = ${userId}
      ORDER BY category_letter, task_index
    `

    return { data: result as TaskProgressRecord[], error: null }
  } catch (error) {
    console.error('Failed to get task progress:', error)
    return { data: [], error: error as Error }
  }
}

// classes and class_enrollments tables exist in NeonDB
const CLASSES_TABLE_EXISTS = true

/**
 * Get internal user_profiles.id from Clerk user ID
 * Returns null if user not found
 */
async function getUserIdFromClerkId(clerkId: string): Promise<number | null> {
  try {
    const result = await sql`
      SELECT id FROM user_profiles WHERE clerk_id = ${clerkId} LIMIT 1
    `
    return result.length > 0 ? result[0].id as number : null
  } catch (error) {
    console.error('Failed to get user ID from clerk ID:', error)
    return null
  }
}

/**
 * Create a new class
 */
export async function createClass(
  clerkId: string,
  name: string,
  options?: { description?: string; language?: 'en' | 'cz'; maxStudents?: number }
): Promise<{ data: Class | null; error: Error | null }> {
  if (!CLASSES_TABLE_EXISTS) {
    return { data: null, error: new Error('Classes feature not yet available') }
  }

  try {
    // Get internal user ID from Clerk ID
    const teacherId = await getUserIdFromClerkId(clerkId)
    if (!teacherId) {
      return { data: null, error: new Error('User profile not found') }
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const description = options?.description || null
    const language = options?.language || 'en'
    const maxStudents = options?.maxStudents || 30

    const result = await sql`
      INSERT INTO classes (teacher_id, name, description, code, language, max_students)
      VALUES (${teacherId}, ${name}, ${description}, ${code}, ${language}, ${maxStudents})
      RETURNING *
    `

    return { data: result[0] as Class, error: null }
  } catch (error) {
    console.error('Failed to create class:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Join a class with a code
 */
export async function joinClass(
  clerkId: string,
  classCode: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!CLASSES_TABLE_EXISTS) {
    return { success: false, error: new Error('Classes feature not yet available') }
  }

  try {
    // Get internal user ID from Clerk ID
    const studentId = await getUserIdFromClerkId(clerkId)
    if (!studentId) {
      return { success: false, error: new Error('User profile not found') }
    }

    const classResult = await sql`
      SELECT id FROM classes WHERE code = ${classCode} AND is_active = true AND allow_join = true
    `

    if (classResult.length === 0) {
      return { success: false, error: new Error('Invalid or inactive class code') }
    }

    await sql`
      INSERT INTO class_enrollments (class_id, student_id, status)
      VALUES (${classResult[0].id}, ${studentId}, 'active')
      ON CONFLICT (class_id, student_id) DO UPDATE SET status = 'active'
    `

    return { success: true, error: null }
  } catch (error) {
    console.error('Failed to join class:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Get classes where user is teacher
 */
export async function getTeacherClasses(
  clerkId: string
): Promise<{ data: Class[] | null; error: Error | null }> {
  if (!CLASSES_TABLE_EXISTS) {
    return { data: [], error: null }
  }

  try {
    // Get internal user ID from Clerk ID
    const teacherId = await getUserIdFromClerkId(clerkId)
    if (!teacherId) {
      return { data: [], error: null }
    }

    const result = await sql`
      SELECT c.*, COALESCE(COUNT(ce.id), 0) as student_count
      FROM classes c
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.status = 'active'
      WHERE c.teacher_id = ${teacherId}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `

    return { data: result as Class[], error: null }
  } catch (error) {
    console.error('Failed to get teacher classes:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * Get classes where user is enrolled as student
 */
export async function getStudentClasses(
  clerkId: string
): Promise<{ data: Class[] | null; error: Error | null }> {
  if (!CLASSES_TABLE_EXISTS) {
    return { data: [], error: null }
  }

  try {
    // Get internal user ID from Clerk ID
    const studentId = await getUserIdFromClerkId(clerkId)
    if (!studentId) {
      return { data: [], error: null }
    }

    const result = await sql`
      SELECT c.*
      FROM classes c
      JOIN class_enrollments ce ON c.id = ce.class_id
      WHERE ce.student_id = ${studentId} AND ce.status = 'active'
      ORDER BY c.name
    `

    return { data: result as Class[], error: null }
  } catch (error) {
    console.error('Failed to get student classes:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * Get students in a class
 */
export async function getClassStudents(
  classId: string
): Promise<{ data: ClassStudent[] | null; error: Error | null }> {
  if (!CLASSES_TABLE_EXISTS) {
    return { data: [], error: null }
  }

  try {
    const result = await sql`
      SELECT
        ce.student_id,
        COALESCE(p.full_name, p.email) as student_name,
        p.email as student_email,
        ce.status,
        ce.joined_at,
        COALESCE(tp.tasks_completed, 0) as tasks_completed,
        COALESCE(tp.total_attempts, 0) as total_attempts,
        tp.last_active
      FROM class_enrollments ce
      JOIN user_profiles p ON ce.student_id = p.id
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE completed) as tasks_completed,
          SUM(attempt_count) as total_attempts,
          MAX(last_attempt_at) as last_active
        FROM task_progress
        GROUP BY user_id
      ) tp ON ce.student_id = tp.user_id
      WHERE ce.class_id = ${classId}
      ORDER BY student_name
    `

    return { data: result as ClassStudent[], error: null }
  } catch (error) {
    console.error('Failed to get class students:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * Leave a class
 */
export async function leaveClass(
  clerkId: string,
  classId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!CLASSES_TABLE_EXISTS) {
    return { success: false, error: new Error('Classes feature not yet available') }
  }

  try {
    // Get internal user ID from Clerk ID
    const studentId = await getUserIdFromClerkId(clerkId)
    if (!studentId) {
      return { success: false, error: new Error('User profile not found') }
    }

    await sql`
      UPDATE class_enrollments
      SET status = 'inactive', removed_at = NOW()
      WHERE student_id = ${studentId} AND class_id = ${classId}
    `

    return { success: true, error: null }
  } catch (error) {
    console.error('Failed to leave class:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Delete a class (teacher only)
 */
export async function deleteClass(
  clerkId: string,
  classId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!CLASSES_TABLE_EXISTS) {
    return { success: false, error: new Error('Classes feature not yet available') }
  }

  try {
    // Get internal user ID from Clerk ID
    const teacherId = await getUserIdFromClerkId(clerkId)
    if (!teacherId) {
      return { success: false, error: new Error('User profile not found') }
    }

    await sql`
      DELETE FROM classes
      WHERE id = ${classId} AND teacher_id = ${teacherId}
    `

    return { success: true, error: null }
  } catch (error) {
    console.error('Failed to delete class:', error)
    return { success: false, error: error as Error }
  }
}
