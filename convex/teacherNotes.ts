import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Create a teacher note for a student
export const createNote = mutation({
  args: {
    classId: v.id("classes"),
    teacherUserId: v.string(),
    studentUserId: v.string(),
    content: v.string(),
    categoryLetter: v.optional(v.string()),
    taskIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.teacherUserId) {
      throw new Error("Unauthorized");
    }

    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc || classDoc.teacherUserId !== args.teacherUserId) {
      throw new Error("Not authorized for this class");
    }

    const id = await ctx.db.insert("teacherNotes", {
      classId: args.classId,
      teacherUserId: args.teacherUserId,
      studentUserId: args.studentUserId,
      content: args.content,
      categoryLetter: args.categoryLetter,
      taskIndex: args.taskIndex,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Get notes for a specific student in a class
export const getStudentNotes = query({
  args: {
    classId: v.id("classes"),
    studentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teacherNotes")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentUserId", args.studentUserId)
      )
      .collect();
  },
});

// Get all notes for a student across all classes (student-facing)
export const getMyNotes = query({
  args: { studentUserId: v.string() },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("teacherNotes")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .collect();

    const enriched = await Promise.all(
      notes.map(async (note) => {
        const classDoc = await ctx.db.get(note.classId);
        return {
          ...note,
          className: classDoc?.name ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

// Delete a note
export const deleteNote = mutation({
  args: {
    noteId: v.id("teacherNotes"),
    teacherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.teacherUserId) {
      throw new Error("Unauthorized");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    if (note.teacherUserId !== args.teacherUserId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.noteId);
    return { success: true };
  },
});
