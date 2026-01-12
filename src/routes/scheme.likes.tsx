import { createFileRoute } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { useLanguage } from "@/contexts/language-context"
import { Heart } from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

export const Route = createFileRoute("/scheme/likes")({
  component: LikesPage,
})

function LikesPage() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4"><SidebarTrigger /><Breadcrumbs /></div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-16 bg-muted"><Heart className="size-8" /></EmptyMedia>
            <EmptyTitle className="text-2xl">{t.pages.likes.title}</EmptyTitle>
            <EmptyDescription className="max-w-md text-center">{t.pages.likes.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    </div>
  )
}
