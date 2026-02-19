import { createFileRoute, useNavigate } from "@tanstack/react-router"
import React, { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, Code2, PlayCircle, Terminal, Lightbulb, AlertCircle, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getCategoryByLetter } from "@/data/categories"
import { useLanguage } from "@/contexts/language-context"
import { tableNames, columnNames, type TableKey } from "@/lib/db/schema-mapping"
import { useTranslateDifficulty } from "@/hooks/use-translate-difficulty"
import { useTranslateCategory } from "@/hooks/use-translate-category"
import { executeQuery, type QueryResult } from "@/lib/db/pglite"
import { notifyDataChange } from "@/lib/db/events"
import { toast } from "sonner"
import { validateTask, getTaskRules, type ValidationResult } from "@/lib/validation"
import { useSaveTaskProgress, useStudentProgress } from "@/lib/db/convex-db"
import { useSettingsSync } from "@/hooks/use-settings-sync"
import { useLessonAccess } from "@/hooks/use-lesson-access"

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

  const [localCompleted, setLocalCompleted] = useState<{ [key: string]: boolean[] }>({})
  const [sqlQuery, setSqlQuery] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null)
  const [isValidated, setIsValidated] = useState<boolean | null>(null)
  const [showDestructiveDialog, setShowDestructiveDialog] = useState(false)
  const [destructiveConfirmText, setDestructiveConfirmText] = useState('')
  const { userId } = useSettingsSync()
  const saveTaskProgress = useSaveTaskProgress()
  const dbProgress = useStudentProgress(userId ?? undefined)

  // localStorage fallback for non-logged-in users
  useEffect(() => {
    if (!userId) {
      const saved = localStorage.getItem('sqlLessonsProgress')
      if (saved) {
        try { setLocalCompleted(JSON.parse(saved)) } catch {}
      }
    }
  }, [userId])

  // Derive completedTasks: Convex for logged-in, localStorage for guests
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

  const { isUnlocked, loading: accessLoading } = useLessonAccess(lessonParam, completedTasks)

  useEffect(() => {
    if (!accessLoading && lessonParam && !isUnlocked) {
      toast.error(t.category?.locked || "Category Locked", {
        description: t.category?.lockedMessage || "Complete the previous category to unlock this one",
      })
      navigate({ to: "/" })
    }
  }, [accessLoading, isUnlocked, lessonParam, navigate, t])

  if (accessLoading && lessonParam) return null

  const originalCategory = getCategoryByLetter(lessonParam || '')
  const category = originalCategory ? translateCategory(originalCategory) : null
  const taskIndex = taskParam ? taskParam - 1 : -1

  const completeTask = (categoryLetter: string, taskIdx: number) => {
    if (userId) {
      // Logged in: write to Convex (completedTasks derives from dbProgress reactively)
      saveTaskProgress({
        userId,
        categoryLetter,
        taskIndex: taskIdx,
        taskId: `${categoryLetter}-${taskIdx}`,
        completed: true,
        hintsUsed: showHint ? 1 : 0,
      }).catch(() => {})
    } else {
      // Guest: localStorage fallback
      const updated = { ...localCompleted }
      if (!updated[categoryLetter]) updated[categoryLetter] = []
      updated[categoryLetter][taskIdx] = true
      setLocalCompleted(updated)
      localStorage.setItem('sqlLessonsProgress', JSON.stringify(updated))
    }
  }

  const handleHintToggle = () => setShowHint(!showHint)

  // Check if a SQL query is destructive (DROP, DELETE, TRUNCATE, ALTER)
  const isDestructiveQuery = (sql: string) => {
    const trimmed = sql.trim().toUpperCase()
    return (
      trimmed.startsWith('DROP') ||
      trimmed.startsWith('DELETE') ||
      trimmed.startsWith('TRUNCATE') ||
      trimmed.startsWith('ALTER')
    )
  }

  // Core execution logic — separated so the destructive confirmation dialog can also call it
  const executeCurrentQuery = async () => {
    setIsExecuting(true)
    setQueryError(null)
    setResult(null)
    setValidationResults(null)
    setIsValidated(null)

    try {
      const queryResult = await executeQuery(sqlQuery.trim())
      setResult(queryResult)

      // Notify sidebar if query modifies data
      const trimmedQuery = sqlQuery.trim().toUpperCase()
      const isModifyingQuery =
        trimmedQuery.startsWith('INSERT') ||
        trimmedQuery.startsWith('UPDATE') ||
        trimmedQuery.startsWith('DELETE') ||
        trimmedQuery.startsWith('TRUNCATE') ||
        trimmedQuery.startsWith('DROP') ||
        trimmedQuery.startsWith('ALTER') ||
        trimmedQuery.startsWith('CREATE')

      if (isModifyingQuery) {
        notifyDataChange()
      }

      // Validate if we have a task selected
      if (category && taskParam) {
        const taskId = `${category.letter}${taskParam}`
        const taskRules = getTaskRules(taskId)

        if (taskRules) {
          const validation = validateTask(taskRules, {
            sql: sqlQuery,
            rowCount: queryResult.rowCount,
            columns: queryResult.columns,
            rows: queryResult.rows,
            executionTime: queryResult.executionTime,
          })

          setValidationResults(validation.results)
          setIsValidated(validation.passed)

          if (validation.passed) {
            completeTask(category.letter, taskIndex)
            toast.success(t.task.validationSuccess || "Query Validation: Passed")
          } else {
            toast.error(t.task.validationFailed || "Query Validation: Failed")
          }
        } else {
          toast.success(t.task.querySuccess || "Query executed successfully", {
            description: `${queryResult.rowCount} ${queryResult.rowCount === 1 ? (t.task.row || 'row') : (t.task.rows || 'rows')} · ${queryResult.executionTime.toFixed(1)}ms`
          })
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

  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error(t.task.emptyQuery || "Please enter a SQL query")
      return
    }

    // Intercept destructive queries with confirmation dialog
    if (isDestructiveQuery(sqlQuery)) {
      setDestructiveConfirmText('')
      setShowDestructiveDialog(true)
      return
    }

    executeCurrentQuery()
  }

  const handleDestructiveConfirm = () => {
    setShowDestructiveDialog(false)
    setDestructiveConfirmText('')
    executeCurrentQuery()
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
          {validationResults && isValidated !== null && (
            <div className={`border rounded-lg overflow-hidden ${isValidated ? 'border-green-500' : 'border-red-500'}`}>
              <div className={`px-4 py-3 border-b flex items-center gap-2 ${isValidated ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                {isValidated ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <h3 className={`font-semibold ${isValidated ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {isValidated ? (t.task.validationSuccess || "Query Validation: Passed") : (t.task.validationFailed || "Query Validation: Failed")}
                </h3>
              </div>
              <div className="p-4 space-y-1">
                {validationResults.map((vr, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 text-sm ${vr.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {vr.passed ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <span>{vr.message}</span>
                  </div>
                ))}
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
              {result && (
                <div className="text-xs text-muted-foreground">
                  {t.task.executionTime || "Execution time"}: {result.executionTime.toFixed(2)}ms
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
              ) : result !== null ? (
                result.rowCount === 0 ? (
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
                          {result.columns.map((column) => (
                            <th key={column} className="text-left p-3 font-semibold text-muted-foreground bg-muted/30">{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-border hover:bg-muted/20">
                            {result.columns.map((col) => (
                              <td key={col} className="p-3 font-mono text-xs">
                                {row[col] === null ? <span className="text-muted-foreground italic">NULL</span> : String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
                      {result.rowCount} {result.rowCount === 1 ? (t.task.row || "row") : (t.task.rows || "rows")}
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

      {/* Destructive Query Confirmation Dialog */}
      <Dialog open={showDestructiveDialog} onOpenChange={(open) => {
        setShowDestructiveDialog(open)
        if (!open) setDestructiveConfirmText('')
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {(t.task as any)?.destructiveQuery?.title || "Destructive Query Detected"}
            </DialogTitle>
            <DialogDescription>
              {(t.task as any)?.destructiveQuery?.description || "This query will modify or delete data in your local database. This cannot be undone without restoring from backup."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <pre className="font-mono text-xs text-destructive whitespace-pre-wrap break-all">{sqlQuery}</pre>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {(t.task as any)?.destructiveQuery?.confirmLabel || "Type DELETE to confirm"}
              </label>
              <Input
                value={destructiveConfirmText}
                onChange={(e) => setDestructiveConfirmText(e.target.value)}
                placeholder={(t.task as any)?.destructiveQuery?.confirmPlaceholder || "Type here..."}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowDestructiveDialog(false)
              setDestructiveConfirmText('')
            }}>
              {(t.task as any)?.destructiveQuery?.cancelButton || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              disabled={destructiveConfirmText !== 'DELETE'}
              onClick={handleDestructiveConfirm}
            >
              {(t.task as any)?.destructiveQuery?.confirmButton || "Execute Query"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
