import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/contexts/language-context"
import { toast } from "sonner"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Users, Search, MoreHorizontal, Eye, UserMinus, ClipboardList } from "lucide-react"
import {
  useProfile,
  useTeacherClasses,
  useClassStudents,
  useRemoveStudent,
} from "@/lib/db/convex-db"
import { canAccessStudents } from "@/lib/permissions"
import { categoriesArray } from "@/data/categories"
import type { Id } from "../../convex/_generated/dataModel"

export const Route = createFileRoute("/students")({
  component: StudentsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    class: (search.class as string) || undefined,
  }),
})

const totalTasks = categoriesArray.reduce((sum, cat) => sum + cat.tasks.length, 0)

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

function StudentsPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const { user, isLoaded, isSignedIn, profile } = useAuth()
  const userId = isSignedIn && user ? user.id : undefined

  const convexProfile = useProfile(userId)

  const isTeacherOrAdmin =
    convexProfile &&
    (convexProfile.role === "teacher" || convexProfile.role === "admin")

  const teacherClasses = useTeacherClasses(isTeacherOrAdmin ? userId : undefined)

  const { class: classFromUrl } = Route.useSearch()

  const [searchQuery, setSearchQuery] = useState("")

  // Determine selected class ID
  const selectedClassId = useMemo(() => {
    if (classFromUrl && teacherClasses?.some((c) => c._id === classFromUrl)) {
      return classFromUrl as Id<"classes">
    }
    if (teacherClasses && teacherClasses.length > 0) {
      return teacherClasses[0]._id
    }
    return undefined
  }, [classFromUrl, teacherClasses])

  const students = useClassStudents(selectedClassId)
  const removeStudent = useRemoveStudent()

  const isLoading = !isLoaded || (isSignedIn && convexProfile === undefined)

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!students) return undefined
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(
      (s) =>
        (s.studentName?.toLowerCase() ?? "").includes(q) ||
        s.studentEmail.toLowerCase().includes(q)
    )
  }, [students, searchQuery])

  async function handleRemoveStudent(studentUserId: string) {
    if (!user || !selectedClassId) return
    try {
      await removeStudent({
        teacherUserId: user.id,
        classId: selectedClassId,
        studentUserId,
      })
      toast.success(t.pages?.students?.studentRemoved || "Student removed from class")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove student")
    }
  }

  function handleClassChange(classId: string) {
    navigate({
      to: "/students",
      search: { class: classId },
      replace: true,
    })
  }

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
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 flex-1" />
            </div>
            <Skeleton className="h-64" />
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

  const classes = teacherClasses ?? []

  // --- No classes ---
  if (classes.length === 0) {
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
                {t.pages?.students?.noStudentsYet || "No student data yet"}
              </EmptyTitle>
              <EmptyDescription className="max-w-md text-center">
                {t.pages?.classes?.noClassesDescription ||
                  "Create a class to get started or join using a class code"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </main>
      </div>
    )
  }

  const selectedClass = classes.find((c) => c._id === selectedClassId)
  const studentCount = filteredStudents?.length ?? 0
  const totalStudentCount = students?.length ?? 0

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
        <div className="space-y-6">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-bold">
              {t.pages?.students?.title || "Students"}
            </h1>
            <p className="text-muted-foreground">
              {t.pages?.students?.description ||
                "Monitor student progress, track performance, and analyze learning patterns"}
            </p>
          </div>

          {/* Top bar: class selector, search, assign work */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={selectedClassId ?? ""}
              onValueChange={handleClassChange}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  t.pages?.students?.searchPlaceholder ||
                  "Search by name or email..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button disabled>
              <ClipboardList className="h-4 w-4 mr-2" />
              {t.pages?.students?.assignWork || "Assign Work"}
            </Button>
          </div>

          {/* Summary line */}
          {students !== undefined && (
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim()
                ? `${t.pages?.students?.showing || "Showing"} ${studentCount} ${t.pages?.students?.of || "of"} ${totalStudentCount} ${t.pages?.students?.studentsCount || "students"}`
                : `${totalStudentCount} ${t.pages?.students?.studentsCount || "students"}`}
              {selectedClass && ` — ${selectedClass.name}`}
            </p>
          )}

          {/* Student table */}
          {students === undefined ? (
            // Loading students
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : students.length === 0 ? (
            // No students in class
            <Empty className="border rounded-lg p-12">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-16 bg-muted">
                  <Users className="size-8" />
                </EmptyMedia>
                <EmptyTitle>
                  {t.pages?.students?.noStudentsYet || "No student data yet"}
                </EmptyTitle>
                <EmptyDescription className="max-w-md">
                  {t.pages?.students?.noStudentsYetDescription ||
                    "Student activity will appear here once they start completing tasks"}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : filteredStudents && filteredStudents.length === 0 ? (
            // Search returned nothing
            <Empty className="border rounded-lg p-12">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-16 bg-muted">
                  <Search className="size-8" />
                </EmptyMedia>
                <EmptyTitle>
                  {t.pages?.students?.noStudentsFound ||
                    "No students found matching your search"}
                </EmptyTitle>
                <EmptyDescription className="max-w-md">
                  <Button
                    variant="link"
                    onClick={() => setSearchQuery("")}
                    className="p-0 h-auto"
                  >
                    {t.pages?.students?.clearFilters || "Clear filters"}
                  </Button>
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t.pages?.students?.formNameLabel || "Name"}
                    </TableHead>
                    <TableHead>
                      {t.pages?.students?.email || "Email"}
                    </TableHead>
                    <TableHead>
                      {t.pages?.students?.tasksCompletedColumn || "Tasks Completed"}
                    </TableHead>
                    <TableHead>
                      {t.pages?.students?.assignments || "Assignments"}
                    </TableHead>
                    <TableHead>
                      {t.pages?.students?.lastActiveColumn || "Last Active"}
                    </TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents?.map((student) => {
                    const completionPct =
                      totalTasks > 0
                        ? Math.round(
                            (student.tasksCompleted / totalTasks) * 100
                          )
                        : 0

                    return (
                      <TableRow
                        key={student.studentId}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <Link
                            to="/students/$studentId"
                            params={{ studentId: student.studentId }}
                            search={{ class: selectedClassId as string }}
                            className="hover:underline"
                          >
                            {student.studentName || "Unknown"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.studentEmail}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm tabular-nums">
                              {student.tasksCompleted}/{totalTasks}
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${completionPct}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {timeAgo(student.lastActive)}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link
                                    to="/students/$studentId"
                                    params={{
                                      studentId: student.studentId,
                                    }}
                                    search={{
                                      class: selectedClassId as string,
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    {t.pages?.students?.viewDetails ||
                                      "View Details"}
                                  </Link>
                                </DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    {t.pages?.students?.removeStudent ||
                                      "Remove Student"}
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t.pages?.students?.removeStudent ||
                                    "Remove Student"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.pages?.students?.confirmRemove ||
                                    "Are you sure you want to remove this student from the class?"}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t.common?.cancel || "Cancel"}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleRemoveStudent(student.studentId)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t.pages?.students?.removeStudent ||
                                    "Remove"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
