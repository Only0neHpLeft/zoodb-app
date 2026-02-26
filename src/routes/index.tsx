import { createFileRoute, useNavigate } from "@tanstack/react-router"
import React, { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { OfflineIndicator } from "@/components/offline-indicator"
import { Notifications } from "@/components/notifications"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Lock, Coins, ClipboardList, ChevronsUpDown, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { categoriesArray, bonusLetters, getCategoryByLetter } from "@/data/categories"
import { useLanguage } from "@/contexts/language-context"
import { useTranslateDifficulty } from "@/hooks/use-translate-difficulty"
import { useTranslateCategory } from "@/hooks/use-translate-category"
import { useMembership } from "@/contexts/membership-context"
import { useStudentProgress, useStudentAssignments } from "@/lib/db/convex-db"
import { useSettingsSync } from "@/hooks/use-settings-sync"
import { checkLessonAccess } from "@/hooks/use-lesson-access"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { translateDifficulty, difficultyColors } = useTranslateDifficulty()
  const { translateCategory } = useTranslateCategory()
  const { membership } = useMembership()
  const { userId } = useSettingsSync()
  const dbProgress = useStudentProgress(userId ?? undefined)
  const studentAssignments = useStudentAssignments(userId ?? undefined)
  const [localCompleted, setLocalCompleted] = useState<{ [key: string]: boolean[] }>({})
  const [selectedAssignment, setSelectedAssignment] = useState<{ _id: string; classId: string; teacherUserId: string; categoryLetter: string; taskIndex?: number; dueDate?: number; note?: string; createdAt: number; className: string } | null>(null)

  useEffect(() => {
    if (!userId) {
      const saved = localStorage.getItem("sqlLessonsProgress")
      if (saved) {
        try { setLocalCompleted(JSON.parse(saved)) } catch {}
      }
    }
  }, [userId])

  const completedTasks = React.useMemo<{ [key: string]: boolean[] }>(() => {
    if (userId && dbProgress) {
      const map: { [key: string]: boolean[] } = {}
      for (const record of dbProgress) {
        if (record.completed) {
          if (!map[record.categoryLetter]) map[record.categoryLetter] = []
          map[record.categoryLetter][record.taskIndex] = true
        }
      }
      return map
    }
    return localCompleted
  }, [userId, dbProgress, localCompleted])

  const totalLessons = categoriesArray.length
  const totalTasks = categoriesArray.reduce((sum, category) => sum + category.tasks.length, 0)

  let completedLessonsCount = 0
  let completedTasksCount = 0

  categoriesArray.forEach((category) => {
    const categoryTasks = completedTasks[category.letter] || []
    const categoryCompletedCount = categoryTasks.filter(Boolean).length
    completedTasksCount += categoryCompletedCount
    if (categoryCompletedCount === category.tasks.length) {
      completedLessonsCount++
    }
  })

  const overallProgress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0

  return (
    <div className="flex flex-col h-full w-full">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <SidebarTrigger />
        <Breadcrumbs />
        <OfflineIndicator />
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - overallProgress / 100)}`}
                  className="text-primary transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold">{overallProgress}%</span>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-medium">
                {completedTasksCount} / {totalTasks} {t.home.tasks}
              </div>
              <div className="text-sm font-medium">
                {completedLessonsCount} / {totalLessons} {t.home.lessons}
              </div>
            </div>
          </div>
          <Notifications />
        </div>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6">
          {studentAssignments && studentAssignments.length > 0 && (
            <Collapsible defaultOpen>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  {t.pages?.students?.myAssignments || "My Assignments"}
                </h2>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronsUpDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 mt-3">
                  {studentAssignments.map((assignment: { _id: string; classId: string; teacherUserId: string; categoryLetter: string; taskIndex?: number; dueDate?: number; note?: string; createdAt: number; className: string }) => {
                    const originalCategory = getCategoryByLetter(assignment.categoryLetter)
                    if (!originalCategory) return null
                    const category = translateCategory(originalCategory)

                    const taskTitle = assignment.taskIndex != null
                      ? category.tasks[assignment.taskIndex]?.title
                      : undefined

                    const isCompleted = assignment.taskIndex != null
                      ? !!completedTasks[assignment.categoryLetter]?.[assignment.taskIndex]
                      : category.tasks.every((_, i) => !!completedTasks[assignment.categoryLetter]?.[i])

                    const isBonus = (bonusLetters as readonly string[]).includes(assignment.categoryLetter)

                    const getDueBadgeColor = (dueDate: number) => {
                      const daysLeft = (dueDate - Date.now()) / (1000 * 60 * 60 * 24)
                      if (daysLeft < 0) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      if (daysLeft <= 3) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    }

                    const getDueDateLabel = (dueDate: number) => {
                      const daysLeft = (dueDate - Date.now()) / (1000 * 60 * 60 * 24)
                      if (daysLeft < 0) return t.pages?.students?.overdue || "Overdue"
                      return `${t.pages?.students?.dueBy || "Due"} ${new Date(dueDate).toLocaleDateString()}`
                    }

                    return (
                      <div
                        key={assignment._id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${isCompleted ? "opacity-60" : ""}`}
                        onClick={() => setSelectedAssignment(assignment)}
                      >
                        <div className={`w-7 h-7 min-w-7 rounded flex items-center justify-center text-xs font-bold ${
                          isBonus ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white" : "bg-primary text-primary-foreground"
                        }`}>
                          {assignment.categoryLetter}
                        </div>
                        <span className="text-sm font-medium truncate">{category.title}</span>
                        {taskTitle && <span className="text-xs text-muted-foreground truncate">&mdash; {taskTitle}</span>}
                        {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                        {assignment.dueDate && !isCompleted && (
                          <Badge variant="secondary" className={`text-[10px] shrink-0 ${getDueBadgeColor(assignment.dueDate)}`}>
                            {getDueDateLabel(assignment.dueDate)}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Assignment detail dialog */}
                <Dialog open={!!selectedAssignment} onOpenChange={(open) => !open && setSelectedAssignment(null)}>
                  <DialogContent>
                    {selectedAssignment && (() => {
                      const origCat = getCategoryByLetter(selectedAssignment.categoryLetter)
                      if (!origCat) return null
                      const cat = translateCategory(origCat)
                      const selTaskTitle = selectedAssignment.taskIndex != null
                        ? cat.tasks[selectedAssignment.taskIndex]?.title
                        : undefined
                      const selIsCompleted = selectedAssignment.taskIndex != null
                        ? !!completedTasks[selectedAssignment.categoryLetter]?.[selectedAssignment.taskIndex]
                        : cat.tasks.every((_, i) => !!completedTasks[selectedAssignment.categoryLetter]?.[i])
                      const selIsBonus = (bonusLetters as readonly string[]).includes(selectedAssignment.categoryLetter)

                      return (
                        <>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <div className={`w-8 h-8 min-w-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                selIsBonus ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white" : "bg-primary text-primary-foreground"
                              }`}>
                                {selectedAssignment.categoryLetter}
                              </div>
                              {cat.title}
                            </DialogTitle>
                            <DialogDescription>
                              {selTaskTitle && <span>{selTaskTitle} &mdash; </span>}
                              {t.pages?.students?.fromClass || "from"} {selectedAssignment.className}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            {selectedAssignment.dueDate && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{t.pages?.students?.dueBy || "Due"}:</span>
                                <Badge variant="secondary" className={(() => {
                                  const daysLeft = (selectedAssignment.dueDate! - Date.now()) / (1000 * 60 * 60 * 24)
                                  if (daysLeft < 0) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                  if (daysLeft <= 3) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                  return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                })()}>
                                  {(() => {
                                    const daysLeft = (selectedAssignment.dueDate! - Date.now()) / (1000 * 60 * 60 * 24)
                                    if (daysLeft < 0) return t.pages?.students?.overdue || "Overdue"
                                    return new Date(selectedAssignment.dueDate!).toLocaleDateString()
                                  })()}
                                </Badge>
                              </div>
                            )}
                            {selectedAssignment.note && (
                              <div>
                                <span className="text-sm font-medium">{"Note"}:</span>
                                <p className="text-sm text-muted-foreground mt-1">{selectedAssignment.note}</p>
                              </div>
                            )}
                            {selIsCompleted && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t.home.completed}
                              </Badge>
                            )}
                          </div>
                          <DialogFooter>
                            <Button onClick={() => {
                              setSelectedAssignment(null)
                              navigate({
                                to: "/editor",
                                search: {
                                  lesson: selectedAssignment.categoryLetter,
                                  task: (selectedAssignment.taskIndex ?? 0) + 1,
                                },
                              })
                            }}>
                              {t.pages?.students?.goToTask || "Go to Task"}
                            </Button>
                          </DialogFooter>
                        </>
                      )
                    })()}
                  </DialogContent>
                </Dialog>
              </CollapsibleContent>
            </Collapsible>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categoriesArray.map((originalCategory, index) => {
              const category = translateCategory(originalCategory)
              const categoryTasks = completedTasks[category.letter] || []
              const categoryCompletedCount = categoryTasks.filter(Boolean).length
              const isFullyCompleted = categoryCompletedCount === category.tasks.length

              const { isUnlocked, isFreePlan, isPaidCategory } = checkLessonAccess(
                category.letter,
                index,
                membership,
                completedTasks
              )

              const difficulties = category.tasks.map((t) => t.difficulty)
              const hasHard = difficulties.includes("Hard")
              const hasMedium = difficulties.includes("Medium")
              const categoryDifficulty = hasHard ? "Hard" : hasMedium ? "Medium" : "Easy"

              const isBonus = (bonusLetters as readonly string[]).includes(category.letter)

              return (
                <Card
                  key={category.letter}
                  className={`transition-all border-2 ${
                    !isUnlocked
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-lg hover:scale-105 hover:border-primary"
                  }`}
                  onClick={() => isUnlocked && navigate({ to: "/editor", search: { lesson: category.letter, task: 1 } })}
                >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 min-w-12 min-h-12 shrink-0 rounded-lg flex items-center justify-center text-2xl font-bold relative ${
                            !isUnlocked
                              ? "bg-muted text-muted-foreground"
                              : isBonus
                                ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white"
                                : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {!isUnlocked ? (
                            <>
                              <div className="absolute inset-0 backdrop-blur-sm rounded-lg"></div>
                              {isFreePlan && isPaidCategory ? (
                                <Coins className="h-6 w-6 relative z-10" />
                              ) : (
                                <Lock className="h-6 w-6 relative z-10" />
                              )}
                            </>
                          ) : (
                            category.letter
                          )}
                        </div>
                        <div>
                          <CardTitle className={`text-base ${!isUnlocked ? "text-muted-foreground" : ""}`}>
                            {category.title}
                          </CardTitle>
                          {/* Status badges - only show lock/paid/completed/bonus status, not task count */}
                          <div className="flex items-center gap-2 mt-1">
                            {!isUnlocked ? (
                              <Badge variant="secondary">
                                {isFreePlan && isPaidCategory ? t.home.paid : t.home.locked}
                              </Badge>
                            ) : (
                              <>
                                {isFullyCompleted && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                    {t.home.completed}
                                  </Badge>
                                )}
                                {isBonus && (
                                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                                    {t.home.bonus}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className={!isUnlocked ? "blur-sm pointer-events-none" : ""}>
                    <CardDescription className="text-sm mb-3">{category.description}</CardDescription>
                    {/* Task count and difficulty at the bottom */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {!isUnlocked ? 0 : categoryCompletedCount} / {category.tasks.length}
                      </Badge>
                      <Badge className={difficultyColors[categoryDifficulty]} variant="secondary">
                        {translateDifficulty(categoryDifficulty)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
