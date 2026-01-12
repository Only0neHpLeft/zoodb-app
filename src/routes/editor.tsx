import { createFileRoute, useNavigate } from "@tanstack/react-router"
import React, { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCategoryByLetter } from "@/data/categories"
import { useLanguage } from "@/contexts/language-context"
import { useTranslateDifficulty } from "@/hooks/use-translate-difficulty"
import { useTranslateCategory } from "@/hooks/use-translate-category"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"

type EditorSearch = {
  lesson?: string
}

export const Route = createFileRoute("/editor")({
  validateSearch: (search: Record<string, unknown>): EditorSearch => {
    return {
      lesson: search.lesson as string | undefined,
    }
  },
  component: EditorPage,
})

function EditorPage() {
  const navigate = useNavigate()
  const { lesson: lessonParam } = Route.useSearch()
  const { t } = useLanguage()
  const { translateDifficulty, difficultyColors } = useTranslateDifficulty()
  const { translateCategory } = useTranslateCategory()

  const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean[] }>({})

  useEffect(() => {
    const saved = localStorage.getItem('sqlLessonsProgress')
    if (saved) {
      setCompletedTasks(JSON.parse(saved))
    }
  }, [])

  const originalCategory = getCategoryByLetter(lessonParam || '')
  const category = originalCategory ? translateCategory(originalCategory) : null

  if (!category) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <nav className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">
                {t.breadcrumbs.editor}
              </span>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-16 bg-muted">
                <BookOpen className="size-8" />
              </EmptyMedia>
              <EmptyTitle className="text-2xl">{t.category.noLessonSelected}</EmptyTitle>
              <EmptyDescription className="max-w-md text-center">
                {t.category.chooseLessonMessage}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => navigate({ to: '/' })}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.category.backToLessons}
              </Button>
            </EmptyContent>
          </Empty>
        </main>
      </div>
    )
  }

  const categoryTasks = completedTasks[category.letter] || []
  const categoryCompletedCount = categoryTasks.filter(Boolean).length
  const overallProgress = category.tasks.length > 0 ? Math.round((categoryCompletedCount / category.tasks.length) * 100) : 0

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <nav className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">
              {t.category.category} {category.letter}
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - overallProgress / 100)}`}
                  className="text-primary transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold">{overallProgress}%</span>
              </div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {categoryCompletedCount} / {category.tasks.length}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                {category.letter}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{category.title}</h1>
                <p className="text-muted-foreground">{category.description}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.category.backToLessons}
            </Button>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">{t.category.tasks}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.tasks.map((task, index) => {
                const isCompleted = categoryTasks[index] || false

                return (
                  <Card
                    key={index}
                    className="group relative overflow-hidden border-2 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary"
                    onClick={() => navigate({ to: '/editor/task' as any, search: { lesson: category.letter, task: index + 1 } as any })}
                  >
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                      <ArrowLeft className="h-5 w-5 text-primary rotate-180" />
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 flex-shrink-0 transition-colors ${isCompleted
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted/50 border-transparent text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary'
                          }`}>
                          <span className="text-lg font-bold">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">
                            {task.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 text-xs">
                            {task.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge className={difficultyColors[task.difficulty]} variant="secondary">
                          {translateDifficulty(task.difficulty)}
                        </Badge>
                        {isCompleted && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-transparent">
                            {t.home.completed}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
