// Stub implementations for frontend-only mode
// These functions return empty/mock data since no backend is available

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
  id: number
  user_id: string
  plan_type: string
  license_key: string | null
  license_status: string | null
  license_expires_at: string | null
  created_at: string | null
  updated_at: string | null
}

interface TemplateCounts {
  animals: number
  types: number
  caretakers: number
  food: number
}

/**
 * Execute a SQL query (stub - returns empty data)
 */
export async function executeSQL<T = Record<string, unknown>>(
  query: string,
  _userId: string = ''
): Promise<{ data: T[] | null; error: Error | null }> {
  console.log('SQL query (stub):', query)
  return { data: [], error: null }
}

/**
 * Execute a raw SQL query (stub - returns empty data)
 */
export async function executeRawSQL<T = Record<string, unknown>>(
  query: string,
  _userId: string = ''
): Promise<{ data: T[] | null; error: Error | null }> {
  console.log('Raw SQL query (stub):', query)
  return { data: [], error: null }
}

/**
 * Get template counts for schema display (stub)
 */
export async function getTemplateCounts(_language: string): Promise<TemplateCounts> {
  return { animals: 10, types: 5, caretakers: 3, food: 8 }
}
