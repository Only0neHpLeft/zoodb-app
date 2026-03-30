export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface Finding {
  readonly id: string;
  readonly severity: Severity;
  readonly category: string;
  readonly title: string;
  readonly location: string;
  readonly description: string;
  readonly proofOfConcept: string;
  readonly impact: string;
  readonly remediation: string;
}

export interface TestResult {
  readonly category: string;
  readonly findings: readonly Finding[];
  readonly passCount: number;
  readonly duration: number;
}

export interface RunOptions {
  readonly live: boolean;
  readonly projectRoot: string;
  readonly credentials?: {
    readonly studentEmail: string;
    readonly studentPassword: string;
    readonly teacherEmail: string;
    readonly teacherPassword: string;
    readonly convexUrl: string;
    readonly siteUrl: string;
  };
}

export interface TestModule {
  readonly name: string;
  readonly description: string;
  readonly run: (options: RunOptions) => Promise<TestResult>;
}
