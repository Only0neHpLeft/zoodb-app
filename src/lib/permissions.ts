// lib/permissions.ts
// Role-based access control utilities

export type UserRole = 'student' | 'teacher' | 'admin'

export interface UserProfile {
  role?: UserRole
  is_admin?: boolean
}

/**
 * Check if user has teacher role or higher (teacher or admin)
 */
export function canAccessStudents(profile: UserProfile | null): boolean {
  if (!profile) return false

  // Admin can access everything
  if (profile.is_admin) return true

  // Teacher can access students
  if (profile.role === 'teacher') return true

  // Student cannot access
  return false
}

/**
 * Check if user can access classes (both teachers and students)
 */
export function canAccessClasses(profile: UserProfile | null): boolean {
  if (!profile) return false

  // All authenticated users with a profile can access classes
  // Teachers can create classes, students can join them
  return true
}

/**
 * Check if user is an admin
 */
export function isAdmin(profile: UserProfile | null): boolean {
  return profile?.is_admin === true
}

/**
 * Check if user is a teacher
 */
export function isTeacher(profile: UserProfile | null): boolean {
  return profile?.role === 'teacher'
}

/**
 * Check if user is a student
 */
export function isStudent(profile: UserProfile | null): boolean {
  return profile?.role === 'student' || !profile?.role
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role?: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator'
    case 'teacher':
      return 'Teacher'
    case 'student':
      return 'Student'
    default:
      return 'Student'
  }
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role?: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
    case 'teacher':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    case 'student':
      return 'bg-green-500/10 text-green-600 dark:text-green-400'
    default:
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
  }
}
