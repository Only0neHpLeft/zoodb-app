import { createFileRoute } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { useLanguage } from "@/contexts/language-context"
import { Crown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const Route = createFileRoute("/membership")({
  component: MembershipPage,
})

function MembershipPage() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Breadcrumbs />
        </div>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold">{t.pages.membership.title}</h2>
            <p className="text-muted-foreground mt-2">{t.pages.membership.description}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Free
                  <Badge variant="secondary">Current</Badge>
                </CardTitle>
                <CardDescription>Basic access to the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$0<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>- Access to basic lessons</li>
                  <li>- Limited SQL queries</li>
                  <li>- Community support</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="size-5 text-primary" />
                  Zoo
                </CardTitle>
                <CardDescription>Premium monthly access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$9.99<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>- All lessons unlocked</li>
                  <li>- Unlimited SQL queries</li>
                  <li>- Priority support</li>
                </ul>
                <Button className="w-full">Upgrade to Zoo</Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="size-5 text-yellow-500" />
                  Zoo+
                </CardTitle>
                <CardDescription>Lifetime access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$99<span className="text-sm font-normal text-muted-foreground"> once</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>- Everything in Zoo</li>
                  <li>- Lifetime access</li>
                  <li>- Early access to new features</li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600">
                  Get Zoo+ Lifetime
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
