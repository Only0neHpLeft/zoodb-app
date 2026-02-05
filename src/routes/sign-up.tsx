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
  Shield,
  Code2,
  Table2,
  GraduationCap,
} from "lucide-react"

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
})

function SignUpPage() {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const result = await authClient.signUp.email({ name, email, password })

      if (result.error) {
        setError(result.error.message || "Sign up failed")
        setLoading(false)
        return
      }

      window.location.href = "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed")
      setLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(password)
  const b = t.auth.bento

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-4">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tl from-primary/3 via-transparent to-primary/3 auth-animate-gradient" />

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 auth-animate-fade-in"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Bento tiles ── */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {/* Top-left — Schema preview */}
        <div className="auth-animate-fade-up auth-stagger-3 absolute left-[3%] top-[6%] w-56">
          <BentoTile>
            <div className="flex items-center gap-2 mb-2.5">
              <Table2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{b.schema}</span>
            </div>
            <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
              <div className="flex gap-2"><span className="text-primary">{b.schemaAnimals}</span><span className="text-muted-foreground/50">{b.schemaAnimalsColumns}</span></div>
              <div className="flex gap-2"><span className="text-primary">{b.schemaTypes}</span><span className="text-muted-foreground/50">{b.schemaTypesColumns}</span></div>
              <div className="flex gap-2"><span className="text-primary">{b.schemaCaretakers}</span><span className="text-muted-foreground/50">{b.schemaCaretakersColumns}</span></div>
              <div className="flex gap-2"><span className="text-primary">{b.schemaTreats}</span><span className="text-muted-foreground/50">{b.schemaTreatsColumns}</span></div>
              <div className="flex gap-2"><span className="text-primary">{b.schemaLikes}</span><span className="text-muted-foreground/50">{b.schemaLikesColumns}</span></div>
            </div>
          </BentoTile>
        </div>

        {/* Top-right — Feature list */}
        <div className="auth-animate-fade-up auth-stagger-4 absolute right-[4%] top-[8%] w-48">
          <BentoTile>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{b.features}</span>
            </div>
            <div className="space-y-2">
              <FeatureRow icon={<Terminal className="h-3 w-3" />} text={b.sqlEditor} />
              <FeatureRow icon={<BookOpen className="h-3 w-3" />} text={b.guidedCurriculum} />
              <FeatureRow icon={<Shield className="h-3 w-3" />} text={b.offlineFirst} />
            </div>
          </BentoTile>
        </div>

        {/* Left-center — Tasks stat */}
        <div className="auth-animate-fade-up auth-stagger-5 absolute left-[2%] top-[48%] w-36">
          <BentoTile className="text-center">
            <Zap className="mx-auto h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">67</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{b.tasks}</p>
          </BentoTile>
        </div>

        {/* Right-center — Lessons stat */}
        <div className="auth-animate-fade-up auth-stagger-6 absolute right-[3%] top-[45%] w-36">
          <BentoTile className="text-center">
            <BookOpen className="mx-auto h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">26</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{b.lessons}</p>
          </BentoTile>
        </div>

        {/* Bottom-left — SQL JOIN example */}
        <div className="auth-animate-fade-up auth-stagger-7 absolute bottom-[8%] left-[5%] w-56">
          <BentoTile>
            <div className="flex items-center gap-2 mb-2.5">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{b.example}</span>
            </div>
            <pre className="text-[11px] leading-relaxed text-muted-foreground font-mono">
              <span className="text-primary font-semibold">SELECT</span> {b.sqlSnippetSelect.replace("SELECT ", "")}{"\n"}
              <span className="text-primary font-semibold">FROM</span> {b.sqlSnippetFrom.replace("FROM ", "")}{"\n"}
              <span className="text-primary font-semibold">JOIN</span> {b.sqlSnippetJoin.replace("JOIN ", "")}{"\n"}
              {"  "}<span className="text-primary font-semibold">ON</span> {b.sqlSnippetOn.replace("ON ", "")}
            </pre>
          </BentoTile>
        </div>

        {/* Bottom-right — Classroom */}
        <div className="auth-animate-fade-up auth-stagger-7 absolute bottom-[10%] right-[4%] w-48">
          <BentoTile>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">{b.classrooms}</p>
                <p className="text-[10px] text-muted-foreground">{b.trackProgress}</p>
              </div>
            </div>
          </BentoTile>
        </div>
      </div>

      {/* ── Center card ── */}
      <div className="auth-animate-fade-up auth-stagger-1 relative z-10 w-full max-w-[420px]">
        <div className="rounded-2xl border bg-background/80 shadow-xl backdrop-blur-xl p-8 sm:p-10">
          {/* Logo */}
          <div className="auth-animate-fade-up auth-stagger-1 mb-6 flex justify-center">
            <Link to="/sign-in" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md transition-transform group-hover:scale-105">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">ZooDB</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="auth-animate-fade-up auth-stagger-2 mb-5 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {t.auth.createAccount}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t.auth.createNewAccount}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="auth-animate-fade-up auth-stagger-2 space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                {t.auth.fullName}
              </Label>
              <Input
                id="name"
                type="text"
                placeholder={t.auth.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-10"
              />
            </div>

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
                  autoComplete="new-password"
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
              {password.length > 0 && (
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          level <= passwordStrength.level ? passwordStrength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-medium ${passwordStrength.textColor}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="auth-animate-fade-up auth-stagger-5 space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-medium">
                {t.auth.confirmPassword}
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.auth.passwordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-animate-fade-up rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="auth-animate-fade-up auth-stagger-6 pt-1.5">
              <Button type="submit" className="h-10 w-full text-sm font-semibold" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t.auth.creatingAccount}
                  </span>
                ) : (
                  t.auth.createAccount
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="auth-animate-fade-up auth-stagger-7 mt-5 space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              {t.auth.haveAccount}{" "}
              <Link
                to="/sign-in"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t.auth.signIn}
              </Link>
            </p>
            <p className="text-center text-[10px] leading-relaxed text-muted-foreground/50">
              {t.auth.terms}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shared components ── */

function BentoTile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-background/60 p-4 shadow-sm backdrop-blur-md transition-all duration-500 hover:bg-background/80 hover:shadow-md ${className}`}>
      {children}
    </div>
  )
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  )
}

function getPasswordStrength(password: string): {
  level: number
  label: string
  color: string
  textColor: string
} {
  if (password.length === 0) return { level: 0, label: "", color: "", textColor: "" }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: "Weak", color: "bg-destructive", textColor: "text-destructive" }
  if (score <= 2) return { level: 2, label: "Fair", color: "bg-orange-500", textColor: "text-orange-500" }
  if (score <= 3) return { level: 3, label: "Good", color: "bg-yellow-500", textColor: "text-yellow-500" }
  return { level: 4, label: "Strong", color: "bg-green-500", textColor: "text-green-500" }
}
