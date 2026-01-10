# CI Failure Specification

This document defines the **exact terminal output** developers see when AI behavior changes without approval in CI.

---

## Standard CI Failure Output

When `traceforge check` detects unapproved AI behavior changes, it produces this output:
# MVP CI Failure Specification

## The Product is the Failure

**TraceForge exists to make AI behavior changes unignorable.**

The CI failure output is not just error reporting—it's the entire product. Everything else (commands, storage, diffs) exists only to produce this moment of pain.

---

## The Failure Output

This is the **exact output** when `traceforge check` detects unauthorized AI behavior changes:

```bash
❌ BUILD FAILED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 AI BEHAVIOR CHANGED WITHOUT APPROVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT CHANGED:
  Prompt:     src/agents/summarizer.py:12
  Function:   generate_summary()
  Model:      gpt-4-turbo → gpt-4o
  
BEHAVIORAL DIFF:
  ┌─────────────────────────────────────────────────┐
  │ Before: "Error: Invalid input format"          │
  │ After:  "I apologize, but I cannot process..." │
  └─────────────────────────────────────────────────┘

WHY THIS MATTERS:
  • Changed from error code to apology text
  • Breaks downstream JSON parsing in payment flow
  • Would cause silent failures in production
  • Non-deterministic behavior detected (5/10 runs varied)

IMPACT:
  • 3 test cases now produce different outputs
  • Snapshot hash mismatch: expected abc123, got def456

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TO FIX: 

1. Review changes: 
   $ traceforge diff --baseline main

2. If intentional, update snapshot: 
   $ traceforge snapshot approve
   $ git add .ai-snapshots/
   $ git commit -m "Update AI behavior: switched to gpt-4o"
   
3. If unintentional, revert:
   $ git checkout HEAD~1 src/agents/summarizer.py

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Build blocked. Approve snapshot changes to proceed.

Exit code: 1
```

---

## Missing Snapshot Output

When a cassette is missing entirely:

```bash
❌ BUILD FAILED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 MISSING AI SNAPSHOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S MISSING:
  File:       .ai-tests/cassettes/openai/abc123def456.json
  Function:   generate_response()
  Model:      gpt-4o
  
WHY THIS MATTERS:
  • Cannot verify AI behavior without a baseline snapshot
  • This would make untested AI calls in production
  • Strict mode requires all interactions to be recorded

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TO FIX:

1. Record the snapshot locally:
   $ TRACEFORGE_VCR_MODE=record npm test
   $ git add .ai-tests/cassettes/
   $ git commit -m "Add AI snapshot for generate_response()"

2. Push and re-run CI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Build blocked. Record snapshot to proceed.

Exit code: 1
```

---

## Non-Deterministic Behavior Output

When the same prompt produces different outputs across runs:

```bash
❌ BUILD FAILED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 NON-DETERMINISTIC AI BEHAVIOR DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT HAPPENED:
  Function:   summarize_text()
  Model:      gpt-4o
  Runs:       10
  Variance:   5/10 produced different outputs
  
SAMPLE OUTPUTS:
  Run 1: "AI is transforming software development."
  Run 3: "Artificial intelligence is revolutionizing code."
  Run 7: "AI transforms how we build software today."
  
WHY THIS MATTERS:
  • Non-deterministic outputs cannot be tested reliably
  • Would cause flaky behavior in production
  • Snapshots become meaningless if behavior varies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TO FIX:

1. Set temperature to 0 for deterministic output:
   temperature: 0
   
2. Add a seed parameter for reproducibility:
   seed: 42
   
3. Record new snapshot:
   $ TRACEFORGE_VCR_MODE=record npm test
   $ git add .ai-tests/cassettes/
   $ git commit -m "Fix non-deterministic behavior in summarize_text()"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Build blocked. Fix non-determinism to proceed.

Exit code: 1
```

---

## Success Output

When all checks pass:

```bash
✅ AI BEHAVIOR CHECK PASSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All AI snapshots validated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VERIFIED:
  • 47 snapshots found and validated
  • All hashes match expected values
  • No behavior changes detected
  • All interactions are deterministic

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Build approved. Safe to deploy.

Exit code: 0
```

---

## Design Principles

This output is designed to be:

1. **Painful** - Developers must consciously deal with it
2. **Informative** - Shows exactly what changed and why it matters
3. **Actionable** - Clear instructions to fix the issue
4. **Unignorable** - Exit code 1 blocks deployment
5. **No escape hatches** - No `--force` or `--skip` flags

The more painful the output, the more valuable the tool. This forces developers to think about AI behavior changes.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 AI BEHAVIOR CHANGED WITHOUT APPROVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3 AI behavior changes detected. All changes require explicit approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHANGE #1: Model Upgraded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Snapshot ID: 2f8e9a1b4c3d
Test Case:   generate_summary
Location:    src/agents/summarizer.py:12
Function:    generate_summary()

WHAT CHANGED:
  Model: gpt-4-turbo → gpt-4o
  
  This is a model architecture change that will produce
  different outputs even with identical inputs.

OUTPUT DIFF:
  ┌─────────────────────────────────────────────────┐
  │ Before (gpt-4-turbo):                          │
  │ "Error: Invalid input format"                  │
  │                                                  │
  │ After (gpt-4o):                                │
  │ "I apologize, but I cannot process this        │
  │  request due to an invalid input format."      │
  └─────────────────────────────────────────────────┘

WHY THIS MATTERS:
  • Changed from error code to natural language
  • Breaks downstream JSON parsing in payment flow
  • Customer-facing error messages now verbose
  • Response length increased 4x (cost impact)

BUSINESS IMPACT:
  🔴 BREAKING: Error handling code expects terse format
  🟡 COST: Token usage increased from 8 → 32 per error
  🟡 LATENCY: Response time increased from 120ms → 180ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHANGE #2: Prompt Modified
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Snapshot ID: a9d7c2e8f1b0
Test Case:   classify_feedback
Location:    src/agents/classifier.py:28
Function:    classify_sentiment()

WHAT CHANGED:
  Prompt: System message modified
  
  Old: "Classify sentiment as: positive, negative, neutral"
  New: "Classify sentiment as: positive, negative, neutral, mixed"

OUTPUT DIFF:
  ┌─────────────────────────────────────────────────┐
  │ Before: "neutral"                              │
  │ After:  "mixed"                                │
  └─────────────────────────────────────────────────┘

WHY THIS MATTERS:
  • Introduced new classification category "mixed"
  • Database schema only supports 3 categories
  • Will cause constraint violations in production

BUSINESS IMPACT:
  🔴 BREAKING: Database insert will fail
  🔴 DATA: Historical comparisons now invalid

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHANGE #3: Non-Deterministic Behavior Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Snapshot ID: 3b1c8d4f2e6a
Test Case:   generate_code
Location:    src/agents/coder.py:45
Function:    generate_code_snippet()

WHAT CHANGED:
  Output: Multiple runs produced different results
  
  Temperature: 0.7 (non-zero = non-deterministic)

OUTPUT VARIATIONS (5 runs):
  ┌─────────────────────────────────────────────────┐
  │ Run 1: "function add(a, b) { return a + b; }"  │
  │ Run 2: "const add = (a, b) => a + b;"          │
  │ Run 3: "function add(a, b) { return a + b; }"  │
  │ Run 4: "const add = (a, b) => { return a+b; }" │
  │ Run 5: "function add(a, b) { return a + b; }"  │
  └─────────────────────────────────────────────────┘

WHY THIS MATTERS:
  • Output format inconsistent (function vs arrow)
  • 40% variation rate across runs
  • Cannot guarantee stable behavior in production

BUSINESS IMPACT:
  🔴 RELIABILITY: Users will see inconsistent outputs
  🟡 SUPPORT: Increased support tickets due to confusion

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY:
  Total Changes:     3
  Breaking Changes:  2
  Cost Impact:       +25% token usage
  Risk Level:        🔴 HIGH

Your pull request introduces AI behavior changes that will
break production. These changes MUST be explicitly approved.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO FIX:

Option 1: Review and Approve Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If these changes are intentional and you've verified they
won't break production:

  # Review each change in detail
  $ traceforge check diff --snapshot-id 2f8e9a1b4c3d
  $ traceforge check diff --snapshot-id a9d7c2e8f1b0
  $ traceforge check diff --snapshot-id 3b1c8d4f2e6a

  # Approve the changes
  $ traceforge check approve --snapshot-id 2f8e9a1b4c3d
  $ traceforge check approve --snapshot-id a9d7c2e8f1b0
  $ traceforge check approve --snapshot-id 3b1c8d4f2e6a

  # Or approve all at once
  $ traceforge check approve --all

  # Commit the approved snapshots
  $ git add .ai-snapshots/*.approved.json
  $ git commit -m "Approve AI behavior changes"
  $ git push

Option 2: Revert the Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If these changes were unintentional:

  # Revert the code that caused the changes
  $ git checkout HEAD~1 src/agents/summarizer.py
  $ git checkout HEAD~1 src/agents/classifier.py
  $ git checkout HEAD~1 src/agents/coder.py

  # Or revert the entire commit
  $ git revert HEAD

  # Push the fix
  $ git push

Option 3: Fix the Breaking Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Address the business impacts before approving:

  1. Update error handling to support verbose messages
  2. Migrate database schema to support "mixed" sentiment
  3. Set temperature=0 for deterministic outputs

  Then re-run tests and approve the new snapshots.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  This build will remain BLOCKED until you take action.

There is no escape hatch. There is no "ignore" option.
You cannot merge this PR until AI behavior is approved.

Exit code: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Design Principles

### 1. **Make It Painful**

The output must be impossible to ignore:

- ✅ Takes up entire terminal screen
- ✅ Uses visual separators (boxes, lines)
- ✅ Red colors for errors
- ✅ Shows concrete business impact (not abstract metrics)
- ✅ Blocks CI with hard fail (exit 1)

### 2. **Show What Changed**

Developers need to see:

- ✅ Exact model, prompt, or parameter that changed
- ✅ Before/after diff of AI outputs
- ✅ Location in code (file, line, function)
- ✅ Snapshot ID for tracking

### 3. **Explain Why It Matters**

Abstract changes mean nothing. Show:

- ✅ How downstream code will break
- ✅ What production impact will occur
- ✅ Cost/latency implications
- ✅ Business consequences

### 4. **No Escape Hatches**

- ❌ No `--force` flag
- ❌ No `--ignore` option
- ❌ No warning-only mode
- ✅ Only options: approve or revert

### 5. **Actionable Instructions**

Must include:

- ✅ Exact commands to run
- ✅ Multiple resolution paths
- ✅ Git commands to commit fixes
- ✅ No ambiguity about next steps

---

## Success Criteria

The MVP is complete when a developer:

1. Makes an innocent prompt change
2. Opens a pull request
3. Sees the CI failure output above
4. Says: "Oh shit, I need to approve this"
5. Runs the approve command
6. Commits the approved snapshot
7. CI goes green

**The pain → action → resolution loop must be frictionless.**

---

## Technical Requirements

### Exit Codes

- `0` - No AI behavior changes detected
- `1` - AI behavior changes detected (blocks CI)
- `2` - Error running check (missing baselines, git errors, etc.)

### Output Format

- **Text-based** (no fancy TUIs, keep it simple)
- **ANSI colors** (chalk library)
- **Box drawing** (Unicode box characters)
- **Terminal width aware** (wrap at 80 cols)

### Performance

- Must complete in **< 5 seconds** for typical repos
- Must handle **100+ snapshots** efficiently
- Must work in CI environments (no interactive prompts)

---

## Anti-Patterns to Avoid

❌ **"Warning: AI output changed"** - Too soft, gets ignored  
✅ **"BUILD FAILED: AI behavior changed without approval"** - Hard stop

❌ **"Semantic similarity: 0.87"** - Abstract metric means nothing  
✅ **"Breaks downstream JSON parsing in payment flow"** - Concrete impact

❌ **"Run with --approve to continue"** - Escape hatch  
✅ **"Review changes, then explicitly approve"** - Requires thought

❌ **"3 warnings"** - Easily ignored  
✅ **"3 breaking changes detected"** - Cannot ignore

---

## Future Enhancements (Post-MVP)

These are **explicitly out of scope** for MVP:

- Semantic similarity scoring
- ML-based impact prediction
- Interactive approval workflow
- Web UI for reviewing changes
- Slack/email notifications
- Automatic regression detection
- Change clustering/grouping

**MVP is just: detect change → show diff → block CI → force approval**

That's it. That's the product.
