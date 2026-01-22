import { useCallback, useRef, useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/language-context"
import { Table2, Columns3, Hash, FunctionSquare } from "lucide-react"
import {
  tokenize,
  highlightTokens,
  escapeHtml,
  isInsideStringOrComment,
  getWordAtCursor,
  getContext,
  SQL_KEYWORDS,
  SQL_FUNCTIONS,
} from "@/lib/sql/sql-tokenizer"

// Re-export for backward compatibility
export { SQL_KEYWORDS, SQL_FUNCTIONS }

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Database schema definitions
interface TableSchema {
  name: string
  columns: string[]
}

const SCHEMA_EN: TableSchema[] = [
  { name: 'Animals', columns: ['id', 'type', 'name', 'weight', 'born', 'consumption'] },
  { name: 'Types', columns: ['id', 'title', 'weight_min', 'weight_max'] },
  { name: 'Caretakers', columns: ['id', 'name', 'born'] },
  { name: 'Likes', columns: ['id', 'caretaker', 'type'] },
  { name: 'Treats', columns: ['id', 'caretaker', 'animal'] },
]

const SCHEMA_CZ: TableSchema[] = [
  { name: 'Zvirata', columns: ['id', 'druh', 'jmeno', 'vaha', 'narozen', 'spotreba'] },
  { name: 'Druhy', columns: ['id', 'nazev', 'vaha_min', 'vaha_max'] },
  { name: 'Osetrovatele', columns: ['id', 'jmeno', 'narozen'] },
  { name: 'Ma_rad', columns: ['id', 'osetrujici', 'druh'] },
  { name: 'Osetruje', columns: ['id', 'osetrujici', 'zvire'] },
]

// Suggestion types
type SuggestionType = 'table' | 'column' | 'keyword' | 'function'

interface Suggestion {
  text: string
  type: SuggestionType
  tableName?: string // For columns, to show which table they belong to
}

// Get icon for suggestion type
function SuggestionIcon({ type }: { type: SuggestionType }) {
  switch (type) {
    case 'table':
      return <Table2 className="h-3.5 w-3.5 text-blue-500" />
    case 'column':
      return <Columns3 className="h-3.5 w-3.5 text-green-500" />
    case 'keyword':
      return <Hash className="h-3.5 w-3.5 text-purple-500" />
    case 'function':
      return <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />
    default:
      return null
  }
}

export function SqlEditor({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className,
}: SqlEditorProps) {
  const { language } = useLanguage()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [highlighted, setHighlighted] = useState('')

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })
  const [wordInfo, setWordInfo] = useState<{ word: string; start: number }>({ word: '', start: 0 })

  // Calculate line numbers
  const lineCount = useMemo(() => {
    const lines = value.split('\n').length
    return Math.max(lines, 1)
  }, [value])

  // Get current line from cursor position
  const [currentLine, setCurrentLine] = useState(1)

  const updateCurrentLine = useCallback(() => {
    if (!textareaRef.current) return
    const cursorPos = textareaRef.current.selectionStart
    const textBefore = value.slice(0, cursorPos)
    const line = textBefore.split('\n').length
    setCurrentLine(line)
  }, [value])

  // Get schema based on language
  const schema = useMemo(() => {
    return language === 'cz' ? SCHEMA_CZ : SCHEMA_EN
  }, [language])

  // Get all table names
  const tableNames = useMemo(() => schema.map(t => t.name), [schema])

  // Update highlighting when value changes
  useEffect(() => {
    const tokens = tokenize(value)
    const html = highlightTokens(tokens)
    setHighlighted(html + '\n')
  }, [value])

  // Generate suggestions based on context
  const generateSuggestions = useCallback((sql: string, cursorPos: number): Suggestion[] => {
    if (isInsideStringOrComment(sql, cursorPos)) {
      return []
    }

    const { word, afterDot, tableName } = getWordAtCursor(sql, cursorPos)
    const context = getContext(sql, cursorPos)
    const lowerWord = word.toLowerCase()
    const results: Suggestion[] = []

    // If after a dot, show columns for that table (simple lookup, no alias resolution)
    if (afterDot && tableName) {
      const table = schema.find(t => t.name.toLowerCase() === tableName.toLowerCase())
      if (table) {
        for (const col of table.columns) {
          if (!lowerWord || col.toLowerCase().startsWith(lowerWord)) {
            results.push({ text: col, type: 'column', tableName: table.name })
          }
        }
      }
      return results.slice(0, 10)
    }

    // Context-based suggestions
    if (context === 'from' || context === 'join') {
      // After FROM/JOIN, prioritize tables
      for (const table of tableNames) {
        if (!lowerWord || table.toLowerCase().startsWith(lowerWord)) {
          results.push({ text: table, type: 'table' })
        }
      }
    } else {
      // For SELECT/WHERE/general, show everything

      // Tables
      for (const table of tableNames) {
        if (!lowerWord || table.toLowerCase().startsWith(lowerWord)) {
          results.push({ text: table, type: 'table' })
        }
      }

      // All columns (from all tables)
      for (const table of schema) {
        for (const col of table.columns) {
          if (!lowerWord || col.toLowerCase().startsWith(lowerWord)) {
            // Avoid duplicates
            if (!results.find(r => r.text === col && r.type === 'column')) {
              results.push({ text: col, type: 'column', tableName: table.name })
            }
          }
        }
      }
    }

    // Keywords
    for (const kw of SQL_KEYWORDS) {
      if (!lowerWord || kw.toLowerCase().startsWith(lowerWord)) {
        results.push({ text: kw, type: 'keyword' })
      }
    }

    // Functions
    for (const fn of SQL_FUNCTIONS) {
      if (!lowerWord || fn.toLowerCase().startsWith(lowerWord)) {
        results.push({ text: fn, type: 'function' })
      }
    }

    // Sort: tables first, then columns, then keywords, then functions
    // Also prioritize exact prefix matches
    results.sort((a, b) => {
      const typeOrder = { table: 0, column: 1, keyword: 2, function: 3 }
      const aStarts = a.text.toLowerCase().startsWith(lowerWord)
      const bStarts = b.text.toLowerCase().startsWith(lowerWord)

      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type]
      }

      return a.text.localeCompare(b.text)
    })

    return results.slice(0, 10)
  }, [schema, tableNames])

  // Calculate popup position based on cursor
  const calculatePopupPosition = useCallback(() => {
    if (!textareaRef.current) return { top: 0, left: 0 }

    const textarea = textareaRef.current
    const { selectionStart } = textarea
    const textBefore = value.slice(0, selectionStart)
    const lines = textBefore.split('\n')
    const currentLine = lines.length
    const currentCol = lines[lines.length - 1].length

    // Approximate character dimensions
    const lineHeight = 21 // 1.5 * 14px
    const charWidth = 8.4 // Approximate for monospace

    const top = currentLine * lineHeight + 4
    const left = currentCol * charWidth + 12

    return { top, left }
  }, [value])

  // Update suggestions on input
  const updateSuggestions = useCallback(() => {
    if (!textareaRef.current) return

    const cursorPos = textareaRef.current.selectionStart
    const { word, start } = getWordAtCursor(value, cursorPos)

    setWordInfo({ word, start })

    // Don't show autocomplete for very short words unless after a dot
    const { afterDot } = getWordAtCursor(value, cursorPos)
    if (word.length < 1 && !afterDot) {
      setShowAutocomplete(false)
      return
    }

    const newSuggestions = generateSuggestions(value, cursorPos)

    if (newSuggestions.length > 0) {
      setSuggestions(newSuggestions)
      setSelectedIndex(0)
      setPopupPosition(calculatePopupPosition())
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
  }, [value, generateSuggestions, calculatePopupPosition])

  // Handle accepting a suggestion
  const acceptSuggestion = useCallback((suggestion: Suggestion) => {
    if (!textareaRef.current) return

    const { start } = wordInfo
    const cursorPos = textareaRef.current.selectionStart
    const before = value.slice(0, start)
    const after = value.slice(cursorPos)

    const newValue = before + suggestion.text + after
    onChange(newValue)

    setShowAutocomplete(false)

    // Move cursor to end of inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + suggestion.text.length
        textareaRef.current.selectionStart = newPos
        textareaRef.current.selectionEnd = newPos
        textareaRef.current.focus()
      }
    }, 0)
  }, [value, onChange, wordInfo])

  // Sync scroll position
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
    // Sync line numbers scroll
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
    // Hide autocomplete on scroll
    setShowAutocomplete(false)
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }, [onChange])

  // Debounced suggestion update
  useEffect(() => {
    const timer = setTimeout(updateSuggestions, 100)
    return () => clearTimeout(timer)
  }, [value, updateSuggestions])

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showAutocomplete && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % suggestions.length)
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
          return
        case 'Tab':
        case 'Enter':
          if (suggestions[selectedIndex]) {
            e.preventDefault()
            acceptSuggestion(suggestions[selectedIndex])
            return
          }
          break
        case 'Escape':
          e.preventDefault()
          setShowAutocomplete(false)
          return
        case ' ':
          // Space key: close popup but let space be typed normally (non-blocking)
          setShowAutocomplete(false)
          // Don't preventDefault - let the space be inserted
          break
      }
    }

    // Pass through to external handler
    onKeyDown?.(e)
  }, [showAutocomplete, suggestions, selectedIndex, acceptSuggestion, onKeyDown])

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Highlight matching characters in suggestion
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)

    if (index === -1) return text

    return (
      <>
        {text.slice(0, index)}
        <span className="sql-autocomplete-match">{text.slice(index, index + query.length)}</span>
        {text.slice(index + query.length)}
      </>
    )
  }

  return (
    <div className={cn("sql-editor-container relative", className)}>
      {/* Line numbers gutter */}
      <div
        ref={lineNumbersRef}
        className="sql-editor-line-numbers"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i + 1}
            className={cn(
              "sql-line-number",
              currentLine === i + 1 && "sql-line-number-active"
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>
      {/* Editor content area */}
      <div className="sql-editor-content">
        {/* Highlighted layer (behind) */}
        <pre
          ref={highlightRef}
          className="sql-editor-highlight"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlighted || (placeholder ? `<span class="sql-placeholder">${escapeHtml(placeholder)}</span>` : '\n') }}
        />
        {/* Textarea layer (front, transparent text) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onSelect={updateCurrentLine}
          onClick={updateCurrentLine}
          placeholder=""
          disabled={disabled}
          className="sql-editor-textarea"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />

        {/* Autocomplete popup */}
        {showAutocomplete && suggestions.length > 0 && (
          <div
            ref={popupRef}
            className="sql-autocomplete-popup"
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
            }}
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.type}-${suggestion.text}`}
                className={cn(
                  "sql-autocomplete-item",
                  index === selectedIndex && "sql-autocomplete-item-selected"
                )}
                onClick={() => acceptSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <SuggestionIcon type={suggestion.type} />
                <span className="sql-autocomplete-text">
                  {highlightMatch(suggestion.text, wordInfo.word)}
                </span>
                {suggestion.tableName && (
                  <span className="sql-autocomplete-table">{suggestion.tableName}</span>
                )}
                <span className="sql-autocomplete-type">{suggestion.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
