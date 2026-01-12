import { createFileRoute, Link } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ThemeSelector } from "@/components/theme-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/hooks/useClerkAuth"
import { useMembership } from "@/contexts/membership-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldContent, FieldTitle, FieldDescription } from "@/components/ui/field"
import { User, Mail, Crown, Sparkles, Zap } from "lucide-react"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { t } = useLanguage()
  const { user, profile } = useAuth()
  const { membership } = useMembership()

  const getMembershipInfo = () => {
    const planType = membership?.plan_type || 'free'
    switch (planType) {
      case 'zooPlus':
        return { name: 'Zoo+', icon: Crown, color: 'text-yellow-500', bgColor: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20', badge: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white', description: 'Lifetime Access' }
      case 'zoo':
        return { name: 'Zoo', icon: Zap, color: 'text-primary', bgColor: 'bg-primary/10', badge: 'bg-blue-500 text-white', description: 'Premium Monthly' }
      default:
        return { name: 'Free', icon: Sparkles, color: 'text-primary', bgColor: 'bg-primary/10', badge: 'bg-muted text-muted-foreground', description: 'Basic Access' }
    }
  }

  const membershipInfo = getMembershipInfo()

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Breadcrumbs />
        </div>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6 max-w-4xl">
          <div>
            <h2 className="text-2xl font-bold">{t.settings.title}</h2>
            <p className="text-muted-foreground">{t.settings.subtitle}</p>
          </div>

          {/* Account Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Account</h3>
            <div className="grid gap-4">
              <Field className="border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <User className="size-5" />
                  </div>
                  <FieldContent>
                    <FieldTitle>Name</FieldTitle>
                    <FieldDescription>{profile?.full_name || user?.fullName || "Not set"}</FieldDescription>
                  </FieldContent>
                </div>
              </Field>
              <Field className="border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Mail className="size-5" />
                  </div>
                  <FieldContent>
                    <FieldTitle>Email</FieldTitle>
                    <FieldDescription>{user?.primaryEmailAddress?.emailAddress || "Not set"}</FieldDescription>
                  </FieldContent>
                </div>
              </Field>
              <Field className="border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${membershipInfo.bgColor}`}>
                    <membershipInfo.icon className={`size-5 ${membershipInfo.color}`} />
                  </div>
                  <FieldContent className="flex-1">
                    <FieldTitle>Membership</FieldTitle>
                    <FieldDescription className="flex items-center gap-2">
                      <Badge className={membershipInfo.badge}>{membershipInfo.name}</Badge>
                      <span className="text-xs text-muted-foreground">{membershipInfo.description}</span>
                    </FieldDescription>
                  </FieldContent>
                  <Link to={"/membership" as any}>
                    <Button variant="outline" size="sm">Upgrade</Button>
                  </Link>
                </div>
              </Field>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Appearance</h3>
            <div className="grid gap-4">
              <Field className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <FieldContent>
                    <FieldTitle>{t.settings.theme}</FieldTitle>
                    <FieldDescription>{t.settings.themeDescription}</FieldDescription>
                  </FieldContent>
                  <ThemeToggle />
                </div>
              </Field>
              <Field className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <FieldContent>
                    <FieldTitle>{t.settings.language}</FieldTitle>
                    <FieldDescription>{t.settings.languageDescription}</FieldDescription>
                  </FieldContent>
                  <LanguageToggle />
                </div>
              </Field>
              <Field className="border rounded-lg p-4">
                <FieldContent>
                  <FieldTitle>Color Theme</FieldTitle>
                  <FieldDescription className="mb-3">{t.settings.themeDescription}</FieldDescription>
                  <ThemeSelector />
                </FieldContent>
              </Field>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
