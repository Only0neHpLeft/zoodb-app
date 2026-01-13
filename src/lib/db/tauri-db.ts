import { invoke } from '@tauri-apps/api/core'

// Types matching the Rust structs (using undefined for optional fields to match existing interfaces)
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

// Raw result from Rust (uses null for optional values)
interface RawUserProfile {
  id: string
  email: string
  full_name: string | null
  role: string | null
  created_at: string | null
  updated_at: string | null
}

interface ProfileResult {
  data: RawUserProfile | null
  error: string | null
}

interface MembershipResult {
  data: UserMembership | null
  error: string | null
}

interface QueryResult {
  data: Record<string, unknown>[] | null
  error: string | null
}

interface DataResult {
  success: boolean
  error: string | null
}

interface TemplateCounts {
  animals: number
  types: number
  caretakers: number
  food: number
}

/**
 * Get a profile by user ID
 */
export async function getProfile(userId: string): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    const result = await invoke<ProfileResult>('get_profile', { userId })
    if (result.error) {
      return { data: null, error: new Error(result.error) }
    }
    if (result.data) {
      // Convert null values to undefined to match existing interface
      return {
        data: {
          id: result.data.id,
          email: result.data.email,
          full_name: result.data.full_name || undefined,
          role: (result.data.role as UserProfile['role']) || undefined,
          created_at: result.data.created_at || undefined,
          updated_at: result.data.updated_at || undefined,
        },
        error: null
      }
    }
    return { data: null, error: null }
  } catch (error) {
    console.error('Error fetching profile:', error)
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
    const result = await invoke<ProfileResult>('upsert_profile', {
      userId,
      email,
      fullName: fullName || null,
      role
    })
    if (result.error) {
      return { data: null, error: new Error(result.error) }
    }
    if (result.data) {
      // Convert null values to undefined to match existing interface
      return {
        data: {
          id: result.data.id,
          email: result.data.email,
          full_name: result.data.full_name || undefined,
          role: (result.data.role as UserProfile['role']) || undefined,
          created_at: result.data.created_at || undefined,
          updated_at: result.data.updated_at || undefined,
        },
        error: null
      }
    }
    return { data: null, error: null }
  } catch (error) {
    console.error('Error upserting profile:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get membership for a user
 */
export async function getMembership(userId: string): Promise<{ data: UserMembership | null; error: Error | null }> {
  try {
    const result = await invoke<MembershipResult>('get_membership', { userId })
    if (result.error) {
      return { data: null, error: new Error(result.error) }
    }
    return { data: result.data, error: null }
  } catch (error) {
    console.error('Error fetching membership:', error)
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
    const result = await invoke<MembershipResult>('update_membership', {
      userId,
      planType,
      licenseKey: licenseKey || null,
      licenseStatus: licenseStatus || null,
      expiresAt: expiresAt || null
    })
    if (result.error) {
      return { data: null, error: new Error(result.error) }
    }
    return { data: result.data, error: null }
  } catch (error) {
    console.error('Error updating membership:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Execute a SQL query
 */
export async function executeSQL<T = Record<string, unknown>>(
  query: string,
  userId: string = ''
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    const result = await invoke<QueryResult>('execute_sql', { query, userId })
    if (result.error) {
      return { data: null, error: new Error(result.error) }
    }
    return { data: result.data as T[] | null, error: null }
  } catch (error) {
    console.error('NeonDB query error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Execute a raw SQL query (for SQL editor)
 */
export async function executeRawSQL<T = Record<string, unknown>>(
  query: string,
  userId: string = ''
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    const result = await invoke<QueryResult>('execute_raw_sql', { query, userId })
    if (result.error) {
      return { data: null, error: new Error(result.error) }
    }
    return { data: result.data as T[] | null, error: null }
  } catch (error) {
    console.error('NeonDB query error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fork template data for a new user
 */
export async function forkTemplateData(userId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const result = await invoke<DataResult>('fork_template_data', { userId })
    if (result.error) {
      return { success: false, error: new Error(result.error) }
    }
    return { success: result.success, error: null }
  } catch (error) {
    console.error('Error forking template data:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Delete all user data
 */
export async function deleteUserData(userId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const result = await invoke<DataResult>('delete_user_data', { userId })
    if (result.error) {
      return { success: false, error: new Error(result.error) }
    }
    return { success: result.success, error: null }
  } catch (error) {
    console.error('Error deleting user data:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Reset user database to template state
 */
export async function resetUserDatabase(userId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const result = await invoke<DataResult>('reset_user_database', { userId })
    if (result.error) {
      return { success: false, error: new Error(result.error) }
    }
    return { success: result.success, error: null }
  } catch (error) {
    console.error('Error resetting user database:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Get template counts for schema display
 */
export async function getTemplateCounts(language: string): Promise<TemplateCounts> {
  try {
    return await invoke<TemplateCounts>('get_template_counts', { language })
  } catch (error) {
    console.error('Error getting template counts:', error)
    return { animals: 0, types: 0, caretakers: 0, food: 0 }
  }
}
