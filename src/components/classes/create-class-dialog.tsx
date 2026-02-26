import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { useCreateClass } from "@/lib/db/convex-db"

interface CreateClassDialogProps {
  userId: string // userId passed from parent
  t: { pages: { classes: Record<string, string> } }
}

export function CreateClassDialog({ userId, t }: CreateClassDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const createClass = useCreateClass()

  async function handleCreate() {
    if (!name.trim()) return

    setIsCreating(true)
    try {
      await createClass({
        teacherUserId: userId,
        name: name.trim(),
        description: description.trim() || undefined,
      })
      toast.success(t.pages.classes.classCreated)
      setIsOpen(false)
      setName('')
      setDescription('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create class')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t.pages.classes.createClass}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.pages.classes.createClass}</DialogTitle>
          <DialogDescription>
            {t.pages.classes.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">{t.pages.classes.className}</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.pages.classes.classNamePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-description">{t.pages.classes.classDescription || 'Description'}</Label>
            <Input
              id="class-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.pages.classes.classDescriptionPlaceholder || 'Optional description...'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? '...' : t.pages.classes.createClass}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
