import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronRight, Lightbulb, Clock, Target } from "lucide-react"
import { categoriesArray } from "@/data/categories"
import { useLanguage } from "@/contexts/language-context"

interface CategoryProgress {
  categoryLetter: string
  tasksCompleted: number
  tasksAttempted: number
  attempts: number
  successfulAttempts: number
  hintsUsed: number
  timeSpentSeconds: number
}

interface StudentData {
  studentId: string
  studentName: string | null
  studentEmail: string
  tasksCompleted: number
  totalAttempts: number
  totalSuccessfulAttempts: number
  totalHintsUsed: number
  totalTimeSpentSeconds: number
  lastActive?: number
  categoryProgress: CategoryProgress[]
  taskDetails: Array<{
    categoryLetter: string
    taskIndex: number
    taskId: string
    completed: boolean
    attemptCount: number
    successfulAttempts: number
    hintsUsed: number
    timeSpentSeconds: number
    lastAttemptAt: number
  }>
}

interface ClassStudentsTableProps {
  classData: {
    name: string
    code: string
  }
  students: StudentData[] | undefined
  onClose: () => void
  timeAgo: (timestamp: number | undefined) => string
  t: { pages: { classes: Record<string, string> }; common: Record<string, string> }
}

const totalTasks = categoriesArray.reduce((sum, cat) => sum + cat.tasks.length, 0)

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 80) return "bg-green-500/10 text-green-600 dark:text-green-400"
  if (rate >= 50) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
  return "bg-red-500/10 text-red-600 dark:text-red-400"
}

function StudentRow({ student, timeAgo, t }: { student: StudentData; timeAgo: (ts: number | undefined) => string; t: ClassStudentsTableProps["t"] }) {
  const [expanded, setExpanded] = useState(false)
  const { categoryTranslations } = useLanguage()

  const successRate = student.totalAttempts > 0
    ? Math.round((student.totalSuccessfulAttempts / student.totalAttempts) * 100)
    : 0

  const completionPct = totalTasks > 0
    ? Math.round((student.tasksCompleted / totalTasks) * 100)
    : 0

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-8">
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
        </TableCell>
        <TableCell className="font-medium">{student.studentName || "Unknown"}</TableCell>
        <TableCell>{student.studentEmail}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="text-sm tabular-nums">{student.tasksCompleted}/{totalTasks}</span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </TableCell>
        <TableCell className="tabular-nums">{student.totalHintsUsed}</TableCell>
        <TableCell className="tabular-nums">{formatTime(student.totalTimeSpentSeconds)}</TableCell>
        <TableCell>
          <Badge variant="secondary" className={getSuccessRateColor(successRate)}>
            {successRate}%
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">{timeAgo(student.lastActive)}</TableCell>
      </TableRow>
      {expanded && student.categoryProgress?.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 p-4">
            <div className="mb-2 text-sm font-medium">{t.pages.classes.categoryProgress}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {student.categoryProgress.map((cp) => {
                const catData = categoriesArray.find((c) => c.letter === cp.categoryLetter)
                const catTotalTasks = catData?.tasks.length ?? 0
                const catTranslation = categoryTranslations[cp.categoryLetter as keyof typeof categoryTranslations] as { title: string } | undefined
                const catTitle = catTranslation?.title ?? cp.categoryLetter
                const catCompletionPct = catTotalTasks > 0
                  ? Math.round((cp.tasksCompleted / catTotalTasks) * 100)
                  : 0
                const catSuccessRate = cp.attempts > 0
                  ? Math.round((cp.successfulAttempts / cp.attempts) * 100)
                  : 0

                return (
                  <div
                    key={cp.categoryLetter}
                    className="rounded-lg border bg-background p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cp.categoryLetter}. {catTitle}</span>
                      <span className="text-xs text-muted-foreground">{cp.tasksCompleted}/{catTotalTasks}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${catCompletionPct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        {cp.hintsUsed}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(cp.timeSpentSeconds)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {catSuccessRate}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function ClassStudentsTable({ classData, students, onClose, timeAgo, t }: ClassStudentsTableProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{classData.name} - {t.pages.classes.students}</CardTitle>
            <CardDescription>
              {t.pages.classes.classCode}: <span className="font-mono">{classData.code}</span>
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t.common.close}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {students === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !students || students.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>{t.pages.classes.noStudents}</p>
            <p className="text-sm mt-2">{t.pages.classes.noStudentsDescription}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t.pages.classes.studentName}</TableHead>
                <TableHead>{t.pages.classes.studentEmail}</TableHead>
                <TableHead>{t.pages.classes.tasksCompleted}</TableHead>
                <TableHead>{t.pages.classes.hintsUsed}</TableHead>
                <TableHead>{t.pages.classes.timeSpent}</TableHead>
                <TableHead>{t.pages.classes.successRate}</TableHead>
                <TableHead>{t.pages.classes.lastActive}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <StudentRow
                  key={student.studentId}
                  student={student}
                  timeAgo={timeAgo}
                  t={t}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
