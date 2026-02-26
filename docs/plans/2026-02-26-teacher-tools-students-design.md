# Teacher Tools & Students Page

## Problem

The `/students` route is an empty placeholder. Teachers can see a basic student table inline on `/classes`, but have no dedicated space to manage students, assign work, give feedback, or monitor detailed progress. The classroom system is half-built — backend capabilities (updateClass, removedBy, permissions.ts) exist but aren't wired to any UI.

## Solution

Build a full teacher command center on `/students` with student roster, assignment system, progress resets, and feedback. Restructure `/classes` to focus purely on class management. Add a student-facing "My Assignments" section on the Home page for class-enrolled students.

## Two User Journeys

| Journey | Description |
|---------|-------------|
| **Solo learner** | No class. Works through categories at own pace. No assignments, no teacher feedback. Unchanged. |
| **Class student** | Joins a teacher's class. Gets assignments, feedback, progress oversight. Teacher has full control. |

Both share the same editor, tasks, and global progress. The class layer adds teacher-student relationship on top.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Progress scope | Global (not per-class) | One student, one progress journey. Class is a grouping mechanism, not an isolated environment. Simplest model. |
| `/classes` role | Class admin only | Clean separation: `/classes` = create/edit/delete classes, `/students` = student oversight |
| Student detail | Dedicated route `/students/$studentId` | Enough content (progress + assignments + feedback) to warrant its own page |
| Assignment granularity | Category-level or task-level | Teachers can assign a whole category or individual tasks |
| Theme support | All shadcn/ui primitives + Tailwind | Inherits light/dark mode, color presets, custom CSS automatically |

## Data Model

### New Table: `assignments`

| Field | Type | Description |
|-------|------|-------------|
| `classId` | `Id<"classes">` | Which class this assignment belongs to |
| `teacherUserId` | `string` | Teacher who created it |
| `categoryLetter` | `string` | Assigned category (e.g. "A", "B") |
| `taskIndex` | `number?` | Optional — if null, entire category is assigned |
| `dueDate` | `number?` | Optional Unix timestamp |
| `note` | `string?` | Optional instructions from teacher |
| `createdAt` | `number` | Timestamp |
| Indexes | `by_class`, `by_class_and_category` | |

### New Table: `teacherNotes`

| Field | Type | Description |
|-------|------|-------------|
| `classId` | `Id<"classes">` | Class context |
| `teacherUserId` | `string` | Author |
| `studentUserId` | `string` | Recipient |
| `content` | `string` | The feedback text |
| `categoryLetter` | `string?` | Optional — scoped to a category |
| `taskIndex` | `number?` | Optional — scoped to a specific task |
| `createdAt` | `number` | Timestamp |
| Indexes | `by_class_and_student`, `by_student` | |

### Modified: `taskProgress`

New mutation `resetCategoryProgress` — deletes all records for a given `userId` + `categoryLetter`. Teacher-initiated, verified by class ownership. No schema changes.

## Routes & Navigation

### Route Changes

| Route | Purpose | Access |
|-------|---------|--------|
| `/classes` | Class management — create, edit, delete, share code. No student table. | All authenticated users |
| `/students` | Teacher hub — class selector, student roster, bulk assign | Teachers/admins only |
| `/students/$studentId` | Individual student — progress, assignments, notes, resets | Teachers/admins only |

### Sidebar

```
NAVIGATION
  Home
  Classes
  Students        ← NEW (teacher/admin only, uses canAccessStudents())
  Membership
  Settings
  Scheme
    ...
```

Wire up the existing `permissions.ts` module — replace inline role checks with `canAccessStudents()`, `isTeacher()`, etc.

## UI: `/students` Page

**Top bar:**
- Class selector dropdown (lists all teacher's classes)
- Search input to filter students by name/email
- "Assign Work" button → `AssignWorkDialog`

**Roster table:**

| Column | Content |
|--------|---------|
| Name | Clickable → `/students/:id` |
| Email | Student email |
| Progress | `X/Y tasks` with mini progress bar |
| Assignments | `X pending / Y completed` |
| Last Active | Relative time |
| Actions | Kebab menu: View Details, Remove from Class |

## UI: `AssignWorkDialog`

- Multi-select category list (A–Z) with checkboxes
- Expandable categories to pick individual tasks
- Optional due date picker
- Optional note/instructions text field
- Assigns to all students in the selected class (bulk)

## UI: `/students/$studentId` Page

**Header:** Student name, email, role badge, class name, joined date

**Tabs:**

| Tab | Content |
|-----|---------|
| **Progress** | Full category grid. Each card: tasks completed, hints, time, success rate. Expandable to task level with attempt count, time, hint usage. |
| **Assignments** | Assigned categories/tasks with status (pending/completed), due date, teacher note. Buttons: assign more, reset category (with confirmation). |
| **Feedback** | Chronological notes list. Input to add new notes, optionally scoped to category/task. |

## UI: Home Page — "My Assignments" Section

Only visible when student is enrolled in a class with active assignments.

- Card list of assigned categories/tasks
- Each card: category letter badge, title, due date (color-coded: green/yellow/red), teacher note preview
- Click navigates to editor for that category/task
- Collapsible section

## UI: `/classes` Page Changes

- Remove `ClassStudentsTable` and "View Students" button from `TeacherClassCard`
- Add "Manage Students" link → navigates to `/students?class=X`
- Add description input to `CreateClassDialog` (state exists, input not rendered)
- Add "Edit Class" option on `TeacherClassCard` — name, description, toggle join, max students, start/end dates (uses existing `updateClass` mutation)

## Bilingual Support

All new UI text added to both EN and CZ translation objects following existing `src/lib/i18n.ts` patterns. Assignment notes are freeform text (teacher's language choice).
