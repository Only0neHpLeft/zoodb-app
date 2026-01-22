import { BookOpen } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SearchGuideProps {
  variant: 'animals' | 'caretakers' | 'types' | 'likes' | 'treats'
}

export function SearchGuide({ variant }: SearchGuideProps) {
  const { language } = useLanguage()
  const isCzech = language === "cz"

  // Get relevant fields based on the page variant
  const getFields = () => {
    if (isCzech) {
      switch (variant) {
        case 'animals':
          return [
            { prefix: 'id:', desc: 'ID záznamu', example: 'id:42' },
            { prefix: 'j:', desc: 'Jméno zvířete', example: 'j:felix' },
            { prefix: 'd:', desc: 'Druh zvířete', example: 'd:kocka' },
            { prefix: 'v:', desc: 'Váha', example: 'v:5' },
            { prefix: 'n:', desc: 'Datum narození', example: 'n:2020' },
          ]
        case 'caretakers':
          return [
            { prefix: 'id:', desc: 'ID záznamu', example: 'id:1' },
            { prefix: 'j:', desc: 'Jméno ošetřovatele', example: 'j:jan' },
            { prefix: 'n:', desc: 'Datum narození', example: 'n:1990' },
          ]
        case 'types':
          return [
            { prefix: 'id:', desc: 'ID záznamu', example: 'id:3' },
            { prefix: 'nv:', desc: 'Název druhu', example: 'nv:lev' },
            { prefix: 'v:', desc: 'Váha (min/max)', example: 'v:150' },
          ]
        case 'likes':
          return [
            { prefix: 'id:', desc: 'ID záznamu', example: 'id:5' },
            { prefix: 'o:', desc: 'Ošetřovatel', example: 'o:jan' },
            { prefix: 'd:', desc: 'Druh', example: 'd:kocka' },
          ]
        case 'treats':
          return [
            { prefix: 'id:', desc: 'ID záznamu', example: 'id:10' },
            { prefix: 'o:', desc: 'Ošetřovatel', example: 'o:marie' },
            { prefix: 'z:', desc: 'Zvíře', example: 'z:felix' },
          ]
      }
    } else {
      switch (variant) {
        case 'animals':
          return [
            { prefix: 'id:', desc: 'Record ID', example: 'id:42' },
            { prefix: 'n:', desc: 'Animal name', example: 'n:felix' },
            { prefix: 't:', desc: 'Animal type', example: 't:cat' },
            { prefix: 'w:', desc: 'Weight', example: 'w:5' },
            { prefix: 'b:', desc: 'Birth date', example: 'b:2020' },
          ]
        case 'caretakers':
          return [
            { prefix: 'id:', desc: 'Record ID', example: 'id:1' },
            { prefix: 'n:', desc: 'Caretaker name', example: 'n:john' },
            { prefix: 'b:', desc: 'Birth date', example: 'b:1990' },
          ]
        case 'types':
          return [
            { prefix: 'id:', desc: 'Record ID', example: 'id:3' },
            { prefix: 'nv:', desc: 'Type name', example: 'nv:lion' },
            { prefix: 'w:', desc: 'Weight (min/max)', example: 'w:150' },
          ]
        case 'likes':
          return [
            { prefix: 'id:', desc: 'Record ID', example: 'id:5' },
            { prefix: 'c:', desc: 'Caretaker', example: 'c:john' },
            { prefix: 't:', desc: 'Type', example: 't:cat' },
          ]
        case 'treats':
          return [
            { prefix: 'id:', desc: 'Record ID', example: 'id:10' },
            { prefix: 'c:', desc: 'Caretaker', example: 'c:mary' },
            { prefix: 'a:', desc: 'Animal', example: 'a:felix' },
          ]
      }
    }
  }

  const fields = getFields()
  const title = isCzech ? "Nápověda vyhledávání" : "Search Guide"
  const generalNote = isCzech 
    ? "Bez prefixu se hledá ve všech polích"
    : "Without prefix, searches all fields"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={title}
        >
          <BookOpen className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{title}</h4>
          <div className="space-y-1.5 text-xs">
            {fields.map(({ prefix, desc, example }) => (
              <div key={prefix} className="flex items-start gap-2">
                <code className="px-1.5 py-0.5 bg-muted rounded text-[11px] font-mono shrink-0">
                  {prefix}
                </code>
                <div className="flex-1">
                  <span className="text-muted-foreground">{desc}</span>
                  <span className="text-muted-foreground/60 ml-1.5">• {example}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/70 pt-1 border-t">
            {generalNote}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
