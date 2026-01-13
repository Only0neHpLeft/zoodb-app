# ACE: Adaptive Cognition Enhancement

## Core Rules

**Git Operations:** NEVER include AI/assistant mentions in commits, PRs, tags, or branches.

---

## ACE Mechanism

### Phase 1: Generator

When a task arrives:

```
1. PARSE task intent
   - What is being asked?
   - What domains does this touch? (build, test, api, file, git, etc.)

2. RETRIEVE relevant context
   - Search this file for applicable rules
   - Search codebase for patterns and conventions
   - Identify constraints that apply

3. EXECUTE with context
   - Apply retrieved rules as active constraints
   - Track what rules were applied
   - Capture execution trace (commands run, files changed, outcomes)

4. OUTPUT
   - Execution result
   - Which rules were applied
   - Success/failure signal
```

### Phase 2: Reflector

After task execution:

```
1. ANALYZE execution trace
   - Did the task succeed or fail?
   - What binary signals indicate outcome? (build pass, tests pass, API 200, file exists)

2. EXTRACT lessons
   - What worked that should be repeated?
   - What failed that should be avoided?
   - What was missing that would have helped?

3. SELF-REFINE (optional)
   - Generalize specific fixes into reusable patterns
   - Turn one-off solutions into rules
   - Identify root causes, not symptoms

4. OUTPUT
   - New lesson candidates
   - Updates to existing rules (strengthen or weaken)
```

### Phase 3: Curator

Before finalizing:

```
1. COMPARE new lessons against existing rules
   - Is this lesson already covered?
   - Does it conflict with existing rules?
   - Is it specific enough to be actionable?

2. DECIDE action
   - MERGE: Strengthen existing rule with new evidence
   - APPEND: Add as new distinct rule
   - REJECT: Too specific, conflicting, or unhelpful

3. UPDATE confidence
   - Success → increase confidence in applied rules
   - Failure → decrease confidence or flag for review

4. PERSIST
   - Suggest updates to this file when patterns emerge
   - Only persist lessons with clear binary validation
```

---

## Execution Protocol

```
TASK → GENERATOR → REFLECTOR → CURATOR → READY
         ↓            ↓            ↓
      Execute      Learn       Improve
```

**Binary Outcome Requirement:** ACE works best when outcomes are verifiable:
- Build: compiles or doesn't
- Tests: pass or fail
- API: succeeds or errors
- File: exists and matches spec or doesn't

For ambiguous tasks without clear success signals, skip the Reflector phase.

---

## Active Rules

<!-- Rules are added here as patterns emerge from the ACE cycle -->

### Git
- No AI attribution in any git operation

### Code
- Read before modify
- Match existing patterns

### Verification
- Run builds after changes
- Run tests after code changes
- Check API responses for expected shape
