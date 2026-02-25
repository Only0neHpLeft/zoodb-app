import { createFileRoute, useNavigate } from "@tanstack/react-router"
import React, { useState, useEffect, useCallback } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Notifications } from "@/components/notifications"
import { BookOpen, CheckCircle2, Play, Terminal, Lightbulb, ChevronLeft, ChevronRight, Code2, TableIcon, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AlertTriangle } from "lucide-react"
import { getCategoryByLetter } from "@/data/categories"
import { useLanguage } from "@/contexts/language-context"
import { useTranslateDifficulty } from "@/hooks/use-translate-difficulty"
import { useTranslateCategory } from "@/hooks/use-translate-category"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { SqlEditor } from "@/components/sql-editor"
import { executeQuery, type QueryResult } from "@/lib/db/pglite"
import { notifyDataChange } from "@/lib/db/events"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { compareResults, getTaskReference, translateQueryToEnglish, type ValidationResult } from "@/lib/validation"
import { tableNames, columnNames, type TableKey } from "@/lib/db/schema-mapping"
import { useSaveTaskProgress, useStudentProgress } from "@/lib/db/convex-db"
import { useSettingsSync } from "@/hooks/use-settings-sync"
import { useLessonAccess } from "@/hooks/use-lesson-access"

type EditorSearch = {
  lesson?: string
  task?: number
}

type ViewMode = 'editor' | 'output'

export const Route = createFileRoute("/editor")({
  validateSearch: (search: Record<string, unknown>): EditorSearch => {
    return {
      lesson: search.lesson as string | undefined,
      task: search.task ? Number(search.task) : undefined,
    }
  },
  component: EditorPage,
})

function EditorPage() {
  const navigate = useNavigate()
  const { lesson: lessonParam, task: taskParam } = Route.useSearch()
  const { t, language } = useLanguage()
  const { translateDifficulty, difficultyColors } = useTranslateDifficulty()
  const { translateCategory } = useTranslateCategory()

  const [localCompleted, setLocalCompleted] = useState<{ [key: string]: boolean[] }>({})
  const [sqlQuery, setSqlQuery] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null)
  const [isValidated, setIsValidated] = useState<boolean | null>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [showDestructiveDialog, setShowDestructiveDialog] = useState(false)
  const [destructiveConfirmText, setDestructiveConfirmText] = useState('')
  const { userId } = useSettingsSync()
  const saveTaskProgress = useSaveTaskProgress()
  const dbProgress = useStudentProgress(userId ?? undefined)

  useEffect(() => {
    if (!userId) {
      const saved = localStorage.getItem('sqlLessonsProgress')
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

  const { isUnlocked, loading: accessLoading } = useLessonAccess(lessonParam, completedTasks)

  useEffect(() => {
    if (!accessLoading && lessonParam && !isUnlocked) {
      toast.error(t.category?.locked || "Category Locked", {
        description: t.category?.lockedMessage || "Complete the previous category to unlock this one",
      })
      navigate({ to: "/" })
    }
  }, [accessLoading, isUnlocked, lessonParam, navigate, t])

  useEffect(() => {
    setSqlQuery('')
    setShowHint(false)
    setResult(null)
    setError(null)
    setViewMode('editor')
    setValidationResults(null)
    setIsValidated(null)
  }, [lessonParam, taskParam])

  const originalCategory = getCategoryByLetter(lessonParam || '')
  const category = originalCategory ? translateCategory(originalCategory) : null

  const selectedTaskIndex = taskParam ? taskParam - 1 : 0
  const currentTask = category?.tasks[selectedTaskIndex]
  const isTaskSelected = category !== null && currentTask !== undefined

  const categoryTasks = category ? (completedTasks[category.letter] || []) : []

  const selectTask = (taskIndex: number) => {
    navigate({ to: '/editor', search: { lesson: lessonParam, task: taskIndex + 1 } })
  }

  const markTaskComplete = useCallback((categoryLetter: string, taskIndex: number) => {
    if (userId) {
      saveTaskProgress({
        userId,
        categoryLetter,
        taskIndex,
        taskId: `${categoryLetter}-${taskIndex}`,
        completed: true,
      }).catch(() => {})
    } else {
      setLocalCompleted(prev => {
        const updated = { ...prev }
        if (!updated[categoryLetter]) updated[categoryLetter] = []
        updated[categoryLetter][taskIndex] = true
        localStorage.setItem('sqlLessonsProgress', JSON.stringify(updated))
        return updated
      })
    }
  }, [userId, saveTaskProgress])

  // Check if a SQL query is destructive (DROP, DELETE, TRUNCATE, ALTER)
  const isDestructiveQuery = useCallback((sql: string) => {
    const trimmed = sql.trim().toUpperCase()
    return (
      trimmed.startsWith('DROP') ||
      trimmed.startsWith('DELETE') ||
      trimmed.startsWith('TRUNCATE') ||
      trimmed.startsWith('ALTER')
    )
  }, [])

  // Core execution logic — separated so the destructive confirmation dialog can also call it
  const executeCurrentQuery = useCallback(async () => {
    setIsExecuting(true)
    setError(null)
    setResult(null)
    setValidationResults(null)
    setIsValidated(null)

    try {
      const queryResult = await executeQuery(sqlQuery)
      setResult(queryResult)
      setViewMode('output')

      // Check if query modifies data and notify sidebar
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

      // Validate the result if we have a task selected
      if (category && taskParam) {
        const taskId = `${category.letter}${taskParam}`
        const taskRef = getTaskReference(taskId)

        if (taskRef) {
          // Try Czech reference query first; if empty, try English translation
          let refResult = await executeQuery(taskRef.referenceQuery, { isReference: true })
          if (refResult.rowCount === 0) {
            const englishQuery = translateQueryToEnglish(taskRef.referenceQuery)
            if (englishQuery !== taskRef.referenceQuery) {
              refResult = await executeQuery(englishQuery, { isReference: true })
            }
          }
          const comparison = compareResults(
            queryResult,
            refResult,
            taskRef.compareMode,
            taskRef.strictColumns,
            taskRef.hints,
            sqlQuery,
          )

          // Map comparison to existing UI state
          const results: ValidationResult[] = comparison.hintResults || [
            { passed: comparison.passed, message: comparison.message }
          ]
          setValidationResults(results)
          setIsValidated(comparison.passed)

          if (comparison.passed) {
            markTaskComplete(category.letter, selectedTaskIndex)
            toast.success(t.task?.taskCompleted || "Task completed!", {
              description: t.task?.correctSolution || "Your solution is correct"
            })
            // Show column warning if any
            if (comparison.warnings?.length) {
              toast.info(comparison.warnings[0])
            }
          } else {
            const failedHints = results.filter(r => !r.passed)
            toast.error(t.task?.incorrectSolution || "Not quite right", {
              description: failedHints[0]?.message || comparison.message
            })
          }
        } else {
          // No reference for this task, just show execution success
          toast.success(t.task?.querySuccess || "Query executed", {
            description: `${queryResult.rowCount} ${queryResult.rowCount === 1 ? 'row' : 'rows'} in ${queryResult.executionTime.toFixed(2)}ms`
          })
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Query execution failed"
      setError(errorMessage)
      setViewMode('output')
      toast.error(t.task?.queryError || "Query failed")
    } finally {
      setIsExecuting(false)
    }
  }, [sqlQuery, t, category, taskParam, selectedTaskIndex, markTaskComplete])

  const handleRunQuery = useCallback(async () => {
    if (!sqlQuery.trim()) {
      toast.error(t.task?.emptyQuery || "Please enter a SQL query")
      return
    }

    // Intercept destructive queries with confirmation dialog
    if (isDestructiveQuery(sqlQuery)) {
      setDestructiveConfirmText('')
      setShowDestructiveDialog(true)
      return
    }

    executeCurrentQuery()
  }, [sqlQuery, t, isDestructiveQuery, executeCurrentQuery])

  const handleDestructiveConfirm = useCallback(() => {
    setShowDestructiveDialog(false)
    setDestructiveConfirmText('')
    executeCurrentQuery()
  }, [executeCurrentQuery])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRunQuery()
    }
  }, [handleRunQuery])

  if (accessLoading && lessonParam) return null

  if (!category) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between border-b px-4 h-12">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">{t.breadcrumbs.editor}</span>
          </div>
          <Notifications />
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-12 bg-muted">
                <BookOpen className="size-6" />
              </EmptyMedia>
              <EmptyTitle>{t.category.noLessonSelected}</EmptyTitle>
              <EmptyDescription className="max-w-sm text-center">
                {t.category.chooseLessonMessage}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => navigate({ to: '/' })}>
                {t.category.backToLessons}
              </Button>
            </EmptyContent>
          </Empty>
        </main>
      </div>
    )
  }

  const isCompleted = currentTask ? (categoryTasks[selectedTaskIndex] || false) : false

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header with Breadcrumbs */}
      <header className="flex items-center justify-between border-b px-4 h-12 shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <nav className="flex items-center text-sm">
            <button
              onClick={() => navigate({ to: '/' })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {category.title}
            </button>
            {isTaskSelected && (
              <>
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
                <span>{t.task.task} {taskParam}</span>
              </>
            )}
          </nav>
        </div>
        <Notifications />
      </header>

      {isTaskSelected && currentTask ? (
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Task Info Section */}
          <div className="px-6 py-4 shrink-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg font-semibold truncate">{currentTask.title}</h1>
                <Badge className={cn(difficultyColors[currentTask.difficulty], "shrink-0 text-[10px]")} variant="secondary">
                  {translateDifficulty(currentTask.difficulty)}
                </Badge>
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>

              {/* Task Navigation + Hint */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-0.5 mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={selectedTaskIndex === 0}
                    onClick={() => selectTask(selectedTaskIndex - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {category.tasks.map((_, index) => {
                    const done = categoryTasks[index] || false
                    const active = selectedTaskIndex === index
                    return (
                      <button
                        key={index}
                        onClick={() => selectTask(index)}
                        className={cn(
                          "h-6 w-6 rounded text-xs font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : done
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {done && !active ? <CheckCircle2 className="h-3 w-3 mx-auto" /> : index + 1}
                      </button>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={selectedTaskIndex === category.tasks.length - 1}
                    onClick={() => selectTask(selectedTaskIndex + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant={showHint ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => setShowHint(!showHint)}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span className="text-xs">{t.task.hint}</span>
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{currentTask.description}</p>

            {showHint && (
              <div className="mt-3 space-y-3">
                <div className="p-3 rounded-md bg-secondary/40 text-sm">
                  {currentTask.hint}
                </div>
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

          {/* Editor/Output Section */}
          <div className="flex-1 flex flex-col px-6 pb-4 overflow-hidden">
            <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
              {/* Tab Bar */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-muted/40 border-b shrink-0">
                <div className="flex items-center gap-1">
                  <Button
                    variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setViewMode('editor')}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    SQL
                  </Button>
                  <Button
                    variant={viewMode === 'output' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setViewMode('output')}
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                    Output
                    {result && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        {result.rowCount}
                      </Badge>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {result && (
                    <span className="text-xs text-muted-foreground">
                      {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'} · {result.executionTime.toFixed(1)}ms
                    </span>
                  )}
                  {isValidated !== null && (
                    <button
                      onClick={() => !isValidated && setShowValidationDialog(true)}
                      className={cn(
                        "flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors",
                        isValidated
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive hover:bg-destructive/20 cursor-pointer"
                      )}
                    >
                      {isValidated ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      <span>{isValidated ? "Correct" : "Incorrect"}</span>
                    </button>
                  )}
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2 gap-1"
                    onClick={handleRunQuery}
                    disabled={isExecuting || !sqlQuery.trim()}
                  >
                    <Play className="h-3 w-3" />
                    Run
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {viewMode === 'editor' ? (
                  <SqlEditor
                    value={sqlQuery}
                    onChange={setSqlQuery}
                    onKeyDown={handleKeyDown}
                    placeholder="SELECT * FROM animals;"
                    disabled={isExecuting}
                  />
                ) : (
                  <div className="h-full flex flex-col overflow-auto">
                    {error ? (
                        <div className="p-4">
                          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                            <pre className="font-mono text-xs text-destructive whitespace-pre-wrap">{error}</pre>
                          </div>
                        </div>
                      ) : result && result.rowCount > 0 ? (
                        <ScrollArea className="h-full">
                          <Table className="table-fixed w-full">
                            <TableHeader className="sticky top-0 bg-muted/50">
                              <TableRow>
                                {result.columns.map((col) => (
                                  <TableHead key={col} className="text-xs font-semibold text-primary border-r last:border-r-0 text-center">{col}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.rows.map((row, i) => (
                                <TableRow key={i}>
                                  {result.columns.map((col) => (
                                    <TableCell key={col} className="text-xs font-mono py-1.5 border-r last:border-r-0">
                                      {row[col] === null ? (
                                        <span className="text-muted-foreground italic">NULL</span>
                                      ) : (
                                        String(row[col])
                                      )}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      ) : result ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                          <span className="text-sm">Query executed (no rows)</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Terminal className="h-8 w-8 mb-2 opacity-20" />
                          <span className="text-xs">Run a query to see results</span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Select a task</p>
          </div>
        </main>
      )}

      {/* Validation Feedback Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {t.task?.validationFailed || "Validation Failed"}
            </DialogTitle>
            <DialogDescription>
              {t.task?.checkFollowing || "Check the following issues with your query:"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {validationResults?.map((result, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 p-2 rounded text-sm",
                  result.passed
                    ? "bg-primary/5 text-primary"
                    : "bg-destructive/5 text-destructive"
                )}
              >
                {result.passed ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
