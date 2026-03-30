import { execSync } from 'child_process'
import type { Finding, TestModule, TestResult, RunOptions } from '../types'

// ---------------------------------------------------------------------------
// Internal types for npm audit JSON output
// ---------------------------------------------------------------------------

interface NpmAuditVulnerability {
  readonly name: string
  readonly severity: string
  readonly title?: string
  readonly url?: string
  readonly fixAvailable?:
    | boolean
    | { readonly name: string; readonly version: string }
  readonly via?: ReadonlyArray<
    { readonly title?: string; readonly url?: string } | string
  >
}

interface NpmAuditMetadataVulnerabilities {
  readonly critical?: number
  readonly high?: number
  readonly moderate?: number
  readonly low?: number
  readonly info?: number
  readonly total?: number
}

interface NpmAuditOutput {
  readonly vulnerabilities?: Record<string, NpmAuditVulnerability>
  readonly metadata?: {
    readonly vulnerabilities?: NpmAuditMetadataVulnerabilities
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type NpmSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'info'
import type { Severity } from '../types'

function mapSeverity(npmSeverity: string): Severity {
  const normalised = npmSeverity.toLowerCase() as NpmSeverity
  const mapping: Record<NpmSeverity, Severity> = {
    critical: 'CRITICAL',
    high: 'HIGH',
    moderate: 'MEDIUM',
    low: 'LOW',
    info: 'INFO',
  }
  return mapping[normalised] ?? 'INFO'
}

function resolveFixInfo(
  fixAvailable: NpmAuditVulnerability['fixAvailable'],
): string {
  if (typeof fixAvailable === 'object' && fixAvailable !== null) {
    return `Update to ${fixAvailable.name}@${fixAvailable.version}`
  }
  if (fixAvailable === true) {
    return 'Run npm audit fix'
  }
  return 'No automatic fix available'
}

function resolveTitle(vuln: NpmAuditVulnerability): string {
  if (vuln.title) return vuln.title
  // Fall back to titles embedded in `via` advisories
  if (Array.isArray(vuln.via)) {
    for (const via of vuln.via) {
      if (typeof via === 'object' && via.title) {
        return via.title
      }
    }
  }
  return `Vulnerability in ${vuln.name}`
}

function resolveUrl(vuln: NpmAuditVulnerability): string {
  if (vuln.url) return vuln.url
  if (Array.isArray(vuln.via)) {
    for (const via of vuln.via) {
      if (typeof via === 'object' && via.url) {
        return via.url
      }
    }
  }
  return 'https://www.npmjs.com/advisories'
}

function buildFinding(id: string, vuln: NpmAuditVulnerability): Finding {
  const severity = mapSeverity(vuln.severity)
  const title = resolveTitle(vuln)
  const advisoryUrl = resolveUrl(vuln)
  const fixInfo = resolveFixInfo(vuln.fixAvailable)

  return {
    id,
    severity,
    category: 'Dependency Vulnerability',
    title: `[${vuln.name}] ${title}`,
    location: 'package.json',
    description: `Package "${vuln.name}" has a ${vuln.severity}-severity vulnerability: ${title}. Advisory: ${advisoryUrl}`,
    proofOfConcept: `npm audit reports ${vuln.severity} vulnerability in ${vuln.name}`,
    impact: `Dependency vulnerability (${vuln.severity}) may expose the application to known exploits`,
    remediation: fixInfo,
  }
}

// ---------------------------------------------------------------------------
// Audit runners
// ---------------------------------------------------------------------------

interface AuditResult {
  readonly findings: readonly Finding[]
  readonly passCount: number
}

function runNpmAudit(projectRoot: string): AuditResult {
  const raw = execSync('npm audit --json 2>/dev/null || true', {
    cwd: projectRoot,
    maxBuffer: 10 * 1024 * 1024, // 10 MB
    encoding: 'utf8',
  })

  const parsed: unknown = JSON.parse(raw)
  const audit = parsed as NpmAuditOutput

  const findings: Finding[] = []

  // Extract per-package vulnerability findings
  if (audit.vulnerabilities && typeof audit.vulnerabilities === 'object') {
    let findingIndex = 0
    for (const [pkgName, vuln] of Object.entries(audit.vulnerabilities)) {
      const id = `DEP-${String(findingIndex + 1).padStart(3, '0')}`
      findings.push(buildFinding(id, { ...vuln, name: vuln.name ?? pkgName }))
      findingIndex += 1
    }
  }

  // Calculate passCount: each severity bucket that has 0 vulns = +1
  let passCount = 0
  const meta = audit.metadata?.vulnerabilities
  if (meta) {
    const severityBuckets: ReadonlyArray<
      keyof NpmAuditMetadataVulnerabilities
    > = ['critical', 'high', 'moderate', 'low', 'info']
    for (const bucket of severityBuckets) {
      const count = meta[bucket] ?? 0
      if (count === 0) {
        passCount += 1
      }
    }
  }

  return { findings, passCount }
}

function runBunFallback(projectRoot: string): AuditResult {
  execSync('bun pm ls 2>/dev/null || true', {
    cwd: projectRoot,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf8',
  })

  // Bun does not provide vulnerability data; emit an INFO finding to surface this
  const infoFinding: Finding = {
    id: 'DEP-FALLBACK-001',
    severity: 'INFO',
    category: 'Dependency Vulnerability',
    title: 'npm audit unavailable — limited dependency data',
    location: 'package.json',
    description:
      'npm audit could not be executed. Fell back to bun pm ls, which lists packages but does not report known vulnerabilities. A full npm audit is recommended.',
    proofOfConcept: 'npm audit command failed; bun pm ls used as fallback',
    impact:
      'Unknown — dependency vulnerabilities cannot be assessed without npm audit',
    remediation: 'Install Node.js/npm and run: npm audit',
  }

  return { findings: [infoFinding], passCount: 0 }
}

// ---------------------------------------------------------------------------
// TestModule export
// ---------------------------------------------------------------------------

export const dependencyAudit: TestModule = {
  name: 'dependency-audit',
  description:
    'Audits npm/bun dependencies for known vulnerabilities using npm audit, mapping severity levels to CRITICAL/HIGH/MEDIUM/LOW findings.',

  async run(options: RunOptions): Promise<TestResult> {
    const start = Date.now()
    const { projectRoot } = options

    let result: AuditResult

    try {
      result = runNpmAudit(projectRoot)
    } catch {
      // npm audit failed (e.g. npm not installed) — fall back to bun
      try {
        result = runBunFallback(projectRoot)
      } catch {
        // Both tools failed; return a single INFO finding
        const fallbackFinding: Finding = {
          id: 'DEP-ERR-001',
          severity: 'INFO',
          category: 'Dependency Vulnerability',
          title: 'Dependency audit tools unavailable',
          location: 'package.json',
          description:
            'Neither npm audit nor bun pm ls could be executed. Dependency vulnerability status is unknown.',
          proofOfConcept: 'Both npm audit and bun pm ls failed',
          impact: 'Unknown — dependency vulnerabilities cannot be assessed',
          remediation: 'Install Node.js/npm and run: npm audit',
        }
        result = { findings: [fallbackFinding], passCount: 0 }
      }
    }

    return {
      category: 'Dependency Audit',
      findings: result.findings,
      passCount: result.passCount,
      duration: Date.now() - start,
    }
  },
}
