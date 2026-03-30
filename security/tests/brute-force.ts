import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Finding, TestModule, RunOptions, TestResult } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLASSES_FILE = "convex/classes.ts";

const CODE_GEN_LOCATION = `${CLASSES_FILE}:6`;
const JOIN_CLASS_LOCATION = `${CLASSES_FILE}:42`;

/** 36-char alphabet (0-9, a-z) raised to the power of 6 code positions. */
const KEYSPACE = Math.pow(36, 6); // 2,176,782,336

const REQUEST_RATES_PER_SEC = [10, 100, 1_000] as const;

const RATE_LIMIT_PATTERNS = ["rateLimit", "rateLimiter", "throttle"];
const FAILED_ATTEMPT_LOG_PATTERNS = ["console.log", "console.warn", "log", "attempt"];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function readProjectFile(projectRoot: string, relativePath: string): string | null {
  const fullPath = join(projectRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return readFileSync(fullPath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Extract the body of a named exported mutation/function from TypeScript source.
 * Returns the raw text between the first `handler: async (ctx, args) => {`
 * block that follows the function name, up to its matching closing brace.
 */
function extractFunctionBody(source: string, functionName: string): string | null {
  const nameIndex = source.indexOf(`export const ${functionName}`);
  if (nameIndex === -1) return null;

  const handlerMarker = "handler: async (ctx, args) => {";
  const handlerIndex = source.indexOf(handlerMarker, nameIndex);
  if (handlerIndex === -1) return null;

  // Walk forward tracking brace depth to find the closing brace
  let depth = 0;
  let start = handlerIndex + handlerMarker.length - 1; // points at the opening `{`
  let end = -1;

  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") {
      depth++;
    } else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) return null;
  return source.slice(start, end + 1);
}

function formatBruteForceTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3_600) return `${(seconds / 60).toFixed(1)} minutes`;
  if (seconds < 86_400) return `${(seconds / 3_600).toFixed(1)} hours`;
  if (seconds < 86_400 * 365) return `${(seconds / 86_400).toFixed(1)} days`;
  return `${(seconds / (86_400 * 365)).toFixed(1)} years`;
}

function buildBruteForceTimeTable(): string {
  const lines = REQUEST_RATES_PER_SEC.map((rate) => {
    const avgSeconds = KEYSPACE / rate / 2; // average case: half keyspace
    return `  • At ${rate.toLocaleString()} req/s: ~${formatBruteForceTime(avgSeconds)} (average), ~${formatBruteForceTime(KEYSPACE / rate)} (worst case)`;
  });
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Check 1: Code generation security (PRNG quality)
// ---------------------------------------------------------------------------

interface CodeGenCheckResult {
  readonly usesMathRandom: boolean;
  readonly finding: Finding | null;
}

function checkCodeGenSecurity(source: string): CodeGenCheckResult {
  // Locate the generateClassCode function body
  const funcStart = source.indexOf("function generateClassCode()");
  if (funcStart === -1) {
    return { usesMathRandom: false, finding: null };
  }

  const braceOpen = source.indexOf("{", funcStart);
  const braceClose = source.indexOf("}", braceOpen);
  if (braceOpen === -1 || braceClose === -1) {
    return { usesMathRandom: false, finding: null };
  }

  const funcBody = source.slice(braceOpen, braceClose + 1);
  const usesMathRandom = funcBody.includes("Math.random()");

  if (!usesMathRandom) {
    return { usesMathRandom: false, finding: null };
  }

  const timeTable = buildBruteForceTimeTable();

  const finding: Finding = {
    id: "BRUTE-FORCE-001",
    severity: "MEDIUM",
    category: "Brute Force",
    title: "Class code generated with non-cryptographic PRNG (Math.random)",
    location: CODE_GEN_LOCATION,
    description:
      `generateClassCode() uses Math.random().toString(36).substring(2, 8).toUpperCase() ` +
      `to produce 6-character codes from a 36-character alphabet (0-9, A-Z). ` +
      `Math.random() is NOT cryptographically secure — its internal state can be predicted ` +
      `or biased depending on the JS engine. The total keyspace is 36^6 = ${KEYSPACE.toLocaleString()} codes.`,
    proofOfConcept:
      `Keyspace: 36^6 = ${KEYSPACE.toLocaleString()} possible codes.\n` +
      `Brute-force time estimates (no rate limiting):\n${timeTable}`,
    impact:
      "An attacker who can enumerate codes fast enough could join any class without an invitation. " +
      "At 1,000 requests/second with no rate limiting, the average class code is cracked in under 13 days.",
    remediation:
      "Use crypto.randomUUID().substring(0, 8) or a similar CSPRNG",
  };

  return { usesMathRandom: true, finding };
}

// ---------------------------------------------------------------------------
// Check 2: Rate limiting on joinClass
// ---------------------------------------------------------------------------

interface RateLimitCheckResult {
  readonly hasRateLimit: boolean;
  readonly hasFailedAttemptLog: boolean;
  readonly rateLimitFinding: Finding | null;
  readonly loggingFinding: Finding | null;
}

function checkJoinClassRateLimiting(source: string): RateLimitCheckResult {
  const body = extractFunctionBody(source, "joinClass");
  if (body === null) {
    return {
      hasRateLimit: false,
      hasFailedAttemptLog: false,
      rateLimitFinding: null,
      loggingFinding: null,
    };
  }

  // Check for rate limiting patterns
  const hasRateLimit = RATE_LIMIT_PATTERNS.some((pattern) => body.includes(pattern));

  // Check for failed attempt logging:
  // Must contain a log call AND some reference to "attempt" or "limit"
  const hasLogCall = body.includes("console.log") || body.includes("console.warn");
  const hasAttemptRef = body.includes("attempt") || body.includes("limit");
  const hasFailedAttemptLog = hasLogCall && hasAttemptRef;

  const rateLimitFinding: Finding | null = hasRateLimit
    ? null
    : {
        id: "BRUTE-FORCE-002",
        severity: "HIGH",
        category: "Brute Force",
        title: "No rate limiting on joinClass mutation",
        location: JOIN_CLASS_LOCATION,
        description:
          "The joinClass Convex mutation accepts unlimited requests per user per time window. " +
          "There is no counter, throttle, or backoff mechanism to slow down automated enumeration " +
          "of class codes. Any authenticated student account can attempt codes at the full " +
          "throughput permitted by the Convex platform.",
        proofOfConcept:
          "Inspected joinClass handler body — no calls to rateLimit, rateLimiter, or throttle found. " +
          "Failed attempts only produce an 'Invalid class code' error with no side effects.",
        impact:
          "A student with a valid account can automate joinClass calls to enumerate all 2,176,782,336 " +
          "possible codes and join any active class without the teacher's knowledge.",
        remediation:
          "Add rate limiting in Convex using a counter table: track failed attempts per userId per time window. After 5 failures in 1 minute, reject with a rate limit error.",
      };

  const loggingFinding: Finding | null = hasFailedAttemptLog
    ? null
    : {
        id: "BRUTE-FORCE-003",
        severity: "LOW",
        category: "Brute Force",
        title: "Failed joinClass attempts are not logged",
        location: JOIN_CLASS_LOCATION,
        description:
          "When a student provides an invalid class code, the joinClass mutation throws an error " +
          "but does not log the failed attempt. There is no audit trail of repeated failed " +
          "attempts that could alert administrators to a brute-force attack in progress.",
        proofOfConcept:
          "Inspected joinClass handler body — no console.log, console.warn, or logging statement " +
          "referencing failed attempts was found.",
        impact:
          "Without logging, a brute-force attack against class codes goes completely undetected " +
          "until a code is successfully guessed. Incident response is severely hampered.",
        remediation:
          "Log each failed attempt with the userId, timestamp, and attempted code prefix " +
          "(or a hash of the code) to enable detection and alerting. " +
          "Consider integrating with a security monitoring service.",
      };

  return { hasRateLimit, hasFailedAttemptLog, rateLimitFinding, loggingFinding };
}

// ---------------------------------------------------------------------------
// TestModule export
// ---------------------------------------------------------------------------

export const bruteForce: TestModule = {
  name: "brute-force",
  description:
    "Analyses class code generation entropy and the joinClass mutation for missing rate limiting " +
    "and failed-attempt logging that would enable brute-force attacks.",

  async run(options: RunOptions): Promise<TestResult> {
    const start = Date.now();
    const { projectRoot } = options;

    const findings: Finding[] = [];
    let passCount = 0;

    const source = readProjectFile(projectRoot, CLASSES_FILE);

    // --- Check 1: PRNG quality ---
    if (source === null) {
      findings.push({
        id: "BRUTE-FORCE-000",
        severity: "INFO",
        category: "Brute Force",
        title: `Could not read ${CLASSES_FILE} for analysis`,
        location: CLASSES_FILE,
        description: `The file ${CLASSES_FILE} was not found or could not be read. Manual review required.`,
        proofOfConcept: "File not found at expected path.",
        impact: "Unknown — file could not be analysed.",
        remediation: "Verify the file exists and re-run the analysis.",
      });
    } else {
      const codeGenResult = checkCodeGenSecurity(source);
      if (codeGenResult.finding !== null) {
        findings.push(codeGenResult.finding);
      } else {
        // Secure PRNG in use — pass
        passCount++;
      }

      const rateLimitResult = checkJoinClassRateLimiting(source);
      if (rateLimitResult.rateLimitFinding !== null) {
        findings.push(rateLimitResult.rateLimitFinding);
      } else {
        // Rate limiting present — pass
        passCount++;
      }

      if (rateLimitResult.loggingFinding !== null) {
        findings.push(rateLimitResult.loggingFinding);
      } else {
        // Logging present — pass
        passCount++;
      }
    }

    const duration = Date.now() - start;

    return {
      category: "Brute Force",
      findings,
      passCount,
      duration,
    };
  },
};
