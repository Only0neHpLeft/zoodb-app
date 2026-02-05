import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { useLanguage } from "@/contexts/language-context"
import { executeQuery } from "@/lib/db/pglite"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Bandage } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { filterTreats } from "@/lib/search-parser"
import { SearchGuide } from "@/components/search-guide"

type Treat = { id: number; caretakerId: number; animalId: number }
type Caretaker = { id: number; name: string }
type Animal = { id: number; name: string }

export const Route = createFileRoute("/scheme/treats")({
  component: TreatsPage,
})

function TreatsPage() {
  const { t, language } = useLanguage()
  const isCzech = language === "cz"
  const [treats, setTreats] = useState<Treat[]>([])
  const [caretakers, setCaretakers] = useState<Caretaker[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [displayLimit, setDisplayLimit] = useState(50)
  const PAGE_SIZE = 50

  // Column labels based on language
  const colId = "ID"
  const colCaretaker = isCzech ? "Ošetřovatel" : "Caretaker"
  const colAnimal = isCzech ? "Zvíře" : "Animal"

  useEffect(() => {
    const loadData = async () => {
      try {
        let treatsResult, caretakersResult, animalsResult
        if (isCzech) {
          [treatsResult, caretakersResult, animalsResult] = await Promise.all([
            executeQuery("SELECT id, osetrovatel, zvire FROM osetruje ORDER BY id"),
            executeQuery("SELECT id, jmeno FROM osetrovatele ORDER BY id"),
            executeQuery("SELECT id, jmeno FROM zvirata ORDER BY id")
          ])
        } else {
          [treatsResult, caretakersResult, animalsResult] = await Promise.all([
            executeQuery("SELECT id, caretaker, animal FROM treats ORDER BY id"),
            executeQuery("SELECT id, name FROM caretakers ORDER BY id"),
            executeQuery("SELECT id, name FROM animals ORDER BY id")
          ])
        }

        const mappedCaretakers = (caretakersResult.rows as Record<string, unknown>[]).map((row) => ({
          id: row.id as number,
          name: (isCzech ? row.jmeno : row.name) as string
        }))
        const mappedAnimals = (animalsResult.rows as Record<string, unknown>[]).map((row) => ({
          id: row.id as number,
          name: (isCzech ? row.jmeno : row.name) as string
        }))
        const mappedTreats = (treatsResult.rows as Record<string, unknown>[]).map((row) => ({
          id: row.id as number,
          caretakerId: (isCzech ? row.osetrovatel : row.caretaker) as number,
          animalId: (isCzech ? row.zvire : row.animal) as number,
        }))

        setCaretakers(mappedCaretakers)
        setAnimals(mappedAnimals)
        setTreats(mappedTreats)
      } catch (error) {
        console.error('Error loading treats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [isCzech])

  const getCaretakerName = (id: number) => caretakers.find(c => c.id === id)?.name || `ID: ${id}`
  const getAnimalName = (id: number) => animals.find(a => a.id === id)?.name || `ID: ${id}`

  const filteredTreats = filterTreats(treats, searchQuery, isCzech, getCaretakerName, getAnimalName)

  const displayedTreats = filteredTreats.slice(0, displayLimit)
  const hasMore = filteredTreats.length > displayLimit
  const remaining = filteredTreats.length - displayLimit

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
                    <h2 className="text-2xl font-bold">{t.pages.treats.title}</h2>
                  </div>
                  <p className="text-muted-foreground">{t.pages.treats.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={isCzech ? "Hledat..." : "Search..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <SearchGuide variant="treats" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {isCzech ? "Zobrazeno" : "Showing"} {displayedTreats.length} {t.pages.treats.of} {filteredTreats.length} {t.pages.treats.treatsCount}
                </div>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">{colId}</TableHead>
                      <TableHead>{colCaretaker}</TableHead>
                      <TableHead>{colAnimal}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTreats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Empty className="border-0">
                            <EmptyHeader>
                              <Bandage className="h-10 w-10 text-muted-foreground" />
                              <EmptyTitle>{searchQuery ? (isCzech ? "Žádné záznamy nenalezeny" : "No records found") : (isCzech ? "Zatím žádné záznamy" : "No records yet")}</EmptyTitle>
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
                      displayedTreats.map((treat) => (
                        <TableRow key={treat.id}>
                          <TableCell className="font-medium">{treat.id}</TableCell>
                          <TableCell>{getCaretakerName(treat.caretakerId)}</TableCell>
                          <TableCell>{getAnimalName(treat.animalId)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}>
                    {t.pages.treats.showMore} (+{Math.min(PAGE_SIZE, remaining)} {t.pages.treats.remaining})
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
