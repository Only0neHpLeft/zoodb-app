import { createFileRoute } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { useLanguage } from "@/contexts/language-context"
import { Badge } from "@/components/ui/badge"
import { Construction, Ham } from "lucide-react"

export const Route = createFileRoute("/scheme/eat")({
  component: EatPage,
})

function EatPage() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Breadcrumbs />
        </div>
      </header>
      <main className="flex-1 p-6 overflow-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
            <Ham className="size-10 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-bold">{t.pages.eat.title}</h2>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                <Construction className="size-3 mr-1" />
                {t.pages.eat.inProduction}
              </Badge>
            </div>
            <p className="text-muted-foreground">{t.pages.eat.description}</p>
          </div>
          <div className="p-6 rounded-lg border bg-muted/30">
            <p className="text-sm text-muted-foreground">{t.pages.eat.comingSoonDescription}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
