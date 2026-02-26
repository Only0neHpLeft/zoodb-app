import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Copy, Check, Users, Calendar, Trash2 } from "lucide-react"
import { Link } from "@tanstack/react-router"
import type { Id } from "../../../convex/_generated/dataModel"
import { EditClassDialog } from "@/components/classes/edit-class-dialog"

interface TeacherClassCardProps {
  cls: {
    _id: Id<"classes">
    name: string
    description?: string
    code: string
    allowJoin: boolean
    maxStudents: number
    studentCount?: number
    _creationTime: number
  }
  userId: string
  onDelete: (classId: Id<"classes">) => void
  formatDate: (timestamp: number | undefined) => string
  t: { pages: { classes: Record<string, string> }; common: Record<string, string> }
}

export function TeacherClassCard({ cls, userId, onDelete, formatDate, t }: TeacherClassCardProps) {
  const [copied, setCopied] = useState(false)

  function copyClassCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success(t.pages.classes.codeCopied)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{cls.name}</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {cls.code}
          </Badge>
        </div>
        {cls.description && (
          <CardDescription>{cls.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{cls.studentCount ?? 0} {t.pages.classes.students}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(cls._creationTime)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyClassCode(cls.code)}
          >
            {copied ? <Check className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
            {t.pages.classes.copyCode}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/students" search={{ class: cls._id }}>
              <Users className="h-3 w-3 mr-1" />
              {t.pages.classes.manageStudents || "Manage Students"}
            </Link>
          </Button>
          <EditClassDialog
            classId={cls._id}
            userId={userId}
            initialData={{
              name: cls.name,
              description: cls.description,
              allowJoin: cls.allowJoin,
              maxStudents: cls.maxStudents,
            }}
            t={t}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.pages.classes.deleteClass}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.pages.classes.confirmDelete}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(cls._id)}>
                  {t.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
