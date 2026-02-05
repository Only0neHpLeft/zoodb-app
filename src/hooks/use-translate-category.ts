import { useLanguage } from '@/contexts/language-context'
import type { Category } from '@/data/types'

type CategoryTranslation = {
  title: string
  description: string
  tasks: Record<string, { title: string; description: string; hint: string }>
}

export function useTranslateCategory() {
  const { categoryTranslations } = useLanguage()

  const translateCategory = (category: Category): Category => {
    const translation = categoryTranslations[category.letter as keyof typeof categoryTranslations] as CategoryTranslation | undefined

    if (!translation) {
      // Return original if no translation found
      return category
    }

    return {
      ...category,
      title: translation.title,
      description: translation.description,
      tasks: category.tasks.map(task => {
        const taskTranslation = translation.tasks?.[task.id]
        if (!taskTranslation) {
          return task
        }
        return {
          ...task,
          title: taskTranslation.title,
          description: taskTranslation.description,
          hint: taskTranslation.hint,
        }
      })
    }
  }

  return { translateCategory }
}
