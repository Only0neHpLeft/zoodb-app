import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { authClient, useSession } from "@/lib/auth-client"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Database, Mail } from "lucide-react"

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const navigate = useNavigate()
  const email = new URLSearchParams(window.location.search).get("email") ?? ""
  const redirect = new URLSearchParams(window.location.search).get("redirect") || "/"

  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(60)

  // Redirect if already verified
  useEffect(() => {
    if (session?.user?.emailVerified) {
      navigate({ to: redirect } as never)
    }
  }, [session, navigate])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Redirect to sign-up if no email
  useEffect(() => {
    if (!email) {
      navigate({ to: "/sign-up" })
    }
  }, [email, navigate])

  const handleVerify = useCallback(
    async (code: string) => {
      if (code.length !== 6 || loading) return
      setLoading(true)
      setError(null)
      setSuccess(null)

      try {
        const result = await authClient.emailOtp.verifyEmail({
          email,
          otp: code,
        })

        if (result.error) {
          const msg = (result.error.message || result.error.statusText || "").toLowerCase()
          if (msg.includes("expired")) {
            setError(t.auth.codeExpired)
          } else {
            setError(t.auth.invalidCode)
          }
          setOtp("")
          setLoading(false)
          return
        }

        // Auto-sign-in: requireEmailVerification prevents a usable session
        // on signup, so after OTP we sign in with the held password.
        const pw = (() => { try { return sessionStorage.getItem("zoodb:signup-pw") } catch { return null } })()
        try { sessionStorage.removeItem("zoodb:signup-pw") } catch {}

        if (pw) {
          try {
            // signIn creates a fresh session with emailVerified: true —
            // no stale cookie cache, so soft navigate works cleanly.
            await authClient.signIn.email({ email, password: pw })
            await authClient.getSession()
            ;(authClient as any).updateSession?.()
            navigate({ to: redirect } as never)
            return
          } catch { /* fall through to full reload */ }
        }

        // Fallback (no stored password or sign-in failed): full reload
        // forces AuthGuard to fetch a fresh session from scratch.
        window.location.href = redirect
      } catch {
        setError(t.auth.invalidCode)
        setOtp("")
        setLoading(false)
      }
    },
    [email, loading, t],
  )

  const handleResend = async () => {
    if (cooldown > 0) return
    setError(null)
    setSuccess(null)

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      })
      setSuccess(t.auth.codeSent)
      setCooldown(60)
    } catch {
      setError(t.auth.invalidCode)
    }
  }

  const handleOtpChange = (value: string) => {
    setOtp(value)
    if (value.length === 6) {
      handleVerify(value)
    }
  }

  if (!email) return null

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

      {/* Center card */}
      <div className="auth-animate-fade-up auth-stagger-1 relative z-10 w-full max-w-[420px]">
        <div className="rounded-2xl border bg-background/80 shadow-xl backdrop-blur-xl p-8 sm:p-10">
          {/* Logo */}
          <div className="auth-animate-fade-up auth-stagger-1 mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">ZooDB</span>
            </div>
          </div>

          {/* Mail icon */}
          <div className="auth-animate-fade-up auth-stagger-2 mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <div className="auth-animate-fade-up auth-stagger-2 mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {t.auth.verifyEmail}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.auth.verifyEmailDescription}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
          </div>

          {/* OTP Input */}
          <div className="auth-animate-fade-up auth-stagger-3 flex justify-center mb-5">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
              </InputOTPGroup>
              <div className="w-3" />
              <InputOTPGroup>
                <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="auth-animate-fade-up mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="auth-animate-fade-up mb-4 rounded-lg border border-green-500/20 bg-green-500/5 px-3.5 py-2.5">
              <p className="text-sm text-green-600 dark:text-green-400 text-center">
                {success}
              </p>
            </div>
          )}

          {/* Verify button */}
          <div className="auth-animate-fade-up auth-stagger-4 mb-4">
            <Button
              className="h-10 w-full text-sm font-semibold"
              disabled={otp.length !== 6 || loading}
              onClick={() => handleVerify(otp)}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t.auth.verifying}
                </span>
              ) : (
                t.auth.verifyButton
              )}
            </Button>
          </div>

          {/* Resend / Wrong email */}
          <div className="auth-animate-fade-up auth-stagger-5 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-sm text-primary font-medium underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
            >
              {cooldown > 0
                ? `${t.auth.resendCodeIn} ${cooldown}${t.auth.seconds}`
                : t.auth.resendCode}
            </button>

            <Link
              to="/sign-up"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
            >
              {t.auth.wrongEmail}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
