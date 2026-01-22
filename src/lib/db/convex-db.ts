/**
 * Convex Database API
 *
 * This module provides a Convex-based replacement for the NeonDB functions.
 * It exports hooks for reactive data and mutation functions for writes.
 */

import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// Re-export types for compatibility
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  role: "student" | "teacher" | "admin";
  isAdmin?: boolean;
  language?: "en" | "cz";
  theme?: string;
  darkMode?: boolean;
  customThemeCss?: string;
  onboardingCompleted?: boolean;
  lastSeenAt?: number;
}

export interface UserSettings {
  language: "en" | "cz";
  theme: string;
  darkMode: boolean;
  customThemeCss: string | null;
}

export interface UserMembership {
  id: string;
  clerkId: string;
  planType: string;
  licenseKey?: string;
  licenseStatus?: string;
  licenseExpiresAt?: number;
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  code: string;
  teacherClerkId: string;
  language: "en" | "cz";
  maxStudents: number;
  isActive: boolean;
  allowJoin: boolean;
  startDate?: number;
  endDate?: number;
  studentCount?: number;
}

export interface ClassStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: "active" | "inactive" | "removed";
  joinedAt: number;
  tasksCompleted: number;
  totalAttempts: number;
  lastActive?: number;
}

export interface TaskProgressRecord {
  id: string;
  clerkId: string;
  categoryLetter: string;
  taskIndex: number;
  taskId: string;
  completed: boolean;
  completedAt?: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  attemptCount: number;
  successfulAttempts: number;
  hintsUsed: number;
  timeSpentSeconds: number;
}

// ============================================================================
// User Profile Hooks
// ============================================================================

export function useProfile(clerkId: string | undefined) {
  return useQuery(
    api.users.getProfile,
    clerkId ? { clerkId } : "skip"
  );
}

export function useUpsertProfile() {
  return useMutation(api.users.upsertProfile);
}

// ============================================================================
// User Settings Hooks
// ============================================================================

export function useSettings(clerkId: string | undefined) {
  return useQuery(
    api.users.getSettings,
    clerkId ? { clerkId } : "skip"
  );
}

export function useUpdateSettings() {
  return useMutation(api.users.updateSettings);
}

// ============================================================================
// Membership Hooks
// ============================================================================

export function useMembership(clerkId: string | undefined) {
  return useQuery(
    api.memberships.getMembership,
    clerkId ? { clerkId } : "skip"
  );
}

export function useGetOrCreateMembership() {
  return useMutation(api.memberships.getOrCreateMembership);
}

export function useUpdateMembership() {
  return useMutation(api.memberships.updateMembership);
}

export function useHasPremiumAccess(clerkId: string | undefined) {
  return useQuery(
    api.memberships.hasPremiumAccess,
    clerkId ? { clerkId } : "skip"
  );
}

// ============================================================================
// Task Progress Hooks
// ============================================================================

export function useStudentProgress(clerkId: string | undefined) {
  return useQuery(
    api.taskProgress.getStudentProgress,
    clerkId ? { clerkId } : "skip"
  );
}

export function useTaskProgress(
  clerkId: string | undefined,
  categoryLetter: string,
  taskIndex: number
) {
  return useQuery(
    api.taskProgress.getTaskProgress,
    clerkId ? { clerkId, categoryLetter, taskIndex } : "skip"
  );
}

export function useCompletionStats(clerkId: string | undefined) {
  return useQuery(
    api.taskProgress.getCompletionStats,
    clerkId ? { clerkId } : "skip"
  );
}

export function useSaveTaskProgress() {
  return useMutation(api.taskProgress.saveTaskProgress);
}

export function useResetStudentProgress() {
  return useMutation(api.taskProgress.resetStudentProgress);
}

// ============================================================================
// Classes Hooks
// ============================================================================

export function useTeacherClasses(teacherClerkId: string | undefined) {
  return useQuery(
    api.classes.getTeacherClasses,
    teacherClerkId ? { teacherClerkId } : "skip"
  );
}

export function useStudentClasses(studentClerkId: string | undefined) {
  return useQuery(
    api.classes.getStudentClasses,
    studentClerkId ? { studentClerkId } : "skip"
  );
}

export function useClassStudents(classId: Id<"classes"> | undefined) {
  return useQuery(
    api.classes.getClassStudents,
    classId ? { classId } : "skip"
  );
}

export function useClass(classId: Id<"classes"> | undefined) {
  return useQuery(
    api.classes.getClass,
    classId ? { classId } : "skip"
  );
}

export function useCreateClass() {
  return useMutation(api.classes.createClass);
}

export function useJoinClass() {
  return useMutation(api.classes.joinClass);
}

export function useLeaveClass() {
  return useMutation(api.classes.leaveClass);
}

export function useDeleteClass() {
  return useMutation(api.classes.deleteClass);
}

export function useUpdateClass() {
  return useMutation(api.classes.updateClass);
}

// ============================================================================
// Imperative API (for gradual migration)
// These functions can be used outside of React components
// ============================================================================

import { ConvexHttpClient } from "convex/browser";

let httpClient: ConvexHttpClient | null = null;

function getHttpClient(): ConvexHttpClient {
  if (!httpClient) {
    httpClient = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL as string);
  }
  return httpClient;
}

// Legacy profile format
export interface LegacyUserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: "student" | "teacher" | "admin";
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

function transformProfileToLegacy(data: any): LegacyUserProfile {
  return {
    id: data.clerkId,
    email: data.email,
    full_name: data.fullName,
    role: data.role,
    is_admin: data.isAdmin,
    created_at: data._creationTime ? new Date(data._creationTime).toISOString() : undefined,
    updated_at: data._creationTime ? new Date(data._creationTime).toISOString() : undefined,
  };
}

// Profile functions
export async function getProfile(clerkId: string): Promise<{ data: LegacyUserProfile | null; error: Error | null }> {
  try {
    const client = getHttpClient();
    const data = await client.query(api.users.getProfile, { clerkId });
    return { data: data ? transformProfileToLegacy(data) : null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function upsertProfile(
  clerkId: string,
  email: string,
  fullName?: string,
  role?: "student" | "teacher" | "admin"
): Promise<{ data: LegacyUserProfile | null; error: Error | null }> {
  try {
    const client = getHttpClient();
    const data = await client.mutation(api.users.upsertProfile, {
      clerkId,
      email,
      fullName,
      role,
    });
    return { data: data ? transformProfileToLegacy(data) : null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// Settings functions
export async function getUserSettings(clerkId: string) {
  try {
    const client = getHttpClient();
    const data = await client.query(api.users.getSettings, { clerkId });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function updateUserSettings(
  clerkId: string,
  settings: Partial<UserSettings>
) {
  try {
    const client = getHttpClient();
    await client.mutation(api.users.updateSettings, {
      clerkId,
      language: settings.language,
      theme: settings.theme,
      darkMode: settings.darkMode,
      customThemeCss: settings.customThemeCss ?? undefined,
    });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Legacy membership format for compatibility
export interface LegacyMembership {
  id: string;
  user_id: string;
  plan_type: string;
  license_key: string | null;
  license_status: string | null;
  license_expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function transformMembershipToLegacy(data: any): LegacyMembership {
  return {
    id: data._id,
    user_id: data.clerkId,
    plan_type: data.planType,
    license_key: data.licenseKey || null,
    license_status: data.licenseStatus || null,
    license_expires_at: data.licenseExpiresAt
      ? new Date(data.licenseExpiresAt).toISOString()
      : null,
    created_at: data._creationTime
      ? new Date(data._creationTime).toISOString()
      : null,
    updated_at: data._creationTime
      ? new Date(data._creationTime).toISOString()
      : null,
  };
}

// Membership functions
export async function getMembership(clerkId: string): Promise<{ data: LegacyMembership | null; error: Error | null }> {
  try {
    const client = getHttpClient();
    let data = await client.query(api.memberships.getMembership, { clerkId });
    if (!data) {
      // Create free membership if none exists
      data = await client.mutation(api.memberships.getOrCreateMembership, { clerkId });
    }
    return { data: data ? transformMembershipToLegacy(data) : null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function updateMembership(
  clerkId: string,
  planType: string,
  licenseKey?: string,
  licenseStatus?: string,
  expiresAt?: string
): Promise<{ data: LegacyMembership | null; error: Error | null }> {
  try {
    const client = getHttpClient();
    const data = await client.mutation(api.memberships.updateMembership, {
      clerkId,
      planType,
      licenseKey,
      licenseStatus,
      licenseExpiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
    });
    return { data: data ? transformMembershipToLegacy(data) : null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// Task Progress functions
// This signature matches the existing tauri-db interface
export async function saveTaskProgress(
  clerkId: string,
  categoryLetter: string,
  taskIndex: number,
  progress: {
    completed?: boolean;
    attemptCount?: number;
    successfulAttempts?: number;
    hintsUsed?: number;
    timeSpentSeconds?: number;
  }
) {
  try {
    const client = getHttpClient();
    const taskId = `${categoryLetter}-${taskIndex}`;
    await client.mutation(api.taskProgress.saveTaskProgress, {
      clerkId,
      categoryLetter,
      taskIndex,
      taskId,
      completed: progress.completed ?? false,
      hintsUsed: progress.hintsUsed,
      timeSpentSeconds: progress.timeSpentSeconds,
    });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Legacy format for compatibility with existing code
export interface LegacyTaskProgressRecord {
  id: string;
  user_id: string;
  category_letter: string;
  task_index: number;
  task_id: string;
  completed: boolean;
  completed_at: string | null;
  first_attempt_at: string;
  last_attempt_at: string;
  attempt_count: number;
  successful_attempts: number;
  hints_used: number;
  time_spent_seconds: number;
}

export async function getStudentTaskProgress(clerkId: string): Promise<{ data: LegacyTaskProgressRecord[]; error: Error | null }> {
  try {
    const client = getHttpClient();
    const data = await client.query(api.taskProgress.getStudentProgress, { clerkId });

    // Transform to legacy format with snake_case
    const legacyData: LegacyTaskProgressRecord[] = (data || []).map((record: any) => ({
      id: record._id,
      user_id: record.clerkId,
      category_letter: record.categoryLetter,
      task_index: record.taskIndex,
      task_id: record.taskId,
      completed: record.completed,
      completed_at: record.completedAt ? new Date(record.completedAt).toISOString() : null,
      first_attempt_at: new Date(record.firstAttemptAt).toISOString(),
      last_attempt_at: new Date(record.lastAttemptAt).toISOString(),
      attempt_count: record.attemptCount,
      successful_attempts: record.successfulAttempts,
      hints_used: record.hintsUsed,
      time_spent_seconds: record.timeSpentSeconds,
    }));

    return { data: legacyData, error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

// Legacy class format transformations
function transformClassToLegacy(data: any): Class {
  return {
    id: data._id,
    name: data.name,
    description: data.description,
    code: data.code,
    teacherClerkId: data.teacherClerkId,
    language: data.language,
    maxStudents: data.maxStudents,
    isActive: data.isActive,
    allowJoin: data.allowJoin,
    startDate: data.startDate,
    endDate: data.endDate,
    studentCount: data.studentCount ?? 0,
  };
}

function transformClassStudentToLegacy(data: any): ClassStudent {
  return {
    studentId: data.studentId,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    status: data.status,
    joinedAt: data.joinedAt,
    tasksCompleted: data.tasksCompleted,
    totalAttempts: data.totalAttempts,
    lastActive: data.lastActive,
  };
}

// Class functions
export async function createClass(
  teacherClerkId: string,
  name: string,
  options?: { description?: string; language?: "en" | "cz"; maxStudents?: number }
): Promise<{ data: Class | null; error: Error | null }> {
  try {
    const client = getHttpClient();
    const data = await client.mutation(api.classes.createClass, {
      teacherClerkId,
      name,
      description: options?.description,
      language: options?.language,
      maxStudents: options?.maxStudents,
    });
    return { data: data ? transformClassToLegacy(data) : null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function joinClass(studentClerkId: string, classCode: string): Promise<{ data: { enrolled: boolean } | null; success: boolean; error: Error | null }> {
  try {
    const client = getHttpClient();
    await client.mutation(api.classes.joinClass, {
      studentClerkId,
      classCode,
    });
    return { data: { enrolled: true }, success: true, error: null };
  } catch (error) {
    return { data: null, success: false, error: error as Error };
  }
}

export async function getTeacherClasses(teacherClerkId: string): Promise<{ data: Class[]; error: Error | null }> {
  try {
    const client = getHttpClient();
    const data = await client.query(api.classes.getTeacherClasses, { teacherClerkId });
    return { data: (data || []).map(transformClassToLegacy), error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

export async function getStudentClasses(studentClerkId: string): Promise<{ data: (Class & { joined_at: string })[]; error: Error | null }> {
  try {
    const client = getHttpClient();
    const data = await client.query(api.classes.getStudentClasses, { studentClerkId });
    const transformed = (data || [])
      .filter((item: any) => item !== null)
      .map((item: any) => ({
        ...transformClassToLegacy(item),
        joined_at: item.joinedAt ? new Date(item.joinedAt).toISOString() : new Date().toISOString(),
      }));
    return { data: transformed, error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

export async function getClassStudents(classId: string): Promise<{ data: ClassStudent[]; error: Error | null }> {
  try {
    const client = getHttpClient();
    const data = await client.query(api.classes.getClassStudents, {
      classId: classId as Id<"classes">
    });
    return { data: (data || []).map(transformClassStudentToLegacy), error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

export async function leaveClass(studentClerkId: string, classId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const client = getHttpClient();
    await client.mutation(api.classes.leaveClass, {
      studentClerkId,
      classId: classId as Id<"classes">,
    });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export async function deleteClass(teacherClerkId: string, classId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const client = getHttpClient();
    await client.mutation(api.classes.deleteClass, {
      teacherClerkId,
      classId: classId as Id<"classes">,
    });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
