import { createFileRoute, useNavigate } from "@tanstack/react-router"
import React, { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, Code2, PlayCircle, Terminal, Lightbulb, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getCategoryByLetter } from "@/data/categories"
import { useLanguage } from "@/contexts/language-context"
import { tableNames, columnNames, type TableKey } from "@/lib/db/schema-mapping"
import { useTranslateDifficulty } from "@/hooks/use-translate-difficulty"
import { useTranslateCategory } from "@/hooks/use-translate-category"
import { executeQuery } from "@/lib/db/pglite"
import { toast } from "sonner"
import { validateQuery } from "@/lib/query-validator"
import { useSaveTaskProgress } from "@/lib/db/convex-db"
import { useSettingsSync } from "@/hooks/use-settings-sync"
import type { ValidationResult, QueryResultRow } from "@/data/types"

type TaskSearch = {
  lesson?: string
  task?: number
}

export const Route = createFileRoute("/editor/task")({
  validateSearch: (search: Record<string, unknown>): TaskSearch => {
    return {
      lesson: search.lesson as string | undefined,
      task: search.task ? Number(search.task) : undefined,
    }
  },
  component: TaskEditorPage,
})

function TaskEditorPage() {
  const navigate = useNavigate()
  const { lesson: lessonParam, task: taskParam } = Route.useSearch()
  const { t, language } = useLanguage()
  const { translateDifficulty, difficultyColors } = useTranslateDifficulty()
  const { translateCategory } = useTranslateCategory()

  const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean[] }>({})
  const [sqlQuery, setSqlQuery] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [queryResults, setQueryResults] = useState<QueryResultRow[] | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const { userId } = useSettingsSync()
  const saveTaskProgress = useSaveTaskProgress()

  useEffect(() => {
    const saved = localStorage.getItem('sqlLessonsProgress')
    if (saved) {
      setCompletedTasks(JSON.parse(saved))
    }
  }, [])

  const originalCategory = getCategoryByLetter(lessonParam || '')
  const category = originalCategory ? translateCategory(originalCategory) : null
  const taskIndex = taskParam ? taskParam - 1 : -1

  const completeTask = (categoryLetter: string, taskIdx: number) => {
    const newCompletedTasks = { ...completedTasks }
    if (!newCompletedTasks[categoryLetter]) {
      newCompletedTasks[categoryLetter] = []
    }
    newCompletedTasks[categoryLetter][taskIdx] = true
    setCompletedTasks(newCompletedTasks)
    localStorage.setItem('sqlLessonsProgress', JSON.stringify(newCompletedTasks))

    if (userId) {
      saveTaskProgress({
        userId,
        categoryLetter,
        taskIndex: taskIdx,
        taskId: `${categoryLetter}-${taskIdx}`,
        completed: true,
        hintsUsed: showHint ? 1 : 0,
      }).catch(() => {})
    }
  }

  const handleHintToggle = () => setShowHint(!showHint)

  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error(t.task.emptyQuery || "Please enter a SQL query")
      return
    }

    setIsExecuting(true)
    setQueryError(null)
    setQueryResults(null)
    setExecutionTime(null)
    setValidationResult(null)

    const startTime = performance.now()

    try {
      const { data, error } = await executeSQL(sqlQuery.trim())
      const endTime = performance.now()
      setExecutionTime(endTime - startTime)

      if (error) {
        setQueryError(error.message || "An error occurred while executing the query")
        toast.error(t.task.queryError || "Query execution failed")
        return
      }

      let results: QueryResultRow[] = []
      if (data === null) {
        results = []
        setQueryResults([])
        toast.success(t.task.querySuccess || "Query executed successfully")
      } else if (Array.isArray(data)) {
        results = data
        setQueryResults(data)
        toast.success(`${t.task.querySuccess || "Query executed successfully"} (${data.length} rows)`)
      } else {
        results = [data]
        setQueryResults([data])
        toast.success(t.task.querySuccess || "Query executed successfully")
      }

      if (currentTask?.validation) {
        const validation = await validateQuery(sqlQuery.trim(), currentTask.validation, results)
        setValidationResult(validation)

        if (validation.isValid) {
          toast.success(t.task.validationSuccess || "Query is correct!")
        } else {
          toast.error(t.task.validationFailed || "Query doesn't meet requirements")
        }

        if (userId) {
          saveTaskProgress({
            userId,
            categoryLetter: category.letter,
            taskIndex,
            taskId: `${category.letter}-${taskIndex}`,
            completed: validation.isValid,
            hintsUsed: showHint ? 1 : 0,
          }).catch(() => {})
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      setQueryError(errorMessage)
      toast.error(t.task.queryError || "Query execution failed")
    } finally {
      setIsExecuting(false)
    }
  }

  if (!category || !taskParam) {
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
          <Card className="border-2">
            <CardContent className="p-12">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">{t.task.noTaskSelected}</h3>
                <p className="text-muted-foreground mb-4">{t.task.chooseTaskMessage}</p>
                <Button onClick={() => navigate({ to: '/' })}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t.category.backToLessons}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const currentTask = category.tasks[taskIndex]
  const isCompleted = completedTasks[category.letter]?.[taskIndex] || false

  if (!currentTask) {
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
          <Card className="border-2">
            <CardContent className="p-12">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">{t.task.taskNotFound}</h3>
                <p className="text-muted-foreground mb-4">{t.task.taskNotFoundMessage}</p>
                <Button onClick={() => navigate({ to: '/editor', search: { lesson: category.letter } })}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t.task.backToCategory}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <nav className="flex items-center gap-2 text-sm">
            <span
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={() => navigate({ to: '/editor', search: { lesson: category.letter } })}
            >
              {t.category.category} {category.letter}
            </span>
            <span className="text-muted-foreground">›</span>
            <span className="font-medium text-foreground">{t.task.task} {taskParam}</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate({ to: '/editor', search: { lesson: category.letter } })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.category.backToCategory} {category.letter}
          </Button>
          <Notifications />
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6">
          {/* Task Header */}
          <div className="border rounded-lg p-6">
            <div className="flex items-start justify-between gap-8">
              <div className="flex gap-5 flex-1">
                <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {category.letter}
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">{category.title}</div>
                    <h1 className="text-2xl font-bold mb-2">{currentTask.title}</h1>
                    <p className="text-muted-foreground">{currentTask.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={difficultyColors[currentTask.difficulty]} variant="secondary">
                      {translateDifficulty(currentTask.difficulty)}
                    </Badge>
                    {isCompleted && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t.task.completed}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-medium text-muted-foreground">
                  {t.category.tasks} {taskParam} {t.category.of} {category.tasks.length}
                </div>
              </div>
            </div>
          </div>

          {/* Hint Section */}
          <div className="border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
              onClick={handleHintToggle}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{t.task.hint}</span>
              </div>
              <span className="text-xs text-muted-foreground">{showHint ? t.task.hide : t.task.show}</span>
            </Button>
            {showHint && (
              <div className="p-4 bg-yellow-50/50 dark:bg-yellow-950/20 border-t space-y-3">
                <p className="text-sm">{currentTask.hint}</p>
                {category.tables && category.tables.length > 0 && (
                  <div className="p-3 rounded-md bg-muted/50 border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.task.availableTables || "Available Tables"}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.tables.map((tableKey) => {
                        const schemaLang = language === "cz" ? "cs" : "en"
                        const tbl = tableNames[tableKey as TableKey]
                        const cols = columnNames[tableKey as TableKey]
                        if (!tbl || !cols) return null
                        const tableName = tbl[schemaLang as "cs" | "en"]
                        const colList = Object.entries(cols)
                          .filter(([key]) => key !== "user_id" && key !== "created_at")
                          .map(([, val]) => (val as { cs: string; en: string })[schemaLang as "cs" | "en"])
                        return (
                          <div key={tableKey} className="rounded-md border bg-background px-2.5 py-1.5 text-xs">
                            <span className="font-semibold text-primary">{tableName}</span>
                            <span className="text-muted-foreground ml-1">({colList.join(", ")})</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SQL Editor */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{t.task.sqlEditor}</h3>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRunQuery} disabled={isExecuting || !sqlQuery.trim()}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {isExecuting ? (t.task.executing || "Executing...") : t.task.runQuery}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => completeTask(category.letter, taskIndex)}
                  disabled={isCompleted}
                  className={isCompleted ? 'text-green-600 dark:text-green-500 border-green-300 dark:border-green-700' : ''}
                >
                  <CheckCircle2 className={`mr-2 h-4 w-4 ${isCompleted ? 'text-green-600 dark:text-green-500' : ''}`} />
                  {isCompleted ? t.task.completed : t.task.markComplete}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSqlQuery('')}>
                  {t.task.clear}
                </Button>
              </div>
            </div>
            <div className="p-4">
              <Textarea
                placeholder="-- Enter your SQL query here
SELECT * FROM animals;"
                className="font-mono min-h-[250px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg p-4 text-base"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Validation Feedback */}
          {validationResult && (
            <div className={`border rounded-lg overflow-hidden ${validationResult.isValid ? 'border-green-500' : 'border-red-500'}`}>
              <div className={`px-4 py-3 border-b flex items-center gap-2 ${validationResult.isValid ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                {validationResult.isValid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <h3 className={`font-semibold ${validationResult.isValid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {validationResult.isValid ? (t.task.validationSuccess || "Query Validation: Passed") : (t.task.validationFailed || "Query Validation: Failed")}
                </h3>
              </div>
              <div className="p-4">
                {validationResult.errors.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 mb-3">
                    {validationResult.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-600 dark:text-red-400">{error}</li>
                    ))}
                  </ul>
                )}
                {validationResult.isValid && (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {t.task.validationSuccessMessage || "Great job! Your query meets all requirements."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Area */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{t.task.queryResults}</h3>
              </div>
              {executionTime !== null && (
                <div className="text-xs text-muted-foreground">
                  {t.task.executionTime || "Execution time"}: {executionTime.toFixed(2)}ms
                </div>
              )}
            </div>
            <div className="p-4">
              {isExecuting ? (
                <div className="rounded-lg p-6 min-h-[250px] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t.task.executing || "Executing query..."}</p>
                  </div>
                </div>
              ) : queryError ? (
                <div className="rounded-lg p-6 min-h-[250px]" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">{t.task.errorTitle || "Query Error"}</h4>
                      <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono">{queryError}</pre>
                    </div>
                  </div>
                </div>
              ) : queryResults !== null ? (
                queryResults.length === 0 ? (
                  <div className="rounded-lg p-6 min-h-[250px] flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                    <div className="text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                        {t.task.queryExecutedNoRows || "Query executed successfully (no rows returned)"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-x-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {Object.keys(queryResults[0]).map((column) => (
                            <th key={column} className="text-left p-3 font-semibold text-muted-foreground bg-muted/30">{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResults.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-border hover:bg-muted/20">
                            {Object.values(row).map((value, colIndex) => (
                              <td key={colIndex} className="p-3 font-mono text-xs">
                                {value === null ? <span className="text-muted-foreground italic">NULL</span> : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
                      {queryResults.length} {queryResults.length === 1 ? (t.task.row || "row") : (t.task.rows || "rows")}
                    </div>
                  </div>
                )
              ) : (
                <div className="rounded-lg p-6 min-h-[250px] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                  <div className="text-center">
                    <Terminal className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">{t.task.noResults}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Task Navigation */}
          <div className="flex justify-between">
            {taskParam > 1 ? (
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/editor/task', search: { lesson: category.letter, task: taskParam - 1 } })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.task.previousTask}
              </Button>
            ) : <div />}
            {taskParam < category.tasks.length && (
              <Button onClick={() => navigate({ to: '/editor/task', search: { lesson: category.letter, task: taskParam + 1 } })}>
                {t.task.nextTask}
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
