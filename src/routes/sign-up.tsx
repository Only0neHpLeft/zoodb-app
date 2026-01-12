import { createFileRoute } from "@tanstack/react-router"
import { SignUp } from "@clerk/clerk-react"
import { useTheme } from "next-themes"
import { useCustomTheme } from "@/hooks/use-custom-theme"
import { getClerkAppearance } from "@/lib/clerk-theme"
import type { ThemeName } from "@/lib/themes"

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
})

function SignUpPage() {
  const { resolvedTheme } = useTheme()
  const { theme: customTheme } = useCustomTheme()
  const isDark = resolvedTheme === "dark"

  const appearance = getClerkAppearance(customTheme as ThemeName, isDark)

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background">
      <SignUp
        routing="hash"
        appearance={appearance}
        signInUrl="/sign-in"
      />
    </div>
  )
}
