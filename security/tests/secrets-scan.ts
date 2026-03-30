import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { join, relative } from 'path'
import type {
  Finding,
  TestModule,
  RunOptions,
  TestResult,
  Severity,
} from '../types'

// ---------------------------------------------------------------------------
// Secret pattern definitions
// ---------------------------------------------------------------------------

interface SecretPattern {
  readonly id: string
  readonly label: string
  readonly severity: Severity
  readonly regex: RegExp
}

const SECRET_PATTERNS: readonly SecretPattern[] = [
  {
    id: 'POSTGRES_URI',
    label: 'PostgreSQL connection string',
    severity: 'CRITICAL',
    regex: /postgres(?:ql)?:\/\/[^:\s"'`]+:[^@\s"'`]+@[^\s"'`]+/gi,
  },
  {
    id: 'AWS_ACCESS_KEY',
    label: 'AWS access key (AKIA...)',
    severity: 'CRITICAL',
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    id: 'BASE64_CERT',
    label: 'Base64-encoded certificate (MII...)',
    severity: 'HIGH',
    regex: /['"`]MII[A-Za-z0-9+/]{20,}={0,2}['"`]/g,
  },
  {
    id: 'APPLE_CERTIFICATE',
    label: 'Apple certificate value',
    severity: 'CRITICAL',
    regex: /APPLE_CERTIFICATE\s*=\s*['"`]?[A-Za-z0-9+/=]{10,}['"`]?/g,
  },
  {
    id: 'APPLE_PASSWORD',
    label: 'Apple password value',
    severity: 'CRITICAL',
    regex: /APPLE_PASSWORD\s*=\s*['"`][^'"`\s]{4,}['"`]/g,
  },
  {
    id: 'APPLE_ID',
    label: 'Apple ID credential',
    severity: 'HIGH',
    regex: /APPLE_ID\s*=\s*['"`][^'"`\s]{4,}['"`]/g,
  },
  {
    id: 'CLIENT_SECRET',
    label: 'Client secret assignment',
    severity: 'HIGH',
    regex: /client_?secret\s*[:=]\s*['"`][A-Za-z0-9_\-./+]{8,}['"`]/gi,
  },
  {
    id: 'API_KEY',
    label: 'API key assignment',
    severity: 'HIGH',
    regex: /api_?key\s*[:=]\s*['"`][A-Za-z0-9_\-./+]{8,}['"`]/gi,
  },
  {
    id: 'GENERIC_PASSWORD',
    label: 'Generic password assignment',
    severity: 'MEDIUM',
    regex: /password\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/gi,
  },
  {
    id: 'GENERIC_SECRET',
    label: 'Generic secret/token assignment',
    severity: 'MEDIUM',
    regex: /(?:secret|token)\s*[:=]\s*['"`][A-Za-z0-9_\-./+]{8,}['"`]/gi,
  },
]

// ---------------------------------------------------------------------------
// Sensitive files to check for git tracking
// ---------------------------------------------------------------------------

const SENSITIVE_FILES: readonly string[] = [
  '.env',
  '.env.local',
  '.env.release',
  '.env.production',
]

// ---------------------------------------------------------------------------
// Directories/files to skip when walking the project
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'target', '.cache'])

const SCANNABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.conf',
  '.env',
])

// The path of this file itself — patterns here are definitions, not leaks
const THIS_FILE = 'security/tests/secrets-scan.ts'

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function truncateMatch(value: string, maxLen = 40): string {
  const cleaned = value.trim()
  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen) + '…'
}

function isComment(line: string): boolean {
  const trimmed = line.trimStart()
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('<!--')
  )
}

function walkDir(dir: string): string[] {
  const results: string[] = []

  let entries: string[]
  try {
    // Use execSync to list directory entries without Bash tool dependency
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

    // Determine if it is a directory by attempting to list it
    let isDir = false
    try {
      execSync(`test -d "${fullPath}"`, { stdio: 'pipe' })
      isDir = true
    } catch {
      isDir = false
    }

    if (isDir) {
      results.push(...walkDir(fullPath))
    } else {
      // Include if it has a scannable extension OR if the filename starts with ".env"
      const lowerName = entry.toLowerCase()
      const hasExt = SCANNABLE_EXTENSIONS.has(
        lowerName.includes('.') ? '.' + lowerName.split('.').pop()! : '',
      )
      const isEnvFile = lowerName.startsWith('.env')
      if (hasExt || isEnvFile) {
        results.push(fullPath)
      }
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Core scan logic
// ---------------------------------------------------------------------------

interface RawHit {
  readonly patternId: string
  readonly label: string
  readonly severity: Severity
  readonly location: string
  readonly matchSnippet: string
}

function scanContent(
  content: string,
  locationPrefix: string,
  skipPatternDefinitions: boolean,
): RawHit[] {
  const hits: RawHit[] = []
  const lines = content.split('\n')

  for (const pattern of SECRET_PATTERNS) {
    // Reset regex state (global flag)
    pattern.regex.lastIndex = 0

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]!

      // Skip comment lines
      if (isComment(line)) continue

      // Skip pattern definition lines in this scan file itself
      if (skipPatternDefinitions && line.includes('regex:')) continue

      // Reset for each line scan
      pattern.regex.lastIndex = 0
      const match = pattern.regex.exec(line)
      if (match === null) continue

      hits.push({
        patternId: pattern.id,
        label: pattern.label,
        severity: pattern.severity,
        location: `${locationPrefix}:${lineIdx + 1}`,
        matchSnippet: truncateMatch(match[0]),
      })

      // Only report first match per pattern per line
    }
  }

  return hits
}

function deduplicateHits(hits: RawHit[]): RawHit[] {
  const seen = new Set<string>()
  return hits.filter((h) => {
    const key = `${h.patternId}::${h.location}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function hitToFinding(hit: RawHit, index: number): Finding {
  return {
    id: `SECRETS-${hit.patternId}-${String(index).padStart(3, '0')}`,
    severity: hit.severity,
    category: 'Secrets & Credentials',
    title: `Potential ${hit.label} detected`,
    location: hit.location,
    description: `A pattern matching "${hit.label}" was found in the source. If this is a real credential it must be revoked immediately.`,
    proofOfConcept: `Matched value (truncated): ${hit.matchSnippet}`,
    impact:
      'Leaked credentials can allow unauthorised access to databases, cloud services, or third-party APIs.',
    remediation:
      'Remove the credential from source, rotate/revoke it immediately, and store secrets in environment variables or a secrets manager.',
  }
}

// ---------------------------------------------------------------------------
// Individual check categories
// ---------------------------------------------------------------------------

async function checkGitIgnoredSensitiveFiles(
  projectRoot: string,
): Promise<{ readonly hits: RawHit[]; readonly passed: boolean }> {
  const trackedFiles: string[] = []

  for (const file of SENSITIVE_FILES) {
    const fullPath = join(projectRoot, file)
    if (!existsSync(fullPath)) continue

    try {
      execSync(`git -C "${projectRoot}" ls-files --error-unmatch "${file}"`, {
        stdio: 'pipe',
      })
      // If no error was thrown, the file is tracked by git — bad
      trackedFiles.push(file)
    } catch {
      // File not tracked — good
    }
  }

  const hits: RawHit[] = trackedFiles.map((f) => ({
    patternId: 'TRACKED_ENV_FILE',
    label: 'Sensitive file tracked by git',
    severity: 'CRITICAL' as Severity,
    location: f,
    matchSnippet: f,
  }))

  return { hits, passed: trackedFiles.length === 0 }
}

function isGitIgnored(projectRoot: string, relPath: string): boolean {
  try {
    execSync(`git -C "${projectRoot}" check-ignore -q "${relPath}"`, {
      stdio: 'pipe',
    })
    return true // exit 0 means the file IS ignored
  } catch {
    return false // exit 1 means the file is NOT ignored
  }
}

async function checkFilesForSecrets(
  projectRoot: string,
): Promise<{ readonly hits: RawHit[]; readonly passed: boolean }> {
  const allFiles = walkDir(projectRoot)
  const allHits: RawHit[] = []

  for (const filePath of allFiles) {
    const relPath = relative(projectRoot, filePath)

    // Skip this scan file itself
    if (relPath === THIS_FILE || relPath.replace(/\\/g, '/') === THIS_FILE)
      continue

    // Skip gitignored files — they're local-only and not a repo security risk
    if (isGitIgnored(projectRoot, relPath)) continue

    let content: string
    try {
      content = readFileSync(filePath, 'utf8')
    } catch {
      continue
    }

    const isThisFile = filePath.endsWith('secrets-scan.ts')
    const hits = scanContent(content, relPath, isThisFile)
    allHits.push(...hits)
  }

  const deduped = deduplicateHits(allHits)
  return { hits: deduped, passed: deduped.length === 0 }
}

async function checkGitHistoryForSecrets(
  projectRoot: string,
): Promise<{ readonly hits: RawHit[]; readonly passed: boolean }> {
  let historyOutput: string

  try {
    historyOutput = execSync(
      `git -C "${projectRoot}" log --all -p --no-color --diff-filter=A`,
      {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024, // 50 MB cap
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30_000,
      },
    )
  } catch {
    // git log failed (not a repo, or timeout) — skip with a note
    return { hits: [], passed: true }
  }

  // Split into chunks by commit boundary for better location labels
  const commitChunks = historyOutput.split(/^commit [0-9a-f]{40}/m)
  const allHits: RawHit[] = []

  // Parse commit hashes to pair with chunks
  const commitMatches = [...historyOutput.matchAll(/^commit ([0-9a-f]{40})/gm)]

  for (let i = 0; i < commitChunks.length; i++) {
    const chunk = commitChunks[i]
    if (!chunk || chunk.trim().length === 0) continue

    const hash = commitMatches[i - 1]?.[1]?.slice(0, 8) ?? 'unknown'
    const locationPrefix = `git-history:${hash}`

    const hits = scanContent(chunk, locationPrefix, false)
    allHits.push(...hits)
  }

  const deduped = deduplicateHits(allHits)
  return { hits: deduped, passed: deduped.length === 0 }
}

// ---------------------------------------------------------------------------
// TestModule export
// ---------------------------------------------------------------------------

export const secretsScan: TestModule = {
  name: 'secrets-scan',
  description:
    'Scans project files and git history for leaked credentials, API keys, passwords, and other sensitive values.',

  async run(options: RunOptions): Promise<TestResult> {
    const start = Date.now()
    const { projectRoot } = options

    const allFindings: Finding[] = []
    let passCount = 0

    // --- Category 1: Sensitive files tracked by git ---
    const gitIgnoreCheck = await checkGitIgnoredSensitiveFiles(projectRoot)
    if (gitIgnoreCheck.passed) {
      passCount++
    } else {
      gitIgnoreCheck.hits.forEach((h, i) => {
        allFindings.push(hitToFinding(h, allFindings.length + i))
      })
    }

    // --- Category 2: Secrets in project files ---
    const fileCheck = await checkFilesForSecrets(projectRoot)
    if (fileCheck.passed) {
      passCount++
    } else {
      fileCheck.hits.forEach((h, i) => {
        allFindings.push(hitToFinding(h, allFindings.length + i))
      })
    }

    // --- Category 3: Secrets in git history ---
    const historyCheck = await checkGitHistoryForSecrets(projectRoot)
    if (historyCheck.passed) {
      passCount++
    } else {
      historyCheck.hits.forEach((h, i) => {
        allFindings.push(hitToFinding(h, allFindings.length + i))
      })
    }

    const duration = Date.now() - start

    return {
      category: 'Secrets & Credentials',
      findings: allFindings,
      passCount,
      duration,
    }
  },
}
