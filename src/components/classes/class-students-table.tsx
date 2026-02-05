import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface ClassStudentsTableProps {
  classData: {
    name: string
    code: string
  }
  students: Array<{
    studentId: string
    studentName: string | null
    studentEmail: string
    tasksCompleted: number
    lastActive?: number
  }> | undefined
  onClose: () => void
  timeAgo: (timestamp: number | undefined) => string
  t: { pages: { classes: Record<string, string> }; common: Record<string, string> }
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
                <TableHead>{t.pages.classes.studentName}</TableHead>
                <TableHead>{t.pages.classes.studentEmail}</TableHead>
                <TableHead>{t.pages.classes.tasksCompleted}</TableHead>
                <TableHead>{t.pages.classes.lastActive}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-medium">{student.studentName || 'Unknown'}</TableCell>
                  <TableCell>{student.studentEmail}</TableCell>
                  <TableCell>{student.tasksCompleted}</TableCell>
                  <TableCell>{timeAgo(student.lastActive)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
