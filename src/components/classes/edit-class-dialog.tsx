import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { useUpdateClass } from "@/lib/db/convex-db"
import type { Id } from "../../../convex/_generated/dataModel"

interface EditClassDialogProps {
  classId: Id<"classes">
  userId: string
  initialData: {
    name: string
    description?: string
    allowJoin: boolean
    maxStudents: number
  }
  t: { pages: { classes: Record<string, string> }; common: Record<string, string> }
}

export function EditClassDialog({ classId, userId, initialData, t }: EditClassDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(initialData.name)
  const [description, setDescription] = useState(initialData.description ?? "")
  const [allowJoin, setAllowJoin] = useState(initialData.allowJoin)
  const [maxStudents, setMaxStudents] = useState(initialData.maxStudents)
  const [isSaving, setIsSaving] = useState(false)
  const updateClass = useUpdateClass()

  async function handleSave() {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await updateClass({
        teacherUserId: userId,
        classId,
        name: name.trim(),
        description: description.trim() || undefined,
        allowJoin,
        maxStudents,
      })
      toast.success(t.pages.classes.classUpdated || "Class updated successfully")
      setIsOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update class")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) {
        setName(initialData.name)
        setDescription(initialData.description ?? "")
        setAllowJoin(initialData.allowJoin)
        setMaxStudents(initialData.maxStudents)
      }
      setIsOpen(open)
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-3 w-3 mr-1" />
          {t.pages.classes.editClass || "Edit"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.pages.classes.editClass || "Edit Class"}</DialogTitle>
          <DialogDescription>
            {t.pages.classes.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-class-name">{t.pages.classes.className}</Label>
            <Input
              id="edit-class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.pages.classes.classNamePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-class-desc">{t.pages.classes.classDescription || "Description"}</Label>
            <Input
              id="edit-class-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.pages.classes.classDescriptionPlaceholder || "Optional description..."}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-allow-join">{t.pages.classes.toggleJoin || "Allow Joining"}</Label>
            <Switch
              id="edit-allow-join"
              checked={allowJoin}
              onCheckedChange={setAllowJoin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-max-students">{t.pages.classes.maxStudents || "Max Students"}</Label>
            <Input
              id="edit-max-students"
              type="number"
              min={1}
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "..." : t.common.save || "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
