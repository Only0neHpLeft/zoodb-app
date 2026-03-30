import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { Finding, TestModule, TestResult, RunOptions } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapabilityPermission {
  readonly identifier: string
  readonly allow?: ReadonlyArray<{ readonly url: string }>
}

type RawPermission = string | CapabilityPermission

interface CapabilityFile {
  readonly permissions?: readonly RawPermission[]
}

// ---------------------------------------------------------------------------
// Risky permission definitions
// ---------------------------------------------------------------------------

interface RiskyCapabilityPermission {
  readonly id: string
  readonly identifier: string
  readonly severity: Finding['severity']
  readonly title: string
  readonly description: string
  readonly impact: string
  readonly remediation: string
}

const RISKY_CAPABILITY_PERMISSIONS: readonly RiskyCapabilityPermission[] = [
  {
    id: 'TAURI-PERM-001',
    identifier: 'fs:allow-home-write-recursive',
    severity: 'HIGH',
    title: 'Recursive write access to entire home directory',
    description:
      'Permission "fs:allow-home-write-recursive" grants the app write access to every file and folder under the user\'s home directory.',
    impact:
      'A compromised renderer or malicious script injection could overwrite shell rc files, SSH keys, or other sensitive configuration, enabling persistent code execution.',
    remediation:
      'Remove fs:allow-home-write-recursive and replace with scoped write permissions targeting only the specific directories the app actually needs.',
  },
  {
    id: 'TAURI-PERM-002',
    identifier: 'fs:allow-desktop-write-recursive',
    severity: 'MEDIUM',
    title: 'Recursive write access to Desktop directory',
    description:
      'Permission "fs:allow-desktop-write-recursive" grants the app write access to the user\'s entire Desktop.',
    impact:
      'Malicious content could be placed on the Desktop where users are likely to execute it.',
    remediation:
      'Scope filesystem write permissions to a specific subdirectory created by the app rather than granting access to the entire Desktop.',
  },
  {
    id: 'TAURI-PERM-003',
    identifier: 'fs:allow-document-write-recursive',
    severity: 'MEDIUM',
    title: 'Recursive write access to Documents directory',
    description:
      'Permission "fs:allow-document-write-recursive" grants the app write access to the user\'s entire Documents folder.',
    impact:
      'User documents could be overwritten or ransomware-style file manipulation could occur if the app is compromised.',
    remediation:
      'Restrict write access to an app-specific subdirectory inside Documents rather than the entire Documents folder.',
  },
  {
    id: 'TAURI-PERM-004',
    identifier: 'fs:allow-download-write-recursive',
    severity: 'LOW',
    title: 'Recursive write access to Downloads directory',
    description:
      'Permission "fs:allow-download-write-recursive" grants the app write access to the user\'s entire Downloads folder.',
    impact:
      'Existing downloaded files could be overwritten or replaced with malicious versions.',
    remediation:
      'Limit write access to an app-specific folder rather than the entire Downloads directory.',
  },
  {
    id: 'TAURI-PERM-005',
    identifier: 'process:default',
    severity: 'MEDIUM',
    title: 'process:default permission exposes process control APIs',
    description:
      'The "process:default" permission exposes Tauri\'s process control API (exit, restart) to the frontend.',
    impact:
      'A cross-site scripting attack or malicious IPC call could cause the app to exit or restart unexpectedly, creating a denial-of-service vector.',
    remediation:
      'Grant only the specific process sub-permissions actually needed (e.g. process:allow-exit) and ensure IPC calls are authenticated.',
  },
] as const

interface RiskyEntitlement {
  readonly id: string
  readonly key: string
  readonly severity: Finding['severity']
  readonly title: string
  readonly description: string
  readonly impact: string
  readonly remediation: string
}

const RISKY_ENTITLEMENTS: readonly RiskyEntitlement[] = [
  {
    id: 'TAURI-ENT-001',
    key: 'com.apple.security.cs.allow-unsigned-executable-memory',
    severity: 'MEDIUM',
    title: 'Unsigned executable memory allowed',
    description:
      'The entitlement com.apple.security.cs.allow-unsigned-executable-memory disables the hardened-runtime restriction that prevents mapping writable and executable memory simultaneously.',
    impact:
      'Weakens macOS memory protections, making the process more susceptible to certain memory-corruption exploit techniques (e.g. JIT spraying).',
    remediation:
      'Remove this entitlement unless strictly required. If JIT is needed, prefer com.apple.security.cs.allow-jit which is more narrowly scoped.',
  },
  {
    id: 'TAURI-ENT-002',
    key: 'com.apple.security.cs.disable-library-validation',
    severity: 'MEDIUM',
    title: 'Library validation disabled',
    description:
      "The entitlement com.apple.security.cs.disable-library-validation allows the app to load dynamic libraries that are not signed by Apple or the app's certificate.",
    impact:
      'An attacker who can write a malicious dylib to a location on the library search path can inject code into the app process.',
    remediation:
      'Remove this entitlement. If third-party frameworks are required, ensure they are properly code-signed and use com.apple.security.cs.allow-dyld-environment-variables only when absolutely necessary.',
  },
  {
    id: 'TAURI-ENT-003',
    key: 'com.apple.security.cs.allow-jit',
    severity: 'LOW',
    title: 'JIT compilation allowed',
    description:
      'The entitlement com.apple.security.cs.allow-jit permits the app to create memory that is simultaneously writable and executable for JIT compilation purposes.',
    impact:
      'Slightly weakens the W^X memory protection model, though less broadly than allow-unsigned-executable-memory.',
    remediation:
      'Confirm JIT is genuinely required (e.g. by a JavaScript engine). If the app does not use JIT, remove this entitlement.',
  },
] as const

interface RiskyCargoFeature {
  readonly id: string
  readonly pattern: RegExp
  readonly severity: Finding['severity']
  readonly title: string
  readonly description: string
  readonly impact: string
  readonly remediation: string
}

const RISKY_CARGO_FEATURES: readonly RiskyCargoFeature[] = [
  {
    id: 'TAURI-CARGO-001',
    pattern:
      /tauri-plugin-http\s*=\s*\{[^}]*features\s*=\s*\[[^\]]*"unsafe-headers"[^\]]*\]/,
    severity: 'MEDIUM',
    title: 'tauri-plugin-http built with "unsafe-headers" feature',
    description:
      'The "unsafe-headers" feature on tauri-plugin-http allows the frontend to set security-sensitive HTTP headers (e.g. Host, Origin, Cookie) that browsers normally forbid.',
    impact:
      'An XSS vulnerability or malicious IPC call could craft requests with forged headers, potentially bypassing CORS policies or server-side origin checks.',
    remediation:
      'Remove "unsafe-headers" from tauri-plugin-http features unless there is a documented, unavoidable requirement. Validate all outgoing HTTP requests server-side.',
  },
  {
    id: 'TAURI-CARGO-002',
    pattern: /tauri\s*=\s*\{[^}]*features\s*=\s*\[[^\]]*"devtools"[^\]]*\]/,
    severity: 'LOW',
    title: 'Tauri built with "devtools" feature enabled',
    description:
      'The "devtools" feature compiles DevTools support into the production binary, allowing the developer tools panel to be opened in a release build.',
    impact:
      'Exposes application internals (JavaScript source, network requests, DOM) to anyone with local access to the machine, and may facilitate reverse engineering.',
    remediation:
      'Gate the "devtools" feature behind a dev-only Cargo profile or feature flag so it is excluded from release builds.',
  },
] as const

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function resolveIdentifier(permission: RawPermission): string {
  if (typeof permission === 'string') {
    return permission
  }
  return permission.identifier
}

function hasWildcardUrl(permission: RawPermission): boolean {
  if (typeof permission === 'string') {
    return false
  }
  const allowList = permission.allow ?? []
  return allowList.some((entry) => entry.url.includes('*'))
}

function entitlementIsTrue(
  plistContent: string,
  entitlementKey: string,
): boolean {
  // Match <key>entitlement.key</key> followed (possibly with whitespace) by <true/>
  const escapedKey = entitlementKey.replace(/\./g, '\\.').replace(/\//g, '\\/')
  const pattern = new RegExp(`<key>${escapedKey}</key>\\s*<true\\s*\\/>`)
  return pattern.test(plistContent)
}

function makeFinding(
  base: Omit<Finding, 'location' | 'proofOfConcept'>,
  location: string,
  proofOfConcept: string,
): Finding {
  return { ...base, location, proofOfConcept }
}

// ---------------------------------------------------------------------------
// Individual analysis functions
// ---------------------------------------------------------------------------

function analyzeCapabilities(capabilitiesPath: string): readonly Finding[] {
  if (!existsSync(capabilitiesPath)) {
    return []
  }

  const raw = readFileSync(capabilitiesPath, 'utf-8')
  let parsed: CapabilityFile
  try {
    parsed = JSON.parse(raw) as CapabilityFile
  } catch {
    return []
  }

  const permissions = parsed.permissions ?? []
  const findings: Finding[] = []

  for (const risky of RISKY_CAPABILITY_PERMISSIONS) {
    const { identifier } = risky
    const found = permissions.some((p) => resolveIdentifier(p) === identifier)

    if (found) {
      findings.push(
        makeFinding(
          {
            id: risky.id,
            severity: risky.severity,
            category: 'Tauri Permissions',
            title: risky.title,
            description: risky.description,
            impact: risky.impact,
            remediation: risky.remediation,
          },
          capabilitiesPath,
          `"${identifier}" is listed in the permissions array of ${capabilitiesPath}`,
        ),
      )
    }
  }

  // Check for wildcard URLs in HTTP allow list
  const wildcardPermission = permissions.find(hasWildcardUrl)
  if (wildcardPermission !== undefined) {
    const urls =
      typeof wildcardPermission !== 'string'
        ? ((wildcardPermission as CapabilityPermission).allow ?? [])
        : []
    const wildcardUrls = urls
      .filter((e) => e.url.includes('*'))
      .map((e) => e.url)
      .join(', ')

    findings.push(
      makeFinding(
        {
          id: 'TAURI-PERM-006',
          severity: 'LOW',
          category: 'Tauri Permissions',
          title: 'HTTP allow list contains wildcard URL patterns',
          description:
            'One or more entries in the HTTP plugin allow list use wildcard characters, broadening the set of permitted outbound request targets beyond what is explicitly needed.',
          impact:
            'If a wildcard pattern is too broad (e.g. https://*.example.com/*), a server-side redirect or attacker-controlled subdomain could be used to exfiltrate data.',
          remediation:
            'Replace wildcard URL patterns with explicit, fully-qualified URLs wherever possible. If wildcards are required, ensure the domain scope is as narrow as possible.',
        },
        capabilitiesPath,
        `Wildcard URL(s) found in HTTP allow list: ${wildcardUrls}`,
      ),
    )
  }

  return findings
}

function analyzeEntitlements(entitlementsPath: string): readonly Finding[] {
  if (!existsSync(entitlementsPath)) {
    return []
  }

  const content = readFileSync(entitlementsPath, 'utf-8')
  const findings: Finding[] = []

  for (const risky of RISKY_ENTITLEMENTS) {
    if (entitlementIsTrue(content, risky.key)) {
      findings.push(
        makeFinding(
          {
            id: risky.id,
            severity: risky.severity,
            category: 'Tauri Permissions',
            title: risky.title,
            description: risky.description,
            impact: risky.impact,
            remediation: risky.remediation,
          },
          entitlementsPath,
          `<key>${risky.key}</key> is set to <true/> in ${entitlementsPath}`,
        ),
      )
    }
  }

  return findings
}

function analyzeCargoFeatures(cargoPath: string): readonly Finding[] {
  if (!existsSync(cargoPath)) {
    return []
  }

  const content = readFileSync(cargoPath, 'utf-8')
  const findings: Finding[] = []

  for (const risky of RISKY_CARGO_FEATURES) {
    if (risky.pattern.test(content)) {
      findings.push(
        makeFinding(
          {
            id: risky.id,
            severity: risky.severity,
            category: 'Tauri Permissions',
            title: risky.title,
            description: risky.description,
            impact: risky.impact,
            remediation: risky.remediation,
          },
          cargoPath,
          `Pattern matched in ${cargoPath}: ${risky.pattern.toString()}`,
        ),
      )
    }
  }

  return findings
}

// ---------------------------------------------------------------------------
// Total check count
// ---------------------------------------------------------------------------

// Capability checks: 5 named permissions + 1 HTTP wildcard check = 6
// Entitlement checks: 3
// Cargo checks: 2
// Total: 11
const TOTAL_CHECKS = 11

// ---------------------------------------------------------------------------
// TestModule export
// ---------------------------------------------------------------------------

export const tauriPermissions: TestModule = {
  name: 'tauri-permissions',
  description:
    'Analyses Tauri capabilities, macOS entitlements, and Cargo features for overly broad or risky permissions that could be exploited by a compromised renderer or malicious input.',

  run: async (options: RunOptions): Promise<TestResult> => {
    const start = Date.now()

    const capabilitiesPath = join(
      options.projectRoot,
      'src-tauri',
      'capabilities',
      'default.json',
    )
    const entitlementsPath = join(
      options.projectRoot,
      'src-tauri',
      'entitlements.plist',
    )
    const cargoPath = join(options.projectRoot, 'src-tauri', 'Cargo.toml')

    const findings: readonly Finding[] = [
      ...analyzeCapabilities(capabilitiesPath),
      ...analyzeEntitlements(entitlementsPath),
      ...analyzeCargoFeatures(cargoPath),
    ]

    const passCount = TOTAL_CHECKS - findings.length

    return {
      category: 'Tauri Permissions',
      findings,
      passCount,
      duration: Date.now() - start,
    }
  },
}
