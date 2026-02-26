import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/contexts/language-context"
import { toast } from "sonner"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  ArrowLeft,
  Users,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Clock,
  Target,
  RotateCcw,
  MessageSquare,
  Send,
  X,
  Check,
  ClipboardList,
  CalendarDays,
  Trash2,
} from "lucide-react"
import {
  useProfile,
  useClassStudents,
  useClass,
  useClassAssignments,
  useStudentNotes,
  useResetCategoryProgress,
  useCreateNote,
  useDeleteNote,
  useDeleteAssignment,
} from "@/lib/db/convex-db"
import { canAccessStudents } from "@/lib/permissions"
import { categoriesArray } from "@/data/categories"
import { useTranslateCategory } from "@/hooks/use-translate-category"
import { AssignWorkDialog } from "@/components/students/assign-work-dialog"
import type { Id } from "../../convex/_generated/dataModel"

// ============================================================================
// Route definition
// ============================================================================

export const Route = createFileRoute("/students/$studentId")({
  component: StudentDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    class: (search.class as string) || undefined,
  }),
})

// ============================================================================
// Helpers
// ============================================================================

const totalTasks = categoriesArray.reduce(
  (sum, cat) => sum + cat.tasks.length,
  0
)

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 80) return "bg-green-500/10 text-green-600 dark:text-green-400"
  if (rate >= 50) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
  return "bg-red-500/10 text-red-600 dark:text-red-400"
}

function timeAgo(timestamp: number | undefined): string {
  if (!timestamp) return "—"
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function getDueDateColor(dueDate: number | undefined): string {
  if (!dueDate) return "bg-gray-500/10 text-gray-600 dark:text-gray-400"
  const now = Date.now()
  const daysUntil = (dueDate - now) / (1000 * 60 * 60 * 24)
  if (daysUntil < 0) return "bg-red-500/10 text-red-600 dark:text-red-400"
  if (daysUntil <= 3)
    return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
  return "bg-green-500/10 text-green-600 dark:text-green-400"
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// ============================================================================
// Main Component
// ============================================================================

function StudentDetailPage() {
  const { t } = useLanguage()
  const { translateCategory } = useTranslateCategory()

  const { user, isLoaded, isSignedIn, profile } = useAuth()
  const userId = isSignedIn && user ? user.id : undefined

  const convexProfile = useProfile(userId)

  // Route params/search
  const { studentId } = Route.useParams()
  const { class: classIdParam } = Route.useSearch()
  const selectedClassId = classIdParam as Id<"classes"> | undefined

  // Data sources
  const classStudents = useClassStudents(selectedClassId)
  const student = classStudents?.find((s) => s.studentId === studentId)
  const classData = useClass(selectedClassId)
  const classAssignments = useClassAssignments(selectedClassId)
  const studentNotes = useStudentNotes(selectedClassId, studentId)

  // Mutations
  const resetCategoryProgress = useResetCategoryProgress()
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote()
  const deleteAssignment = useDeleteAssignment()

  const isLoading = !isLoaded || (isSignedIn && convexProfile === undefined)

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Breadcrumbs />
          </div>
          <Notifications />
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --- Not signed in ---
  if (!isSignedIn) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Breadcrumbs />
          </div>
          <Notifications />
        </header>
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-16 bg-muted">
                <Users className="size-8" />
              </EmptyMedia>
              <EmptyTitle className="text-2xl">
                {t.pages?.students?.title || "Students"}
              </EmptyTitle>
              <EmptyDescription className="max-w-md text-center">
                {t.errors?.authRequired?.description ||
                  "You need to be signed in to access this page."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </main>
      </div>
    )
  }

  // --- Access denied (not teacher/admin) ---
  if (!canAccessStudents(profile)) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Breadcrumbs />
          </div>
          <Notifications />
        </header>
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-16 bg-muted">
                <Users className="size-8" />
              </EmptyMedia>
              <EmptyTitle className="text-2xl">
                {t.errors?.unauthorized?.title || "Access Denied"}
              </EmptyTitle>
              <EmptyDescription className="max-w-md text-center">
                {t.errors?.unauthorized?.description ||
                  "You don't have permission to access this page."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </main>
      </div>
    )
  }

  // --- Student not found / still loading ---
  if (classStudents !== undefined && !student) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Breadcrumbs />
          </div>
          <Notifications />
        </header>
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-16 bg-muted">
                <Users className="size-8" />
              </EmptyMedia>
              <EmptyTitle className="text-2xl">Student Not Found</EmptyTitle>
              <EmptyDescription className="max-w-md text-center">
                This student could not be found in the selected class.
              </EmptyDescription>
            </EmptyHeader>
            <Link
              to="/students"
              search={{ class: selectedClassId as string }}
              className="mt-4"
            >
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.common?.back || "Back"}
              </Button>
            </Link>
          </Empty>
        </main>
      </div>
    )
  }

  // Still loading students
  if (!student) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Breadcrumbs />
          </div>
          <Notifications />
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64" />
          </div>
        </main>
      </div>
    )
  }

  // --- Main content ---
  const overallSuccessRate =
    student.totalAttempts > 0
      ? Math.round(
          (student.totalSuccessfulAttempts / student.totalAttempts) * 100
        )
      : 0
  const overallCompletionPct =
    totalTasks > 0
      ? Math.round((student.tasksCompleted / totalTasks) * 100)
      : 0

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Breadcrumbs />
        </div>
        <Notifications />
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="space-y-6 max-w-5xl">
          {/* Back button */}
          <Link
            to="/students"
            search={{ class: selectedClassId as string }}
          >
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t.common?.back || "Back"}
            </Button>
          </Link>

          {/* Student Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {student.studentName || "Unknown"}
              </h1>
              <Badge variant="secondary" className="text-xs">
                {student.status === "active"
                  ? t.roles?.student || "Student"
                  : student.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {student.studentEmail}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {classData && (
                <span>
                  {t.pages?.classes?.title || "Class"}: {classData.name}
                </span>
              )}
              {student.joinedAt && (
                <span>
                  {t.pages?.students?.joinedDate || "Joined"}:{" "}
                  {formatDate(student.joinedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold tabular-nums">
                  {student.tasksCompleted}/{totalTasks}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.pages?.students?.tasksCompleted || "Tasks Completed"} (
                  {overallCompletionPct}%)
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold tabular-nums">
                  {student.totalAttempts}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.pages?.students?.totalAttempts || "Total Attempts"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold tabular-nums">
                  {student.totalHintsUsed}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.pages?.students?.hintsUsed || "Hints Used"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Badge
                  variant="secondary"
                  className={`text-lg font-bold ${getSuccessRateColor(overallSuccessRate)}`}
                >
                  {overallSuccessRate}%
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.pages?.students?.success || "Success"}{" "}
                  {t.pages?.classes?.successRate || "Rate"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="progress">
            <TabsList>
              <TabsTrigger value="progress">
                <Target className="h-4 w-4 mr-1.5" />
                {t.pages?.students?.progressTab || "Progress"}
              </TabsTrigger>
              <TabsTrigger value="assignments">
                <ClipboardList className="h-4 w-4 mr-1.5" />
                {t.pages?.students?.assignmentsTab || "Assignments"}
              </TabsTrigger>
              <TabsTrigger value="feedback">
                <MessageSquare className="h-4 w-4 mr-1.5" />
                {t.pages?.students?.feedbackTab || "Feedback"}
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Tab 1: Progress                                               */}
            {/* ============================================================ */}
            <TabsContent value="progress" className="mt-4">
              <ProgressTab
                student={student}
                t={t}
                translateCategory={translateCategory}
              />
            </TabsContent>

            {/* ============================================================ */}
            {/* Tab 2: Assignments                                            */}
            {/* ============================================================ */}
            <TabsContent value="assignments" className="mt-4">
              <AssignmentsTab
                student={student}
                classAssignments={classAssignments}
                selectedClassId={selectedClassId}
                userId={user!.id}
                t={t}
                translateCategory={translateCategory}
                resetCategoryProgress={resetCategoryProgress}
                deleteAssignment={deleteAssignment}
              />
            </TabsContent>

            {/* ============================================================ */}
            {/* Tab 3: Feedback                                               */}
            {/* ============================================================ */}
            <TabsContent value="feedback" className="mt-4">
              <FeedbackTab
                studentNotes={studentNotes}
                selectedClassId={selectedClassId}
                studentId={studentId}
                userId={user!.id}
                t={t}
                translateCategory={translateCategory}
                createNote={createNote}
                deleteNote={deleteNote}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// Progress Tab
// ============================================================================

interface StudentDataShape {
  studentId: string
  studentName: string
  studentEmail: string
  status: string
  joinedAt: number
  tasksCompleted: number
  totalAttempts: number
  totalSuccessfulAttempts: number
  totalHintsUsed: number
  totalTimeSpentSeconds: number
  lastActive?: number
  categoryProgress: Array<{
    categoryLetter: string
    tasksCompleted: number
    tasksAttempted: number
    attempts: number
    successfulAttempts: number
    hintsUsed: number
    timeSpentSeconds: number
  }>
  taskDetails: Array<{
    categoryLetter: string
    taskIndex: number
    taskId: string
    completed: boolean
    attemptCount: number
    successfulAttempts: number
    hintsUsed: number
    timeSpentSeconds: number
    lastAttemptAt: number
  }>
}

function ProgressTab({
  student,
  t,
  translateCategory,
}: {
  student: StudentDataShape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  translateCategory: (category: any) => any
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )

  function toggleExpanded(letter: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(letter)) {
        next.delete(letter)
      } else {
        next.add(letter)
      }
      return next
    })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {categoriesArray.map((rawCategory) => {
        const category = translateCategory(rawCategory)
        const letter = category.letter
        const isExpanded = expandedCategories.has(letter)
        const catTotalTasks = category.tasks.length
        const cp = student.categoryProgress.find(
          (c: { categoryLetter: string }) => c.categoryLetter === letter
        )
        const tasksCompleted = cp?.tasksCompleted ?? 0
        const catCompletionPct =
          catTotalTasks > 0
            ? Math.round((tasksCompleted / catTotalTasks) * 100)
            : 0
        const catSuccessRate =
          cp && cp.attempts > 0
            ? Math.round((cp.successfulAttempts / cp.attempts) * 100)
            : 0

        // Get tasks for this category when expanded
        const categoryTaskDetails = student.taskDetails.filter(
          (td: { categoryLetter: string }) => td.categoryLetter === letter
        )

        return (
          <div
            key={letter}
            className={`rounded-lg border bg-background p-3 space-y-2 ${
              isExpanded ? "sm:col-span-2 lg:col-span-3" : ""
            }`}
          >
            {/* Category header */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleExpanded(letter)}
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-7 w-7 flex items-center justify-center p-0 text-xs font-mono shrink-0"
                >
                  {letter}
                </Badge>
                <span className="text-sm font-medium">{category.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {tasksCompleted}/{catTotalTasks}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${catCompletionPct}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                {cp?.hintsUsed ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(cp?.timeSpentSeconds ?? 0)}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1 py-0 ${getSuccessRateColor(catSuccessRate)}`}
                >
                  {catSuccessRate}%
                </Badge>
              </span>
            </div>

            {/* Expanded task list */}
            {isExpanded && (
              <div className="pt-2 border-t space-y-1.5">
                {category.tasks.map(
                  (
                    task: { id: string; title: string },
                    taskIndex: number
                  ) => {
                    const td = categoryTaskDetails.find(
                      (d: { taskIndex: number }) => d.taskIndex === taskIndex
                    )

                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {td?.completed ? (
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                          ) : td ? (
                            <X className="h-4 w-4 text-red-400 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                          )}
                          <span className="truncate">{task.title}</span>
                        </div>
                        {td && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-2">
                            <span className="tabular-nums">
                              {td.attemptCount}{" "}
                              {t.pages?.students?.attempts || "attempts"}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Lightbulb className="h-3 w-3" />
                              {td.hintsUsed}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {formatTime(td.timeSpentSeconds)}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Assignments Tab
// ============================================================================

function AssignmentsTab({
  student,
  classAssignments,
  selectedClassId,
  userId,
  t,
  translateCategory,
  resetCategoryProgress,
  deleteAssignment,
}: {
  student: StudentDataShape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classAssignments: any[] | undefined
  selectedClassId: Id<"classes"> | undefined
  userId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  translateCategory: (category: any) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resetCategoryProgress: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteAssignment: any
}) {
  /**
   * Determine if an assignment is completed by this student.
   * - If taskIndex is defined, check that specific task.
   * - If taskIndex is undefined (whole category), check all tasks in category.
   */
  function isAssignmentCompleted(
    categoryLetter: string,
    taskIndex: number | undefined
  ): boolean {
    if (taskIndex !== undefined) {
      // Check specific task
      return student.taskDetails.some(
        (td) =>
          td.categoryLetter === categoryLetter &&
          td.taskIndex === taskIndex &&
          td.completed
      )
    }
    // Whole category: check if all tasks in the category are completed
    const catData = categoriesArray.find((c) => c.letter === categoryLetter)
    if (!catData) return false
    return catData.tasks.every((_, idx) =>
      student.taskDetails.some(
        (td) =>
          td.categoryLetter === categoryLetter &&
          td.taskIndex === idx &&
          td.completed
      )
    )
  }

  async function handleResetCategory(categoryLetter: string) {
    if (!selectedClassId) return
    try {
      await resetCategoryProgress({
        teacherUserId: userId,
        studentUserId: student.studentId,
        classId: selectedClassId,
        categoryLetter,
      })
      toast.success(
        t.pages?.students?.categoryReset ||
          "Category progress reset successfully"
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reset category"
      )
    }
  }

  async function handleDeleteAssignment(assignmentId: Id<"assignments">) {
    try {
      await deleteAssignment({
        assignmentId,
        teacherUserId: userId,
      })
      toast.success(
        t.pages?.students?.assignmentDeleted || "Assignment deleted"
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete assignment"
      )
    }
  }

  // Collect unique category letters that have assignments (for reset buttons)
  const assignedCategoryLetters = useMemo(() => {
    if (!classAssignments) return new Set<string>()
    return new Set(classAssignments.map((a) => a.categoryLetter))
  }, [classAssignments])

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {classAssignments
            ? `${classAssignments.length} ${t.pages?.students?.assignments || "assignments"}`
            : ""}
        </h3>
        {selectedClassId && (
          <AssignWorkDialog classId={selectedClassId} userId={userId} t={t} />
        )}
      </div>

      {/* Assignments list */}
      {classAssignments === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : classAssignments.length === 0 ? (
        <Empty className="border rounded-lg p-12">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 bg-muted">
              <ClipboardList className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
              {t.pages?.students?.noAssignments || "No assignments yet"}
            </EmptyTitle>
            <EmptyDescription className="max-w-md">
              {t.pages?.students?.noAssignmentsDescription ||
                "Assign categories or tasks to your students"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {classAssignments.map((assignment) => {
            const catData = categoriesArray.find(
              (c) => c.letter === assignment.categoryLetter
            )
            const translatedCat = catData
              ? translateCategory(catData)
              : null
            const taskTitle =
              assignment.taskIndex !== undefined && translatedCat
                ? translatedCat.tasks[assignment.taskIndex]?.title
                : null

            const completed = isAssignmentCompleted(
              assignment.categoryLetter,
              assignment.taskIndex
            )

            const dueDateColor = getDueDateColor(assignment.dueDate)

            return (
              <Card key={assignment._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Badge
                        variant="outline"
                        className="h-7 w-7 flex items-center justify-center p-0 text-xs font-mono shrink-0 mt-0.5"
                      >
                        {assignment.categoryLetter}
                      </Badge>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-medium text-sm">
                          {translatedCat?.title ?? assignment.categoryLetter}
                          {taskTitle && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              — {taskTitle}
                            </span>
                          )}
                          {!taskTitle && (
                            <span className="text-muted-foreground font-normal text-xs ml-1">
                              ({t.pages?.students?.entireCategory || "Entire category"})
                            </span>
                          )}
                        </div>

                        {/* Due date */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {assignment.dueDate ? (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${dueDateColor}`}
                            >
                              <CalendarDays className="h-3 w-3 mr-1" />
                              {formatDate(assignment.dueDate)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t.pages?.students?.noDueDate || "No due date"}
                            </span>
                          )}
                        </div>

                        {/* Note */}
                        {assignment.note && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {assignment.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status + delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className={
                          completed
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        }
                      >
                        {completed
                          ? t.pages?.students?.completed || "Completed"
                          : t.pages?.students?.pending || "Pending"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          handleDeleteAssignment(
                            assignment._id as Id<"assignments">
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Reset category buttons */}
      {assignedCategoryLetters.size > 0 && (
        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t.pages?.students?.resetCategory || "Reset Category"}
          </h4>
          <div className="flex flex-wrap gap-2">
            {Array.from(assignedCategoryLetters).map((letter) => {
              const catData = categoriesArray.find(
                (c) => c.letter === letter
              )
              const translatedCat = catData
                ? translateCategory(catData)
                : null

              return (
                <AlertDialog key={letter}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      {letter}. {translatedCat?.title ?? letter}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t.pages?.students?.resetCategory ||
                          "Reset Category"}{" "}
                        {letter}
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div>
                          {t.pages?.students?.confirmReset ||
                            "This will delete all progress for this category. This cannot be undone."}
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t.common?.cancel || "Cancel"}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleResetCategory(letter)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t.pages?.students?.resetCategory ||
                          "Reset Category"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Feedback Tab
// ============================================================================

function FeedbackTab({
  studentNotes,
  selectedClassId,
  studentId,
  userId,
  t,
  translateCategory,
  createNote,
  deleteNote,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  studentNotes: any[] | undefined
  selectedClassId: Id<"classes"> | undefined
  studentId: string
  userId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  translateCategory: (category: any) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createNote: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteNote: any
}) {
  const [content, setContent] = useState("")
  const [scopeCategory, setScopeCategory] = useState<string>("")
  const [scopeTaskIndex, setScopeTaskIndex] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // When category scope changes, reset task scope
  const selectedCatData = scopeCategory
    ? categoriesArray.find((c) => c.letter === scopeCategory)
    : null
  const translatedScopeCat = selectedCatData
    ? translateCategory(selectedCatData)
    : null

  async function handleCreateNote() {
    if (!content.trim() || !selectedClassId) return

    setIsSubmitting(true)
    try {
      await createNote({
        classId: selectedClassId,
        teacherUserId: userId,
        studentUserId: studentId,
        content: content.trim(),
        categoryLetter: scopeCategory || undefined,
        taskIndex:
          scopeCategory && scopeTaskIndex !== ""
            ? parseInt(scopeTaskIndex, 10)
            : undefined,
      })
      toast.success(t.pages?.students?.noteCreated || "Note added successfully")
      setContent("")
      setScopeCategory("")
      setScopeTaskIndex("")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add note"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteNote(noteId: Id<"teacherNotes">) {
    try {
      await deleteNote({ noteId, teacherUserId: userId })
      toast.success(t.pages?.students?.noteDeleted || "Note deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete note"
      )
    }
  }

  // Sort notes by createdAt descending
  const sortedNotes = useMemo(() => {
    if (!studentNotes) return undefined
    return [...studentNotes].sort((a, b) => b.createdAt - a.createdAt)
  }, [studentNotes])

  return (
    <div className="space-y-6">
      {/* Add note form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t.pages?.students?.addNote || "Add Note"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              t.pages?.students?.notePlaceholder ||
              "Write feedback for this student..."
            }
            rows={3}
          />

          {/* Scope selectors */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t.pages?.students?.noteScope || "Scope"}
              </Label>
              <Select
                value={scopeCategory}
                onValueChange={(val) => {
                  setScopeCategory(val === "general" ? "" : val)
                  setScopeTaskIndex("")
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue
                    placeholder={
                      t.pages?.students?.noteGeneral || "General"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    {t.pages?.students?.noteGeneral || "General"}
                  </SelectItem>
                  {categoriesArray.map((rawCat) => {
                    const cat = translateCategory(rawCat)
                    return (
                      <SelectItem key={cat.letter} value={cat.letter}>
                        {cat.letter}. {cat.title}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Task dropdown (only if category is selected) */}
            {scopeCategory && translatedScopeCat && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t.category?.task || "Task"}
                </Label>
                <Select
                  value={scopeTaskIndex}
                  onValueChange={setScopeTaskIndex}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All tasks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tasks</SelectItem>
                    {translatedScopeCat.tasks.map(
                      (
                        task: { id: string; title: string },
                        idx: number
                      ) => (
                        <SelectItem key={task.id} value={String(idx)}>
                          {task.title}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleCreateNote}
              disabled={isSubmitting || !content.trim()}
              size="sm"
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {t.pages?.students?.addNote || "Add Note"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes list */}
      {sortedNotes === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : sortedNotes.length === 0 ? (
        <Empty className="border rounded-lg p-12">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 bg-muted">
              <MessageSquare className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
              {t.pages?.students?.noNotes || "No feedback yet"}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-0">
          {sortedNotes.map((note) => {
            // Determine scope badge text
            let scopeText = t.pages?.students?.noteGeneral || "General"
            if (note.categoryLetter) {
              const catData = categoriesArray.find(
                (c) => c.letter === note.categoryLetter
              )
              const translatedCat = catData
                ? translateCategory(catData)
                : null
              scopeText = `${note.categoryLetter}. ${translatedCat?.title ?? note.categoryLetter}`
              if (note.taskIndex !== undefined && translatedCat) {
                const taskTitle =
                  translatedCat.tasks[note.taskIndex]?.title
                if (taskTitle) {
                  scopeText += ` — ${taskTitle}`
                }
              }
            }

            return (
              <div
                key={note._id}
                className="flex items-start justify-between py-3 border-b last:border-b-0"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm">{note.content}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {scopeText}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(note.createdAt)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() =>
                    handleDeleteNote(note._id as Id<"teacherNotes">)
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
