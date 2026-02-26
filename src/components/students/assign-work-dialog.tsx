import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ClipboardList, ChevronRight, ChevronDown } from "lucide-react"
import { categoriesArray } from "@/data/categories"
import { useTranslateCategory } from "@/hooks/use-translate-category"
import { useTranslateDifficulty } from "@/hooks/use-translate-difficulty"
import { useCreateBulkAssignments } from "@/lib/db/convex-db"
import type { Id } from "../../../convex/_generated/dataModel"

interface AssignWorkDialogProps {
  classId: Id<"classes">
  userId: string
  t: {
    pages: { students: Record<string, string> }
    common: Record<string, string>
  }
}

export function AssignWorkDialog({ classId, userId, t }: AssignWorkDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  )
  const [selectedTasks, setSelectedTasks] = useState<Map<string, Set<number>>>(
    new Map()
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )
  const [dueDate, setDueDate] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { translateCategory } = useTranslateCategory()
  const { translateDifficulty, difficultyColors } = useTranslateDifficulty()
  const createBulkAssignments = useCreateBulkAssignments()

  function resetForm() {
    setSelectedCategories(new Set())
    setSelectedTasks(new Map())
    setExpandedCategories(new Set())
    setDueDate("")
    setNote("")
  }

  function toggleCategory(letter: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(letter)) {
        next.delete(letter)
      } else {
        next.add(letter)
        // When selecting whole category, clear individual task selections for it
        setSelectedTasks((prevTasks) => {
          const nextTasks = new Map(prevTasks)
          nextTasks.delete(letter)
          return nextTasks
        })
      }
      return next
    })
  }

  function toggleTask(letter: string, taskIndex: number) {
    // If the whole category is selected, ignore individual task toggles
    if (selectedCategories.has(letter)) return

    setSelectedTasks((prev) => {
      const next = new Map(prev)
      const taskSet = new Set(next.get(letter) ?? [])
      if (taskSet.has(taskIndex)) {
        taskSet.delete(taskIndex)
      } else {
        taskSet.add(taskIndex)
      }
      if (taskSet.size === 0) {
        next.delete(letter)
      } else {
        next.set(letter, taskSet)
      }
      return next
    })
  }

  function toggleExpanded(letter: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(letter)) {
        next.delete(letter)
      } else {
        next.add(letter)
      }
      return next
    })
  }

  function hasSelection(): boolean {
    return selectedCategories.size > 0 || selectedTasks.size > 0
  }

  async function handleSubmit() {
    if (!hasSelection()) return

    setIsSubmitting(true)
    try {
      // Build assignments array
      const assignments: Array<{
        categoryLetter: string
        taskIndex?: number
      }> = []

      // Whole categories
      for (const letter of selectedCategories) {
        assignments.push({ categoryLetter: letter })
      }

      // Individual tasks
      for (const [letter, taskIndices] of selectedTasks) {
        // Skip if whole category is already selected
        if (selectedCategories.has(letter)) continue
        for (const taskIndex of taskIndices) {
          assignments.push({ categoryLetter: letter, taskIndex })
        }
      }

      await createBulkAssignments({
        classId,
        teacherUserId: userId,
        assignments,
        dueDate: dueDate
          ? Math.floor(new Date(dueDate).getTime())
          : undefined,
        note: note.trim() || undefined,
      })

      toast.success(
        t.pages.students.assignmentCreated || "Assignment created successfully"
      )
      setIsOpen(false)
      resetForm()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create assignment"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <ClipboardList className="h-4 w-4 mr-2" />
          {t.pages.students.assignWork || "Assign Work"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t.pages.students.assignToClass || "Assign to Class"}
          </DialogTitle>
          <DialogDescription>
            {t.pages.students.selectCategories || "Select Categories"}
          </DialogDescription>
        </DialogHeader>

        {/* Category/Task selection */}
        <ScrollArea className="h-[320px] pr-3">
          <div className="space-y-1">
            {categoriesArray.map((rawCategory) => {
              const category = translateCategory(rawCategory)
              const letter = category.letter
              const isExpanded = expandedCategories.has(letter)
              const isCategorySelected = selectedCategories.has(letter)
              const selectedTaskSet = selectedTasks.get(letter)
              const selectedTaskCount = selectedTaskSet?.size ?? 0

              return (
                <div key={letter}>
                  {/* Category row */}
                  <div className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/50">
                    <Checkbox
                      checked={isCategorySelected}
                      onCheckedChange={() => toggleCategory(letter)}
                    />
                    <Badge
                      variant="outline"
                      className="h-6 w-6 flex items-center justify-center p-0 text-xs font-mono shrink-0"
                    >
                      {letter}
                    </Badge>
                    <span className="text-sm font-medium truncate flex-1">
                      {category.title}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {category.tasks.length}{" "}
                      {category.tasks.length === 1 ? "task" : "tasks"}
                      {selectedTaskCount > 0 &&
                        !isCategorySelected &&
                        ` (${selectedTaskCount} selected)`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => toggleExpanded(letter)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded task list */}
                  {isExpanded && (
                    <div className="ml-8 space-y-0.5 pb-1">
                      {category.tasks.map((task, taskIndex) => {
                        const isTaskSelected =
                          isCategorySelected ||
                          (selectedTaskSet?.has(taskIndex) ?? false)

                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 py-1 px-1 rounded-md hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={isTaskSelected}
                              disabled={isCategorySelected}
                              onCheckedChange={() =>
                                toggleTask(letter, taskIndex)
                              }
                            />
                            <span className="text-sm truncate flex-1">
                              {task.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-xs shrink-0 ${difficultyColors[task.difficulty]}`}
                            >
                              {translateDifficulty(task.difficulty)}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Due date */}
        <div className="space-y-2">
          <Label htmlFor="due-date">
            {t.pages.students.dueDate || "Due Date"}
          </Label>
          <Input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="assignment-note">
            {t.pages.students.assignmentNote || "Note (optional)"}
          </Label>
          <Textarea
            id="assignment-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              t.pages.students.assignmentNotePlaceholder ||
              "Instructions for students..."
            }
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasSelection()}
          >
            {isSubmitting
              ? "..."
              : t.pages.students.assignWork || "Assign Work"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
