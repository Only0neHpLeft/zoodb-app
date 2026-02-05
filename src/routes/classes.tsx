import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useUser } from "@clerk/clerk-react"
import { toast } from "sonner"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { useLanguage } from "@/contexts/language-context"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { GraduationCap } from "lucide-react"
import {
  useProfile,
  useTeacherClasses,
  useStudentClasses,
  useClassStudents,
  useDeleteClass,
} from "@/lib/db/convex-db"
import type { Id } from "../../convex/_generated/dataModel"
import { CreateClassDialog } from "@/components/classes/create-class-dialog"
import { JoinClassDialog } from "@/components/classes/join-class-dialog"
import { TeacherClassCard } from "@/components/classes/teacher-class-card"
import { StudentClassCard } from "@/components/classes/student-class-card"
import { ClassStudentsTable } from "@/components/classes/class-students-table"

export const Route = createFileRoute("/classes")({
  component: ClassesPage,
})

function formatDate(timestamp: number | undefined) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString()
}

function timeAgo(timestamp: number | undefined) {
  if (!timestamp) return '-'
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function ClassesPage() {
  const { t } = useLanguage()
  const { user, isLoaded, isSignedIn } = useUser()
  const clerkId = isSignedIn && user ? user.id : undefined

  const convexProfile = useProfile(clerkId)
  const teacherClasses = useTeacherClasses(
    convexProfile && (convexProfile.role === 'teacher' || convexProfile.role === 'admin')
      ? clerkId
      : undefined
  )
  const studentClasses = useStudentClasses(clerkId)

  const [selectedClassId, setSelectedClassId] = useState<Id<"classes"> | null>(null)
  const classStudents = useClassStudents(selectedClassId ?? undefined)
  const deleteClass = useDeleteClass()

  const userRole = convexProfile?.role || 'student'

  async function handleDeleteClass(classId: Id<"classes">) {
    if (!user) return
    try {
      await deleteClass({ teacherClerkId: user.id, classId })
      if (selectedClassId === classId) setSelectedClassId(null)
      toast.success(t.pages.classes.classDeleted)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete class')
    }
  }

  const isLoading = !isLoaded || (isSignedIn && convexProfile === undefined)

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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

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
                <GraduationCap className="size-8" />
              </EmptyMedia>
              <EmptyTitle className="text-2xl">{t.pages.classes.title}</EmptyTitle>
              <EmptyDescription className="max-w-md text-center">
                {t.errors.authRequired.description}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </main>
      </div>
    )
  }

  const isTeacher = userRole === 'teacher' || userRole === 'admin'
  const tClasses = teacherClasses ?? []
  const sClasses = (studentClasses ?? []).filter((c): c is NonNullable<typeof c> => c !== null)
  const hasNoClasses = tClasses.length === 0 && sClasses.length === 0

  const selectedClassData = selectedClassId
    ? tClasses.find(c => c._id === selectedClassId) ?? null
    : null

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
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t.pages.classes.title}</h1>
              <p className="text-muted-foreground">{t.pages.classes.description}</p>
            </div>
            <div className="flex gap-2">
              <JoinClassDialog clerkId={user!.id} t={t} />
              {isTeacher && <CreateClassDialog clerkId={user!.id} t={t} />}
            </div>
          </div>

          {hasNoClasses ? (
            <Empty className="border rounded-lg p-12">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-16 bg-muted">
                  <GraduationCap className="size-8" />
                </EmptyMedia>
                <EmptyTitle>{t.pages.classes.noClasses}</EmptyTitle>
                <EmptyDescription className="max-w-md">
                  {t.pages.classes.noClassesDescription}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Tabs defaultValue={isTeacher ? "teacher" : "student"} className="space-y-4">
              {isTeacher && (
                <TabsList>
                  <TabsTrigger value="teacher">{t.pages.classes.teacherView}</TabsTrigger>
                  <TabsTrigger value="student">{t.pages.classes.studentView}</TabsTrigger>
                </TabsList>
              )}

              {isTeacher && (
                <TabsContent value="teacher" className="space-y-4">
                  <h2 className="text-lg font-semibold">{t.pages.classes.myClasses}</h2>
                  {tClasses.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">{t.pages.classes.noClasses}</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {tClasses.map((cls) => (
                        <TeacherClassCard
                          key={cls._id}
                          cls={cls}
                          onViewStudents={setSelectedClassId}
                          onDelete={handleDeleteClass}
                          formatDate={formatDate}
                          t={t}
                        />
                      ))}
                    </div>
                  )}

                  {selectedClassData && (
                    <ClassStudentsTable
                      classData={selectedClassData}
                      students={classStudents}
                      onClose={() => setSelectedClassId(null)}
                      timeAgo={timeAgo}
                      t={t}
                    />
                  )}
                </TabsContent>
              )}

              <TabsContent value="student" className="space-y-4">
                <h2 className="text-lg font-semibold">{t.pages.classes.myClasses}</h2>
                {sClasses.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">{t.pages.classes.noClasses}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t.pages.classes.noClassesDescription}</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sClasses.map((cls) => (
                      <StudentClassCard
                        key={cls._id}
                        cls={cls}
                        clerkId={user!.id}
                        formatDate={formatDate}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  )
}
