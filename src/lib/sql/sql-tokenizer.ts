// SQL Tokenizer and Syntax Highlighting
// Extracted from sql-editor.tsx for better modularity

// SQL token types for syntax highlighting
export type TokenType = 'keyword' | 'function' | 'string' | 'number' | 'comment' | 'operator' | 'identifier'

export interface Token {
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
export const SQL_OPERATORS = new Set(['=', '<', '>', '<=', '>=', '<>', '!=', '+', '-', '*', '/', '%', '||'])

/**
 * Tokenize SQL query into syntax-highlighted tokens
 */
export function tokenize(sql: string): Token[] {
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

/**
 * Escape HTML entities for safe rendering
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Generate highlighted HTML from tokens
 */
export function highlightTokens(tokens: Token[]): string {
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

/**
 * Check if cursor is inside a string or comment
 */
export function isInsideStringOrComment(sql: string, cursorPos: number): boolean {
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

/**
 * Get the word being typed at cursor position
 */
export function getWordAtCursor(sql: string, cursorPos: number): {
  word: string
  start: number
  afterDot: boolean
  tableName: string | null
} {
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

/**
 * Get context (what keyword came before)
 */
export function getContext(sql: string, cursorPos: number): 'from' | 'join' | 'select' | 'where' | 'general' {
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
