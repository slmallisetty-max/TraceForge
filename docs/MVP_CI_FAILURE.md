# MVP CI Failure Specification

## The Product is the Failure

**TraceForge exists to make AI behavior changes unignorable.**

The CI failure output is not just error reporting—it's the entire product. Everything else (commands, storage, diffs) exists only to produce this moment of pain.

---

## The Failure Output

This is the **exact output** when `traceforge check` detects unauthorized AI behavior changes:

```bash
❌ BUILD FAILED

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
