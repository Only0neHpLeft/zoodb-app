import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// Save or update task progress
export const saveTaskProgress = mutation({
  args: {
    userId: v.string(),
    categoryLetter: v.string(),
    taskIndex: v.number(),
    taskId: v.string(),
    completed: v.boolean(),
    hintsUsed: v.optional(v.number()),
    timeSpentSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }

    const now = Date.now()

    // Find existing progress for this task
    const existing = await ctx.db
      .query('taskProgress')
      .withIndex('by_user_and_task', (q) =>
        q
          .eq('userId', args.userId)
          .eq('categoryLetter', args.categoryLetter)
          .eq('taskIndex', args.taskIndex),
      )
      .first()

    if (existing) {
      // Update existing progress
      const updates: Record<string, unknown> = {
        lastAttemptAt: now,
        attemptCount: existing.attemptCount + 1,
        timeSpentSeconds:
          existing.timeSpentSeconds + (args.timeSpentSeconds ?? 0),
      }

      if (args.completed && !existing.completed) {
        updates.completed = true
        updates.completedAt = now
        updates.successfulAttempts = existing.successfulAttempts + 1
      } else if (args.completed) {
        updates.successfulAttempts = existing.successfulAttempts + 1
      }

      if (args.hintsUsed !== undefined) {
        updates.hintsUsed = existing.hintsUsed + args.hintsUsed
      }

      await ctx.db.patch(existing._id, updates)
      return await ctx.db.get(existing._id)
    }

    // Create new progress record
    const id = await ctx.db.insert('taskProgress', {
      userId: args.userId,
      categoryLetter: args.categoryLetter,
      taskIndex: args.taskIndex,
      taskId: args.taskId,
      completed: args.completed,
      completedAt: args.completed ? now : undefined,
      firstAttemptAt: now,
      lastAttemptAt: now,
      attemptCount: 1,
      successfulAttempts: args.completed ? 1 : 0,
      hintsUsed: args.hintsUsed ?? 0,
      timeSpentSeconds: args.timeSpentSeconds ?? 0,
    })
    return await ctx.db.get(id)
  },
})

// Get all task progress for a student
export const getStudentProgress = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }
    return await ctx.db
      .query('taskProgress')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .collect()
  },
})

// Get progress for a specific task
export const getTaskProgress = query({
  args: {
    userId: v.string(),
    categoryLetter: v.string(),
    taskIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }
    return await ctx.db
      .query('taskProgress')
      .withIndex('by_user_and_task', (q) =>
        q
          .eq('userId', args.userId)
          .eq('categoryLetter', args.categoryLetter)
          .eq('taskIndex', args.taskIndex),
      )
      .first()
  },
})

// Get completion stats for a student
export const getCompletionStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }
    const progress = await ctx.db
      .query('taskProgress')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .collect()

    const totalTasks = progress.length
    const completedTasks = progress.filter((p) => p.completed).length
    const totalAttempts = progress.reduce((sum, p) => sum + p.attemptCount, 0)
    const totalTimeSeconds = progress.reduce(
      (sum, p) => sum + p.timeSpentSeconds,
      0,
    )
    const totalHintsUsed = progress.reduce((sum, p) => sum + p.hintsUsed, 0)

    // Group by category
    const byCategory = progress.reduce(
      (acc, p) => {
        if (!acc[p.categoryLetter]) {
          acc[p.categoryLetter] = { total: 0, completed: 0 }
        }
        acc[p.categoryLetter].total++
        if (p.completed) acc[p.categoryLetter].completed++
        return acc
      },
      {} as Record<string, { total: number; completed: number }>,
    )

    return {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalAttempts,
      totalTimeSeconds,
      totalHintsUsed,
      byCategory,
    }
  },
})

// Reset all progress for a student (for database reset)
export const resetStudentProgress = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }

    const progress = await ctx.db
      .query('taskProgress')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .collect()

    for (const record of progress) {
      await ctx.db.delete(record._id)
    }

    return { deleted: progress.length }
  },
})

// Reset progress for a specific category (teacher-initiated)
export const resetCategoryProgress = mutation({
  args: {
    teacherUserId: v.string(),
    studentUserId: v.string(),
    classId: v.id('classes'),
    categoryLetter: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.teacherUserId) {
      throw new Error('Unauthorized')
    }

    const classDoc = await ctx.db.get(args.classId)
    if (!classDoc || classDoc.teacherUserId !== args.teacherUserId) {
      throw new Error('Not authorized for this class')
    }

    const enrollment = await ctx.db
      .query('classEnrollments')
      .withIndex('by_class_and_student', (q) =>
        q.eq('classId', args.classId).eq('studentUserId', args.studentUserId),
      )
      .first()

    if (!enrollment || enrollment.status !== 'active') {
      throw new Error('Student not enrolled in this class')
    }

    const progress = await ctx.db
      .query('taskProgress')
      .withIndex('by_user_id', (q) => q.eq('userId', args.studentUserId))
      .collect()

    const toDelete = progress.filter(
      (p) => p.categoryLetter === args.categoryLetter,
    )

    for (const record of toDelete) {
      await ctx.db.delete(record._id)
    }

    return { deleted: toDelete.length }
  },
})
