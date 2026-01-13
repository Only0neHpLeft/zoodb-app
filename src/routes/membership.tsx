import { createFileRoute } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Notifications } from "@/components/notifications"
import { useLanguage } from "@/contexts/language-context"
import { useMembership } from "@/contexts/membership-context"
import { Crown, Check, Sparkles, Zap, Star, BookOpen, Award, Headphones, Clock, Rocket } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/membership")({
  component: MembershipPage,
})

function MembershipPage() {
  const { t } = useLanguage()
  const { membership } = useMembership()
  const currentPlan = membership?.plan_type || 'free'

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
      accent: 'gold' as const,
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
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">{t.pages.membership.title}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t.pages.membership.description}
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id
              const isGold = plan.accent === 'gold'
              const isPrimary = plan.accent === 'primary'

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col transition-all duration-300",
                    plan.highlighted && "md:scale-105 md:shadow-xl",
                    isPrimary && "border-primary border-2",
                    isGold && "border-amber-500/50 border-2 dark:border-amber-400/50",
                    !plan.highlighted && !isGold && "border-2"
                  )}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge
                        className={cn(
                          "px-3 py-1 text-xs font-semibold shadow-md",
                          isPrimary && "bg-primary text-primary-foreground",
                          isGold && "bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0"
                        )}
                      >
                        {plan.badge}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-6">
                    {/* Icon */}
                    <div className={cn(
                      "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full",
                      plan.accent === 'default' && "bg-muted",
                      isPrimary && "bg-primary/10",
                      isGold && "bg-gradient-to-br from-amber-500/20 to-yellow-500/20"
                    )}>
                      {plan.accent === 'default' && <Sparkles className="h-7 w-7 text-muted-foreground" />}
                      {isPrimary && <Zap className="h-7 w-7 text-primary" />}
                      {isGold && <Crown className="h-7 w-7 text-amber-500" />}
                    </div>

                    <CardTitle className="text-xl">{plan.name}</CardTitle>

                    {/* Price */}
                    <div className="mt-3">
                      <span className={cn(
                        "text-4xl font-bold",
                        isGold && "bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent"
                      )}>
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-muted-foreground ml-1 text-sm">
                          {plan.period}
                        </span>
                      )}
                    </div>

                    <CardDescription className="mt-2 text-sm">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    {/* Features */}
                    <div className="space-y-3 flex-1">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                            plan.accent === 'default' && "bg-muted text-muted-foreground",
                            isPrimary && "bg-primary/10 text-primary",
                            isGold && "bg-amber-500/10 text-amber-500"
                          )}>
                            <feature.icon className="h-3 w-3" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <div className="mt-6 pt-4 border-t">
                      {isCurrentPlan ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {t.pages.membership.currentPlan}
                        </Button>
                      ) : (
                        <Button
                          className={cn(
                            "w-full",
                            isGold && "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0",
                            isPrimary && "bg-primary hover:bg-primary/90"
                          )}
                          variant={plan.accent === 'default' ? 'outline' : 'default'}
                        >
                          {plan.accent === 'default'
                            ? t.pages.membership.getStarted
                            : t.pages.membership.becomeMember}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Bottom Note */}
          <p className="text-center text-sm text-muted-foreground">
            {t.pages.membership.comingSoon}
          </p>
        </div>
      </main>
    </div>
  )
}
