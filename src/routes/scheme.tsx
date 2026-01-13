import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { Bug, Lightbulb, Ambulance, Heart, Bandage, Utensils, Carrot, Ham, ArrowRight } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { executeRawSQL } from "@/lib/db/tauri-db"
import { type Language } from "@/lib/db/schema-mapping"

export const Route = createFileRoute("/scheme")({
  component: SchemePage,
})

function SchemePage() {
  const { t, language } = useLanguage()
  const lang = (language === "cz" ? "cs" : "en") as Language
  const [counts, setCounts] = useState({
    animals: "",
    types: "",
    caretakers: "",
    likes: "",
    treats: "",
  })

  const schemeItems = [
    { title: t.sidebar.animals, description: t.pages.animals.description, icon: Bug, url: "/scheme/animals", badgeKey: "animals" },
    { title: t.sidebar.types, description: t.pages.types.description, icon: Lightbulb, url: "/scheme/types", badgeKey: "types" },
    { title: t.sidebar.caretakers, description: t.pages.caretakers.description, icon: Ambulance, url: "/scheme/caretakers", badgeKey: "caretakers" },
    { title: t.sidebar.likes, description: t.pages.likes.description, icon: Heart, url: "/scheme/likes", badgeKey: "likes" },
    { title: t.sidebar.treats, description: t.pages.treats.description, icon: Bandage, url: "/scheme/treats", badgeKey: "treats" },
    { title: t.sidebar.menu, description: t.pages.menu.description, icon: Utensils, url: "/scheme/menu", badge: "soon" },
    { title: t.sidebar.food, description: t.pages.food.description, icon: Carrot, url: "/scheme/food", badge: "soon" },
    { title: t.sidebar.eat, description: t.pages.eat.description, icon: Ham, url: "/scheme/eat", badge: "soon" },
  ]

  useEffect(() => {
    const loadCounts = async () => {
      try {
        if (lang === "cs") {
          const [typesResult, animalsResult, caretakersResult, treatsResult, likesResult] = await Promise.all([
            executeRawSQL("SELECT COUNT(*) as count FROM druhy WHERE user_id IS NULL"),
            executeRawSQL("SELECT COUNT(*) as count FROM zvirata WHERE user_id IS NULL"),
            executeRawSQL("SELECT COUNT(*) as count FROM osetrovatele WHERE user_id IS NULL"),
            executeRawSQL("SELECT COUNT(*) as count FROM osetruje WHERE user_id IS NULL"),
            executeRawSQL("SELECT COUNT(*) as count FROM ma_rad WHERE user_id IS NULL"),
          ])
          setCounts({
            types: typesResult.data?.[0]?.count?.toString() || "0",
            animals: animalsResult.data?.[0]?.count?.toString() || "0",
            caretakers: caretakersResult.data?.[0]?.count?.toString() || "0",
            treats: treatsResult.data?.[0]?.count?.toString() || "0",
            likes: likesResult.data?.[0]?.count?.toString() || "0",
          })
        } else {
          const [typesResult, animalsResult, caretakersResult, treatsResult, likesResult] = await Promise.all([
            executeRawSQL("SELECT COUNT(*) as count FROM types WHERE user_id IS NULL"),
            executeRawSQL("SELECT COUNT(*) as count FROM animals WHERE user_id IS NULL"),
            executeRawSQL("SELECT COUNT(*) as count FROM caretakers WHERE user_id IS NULL"),
            executeRawSQL("SELECT COUNT(*) as count FROM treats WHERE user_id IS NULL"),
            executeRawSQL("SELECT COUNT(*) as count FROM likes WHERE user_id IS NULL"),
          ])
          setCounts({
            types: typesResult.data?.[0]?.count?.toString() || "0",
            animals: animalsResult.data?.[0]?.count?.toString() || "0",
            caretakers: caretakersResult.data?.[0]?.count?.toString() || "0",
            treats: treatsResult.data?.[0]?.count?.toString() || "0",
            likes: likesResult.data?.[0]?.count?.toString() || "0",
          })
        }
      } catch (error) {
        console.error('Error loading counts:', error)
      }
    }
    loadCounts()
  }, [lang])

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Breadcrumbs />
        </div>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold">{t.nav.scheme}</h2>
            <p className="text-muted-foreground">{t.nav.schemeDescription}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemeItems.map((item) => {
              const badge = item.badgeKey ? counts[item.badgeKey as keyof typeof counts] : item.badge
              const isSoonBadge = badge === "soon"
              const IconComponent = item.icon

              return (
                <Link key={item.title} to={item.url as any}>
                  <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer h-full hover:border-primary/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                            <IconComponent className="size-5" />
                          </div>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                        {badge && (
                          <Badge variant="secondary" className={cn("text-xs", isSoonBadge && "bg-red-500/10 text-red-500")}>
                            {isSoonBadge ? t.sidebar.soon : `${badge} ${item.badgeKey === 'animals' ? t.pages.animals.animalsCount : item.badgeKey === 'types' ? t.pages.types.typesCount : item.badgeKey === 'caretakers' ? t.pages.caretakers.caretakersCount : item.badgeKey === 'likes' ? t.pages.likes.likesCount : t.pages.treats.treatsCount}`}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <CardDescription className="text-sm mb-3">{item.description}</CardDescription>
                      <div className="flex items-center text-sm text-primary group-hover:translate-x-1 transition-transform">
                        {isSoonBadge ? t.nav.comingSoon : t.nav.viewDetails}
                        <ArrowRight className="ml-1 size-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
