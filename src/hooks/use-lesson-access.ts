import { categoriesArray } from "@/data/categories"
import { useMembership, type UserMembership } from "@/contexts/membership-context"

interface LessonAccessResult {
  isUnlocked: boolean
  isFreePlan: boolean
  isPaidCategory: boolean
}

interface LessonAccessHookResult extends LessonAccessResult {
  loading: boolean
}

/**
 * Pure function — computes access for a given category letter.
 * Usable inside loops (e.g. the home page .map()).
 */
export function checkLessonAccess(
  lessonLetter: string,
  categoryIndex: number,
  membership: UserMembership | null,
  completedTasks: { [key: string]: boolean[] }
): LessonAccessResult {
  const isFreePlan = !membership || membership.plan_type === "free"
  const isPaidCategory = categoryIndex >= 3

  let isUnlocked = categoryIndex === 0

  if (isFreePlan && isPaidCategory) {
    isUnlocked = false
  } else if (categoryIndex > 0) {
    const previousCategory = categoriesArray[categoryIndex - 1]
    const previousTasks = completedTasks[previousCategory.letter] || []
    const previousCompletedCount = previousTasks.filter(Boolean).length
    isUnlocked = previousCompletedCount === previousCategory.tasks.length
  }

  return { isUnlocked, isFreePlan, isPaidCategory }
}

/**
 * Hook — fetches membership internally and computes access.
 * Use in editor routes where membership isn't already available.
 */
export function useLessonAccess(
  lessonLetter: string | undefined,
  completedTasks: { [key: string]: boolean[] }
): LessonAccessHookResult {
  const { membership, loading } = useMembership()

  if (!lessonLetter) {
    return { isUnlocked: false, isFreePlan: true, isPaidCategory: false, loading }
  }

  const categoryIndex = categoriesArray.findIndex(c => c.letter === lessonLetter)

  if (categoryIndex === -1) {
    return { isUnlocked: false, isFreePlan: true, isPaidCategory: false, loading }
  }

  const { isUnlocked, isFreePlan, isPaidCategory } = checkLessonAccess(
    lessonLetter,
    categoryIndex,
    membership,
    completedTasks
  )

  return { isUnlocked, isFreePlan, isPaidCategory, loading }
}
