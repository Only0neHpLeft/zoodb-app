import { useCallback, useRef, useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/language-context"
import { Table2, Columns3, Hash, FunctionSquare } from "lucide-react"

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// SQL token types for syntax highlighting
type TokenType = 'keyword' | 'function' | 'string' | 'number' | 'comment' | 'operator' | 'identifier'

interface Token {
  type: TokenType
  value: string
}

// SQL keywords
export const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON', 'AS',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
  'DROP', 'ALTER', 'ADD', 'COLUMN', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'CONSTRAINT', 'UNIQUE', 'DEFAULT', 'CHECK', 'CASCADE',
  'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
  'UNION', 'ALL', 'DISTINCT', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'CAST', 'COALESCE', 'NULLIF', 'TRUE', 'FALSE', 'WITH',
  'RECURSIVE', 'RETURNING', 'IF', 'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
  'SERIAL', 'INTEGER', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 'TIMESTAMP',
  'NUMERIC', 'DECIMAL', 'FLOAT', 'DOUBLE', 'PRECISION', 'SMALLINT', 'BIGINT',
])

// SQL functions
export const SQL_FUNCTIONS = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'FLOOR', 'CEIL', 'ABS',
  'LENGTH', 'LOWER', 'UPPER', 'TRIM', 'LTRIM', 'RTRIM', 'SUBSTRING', 'REPLACE',
  'CONCAT', 'COALESCE', 'NULLIF', 'CAST', 'CONVERT', 'NOW', 'CURRENT_DATE',
  'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'DATE_PART', 'EXTRACT', 'TO_CHAR',
  'TO_DATE', 'TO_NUMBER', 'STRING_AGG', 'ARRAY_AGG', 'JSON_AGG', 'ROW_NUMBER',
  'RANK', 'DENSE_RANK', 'FIRST_VALUE', 'LAST_VALUE', 'LAG', 'LEAD',
])

// SQL operators
const SQL_OPERATORS = new Set(['=', '<', '>', '<=', '>=', '<>', '!=', '+', '-', '*', '/', '%', '||'])

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

// Tokenize SQL query
function tokenize(sql: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < sql.length) {
    // Skip whitespace but preserve it
    if (/\s/.test(sql[i])) {
      let whitespace = ''
      while (i < sql.length && /\s/.test(sql[i])) {
        whitespace += sql[i]
        i++
      }
      tokens.push({ type: 'identifier', value: whitespace })
      continue
    }

    // Single-line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let comment = '--'
      i += 2
      while (i < sql.length && sql[i] !== '\n') {
        comment += sql[i]
        i++
      }
      tokens.push({ type: 'comment', value: comment })
      continue
    }

    // Multi-line comment
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let comment = '/*'
      i += 2
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
        comment += sql[i]
        i++
      }
      if (i < sql.length) {
        comment += '*/'
        i += 2
      }
      tokens.push({ type: 'comment', value: comment })
      continue
    }

    // String literal (single quotes)
    if (sql[i] === "'") {
      let str = "'"
      i++
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          str += "''"
          i += 2
        } else if (sql[i] === "'") {
          str += "'"
          i++
          break
        } else {
          str += sql[i]
          i++
        }
      }
      tokens.push({ type: 'string', value: str })
      continue
    }

    // Number
    if (/\d/.test(sql[i]) || (sql[i] === '.' && /\d/.test(sql[i + 1]))) {
      let num = ''
      while (i < sql.length && /[\d.]/.test(sql[i])) {
        num += sql[i]
        i++
      }
      tokens.push({ type: 'number', value: num })
      continue
    }

    // Operators
    const twoCharOp = sql.slice(i, i + 2)
    if (SQL_OPERATORS.has(twoCharOp)) {
      tokens.push({ type: 'operator', value: twoCharOp })
      i += 2
      continue
    }
    if (SQL_OPERATORS.has(sql[i])) {
      tokens.push({ type: 'operator', value: sql[i] })
      i++
      continue
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(sql[i])) {
      let word = ''
      while (i < sql.length && /[a-zA-Z0-9_]/.test(sql[i])) {
        word += sql[i]
        i++
      }
      const upperWord = word.toUpperCase()
      if (SQL_KEYWORDS.has(upperWord)) {
        tokens.push({ type: 'keyword', value: word })
      } else if (SQL_FUNCTIONS.has(upperWord)) {
        tokens.push({ type: 'function', value: word })
      } else {
        tokens.push({ type: 'identifier', value: word })
      }
      continue
    }

    // Other characters (punctuation, etc.)
    tokens.push({ type: 'identifier', value: sql[i] })
    i++
  }

  return tokens
}

// Escape HTML entities
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Generate highlighted HTML from tokens
function highlightTokens(tokens: Token[]): string {
  return tokens.map(token => {
    const escaped = escapeHtml(token.value)
    switch (token.type) {
      case 'keyword':
        return `<span class="sql-keyword">${escaped}</span>`
      case 'function':
        return `<span class="sql-function">${escaped}</span>`
      case 'string':
        return `<span class="sql-string">${escaped}</span>`
      case 'number':
        return `<span class="sql-number">${escaped}</span>`
      case 'comment':
        return `<span class="sql-comment">${escaped}</span>`
      case 'operator':
        return `<span class="sql-operator">${escaped}</span>`
      default:
        return escaped
    }
  }).join('')
}

// Check if cursor is inside a string or comment
function isInsideStringOrComment(sql: string, cursorPos: number): boolean {
  let inString = false
  let inSingleLineComment = false
  let inMultiLineComment = false

  for (let i = 0; i < cursorPos && i < sql.length; i++) {
    // Check for newline ending single-line comment
    if (inSingleLineComment && sql[i] === '\n') {
      inSingleLineComment = false
      continue
    }

    if (inSingleLineComment) continue

    // Check for multi-line comment end
    if (inMultiLineComment && sql[i] === '*' && sql[i + 1] === '/') {
      inMultiLineComment = false
      i++ // Skip the '/'
      continue
    }

    if (inMultiLineComment) continue

    // Check for string
    if (sql[i] === "'" && !inString) {
      inString = true
      continue
    }

    if (sql[i] === "'" && inString) {
      // Check for escaped quote
      if (sql[i + 1] === "'") {
        i++ // Skip the escaped quote
        continue
      }
      inString = false
      continue
    }

    if (inString) continue

    // Check for single-line comment start
    if (sql[i] === '-' && sql[i + 1] === '-') {
      inSingleLineComment = true
      i++ // Skip the second '-'
      continue
    }

    // Check for multi-line comment start
    if (sql[i] === '/' && sql[i + 1] === '*') {
      inMultiLineComment = true
      i++ // Skip the '*'
      continue
    }
  }

  return inString || inSingleLineComment || inMultiLineComment
}

// Get the word being typed at cursor position
function getWordAtCursor(sql: string, cursorPos: number): { word: string; start: number; afterDot: boolean; tableName: string | null } {
  let start = cursorPos
  let afterDot = false
  let tableName: string | null = null

  // Find the start of the current word
  while (start > 0 && /[a-zA-Z0-9_]/.test(sql[start - 1])) {
    start--
  }

  const word = sql.slice(start, cursorPos)

  // Check if there's a dot before the word
  if (start > 0 && sql[start - 1] === '.') {
    afterDot = true
    // Find the table name before the dot
    let tableEnd = start - 1
    let tableStart = tableEnd
    while (tableStart > 0 && /[a-zA-Z0-9_]/.test(sql[tableStart - 1])) {
      tableStart--
    }
    tableName = sql.slice(tableStart, tableEnd)
  }

  return { word, start, afterDot, tableName }
}

// Get context (what keyword came before)
function getContext(sql: string, cursorPos: number): 'from' | 'join' | 'select' | 'where' | 'general' {
  const textBefore = sql.slice(0, cursorPos).toUpperCase()

  // Find the last keyword
  const fromIndex = textBefore.lastIndexOf('FROM')
  const joinIndex = Math.max(
    textBefore.lastIndexOf('JOIN'),
    textBefore.lastIndexOf('LEFT'),
    textBefore.lastIndexOf('RIGHT'),
    textBefore.lastIndexOf('INNER'),
    textBefore.lastIndexOf('OUTER')
  )
  const selectIndex = textBefore.lastIndexOf('SELECT')
  const whereIndex = textBefore.lastIndexOf('WHERE')

  const maxIndex = Math.max(fromIndex, joinIndex, selectIndex, whereIndex)

  if (maxIndex === -1) return 'general'
  if (maxIndex === fromIndex) return 'from'
  if (maxIndex === joinIndex) return 'join'
  if (maxIndex === selectIndex) return 'select'
  if (maxIndex === whereIndex) return 'where'

  return 'general'
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
