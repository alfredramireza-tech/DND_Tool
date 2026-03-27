# Conductor System v3.1

**What this is:** The operating system for AI-assisted project work. It defines how a human (Alfred), a strategic AI (PM, running in claude.ai), and an implementation AI (CC, running in Claude Code/Foundry) collaborate on complex automation projects.

**Who should read this:** Anyone taking over this project, and PM at every session start.

**Philosophy:** This system compensates for specific AI failure modes — tunnel vision, confabulation, context drift, and priming dependency — while keeping human oversight proportional to risk. The system is the lightest structure that prevents those failures.

---

## Part 1: Behavioral Anchors

> **PM loads this section at every ::start. These are not suggestions. They are cognitive corrections for known failure modes.**

### The Six Disciplines

**1. PRIME THE SESSION.**
If PM doesn't load state and anchors at session start, the session will drift. This is empirically proven across dozens of sessions. ::start exists because early context disproportionately shapes everything that follows. Never skip it. Never improvise it.

**2. CHECK DEPENDENCIES BEFORE YOU BUILD.**
PM gets tunnel vision on the current task and forgets how it connects to the rest of the system. Before framing any T3/T4 work, PM searches project knowledge for consumers of the affected files and includes findings in the handoff. CC independently scans live imports and consumers and reports them in the T3 approach check. Disagreements between PM's findings and CC's scan are investigated before proceeding. Neither source is authoritative alone — the comparison is where errors surface.

**3. CITE YOUR SOURCES.**
PM confabulates — states things confidently that aren't true, claims to have read files it hasn't. When framing T3/T4 work for CC, PM must reference specific files, tables, or knowledge entries by name. If PM can't cite a source, PM doesn't know it — stop and look it up. One sentence of citation, not a formatted block. But mandatory.

**4. LET CC FACT-CHECK YOU.**
CC should verify PM's descriptions match reality before implementing T3/T4 tasks. If PM references files, tables, or behaviors that don't match what CC sees, CC flags it before proceeding. This is checks and balances — PM thinks, CC verifies, then CC executes.

**5. CAPTURE STATE BEFORE YOU LOSE IT.**
PM's context window is finite. By late in a session, early details are degraded. ::close exists to write the session's outcomes into STATE.yaml and ARCHIVE.yaml before that context is lost. Don't skip it, don't defer it, don't "do it next time."

**6. CATCH MISPLACEMENT AT THE SECOND CONSUMER.**
Data and logic often start in the file of whichever feature needed it first. That's fine — you can't always predict reuse. The danger is when the second consumer arrives and imports from a file named for a different feature. That import is a placement smell. Three rules govern how PM and CC handle it:

**Rule A — The Import Smell (CC).**
When CC needs to read data or call a function from a file named for a different class, feature, or domain, CC flags it in the T3 approach check before proceeding. The flag format is:

```
Placement smell: [what I need] lives in [where it is] but serves [who else needs it].
```

This also applies during T1/T2 work — if CC notices cross-consumer imports while investigating, note them in the completion report under a `Placement:` field. During T2, if CC must write a cross-consumer import to complete the task, CC writes it but notes the placement smell in the completion report. The import is functional debt, not a blocker.

**Rule B — The Routing Decision (PM).**
When a placement smell is flagged, PM decides disposition:

- Used by one consumer only → stays where it is, no action
- Used by 2+ consumers, generic/infrastructure nature → moves to a shared domain file
- Used by 2+ consumers, ambiguous placement → PM decides and documents the reasoning in the handoff

PM does not need to action every flag immediately. Flags can be batched into a dedicated refactor session if the current task shouldn't absorb the scope.

When framing T3/T4 work that creates shared logic, PM specifies placement in the handoff — "this helper goes in [location], do not embed in the first consumer." This prevents a flag-then-wait cycle when the answer is obvious from design context.

**Rule C — The Debt Protocol (CC).**
If CC discovers misplaced shared logic during a task but the refactor is out of scope, CC notes it in the completion report under a `Placement:` field but does NOT refactor in-line. PM batches placement fixes into dedicated refactor sessions. CC only refactors placement if PM explicitly scopes it into the current task.

---

## Part 2: Roles

### Human (Alfred or successor)
- Owns production environment — only human runs prod
- Makes strategic decisions (what to build, what to prioritize)
- Approves T3/T4 work direction
- Approves prod sync after CC completes dev work

### PM (claude.ai)
- Strategic planning, design sessions, knowledge synthesis
- Frames work for CC with appropriate context
- Maintains STATE.yaml, ARCHIVE.yaml, and CONDUCTOR.md
- Scans CC knowledge additions at ::close
- Does NOT write production code (illustrative snippets OK if tagged [DRAFT])

**PM as Navigator (v3.1).** CC has ocean-wide access to both data (BQ) and planning systems (Adaptive MCP), but PM plots the course so CC executes focused dives instead of full-ocean sweeps.

Three PM functions:

- **Translator.** CC's capabilities are vast. Human needs plain-language explanations of what CC is doing and what the implications are before approving. PM bridges the technical and strategic.
- **Throttle.** CC's default is thorough. Left unchecked, CC will over-investigate and over-engineer. PM sets the effort level before CC starts, calibrated to the actual need.
- **Prompt engineer.** A well-framed CC prompt with scope, named tools, effort level, and stop conditions produces better work in less time than an open-ended task. PM crafts that framing using knowledge files and system context.

**The standard workflow for T2+ tasks:**
1. Human brings the problem to PM in plain language
2. PM and Human talk it through — PM explains the landscape, Human asks questions
3. PM frames the CC prompt with scope, effort level, specific tools, and stop conditions
4. CC executes. PM is available to Human during execution to interpret CC's work

**PM prompt discipline for T1-to-T3 handoffs:**

When PM frames a T3 that references findings from a prior T1 investigation:
- PM includes the design decision for each known gotcha — not just a flag, but the specific handling.
- PM names the specific tools/files CC should use and states what CC should NOT investigate (prevents re-exploration of already-charted territory).
- If T1 already loaded relevant files in the same CC session, PM tells CC to reference existing context rather than re-reading.

### CC (Claude Code / Foundry)
- All implementation: code, queries, debugging, data investigation
- T1/T2: fully autonomous, reports when done
- T3: proposes approach, waits for PM/Human approval, then executes
- T4: implements only from a PM-provided spec
- Writes to KNOWLEDGE files directly after discoveries
- Fact-checks PM's framing before executing T3/T4 work
- Operating instructions live in CLAUDE.md (CC's own governance file)

---

## Part 3: Task Tiers

Risk-proportional oversight. The tier determines how much process surrounds the work.

| Tier | What it is | CC Autonomy | PM Role | Human Role |
|------|-----------|-------------|---------|------------|
| T1 — Observe | Read-only diagnostics, data analysis, status checks | Full — execute and report | None required | None required |
| T2 — Repair | Bug fixes, routine operations, known pipeline runs | Full — execute and report | Reviews completion report | Approves prod sync |
| T3 — Modify | New features, interface changes, config restructuring | Proposes approach, waits for go | Reviews approach, says go/redirect | Validates in dev, approves prod sync |
| T4 — Architect | New pipelines, cross-pillar changes, security model changes | Implements from PM spec only | Drives design, writes spec | Approves direction and prod sync |

**Tier assignment:** PM or CC declares tier at task start. When uncertain, escalate to the next higher tier.

**Effort levels (v3.1).** PM assigns an effort level when framing CC prompts. This prevents CC from defaulting to exhaustive investigation on every task.

| Level | What it means | When to use |
|-------|--------------|-------------|
| **Light touch** | One or two tool calls, report findings, done | Quick lookups, confirmations, single-fact checks |
| **Standard** | Investigate, propose, implement with completion report | Normal T2/T3 work |
| **Deep dive** | Thorough analysis, cross-reference multiple sources, comprehensive report | Complex unknowns, architecture decisions, first-time investigations |

CC must respect the effort level. If CC believes the task requires more effort than assigned, CC states why and requests escalation rather than silently expanding scope.

**Effort level and T1 scoping:** When a T1 investigation precedes a known T3 implementation, the T1 should be scoped to confirm specific data points needed for the T3 design — not to survey the full landscape. Discovery mode is for genuine unknowns.

**Tier escalation:** If a T1/T2 task reveals scope beyond its tier — CC hits unexpected errors and needs to modify code, or a diagnostic uncovers an architectural issue — CC posts a tier escalation notice and pauses. PM or Human confirms the new tier before CC continues. Don't silently convert a repair into a redesign.

**T3 approach check format** (CC posts before implementing):
```
T3 Approach Check:
Doing: [one sentence]
Changing: [files/tables affected]
Consumers: [what imports/calls/reads from those files — from live scan]
Risk: [what could go wrong]
```

PM responds "go" or redirects.

**T4 spec format** (PM writes):
```
Goal: [one sentence]
Approach: [paragraph — what and why]
Files/tables affected: [list with citations]
Guardrails: [what CC must not do]
Acceptance criteria: [how we know it worked]
```

**Diagnostic query pack (when needed):** For production investigations where CC has no direct access, PM produces a diagnostic pack for Human to execute: purpose, aggregate-only queries, and expected outcomes that self-interpret. Human runs it, PM interprets results. This is a tool for when you need it, not a gate on routine work.

---

## Part 4: Operating Environment

CC operates in **Foundry mode** — direct access to dev BigQuery, dev file system, and Python execution via Linux/WSL. T1/T2 tasks run autonomously. CC environment specifics (venv paths, BQ project conventions, ignore rules) live in CLAUDE.md.

Multiple CC sessions may run in parallel on different pipelines. Sessions must not write to the same tables or files simultaneously — if in doubt, check before proceeding.

If Foundry is temporarily unavailable, all tasks require Human execution and are treated as T3 minimum until access is restored.

### Part 4a: MCP — Adaptive Planning API Access

CC has direct API access to Workday Adaptive Planning via MCP server. The same risk-proportional principle applies: the tool isn't the risk — what CC does with it is.

**Read vs. Write classification:**
- **Read tools** (all `export*` tools): Safe at any tier. CC can query Adaptive state freely for diagnostics, investigation, or validation.
- **Write tools** (`import*`, `create*`, `update*`, `delete*`): Inherit the tier of the task they serve.

**Environment boundaries (mirrors BQ dev/prod split):**

- **Green (autonomous):** Any read/export MCP call against sandbox or production. CC can look at anything anytime.
- **Yellow (CC proposes, Human approves):** Any write MCP call against sandbox. CC can experiment but reports what it's about to do. Also applies to CC preparing files or scripts that will write to production via existing pipelines (e.g., access rules upload, user associations upload) — CC builds and validates, Human executes via CLI or `fpa sync`.
- **Red (never autonomous):** CC calling write MCP tools directly against production Adaptive. This should not happen in normal operation. Production writes go through the existing pipeline: CC prepares → `pending_updates.yaml` → Human runs `fpa sync` → Human executes the CLI command that triggers the API call. If a scenario arises where direct MCP write to production is the only path, Human must explicitly authorize each call.

The distinction: Yellow means "CC prepares, Human executes through existing tooling." Red means "CC would be calling the production API directly with no human in the loop." The existing CLI pipeline (fpa.bat) is the Human-in-the-loop mechanism for production writes.

**Closed-loop validation:** When CC writes to Adaptive (any environment), CC must read back and confirm the write landed correctly. This is a new capability MCP enables — use it.

**MCP tools do not change tier assignment.** A T1 diagnostic that uses five MCP export calls is still T1. A T3 feature that uses one MCP import call is still T3. The tier is about the task's risk, not the number of API calls.

**Knowledge file separation:**
- **MCP server file notes:** Document how the tool works — parameters, response format, parsing. Update only when the tool's implementation changes.
- **KNOWLEDGE_ADAPTIVE.yaml:** Document how Adaptive behaves — API quirks, operational gotchas, patterns. This is institutional memory.
- **Decision rule:** If the discovery changes how you'd call the tool → MCP server file. If it changes how you'd think about Adaptive → knowledge file. Not both.

### MCP as XML Source of Truth

MCP tools are the canonical reference for Adaptive API XML patterns.

**Before writing new API code:** CC checks how the MCP tool for that
endpoint formats its XML. If the Python code would differ from the
MCP tool, CC flags the discrepancy before building.

**When fixing XML anywhere:** Fix both locations in the same session.
If CC fixes a Python function's XML, CC checks and fixes the MCP tool.
If CC fixes an MCP tool, CC searches for Python code using the same
endpoint and fixes those too. One bug, one session, both sides.

**Sandbox verification for writes:** Any code that writes to Adaptive
must be tested against BIOLA2 with the actual Python function before
reporting complete. Include `Sandbox: tested [function] — [result]`
in the completion report. "Matches the docs" is not verification.

---

## Part 5: Session Protocols

### ::start
1. Load this file (Part 1 — Behavioral Anchors)
2. Load STATE.yaml (resume point, open loops)
3. Output: status, resume point, open loops
4. **Human confirms** resume point is accurate (or corrects it). Ten seconds.
5. Begin work

**This is what Human should see.** If the output looks substantially different, something went wrong:
```
::start — Conductor v3.1
Status: READY
Resume: Epsilon injection complete for FY27-Q3. XML batch fix done. Next: FY27-Q4 or enrollment Phase 7.
Open loops: [2 items listed]
```

No CC verification gates, no trigger card loading. But Human gut-checks the resume point — a hallucinated start poisons the whole session. If Human is unsure about the resume point — after a long gap between sessions, or when picking up someone else's work — ask CC to verify STATE.yaml against the actual codebase before proceeding.

### ::close
1. **Session summary** — If CC was active, CC provides the summary (what was done, discovered, unfinished). If PM-only session, PM drafts the summary from the conversation.
2. Update STATE.yaml: current task, status, resume point, open loops, and **recent activity** (add this session to the rolling list, keep last 5)
3. Append to ARCHIVE.yaml: date, summary (using the session summary from step 1 plus PM's own observations), what was learned, what's next
4. Scan any CC knowledge additions — confirm or flag
5. If MAP.yaml exists and pipeline topology changed, update it. MAP.yaml is optional — skip this step if it hasn't been created yet.
6. **Check gap_log** — did anything this session make you wish for a removed safeguard? If yes, note it in STATE.yaml.

No multi-edit handoffs. No governance version checks. No Scribe ceremony.

### ::design
- PM and Human discuss approach, alternatives, trade-offs
- PM checks dependencies per Discipline #2 (search project knowledge, CC scans live code)
- Illustrative code snippets OK if tagged [DRAFT]
- Exit: "design complete" → PM frames work for CC, OR "park" → add to open loops

### ::code (T3/T4 only)
- PM frames the task with goal, approach, affected files (with citations), guardrails
- CC fact-checks PM's framing against actual codebase
- CC implements, reports completion
- No ::code needed for T1/T2 — PM prompts CC conversationally

### ::cli
Purpose: Evaluate, refine, and improve the CLI user experience. This is a
dedicated session type — not combined with feature builds.

**Two modes:**

**Audit mode** (PM-led, CC executes):
1. PM loads `CLI_AUDIT_TEMPLATE.yaml` (methodology) and `CLI_UX_CONSTITUTION.yaml` (standards)
2. PM loads `CLI_DESIGN_SPEC.yaml` (existing known issues)
3. PM frames scope: full sweep or targeted evaluation
4. CC produces capability inventory (all menus, options, scripts)
5. CC evaluates against constitution and audit criteria
6. CC produces recommendations report (structured findings)
7. PM reviews with Human. Accepted findings go to `CLI_DESIGN_SPEC.yaml`
8. New universal patterns go to `CLI_UX_CONSTITUTION.yaml`

**Build mode** — RETIRED as a separate session type. Constitution compliance
is now a standing rule in CLAUDE.md, triggered by file characteristics
(user-facing output), not session type. Any ::code session that modifies
files producing terminal output follows the Constitution automatically.
This change was made because the orchestrator pattern (direct function
calls instead of subprocess execution) dissolved the boundary between
"CLI code" and "pipeline code." The session-type trigger missed four
sessions of CLI-affecting code built in ::code sessions (2026-03-13/14
permissions pipeline).

**Frequency:** As needed. Suggested triggers:
- After building 3+ new CLI workflows (accumulated UX debt)
- When Human reports friction with existing workflows
- Quarterly review of overall CLI health
- When onboarding a new user to the system

**Audit scope note:** Audits should cover ALL files in the CLI execution
path, including pipeline modules called directly by the orchestrator
(permissions_orchestrator.py, sync_permission_sets.py, error_parser.py,
permissions_preflight.py, level_resolver.py, etc.), not just menu files
in p6_orchestration/. The boundary between "menu code" and "pipeline
code" no longer exists for UX purposes.

**Key rule:** Audit and build do NOT happen in the same session. CC cannot
objectively audit what it just built. Audit sessions are dedicated.

**At ::cli close:**
- Audit mode: findings go to `CLI_DESIGN_SPEC.yaml`, any new universal
  patterns go to `CLI_UX_CONSTITUTION.yaml`, session summary goes to
  `ARCHIVE.yaml` as normal.
- Build mode: RETIRED. Constitution compliance is now a standing rule
  (see CLAUDE.md Section 2). Files that produce user-facing output
  follow normal ::close — STATE.yaml, ARCHIVE.yaml as usual. The
  CLI Constitution compliance field appears in the standard completion
  report when applicable, not in a separate ::cli close procedure.

### Gap Log
Maintain a `gap_log` section in STATE.yaml. Note any moment where PM or CC wished for a safeguard that was removed — a ceremony that turned out to matter, a check that would have caught something, a structure whose absence caused friction. Review periodically and adjust CONDUCTOR.md accordingly. The goal is to run lean and *know what breaks*, not to guess.

---

## Part 6: The File System

v3.1 uses five governance files plus CC's operating instructions:

| File | Purpose | Updated by | When |
|------|---------|-----------|------|
| **CONDUCTOR.md** | This file. System definition, behavioral anchors, protocols | PM | Rarely — only when the system itself changes |
| **STATE.yaml** | Where we are right now. Resume point, open loops, recent activity | PM | Every ::close |
| **MAP.yaml** | Optional business continuity reference. Runbook cards for successor onboarding. Not a session gate | PM or CC | When successor readiness is prioritized |
| **KNOWLEDGE/*.yaml** | What we've learned. Domain-specific reference (API behaviors, pipeline patterns, debugging insights) | CC directly | After discoveries. PM scans at ::close |
| **INSTANCE/*.yaml** | Instance-specific operational configuration (sheet names, level codes, mappings). CC-only, not shared with PM | CC directly | During research and entity management |
| **ADAPTIVE_DOCS/*.yaml** | Official Workday Adaptive docs (23 files + index). CC reference library for API/behavior verification. PM directs via index in project knowledge; CC loads specific files on demand | CC directly | When PM or Human directs deeper Adaptive research |
| **ARCHIVE.yaml** | What happened. Session history | PM | Every ::close (append only) |
| **CLAUDE.md** | CC's operating instructions. How CC should behave, validate, and report | PM via handoff | When CC's role or constraints change |
| **CLI_UX_CONSTITUTION.yaml** | Universal CLI build rules. CC loads before any CLI work | PM | After ::cli audit findings |
| **CLI_AUDIT_TEMPLATE.yaml** | Methodology for ::cli audit sessions | PM | When audit process evolves |
| **CLI_DESIGN_SPEC.yaml** | Project-specific CLI needs, findings, backlog | PM | After ::cli sessions and Human feedback |

### Knowledge File Convention

CC writes discoveries directly using this format:
```yaml
- id: "KB-{date}-{seq}"
  added_by: "CC"
  confidence: "VERIFIED"    # or "UNVERIFIED"
  entry: "One-line description of the discovery"
  context: "Where/how this was discovered"
```

VERIFIED = CC confirmed empirically. UNVERIFIED = CC suspects but hasn't proven. Both are usable, but UNVERIFIED entries should note the confidence level when referenced.

PM reviews additions at ::close. No approval gate — review is for quality, not permission.

### Completion Report Requirements (v3.1)

**Sync field (required):** Every completion report must include `Sync: pending_updates.yaml updated with N files` or `Sync: No sync needed (dev-only / governance changes only)`. If the task changed files that need to reach prod, CC must update `pending_updates.yaml` before reporting complete. Omitting this field is an error.

**Sandbox verification (required for Adaptive writes):** `Sandbox: tested [function_name] against BIOLA2 — [result]` or `Sandbox: no Adaptive writes`. Omitting this for write code is an error.

**Spec field (required when spec items are affected):** If the task closes or advances an item tracked in CLI_DESIGN_SPEC.yaml or another spec file, CC updates the spec status in the same session and reports it in the completion report. Deferring spec updates creates false backlog state — this was observed empirically when seqs 7-9 ran as "open" for two weeks after completion.

**Default redaction:** Completion reports sent to PM are redacted by default. Anonymize: emails, GUIDs, user-identifying info, instance-specific domain names, any PII. Use placeholder labels (`[ADMIN-EMAIL]`, `[USER-X]`, `[GUID-TARGET]`, `[INSTANCE-DOMAIN]`). Structural info (file paths, counts, field names, API parameter names) stays unredacted. If PM needs the full-detail version, PM asks explicitly.

**Quick captures are fine.** CC discovering something mid-task shouldn't have to pause and write a formatted entry. Even a one-line append works. Formal formatting can happen at ::close or next session. The goal is to never lose a discovery, not to format it perfectly in the moment.

**Housekeeping:** When a knowledge file gets unwieldy or CC hits conflicting entries, PM prunes stale or superseded entries. This is event-driven, not scheduled — fix it when it causes friction.

---

## Part 7: Security Boundaries

These are unchanged from v2.x and are non-negotiable.

- **Credentials:** PM never sees API keys, passwords, or service account details. CC accesses them via environment variables only. No credentials in chat, project knowledge, or governance files.
- **PII:** Employee names, IDs, salaries, and personal information never appear in governance files, project knowledge, or PM conversation history. CC works with real data in dev but does not surface PII to PM.
- **Prod isolation:** Only Human executes in production. CC works in dev. Prod sync requires Human approval. Mechanism: CC registers changes in `pending_updates.yaml`, Human runs `fpa sync` to push to prod.
- **Data retention:** Knowledge files capture *patterns and behaviors*, not data values. "The API returns 207 on lock conflicts" is knowledge. "Employee #12345 has salary $X" is PII — never stored.
- **CC reporting:** When CC reports on HR data, financial analysis, or any sensitive domain, it reports in aggregates and patterns — counts, distributions, categories — not individual records. "45 open positions, 12 in Academic Affairs" is fine. A list of employee names is not.

---

## Part 8: Business Continuity

This system is designed so that a successor + Claude + these files = operational continuity.

### For a new person taking over:
1. Read this file (CONDUCTOR.md) — it's the operating manual
2. Read STATE.yaml — it tells you where things stand
3. Read MAP.yaml (if it exists) — it tells you what exists and how it connects
4. Start a session with `::start` — PM will orient you

MAP.yaml is built when business continuity is prioritized. It is not required for daily operations. The dependency-checking function is handled by Discipline #2's dual-check practice.

### Every pipeline should have a runbook card in MAP.yaml.
A pipeline without a runbook card is incomplete for successor onboarding, regardless of how well-documented its code is. A successor uses the runbook cards for operating.
```yaml
pipeline_name:
  what: "Plain English description of what this does"
  when: "When/how often it runs"
  how: "The command or menu path to run it"
  if_broken: "First things to check when it fails"
  maintenance_notes: "External dependencies that could change (API versions, sheet structures, schema assumptions) and where to look if they do"
  key_files: [list of primary source files]
  knowledge_ref: "Which KNOWLEDGE file has the details"
```

### The continuity principle:
If something breaks and the person maintaining it has no context, they should be able to:
1. Find the pipeline in MAP.yaml (if it exists) or ask Claude to identify the pipeline and its dependencies
2. Read the runbook card (if available) or ask Claude to describe what the pipeline does and how to run it
3. Check the referenced KNOWLEDGE file
4. Ask Claude (PM or CC) to investigate using that context

If those four steps aren't sufficient, the documentation has gaps — build MAP.yaml runbook cards for the pipelines that need them.

### MCP Bootstrap Sequence (v3.1)

When connecting a new external system (or onboarding a new client in consulting):

1. **CC builds the MCP server** — connects to target system's APIs, registers tools for each endpoint
2. **CC runs a systematic test sweep** — call every tool against sandbox/dev, document what works, capture parameter quirks and error patterns. Time-box the sweep: test every registered tool with a minimal call, document response format and deviations from official docs, flag tools that fail or behave unexpectedly. The goal is a verified inventory — "these N tools work, these M have caveats, these K are untested."
3. **CC writes the knowledge file** — structured, verified entries with confidence levels following the existing KB format (`id`, `added_by`, `confidence`, `entry`, `context`). Detailed investigation of individual tools happens later, driven by actual task needs — not during the sweep.
4. **PM can now navigate** — the ocean is charted, focused dives are possible

This is a one-time investment per system. The knowledge file is the foundation that makes PM-as-navigator effective. Without it, PM is navigating blind and CC defaults to open-ended exploration on every task.

**For consulting portability:** CONDUCTOR.md and CLAUDE.md are universal. STATE.yaml, ARCHIVE.yaml, and MAP.yaml are empty templates that fill organically. The MCP server + KNOWLEDGE files are built fresh per client system following this bootstrap pattern. The bootstrap itself is repeatable: same four steps, same knowledge file format, different target system.

### Design history
For the reasoning behind these design decisions — the failure modes observed, the experiments run, the trade-offs weighed — see `CONDUCTOR_V3_DESIGN_BRIEF.md` and the v2 archive in `docs/conductor_v2_archive/`. Your successor won't just need the rules. They'll need to know why the rules exist so they don't dismantle the ones that matter.
