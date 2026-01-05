# Engineer Identification & Onboarding Plan

**Date:** January 5, 2026  
**Goal:** Find 3-5 backend engineers for 30-day TraceForge validation  
**Success Metric:** They say "We don't allow live AI calls in CI" (not "We use TraceForge")

---

## Target Profile: The Ideal Candidate

### Must-Have Criteria ✅

**Technical:**

- Backend engineer (not prompt engineer, not data scientist)
- Currently shipping LLM features to production
- Has existing CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- Respects build failures (doesn't bypass red builds)
- Uses Node.js or can run Node.js in CI

**Organizational:**

- Has autonomy to modify CI configuration
- Works on a team (not solo developer)
- Ships frequently (weekly or more)
- Has production users affected by AI behavior

**Mindset:**

- Fears silent AI regressions
- Thinks in invariants and contracts
- Values reproducibility over speed
- Comfortable with enforcement, not just observation

### Red Flags ❌

**Avoid:**

- Prototyping/experimenting (not shipping to prod)
- No CI/CD infrastructure
- Solo developers (need team dynamics)
- Consultants/contractors (not long-term committed)
- "Move fast and break things" culture
- Observability/monitoring focus (need enforcement)
- Python-only shops (example is Node.js-focused)

---

## Where to Find Them

### High-Probability Channels

**1. Direct Network (Highest Quality)**

- Personal connections in backend engineering
- Former colleagues shipping LLMs
- Engineers who've asked about AI testing
- People you've helped with production issues

**2. Tech Communities**

- Backend engineering communities (not AI communities)
- Node.js/TypeScript communities
- CI/CD communities
- Production engineering groups

**3. Company Targeting**

- Startups with AI features (Series A-B)
- SaaS companies adding AI
- Developer tools companies
- Companies with public engineering blogs about AI

**4. Platforms**

- LinkedIn (backend engineers, AI in prod)
- Twitter/X (engineers discussing AI reliability)
- HackerNews (look for AI production war stories)
- Reddit r/ExperiencedDevs, r/nodejs

### Search Patterns

**LinkedIn Boolean Search:**

```
("backend engineer" OR "staff engineer" OR "senior engineer")
AND ("LLM" OR "GPT" OR "AI features" OR "machine learning")
AND ("production" OR "shipping")
AND ("CI/CD" OR "GitHub Actions")
```

**Twitter/X Search:**

```
from:engineers "AI" "production" "regression"
from:engineers "LLM" "testing" "reproducibility"
"backend engineer" "AI features" "production"
```

**HackerNews:**

- Comments on AI testing/reliability posts
- "Ask HN: How do you test LLM features?"
- War stories about AI regressions

---

## Outreach Strategy

### Initial Contact Template

**Subject:** Looking for backend engineers shipping LLMs (30-day validation)

**Body:**

```
Hi [Name],

I saw your work on [specific thing they did with LLMs].

Quick context: I built an execution record/replay layer for AI systems
that enforces reproducibility in CI. It makes AI behavior changes require
explicit approval (like code reviews, but for AI outputs).

I'm looking for 3-5 backend engineers shipping LLMs to production who want
to try it for 30 days. The goal: no live AI calls in CI, all behavior
changes visible in PRs.

Relevant if you:
✅ Ship LLM features to production
✅ Have CI/CD with GitHub Actions (or similar)
✅ Fear silent AI regressions
✅ Want AI behavior changes to be explicit

Not relevant if you:
❌ Are still prototyping
❌ Don't have CI/CD
❌ Want observability/monitoring tools

Takes <10 minutes to set up. If interested, I can walk you through it.

Thoughts?

[Your name]
```

### Follow-Up (If Interested)

**Subject:** TraceForge setup - 5 minutes

**Body:**

```
Great! Here's what you'll do:

1. Install: npm install -g @traceforge/proxy
2. Point your app: export OPENAI_BASE_URL=http://localhost:8787/v1
3. Record: TRACEFORGE_VCR_MODE=record npm test
4. Commit snapshots: git add .ai-tests/cassettes/
5. CI enforces: TRACEFORGE_VCR_MODE=strict in GitHub Actions

Example repo: [link to strict-ci-starter]

Want to schedule a 15-min call to walk through it?

Available times: [your availability]
```

---

## Qualification Questions

### Pre-Engagement Screening

Ask these before committing:

**1. Production Status:**

- "What LLM features are you shipping to production?"
- "How many users see these AI features?"

**2. CI/CD Infrastructure:**

- "What CI/CD platform do you use?"
- "How often do builds run?"

**3. Pain Points:**

- "Have you had an AI regression make it to production?"
- "How do you currently catch AI behavior changes?"

**4. Autonomy:**

- "Can you modify your CI configuration?"
- "Do you need approval to add build steps?"

**5. Commitment:**

- "Can you commit to 30 days of using this?"
- "Are you willing to have weekly 15-min check-ins?"

### Disqualifiers

If they answer:

- "Still in beta/prototype stage" → Not ready
- "No CI/CD yet" → Not suitable
- "I'd need to ask leadership" → Too much friction
- "Looking for monitoring tools" → Wrong use case
- "Can't commit 30 days" → Won't get real data

---

## Onboarding Process

### Week 1: Setup (Goal: First snapshot recorded)

**Day 1 - Initial Call (30 min):**

- Walk through example repo
- Explain enforcement concept
- Show failure scenarios
- Answer technical questions

**Day 2-3 - Installation:**

- Help install proxy
- Configure their first test
- Record first snapshot
- Commit to git

**Day 4-5 - CI Integration:**

- Add strict mode to CI
- Watch first enforcement
- Verify error messages clear
- Celebrate first working build

**Day 7 - Check-in (15 min):**

- How's it feeling?
- Any friction points?
- What's confusing?
- What would you change?

### Week 2-3: Real Usage (Goal: Natural adoption)

**Weekly Check-ins (15 min each):**

- How many snapshots committed?
- Any PRs with cassette diffs?
- Team reviewing behavior changes?
- Any bypasses attempted?
- What almost blocked you?

**Observe:**

- Do they commit snapshots naturally?
- Do they review cassette diffs in PRs?
- Do they talk about enforcement unprompted?
- Are they teaching teammates?

**Fix Only:**

- Enforcement blockers (hard stops)
- Not feature requests
- Not convenience items
- Not polish

### Week 4: Assessment (Goal: Measure unavoidability)

**Final Interview (30 min):**

**Adoption Questions:**

1. "Could you remove TraceForge now?"
2. "What would break if you did?"
3. "Do you talk about it with your team?"
4. "What language do you use?" (enforcement vs tool)

**Value Questions:**

1. "Did it catch any regressions?"
2. "How has PR review changed?"
3. "Do you trust AI changes more or less?"
4. "Would you recommend it?"

**Friction Questions:**

1. "What almost made you give up?"
2. "What was more painful than expected?"
3. "What needs to improve?"
4. "What would make it mandatory?"

---

## Measurement Framework

### Quantitative Metrics

**Setup Phase (Week 1):**

- Time to first snapshot (target: <10 min)
- Time to CI enforcement (target: <30 min)
- Installation issues encountered
- Support requests needed

**Usage Phase (Week 2-3):**

- Snapshots committed per week
- PRs with cassette changes
- CI builds run
- Build failures from missing snapshots
- Snapshot update frequency

**Adoption Phase (Week 4):**

- Engineers still using it (target: 5/5)
- Teams enforcing it (target: 100%)
- Natural language usage (target: >50% say "no live calls")

### Qualitative Indicators

**Week 1 - Setup:**

- ✅ "Oh, this is simple"
- ✅ "I see how this works"
- ❌ "This is confusing"
- ❌ "Too many steps"

**Week 2-3 - Usage:**

- ✅ "We caught a regression!"
- ✅ "PR reviews are better"
- ✅ "No live calls in CI"
- ❌ "This is annoying"
- ❌ "Can I bypass this?"

**Week 4 - Assessment:**

- ✅ "We require this now"
- ✅ "Other teams want it"
- ✅ "Can't imagine removing it"
- ❌ "Nice to have"
- ❌ "We might stop using it"

---

## Success Criteria

### Individual Engineer Success ✅

After 30 days, they:

1. Commit snapshots without being told
2. Review cassette diffs in PRs naturally
3. Say "no live calls in CI" unprompted
4. Can't easily remove TraceForge (breaks workflow)
5. Teach it to teammates

### Validation Success ✅

After 30 days with 3-5 engineers:

1. At least 3/5 still using it actively
2. At least 2/5 say "no live calls in CI"
3. At least 1 team requires it for merges
4. Zero bypasses due to friction
5. Clear list of enforcement blockers to fix

### Unavoidability Indicators ✅

**They've reached unavoidability when:**

- Removing it would break their CI
- They advocate for it to other teams
- They use enforcement language (not tool language)
- Snapshots are part of their mental model
- Team can't ship without cassette approval

**If this happens with 2+ engineers, we have a standard.**

---

## Resource Requirements

### Time Investment

**Per Engineer:**

- Setup call: 30 min
- Installation support: 1 hour spread over week 1
- Weekly check-ins: 15 min × 4 weeks = 1 hour
- Final interview: 30 min
- **Total: ~3 hours per engineer**

**For 5 Engineers:**

- Total time: 15 hours over 30 days
- ~3-4 hours per week
- Mostly scheduled calls and async support

### Support Channels

**Primary:**

- Scheduled Zoom/Google Meet calls
- Async Slack/Discord/Email

**Documentation:**

- Strict CI Starter README (done)
- Quick Reference Guide (done)
- Troubleshooting doc (create if needed)

**Availability:**

- Response time: <24 hours for questions
- Emergency support: Same day for blockers

---

## Iteration Plan

### After First Engineer (Days 7-10)

**Evaluate:**

- Was setup actually <10 minutes?
- What questions did they ask repeatedly?
- What was confusing in docs?
- Did any errors surprise them?

**Fix:**

- Update unclear documentation
- Add missing troubleshooting steps
- Clarify error messages if needed

### After All Engineers (Day 30)

**Analyze:**

- What patterns in friction?
- What made it sticky vs not?
- Which engineers reached unavoidability?
- What language do they use?

**Decide:**

- If 3+ successful: Expand to more engineers
- If 1-2 successful: Fix enforcement blockers, try again
- If 0 successful: Major pivot needed

---

## Next Steps

### This Week

1. **Identify 10-15 potential candidates**

   - LinkedIn search
   - Network outreach
   - Community scanning
   - Create candidate list

2. **Prepare outreach materials**

   - Finalize email templates
   - Create quick demo (5 min recording)
   - Set up scheduling link
   - Prepare FAQ doc

3. **Send initial outreach**

   - Start with warmest leads
   - Send 5-10 initial emails
   - Follow up on responses
   - Qualify interested engineers

4. **Schedule onboarding**
   - Book Week 1 calls
   - Send preparation materials
   - Set expectations
   - Confirm commitment

### Success Metrics

**This week:**

- Identify 10-15 candidates
- Send outreach to 5-10
- Get 3-5 interested
- Schedule 3-5 onboarding calls

**Next 30 days:**

- Onboard 3-5 engineers
- Support through usage
- Measure adoption
- Assess unavoidability

---

## Candidate Tracking Template

### Engineer #1

- **Name:** ******\_\_\_******
- **Company:** ******\_\_\_******
- **LLM Use Case:** ******\_\_\_******
- **CI Platform:** ******\_\_\_******
- **Contact:** ******\_\_\_******
- **Source:** ******\_\_\_******
- **Status:** Identified / Contacted / Interested / Onboarded / Active / Complete
- **Week 1 Notes:** ******\_\_\_******
- **Week 2 Notes:** ******\_\_\_******
- **Week 3 Notes:** ******\_\_\_******
- **Week 4 Assessment:** ******\_\_\_******
- **Outcome:** Success / Partial / Failed
- **Unavoidability Reached:** Yes / No

(Repeat for Engineers #2-5)

---

## Related Documents

- [examples/strict-ci-starter/README.md](examples/strict-ci-starter/README.md) - Example for engineers
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command cheat sheet
- [VALIDATION_CHECKLIST.md](VALIDATION_CHECKLIST.md) - Full validation plan
- [docs/next-phase.md](docs/next-phase.md) - Strategic context

---

**Status:** Ready to begin candidate identification  
**Next Action:** Search LinkedIn and network for 10-15 candidates  
**Goal:** 3-5 onboarded engineers by end of January 2026
