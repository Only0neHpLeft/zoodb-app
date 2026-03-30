import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Finding, TestModule, TestResult, RunOptions } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Scenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly impact: string;
  readonly remediation: string;
  readonly filePath: string;
  readonly functionName: string;
  /** Returns true when the function body is VULNERABLE (no auth check). */
  readonly isVulnerable: (body: string) => boolean;
}

// ---------------------------------------------------------------------------
// Utility: extract a named export's handler body by tracking brace depth
// ---------------------------------------------------------------------------

interface ExtractResult {
  readonly body: string;
  readonly startLine: number;
}

function extractFunctionBody(
  source: string,
  functionName: string
): ExtractResult | null {
  const lines = source.split("\n");

  // Find the line that declares the exported function / query / mutation
  const declarationPattern = new RegExp(
    `export\\s+const\\s+${functionName}\\s*=`
  );

  let declarationLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (declarationPattern.test(lines[i]!)) {
      declarationLine = i;
      break;
    }
  }

  if (declarationLine === -1) return null;

  // Walk forward from the declaration until we find the handler: async (ctx
  // then capture everything until brace depth returns to 0
  let handlerStart = -1;
  const handlerPattern = /handler\s*:/;

  for (let i = declarationLine; i < lines.length; i++) {
    if (handlerPattern.test(lines[i]!)) {
      handlerStart = i;
      break;
    }
    // Safety: stop if we hit the next top-level export
    if (i > declarationLine && /^export\s+const\s+/.test(lines[i]!)) break;
  }

  if (handlerStart === -1) return null;

  // Count braces from the handler: line forward
  let depth = 0;
  const bodyLines: string[] = [];
  let started = false;

  for (let i = handlerStart; i < lines.length; i++) {
    const line = lines[i]!;

    for (const ch of line) {
      if (ch === "{") {
        depth++;
        started = true;
      } else if (ch === "}") {
        depth--;
      }
    }

    bodyLines.push(line);

    if (started && depth === 0) break;
  }

  return {
    body: bodyLines.join("\n"),
    startLine: handlerStart + 1, // 1-based line number
  };
}

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

const SCENARIOS: readonly Scenario[] = [
  {
    id: "DL-A",
    title: "getClassStudents: No authentication — full student roster exposed",
    description:
      "getClassStudents in convex/classes.ts executes without verifying the caller's identity. " +
      "Any unauthenticated or cross-user request can retrieve the complete student roster, " +
      "including names, emails, task progress, and activity timestamps for every enrolled student.",
    impact:
      "Full PII disclosure (student names and emails) and detailed academic performance data " +
      "leaked to any caller who supplies a valid classId.",
    remediation:
      "Add ctx.auth.getUserIdentity() at the top of the handler and verify the caller is " +
      "the class teacher or an active enrolled student before returning roster data.",
    filePath: "convex/classes.ts",
    functionName: "getClassStudents",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-B",
    title: "getStudentProgress: No authentication — any user's progress readable",
    description:
      "getStudentProgress in convex/taskProgress.ts executes without an identity check. " +
      "An attacker who knows (or can enumerate) a userId can retrieve the complete task " +
      "completion history, attempt counts, hint usage, and time-on-task for any student.",
    impact:
      "Detailed academic performance metrics for arbitrary users are exposed without " +
      "authorization, violating student privacy.",
    remediation:
      "Require ctx.auth.getUserIdentity() and ensure the authenticated user is either the " +
      "subject of the query or a teacher of a class the student belongs to.",
    filePath: "convex/taskProgress.ts",
    functionName: "getStudentProgress",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-C",
    title: "getStudentNotes: No authentication — teacher notes readable by anyone",
    description:
      "getStudentNotes in convex/teacherNotes.ts executes without verifying caller identity. " +
      "Private pedagogical notes written by a teacher about a specific student are accessible " +
      "to any caller who supplies valid classId and studentUserId arguments.",
    impact:
      "Confidential teacher feedback, assessments, and observations about students are " +
      "exposed to unauthorized parties, with potential legal and reputational consequences.",
    remediation:
      "Add an identity check and restrict access to the class teacher or, if intentional, " +
      "to the specific student the notes are about.",
    filePath: "convex/teacherNotes.ts",
    functionName: "getStudentNotes",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-D",
    title: "getClass: No authentication — class details and join code exposed",
    description:
      "getClass in convex/classes.ts returns the full class document — including the " +
      "secret join code — without verifying that the caller is the teacher or an enrolled " +
      "student. Anyone who discovers a valid classId can obtain the join code and self-enroll.",
    impact:
      "Unauthorized class access via leaked join codes; enumeration of all classes in the " +
      "system if IDs are predictable or guessable.",
    remediation:
      "Verify identity and membership before returning the full class document. Consider " +
      "omitting the join code for non-teacher callers.",
    filePath: "convex/classes.ts",
    functionName: "getClass",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-E",
    title: "getClassAssignments: No authentication — assignments readable without membership",
    description:
      "getClassAssignments in convex/assignments.ts returns all assignments for a given " +
      "classId without any identity verification. Non-members and unauthenticated callers " +
      "can retrieve the full assignment list for any class.",
    impact:
      "Assignment details (categories, task indexes, due dates, teacher notes) are exposed " +
      "to anyone outside the class, potentially facilitating academic dishonesty.",
    remediation:
      "Authenticate the caller and confirm active enrollment in the specified class before " +
      "returning assignment data.",
    filePath: "convex/assignments.ts",
    functionName: "getClassAssignments",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-F",
    title: "getTeacherClasses: No authentication — teacher's class list exposed",
    description:
      "getTeacherClasses in convex/classes.ts enumerates all classes for a given teacherUserId " +
      "without verifying that the authenticated user is that teacher. Any user who knows a " +
      "teacher's userId can list all of that teacher's classes.",
    impact:
      "Organizational intelligence (class names, descriptions, student counts, join codes) " +
      "leaked for any teacher, enabling targeted attacks or enrollment manipulation.",
    remediation:
      "Call ctx.auth.getUserIdentity() and assert identity.subject === args.teacherUserId " +
      "before querying.",
    filePath: "convex/classes.ts",
    functionName: "getTeacherClasses",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-G",
    title: "getStudentClasses: No authentication — student's enrollments exposed",
    description:
      "getStudentClasses in convex/classes.ts returns every class a student is enrolled in " +
      "without verifying the caller's identity. Any authenticated or unauthenticated caller " +
      "who supplies a valid studentUserId can enumerate that student's class memberships.",
    impact:
      "Class membership information — including class names, student counts, and join dates — " +
      "is disclosed for any student, enabling stalking or targeted social engineering.",
    remediation:
      "Require ctx.auth.getUserIdentity() and assert identity.subject === args.studentUserId " +
      "before returning enrollment data.",
    filePath: "convex/classes.ts",
    functionName: "getStudentClasses",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-H",
    title: "getMembership: No authentication — membership and license data exposed",
    description:
      "getMembership in convex/memberships.ts returns the full membership record — including " +
      "plan type, license key, license status, and expiry date — for any userId without " +
      "authenticating the caller.",
    impact:
      "License keys and billing-tier data are exposed to any caller. Attackers could harvest " +
      "license keys for reuse or perform competitor intelligence on subscription distribution.",
    remediation:
      "Authenticate the caller and ensure only the account owner (or an admin) can retrieve " +
      "their own membership record. Never expose the raw licenseKey to non-owners.",
    filePath: "convex/memberships.ts",
    functionName: "getMembership",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-I",
    title: "hasPremiumAccess: No authentication — premium status oracle exposed",
    description:
      "hasPremiumAccess in convex/memberships.ts indicates whether a given userId holds a " +
      "premium plan without verifying the identity of the requester. Any caller can probe the " +
      "premium status of arbitrary users.",
    impact:
      "Enables enumeration of which users have paid subscriptions, which could be used for " +
      "targeted phishing or to bypass client-side feature gates.",
    remediation:
      "Restrict hasPremiumAccess to return data only for the authenticated caller, or enforce " +
      "server-side authorization before exposing subscription tier.",
    filePath: "convex/memberships.ts",
    functionName: "hasPremiumAccess",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
  {
    id: "DL-J",
    title: "getClassStudents: Post-leave enrollment status not re-verified on query",
    description:
      "getClassStudents in convex/classes.ts filters enrollments by status === 'active' at " +
      "query time, but the function itself has no auth check. A removed or left student can " +
      "still call the query directly — the write-path removes the enrollment record but the " +
      "read-path never confirms the caller is authorized to see the result.",
    impact:
      "A student who has left or been removed from a class retains read access to the full " +
      "roster and progress data of remaining students until they lose their session token.",
    remediation:
      "In addition to fixing the missing auth check (DL-A), verify on the read path that the " +
      "caller has an active enrollment in the class, or is the class teacher.",
    filePath: "convex/classes.ts",
    functionName: "getClassStudents",
    isVulnerable: (body) => !body.includes("ctx.auth.getUserIdentity()"),
  },
];

// ---------------------------------------------------------------------------
// Core analysis
// ---------------------------------------------------------------------------

function analyzeScenario(
  scenario: Scenario,
  projectRoot: string,
  fileCache: Map<string, string>
): { readonly finding: Finding | null; readonly passed: boolean } {
  const absolutePath = join(projectRoot, scenario.filePath);

  if (!existsSync(absolutePath)) {
    // File missing — treat as unable to verify (not a pass)
    const finding: Finding = {
      id: scenario.id,
      severity: "HIGH",
      category: "Data Leakage",
      title: scenario.title,
      location: `${scenario.filePath} (file not found)`,
      description: `${scenario.description} Source file could not be located at the expected path.`,
      proofOfConcept: `File ${scenario.filePath} not found — could not verify presence of auth check.`,
      impact: scenario.impact,
      remediation: scenario.remediation,
    };
    return { finding, passed: false };
  }

  // Read with caching to avoid redundant I/O
  let source = fileCache.get(absolutePath);
  if (source === undefined) {
    source = readFileSync(absolutePath, "utf-8");
    fileCache.set(absolutePath, source);
  }

  const extracted = extractFunctionBody(source, scenario.functionName);

  if (extracted === null) {
    // Function not found in file
    const finding: Finding = {
      id: scenario.id,
      severity: "HIGH",
      category: "Data Leakage",
      title: scenario.title,
      location: scenario.filePath,
      description:
        `${scenario.description} ` +
        `Function '${scenario.functionName}' could not be located in ${scenario.filePath}.`,
      proofOfConcept: `Function ${scenario.functionName} not found in ${scenario.filePath} — manual review required.`,
      impact: scenario.impact,
      remediation: scenario.remediation,
    };
    return { finding, passed: false };
  }

  const vulnerable = scenario.isVulnerable(extracted.body);

  if (!vulnerable) {
    // Auth check is present — this scenario passes
    return { finding: null, passed: true };
  }

  const location = `${scenario.filePath}:${extracted.startLine} (${scenario.functionName})`;

  const finding: Finding = {
    id: scenario.id,
    severity: "HIGH",
    category: "Data Leakage",
    title: scenario.title,
    location,
    description: scenario.description,
    proofOfConcept:
      `Call api.${scenario.filePath.replace("convex/", "").replace(".ts", "")}.${scenario.functionName}()` +
      ` with any valid ID — data is returned without authorization.`,
    impact: scenario.impact,
    remediation: scenario.remediation,
  };

  return { finding, passed: false };
}

// ---------------------------------------------------------------------------
// TestModule export
// ---------------------------------------------------------------------------

export const dataLeakage: TestModule = {
  name: "data-leakage",
  description:
    "Analyzes Convex query handlers for missing authentication checks that allow " +
    "cross-user data access — including student rosters, progress records, teacher notes, " +
    "assignments, and membership/license data.",

  async run(options: RunOptions): Promise<TestResult> {
    const start = Date.now();
    const { projectRoot } = options;

    const findings: Finding[] = [];
    let passCount = 0;

    // Share file contents across scenarios that target the same file
    const fileCache = new Map<string, string>();

    for (const scenario of SCENARIOS) {
      const { finding, passed } = analyzeScenario(scenario, projectRoot, fileCache);

      if (passed) {
        passCount++;
      } else if (finding !== null) {
        findings.push(finding);
      }
    }

    const duration = Date.now() - start;

    return {
      category: "Data Leakage",
      findings,
      passCount,
      duration,
    };
  },
};
