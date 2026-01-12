import { createFileRoute } from "@tanstack/react-router"
import React, { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { useLanguage } from "@/contexts/language-context"
import { executeRawSQL } from "@/lib/db/tauri-db"
import { getDisplayLabel, type Language } from "@/lib/db/schema-mapping"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, PawPrint } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"

type Animal = { id: number; type: number; name: string; weight: number; born: string; consumption: number | null }
type AnimalType = { id: number; title: string }

export const Route = createFileRoute("/scheme/animals")({
  component: AnimalsPage,
})

function AnimalsPage() {
  const { t, language } = useLanguage()
  const lang = (language === "cz" ? "cs" : "en") as Language
  const [animals, setAnimals] = useState<Animal[]>([])
  const [types, setTypes] = useState<AnimalType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const colId = getDisplayLabel("animals", "id", lang)
  const colType = getDisplayLabel("animals", "type", lang)
  const colName = getDisplayLabel("animals", "name", lang)
  const colWeight = getDisplayLabel("animals", "weight", lang)
  const colBorn = getDisplayLabel("animals", "born", lang)
  const colConsumption = getDisplayLabel("animals", "consumption", lang)

  const getTypeName = (typeId: number): string => types.find(t => t.id === typeId)?.title || `Type ${typeId}`

  useEffect(() => {
    const loadData = async () => {
      try {
        let animalsData: any[], typesData: any[]
        if (lang === "cs") {
          const [animalsResult, typesResult] = await Promise.all([
            executeRawSQL("SELECT id, druh, jmeno, vaha, narozen, spotreba FROM zvirata WHERE user_id IS NULL ORDER BY id"),
            executeRawSQL("SELECT id, nazev FROM druhy WHERE user_id IS NULL ORDER BY id")
          ])
          animalsData = animalsResult.data || []
          typesData = typesResult.data || []
        } else {
          const [animalsResult, typesResult] = await Promise.all([
            executeRawSQL("SELECT id, type, name, weight, born, consumption FROM animals WHERE user_id IS NULL ORDER BY id"),
            executeRawSQL("SELECT id, name FROM types WHERE user_id IS NULL ORDER BY id")
          ])
          animalsData = animalsResult.data || []
          typesData = typesResult.data || []
        }
        const mappedAnimals = animalsData.map((row: any) => ({
          id: row.id,
          type: lang === "cs" ? row.druh : row.type,
          name: lang === "cs" ? row.jmeno : row.name,
          weight: Number(lang === "cs" ? row.vaha : row.weight) || 0,
          born: (lang === "cs" ? row.narozen : row.born) ? new Date(lang === "cs" ? row.narozen : row.born).toISOString().split('T')[0] : '',
          consumption: (lang === "cs" ? row.spotreba : row.consumption) !== null ? Number(lang === "cs" ? row.spotreba : row.consumption) : null,
        }))
        const mappedTypes = typesData.map((row: any) => ({ id: row.id, title: lang === "cs" ? row.nazev : row.name }))
        setAnimals(mappedAnimals)
        setTypes(mappedTypes)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [lang])

  const filteredAnimals = animals.filter(animal => {
    const typeName = getTypeName(animal.type).toLowerCase()
    return animal.name.toLowerCase().includes(searchQuery.toLowerCase()) || animal.id.toString().includes(searchQuery) || typeName.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4"><SidebarTrigger /><Breadcrumbs /></div>
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
                    <Badge variant="secondary">{(t.nav as any).schemaReference || "Schema Reference"}</Badge>
                  </div>
                  <p className="text-muted-foreground">{t.pages.animals.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t.pages.animals.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <div className="text-sm text-muted-foreground">{t.pages.animals.showing} {filteredAnimals.length} {t.pages.animals.animalsCount}</div>
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
                      filteredAnimals.map((animal) => (
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}
