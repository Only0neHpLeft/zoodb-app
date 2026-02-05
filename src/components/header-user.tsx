import { Link } from "@tanstack/react-router"
import { useAuth } from "@/hooks/use-auth"
import { User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function HeaderUser() {
  const { user, isSignedIn, logout } = useAuth()

  if (!isSignedIn || !user) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link to="/sign-in">Sign in</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
            <User className="size-4 text-primary-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{user.name || "User"}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
