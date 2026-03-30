import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { Notifications } from '@/components/notifications'
import { useLanguage } from '@/contexts/language-context'
import { executeQuery } from '@/lib/db/pglite'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Search, Heart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty'
import { filterLikes } from '@/lib/search-parser'
import { SearchGuide } from '@/components/search-guide'

type Like = {
  id: number
  caretakerId: number
  typeId: number
  caretakerName?: string
  typeName?: string
}
type Caretaker = { id: number; name: string }
type AnimalType = { id: number; name: string }

export const Route = createFileRoute('/scheme/likes')({
  component: LikesPage,
})

function LikesPage() {
  const { t, language } = useLanguage()
  const isCzech = language === 'cz'
  const [likes, setLikes] = useState<Like[]>([])
  const [caretakers, setCaretakers] = useState<Caretaker[]>([])
  const [types, setTypes] = useState<AnimalType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [displayLimit, setDisplayLimit] = useState(50)
  const PAGE_SIZE = 50

  // Column labels based on language
  const colId = 'ID'
  const colCaretaker = isCzech ? 'Ošetřovatel' : 'Caretaker'
  const colType = isCzech ? 'Druh' : 'Type'

  useEffect(() => {
    const loadData = async () => {
      try {
        let likesResult, caretakersResult, typesResult
        if (isCzech) {
          ;[likesResult, caretakersResult, typesResult] = await Promise.all([
            executeQuery(
              'SELECT id, osetrovatel, druh FROM ma_rad ORDER BY id',
            ),
            executeQuery('SELECT id, jmeno FROM osetrovatele ORDER BY id'),
            executeQuery('SELECT id, nazev FROM druhy ORDER BY id'),
          ])
        } else {
          ;[likesResult, caretakersResult, typesResult] = await Promise.all([
            executeQuery('SELECT id, caretaker, type FROM likes ORDER BY id'),
            executeQuery('SELECT id, name FROM caretakers ORDER BY id'),
            executeQuery('SELECT id, name FROM types ORDER BY id'),
          ])
        }

        const mappedCaretakers = (
          caretakersResult.rows as Record<string, unknown>[]
        ).map((row) => ({
          id: row.id as number,
          name: (isCzech ? row.jmeno : row.name) as string,
        }))
        const mappedTypes = (typesResult.rows as Record<string, unknown>[]).map(
          (row) => ({
            id: row.id as number,
            name: (isCzech ? row.nazev : row.name) as string,
          }),
        )
        const mappedLikes = (likesResult.rows as Record<string, unknown>[]).map(
          (row) => ({
            id: row.id as number,
            caretakerId: (isCzech ? row.osetrovatel : row.caretaker) as number,
            typeId: (isCzech ? row.druh : row.type) as number,
          }),
        )

        setCaretakers(mappedCaretakers)
        setTypes(mappedTypes)
        setLikes(mappedLikes)
      } catch (error) {
        console.error('Error loading likes:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [isCzech])

  const getCaretakerName = (id: number) =>
    caretakers.find((c) => c.id === id)?.name || `ID: ${id}`
  const getTypeName = (id: number) =>
    types.find((t) => t.id === id)?.name || `ID: ${id}`

  const filteredLikes = filterLikes(
    likes,
    searchQuery,
    isCzech,
    getCaretakerName,
    getTypeName,
  )

  const displayedLikes = filteredLikes.slice(0, displayLimit)
  const hasMore = filteredLikes.length > displayLimit
  const remaining = filteredLikes.length - displayLimit

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Breadcrumbs />
        </div>
        <Notifications />
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">
                      {t.pages.likes.title}
                    </h2>
                  </div>
                  <p className="text-muted-foreground">
                    {t.pages.likes.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={isCzech ? 'Hledat...' : 'Search...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <SearchGuide variant="likes" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {isCzech ? 'Zobrazeno' : 'Showing'} {displayedLikes.length}{' '}
                  {t.pages.likes.of} {filteredLikes.length}{' '}
                  {t.pages.likes.likesCount}
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[80px] text-center">
                        {colId}
                      </TableHead>
                      <TableHead>{colCaretaker}</TableHead>
                      <TableHead>{colType}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLikes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Empty className="border-0">
                            <EmptyHeader>
                              <Heart className="h-10 w-10 text-muted-foreground" />
                              <EmptyTitle>
                                {searchQuery
                                  ? isCzech
                                    ? 'Žádné záznamy nenalezeny'
                                    : 'No records found'
                                  : isCzech
                                    ? 'Zatím žádné záznamy'
                                    : 'No records yet'}
                              </EmptyTitle>
                              <EmptyDescription>
                                {searchQuery
                                  ? isCzech
                                    ? 'Zkuste jiný vyhledávací dotaz'
                                    : 'Try a different search query'
                                  : ''}
                              </EmptyDescription>
                            </EmptyHeader>
                            {searchQuery && (
                              <EmptyContent>
                                <Button
                                  variant="outline"
                                  onClick={() => setSearchQuery('')}
                                >
                                  {isCzech ? 'Vymazat hledání' : 'Clear search'}
                                </Button>
                              </EmptyContent>
                            )}
                          </Empty>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedLikes.map((like) => (
                        <TableRow key={like.id}>
                          <TableCell className="text-center tabular-nums text-muted-foreground">
                            {like.id}
                          </TableCell>
                          <TableCell>
                            {getCaretakerName(like.caretakerId)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {getTypeName(like.typeId)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayLimit((prev) => prev + PAGE_SIZE)}
                  >
                    {t.pages.likes.showMore} (+{Math.min(PAGE_SIZE, remaining)}{' '}
                    {t.pages.likes.remaining})
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
