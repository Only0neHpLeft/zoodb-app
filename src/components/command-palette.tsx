import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { useLanguage } from "@/contexts/language-context"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { isTauri } from "@/lib/tauri"
import {
  commands,
  categoryLabels,
  type Command as CommandType,
  type CommandCategory,
} from "@/lib/commands"
import { Command as CommandIcon } from "lucide-react"

export function CommandPalette() {
  const { language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false)
  const [isDesktopApp, setIsDesktopApp] = useState(false)

  // Check if running in Tauri
  useEffect(() => {
    setIsDesktopApp(isTauri())
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // CMD+K - Open command palette
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      // CMD+L - Toggle language
      if (e.key === "l" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setLanguage(language === "en" ? "cz" : "en")
        toast.success(language === "en" ? "Jazyk změněn na češtinu" : "Language changed to English")
      }
      // CMD+/ - Show shortcuts
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowShortcutsDialog(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [language, setLanguage])

  // Execute function commands
  const executeFunction = useCallback(
    async (functionId: string, command: CommandType) => {
      // Check if command requires Tauri but we're in browser
      if (command.tauriOnly && !isDesktopApp) {
        toast.error(
          language === "cz"
            ? "Tato funkce je dostupná pouze v desktopové aplikaci"
            : "This feature is only available in the desktop app"
        )
        return
      }

      switch (functionId) {
        case "reload":
          window.location.reload()
          break
        case "lightMode":
          document.documentElement.classList.remove("dark")
          localStorage.setItem("theme", "light")
          toast.success(language === "cz" ? "Světlý režim aktivován" : "Light mode enabled")
          break
        case "darkMode":
          document.documentElement.classList.add("dark")
          localStorage.setItem("theme", "dark")
          toast.success(language === "cz" ? "Tmavý režim aktivován" : "Dark mode enabled")
          break
        case "toggleLanguage":
          setLanguage(language === "en" ? "cz" : "en")
          toast.success(language === "en" ? "Jazyk změněn na češtinu" : "Language changed to English")
          break
        case "toggleFullscreen":
          try {
            // Use Tauri's window API for fullscreen
            const { getCurrentWindow } = await import("@tauri-apps/api/window")
            const appWindow = getCurrentWindow()
            const isFullscreen = await appWindow.isFullscreen()
            await appWindow.setFullscreen(!isFullscreen)
          } catch (error) {
            console.error("Fullscreen error:", error)
            toast.error(
              language === "cz"
                ? "Nepodařilo se přepnout celou obrazovku"
                : "Failed to toggle fullscreen"
            )
          }
          break
        case "resetProgress": {
          const confirmed = window.confirm(
            language === "cz"
              ? "Opravdu chcete resetovat svůj postup? Tato akce je nevratná."
              : "Are you sure you want to reset your progress? This action cannot be undone."
          )
          if (confirmed) {
            localStorage.removeItem("completedTasks")
            localStorage.removeItem("taskProgress")
            localStorage.removeItem("studentAnalytics")
            toast.success(language === "cz" ? "Postup byl resetován" : "Progress has been reset")
            window.location.reload()
          }
          break
        }
        case "clearCache": {
          const confirmed = window.confirm(
            language === "cz"
              ? "Opravdu chcete vymazat mezipaměť? Aplikace se poté znovu načte."
              : "Are you sure you want to clear the cache? The app will reload."
          )
          if (confirmed) {
            localStorage.clear()
            sessionStorage.clear()
            toast.success(language === "cz" ? "Mezipaměť vymazána" : "Cache cleared")
            window.location.reload()
          }
          break
        }
        case "checkUpdates":
          try {
            const { check } = await import("@tauri-apps/plugin-updater")
            toast.info(
              language === "cz"
                ? "Kontroluji aktualizace..."
                : "Checking for updates..."
            )
            const update = await check()
            if (update) {
              toast.success(
                language === "cz"
                  ? `Nová verze ${update.version} je k dispozici!`
                  : `New version ${update.version} is available!`
              )
            } else {
              toast.info(
                language === "cz"
                  ? "Máte nejnovější verzi"
                  : "You have the latest version"
              )
            }
          } catch (error) {
            console.error("Update check error:", error)
            toast.error(
              language === "cz"
                ? "Nepodařilo se zkontrolovat aktualizace"
                : "Failed to check for updates"
            )
          }
          break
        case "signOut":
          await authClient.signOut()
          window.location.href = "/sign-in"
          break
        case "showShortcuts":
          setShowShortcutsDialog(true)
          break
        case "showAbout":
          toast.info("Zoo Database v0.0.9 - SQL Learning Platform")
          break
        default:
          console.warn(`Unknown function: ${functionId}`)
      }
    },
    [language, setLanguage, navigate, isDesktopApp]
  )

  // Handle command selection
  const handleSelect = useCallback(
    (command: CommandType) => {
      setOpen(false)
      setInputValue("")

      if (command.action === "navigate" && command.href) {
        navigate({ to: command.href })
      } else if (command.action === "function" && command.functionId) {
        executeFunction(command.functionId, command)
      }
    },
    [navigate, executeFunction]
  )

  // Get localized label
  const getLabel = (command: CommandType) => {
    if (language === "cz" && command.labelCz) {
      return command.labelCz
    }
    return command.label
  }

  // Get localized description
  const getDescription = (command: CommandType) => {
    if (language === "cz" && command.descriptionCz) {
      return command.descriptionCz
    }
    return command.description
  }

  // Get localized category label
  const getCategoryLabel = (category: CommandCategory) => {
    return language === "cz"
      ? categoryLabels[category].cz
      : categoryLabels[category].en
  }

  // Filter commands based on input
  const filteredCommands = inputValue
    ? commands.filter((cmd) => {
        const label = getLabel(cmd).toLowerCase()
        const description = (getDescription(cmd) || "").toLowerCase()
        const search = inputValue.toLowerCase()
        return label.includes(search) || description.includes(search)
      })
    : commands

  // Group filtered commands by category
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = []
      }
      acc[cmd.category].push(cmd)
      return acc
    },
    {} as Record<CommandCategory, CommandType[]>
  )

  const categories: CommandCategory[] = ["actions", "theme", "help"]

  // Keyboard shortcuts for the help dialog
  const shortcuts = [
    { keys: "⌘K", description: language === "cz" ? "Otevřít příkazy" : "Open commands" },
    { keys: "⌘L", description: language === "cz" ? "Přepnout jazyk" : "Toggle language" },
    { keys: "⌘R", description: language === "cz" ? "Obnovit stránku" : "Reload page" },
    { keys: "⌘/", description: language === "cz" ? "Zobrazit zkratky" : "Show shortcuts" },
    { keys: "F11", description: language === "cz" ? "Celá obrazovka" : "Fullscreen", desktopOnly: true },
    { keys: "Esc", description: language === "cz" ? "Zavřít dialog" : "Close dialog" },
  ]

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <CommandIcon className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">
          {language === "cz" ? "Příkazy..." : "Commands..."}
        </span>
        <Kbd className="pointer-events-none absolute right-1.5 top-2 hidden xl:flex">
          <span className="text-xs">⌘</span>K
        </Kbd>
      </Button>

      {/* Command Palette Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={
              language === "cz"
                ? "Zadejte příkaz..."
                : "Type a command..."
            }
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {filteredCommands.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {language === "cz"
                  ? "Žádné příkazy nenalezeny."
                  : "No commands found."}
              </div>
            ) : (
              <>
                {categories.map((category, index) => {
                  const categoryCommands = groupedCommands[category]
                  if (!categoryCommands || categoryCommands.length === 0) {
                    return null
                  }

                  return (
                    <React.Fragment key={category}>
                      {index > 0 && <CommandSeparator />}
                      <CommandGroup heading={getCategoryLabel(category)}>
                        {categoryCommands.map((command) => {
                          const Icon = command.icon
                          const isDisabled = command.tauriOnly && !isDesktopApp
                          return (
                            <CommandItem
                              key={command.id}
                              onSelect={() => handleSelect(command)}
                              className={`flex items-center justify-between ${isDisabled ? "opacity-50" : ""}`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {getLabel(command)}
                                    {isDisabled && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        ({language === "cz" ? "pouze aplikace" : "app only"})
                                      </span>
                                    )}
                                  </div>
                                  {getDescription(command) && (
                                    <div className="text-xs text-muted-foreground">
                                      {getDescription(command)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {command.shortcut && (
                                <Kbd className="ml-auto text-xs">
                                  {command.shortcut}
                                </Kbd>
                              )}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </React.Fragment>
                  )
                })}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>

      {/* Keyboard Shortcuts Dialog */}
      <CommandDialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <Command>
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">
              {language === "cz" ? "Klávesové zkratky" : "Keyboard Shortcuts"}
            </h2>
          </div>
          <CommandList>
            <CommandGroup>
              {shortcuts.map((shortcut) => (
                <CommandItem
                  key={shortcut.keys}
                  className="flex items-center justify-between cursor-default"
                  onSelect={() => {}}
                >
                  <span>
                    {shortcut.description}
                    {shortcut.desktopOnly && !isDesktopApp && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({language === "cz" ? "pouze aplikace" : "app only"})
                      </span>
                    )}
                  </span>
                  <Kbd className="text-xs">{shortcut.keys}</Kbd>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
