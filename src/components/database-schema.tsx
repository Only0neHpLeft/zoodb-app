import { Database } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

export function DatabaseSchema() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <button className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
            <Database className="size-4" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="end"
          className="w-auto max-w-[60vw] p-3"
          sideOffset={10}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Database className="size-4 text-primary" />
              <h3 className="font-semibold text-sm">Database Schema</h3>
            </div>

            <div className="border rounded-lg overflow-hidden bg-white">
              <img
                src="/db_scheme.png"
                alt="Database Schema Diagram"
                width={550}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}
