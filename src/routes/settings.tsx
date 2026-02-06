import { createFileRoute, Link } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { ThemeSelector } from "@/components/theme-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { BackupRestore } from "@/components/backup-restore"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/hooks/use-auth"
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
        return { name: 'Zoo+', icon: Crown, color: 'text-primary', bgColor: 'bg-primary/10', badge: 'bg-primary text-primary-foreground', descriptionKey: 'lifetimeAccess' as const }
      case 'zoo':
        return { name: 'Zoo', icon: Zap, color: 'text-primary', bgColor: 'bg-primary/10', badge: 'bg-primary/80 text-primary-foreground', descriptionKey: 'premiumMonthly' as const }
      default:
        return { name: t.settings.free, icon: Sparkles, color: 'text-primary', bgColor: 'bg-primary/10', badge: 'bg-muted text-muted-foreground', descriptionKey: 'basicAccess' as const }
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
        <Notifications />
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold">{t.settings.title}</h2>
            <p className="text-muted-foreground">{t.settings.subtitle}</p>
          </div>

          {/* Account Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">{t.settings.account}</h3>
            <div className="grid gap-4">
              <Field className="border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <User className="size-5" />
                  </div>
                  <FieldContent>
                    <FieldTitle>{t.settings.name}</FieldTitle>
                    <FieldDescription>{profile?.full_name || user?.name || t.settings.notSet}</FieldDescription>
                  </FieldContent>
                </div>
              </Field>
              <Field className="border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Mail className="size-5" />
                  </div>
                  <FieldContent>
                    <FieldTitle>{t.settings.email}</FieldTitle>
                    <FieldDescription>{user?.email || t.settings.notSet}</FieldDescription>
                  </FieldContent>
                </div>
              </Field>
              <Field className="border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${membershipInfo.bgColor}`}>
                    <membershipInfo.icon className={`size-5 ${membershipInfo.color}`} />
                  </div>
                  <FieldContent className="flex-1">
                    <FieldTitle>{t.settings.membership}</FieldTitle>
                    <FieldDescription className="flex items-center gap-2">
                      <Badge className={membershipInfo.badge}>{membershipInfo.name}</Badge>
                      <span className="text-xs text-muted-foreground">{t.settings[membershipInfo.descriptionKey]}</span>
                    </FieldDescription>
                  </FieldContent>
                  <Link to="/membership">
                    <Button variant="outline" size="sm">{t.settings.upgrade}</Button>
                  </Link>
                </div>
              </Field>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">{t.settings.appearance}</h3>
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
                  <FieldTitle>{t.settings.colorTheme}</FieldTitle>
                  <FieldDescription className="mb-3">{t.settings.themeDescription}</FieldDescription>
                  <ThemeSelector />
                </FieldContent>
              </Field>
            </div>
          </div>

          {/* Backup & Restore Section */}
          <BackupRestore />
        </div>
      </main>
    </div>
  )
}
