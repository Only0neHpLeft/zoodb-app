import { parseArgs } from "util";
import { resolve } from "path";
import type { TestModule, TestResult, Severity } from "./types";

import { secretsScan } from "./tests/secrets-scan";
import { cspAnalysis } from "./tests/csp-analysis";
import { tauriPermissions } from "./tests/tauri-permissions";
import { dependencyAudit } from "./tests/dependency-audit";
import { authBypass } from "./tests/auth-bypass";
import { dataLeakage } from "./tests/data-leakage";
import { inputValidation } from "./tests/input-validation";
import { bruteForce } from "./tests/brute-force";
import { generateReport } from "./report";

const ALL_MODULES: readonly TestModule[] = [
  authBypass,
  dataLeakage,
  inputValidation,
  secretsScan,
  dependencyAudit,
  cspAnalysis,
  tauriPermissions,
  bruteForce,
];

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

function severityColor(severity: Severity): string {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return colors.red;
    case "MEDIUM":
      return colors.yellow;
    case "LOW":
    case "INFO":
      return colors.dim;
  }
}

function printHeader(projectRoot: string): void {
  console.log();
  console.log(`${colors.bold}${colors.cyan}  ZooDB Security Audit${colors.reset}`);
  console.log(`${colors.dim}  ${"━".repeat(45)}${colors.reset}`);
  console.log(`${colors.dim}  Mode: Static Analysis${colors.reset}`);
  console.log(`${colors.dim}  Target: ${projectRoot}${colors.reset}`);
  console.log();
}

function printResult(result: TestResult, index: number, total: number): void {
  const duration = `(${(result.duration / 1000).toFixed(1)}s)`;
  console.log(
    `${colors.bold}  [${index + 1}/${total}] ${result.category}${colors.reset}  ${colors.dim}${duration}${colors.reset}`,
  );

  const sorted = [...result.findings].sort((a, b) => {
    const order: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    return order[a.severity] - order[b.severity];
  });

  for (const finding of sorted) {
    const icon = finding.severity === "INFO" ? "i" : "x";
    const color = severityColor(finding.severity);
    const severityPad = finding.severity.padEnd(8);
    console.log(`    ${color}${icon} ${severityPad}${colors.reset} ${finding.title}`);
  }

  if (result.passCount > 0) {
    console.log(
      `    ${colors.green}v PASS${colors.reset}     ${colors.dim}${result.passCount} check(s) passed${colors.reset}`,
    );
  }

  console.log();
}

function printSummary(results: readonly TestResult[]): void {
  const allFindings = results.flatMap((r) => [...r.findings]);
  const counts = {
    critical: allFindings.filter((f) => f.severity === "CRITICAL").length,
    high: allFindings.filter((f) => f.severity === "HIGH").length,
    medium: allFindings.filter((f) => f.severity === "MEDIUM").length,
    low: allFindings.filter((f) => f.severity === "LOW").length,
  };
  const totalPass = results.reduce((sum, r) => sum + r.passCount, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`${colors.dim}  ${"━".repeat(45)}${colors.reset}`);
  console.log(
    `  ${colors.bold}Summary:${colors.reset} ` +
      `${colors.red}${counts.critical} CRITICAL${colors.reset} · ` +
      `${colors.red}${counts.high} HIGH${colors.reset} · ` +
      `${colors.yellow}${counts.medium} MEDIUM${colors.reset} · ` +
      `${colors.dim}${counts.low} LOW${colors.reset} · ` +
      `${colors.green}${totalPass} PASS${colors.reset}`,
  );
  console.log(`${colors.dim}  Total time: ${(totalDuration / 1000).toFixed(1)}s${colors.reset}`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      category: { type: "string", short: "c" },
      output: { type: "string", short: "o" },
      live: { type: "boolean", default: false },
    },
    strict: true,
  });

  const projectRoot = resolve(import.meta.dir, "..");

  const modulesToRun = values.category
    ? ALL_MODULES.filter((m) => m.name === values.category)
    : [...ALL_MODULES];

  if (values.category && modulesToRun.length === 0) {
    console.error(`${colors.red}Unknown category: ${values.category}${colors.reset}`);
    console.error(`Available: ${ALL_MODULES.map((m) => m.name).join(", ")}`);
    process.exit(1);
  }

  printHeader(projectRoot);

  const results: TestResult[] = [];

  for (let i = 0; i < modulesToRun.length; i++) {
    const module = modulesToRun[i];
    const result = await module.run({
      live: values.live ?? false,
      projectRoot,
    });
    results.push(result);
    printResult(result, i, modulesToRun.length);
  }

  printSummary(results);

  const reportPath = generateReport(results, projectRoot, values.output);
  console.log(`${colors.cyan}  Report saved: ${reportPath}${colors.reset}`);
  console.log();
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error: ${err}${colors.reset}`);
  process.exit(1);
});
