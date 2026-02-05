import { createFileRoute } from "@tanstack/react-router"
import React, { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { useLanguage } from "@/contexts/language-context"
import { executeQuery } from "@/lib/db/pglite"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, PawPrint } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { filterAnimals } from "@/lib/search-parser"
import { SearchGuide } from "@/components/search-guide"

type Animal = { id: number; type: number; name: string; weight: number; born: string; consumption: number | null }
type AnimalType = { id: number; title: string }

export const Route = createFileRoute("/scheme/animals")({
  component: AnimalsPage,
})

function AnimalsPage() {
  const { t, language } = useLanguage()
  const isCzech = language === "cz"
  const [animals, setAnimals] = useState<Animal[]>([])
  const [types, setTypes] = useState<AnimalType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [displayLimit, setDisplayLimit] = useState(50)
  const PAGE_SIZE = 50

  // Column labels based on language
  const colId = "ID"
  const colType = isCzech ? "Druh" : "Type"
  const colName = isCzech ? "Jméno" : "Name"
  const colWeight = isCzech ? "Váha" : "Weight"
  const colBorn = isCzech ? "Narozen" : "Born"
  const colConsumption = isCzech ? "Spotřeba" : "Consumption"

  const getTypeName = (typeId: number): string => types.find(t => t.id === typeId)?.title || `Type ${typeId}`

  useEffect(() => {
    const loadData = async () => {
      try {
        let animalsResult, typesResult
        if (isCzech) {
          [animalsResult, typesResult] = await Promise.all([
            executeQuery("SELECT id, druh, jmeno, vaha, narozen, spotreba FROM zvirata ORDER BY id"),
            executeQuery("SELECT id, nazev FROM druhy ORDER BY id")
          ])
        } else {
          [animalsResult, typesResult] = await Promise.all([
            executeQuery("SELECT id, type, name, weight, born, consumption FROM animals ORDER BY id"),
            executeQuery("SELECT id, name FROM types ORDER BY id")
          ])
        }

        const mappedAnimals = (animalsResult.rows as Record<string, unknown>[]).map((row) => ({
          id: row.id as number,
          type: (isCzech ? row.druh : row.type) as number,
          name: (isCzech ? row.jmeno : row.name) as string,
          weight: Number(isCzech ? row.vaha : row.weight) || 0,
          born: ((isCzech ? row.narozen : row.born) || '') as string,
          consumption: (isCzech ? row.spotreba : row.consumption) !== null ? Number(isCzech ? row.spotreba : row.consumption) : null,
        }))
        const mappedTypes = (typesResult.rows as Record<string, unknown>[]).map((row) => ({
          id: row.id as number,
          title: (isCzech ? row.nazev : row.name) as string
        }))
        setAnimals(mappedAnimals)
        setTypes(mappedTypes)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [isCzech])

  const filteredAnimals = filterAnimals(animals, searchQuery, isCzech, getTypeName)

  const displayedAnimals = filteredAnimals.slice(0, displayLimit)
  const hasMore = filteredAnimals.length > displayLimit
  const remaining = filteredAnimals.length - displayLimit

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
                    <h2 className="text-2xl font-bold">{t.pages.animals.title}</h2>
                  </div>
                  <p className="text-muted-foreground">{t.pages.animals.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t.pages.animals.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                  <SearchGuide variant="animals" />
                </div>
                <div className="text-sm text-muted-foreground">{t.pages.animals.showing} {displayedAnimals.length} {t.pages.animals.of} {filteredAnimals.length} {t.pages.animals.animalsCount}</div>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">{colId}</TableHead>
                      <TableHead className="w-[140px]">{colType}</TableHead>
                      <TableHead>{colName}</TableHead>
                      <TableHead className="w-[120px]">{colWeight} (kg)</TableHead>
                      <TableHead className="w-[140px]">{colBorn}</TableHead>
                      <TableHead className="w-[150px]">{colConsumption} (g)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnimals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Empty className="border-0">
                            <EmptyHeader>
                              <PawPrint className="h-10 w-10 text-muted-foreground" />
                              <EmptyTitle>{searchQuery ? t.pages.animals.noAnimalsFound : t.pages.animals.noAnimalsYet}</EmptyTitle>
                              <EmptyDescription>{searchQuery ? t.pages.animals.clearSearch : t.pages.animals.addDescription}</EmptyDescription>
                            </EmptyHeader>
                            {searchQuery && <EmptyContent><Button variant="outline" onClick={() => setSearchQuery("")}>{t.pages.animals.clearSearch}</Button></EmptyContent>}
                          </Empty>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedAnimals.map((animal) => (
                        <TableRow key={animal.id}>
                          <TableCell className="font-medium">{animal.id}</TableCell>
                          <TableCell className="capitalize">{getTypeName(animal.type)}</TableCell>
                          <TableCell className="font-medium">{animal.name}</TableCell>
                          <TableCell>{animal.weight.toFixed(1)}</TableCell>
                          <TableCell>{animal.born}</TableCell>
                          <TableCell>{animal.consumption !== null ? animal.consumption.toLocaleString() : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}>
                    {t.pages.animals.showMore} (+{Math.min(PAGE_SIZE, remaining)} {t.pages.animals.remaining})
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
