import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BookOpen } from "lucide-react"
import { useJoinClass } from "@/lib/db/convex-db"

interface JoinClassDialogProps {
  userId: string // userId passed from parent
  t: { pages: { classes: Record<string, string> } }
}

export function JoinClassDialog({ userId, t }: JoinClassDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const joinClass = useJoinClass()

  async function handleJoin() {
    if (!joinCode.trim()) return

    setIsJoining(true)
    try {
      await joinClass({
        studentUserId: userId,
        classCode: joinCode.trim(),
      })
      toast.success(t.pages.classes.classJoined)
      setIsOpen(false)
      setJoinCode('')
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      if (msg.includes('Invalid')) {
        toast.error(t.pages.classes.invalidCode)
      } else if (msg.includes('already enrolled') || msg.includes('Already enrolled')) {
        toast.error(t.pages.classes.alreadyMember)
      } else {
        toast.error(msg || 'Failed to join class')
      }
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookOpen className="mr-2 h-4 w-4" />
          {t.pages.classes.joinClass}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.pages.classes.joinClass}</DialogTitle>
          <DialogDescription>
            {t.pages.classes.enterClassCode}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="join-code">{t.pages.classes.classCode}</Label>
            <Input
              id="join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t.pages.classes.enterCodePlaceholder}
              className="font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleJoin} disabled={isJoining || !joinCode.trim()}>
            {isJoining ? '...' : t.pages.classes.joinButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
