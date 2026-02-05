import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles
  userProfiles: defineTable({
    userId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")),
    isAdmin: v.optional(v.boolean()),
    // Settings (merged into profile)
    language: v.optional(v.union(v.literal("en"), v.literal("cz"))),
    theme: v.optional(v.string()),
    darkMode: v.optional(v.boolean()),
    customThemeCss: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"]),

  // User memberships / subscriptions
  userMemberships: defineTable({
    userId: v.string(),
    planType: v.string(), // 'free', 'pro', 'enterprise', etc.
    licenseKey: v.optional(v.string()),
    licenseStatus: v.optional(v.string()),
    licenseExpiresAt: v.optional(v.number()),
  }).index("by_user_id", ["userId"]),

  // Task progress tracking
  taskProgress: defineTable({
    userId: v.string(),
    categoryLetter: v.string(),
    taskIndex: v.number(),
    taskId: v.string(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    firstAttemptAt: v.number(),
    lastAttemptAt: v.number(),
    attemptCount: v.number(),
    successfulAttempts: v.number(),
    hintsUsed: v.number(),
    timeSpentSeconds: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_task", ["userId", "categoryLetter", "taskIndex"]),

  // Classes (for teachers)
  classes: defineTable({
    teacherUserId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    code: v.string(), // Unique join code
    language: v.union(v.literal("en"), v.literal("cz")),
    maxStudents: v.number(),
    isActive: v.boolean(),
    allowJoin: v.boolean(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  })
    .index("by_teacher", ["teacherUserId"])
    .index("by_code", ["code"]),

  // Class enrollments (students in classes)
  classEnrollments: defineTable({
    classId: v.id("classes"),
    studentUserId: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("removed")),
    joinedAt: v.number(),
    removedAt: v.optional(v.number()),
    removedBy: v.optional(v.string()),
  })
    .index("by_class", ["classId"])
    .index("by_student", ["studentUserId"])
    .index("by_class_and_student", ["classId", "studentUserId"]),
});
