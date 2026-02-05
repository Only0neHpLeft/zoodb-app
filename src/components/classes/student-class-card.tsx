import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Users, Calendar, LogOut } from "lucide-react"
import { useLeaveClass } from "@/lib/db/convex-db"
import type { Id } from "../../../convex/_generated/dataModel"

interface StudentClassCardProps {
  cls: {
    _id: Id<"classes">
    name: string
    description?: string
    studentCount?: number
    joinedAt?: number
  }
  clerkId: string
  formatDate: (timestamp: number | undefined) => string
  t: { pages: { classes: Record<string, string> }; common: Record<string, string> }
}

export function StudentClassCard({ cls, clerkId, formatDate, t }: StudentClassCardProps) {
  const leaveClass = useLeaveClass()

  async function handleLeave() {
    try {
      await leaveClass({
        studentClerkId: clerkId,
        classId: cls._id,
      })
      toast.success(t.pages.classes.leftClass)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave class')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{cls.name}</CardTitle>
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
            <span>{t.pages.classes.joined}: {formatDate(cls.joinedAt)}</span>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <LogOut className="h-3 w-3 mr-2" />
              {t.pages.classes.leaveClass}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.pages.classes.leaveClass}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.pages.classes.confirmLeave}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeave}>
                {t.pages.classes.leaveClass}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
