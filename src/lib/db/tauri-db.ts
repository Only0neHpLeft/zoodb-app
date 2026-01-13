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
  created_at?: string
  updated_at?: string
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
    const result = await sql.query(query)
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
    const result = await sql.query(query)
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
