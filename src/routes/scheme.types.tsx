import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { useLanguage } from "@/contexts/language-context"
import { executeQuery } from "@/lib/db/pglite"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Lightbulb } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { filterTypes } from "@/lib/search-parser"
import { SearchGuide } from "@/components/search-guide"

type AnimalType = { id: number; name: string; weightMin: number; weightMax: number }

export const Route = createFileRoute("/scheme/types")({
  component: TypesPage,
})

function TypesPage() {
  const { t, language } = useLanguage()
  const isCzech = language === "cz"
  const [types, setTypes] = useState<AnimalType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [displayLimit, setDisplayLimit] = useState(50)
  const PAGE_SIZE = 50

  // Column labels based on language
  const colId = "ID"
  const colName = isCzech ? "Název" : "Name"
  const colWeightMin = isCzech ? "Min. váha" : "Min Weight"
  const colWeightMax = isCzech ? "Max. váha" : "Max Weight"

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = isCzech
          ? await executeQuery("SELECT id, nazev, vaha_min, vaha_max FROM druhy ORDER BY id")
          : await executeQuery("SELECT id, name, weight_min, weight_max FROM types ORDER BY id")

        const mappedTypes = result.rows.map((row: any) => ({
          id: row.id,
          name: isCzech ? row.nazev : row.name,
          weightMin: Number(isCzech ? row.vaha_min : row.weight_min) || 0,
          weightMax: Number(isCzech ? row.vaha_max : row.weight_max) || 0,
        }))
        setTypes(mappedTypes)
      } catch (error) {
        console.error('Error loading types:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [isCzech])

  const filteredTypes = filterTypes(types, searchQuery, isCzech)

  const displayedTypes = filteredTypes.slice(0, displayLimit)
  const hasMore = filteredTypes.length > displayLimit
  const remaining = filteredTypes.length - displayLimit

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4"><SidebarTrigger /><Breadcrumbs /></div>
        <Notifications />
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <div className="space-y-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{t.pages.types.title}</h2>
                  </div>
                  <p className="text-muted-foreground">{t.pages.types.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={isCzech ? "Hledat druhy..." : "Search types..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <SearchGuide variant="types" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {isCzech ? "Zobrazeno" : "Showing"} {displayedTypes.length} {t.pages.types.of} {filteredTypes.length} {t.pages.types.typesCount}
                </div>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">{colId}</TableHead>
                      <TableHead>{colName}</TableHead>
                      <TableHead className="w-[140px]">{colWeightMin} (kg)</TableHead>
                      <TableHead className="w-[140px]">{colWeightMax} (kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Empty className="border-0">
                            <EmptyHeader>
                              <Lightbulb className="h-10 w-10 text-muted-foreground" />
                              <EmptyTitle>{searchQuery ? (isCzech ? "Žádné druhy nenalezeny" : "No types found") : (isCzech ? "Zatím žádné druhy" : "No types yet")}</EmptyTitle>
                              <EmptyDescription>{searchQuery ? (isCzech ? "Zkuste jiný vyhledávací dotaz" : "Try a different search query") : ""}</EmptyDescription>
                            </EmptyHeader>
                            {searchQuery && (
                              <EmptyContent>
                                <Button variant="outline" onClick={() => setSearchQuery("")}>
                                  {isCzech ? "Vymazat hledání" : "Clear search"}
                                </Button>
                              </EmptyContent>
                            )}
                          </Empty>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.id}</TableCell>
                          <TableCell className="font-medium capitalize">{type.name}</TableCell>
                          <TableCell>{type.weightMin.toFixed(1)}</TableCell>
                          <TableCell>{type.weightMax.toFixed(1)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}>
                    {t.pages.types.showMore} (+{Math.min(PAGE_SIZE, remaining)} {t.pages.types.remaining})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
