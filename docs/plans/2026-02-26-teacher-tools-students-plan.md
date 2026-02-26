# Teacher Tools & Students Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a teacher command center on `/students` with student roster, assignment system, progress resets, and feedback. Refactor `/classes` to focus on class management only. Add student-facing "My Assignments" on Home page.

**Architecture:** New Convex tables (`assignments`, `teacherNotes`) + backend functions. New routes (`/students`, `/students/$studentId`). Refactored `/classes` page. Sidebar conditionally shows Students link for teacher/admin roles. All UI uses shadcn/ui + Tailwind (auto-themed).

**Tech Stack:** Convex (backend), React 19, TanStack Router (file-based), shadcn/ui, Tailwind CSS, lucide-react icons, sonner toasts, bilingual i18n (EN/CZ)

---

## Phase 1: Backend Foundation

### Task 1: Add `assignments` and `teacherNotes` tables to Convex schema

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add the two new table definitions**

Add after the `classEnrollments` table (after line 77, before the closing `});`):

```ts
  // Assignments (teacher assigns categories/tasks to a class)
  assignments: defineTable({
    classId: v.id("classes"),
    teacherUserId: v.string(),
    categoryLetter: v.string(),
    taskIndex: v.optional(v.number()), // null = entire category
    dueDate: v.optional(v.number()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_class", ["classId"])
    .index("by_class_and_category", ["classId", "categoryLetter"]),

  // Teacher notes/feedback for students
  teacherNotes: defineTable({
    classId: v.id("classes"),
    teacherUserId: v.string(),
    studentUserId: v.string(),
    content: v.string(),
    categoryLetter: v.optional(v.string()),
    taskIndex: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_class_and_student", ["classId", "studentUserId"])
    .index("by_student", ["studentUserId"]),
```

**Step 2: Verify Convex accepts the schema**

Run: `bunx convex dev --once`
Expected: Schema pushed successfully, no errors.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "Add assignments and teacherNotes tables to Convex schema"
```

---

### Task 2: Create `convex/assignments.ts` — CRUD functions

**Files:**
- Create: `convex/assignments.ts`

**Step 1: Write the assignments backend**

```ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Create an assignment for a class
export const createAssignment = mutation({
  args: {
    classId: v.id("classes"),
    teacherUserId: v.string(),
    categoryLetter: v.string(),
    taskIndex: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.teacherUserId) {
      throw new Error("Unauthorized");
    }

    // Verify teacher owns the class
    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc || classDoc.teacherUserId !== args.teacherUserId) {
      throw new Error("Not authorized for this class");
    }

    const id = await ctx.db.insert("assignments", {
      classId: args.classId,
      teacherUserId: args.teacherUserId,
      categoryLetter: args.categoryLetter,
      taskIndex: args.taskIndex,
      dueDate: args.dueDate,
      note: args.note,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Create multiple assignments at once (bulk assign)
export const createBulkAssignments = mutation({
  args: {
    classId: v.id("classes"),
    teacherUserId: v.string(),
    assignments: v.array(
      v.object({
        categoryLetter: v.string(),
        taskIndex: v.optional(v.number()),
      })
    ),
    dueDate: v.optional(v.number()),
    note: v.optional(v.string()),
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

    const now = Date.now();
    const ids = [];

    for (const assignment of args.assignments) {
      const id = await ctx.db.insert("assignments", {
        classId: args.classId,
        teacherUserId: args.teacherUserId,
        categoryLetter: assignment.categoryLetter,
        taskIndex: assignment.taskIndex,
        dueDate: args.dueDate,
        note: args.note,
        createdAt: now,
      });
      ids.push(id);
    }

    return { created: ids.length };
  },
});

// Get all assignments for a class
export const getClassAssignments = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
  },
});

// Get assignments for a student (via their enrolled classes)
export const getStudentAssignments = query({
  args: { studentUserId: v.string() },
  handler: async (ctx, args) => {
    // Find all active enrollments for this student
    const enrollments = await ctx.db
      .query("classEnrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const allAssignments = [];

    for (const enrollment of enrollments) {
      const classDoc = await ctx.db.get(enrollment.classId);
      if (!classDoc) continue;

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
        .collect();

      for (const a of assignments) {
        allAssignments.push({
          ...a,
          className: classDoc.name,
        });
      }
    }

    return allAssignments;
  },
});

// Delete an assignment
export const deleteAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    teacherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.teacherUserId) {
      throw new Error("Unauthorized");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const classDoc = await ctx.db.get(assignment.classId);
    if (!classDoc || classDoc.teacherUserId !== args.teacherUserId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.assignmentId);
    return { success: true };
  },
});
```

**Step 2: Verify**

Run: `bunx convex dev --once`
Expected: Functions deployed successfully.

**Step 3: Commit**

```bash
git add convex/assignments.ts
git commit -m "Add assignments CRUD backend functions"
```

---

### Task 3: Create `convex/teacherNotes.ts` — CRUD functions

**Files:**
- Create: `convex/teacherNotes.ts`

**Step 1: Write the teacher notes backend**

```ts
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

    // Verify teacher owns the class
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

    // Enrich with class name
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
```

**Step 2: Verify**

Run: `bunx convex dev --once`
Expected: Functions deployed successfully.

**Step 3: Commit**

```bash
git add convex/teacherNotes.ts
git commit -m "Add teacher notes CRUD backend functions"
```

---

### Task 4: Add `resetCategoryProgress` and `removeStudent` mutations

**Files:**
- Modify: `convex/taskProgress.ts` (add `resetCategoryProgress` after `resetStudentProgress`)
- Modify: `convex/classes.ts` (add `removeStudent` mutation)

**Step 1: Add `resetCategoryProgress` to `convex/taskProgress.ts`**

Add after the `resetStudentProgress` mutation (after line 167):

```ts
// Reset progress for a specific category (teacher-initiated)
export const resetCategoryProgress = mutation({
  args: {
    teacherUserId: v.string(),
    studentUserId: v.string(),
    classId: v.id("classes"),
    categoryLetter: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.teacherUserId) {
      throw new Error("Unauthorized");
    }

    // Verify teacher owns the class
    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc || classDoc.teacherUserId !== args.teacherUserId) {
      throw new Error("Not authorized for this class");
    }

    // Verify student is enrolled in the class
    const enrollment = await ctx.db
      .query("classEnrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentUserId", args.studentUserId)
      )
      .first();

    if (!enrollment || enrollment.status !== "active") {
      throw new Error("Student not enrolled in this class");
    }

    // Delete all progress records for this student + category
    const progress = await ctx.db
      .query("taskProgress")
      .withIndex("by_user_id", (q) => q.eq("userId", args.studentUserId))
      .collect();

    const toDelete = progress.filter((p) => p.categoryLetter === args.categoryLetter);

    for (const record of toDelete) {
      await ctx.db.delete(record._id);
    }

    return { deleted: toDelete.length };
  },
});
```

**Step 2: Add `removeStudent` to `convex/classes.ts`**

Add after the `updateClass` mutation (after line 387):

```ts
// Remove a student from a class (teacher-initiated)
export const removeStudent = mutation({
  args: {
    teacherUserId: v.string(),
    classId: v.id("classes"),
    studentUserId: v.string(),
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

    const enrollment = await ctx.db
      .query("classEnrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentUserId", args.studentUserId)
      )
      .first();

    if (!enrollment) {
      throw new Error("Student not found in this class");
    }

    await ctx.db.patch(enrollment._id, {
      status: "removed",
      removedAt: Date.now(),
      removedBy: args.teacherUserId,
    });

    return { success: true };
  },
});
```

**Step 3: Verify**

Run: `bunx convex dev --once`
Expected: Functions deployed successfully.

**Step 4: Commit**

```bash
git add convex/taskProgress.ts convex/classes.ts
git commit -m "Add resetCategoryProgress and removeStudent mutations"
```

---

### Task 5: Add React hooks for new backend functions

**Files:**
- Modify: `src/lib/db/convex-db.ts`

**Step 1: Add imports and hooks**

At the top of the file, the `api` import on line 9 already covers all Convex modules automatically (auto-generated). No import changes needed.

Add after the existing Classes Hooks section (after line 228):

```ts
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
```

**Step 2: Verify**

Run: `bun run build` (or `bunx tsc --noEmit`)
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/lib/db/convex-db.ts
git commit -m "Add React hooks for assignments, notes, and teacher actions"
```

---

## Phase 2: i18n & Infrastructure

### Task 6: Add translation keys for teacher tools

**Files:**
- Modify: `src/locales/en.ts`
- Modify: `src/locales/cz.ts`

**Step 1: Add new keys to EN locale**

In `src/locales/en.ts`, add these keys inside the existing `pages.students` object (after the existing keys around line 493, before the closing `},`):

```ts
      // Assignments
      assignments: 'Assignments',
      assignWork: 'Assign Work',
      assignToClass: 'Assign to Class',
      selectCategories: 'Select Categories',
      selectTasks: 'Select Tasks',
      dueDate: 'Due Date',
      noDueDate: 'No due date',
      assignmentNote: 'Note (optional)',
      assignmentNotePlaceholder: 'Instructions for students...',
      pending: 'Pending',
      overdue: 'Overdue',
      dueSoon: 'Due Soon',
      assigned: 'Assigned',
      noAssignments: 'No assignments yet',
      noAssignmentsDescription: 'Assign categories or tasks to your students',
      assignmentCreated: 'Assignment created successfully',
      assignmentDeleted: 'Assignment deleted',
      entireCategory: 'Entire category',
      // Feedback
      feedback: 'Feedback',
      addNote: 'Add Note',
      notePlaceholder: 'Write feedback for this student...',
      noteScope: 'Scope',
      noteGeneral: 'General',
      noNotes: 'No feedback yet',
      noteCreated: 'Note added successfully',
      noteDeleted: 'Note deleted',
      // Actions
      removeStudent: 'Remove Student',
      confirmRemove: 'Are you sure you want to remove this student from the class?',
      studentRemoved: 'Student removed from class',
      resetCategory: 'Reset Category',
      confirmReset: 'This will delete all progress for this category. This cannot be undone.',
      categoryReset: 'Category progress reset successfully',
      manageStudents: 'Manage Students',
      viewDetails: 'View Details',
      // Student detail
      joinedDate: 'Joined',
      progressTab: 'Progress',
      assignmentsTab: 'Assignments',
      feedbackTab: 'Feedback',
      // My Assignments (student-facing on Home)
      myAssignments: 'My Assignments',
      fromClass: 'from',
      dueBy: 'Due',
      goToTask: 'Go to Task',
```

In `src/locales/en.ts`, add to `pages.classes`:

```ts
      manageStudents: 'Manage Students',
      editClass: 'Edit Class',
      classUpdated: 'Class updated successfully',
      classDescription: 'Description',
      classDescriptionPlaceholder: 'Optional description...',
      toggleJoin: 'Allow Joining',
      maxStudents: 'Max Students',
      startDate: 'Start Date',
      endDate: 'End Date',
```

**Step 2: Add matching CZ keys**

Mirror all new keys in `src/locales/cz.ts` with Czech translations. The structure must be identical. Use appropriate Czech translations.

**Step 3: Verify**

Run: `bun run build`
Expected: No type errors (both locales must match structure).

**Step 4: Commit**

```bash
git add src/locales/en.ts src/locales/cz.ts
git commit -m "Add i18n keys for teacher tools, assignments, and feedback"
```

---

### Task 7: Wire up `permissions.ts` and add Students to sidebar

**Files:**
- Modify: `src/components/app-sidebar.tsx`

**Step 1: Import permissions and Users icon**

At top of `src/components/app-sidebar.tsx`, add to the lucide-react import:
```ts
import { ..., Users } from "lucide-react"
```

Add a new import:
```ts
import { canAccessStudents } from "@/lib/permissions"
```

**Step 2: Add Students menu item conditionally**

The sidebar uses `useAuth()` which returns the local PGlite `profile` (with `is_admin` snake_case and `role`). The `canAccessStudents()` function from `permissions.ts` accepts `{ role?: UserRole; is_admin?: boolean }` — this matches the local profile shape.

In the `menuItems` useMemo (line 103-128), add a Students entry after the Classes entry:

```ts
  const menuItems = useMemo(() => {
    const items = [
      { title: t.nav.home, icon: Home, url: "/", badge: null },
      { title: t.nav.classes, icon: GraduationCap, url: "/classes", badge: null },
    ]

    // Only show Students for teachers and admins
    if (canAccessStudents(profile ?? null)) {
      items.push({ title: t.nav.students, icon: Users, url: "/students", badge: null })
    }

    items.push(
      { title: t.sidebar.membership, icon: Coins, url: "/membership", badge: null },
      { title: t.nav.settings, icon: Settings, url: "/settings", badge: null },
    )

    return items
  }, [t, profile])
```

Note: `profile` from `useAuth()` is the local PGlite profile object. Add `profile` to the useMemo dependency array.

**Step 3: Verify**

Run: `bun run build`
Expected: No errors. Students link only visible for teacher/admin roles.

**Step 4: Commit**

```bash
git add src/components/app-sidebar.tsx
git commit -m "Add Students nav item to sidebar for teacher/admin roles"
```

---

## Phase 3: `/classes` Page Refactor

### Task 8: Add description input to `CreateClassDialog`

**Files:**
- Modify: `src/components/classes/create-class-dialog.tsx`

**Step 1: Add the description input field**

The `description` state already exists on line 18. Add a description input after the name input (after line 67, before the closing `</div>` of `space-y-4 py-4`):

```tsx
          <div className="space-y-2">
            <Label htmlFor="class-description">{t.pages.classes.classDescription || 'Description'}</Label>
            <Input
              id="class-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.pages.classes.classDescriptionPlaceholder || 'Optional description...'}
            />
          </div>
```

**Step 2: Commit**

```bash
git add src/components/classes/create-class-dialog.tsx
git commit -m "Add description input to CreateClassDialog"
```

---

### Task 9: Create `EditClassDialog` component

**Files:**
- Create: `src/components/classes/edit-class-dialog.tsx`

**Step 1: Write the component**

```tsx
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { useUpdateClass } from "@/lib/db/convex-db"
import type { Id } from "../../../convex/_generated/dataModel"

interface EditClassDialogProps {
  classId: Id<"classes">
  userId: string
  initialData: {
    name: string
    description?: string
    allowJoin: boolean
    maxStudents: number
  }
  t: { pages: { classes: Record<string, string> }; common: Record<string, string> }
}

export function EditClassDialog({ classId, userId, initialData, t }: EditClassDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(initialData.name)
  const [description, setDescription] = useState(initialData.description ?? "")
  const [allowJoin, setAllowJoin] = useState(initialData.allowJoin)
  const [maxStudents, setMaxStudents] = useState(initialData.maxStudents)
  const [isSaving, setIsSaving] = useState(false)
  const updateClass = useUpdateClass()

  async function handleSave() {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await updateClass({
        teacherUserId: userId,
        classId,
        name: name.trim(),
        description: description.trim() || undefined,
        allowJoin,
        maxStudents,
      })
      toast.success(t.pages.classes.classUpdated || "Class updated successfully")
      setIsOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update class")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-3 w-3 mr-1" />
          {t.pages.classes.editClass || "Edit"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.pages.classes.editClass || "Edit Class"}</DialogTitle>
          <DialogDescription>
            {t.pages.classes.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-class-name">{t.pages.classes.className}</Label>
            <Input
              id="edit-class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.pages.classes.classNamePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-class-desc">{t.pages.classes.classDescription || "Description"}</Label>
            <Input
              id="edit-class-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.pages.classes.classDescriptionPlaceholder || "Optional description..."}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-allow-join">{t.pages.classes.toggleJoin || "Allow Joining"}</Label>
            <Switch
              id="edit-allow-join"
              checked={allowJoin}
              onCheckedChange={setAllowJoin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-max-students">{t.pages.classes.maxStudents || "Max Students"}</Label>
            <Input
              id="edit-max-students"
              type="number"
              min={1}
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "..." : t.common.save || "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/classes/edit-class-dialog.tsx
git commit -m "Create EditClassDialog component"
```

---

### Task 10: Refactor `TeacherClassCard` — replace View Students with Manage Students + Edit

**Files:**
- Modify: `src/components/classes/teacher-class-card.tsx`

**Step 1: Update props**

Replace the `onViewStudents` prop with navigation. Change the interface (lines 10-23):

```tsx
interface TeacherClassCardProps {
  cls: {
    _id: Id<"classes">
    name: string
    description?: string
    code: string
    allowJoin: boolean
    maxStudents: number
    studentCount?: number
    _creationTime: number
  }
  userId: string
  onDelete: (classId: Id<"classes">) => void
  formatDate: (timestamp: number | undefined) => string
  t: { pages: { classes: Record<string, string> }; common: Record<string, string> }
}
```

**Step 2: Replace View Students button with Manage Students link + Edit button**

Import `Link` from TanStack Router and `EditClassDialog`:

```tsx
import { Link } from "@tanstack/react-router"
import { EditClassDialog } from "./edit-class-dialog"
```

Replace the `Eye` button (lines 69-76) with:

```tsx
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link to="/students" search={{ class: cls._id }}>
              <Users className="h-3 w-3 mr-1" />
              {t.pages.classes.manageStudents || "Manage Students"}
            </Link>
          </Button>
          <EditClassDialog
            classId={cls._id}
            userId={userId}
            initialData={{
              name: cls.name,
              description: cls.description,
              allowJoin: cls.allowJoin,
              maxStudents: cls.maxStudents,
            }}
            t={t}
          />
```

Also import `Users` instead of `Eye` from lucide-react.

**Step 3: Commit**

```bash
git add src/components/classes/teacher-class-card.tsx
git commit -m "Replace View Students with Manage Students link and Edit button"
```

---

### Task 11: Refactor `/classes` page — remove inline student table

**Files:**
- Modify: `src/routes/classes.tsx`

**Step 1: Remove ClassStudentsTable imports and state**

- Remove import of `ClassStudentsTable` (line 26)
- Remove import of `useClassStudents` from convex-db (line 18)
- Remove `selectedClassId` state (line 60)
- Remove `classStudents` hook call (line 61)
- Remove `selectedClassData` computation (lines 135-137)

**Step 2: Remove `onViewStudents` from TeacherClassCard usage**

In the `tClasses.map` section (lines 192-201), update the `TeacherClassCard` props:
- Remove `onViewStudents={setSelectedClassId}`
- Add `userId={user!.id}`

**Step 3: Remove the ClassStudentsTable render block**

Remove lines 205-213 (the `selectedClassData && (...)` block).

**Step 4: Verify**

Run: `bun run build`
Expected: No errors. `/classes` page renders without student table.

**Step 5: Commit**

```bash
git add src/routes/classes.tsx
git commit -m "Remove inline student table from classes page"
```

---

## Phase 4: `/students` Page

### Task 12: Build the `/students` roster page

**Files:**
- Modify: `src/routes/students.tsx` (rewrite the stub)

**Step 1: Rewrite the students page**

Replace the entire file with a full teacher roster page. Key elements:
- Auth + role guard (same pattern as `classes.tsx` lines 49-101)
- Class selector dropdown (using `useTeacherClasses`)
- Search input for filtering by name/email
- Student roster table (columns: Name as link, Email, Progress bar, Assignments count, Last Active, Actions kebab)
- Uses `useClassStudents(selectedClassId)` for data
- Uses `useClassAssignments(selectedClassId)` to compute assignment counts per student
- "Assign Work" button opens `AssignWorkDialog`
- Kebab menu per row: "View Details" → navigates to `/students/$studentId`, "Remove" → calls `useRemoveStudent()`

The page reads `search.class` from URL params to pre-select a class (from the Manage Students link on `/classes`).

Route definition pattern — check if TanStack Router supports search params for this route. Use `validateSearch` or `Route.useSearch()`:

```tsx
export const Route = createFileRoute("/students")({
  component: StudentsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    class: (search.class as string) || undefined,
  }),
})
```

The student name cells should be `<Link>` to `/students/$studentId` with `search: { class: selectedClassId }` so the detail page knows which class context.

This is a large component. Follow the patterns from `classes.tsx` exactly:
- Same header layout (SidebarTrigger, Breadcrumbs, Notifications)
- Same loading skeleton
- Same unauthenticated empty state
- Role guard: if not teacher/admin, show an empty state saying access denied
- Use `t.pages.students.*` for all strings
- Use shadcn `Select` for the class dropdown
- Use shadcn `Table` for the roster
- Use shadcn `DropdownMenu` for the kebab actions

**Step 2: Verify**

Run: `bun run build`
Expected: Route compiles. Navigating to `/students` shows class selector + roster.

**Step 3: Commit**

```bash
git add src/routes/students.tsx
git commit -m "Build students roster page with class selector and management actions"
```

---

### Task 13: Create `AssignWorkDialog` component

**Files:**
- Create: `src/components/students/assign-work-dialog.tsx`

**Step 1: Write the component**

Key elements:
- Dialog triggered by "Assign Work" button
- Lists categories A–Z from `categoriesArray` with checkboxes
- Each category is expandable (Collapsible) to show individual tasks with checkboxes
- If category checkbox is checked without expanding, assigns entire category (`taskIndex: undefined`)
- If individual tasks are checked, assigns each as separate assignment
- Optional due date input (type="date")
- Optional note textarea
- Calls `useCreateBulkAssignments()` on submit
- Props: `classId: Id<"classes">`, `userId: string`, `t`

Uses `categoriesArray` from `@/data/categories` and `useTranslateCategory` hook for bilingual category names.

**Step 2: Commit**

```bash
git add src/components/students/assign-work-dialog.tsx
git commit -m "Create AssignWorkDialog with category/task multi-select"
```

---

### Task 14: Create `/students/$studentId` detail page

**Files:**
- Create: `src/routes/students.$studentId.tsx`

**Step 1: Write the student detail route**

TanStack Router file-based routing: `students.$studentId.tsx` maps to `/students/:studentId`.

Key elements:
- `Route.useParams()` to get `studentId`
- `Route.useSearch()` to get `class` (the class context)
- Auth + teacher/admin role guard
- Header: Student name, email, role badge, class name, joined date
- Three tabs using shadcn `Tabs`:

**Progress Tab:**
- Grid of category cards (reuse pattern from `ClassStudentsTable` expanded view)
- Each card: category letter badge, title, tasks completed / total, progress bar, hints, time, success rate
- Expandable to show per-task detail from `taskDetails` array

**Assignments Tab:**
- List of assignments for this student's class via `useClassAssignments(classId)`
- Cross-reference with student's `taskProgress` to show completed vs pending
- "Assign More" button → opens `AssignWorkDialog` for individual assignment
- "Reset Category" button per category → calls `useResetCategoryProgress()` with AlertDialog confirmation

**Feedback Tab:**
- Chronological list of notes via `useStudentNotes(classId, studentId)`
- Each note shows: content, category/task scope (if any), timestamp
- Text input + optional scope dropdowns (category, task) + "Add Note" button → calls `useCreateNote()`

Data sources:
- `useClassStudents(classId)` → find the specific student's data from the array
- `useClassAssignments(classId)` → assignments for the class
- `useStudentNotes(classId, studentId)` → feedback for this student

**Step 2: Verify**

Run: `bun run build`
Expected: Route compiles. `/students/user123?class=classId` shows detail page.

**Step 3: Commit**

```bash
git add src/routes/students.\$studentId.tsx
git commit -m "Create student detail page with progress, assignments, and feedback tabs"
```

---

## Phase 5: Student-Facing Features

### Task 15: Add "My Assignments" section to Home page

**Files:**
- Modify: `src/routes/index.tsx`

**Step 1: Add assignment data**

Import and use:
```tsx
import { useStudentAssignments } from "@/lib/db/convex-db"
```

In the `Home` component, after the existing hooks:
```tsx
const studentAssignments = useStudentAssignments(userId ?? undefined)
```

**Step 2: Add the assignments section**

Add a new section before the category grid (inside `<div className="flex flex-col gap-6">`), conditionally rendered when there are assignments:

```tsx
{studentAssignments && studentAssignments.length > 0 && (
  <Collapsible defaultOpen>
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{t.pages.students.myAssignments || "My Assignments"}</h2>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
    </div>
    <CollapsibleContent>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-3">
        {studentAssignments.map((assignment) => {
          // ... render assignment card with:
          // - Category letter badge (colored)
          // - Category/task title (translated)
          // - Due date (color-coded: green/yellow/red based on proximity)
          // - Teacher note preview (truncated)
          // - Click → navigate to editor with lesson + task params
          // - Check if already completed via completedTasks map
        })}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

Import `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from `@/components/ui/collapsible` and `ChevronDown` from lucide-react (likely already imported).

**Step 3: Verify**

Run: `bun run build`
Expected: Home page shows assignment cards when student has assignments, hidden when none.

**Step 4: Commit**

```bash
git add src/routes/index.tsx
git commit -m "Add My Assignments section to Home page for class students"
```

---

## Phase 6: Final Verification

### Task 16: Full build + smoke test

**Step 1: Clean build**

Run: `bun run build`
Expected: Build succeeds with zero errors.

**Step 2: Type check**

Run: `bunx tsc --noEmit`
Expected: No type errors.

**Step 3: Verify Convex functions**

Run: `bunx convex dev --once`
Expected: All functions deployed.

**Step 4: Manual smoke test checklist**

- [ ] Sidebar: Students link visible for teacher, hidden for student
- [ ] `/classes`: No student table, "Manage Students" link works, Edit dialog works
- [ ] `/students`: Class selector populates, roster loads, search filters work
- [ ] `/students`: Assign Work dialog creates assignments
- [ ] `/students`: Remove student works with confirmation
- [ ] `/students/$studentId`: All three tabs render with data
- [ ] `/students/$studentId`: Reset category works with confirmation
- [ ] `/students/$studentId`: Add feedback note works
- [ ] Home page: My Assignments section shows for enrolled students
- [ ] Home page: Assignment cards navigate to correct editor page
- [ ] Theme: All new UI respects light/dark + color theme
- [ ] i18n: Switch to CZ, verify all strings are translated

**Step 5: Final commit**

If any fixes were needed during smoke testing, commit them.
