import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { useLanguage } from "@/contexts/language-context"
import { executeQuery } from "@/lib/db/pglite"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Ambulance } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { filterCaretakers } from "@/lib/search-parser"
import { SearchGuide } from "@/components/search-guide"

type Caretaker = { id: number; name: string; born: string }

export const Route = createFileRoute("/scheme/caretakers")({
  component: CaretakersPage,
})

function CaretakersPage() {
  const { t, language } = useLanguage()
  const isCzech = language === "cz"
  const [caretakers, setCaretakers] = useState<Caretaker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [displayLimit, setDisplayLimit] = useState(50)
  const PAGE_SIZE = 50

  // Column labels based on language
  const colId = "ID"
  const colName = isCzech ? "Jméno" : "Name"
  const colBorn = isCzech ? "Narozen" : "Born"

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = isCzech
          ? await executeQuery("SELECT id, jmeno, narozen FROM osetrovatele ORDER BY id")
          : await executeQuery("SELECT id, name, born FROM caretakers ORDER BY id")

        const mappedCaretakers = result.rows.map((row: any) => ({
          id: row.id,
          name: isCzech ? row.jmeno : row.name,
          born: (isCzech ? row.narozen : row.born) || '',
        }))
        setCaretakers(mappedCaretakers)
      } catch (error) {
        console.error('Error loading caretakers:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [isCzech])

  const filteredCaretakers = filterCaretakers(caretakers, searchQuery, isCzech)

  const displayedCaretakers = filteredCaretakers.slice(0, displayLimit)
  const hasMore = filteredCaretakers.length > displayLimit
  const remaining = filteredCaretakers.length - displayLimit

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
                    <h2 className="text-2xl font-bold">{t.pages.caretakers.title}</h2>
                  </div>
                  <p className="text-muted-foreground">{t.pages.caretakers.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={isCzech ? "Hledat ošetřovatele..." : "Search caretakers..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <SearchGuide variant="caretakers" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {isCzech ? "Zobrazeno" : "Showing"} {displayedCaretakers.length} {t.pages.caretakers.of} {filteredCaretakers.length} {t.pages.caretakers.caretakersCount}
                </div>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">{colId}</TableHead>
                      <TableHead>{colName}</TableHead>
                      <TableHead className="w-[140px]">{colBorn}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCaretakers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Empty className="border-0">
                            <EmptyHeader>
                              <Ambulance className="h-10 w-10 text-muted-foreground" />
                              <EmptyTitle>{searchQuery ? (isCzech ? "Žádní ošetřovatelé nenalezeni" : "No caretakers found") : (isCzech ? "Zatím žádní ošetřovatelé" : "No caretakers yet")}</EmptyTitle>
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
                      displayedCaretakers.map((caretaker) => (
                        <TableRow key={caretaker.id}>
                          <TableCell className="font-medium">{caretaker.id}</TableCell>
                          <TableCell className="font-medium">{caretaker.name}</TableCell>
                          <TableCell>{caretaker.born}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}>
                    {t.pages.caretakers.showMore} (+{Math.min(PAGE_SIZE, remaining)} {t.pages.caretakers.remaining})
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
