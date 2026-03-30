import * as fs from "fs";
import * as path from "path";
import type { Finding, TestModule, TestResult, RunOptions } from "../types.ts";

// Files to skip entirely
const SKIP_FILES = new Set(["schema.ts", "auth.ts", "auth.config.ts", "http.ts"]);

// Regex to locate exported query/mutation declarations
const FUNC_DECL_RE =
  /export\s+const\s+(\w+)\s*=\s*(query|mutation)\s*\(/g;

interface ConvexFunction {
  readonly name: string;
  readonly kind: "query" | "mutation";
  readonly body: string;
  readonly startLine: number;
  readonly endLine: number;
}

// Resolve line number (1-based) for a character offset inside source
function lineAt(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") line++;
  }
  return line;
}

// Extract the full body of a Convex function starting at `openParenOffset`,
// which is the position of the `(` in `query(` or `mutation(`.
// We track brace depth to find the matching closing brace.
function extractBody(source: string, openParenOffset: number): string {
  let depth = 0;
  let started = false;
  let start = openParenOffset;

  for (let i = openParenOffset; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      if (!started) {
        started = true;
        start = i;
      }
      depth++;
    } else if (ch === "}") {
      depth--;
      if (started && depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  return source.slice(start);
}

// Parse all exported query/mutation functions from a Convex source file
function parseFunctions(source: string): readonly ConvexFunction[] {
  const results: ConvexFunction[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex before iterating
  FUNC_DECL_RE.lastIndex = 0;

  while ((match = FUNC_DECL_RE.exec(source)) !== null) {
    const name = match[1];
    const kind = match[2] as "query" | "mutation";
    // The `(` that opens the query/mutation call is right after the match
    const openParenOffset = match.index + match[0].length - 1;
    const body = extractBody(source, openParenOffset);
    const startLine = lineAt(source, match.index);
    const endLine = startLine + (body.match(/\n/g)?.length ?? 0);

    results.push({ name, kind, body, startLine, endLine });
  }

  return results;
}

// Determine whether a function body contains an auth check
function hasAuthCheck(body: string): boolean {
  return body.includes("ctx.auth.getUserIdentity()");
}

// Determine whether a function body contains an ownership validation
function hasOwnershipCheck(body: string): boolean {
  return (
    body.includes("identity.subject") ||
    body.includes("identity?.subject") ||
    body.includes("teacherUserId")
  );
}

function buildFindingId(filename: string, funcName: string): string {
  return `auth-bypass-${filename.replace(/\.ts$/, "")}-${funcName}`;
}

function buildLocation(filename: string, fn: ConvexFunction): string {
  return `convex/${filename}:${fn.startLine}-${fn.endLine}`;
}

// Derive the Convex API module name from the filename (e.g. "assignments.ts" → "assignments")
function moduleNameFromFile(filename: string): string {
  return filename.replace(/\.ts$/, "");
}

async function run(options: RunOptions): Promise<TestResult> {
  const startTime = Date.now();
  const findings: Finding[] = [];
  let passCount = 0;

  const convexDir = path.join(options.projectRoot, "convex");

  let filenames: string[];
  try {
    filenames = fs.readdirSync(convexDir).filter((f) => {
      if (!f.endsWith(".ts")) return false;
      if (f.startsWith("_")) return false;
      if (SKIP_FILES.has(f)) return false;
      return true;
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      category: "auth-bypass",
      findings: [
        {
          id: "auth-bypass-read-error",
          severity: "HIGH",
          category: "auth-bypass",
          title: "Could not read convex directory",
          location: convexDir,
          description: `Failed to read convex source files: ${message}`,
          proofOfConcept: "N/A",
          impact: "Security analysis incomplete — auth coverage unknown.",
          remediation: "Ensure the convex directory is accessible at the project root.",
        },
      ],
      passCount: 0,
      duration: Date.now() - startTime,
    };
  }

  for (const filename of filenames) {
    const filePath = path.join(convexDir, filename);
    let source: string;
    try {
      source = fs.readFileSync(filePath, "utf-8");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      findings.push({
        id: `auth-bypass-read-${filename}`,
        severity: "HIGH",
        category: "auth-bypass",
        title: `Could not read ${filename}`,
        location: `convex/${filename}`,
        description: `Failed to read source file: ${message}`,
        proofOfConcept: "N/A",
        impact: "Security analysis incomplete for this file.",
        remediation: "Ensure the file is readable.",
      });
      continue;
    }

    const functions = parseFunctions(source);
    const moduleName = moduleNameFromFile(filename);

    for (const fn of functions) {
      const location = buildLocation(filename, fn);
      const auth = hasAuthCheck(fn.body);
      const ownership = auth && hasOwnershipCheck(fn.body);

      if (!auth && fn.kind === "mutation") {
        findings.push({
          id: buildFindingId(filename, fn.name),
          severity: "CRITICAL",
          category: "auth-bypass",
          title: `Unprotected mutation: ${fn.name}`,
          location,
          description: `The mutation \`${fn.name}\` in \`convex/${filename}\` does not call \`ctx.auth.getUserIdentity()\`. Any unauthenticated caller can invoke it and modify data.`,
          proofOfConcept: `Call api.${moduleName}.${fn.name}() without authentication — the mutation will execute and modify data.`,
          impact:
            "Unauthenticated users can write, modify, or delete data, leading to data corruption, privilege escalation, or full database compromise.",
          remediation:
            'Add at the top of the handler:\n  const identity = await ctx.auth.getUserIdentity();\n  if (!identity) throw new Error("Unauthorized");',
        });
      } else if (!auth && fn.kind === "query") {
        findings.push({
          id: buildFindingId(filename, fn.name),
          severity: "HIGH",
          category: "auth-bypass",
          title: `Unprotected query: ${fn.name}`,
          location,
          description: `The query \`${fn.name}\` in \`convex/${filename}\` does not call \`ctx.auth.getUserIdentity()\`. Any unauthenticated caller can read its data.`,
          proofOfConcept: `Call api.${moduleName}.${fn.name}() without authentication — it will return data.`,
          impact:
            "Unauthenticated users can read potentially sensitive data from the database.",
          remediation:
            'Add at the top of the handler:\n  const identity = await ctx.auth.getUserIdentity();\n  if (!identity) throw new Error("Unauthorized");',
        });
      } else if (auth && !ownership) {
        findings.push({
          id: buildFindingId(filename, fn.name),
          severity: "LOW",
          category: "auth-bypass",
          title: `Auth without ownership check: ${fn.name}`,
          location,
          description: `The ${fn.kind} \`${fn.name}\` in \`convex/${filename}\` verifies authentication but does not validate that the caller owns the resource (no \`identity.subject\` or \`teacherUserId\` comparison found). This may be intentional for public-read endpoints.`,
          proofOfConcept: `Authenticate as any user and call api.${moduleName}.${fn.name}() — it may return or modify data belonging to other users.`,
          impact:
            "Authenticated users may be able to access or modify resources they do not own (IDOR).",
          remediation:
            "Verify that cross-user access is intentional. If not, add ownership validation:\n  if (identity.subject !== args.userId) throw new Error(\"Forbidden\");",
        });
      } else {
        // auth + ownership present
        passCount++;
      }
    }
  }

  return {
    category: "auth-bypass",
    findings,
    passCount,
    duration: Date.now() - startTime,
  };
}

export const authBypass: TestModule = {
  name: "auth-bypass",
  description:
    "Scans Convex query and mutation handlers for missing authentication and ownership checks.",
  run,
};
