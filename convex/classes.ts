import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Generate a random class code
function generateClassCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new class
export const createClass = mutation({
  args: {
    teacherClerkId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    language: v.optional(v.union(v.literal("en"), v.literal("cz"))),
    maxStudents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.teacherClerkId) {
      throw new Error("Unauthorized");
    }

    const code = generateClassCode();

    const id = await ctx.db.insert("classes", {
      teacherClerkId: args.teacherClerkId,
      name: args.name,
      description: args.description,
      code,
      language: args.language ?? "en",
      maxStudents: args.maxStudents ?? 30,
      isActive: true,
      allowJoin: true,
    });

    return await ctx.db.get(id);
  },
});

// Join a class with a code
export const joinClass = mutation({
  args: {
    studentClerkId: v.string(),
    classCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.studentClerkId) {
      throw new Error("Unauthorized");
    }

    // Find the class by code
    const classDoc = await ctx.db
      .query("classes")
      .withIndex("by_code", (q) => q.eq("code", args.classCode.toUpperCase()))
      .first();

    if (!classDoc) {
      throw new Error("Invalid class code");
    }

    if (!classDoc.isActive || !classDoc.allowJoin) {
      throw new Error("This class is not accepting new students");
    }

    // Check if already enrolled
    const existing = await ctx.db
      .query("classEnrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", classDoc._id).eq("studentClerkId", args.studentClerkId)
      )
      .first();

    if (existing) {
      if (existing.status === "active") {
        throw new Error("Already enrolled in this class");
      }
      // Re-activate enrollment
      await ctx.db.patch(existing._id, {
        status: "active",
        removedAt: undefined,
        removedBy: undefined,
      });
      return existing;
    }

    // Check max students
    const enrollmentCount = await ctx.db
      .query("classEnrollments")
      .withIndex("by_class", (q) => q.eq("classId", classDoc._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (enrollmentCount.length >= classDoc.maxStudents) {
      throw new Error("Class is full");
    }

    // Create enrollment
    const id = await ctx.db.insert("classEnrollments", {
      classId: classDoc._id,
      studentClerkId: args.studentClerkId,
      status: "active",
      joinedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Get classes where user is teacher
export const getTeacherClasses = query({
  args: { teacherClerkId: v.string() },
  handler: async (ctx, args) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherClerkId", args.teacherClerkId))
      .collect();

    // Add student count to each class
    const classesWithCount = await Promise.all(
      classes.map(async (cls) => {
        const enrollments = await ctx.db
          .query("classEnrollments")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        return {
          ...cls,
          studentCount: enrollments.length,
        };
      })
    );

    return classesWithCount;
  },
});

// Get classes where user is enrolled as student
export const getStudentClasses = query({
  args: { studentClerkId: v.string() },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("classEnrollments")
      .withIndex("by_student", (q) => q.eq("studentClerkId", args.studentClerkId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const classesWithDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        const classDoc = await ctx.db.get(enrollment.classId);
        if (!classDoc) return null;

        // Get student count
        const allEnrollments = await ctx.db
          .query("classEnrollments")
          .withIndex("by_class", (q) => q.eq("classId", classDoc._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        return {
          ...classDoc,
          studentCount: allEnrollments.length,
          joinedAt: enrollment.joinedAt,
        };
      })
    );

    return classesWithDetails.filter(Boolean);
  },
});

// Get students in a class with their progress
export const getClassStudents = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("classEnrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const studentsWithDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get user profile
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", enrollment.studentClerkId))
          .first();

        // Get task progress
        const progress = await ctx.db
          .query("taskProgress")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", enrollment.studentClerkId))
          .collect();

        const tasksCompleted = progress.filter((p) => p.completed).length;
        const totalAttempts = progress.reduce((sum, p) => sum + p.attemptCount, 0);
        const lastActive = progress.length > 0
          ? Math.max(...progress.map((p) => p.lastAttemptAt))
          : undefined;

        return {
          studentId: enrollment.studentClerkId,
          studentName: profile?.fullName ?? profile?.email ?? "Unknown",
          studentEmail: profile?.email ?? "",
          status: enrollment.status,
          joinedAt: enrollment.joinedAt,
          tasksCompleted,
          totalAttempts,
          lastActive,
        };
      })
    );

    return studentsWithDetails;
  },
});

// Leave a class
export const leaveClass = mutation({
  args: {
    studentClerkId: v.string(),
    classId: v.id("classes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.studentClerkId) {
      throw new Error("Unauthorized");
    }

    const enrollment = await ctx.db
      .query("classEnrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentClerkId", args.studentClerkId)
      )
      .first();

    if (!enrollment) {
      throw new Error("Not enrolled in this class");
    }

    await ctx.db.patch(enrollment._id, {
      status: "inactive",
      removedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete a class (teacher only)
export const deleteClass = mutation({
  args: {
    teacherClerkId: v.string(),
    classId: v.id("classes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.teacherClerkId) {
      throw new Error("Unauthorized");
    }

    const classDoc = await ctx.db.get(args.classId);

    if (!classDoc) {
      throw new Error("Class not found");
    }

    if (classDoc.teacherClerkId !== args.teacherClerkId) {
      throw new Error("Not authorized to delete this class");
    }

    // Delete all enrollments first
    const enrollments = await ctx.db
      .query("classEnrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    for (const enrollment of enrollments) {
      await ctx.db.delete(enrollment._id);
    }

    // Delete the class
    await ctx.db.delete(args.classId);

    return { success: true };
  },
});

// Update class settings
export const updateClass = mutation({
  args: {
    teacherClerkId: v.string(),
    classId: v.id("classes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    allowJoin: v.optional(v.boolean()),
    maxStudents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.teacherClerkId) {
      throw new Error("Unauthorized");
    }

    const classDoc = await ctx.db.get(args.classId);

    if (!classDoc) {
      throw new Error("Class not found");
    }

    if (classDoc.teacherClerkId !== args.teacherClerkId) {
      throw new Error("Not authorized to update this class");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.allowJoin !== undefined) updates.allowJoin = args.allowJoin;
    if (args.maxStudents !== undefined) updates.maxStudents = args.maxStudents;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.classId, updates);
    }

    return await ctx.db.get(args.classId);
  },
});

// Get a single class by ID
export const getClass = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.classId);
  },
});
