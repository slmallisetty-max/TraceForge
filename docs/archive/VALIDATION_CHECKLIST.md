# Next Steps: Validation Checklist

**Status:** Strict CI Starter Example Complete  
**Next Phase:** Local Validation → Real CI Testing → User Engagement

---

## Phase 1: Local Validation (Do This First)

### Setup and Environment
- [ ] Navigate to example: `cd examples/strict-ci-starter`
- [ ] Install dependencies: `npm install`
- [ ] Run setup validation: `npm run setup`
- [ ] Verify all checks pass (Node.js, dependencies, etc.)

### Test with Existing Snapshot
- [ ] Run test with existing cassette: `npm test`
- [ ] Verify test passes (uses committed snapshot)
- [ ] Confirm no API call was made (fast execution)
- [ ] Check cassette file exists: `ls .ai-tests/cassettes/openai/`

### Test Replay Mode (No Snapshot)
- [ ] Backup cassette: `cp -r .ai-tests/cassettes/ /tmp/cassettes-backup/`
- [ ] Delete cassette: `rm -rf .ai-tests/cassettes/openai/*.json`
- [ ] Try to run test: `TRACEFORGE_VCR_MODE=replay npm test`
- [ ] Verify test fails with "missing cassette" error
- [ ] Restore cassette: `cp -r /tmp/cassettes-backup/* .ai-tests/cassettes/`

### Test Recording New Snapshot
- [ ] Start TraceForge proxy globally:
  - [ ] Install: `npm install -g @traceforge/proxy` (if not already)
  - [ ] Start: `traceforge-proxy` (in separate terminal)
- [ ] Set environment variables:
  ```bash
  export OPENAI_BASE_URL=http://localhost:8787/v1
  export OPENAI_API_KEY=<your-real-key>
  ```
- [ ] Record new snapshot:
  - [ ] Delete old: `rm .ai-tests/cassettes/openai/*.json`
  - [ ] Record: `TRACEFORGE_VCR_MODE=record npm test`
  - [ ] Verify new cassette created
  - [ ] Check cassette signature is different from example

### Test Strict Mode Locally
- [ ] Run strict mode test: `TRACEFORGE_VCR_MODE=strict npm test`
- [ ] Verify test passes with snapshot
- [ ] Delete snapshot: `rm .ai-tests/cassettes/openai/*.json`
- [ ] Run strict mode again: `TRACEFORGE_VCR_MODE=strict npm test`
- [ ] Verify hard failure (no fallback, no recording)
- [ ] Restore snapshot for next tests

---

## Phase 2: Real CI Testing (Do This Second)

### Create GitHub Repository
- [ ] Create new GitHub repo (or use test org)
- [ ] Add remote: `git remote add origin <repo-url>`
- [ ] Push example:
  ```bash
  git add examples/strict-ci-starter/
  git commit -m "Add Strict CI Starter example"
  git push -u origin main
  ```

### Test CI with Snapshot (Happy Path)
- [ ] Verify GitHub Actions workflow file exists
- [ ] Push to trigger CI: `git push`
- [ ] Go to GitHub Actions tab
- [ ] Watch workflow run
- [ ] Verify workflow passes
- [ ] Check that:
  - [ ] No API key is configured in CI (not needed)
  - [ ] Tests run with `TRACEFORGE_VCR_MODE=strict`
  - [ ] Build completes successfully
  - [ ] Total time is fast (<1 minute)

### Test CI without Snapshot (Failure Path)
- [ ] Create new branch: `git checkout -b test-missing-snapshot`
- [ ] Remove snapshot: `rm .ai-tests/cassettes/openai/*.json`
- [ ] Commit: `git commit -am "Test: Remove snapshot to verify CI fails"`
- [ ] Push: `git push -u origin test-missing-snapshot`
- [ ] Go to GitHub Actions
- [ ] Verify workflow **fails**
- [ ] Read failure message - should be clear about missing snapshot
- [ ] **Screenshot the failure** (critical for documentation)
- [ ] Save screenshot as `examples/strict-ci-starter/assets/ci-failure.png`

### Update Documentation with Real Results
- [ ] Add CI failure screenshot to README
- [ ] Update `STRICT_MODE_FAILURES.md` with actual CI output
- [ ] Confirm timing and behavior match documentation
- [ ] Update any discrepancies

---

## Phase 3: Polish (Before User Engagement)

### Documentation Review
- [ ] Read through `examples/strict-ci-starter/README.md` as a new user
- [ ] Verify all commands are correct
- [ ] Test each code snippet
- [ ] Fix any unclear instructions
- [ ] Add any missing troubleshooting scenarios

### Example Quality Check
- [ ] Code is simple and readable (no clever tricks)
- [ ] Comments explain key concepts
- [ ] File structure is logical
- [ ] Dependencies are minimal
- [ ] No unnecessary complexity

### Quick Reference Validation
- [ ] Review `QUICK_REFERENCE.md`
- [ ] Verify all commands work
- [ ] Check environment variables are correct
- [ ] Ensure workflow steps are accurate
- [ ] Test cheat sheet commands

---

## Phase 4: User Engagement Prep

### Target Identification (3-5 Engineers)
- [ ] Create target criteria:
  - [ ] Backend engineer (not prompt engineer)
  - [ ] Shipping LLMs to production (not prototyping)
  - [ ] Has existing CI/CD (GitHub Actions or similar)
  - [ ] Respects build failures (takes tests seriously)
  - [ ] Fears silent AI regressions

- [ ] Identify candidates:
  1. **Candidate 1:** _______________
     - Company: _______________
     - LLM use case: _______________
     - Contact: _______________
  
  2. **Candidate 2:** _______________
     - Company: _______________
     - LLM use case: _______________
     - Contact: _______________
  
  3. **Candidate 3:** _______________
     - Company: _______________
     - LLM use case: _______________
     - Contact: _______________
  
  4. **Candidate 4:** _______________ (optional)
  5. **Candidate 5:** _______________ (optional)

### Onboarding Materials
- [ ] Create initial outreach message template
- [ ] Prepare "Why this matters" pitch (30 seconds)
- [ ] Create onboarding checklist for users
- [ ] Set up support channel (email/Slack/Discord)
- [ ] Define availability for pairing sessions

### Measurement Plan
- [ ] Define success metrics:
  - [ ] Time to first snapshot (target: <10 minutes)
  - [ ] CI enforcement working (target: 100%)
  - [ ] Natural adoption after 7 days
  - [ ] Using enforcement language after 30 days

- [ ] Create tracking sheet:
  - [ ] Date started
  - [ ] Onboarding time
  - [ ] First snapshot recorded
  - [ ] First CI enforcement
  - [ ] Friction points encountered
  - [ ] Solutions implemented
  - [ ] Final adoption status

### Support Preparation
- [ ] Create FAQ document based on likely questions
- [ ] Prepare common error messages and solutions
- [ ] Set up quick response system
- [ ] Plan weekly check-ins with each engineer
- [ ] Prepare to fix enforcement blockers only (not features)

---

## Phase 5: 30-Day Validation (With Users)

### Week 1: Initial Setup
- [ ] Send onboarding materials
- [ ] Schedule kickoff call (30 min)
- [ ] Help install TraceForge
- [ ] Watch first snapshot recording
- [ ] Verify CI enforcement works
- [ ] Document any friction points
- [ ] Fix critical blockers immediately

### Week 2: Real Integration
- [ ] Check in mid-week
- [ ] Ask about integration with real app
- [ ] Watch how they use it naturally
- [ ] Note any workarounds they create
- [ ] Document questions asked
- [ ] Only fix enforcement blockers

### Week 3: Measure Adoption
- [ ] Observe PR review process
- [ ] Do they review cassette diffs?
- [ ] Do they commit snapshots naturally?
- [ ] Do they talk about enforcement?
- [ ] Are they saying "No live calls in CI"?

### Week 4: Assessment
- [ ] Final check-in with each engineer
- [ ] Ask explicit questions:
  - [ ] "Could you remove TraceForge now?"
  - [ ] "Would you recommend this to other teams?"
  - [ ] "What made it unavoidable (or not)?"
  - [ ] "What almost blocked you?"
- [ ] Collect quantitative data:
  - [ ] Snapshots committed
  - [ ] CI runs with strict mode
  - [ ] PRs with cassette changes
  - [ ] Build failures from missing snapshots
- [ ] Document success/failure for each user

---

## Success Criteria

### ✅ Example Validated (Phase 1-2)
- All commands work as documented
- CI enforcement functions correctly
- Failure scenarios are clear
- Documentation is accurate

### ✅ Ready for Users (Phase 3-4)
- Example is polished
- Support materials prepared
- 3-5 engineers identified
- Measurement plan defined

### ✅ Adoption Achieved (Phase 5)
After 30 days, engineers should say:
- **"We don't allow live AI calls in CI"** ✅
- NOT: "We use TraceForge" ❌

When they say the first thing, it's unavoidable.

---

## Immediate Next Action

**Right now, do this:**

```bash
# 1. Validate locally
cd examples/strict-ci-starter
npm install
npm run setup
npm test

# 2. Test without snapshot
rm .ai-tests/cassettes/openai/*.json
npm test  # Should fail

# 3. Record new snapshot (requires proxy + API key)
# (See Phase 1 checklist above)
```

---

## Progress Tracking

Last updated: 2025-01-01

- [x] Strategic fixes implemented
- [x] Comprehensive testing completed
- [x] Strict CI Starter example created
- [ ] **→ Local validation (YOU ARE HERE)**
- [ ] Real CI testing
- [ ] Documentation polish
- [ ] User identification
- [ ] 30-day validation

---

## Related Documents

- `STRICT_CI_COMPLETE.md` - What we built
- `NEXT_PHASE_PROGRESS.md` - Overall progress
- `examples/strict-ci-starter/README.md` - User guide
- `TESTING_SUMMARY.md` - Test results
- `docs/next-phase.md` - Original strategy
