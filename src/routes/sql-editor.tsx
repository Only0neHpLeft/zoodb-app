import { createFileRoute } from "@tanstack/react-router"
import { useState, useCallback } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { SqlEditor } from "@/components/sql-editor"
import { useLanguage } from "@/contexts/language-context"
import { executeQuery, type QueryResult } from "@/lib/db/pglite"
import { Play, Trash2, Clock, Database, AlertCircle, CheckCircle2, Code, TableIcon } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/sql-editor")({
  component: SqlEditorPage,
})

type ViewMode = 'editor' | 'output'

function SqlEditorPage() {
  const { t } = useLanguage()
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')

  const handleExecute = useCallback(async () => {
    if (!query.trim()) {
      toast.error(t.task?.emptyQuery || "Please enter a SQL query")
      return
    }

    setIsExecuting(true)
    setError(null)
    setResult(null)

    try {
      const queryResult = await executeQuery(query)
      setResult(queryResult)
      setViewMode('output')
      toast.success(t.task?.querySuccess || "Query executed successfully", {
        description: `${queryResult.rowCount} ${queryResult.rowCount === 1 ? (t.task?.row || 'row') : (t.task?.rows || 'rows')} returned in ${queryResult.executionTime.toFixed(2)}ms`
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Query execution failed"
      setError(errorMessage)
      setViewMode('output')
      toast.error(t.task?.queryError || "Query execution failed", {
        description: errorMessage
      })
    } finally {
      setIsExecuting(false)
    }
  }, [query, t])

  const handleClear = useCallback(() => {
    setQuery("")
    setResult(null)
    setError(null)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleExecute()
    }
  }, [handleExecute])

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
        <div className="flex flex-col gap-6 h-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t.sidebar?.sqlEditor || "SQL Editor"}</h2>
              <p className="text-muted-foreground">
                {t.category?.sqlEditorDescription || "Write and execute SQL queries against your local database"}
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={viewMode === 'editor' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('editor')}
                className="gap-2"
              >
                <Code className="h-4 w-4" />
                {t.task?.editor || "Editor"}
              </Button>
              <Button
                variant={viewMode === 'output' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('output')}
                className="gap-2"
              >
                <TableIcon className="h-4 w-4" />
                {t.task?.output || "Output"}
                {result && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {result.rowCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {viewMode === 'editor' ? (
              /* Editor View */
              <>
                <div className="flex-1 border rounded-lg overflow-hidden min-h-[300px]">
                  <SqlEditor
                    value={query}
                    onChange={setQuery}
                    onKeyDown={handleKeyDown}
                    placeholder="SELECT * FROM animals LIMIT 10;"
                    disabled={isExecuting}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleExecute}
                    disabled={isExecuting || !query.trim()}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {isExecuting ? (t.task?.executing || "Executing...") : (t.task?.runQuery || "Run Query")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    disabled={isExecuting}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t.task?.clear || "Clear"}
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {t.task?.pressCtrlEnter || "Ctrl+Enter to execute"}
                  </span>
                </div>
              </>
            ) : (
              /* Output View */
              <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
                {/* Results header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    {error ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="font-medium">{t.task?.errorTitle || "Query Error"}</span>
                      </>
                    ) : result ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{t.task?.queryResults || "Query Results"}</span>
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">{t.task?.noResults || "No results"}</span>
                      </>
                    )}
                  </div>
                  {result && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {result.executionTime.toFixed(2)}ms
                      </span>
                      <Badge variant="secondary">
                        {result.rowCount} {result.rowCount === 1 ? (t.task?.row || 'row') : (t.task?.rows || 'rows')}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Results content */}
                <div className="flex-1 overflow-auto">
                  {error ? (
                    <div className="p-4">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <pre className="font-mono text-sm text-destructive whitespace-pre-wrap">
                          {error}
                        </pre>
                      </div>
                    </div>
                  ) : result && result.rowCount > 0 ? (
                    <ScrollArea className="h-full w-full">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/50">
                          <TableRow>
                            {result.columns.map((col) => (
                              <TableHead key={col} className="font-semibold">
                                {col}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {result.columns.map((col) => (
                                <TableCell key={col} className="font-mono text-sm">
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
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                      <CheckCircle2 className="h-10 w-10 mb-3 opacity-50" />
                      <p>{t.task?.queryExecutedNoRows || "Query executed successfully (no rows returned)"}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                      <Database className="h-10 w-10 mb-3 opacity-30" />
                      <p>{t.task?.noResults || "No results yet. Run a query to see the output."}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
