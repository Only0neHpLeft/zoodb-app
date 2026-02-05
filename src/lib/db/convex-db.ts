/**
 * Convex Database API
 *
 * This module provides a Convex-based replacement for the NeonDB functions.
 * It exports hooks for reactive data and mutation functions for writes.
 */

import { useQuery, useMutation } from "convex/react";
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

