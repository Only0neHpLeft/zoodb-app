import * as React from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getStudentProgress } from "@/lib/student-tracking"

export function Breadcrumbs() {
  const location = useLocation()
  const pathname = location.pathname
  const { t } = useLanguage()

  const pathSegments = pathname.split("/").filter(Boolean)

  // If we're at root, just show nothing or Home
  if (pathSegments.length === 0) {
    return null
  }

  // Helper function to translate segment
  const translateSegment = (segment: string, parentSegment?: string): string => {
    // Check if we're in students detail page (parent is "students" and segment is student ID)
    if (parentSegment === "students" && segment.startsWith("student-")) {
      const studentData = getStudentProgress(segment, "", "")
      if (studentData && studentData.studentName) {
        return studentData.studentName
      }
    }

    // Check if it's a known route
    if (segment in t.breadcrumbs) {
      return t.breadcrumbs[segment as keyof typeof t.breadcrumbs]
    }

    // Otherwise, capitalize it
    return segment
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Build breadcrumb items - only show nested paths (e.g., Scheme > Animals)
  const breadcrumbs: { label: string; href: string; icon?: React.ComponentType<{ className?: string }> }[] = []

  let currentPath = ""
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const parentSegment = index > 0 ? pathSegments[index - 1] : undefined
    const label = translateSegment(segment, parentSegment)

    breadcrumbs.push({
      label,
      href: currentPath,
      icon: undefined
    })
  })

  // If only one segment (top-level page like /settings), just show the page name
  if (breadcrumbs.length === 1) {
    return (
      <nav className="flex items-center gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          {breadcrumbs[0].label}
        </span>
      </nav>
    )
  }

  // For nested paths, show the full breadcrumb trail
  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        const Icon = crumb.icon

        return (
          <React.Fragment key={crumb.href}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isLast ? (
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {Icon && <Icon className="h-4 w-4" />}
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.href}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
