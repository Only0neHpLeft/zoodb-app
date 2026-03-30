import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import type { Finding, TestResult, Severity } from "./types";

function severityOrder(severity: Severity): number {
  switch (severity) {
    case "CRITICAL": return 0;
    case "HIGH": return 1;
    case "MEDIUM": return 2;
    case "LOW": return 3;
    case "INFO": return 4;
  }
}

function sortFindings(findings: readonly Finding[]): readonly Finding[] {
  return [...findings].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
}

function getOverallRating(findings: readonly Finding[]): string {
  if (findings.some((f) => f.severity === "CRITICAL")) return "CRITICAL";
  if (findings.some((f) => f.severity === "HIGH")) return "HIGH";
  if (findings.some((f) => f.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

function getEffortEstimate(severity: Severity): string {
  switch (severity) {
    case "CRITICAL": return "30 min";
    case "HIGH": return "1-2 hours";
    case "MEDIUM": return "30 min - 1 hour";
    case "LOW": return "15-30 min";
    case "INFO": return "N/A";
  }
}

function getGitHash(projectRoot: string): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: projectRoot, encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

export function generateReport(
  results: readonly TestResult[],
  projectRoot: string,
  outputPath?: string,
): string {
  const allFindings: Finding[] = [];
  let findingCounter = 1;

  for (const result of results) {
    for (const finding of result.findings) {
      allFindings.push({
        ...finding,
        id: `SEC-${String(findingCounter).padStart(3, "0")}`,
      });
      findingCounter++;
    }
  }

  const sorted = sortFindings(allFindings);
  const date = new Date().toISOString().split("T")[0];
  const gitHash = getGitHash(projectRoot);

  const counts = {
    critical: sorted.filter((f) => f.severity === "CRITICAL").length,
    high: sorted.filter((f) => f.severity === "HIGH").length,
    medium: sorted.filter((f) => f.severity === "MEDIUM").length,
    low: sorted.filter((f) => f.severity === "LOW").length,
    info: sorted.filter((f) => f.severity === "INFO").length,
  };

  const totalFindings = sorted.filter((f) => f.severity !== "INFO").length;
  const topRisk = sorted.length > 0 ? sorted[0].title : "No issues found";
  const overallRating = getOverallRating(sorted);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  let md = `# ZooDB Security Audit Report

**Date:** ${date}
**Scope:** Full stack (API, client, secrets, dependencies, Tauri)
**Mode:** Static Analysis
**App Version:** ${gitHash}
**Duration:** ${(totalDuration / 1000).toFixed(1)}s

---

## Executive Summary

- **${totalFindings} findings** total: ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low (+ ${counts.info} informational)
- **Top risk:** ${topRisk}
- **Overall risk rating:** ${overallRating}

---

## Findings

`;

  for (const finding of sorted) {
    md += `### [${finding.severity}] ${finding.id}: ${finding.title}

- **Category:** ${finding.category}
- **Location:** \`${finding.location}\`
- **Description:** ${finding.description}
- **Proof of Concept:** ${finding.proofOfConcept}
- **Impact:** ${finding.impact}
- **Remediation:** ${finding.remediation}

---

`;
  }

  const actionable = sorted.filter((f) => f.severity !== "INFO");
  if (actionable.length > 0) {
    md += `## Remediation Priority

| # | Finding | Severity | Category | Effort |
|---|---------|----------|----------|--------|
`;

    for (let i = 0; i < actionable.length; i++) {
      const f = actionable[i];
      md += `| ${i + 1} | ${f.id}: ${f.title} | ${f.severity} | ${f.category} | ${getEffortEstimate(f.severity)} |\n`;
    }

    md += `
---

`;
  }

  md += `## Test Coverage

| Module | Findings | Pass | Duration |
|--------|----------|------|----------|
`;

  for (const result of results) {
    md += `| ${result.category} | ${result.findings.length} | ${result.passCount} | ${(result.duration / 1000).toFixed(1)}s |\n`;
  }

  md += `
---

## Methodology

This audit was performed using a custom security testing suite built specifically for the ZooDB application. The suite uses static analysis to scan source code, configuration files, git history, and dependencies for known vulnerability patterns.

**Tools used:**
- Custom TypeScript modules executed via Bun runtime
- Git history analysis for credential exposure
- npm audit for dependency vulnerability scanning
- Static AST-like source code analysis for authorization checks

**Limitations:**
- Static analysis only (no live API testing in this run)
- Cannot detect runtime-specific vulnerabilities
- Pattern-based detection may miss obfuscated or indirect security issues
- Does not cover network-level attacks, DDoS, or social engineering
`;

  const reportsDir = join(projectRoot, "security", "reports");
  mkdirSync(reportsDir, { recursive: true });
  const reportPath = outputPath ?? join(reportsDir, `audit-${date}.md`);
  writeFileSync(reportPath, md, "utf-8");

  return reportPath;
}
