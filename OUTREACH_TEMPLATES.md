# Outreach Template Kit

**Purpose:** Templates for finding and onboarding engineers  
**Target:** Backend engineers shipping LLMs to production

---

## Email Templates

### Template 1: Cold Outreach (LinkedIn/Direct)

**Subject:** Testing AI in production - looking for backend engineers

**Body:**

```
Hi [Name],

I noticed [specific detail about their work with LLMs/AI].

I built an execution record/replay layer that makes AI behavior changes
require explicit approval in CI (like code reviews, but for AI outputs).

Looking for 3-5 backend engineers to validate it over 30 days.

You might be interested if you:
• Ship LLM features to production
• Have CI/CD (GitHub Actions, GitLab, etc.)
• Fear silent AI regressions

Takes <10 min to set up. I can walk you through it.

Example: [link to strict-ci-starter]

Interested in a quick chat?

Best,
[Your name]
```

---

### Template 2: Warm Introduction

**Subject:** Quick favor - know any backend engineers shipping LLMs?

**Body:**

```
Hey [Name],

Quick ask: Do you know any backend engineers currently shipping
LLM features to production?

I built something that enforces AI behavior reproducibility in CI,
and I'm looking for 3-5 engineers to validate it over 30 days.

Ideal person:
• Backend engineer (not data scientist)
• Shipping LLMs to prod
• Has CI/CD setup
• Fears silent AI regressions

If you know someone, I'd love an intro. Happy to explain more.

Thanks!
[Your name]
```

---

### Template 3: Community Post (HackerNews, Reddit)

**Title:** Show HN: Enforce AI behavior reproducibility in CI

**Body:**

```
I built TraceForge - an execution record/replay layer that makes AI
behavior changes require explicit approval in CI.

The problem: AI output changes silently. Prompt tweaks, model updates,
or API changes can alter behavior without anyone noticing.

The solution: Record AI executions, commit them to git, replay in CI.
Any behavior change shows up in PRs for review.

Example repo: [link]

Looking for 3-5 backend engineers shipping LLMs to try it for 30 days.

GitHub: [link]
Demo: [link]

Happy to answer questions!
```

---

### Template 4: Follow-Up (After Initial Interest)

**Subject:** TraceForge - Next steps

**Body:**

```
Hi [Name],

Great that you're interested! Quick next steps:

1. Check out the example: [link to strict-ci-starter]
2. Read the 5-min Quick Start
3. If it looks good, let's schedule 30 min to walk through setup

What I'm looking for:
• 30-day commitment to try it
• Weekly 15-min check-ins
• Honest feedback (especially friction points)

What you get:
• No live AI calls in CI (faster, free)
• All behavior changes visible in PRs
• Reproducible AI executions
• Help with setup and any issues

Available times this week:
• [Time slot 1]
• [Time slot 2]
• [Time slot 3]

Or suggest a time that works for you.

Thanks!
[Your name]
```

---

## LinkedIn Message Templates

### Initial DM (Connection Request)

**Message:**

```
Hi [Name], I saw your post about [LLM work]. I built something
for testing AI in production and looking for engineers to
validate it. Mind if I send details?
```

---

### Follow-Up After Connection

**Message:**

```
Thanks for connecting!

Quick context: I built an execution replay layer that makes
AI behavior changes require explicit approval in CI.

Looking for backend engineers shipping LLMs to try it for 30 days.

Relevant if you:
✅ Ship LLM features to production
✅ Have CI/CD with GitHub Actions
✅ Fear silent AI regressions

Example: [short link]

5-min setup. Interested in learning more?
```

---

## Twitter/X Thread Templates

### Thread 1: Problem Statement

```
1/ Silent AI regressions are terrifying.

You tweak a prompt. Deploy. Users see different behavior.
No one noticed in testing.

2/ Code changes require review. Tests verify behavior.
CI blocks broken code.

But AI output? Changes silently. No review. No verification.
Just hope it's fine.

3/ Built something to fix this: Record AI executions,
commit them, replay in CI.

Behavior changes show up in PRs. Just like code diffs.
Can't merge without approval.

4/ Looking for 3-5 backend engineers to validate this
over 30 days.

If you ship LLMs to prod and fear regressions, DM me.

Example: [link]
```

---

### Thread 2: Solution Focus

```
1/ What if AI behavior changes required the same approval
as code changes?

Introducing TraceForge: Execution record/replay for AI systems.

2/ How it works:
• Record AI calls during testing
• Commit execution snapshots to git
• Replay in CI (no live calls)
• Behavior changes = visible diffs

3/ In CI:
✅ With snapshot: Build passes (instant replay)
❌ Without snapshot: Build fails (enforcement)
📸 Changed output: PR shows diff (requires approval)

4/ Looking for validation: 3-5 backend engineers shipping
LLMs who want to try it.

30 days. Weekly check-ins. Honest feedback.

Interested? DM or check: [link]
```

---

## Slack/Discord Community Templates

### Post 1: Question Format

**Channel:** #backend, #ai-engineering, #production

**Message:**

```
Quick question: How do you catch AI behavior regressions before production?

Context: I'm shipping LLM features and just had a prompt change subtly
alter user-facing behavior. Tests passed. Code review passed. Users noticed.

Built something to prevent this (record/replay AI executions in CI).
Looking for engineers to validate it.

Anyone else dealing with this problem?
```

---

### Post 2: Direct Ask

**Channel:** #show-and-tell, #projects

**Message:**

```
Built: Execution record/replay for AI systems

Problem: AI output changes silently (prompt tweaks, model updates)
Solution: Record executions, commit to git, enforce in CI

Example: [link]

Looking for 3-5 backend engineers shipping LLMs to try it for 30 days.

Requirements:
• Ship LLM features to production
• Have CI/CD (GitHub Actions, etc.)
• Fear silent regressions

DM if interested!
```

---

## Scheduling Templates

### Calendar Invite

**Title:** TraceForge Setup Call - [Engineer Name]

**Description:**

```
Agenda:
1. Demo: Strict CI Starter example (10 min)
2. Walk through your setup (15 min)
3. Q&A and next steps (5 min)

Before the call:
• Review: [link to strict-ci-starter README]
• Note any questions

Zoom: [link]
```

---

### Pre-Call Email

**Subject:** Tomorrow's call - TraceForge setup

**Body:**

```
Hi [Name],

Looking forward to our call tomorrow at [time]!

To make it productive, please:
1. Clone the example: git clone [repo]
2. Read the Quick Start: [link]
3. Note any questions

We'll walk through:
• How it works (concept)
• Setup for your project
• CI integration
• What to expect over 30 days

Zoom: [link]

See you tomorrow!
[Your name]
```

---

## FAQ for Quick Responses

### Q: What does it cost?

**A:** Free and open source. No SaaS, no subscriptions. Runs locally.

### Q: What languages/frameworks?

**A:** Node.js for now. Works with any LLM provider (OpenAI, Anthropic, etc.)

### Q: How much time will this take?

**A:** Setup: <10 min. Weekly check-ins: 15 min. Otherwise: just use naturally.

### Q: What if it breaks our CI?

**A:** You control when it enforces. Can disable anytime. No lock-in.

### Q: Do you want feedback?

**A:** Yes! Especially friction points. I'll fix enforcement blockers immediately.

### Q: What happens after 30 days?

**A:** Up to you. Keep using it, stop, whatever. Looking for honest assessment.

### Q: Why are you doing this?

**A:** Testing if enforcement beats observability for AI reliability. Need real usage data.

---

## Response Scripts

### "Sounds interesting, but busy right now"

**Response:**

```
Totally understand. If timing changes, feel free to reach out.

In the meantime, here's the example: [link]

Takes 5 min to read, might solve a problem you're facing.

Good luck with [their project]!
```

---

### "We're still prototyping, not in production yet"

**Response:**

```
Makes sense! This is really for teams shipping to production.

If you reach that stage and want to prevent regressions from day 1,
reach out then. Good luck with the prototype!
```

---

### "We use Python, not Node.js"

**Response:**

```
Ah, current version is Node.js focused. Python support is possible
but not there yet.

If you're interested in the concept for Python, let me know.
Might prioritize based on demand.
```

---

### "This looks like overkill for our use case"

**Response:**

```
Fair! It's definitely for teams with specific concerns about AI behavior.

If you're not worried about silent regressions or don't need CI enforcement,
probably not the right fit.

Thanks for taking a look!
```

---

### "Can we just use [other tool]?"

**Response:**

```
[Other tool] is great for [their strength]. This is different:

They: Observability (watching what happened)
Us: Enforcement (preventing changes without approval)

If you need enforcement, not observation, happy to chat.
If observation is enough, stick with them!
```

---

## Tracking Responses

### Spreadsheet Columns

| Name | Company | Contact | Source | Date Reached | Status                                   | Next Step | Notes |
| ---- | ------- | ------- | ------ | ------------ | ---------------------------------------- | --------- | ----- |
|      |         |         |        |              | Contacted/Interested/Scheduled/Onboarded |           |       |

**Status Values:**

- **Contacted:** Initial outreach sent
- **Interested:** Positive response
- **Qualified:** Meets criteria
- **Scheduled:** Call booked
- **Onboarded:** Using TraceForge
- **Active:** Week 1-4 usage
- **Complete:** 30-day assessment done
- **Not interested:** Declined
- **Not qualified:** Doesn't meet criteria

---

## Usage Notes

**Best Practices:**

1. Personalize every message (mention specific work)
2. Keep it short (3-4 sentences max)
3. Link to example, not docs
4. Focus on problem, not solution
5. Make next step clear

**Response Timing:**

- LinkedIn DMs: 24-48 hours
- Emails: 48-72 hours
- Twitter DMs: Same day
- Follow-ups: 1 week after no response

**Qualification:**
Always ask:

1. "What LLM features are you shipping?"
2. "What CI platform do you use?"
3. "Can you commit 30 days?"

If any answer is wrong, politely decline.

---

## Related Documents

- [ENGINEER_IDENTIFICATION_PLAN.md](ENGINEER_IDENTIFICATION_PLAN.md) - Full plan
- [examples/strict-ci-starter/README.md](examples/strict-ci-starter/README.md) - Share this
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick commands

---

**Status:** Templates ready for use  
**Next:** Begin outreach to identified candidates
