import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useUser } from "@clerk/clerk-react"
import { toast } from "sonner"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { GraduationCap, Plus, Copy, Users, Calendar, LogOut, Trash2, Eye, BookOpen } from "lucide-react"
import { getProfile } from "@/lib/db/convex-db"
import {
  createClass,
  joinClass,
  getTeacherClasses,
  getStudentClasses,
  getClassStudents,
  leaveClass,
  deleteClass,
  type Class,
  type ClassStudent,
} from "@/lib/db/convex-db"

export const Route = createFileRoute("/classes")({
  component: ClassesPage,
})

function ClassesPage() {
  const { t } = useLanguage()
  const { user, isLoaded, isSignedIn } = useUser()
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin'>('student')
  const [isLoading, setIsLoading] = useState(true)
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([])
  const [studentClasses, setStudentClasses] = useState<(Class & { joined_at: string })[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([])
  const [isStudentsLoading, setIsStudentsLoading] = useState(false)

  // Create class form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassDescription, setNewClassDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Join class form state
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  // Load user role and classes
  useEffect(() => {
    async function loadData() {
      if (!isLoaded || !isSignedIn || !user) {
        setIsLoading(false)
        return
      }

      try {
        // Get user profile to determine role
        const { data: profile } = await getProfile(user.id)
        const role = profile?.role || 'student'
        setUserRole(role)

        // Load classes based on role
        if (role === 'teacher' || role === 'admin') {
          const { data: tClasses } = await getTeacherClasses(user.id)
          setTeacherClasses(tClasses || [])
        }

        const { data: sClasses } = await getStudentClasses(user.id)
        setStudentClasses(sClasses || [])
      } catch (error) {
        console.error('Failed to load classes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isLoaded, isSignedIn, user?.id])

  // Load students for a selected class
  async function loadClassStudents(classId: string) {
    setIsStudentsLoading(true)
    try {
      const { data: students } = await getClassStudents(classId)
      setClassStudents(students || [])
    } catch (error) {
      console.error('Failed to load class students:', error)
      toast.error('Failed to load students')
    } finally {
      setIsStudentsLoading(false)
    }
  }

  // Create a new class
  async function handleCreateClass() {
    if (!user || !newClassName.trim()) return

    setIsCreating(true)
    try {
      const { data: newClass, error } = await createClass(user.id, newClassName.trim(), {
        description: newClassDescription.trim() || undefined,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (newClass) {
        setTeacherClasses([newClass, ...teacherClasses])
        toast.success(t.pages.classes.classCreated)
        setIsCreateDialogOpen(false)
        setNewClassName('')
        setNewClassDescription('')
      }
    } catch (error) {
      toast.error('Failed to create class')
    } finally {
      setIsCreating(false)
    }
  }

  // Join a class
  async function handleJoinClass() {
    if (!user || !joinCode.trim()) return

    setIsJoining(true)
    try {
      const { data: enrollment, error } = await joinClass(user.id, joinCode.trim())

      if (error) {
        if (error.message.includes('Invalid')) {
          toast.error(t.pages.classes.invalidCode)
        } else if (error.message.includes('already enrolled')) {
          toast.error(t.pages.classes.alreadyMember)
        } else {
          toast.error(error.message)
        }
        return
      }

      if (enrollment) {
        // Reload student classes
        const { data: sClasses } = await getStudentClasses(user.id)
        setStudentClasses(sClasses || [])
        toast.success(t.pages.classes.classJoined)
        setIsJoinDialogOpen(false)
        setJoinCode('')
      }
    } catch (error) {
      toast.error('Failed to join class')
    } finally {
      setIsJoining(false)
    }
  }

  // Leave a class
  async function handleLeaveClass(classId: string) {
    if (!user) return

    try {
      const { success, error } = await leaveClass(user.id, classId)

      if (error) {
        toast.error(error.message)
        return
      }

      if (success) {
        setStudentClasses(studentClasses.filter(c => c.id !== classId))
        toast.success(t.pages.classes.leftClass)
      }
    } catch (error) {
      toast.error('Failed to leave class')
    }
  }

  // Delete a class
  async function handleDeleteClass(classId: string) {
    if (!user) return

    try {
      const { success, error } = await deleteClass(user.id, classId)

      if (error) {
        toast.error(error.message)
        return
      }

      if (success) {
        setTeacherClasses(teacherClasses.filter(c => c.id !== classId))
        if (selectedClass?.id === classId) {
          setSelectedClass(null)
          setClassStudents([])
        }
        toast.success(t.pages.classes.classDeleted)
      }
    } catch (error) {
      toast.error('Failed to delete class')
    }
  }

  // Copy class code to clipboard
  function copyClassCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success(t.pages.classes.codeCopied)
  }

  // Format date for display
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString()
  }

  // Format time ago
  function timeAgo(dateString: string | undefined) {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // Loading state
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

  // Not signed in state
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
  const hasNoClasses = teacherClasses.length === 0 && studentClasses.length === 0

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
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t.pages.classes.title}</h1>
              <p className="text-muted-foreground">{t.pages.classes.description}</p>
            </div>
            <div className="flex gap-2">
              {/* Join Class Dialog */}
              <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t.pages.classes.joinClass}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.pages.classes.joinClass}</DialogTitle>
                    <DialogDescription>
                      {t.pages.classes.enterClassCode}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="join-code">{t.pages.classes.classCode}</Label>
                      <Input
                        id="join-code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder={t.pages.classes.enterCodePlaceholder}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleJoinClass} disabled={isJoining || !joinCode.trim()}>
                      {isJoining ? '...' : t.pages.classes.joinButton}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Create Class Dialog (teachers only) */}
              {isTeacher && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t.pages.classes.createClass}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t.pages.classes.createClass}</DialogTitle>
                      <DialogDescription>
                        {t.pages.classes.description}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="class-name">{t.pages.classes.className}</Label>
                        <Input
                          id="class-name"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          placeholder={t.pages.classes.classNamePlaceholder}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateClass} disabled={isCreating || !newClassName.trim()}>
                        {isCreating ? '...' : t.pages.classes.createClass}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Empty state */}
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
                  <TabsTrigger value="teacher">
                    {t.pages.classes.teacherView}
                  </TabsTrigger>
                  <TabsTrigger value="student">
                    {t.pages.classes.studentView}
                  </TabsTrigger>
                </TabsList>
              )}

              {/* Teacher View */}
              {isTeacher && (
                <TabsContent value="teacher" className="space-y-4">
                  <h2 className="text-lg font-semibold">{t.pages.classes.myClasses}</h2>
                  {teacherClasses.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">{t.pages.classes.noClasses}</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {teacherClasses.map((cls) => (
                        <Card key={cls.id} className="relative">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">{cls.name}</CardTitle>
                              <Badge variant="outline" className="font-mono text-xs">
                                {cls.code}
                              </Badge>
                            </div>
                            {cls.description && (
                              <CardDescription>{cls.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{cls.student_count} {t.pages.classes.students}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(cls.created_at)}</span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyClassCode(cls.code)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                {t.pages.classes.copyCode}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClass(cls)
                                  loadClassStudents(cls.id)
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                {t.pages.classes.viewStudents}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t.pages.classes.deleteClass}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t.pages.classes.confirmDelete}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteClass(cls.id)}>
                                      {t.common.delete}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Students Table (when a class is selected) */}
                  {selectedClass && (
                    <Card className="mt-6">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{selectedClass.name} - {t.pages.classes.students}</CardTitle>
                            <CardDescription>
                              {t.pages.classes.classCode}: <span className="font-mono">{selectedClass.code}</span>
                            </CardDescription>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)}>
                            {t.common.close}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isStudentsLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                              <Skeleton key={i} className="h-12" />
                            ))}
                          </div>
                        ) : classStudents.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <p>{t.pages.classes.noStudents}</p>
                            <p className="text-sm mt-2">{t.pages.classes.noStudentsDescription}</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t.pages.classes.studentName}</TableHead>
                                <TableHead>{t.pages.classes.studentEmail}</TableHead>
                                <TableHead>{t.pages.classes.tasksCompleted}</TableHead>
                                <TableHead>{t.pages.classes.lastActive}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {classStudents.map((student) => (
                                <TableRow key={student.student_id}>
                                  <TableCell className="font-medium">{student.student_name || 'Unknown'}</TableCell>
                                  <TableCell>{student.student_email}</TableCell>
                                  <TableCell>{student.tasks_completed}</TableCell>
                                  <TableCell>{timeAgo(student.last_active)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}

              {/* Student View */}
              <TabsContent value="student" className="space-y-4">
                <h2 className="text-lg font-semibold">{t.pages.classes.myClasses}</h2>
                {studentClasses.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">{t.pages.classes.noClasses}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t.pages.classes.noClassesDescription}</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {studentClasses.map((cls) => (
                      <Card key={cls.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{cls.name}</CardTitle>
                          {cls.description && (
                            <CardDescription>{cls.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{cls.student_count} {t.pages.classes.students}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{t.pages.classes.joined}: {formatDate(cls.joined_at)}</span>
                            </div>
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full">
                                <LogOut className="h-3 w-3 mr-2" />
                                {t.pages.classes.leaveClass}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t.pages.classes.leaveClass}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.pages.classes.confirmLeave}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleLeaveClass(cls.id)}>
                                  {t.pages.classes.leaveClass}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </CardContent>
                      </Card>
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
