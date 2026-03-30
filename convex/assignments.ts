import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// Create an assignment for a class
export const createAssignment = mutation({
  args: {
    classId: v.id('classes'),
    teacherUserId: v.string(),
    categoryLetter: v.string(),
    taskIndex: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    note: v.optional(v.string()),
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

    const id = await ctx.db.insert('assignments', {
      classId: args.classId,
      teacherUserId: args.teacherUserId,
      categoryLetter: args.categoryLetter,
      taskIndex: args.taskIndex,
      dueDate: args.dueDate,
      note: args.note,
      createdAt: Date.now(),
    })

    return await ctx.db.get(id)
  },
})

// Create multiple assignments at once (bulk assign)
export const createBulkAssignments = mutation({
  args: {
    classId: v.id('classes'),
    teacherUserId: v.string(),
    assignments: v.array(
      v.object({
        categoryLetter: v.string(),
        taskIndex: v.optional(v.number()),
      }),
    ),
    dueDate: v.optional(v.number()),
    note: v.optional(v.string()),
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

    const now = Date.now()
    const ids = []

    for (const assignment of args.assignments) {
      const id = await ctx.db.insert('assignments', {
        classId: args.classId,
        teacherUserId: args.teacherUserId,
        categoryLetter: assignment.categoryLetter,
        taskIndex: assignment.taskIndex,
        dueDate: args.dueDate,
        note: args.note,
        createdAt: now,
      })
      ids.push(id)
    }

    return { created: ids.length }
  },
})

// Get all assignments for a class
export const getClassAssignments = query({
  args: { classId: v.id('classes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const classDoc = await ctx.db.get(args.classId)
    if (!classDoc) return []

    const isTeacher = classDoc.teacherUserId === identity.subject
    if (!isTeacher) {
      const enrollment = await ctx.db
        .query('classEnrollments')
        .withIndex('by_class_and_student', (q) =>
          q.eq('classId', args.classId).eq('studentUserId', identity.subject),
        )
        .first()

      if (!enrollment || enrollment.status !== 'active') {
        throw new Error('Unauthorized')
      }
    }

    return await ctx.db
      .query('assignments')
      .withIndex('by_class', (q) => q.eq('classId', args.classId))
      .collect()
  },
})

// Get assignments for a student (via their enrolled classes)
export const getStudentAssignments = query({
  args: { studentUserId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.studentUserId) {
      throw new Error('Unauthorized')
    }

    const enrollments = await ctx.db
      .query('classEnrollments')
      .withIndex('by_student', (q) => q.eq('studentUserId', args.studentUserId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    const allAssignments = []

    for (const enrollment of enrollments) {
      const classDoc = await ctx.db.get(enrollment.classId)
      if (!classDoc) continue

      const assignments = await ctx.db
        .query('assignments')
        .withIndex('by_class', (q) => q.eq('classId', enrollment.classId))
        .collect()

      for (const a of assignments) {
        allAssignments.push({
          ...a,
          className: classDoc.name,
        })
      }
    }

    return allAssignments
  },
})

// Delete an assignment
export const deleteAssignment = mutation({
  args: {
    assignmentId: v.id('assignments'),
    teacherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.teacherUserId) {
      throw new Error('Unauthorized')
    }

    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) throw new Error('Assignment not found')

    const classDoc = await ctx.db.get(assignment.classId)
    if (!classDoc || classDoc.teacherUserId !== args.teacherUserId) {
      throw new Error('Not authorized')
    }

    await ctx.db.delete(args.assignmentId)
    return { success: true }
  },
})
