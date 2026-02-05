import { Link } from "@tanstack/react-router"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Home, Database, Settings, User, ChevronRight, Bug, Lightbulb, Ambulance, Heart, Bandage, ChevronDown, PawPrint, Utensils, Carrot, Ham, LogOut, GraduationCap, LogIn, Shield, Coins } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useStableCallback } from "@/hooks/use-latest"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/language-context"
import { getDb, isDatabaseInitialized } from "@/lib/db/pglite"
import { dbEvents } from "@/lib/db/events"

// Table name mapping for counts (scheme item key -> table names for both languages)
const tableNameMap: Record<string, { en: string; cz: string }> = {
  animals: { en: 'animals', cz: 'zvirata' },
  types: { en: 'types', cz: 'druhy' },
  caretakers: { en: 'caretakers', cz: 'osetrovatele' },
  likes: { en: 'likes', cz: 'ma_rad' },
  treats: { en: 'treats', cz: 'osetruje' },
}

export function AppSidebar() {
  const { t, language } = useLanguage()
  const { user, profile, logout, loading } = useAuth()
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({})

  /**
   * Fetch table counts from database
   *
   * OPTIMIZATION (async-parallel rule):
   * BEFORE: 5 sequential queries (~500ms total)
   * AFTER: 5 parallel queries (~100ms total)
   */
  const fetchCounts = useCallback(async () => {
    try {
      const initialized = await isDatabaseInitialized()
      if (!initialized) return

      const db = await getDb()
      const entries = Object.entries(tableNameMap)

      // Parallel fetch all table counts at once (async-parallel rule)
      const results = await Promise.all(
        entries.map(async ([key, tables]) => {
          const tableName = language === 'en' ? tables.en : tables.cz
          try {
            const result = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`)
            return [key, Number((result.rows[0] as { count: string | number })?.count ?? 0)] as const
          } catch {
            return [key, 0] as const
          }
        })
      )

      setTableCounts(Object.fromEntries(results))
    } catch (err) {
      console.error('Failed to fetch table counts:', err)
    }
  }, [language])

  // Initial fetch on mount and language change
  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Subscribe to database changes
  useEffect(() => {
    const unsubscribe = dbEvents.subscribe(() => {
      fetchCounts()
    })

    return unsubscribe
  }, [fetchCounts])

  // Stable logout handler (rerender-functional-setstate rule)
  const handleLogout = useStableCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  })

  // Memoize menu items to prevent unnecessary recalculations (rerender-memo rule)
  const menuItems = useMemo(() => [
    {
      title: t.nav.home,
      icon: Home,
      url: "/",
      badge: null,
    },
    {
      title: t.nav.classes,
      icon: GraduationCap,
      url: "/classes",
      badge: null,
    },
    {
      title: t.sidebar.membership,
      icon: Coins,
      url: "/membership",
      badge: null,
    },
    {
      title: t.nav.settings,
      icon: Settings,
      url: "/settings",
      badge: null,
    },
  ], [t])

  const schemeItems = useMemo(() => [
    {
      title: t.sidebar.animals,
      icon: Bug,
      url: "/scheme/animals",
      countKey: "animals",
    },
    {
      title: t.sidebar.types,
      icon: Lightbulb,
      url: "/scheme/types",
      countKey: "types",
    },
    {
      title: t.sidebar.caretakers,
      icon: Ambulance,
      url: "/scheme/caretakers",
      countKey: "caretakers",
    },
    {
      title: t.sidebar.likes,
      icon: Heart,
      url: "/scheme/likes",
      countKey: "likes",
    },
    {
      title: t.sidebar.treats,
      icon: Bandage,
      url: "/scheme/treats",
      countKey: "treats",
    },
    {
      title: t.sidebar.menu,
      icon: Utensils,
      url: "/scheme/menu",
      badge: "soon",
    },
    {
      title: t.sidebar.food,
      icon: Carrot,
      url: "/scheme/food",
      badge: "soon",
    },
    {
      title: t.sidebar.eat,
      icon: Ham,
      url: "/scheme/eat",
      badge: "soon",
    },
  ], [t])


  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm">
            <PawPrint className="size-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-base tracking-tight truncate">
              {t.sidebar.appName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {t.sidebar.appSubtitle}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4 group-data-[collapsible=icon]:px-3">
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-4 mb-2 group-data-[collapsible=icon]:hidden">
            {t.nav.navigation}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={cn(
                      "relative group/item transition-all duration-200",
                      "hover:bg-accent/50 hover:shadow-sm",
                      "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
                      "data-[active=true]:shadow-md data-[active=true]:shadow-primary/20"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                      <item.icon className="size-4 shrink-0" />
                      <span className="font-medium flex-1 truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-xs px-2 py-0 h-5 bg-primary/10 text-primary group-data-[collapsible=icon]:hidden"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className="size-4 shrink-0 opacity-0 -ml-4 transition-all group-hover/item:opacity-100 group-hover/item:ml-0 group-data-[collapsible=icon]:hidden" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible asChild defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  {/* Collapsible trigger button for uncollapsed state */}
                  <CollapsibleTrigger asChild className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuButton
                      tooltip={t.nav.scheme}
                      className={cn(
                        "relative group/item transition-all duration-200",
                        "hover:bg-accent/50 hover:shadow-sm"
                      )}
                    >
                      <Database className="size-4 shrink-0" />
                      <span className="font-medium flex-1 truncate">{t.nav.scheme}</span>
                      <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  {/* Navigation link for collapsed state */}
                  <div className="hidden group-data-[collapsible=icon]:block">
                    <SidebarMenuButton
                      asChild
                      tooltip={t.nav.scheme}
                      className={cn(
                        "relative group/item transition-all duration-200",
                        "hover:bg-accent/50 hover:shadow-sm",
                        "group-data-[collapsible=icon]:justify-center"
                      )}
                    >
                      <Link to="/scheme">
                        <Database className="size-4 shrink-0" />
                      </Link>
                    </SidebarMenuButton>
                  </div>

                  <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuSub>
                      {schemeItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild>
                            <Link to={item.url} className="flex items-center gap-2">
                              <item.icon className="size-4 shrink-0" />
                              <span className="flex-1 truncate">{item.title}</span>
                              {item.badge === "soon" ? (
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 text-xs px-2 py-0 h-5 bg-red-500/10 text-red-500"
                                >
                                  {t.sidebar.soon}
                                </Badge>
                              ) : item.countKey && tableCounts[item.countKey] !== undefined ? (
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground"
                                >
                                  {tableCounts[item.countKey]}
                                </Badge>
                              ) : null}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2 group-data-[collapsible=icon]:px-3">
        <SidebarMenu className="group-data-[collapsible=icon]:space-y-2">
          {user ? (
            // Logged in - show user info
            <SidebarMenuItem>
              <div className={cn(
                "flex items-center gap-3 w-full px-2 py-3",
                "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              )}>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
                  <User className="size-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col items-start min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold truncate w-full">
                    {user.name || profile?.full_name || 'User'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground capitalize">
                      {profile?.role ? (t.roles[profile.role as keyof typeof t.roles] || profile.role) : t.roles.student}
                    </span>
                    {profile?.is_admin && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-3.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        <Shield className="size-2.5 mr-0.5" />
                        {t.profile.admin}
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="shrink-0 p-1.5 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors group-data-[collapsible=icon]:hidden"
                  title={t.profile.signOut}
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </SidebarMenuItem>
          ) : (
            // Not logged in - show sign in button (optimistic UI, shows immediately while auth loads in background)
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={t.nav.signIn}
                className={cn(
                  "transition-all duration-200 hover:bg-accent/50",
                  "h-auto py-3",
                  "group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
                )}
              >
                <Link to="/sign-in" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
                    <LogIn className="size-4 text-primary-foreground" />
                  </div>
                  <div className="flex flex-col items-start min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-semibold truncate w-full">{t.nav.signIn}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}