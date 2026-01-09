# CI Failure Specification

This document defines the **exact terminal output** developers see when AI behavior changes without approval in CI.

---

## Standard CI Failure Output

When `traceforge check` detects unapproved AI behavior changes, it produces this output:

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
