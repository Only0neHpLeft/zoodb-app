import { useLanguage } from '@/contexts/language-context'

export function useTranslateDifficulty() {
  const { t } = useLanguage()

  const translateDifficulty = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    return t.difficulty[difficulty]
  }

  const difficultyColors = {
    Easy: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    Hard: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  }

  return { translateDifficulty, difficultyColors }
}
