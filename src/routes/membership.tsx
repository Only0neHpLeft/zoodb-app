import { createFileRoute } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { useLanguage } from "@/contexts/language-context"
import { useMembership } from "@/contexts/membership-context"
import { Crown, Check, Sparkles, Zap, Star, BookOpen, Award, Headphones, Clock, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { openUrl } from "@tauri-apps/plugin-opener"

export const Route = createFileRoute("/membership")({
  component: MembershipPage,
})

// Stripe payment links by plan and currency
const STRIPE_LINKS = {
  zoo: {
    cz: 'https://buy.stripe.com/6oUdR913N2wCcVV82NcQU01', // CZK Monthly
    en: 'https://buy.stripe.com/4gMfZh5k39Z4f4396RcQU02', // USD Monthly
  },
  zooPlus: {
    cz: 'https://buy.stripe.com/8x228rh2L4EK8FF82NcQU03', // CZK Yearly
    en: 'https://buy.stripe.com/4gM14neUDgns7BB3MxcQU04', // USD Yearly
  },
} as const

function MembershipPage() {
  const { t, language } = useLanguage()
  const { membership } = useMembership()
  const currentPlan = membership?.plan_type || 'free'

  const handleSubscribe = async (planId: string) => {
    if (planId === 'zoo' || planId === 'zooPlus') {
      const link = STRIPE_LINKS[planId][language]
      await openUrl(link)
    }
  }

  const plans = [
    {
      id: 'free',
      name: t.pages.membership.free.name,
      price: t.pages.membership.free.price,
      period: '',
      description: t.pages.membership.free.description,
      features: [
        { icon: BookOpen, text: t.pages.membership.free.features.categories },
        { icon: Zap, text: t.pages.membership.free.features.tasks },
        { icon: Headphones, text: t.pages.membership.free.features.support },
        { icon: Clock, text: t.pages.membership.free.features.updates },
      ],
      highlighted: false,
      badge: null,
      accent: 'default' as const,
    },
    {
      id: 'zoo',
      name: t.pages.membership.zoo.name,
      price: t.pages.membership.zoo.price,
      period: t.pages.membership.zoo.period,
      description: t.pages.membership.zoo.description,
      features: [
        { icon: BookOpen, text: t.pages.membership.zoo.features.categories },
        { icon: Zap, text: t.pages.membership.zoo.features.tasks },
        { icon: Headphones, text: t.pages.membership.zoo.features.support },
        { icon: Rocket, text: t.pages.membership.zoo.features.updates },
        { icon: Sparkles, text: t.pages.membership.zoo.features.hints },
        { icon: Award, text: t.pages.membership.zoo.features.progress },
        { icon: Star, text: t.pages.membership.zoo.features.certificates },
      ],
      highlighted: true,
      badge: t.pages.membership.zoo.popular,
      accent: 'primary' as const,
    },
    {
      id: 'zooPlus',
      name: t.pages.membership.zooPlus.name,
      price: t.pages.membership.zooPlus.price,
      period: t.pages.membership.zooPlus.period,
      description: t.pages.membership.zooPlus.description,
      features: [
        { icon: BookOpen, text: t.pages.membership.zooPlus.features.categories },
        { icon: Zap, text: t.pages.membership.zooPlus.features.tasks },
        { icon: Headphones, text: t.pages.membership.zooPlus.features.support },
        { icon: Rocket, text: t.pages.membership.zooPlus.features.updates },
        { icon: Sparkles, text: t.pages.membership.zooPlus.features.hints },
        { icon: Award, text: t.pages.membership.zooPlus.features.progress },
        { icon: Star, text: t.pages.membership.zooPlus.features.certificates },
        { icon: Crown, text: t.pages.membership.zooPlus.features.lifetime },
        { icon: Check, text: t.pages.membership.zooPlus.features.noBilling },
      ],
      highlighted: false,
      badge: t.pages.membership.zooPlus.badge,
      accent: 'premium' as const,
    },
  ]

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Breadcrumbs />
        </div>
        <Notifications />
      </header>
      <main className="flex-1 overflow-auto">
        <div className="flex flex-col min-h-full">
          {/* Header Section */}
          <div className="px-6 pt-8 pb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">{t.pages.membership.title}</h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              {t.pages.membership.description}
            </p>
          </div>

          {/* Plans Grid - Centered with proper spacing */}
          <div className="flex-1 flex items-start justify-center px-6 pb-8">
            <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-3 w-full max-w-6xl">
              {plans.map((plan) => {
                const isCurrentPlan = currentPlan === plan.id
                const isPremium = plan.accent === 'premium'
                const isPrimary = plan.accent === 'primary'

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "membership-card relative flex flex-col rounded-xl border bg-card transition-all duration-200",
                      plan.highlighted && "md:-translate-y-2 shadow-lg z-10",
                      isPrimary && "border-primary/60 ring-1 ring-primary/20",
                      isPremium && "border-secondary/60 ring-1 ring-secondary/20",
                      !plan.highlighted && !isPremium && "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                        <Badge
                          className={cn(
                            "px-3 py-1 text-xs font-medium shadow-sm border-0",
                            isPrimary && "bg-primary text-primary-foreground",
                            isPremium && "bg-secondary text-secondary-foreground"
                          )}
                        >
                          {plan.badge}
                        </Badge>
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="p-5 pb-4 text-center border-b border-border/50">
                      {/* Icon */}
                      <div className={cn(
                        "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg",
                        plan.accent === 'default' && "bg-muted/80",
                        isPrimary && "bg-primary/10",
                        isPremium && "bg-secondary/30"
                      )}>
                        {plan.accent === 'default' && <Sparkles className="h-6 w-6 text-muted-foreground" />}
                        {isPrimary && <Zap className="h-6 w-6 text-primary" />}
                        {isPremium && <Crown className="h-6 w-6 text-secondary-foreground" />}
                      </div>

                      <h3 className="text-lg font-semibold">{plan.name}</h3>

                      {/* Price */}
                      <div className="mt-3 flex items-baseline justify-center gap-1">
                        <span className={cn(
                          "text-3xl font-bold tracking-tight",
                          isPremium && "text-secondary-foreground"
                        )}>
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-sm text-muted-foreground">
                            {plan.period}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="flex-1 p-5">
                      <ul className="space-y-2.5">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded",
                              plan.accent === 'default' && "text-muted-foreground",
                              isPrimary && "text-primary",
                              isPremium && "text-secondary-foreground"
                            )}>
                              <feature.icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm text-muted-foreground leading-tight">
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <div className="p-5 pt-0">
                      {isCurrentPlan ? (
                        <Button
                          variant="outline"
                          className="w-full h-10"
                          disabled
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {t.pages.membership.currentPlan}
                        </Button>
                      ) : (
                        <Button
                          className={cn(
                            "w-full h-10",
                            isPremium && "bg-secondary text-secondary-foreground hover:bg-secondary/90",
                            isPrimary && "bg-primary text-primary-foreground hover:bg-primary/90"
                          )}
                          variant={plan.accent === 'default' ? 'outline' : 'default'}
                          onClick={() => handleSubscribe(plan.id)}
                        >
                          {plan.accent === 'default'
                            ? t.pages.membership.getStarted
                            : t.pages.membership.becomeMember}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Note */}
          <div className="px-6 pb-6 text-center">
            <p className="text-xs text-muted-foreground">
              {t.pages.membership.comingSoon}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
