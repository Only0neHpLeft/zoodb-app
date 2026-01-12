"use client"

import { useLanguage } from '@/contexts/language-context'

export function LoadingFallback() {
  const { t } = useLanguage()

  return <div>{t.common.loading}</div>
}
