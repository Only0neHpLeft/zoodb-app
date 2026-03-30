/**
 * Convex Database API
 *
 * This module provides hooks for reactive data and mutation functions for writes.
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
  userId: string;
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
  teacherUserId: string;
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
  userId: string;
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

export function useProfile(userId: string | undefined) {
  return useQuery(
    api.users.getProfile,
    userId ? { userId } : "skip"
  );
}

export function useUpsertProfile() {
  return useMutation(api.users.upsertProfile);
}

// ============================================================================
// User Settings Hooks
// ============================================================================

export function useSettings(userId: string | undefined) {
  return useQuery(
    api.users.getSettings,
    userId ? { userId } : "skip"
  );
}

export function useUpdateSettings() {
  return useMutation(api.users.updateSettings);
}

// ============================================================================
// Membership Hooks
// ============================================================================

export function useMembership(userId: string | undefined) {
  return useQuery(
    api.memberships.getMembership,
    userId ? { userId } : "skip"
  );
}

export function useGetOrCreateMembership() {
  return useMutation(api.memberships.getOrCreateMembership);
}

export function useUpdateMembership() {
  return useMutation(api.memberships.updateMembership);
}

export function useHasPremiumAccess(userId: string | undefined) {
  return useQuery(
    api.memberships.hasPremiumAccess,
    userId ? { userId } : "skip"
  );
}

// ============================================================================
// Task Progress Hooks
// ============================================================================

export function useStudentProgress(userId: string | undefined) {
  return useQuery(
    api.taskProgress.getStudentProgress,
    userId ? { userId } : "skip"
  );
}

export function useTaskProgress(
  userId: string | undefined,
  categoryLetter: string,
  taskIndex: number
) {
  return useQuery(
    api.taskProgress.getTaskProgress,
    userId ? { userId, categoryLetter, taskIndex } : "skip"
  );
}

export function useCompletionStats(userId: string | undefined) {
  return useQuery(
    api.taskProgress.getCompletionStats,
    userId ? { userId } : "skip"
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

export function useTeacherClasses(teacherUserId: string | undefined) {
  return useQuery(
    api.classes.getTeacherClasses,
    teacherUserId ? { teacherUserId } : "skip"
  );
}

export function useStudentClasses(studentUserId: string | undefined) {
  return useQuery(
    api.classes.getStudentClasses,
    studentUserId ? { studentUserId } : "skip"
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
// Assignments Hooks
// ============================================================================

export function useClassAssignments(classId: Id<"classes"> | undefined) {
  return useQuery(
    api.assignments.getClassAssignments,
    classId ? { classId } : "skip"
  );
}

export function useStudentAssignments(studentUserId: string | undefined) {
  return useQuery(
    api.assignments.getStudentAssignments,
    studentUserId ? { studentUserId } : "skip"
  );
}

export function useCreateAssignment() {
  return useMutation(api.assignments.createAssignment);
}

export function useCreateBulkAssignments() {
  return useMutation(api.assignments.createBulkAssignments);
}

export function useDeleteAssignment() {
  return useMutation(api.assignments.deleteAssignment);
}

// ============================================================================
// Teacher Notes Hooks
// ============================================================================

export function useStudentNotes(
  classId: Id<"classes"> | undefined,
  studentUserId: string | undefined
) {
  return useQuery(
    api.teacherNotes.getStudentNotes,
    classId && studentUserId ? { classId, studentUserId } : "skip"
  );
}

export function useMyNotes(studentUserId: string | undefined) {
  return useQuery(
    api.teacherNotes.getMyNotes,
    studentUserId ? { studentUserId } : "skip"
  );
}

export function useCreateNote() {
  return useMutation(api.teacherNotes.createNote);
}

export function useDeleteNote() {
  return useMutation(api.teacherNotes.deleteNote);
}

// ============================================================================
// Teacher Action Hooks
// ============================================================================

export function useResetCategoryProgress() {
  return useMutation(api.taskProgress.resetCategoryProgress);
}

export function useRemoveStudent() {
  return useMutation(api.classes.removeStudent);
}
