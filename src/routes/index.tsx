import { createFileRoute, useNavigate } from "@tanstack/react-router"
import React, { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { OfflineIndicator } from "@/components/offline-indicator"
import { Notifications } from "@/components/notifications"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-3">
                  {studentAssignments.map((assignment: { _id: string; classId: string; teacherUserId: string; categoryLetter: string; taskIndex?: number; dueDate?: number; note?: string; createdAt: number; className: string }) => {
                    const originalCategory = getCategoryByLetter(assignment.categoryLetter)
                    if (!originalCategory) return null
                    const category = translateCategory(originalCategory)

                    // Determine task title
                    const taskTitle = assignment.taskIndex != null
                      ? category.tasks[assignment.taskIndex]?.title
                      : undefined

                    // Check completion
                    const isCompleted = assignment.taskIndex != null
                      ? !!completedTasks[assignment.categoryLetter]?.[assignment.taskIndex]
                      : category.tasks.every((_, i) => !!completedTasks[assignment.categoryLetter]?.[i])

                    // Due date badge color
                    const getDueBadge = () => {
                      if (!assignment.dueDate) return null
                      const now = Date.now()
                      const diff = assignment.dueDate - now
                      const daysLeft = diff / (1000 * 60 * 60 * 24)

                      if (daysLeft < 0) {
                        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs">{t.pages?.students?.overdue || "Overdue"}</Badge>
                      } else if (daysLeft <= 3) {
                        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs">{t.pages?.students?.dueBy || "Due"} {new Date(assignment.dueDate).toLocaleDateString()}</Badge>
                      } else {
                        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">{t.pages?.students?.dueBy || "Due"} {new Date(assignment.dueDate).toLocaleDateString()}</Badge>
                      }
                    }

                    const isBonus = (bonusLetters as readonly string[]).includes(assignment.categoryLetter)

                    return (
                      <Card
                        key={assignment._id}
                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                          isBonus
                            ? "border-l-purple-500"
                            : "border-l-primary"
                        } ${isCompleted ? "opacity-75" : ""}`}
                        onClick={() =>
                          navigate({
                            to: "/editor",
                            search: {
                              lesson: assignment.categoryLetter,
                              task: (assignment.taskIndex ?? 0) + 1,
                            },
                          })
                        }
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 min-w-10 min-h-10 shrink-0 rounded-lg flex items-center justify-center text-lg font-bold ${
                                isBonus
                                  ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white"
                                  : "bg-primary text-primary-foreground"
                              }`}
                            >
                              {assignment.categoryLetter}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm leading-tight">
                                {category.title}
                                {taskTitle && (
                                  <span className="text-muted-foreground"> &mdash; {taskTitle}</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {t.pages?.students?.fromClass || "from"} {assignment.className}
                              </div>
                              {assignment.note && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {assignment.note}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {getDueBadge()}
                                {isCompleted && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {t.home.completed}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
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
