import {
  RefreshCw,
  Sun,
  Moon,
  Languages,
  Maximize,
  RotateCcw,
  Trash2,
  Download,
  LogOut,
  Keyboard,
  Info,
  type LucideIcon,
} from "lucide-react"

export type CommandCategory = "actions" | "theme" | "help"

export interface Command {
  id: string
  label: string
  labelCz?: string
  description?: string
  descriptionCz?: string
  category: CommandCategory
  icon: LucideIcon
  shortcut?: string
  action: "navigate" | "function"
  href?: string
  functionId?: string
  tauriOnly?: boolean
}

export const categoryLabels: Record<CommandCategory, { en: string; cz: string }> = {
  actions: { en: "Actions", cz: "Akce" },
  theme: { en: "Theme", cz: "Téma" },
  help: { en: "Help", cz: "Nápověda" },
}

export const commands: Command[] = [
  // Actions
  {
    id: "reload",
    label: "Reload Page",
    labelCz: "Obnovit stránku",
    description: "Refresh the current page",
    descriptionCz: "Obnovit aktuální stránku",
    category: "actions",
    icon: RefreshCw,
    shortcut: "⌘R",
    action: "function",
    functionId: "reload",
  },
  {
    id: "toggleLanguage",
    label: "Toggle Language",
    labelCz: "Přepnout jazyk",
    description: "Switch between English and Czech",
    descriptionCz: "Přepnout mezi angličtinou a češtinou",
    category: "actions",
    icon: Languages,
    shortcut: "⌘L",
    action: "function",
    functionId: "toggleLanguage",
  },
  {
    id: "toggleFullscreen",
    label: "Toggle Fullscreen",
    labelCz: "Celá obrazovka",
    description: "Enter or exit fullscreen mode",
    descriptionCz: "Zapnout nebo vypnout režim celé obrazovky",
    category: "actions",
    icon: Maximize,
    shortcut: "F11",
    action: "function",
    functionId: "toggleFullscreen",
    tauriOnly: true,
  },
  {
    id: "resetProgress",
    label: "Reset Progress",
    labelCz: "Resetovat postup",
    description: "Clear all saved progress",
    descriptionCz: "Vymazat veškerý uložený postup",
    category: "actions",
    icon: RotateCcw,
    action: "function",
    functionId: "resetProgress",
  },
  {
    id: "clearCache",
    label: "Clear Cache",
    labelCz: "Vymazat mezipaměť",
    description: "Clear local storage and reload",
    descriptionCz: "Vymazat lokální úložiště a znovu načíst",
    category: "actions",
    icon: Trash2,
    action: "function",
    functionId: "clearCache",
  },
  {
    id: "checkUpdates",
    label: "Check for Updates",
    labelCz: "Zkontrolovat aktualizace",
    description: "Check if a new version is available",
    descriptionCz: "Zkontrolovat, zda je k dispozici nová verze",
    category: "actions",
    icon: Download,
    action: "function",
    functionId: "checkUpdates",
    tauriOnly: true,
  },
  {
    id: "signOut",
    label: "Sign Out",
    labelCz: "Odhlásit se",
    description: "Sign out of your account",
    descriptionCz: "Odhlásit se z účtu",
    category: "actions",
    icon: LogOut,
    action: "function",
    functionId: "signOut",
  },

  // Theme
  {
    id: "lightMode",
    label: "Light Mode",
    labelCz: "Světlý režim",
    description: "Switch to light mode",
    descriptionCz: "Přepnout na světlý režim",
    category: "theme",
    icon: Sun,
    action: "function",
    functionId: "lightMode",
  },
  {
    id: "darkMode",
    label: "Dark Mode",
    labelCz: "Tmavý režim",
    description: "Switch to dark mode",
    descriptionCz: "Přepnout na tmavý režim",
    category: "theme",
    icon: Moon,
    action: "function",
    functionId: "darkMode",
  },

  // Help
  {
    id: "showShortcuts",
    label: "Keyboard Shortcuts",
    labelCz: "Klávesové zkratky",
    description: "View all keyboard shortcuts",
    descriptionCz: "Zobrazit všechny klávesové zkratky",
    category: "help",
    icon: Keyboard,
    shortcut: "⌘/",
    action: "function",
    functionId: "showShortcuts",
  },
  {
    id: "showAbout",
    label: "About",
    labelCz: "O aplikaci",
    description: "View app information",
    descriptionCz: "Zobrazit informace o aplikaci",
    category: "help",
    icon: Info,
    action: "function",
    functionId: "showAbout",
  },
]
