import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Eye,
  EyeOff,
  Database,
  Terminal,
  BookOpen,
  Zap,
  BarChart3,
  Code2,
  GraduationCap,
} from "lucide-react"

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
})

function SignInPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await authClient.signIn.email({ email, password })

      if (result.error) {
        setError(result.error.message || "Sign in failed")
        setLoading(false)
        return
      }

      window.location.href = "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed")
      setLoading(false)
    }
  }

  const b = t.auth.bento

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-4">
      {/* Subtle background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/3 auth-animate-gradient" />

      {/* Dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 auth-animate-fade-in"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--primary) / 0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── Bento tiles (behind the card) ── */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {/* Top-left — SQL snippet */}
        <div className="auth-animate-fade-up auth-stagger-3 absolute left-[4%] top-[8%] w-56">
          <BentoTile>
            <div className="flex items-center gap-2 mb-2.5">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{b.query}</span>
            </div>
            <pre className="text-[11px] leading-relaxed text-muted-foreground font-mono">
              <span className="text-primary font-semibold">SELECT</span> name, weight{"\n"}
              <span className="text-primary font-semibold">FROM</span> animals{"\n"}
              <span className="text-primary font-semibold">WHERE</span> born {">"} <span className="text-green-500">'2020-01-01'</span>
            </pre>
          </BentoTile>
        </div>

        {/* Top-right — Progress */}
        <div className="auth-animate-fade-up auth-stagger-4 absolute right-[5%] top-[10%] w-44">
          <BentoTile>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{b.progress}</span>
            </div>
            <div className="space-y-2">
              <ProgressRow label={b.basicQueries} pct={100} />
              <ProgressRow label={b.tableRelationships} pct={72} />
              <ProgressRow label={b.subqueries} pct={35} />
            </div>
          </BentoTile>
        </div>

        {/* Left-center — Lessons counter */}
        <div className="auth-animate-fade-up auth-stagger-5 absolute left-[3%] top-[52%] w-36">
          <BentoTile className="text-center">
            <BookOpen className="mx-auto h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">26</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{b.lessons}</p>
          </BentoTile>
        </div>

        {/* Right-center — Tasks counter */}
        <div className="auth-animate-fade-up auth-stagger-6 absolute right-[4%] top-[48%] w-36">
          <BentoTile className="text-center">
            <Zap className="mx-auto h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">67</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{b.tasks}</p>
          </BentoTile>
        </div>

        {/* Bottom-left — Interactive badge */}
        <div className="auth-animate-fade-up auth-stagger-7 absolute bottom-[10%] left-[6%] w-48">
          <BentoTile>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Terminal className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">{b.interactiveSql}</p>
                <p className="text-[10px] text-muted-foreground">{b.realtimeEditor}</p>
              </div>
            </div>
          </BentoTile>
        </div>

        {/* Bottom-right — Students badge */}
        <div className="auth-animate-fade-up auth-stagger-7 absolute bottom-[8%] right-[5%] w-48">
          <BentoTile>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">{b.classrooms}</p>
                <p className="text-[10px] text-muted-foreground">{b.teachersStudents}</p>
              </div>
            </div>
          </BentoTile>
        </div>
      </div>

      {/* ── Center card ── */}
      <div className="auth-animate-fade-up auth-stagger-1 relative z-10 w-full max-w-[420px]">
        <div className="rounded-2xl border bg-background/80 shadow-xl backdrop-blur-xl p-8 sm:p-10">
          {/* Logo */}
          <div className="auth-animate-fade-up auth-stagger-2 mb-8 flex justify-center">
            <Link to="/sign-in" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md transition-transform group-hover:scale-105">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">ZooDB</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="auth-animate-fade-up auth-stagger-2 mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {t.auth.welcomeBack}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t.auth.signInToAccount}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="auth-animate-fade-up auth-stagger-3 space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                {t.auth.email}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="auth-animate-fade-up auth-stagger-4 space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                {t.auth.password}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-animate-fade-up rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="auth-animate-fade-up auth-stagger-5 pt-2">
              <Button type="submit" className="h-10 w-full text-sm font-semibold" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t.auth.signingIn}
                  </span>
                ) : (
                  t.auth.signIn
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="auth-animate-fade-up auth-stagger-6 mt-6">
            <p className="text-center text-sm text-muted-foreground">
              {t.auth.noAccount}{" "}
              <Link
                to="/sign-up"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t.auth.register}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shared bento tile ── */

function BentoTile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-background/60 p-4 shadow-sm backdrop-blur-md transition-all duration-500 hover:bg-background/80 hover:shadow-md ${className}`}>
      {children}
    </div>
  )
}

function ProgressRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted">
        <div
          className="h-1 rounded-full bg-primary transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
