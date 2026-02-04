import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { OfflineIndicator } from "@/components/offline-indicator"
import { Notifications } from "@/components/notifications"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Lock, Coins } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { categoriesArray, bonusLetters } from "@/data/categories"
import { useLanguage } from "@/contexts/language-context"
import { useTranslateDifficulty } from "@/hooks/use-translate-difficulty"
import { useTranslateCategory } from "@/hooks/use-translate-category"
import { useMembership } from "@/contexts/membership-context"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { translateDifficulty, difficultyColors } = useTranslateDifficulty()
  const { translateCategory } = useTranslateCategory()
  const { membership } = useMembership()
  const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean[] }>({})

  useEffect(() => {
    const saved = localStorage.getItem("sqlLessonsProgress")
    if (saved) {
      setCompletedTasks(JSON.parse(saved))
    }
  }, [])

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categoriesArray.map((originalCategory, index) => {
              const category = translateCategory(originalCategory)
              const categoryTasks = completedTasks[category.letter] || []
              const categoryCompletedCount = categoryTasks.filter(Boolean).length
              const isFullyCompleted = categoryCompletedCount === category.tasks.length

              const isFreePlan = !membership || membership.plan_type === "free"
              const isPaidCategory = index >= 3

              let isUnlocked = index === 0

              if (isFreePlan && isPaidCategory) {
                isUnlocked = false
              } else if (index > 0) {
                const previousCategory = categoriesArray[index - 1]
                const previousTasks = completedTasks[previousCategory.letter] || []
                const previousCompletedCount = previousTasks.filter(Boolean).length
                isUnlocked = previousCompletedCount === previousCategory.tasks.length
              }

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
                  onClick={() => isUnlocked && navigate({ to: "/editor" as any, search: { lesson: category.letter, task: 1 } as any })}
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
