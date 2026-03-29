# SPEC_AUDIT_SYSTEM — Automated Health Checks + Manual Audit Framework

**Status:** Draft — awaiting review  
**Scope:** Automated data integrity checks, global health indicator, expanded admin panel, manual audit checklists for CC  
**Files affected:** `js/home.js` (admin panel), `js/audit.js` (new), `js/dashboard.js` (indicator), `js/dm-screen.js` (indicator), `styles.css`, `index.html`

---

## Overview

The codebase has grown past ad-hoc testing. This spec creates two complementary systems:

1. **Automated checks** — a battery of data integrity and mechanical correctness tests that run in-app, report results on an admin screen, and surface a small green/red indicator on every screen.

2. **Manual audit checklists** — structured CC-facing checklists organized by category, stored as a reference spec. CC runs these on demand as dedicated audit sessions.

---

## Part 1: Automated Health Checks

### What Gets Checked

The automated suite tests data integrity and mechanical correctness that can be verified without human judgment. Each check returns pass/fail with a description of what failed.

**Category A — Character Data Integrity (per character, run for every saved character):**

- A1: `abilityScores` has all 6 abilities (str, dex, con, int, wis, cha) with numeric values between 1 and 30
- A2: `hp.max` is a positive number; `currentHp` is between 0 and effective max HP (including maxHpBoost)
- A3: `level` is between 1 and 20
- A4: `proficiencyBonus` matches expected value for level (2 at 1–4, 3 at 5–8, 4 at 9–12, 5 at 13–16, 6 at 17–20)
- A5: `savingThrows` array contains only valid ability abbreviations and matches CLASS_DATA for the character's class
- A6: `skillProficiencies` contains only valid skill names (from SKILLS constant)
- A7: `spellSlots` matches the expected slot table for the character's class and level (full/half/third caster, or empty for non-casters)
- A8: `equippedItems` — no duplicate armor, no duplicate shield
- A9: `equippedItems` — attunement count does not exceed 3
- A10: `cantripsKnown` count does not exceed class maximum for level
- A11: `preparedSpellCount` matches expected formula for the class (level + casting mod for Cleric/Wizard, floor(level/2) + mod for Paladin, fixed count for AT/EK from CLASS_DATA)
- A12: `charges.current` does not exceed `charges.max` on any equipment item
- A13: `dailyUses.current` does not exceed `dailyUses.max` on any equipment item
- A14: `weapons` array — each weapon has name, ability, damage, damageType
- A15: `quickItems` — all entries are objects with `name` property (migration integrity from string[])
- A16: No `NaN`, `undefined`, or `null` in fields that should be numeric (hp.max, level, ac, speed, proficiencyBonus)
- A17: `expertiseSkills` — every expertise skill is also in `skillProficiencies` (can't have expertise without proficiency)
- A18: `class` is a recognized class name in CLASS_DATA
- A19: Hit dice type matches class (`hp.hitDiceType` === CLASS_DATA[class].hitDice)
- A20: Hit dice count equals level (`hp.hitDiceCount` === level)

**Category B — Equipment Pipeline Integrity (per character):**

- B1: `getEffectiveAbilityScore(c, ab)` returns a number for all 6 abilities (no NaN)
- B2: `getEffectiveMod(c, ab)` returns a number for all 6 abilities
- B3: `getEquipSaveBonus(c, ab)` returns a number (not NaN) for all 6 abilities
- B4: `calculateAC(c)` returns a positive number
- B5: For each equipped item with `requiresAttunement && !attuned`, verify `isItemActive` returns false
- B6: For each equipped item with `requiresAttunement && attuned`, verify `isItemActive` returns true
- B7: For each equipped item without `requiresAttunement`, verify `isItemActive` returns true
- B8: Spell save DC computed from `getEffectiveMod` matches what the dashboard would display (8 + prof + effective casting mod)

**Category C — DM Screen Data Integrity:**

- C1: `encounters` array — each encounter has id, name, initiative array, round (number), active (boolean)
- C2: Active encounter count is 0 or 1 (never 2+ active encounters)
- C3: `quickMonsters` — each template has name, ac (number), maxHp (number or string formula)
- C4: No encounter has both `active: true` and `round: 0` with an empty initiative list that's been left dangling
- C5: Password hash exists and is a string

**Category D — Cross-Reference Integrity:**

- D1: Every spell name in `cantripsKnown` resolves via `getSpell()` (no orphan references)
- D2: Every spell name in `currentPreparedSpells` resolves via `getSpell()`
- D3: Every spell name in `domainSpells` (all levels) resolves via `getSpell()`
- D4: For Wizard characters, every spell in `spellbook` resolves via `getSpell()`
- D5: For Rogue AT / Fighter EK, every spell in `spellsKnown` resolves via `getSpell()`
- D6: Every skill in `skillProficiencies` matches a skill name in the SKILLS constant (case-insensitive)

### Performance Characteristics

These checks iterate stored data and call pure functions — no DOM manipulation, no network calls, no file I/O. Expected runtime for a typical setup (3–5 characters, 1 DM screen with a few encounters): under 50ms. This is effectively free to run on every page load.

If future checks add DOM inspection or heavier computation, gate those behind the on-demand run only and mark them with a `heavyCheck: true` flag so the page-load runner can skip them.

### Check Result Format

Each check returns:
```js
{
  id: "A4",
  category: "Character Data",
  description: "Proficiency bonus matches level",
  status: "pass" | "fail" | "warn",
  detail: null | "Thorin: profBonus is 2 but level 5 expects 3",
  characterName: "Thorin" | null  // null for non-character checks
}
```

**Status levels:**
- `pass` — check passed
- `fail` — data integrity problem that indicates a bug or corruption
- `warn` — suspicious but not necessarily wrong (e.g., a character at 0 HP with no death saves — could be intentional)

### Runner Function

**Location:** `js/audit.js` (new file)

```js
function runAuditChecks() {
  var results = [];
  var chars = loadAllCharacters();
  
  chars.forEach(function(rawChar) {
    var c = migrateCharacter(rawChar);
    results = results.concat(runCharacterChecks(c));
    results = results.concat(runEquipmentPipelineChecks(c));
    results = results.concat(runCrossReferenceChecks(c));
  });
  
  results = results.concat(runDmScreenChecks());
  
  // Store results and timestamp
  var summary = {
    timestamp: Date.now(),
    total: results.length,
    passed: results.filter(function(r) { return r.status === 'pass'; }).length,
    failed: results.filter(function(r) { return r.status === 'fail'; }).length,
    warnings: results.filter(function(r) { return r.status === 'warn'; }).length,
    results: results
  };
  
  localStorage.setItem('dnd_audit_results', JSON.stringify(summary));
  return summary;
}
```

Each category (A, B, C, D) has its own function (`runCharacterChecks`, `runEquipmentPipelineChecks`, `runDmScreenChecks`, `runCrossReferenceChecks`) that returns an array of result objects.

### When Checks Run

**On every page load:** Call `runAuditChecks()` after `init()` completes. Since runtime is under 50ms, this adds no perceptible delay.

**On demand:** A "Run Audit" button on the admin screen calls `runAuditChecks()` and refreshes the results display.

**After significant state changes:** Optionally call after level-up complete, long rest, or character import. Not required for v1 — page-load coverage is sufficient since any state change triggers a dashboard re-render which reloads the page context.

---

## Part 2: Global Health Indicator

### Visual Design

A small icon in the **top-right corner** of every screen, always visible:

- **Green ✓** — all checks passed (0 failures, 0 warnings)
- **Yellow ⚠** — warnings but no failures
- **Red ✗** — one or more failures detected

The icon is a small fixed-position element (24×24px), subtle enough not to distract during gameplay but visible enough to notice when red.

### Implementation

**Location:** Rendered once in `index.html` as a fixed-position element, updated by `js/audit.js`.

```html
<div id="audit-indicator" class="audit-indicator" onclick="showAdminPanel()">✓</div>
```

```css
.audit-indicator {
  position: fixed;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  z-index: 1000;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.audit-indicator:active { opacity: 1; }
.audit-pass { background: rgba(106,170,90,0.2); color: #6aaa5a; }
.audit-warn { background: rgba(196,163,90,0.2); color: #c4a35a; }
.audit-fail { background: rgba(196,90,90,0.2); color: #c45a5a; }
```

**Update function:**

```js
function updateAuditIndicator() {
  var el = document.getElementById('audit-indicator');
  if (!el) return;
  var raw = localStorage.getItem('dnd_audit_results');
  if (!raw) { el.className = 'audit-indicator audit-pass'; el.textContent = '✓'; return; }
  var summary = JSON.parse(raw);
  if (summary.failed > 0) {
    el.className = 'audit-indicator audit-fail';
    el.textContent = '✗';
  } else if (summary.warnings > 0) {
    el.className = 'audit-indicator audit-warn';
    el.textContent = '⚠';
  } else {
    el.className = 'audit-indicator audit-pass';
    el.textContent = '✓';
  }
}
```

Called after `runAuditChecks()` and on page load.

### Tapping the Indicator

Tapping the indicator opens the admin panel (calls `showAdminPanel()`). The admin panel requires the admin password ("tis") before showing results — this prevents players from seeing internal diagnostics.

---

## Part 3: Expanded Admin Panel

### Current State

The admin panel (`showAdminOptions()` in `js/home.js`) currently shows one button: "Reset DM Password."

### Expanded Layout

After entering the admin password, show:

```
╔══════════════════════════════════════════╗
║           Admin Panel                    ║
╠══════════════════════════════════════════╣
║                                          ║
║  ──── System Health ────                 ║
║  Last run: 2 minutes ago                 ║
║  ✓ 47 passed  ⚠ 1 warning  ✗ 0 failed  ║
║  [Run Audit Now]                         ║
║                                          ║
║  ──── Failed Checks ────                 ║
║  (none — or list of failures)            ║
║                                          ║
║  ──── Warnings ────                      ║
║  A11: Thorin — cantrips known (4)        ║
║       exceeds Cleric max for level 4 (3) ║
║                                          ║
║  ──── Admin Actions ────                 ║
║  [Reset DM Password]                     ║
║  [Change Admin Password]                 ║
║                                          ║
║  [Close]                                 ║
╚══════════════════════════════════════════╝
```

### Change Admin Password

Currently the admin password is hard-coded as `ADMIN_HASH = simpleHash('tis')`. Add a "Change Admin Password" flow:

1. Store the admin hash in localStorage (`dnd_admin_hash`) instead of hard-coding
2. On first use (no stored hash), fall back to the hard-coded default `simpleHash('tis')`
3. "Change Admin Password" button shows a modal: current password, new password, confirm new password
4. On success, store the new hash in localStorage
5. The hard-coded `ADMIN_HASH` becomes a fallback only — if localStorage has a hash, use that; otherwise use the default

### Results Display

Show failed checks first (red), then warnings (yellow). Each entry shows:

```
[A4] Thorin — Proficiency bonus is 2 but level 5 expects 3
```

Format: `[check ID] character name (if applicable) — detail message`

Group by category with headers: "Character Data", "Equipment Pipeline", "DM Screen", "Cross-Reference".

Passed checks are hidden by default — add a "Show all passed" toggle at the bottom if the user wants to see everything.

---

## Part 4: Manual Audit Checklists (CC Reference)

These checklists are for CC to run during dedicated audit sessions. They test things that can't be automated — UI behavior, D&D mechanical correctness against PHB, code architecture, and UX quality. Store these in the spec as reference; CC reads them at the start of an audit session.

**Audit protocol:** Audit and build do NOT happen in the same session. CC cannot objectively audit what it just built. Audit sessions are dedicated — findings go into a report, fixes happen in subsequent handoffs.

### Checklist 1: D&D Mechanical Accuracy (PHB Compliance)

Run after any class implementation, level-up changes, or equipment system changes.

**Ability Scores & Modifiers:**
- [ ] All 6 ability modifiers compute correctly: floor((score - 10) / 2)
- [ ] Ability score overrides from equipment apply only when higher than base
- [ ] Ability score bonuses from equipment stack on top of the higher of base/override
- [ ] Effective ability scores are NOT capped at 20 (magic items can exceed)
- [ ] Base scores are never overwritten by effective scores in the character object

**Proficiency & Saves:**
- [ ] Proficiency bonus matches PHB table for each level (2/3/4/5/6)
- [ ] Each class has correct saving throw proficiencies per PHB
- [ ] Save roll = d20 + ability mod + proficiency (if proficient) + equipment save bonus
- [ ] Equipment save bonus applies to saves only, NOT ability checks
- [ ] Expertise doubles proficiency on skill checks, not saves

**AC Calculation:**
- [ ] Heavy armor: base AC from armor, ignores DEX
- [ ] Medium armor: base AC + DEX mod (max +2)
- [ ] Light armor: base AC + full DEX mod
- [ ] No armor: 10 + DEX mod (or unarmored defense formula for Barbarian/Monk)
- [ ] Shield adds +2 (or shield item's acBonus + magic bonus)
- [ ] Unarmored Defense: Barbarian = 10 + DEX + CON; Monk = 10 + DEX + WIS
- [ ] Barbarian unarmored defense does NOT work with shields (per CLASS_DATA flag)

**Spell System:**
- [ ] Spell save DC = 8 + proficiency + casting ability mod (effective)
- [ ] Spell attack = proficiency + casting ability mod (effective)
- [ ] Full caster slots match PHB table (Cleric, Wizard)
- [ ] Half caster slots match PHB table (Paladin)
- [ ] Third caster slots match PHB table (Eldritch Knight, Arcane Trickster)
- [ ] Prepared spell count: Cleric/Wizard = level + casting mod; Paladin = floor(level/2) + mod
- [ ] Domain/oath spells are always prepared and don't count against limit
- [ ] Cantrip count matches PHB for class and level
- [ ] Cantrip damage scaling at levels 5, 11, 17

**Class Features (per class):**
- [ ] Channel Divinity uses: 1 at level 2, 2 at level 6 (Cleric); 1 at level 3 (Paladin)
- [ ] Extra Attack: correct number of attacks per class and level
- [ ] Sneak Attack dice: ceil(level / 2)d6
- [ ] Spell Mastery: at-will casting at lowest level, voluntary upcast uses a slot
- [ ] Ki points = Monk level
- [ ] Rage uses match PHB table per Barbarian level
- [ ] Each resource resets on the correct rest type (short vs long) per CLASS_DATA

**Rest Mechanics:**
- [ ] Short rest: restores correct resources per class (Channel Divinity for Cleric, Action Surge/Second Wind/Superiority for Fighter, Ki for Monk)
- [ ] Long rest: restores everything — HP to max, all spell slots, all resources, clears temp HP, clears concentration, clears external buffs
- [ ] Equipment charges recharge at correct trigger (dawn/short/long/none)
- [ ] Daily uses recharge on long rest only
- [ ] Arcane Recovery: budget = ceil(level/2), no 6th+ slots, once per long rest

### Checklist 2: UI/UX Quality

Run after any UI changes, new screens, or form modifications.

**Touch Targets:**
- [ ] All buttons minimum 44px height (Apple HIG for iPad)
- [ ] Form inputs minimum 44px height
- [ ] No button clusters where tapping one accidentally triggers another
- [ ] Modal buttons have sufficient spacing

**Feedback & Clarity:**
- [ ] No silent failures — every button tap produces visible feedback
- [ ] Disabled buttons are visually distinct (not just subtle opacity)
- [ ] Error messages are clear and specific (not generic "something went wrong")
- [ ] Confirmation modals for destructive actions (delete, reset, clear)
- [ ] Loading states visible for async operations (cloud save/load)

**Progressive Disclosure:**
- [ ] Equipment form: basic fields visible, advanced behind toggle
- [ ] Dashboard: spell sections collapsible
- [ ] DM Screen: encounter notes collapsible
- [ ] Forms don't show irrelevant fields (e.g., armor type hidden when slot is "ring")

**Scroll & Layout:**
- [ ] Sticky elements (HUD, turn controls) don't overlap interactive content
- [ ] Active initiative row auto-scrolls into view
- [ ] Long forms scrollable without losing submit button
- [ ] No horizontal overflow on iPad portrait orientation

**Visual Consistency:**
- [ ] Class themes apply correctly on all screens
- [ ] DM Screen uses neutral theme, not character theme
- [ ] Theme restores when leaving DM Screen
- [ ] Font sizes, spacing, border-radius consistent across components

### Checklist 3: Code Bugs (by Screen)

Run as a regression sweep after large changes.

**a) Dashboard (Player View):**
- [ ] All stat cards display correct values
- [ ] HP tracker: damage, heal, temp HP all work
- [ ] Spell slot tracker: toggle slots, visual matches count
- [ ] Concentration tracker: start, drop, damage-triggered save prompt
- [ ] Buff system: add/remove buffs, roll bonuses apply correctly
- [ ] Dice roller: all ability checks, saves, skill checks produce correct bonuses
- [ ] Session log: events auto-log correctly
- [ ] Equipment section: equip, unequip, edit, delete all work
- [ ] Quick items: add, edit notes, remove
- [ ] Currency tracker: increment, decrement, edit, total calculation

**b) Level-Up Wizard:**
- [ ] HP increase: roll and average options produce correct values with CON mod and racial bonuses
- [ ] ASI: +2/+1+1/feat all save correctly, retroactive HP for CON changes works
- [ ] New features added to feature list
- [ ] Spell slot table updates
- [ ] New cantrip/spell selections work at correct levels
- [ ] Class-specific level-up features render (e.g., Wizard subclass at 2, Fighter subclass at 3)

**c) Onboarding (New Character):**
- [ ] All steps validate before proceeding
- [ ] Progress bar updates
- [ ] Ability score modifiers auto-calculate
- [ ] Spell/cantrip selection enforces limits
- [ ] Skill selection enforces class limits
- [ ] Save creates valid character object
- [ ] Edit mode pre-fills all fields correctly

**d) Party View:**
- [ ] Loads all characters from cloud
- [ ] Displays correct HP/AC/level/class
- [ ] Detail view shows expanded info
- [ ] Auto-refresh works

**e) DM Screen:**
- [ ] New encounter creates correctly
- [ ] PC auto-import from cloud
- [ ] Monster add/duplicate/delete
- [ ] Initiative entry and sort
- [ ] Start combat validates correctly (including initiative = 0)
- [ ] Turn navigation skips dead NPCs, wraps rounds
- [ ] HP damage/heal/death/undo-kill
- [ ] Condition add/remove with reminders on active turn
- [ ] Multi-target damage
- [ ] End encounter archives correctly
- [ ] Past encounter viewer shows full log
- [ ] Delete encounter (both from list and from viewer)
- [ ] Abandon encounter (setup screen) fully removes
- [ ] Monster library CRUD
- [ ] Session notes persist
- [ ] Cloud sync: save, load, no race conditions on delete

**f) PDF Export:**
- [ ] All fields map correctly (abilities, saves, skills, AC, HP, spells, equipment)
- [ ] Uses effective ability scores (not base)
- [ ] Equipment save bonuses included in save values
- [ ] Checkboxes: proficient saves, proficient skills, spell slot usage
- [ ] Page 2 fields: spells, features, personality
- [ ] Expertise skills handled correctly
- [ ] CDN fallback works when inline pdf-lib fails

**g) Home Screen:**
- [ ] Character list shows all saved characters
- [ ] Load, delete (with password check if set) work
- [ ] Cloud load/save
- [ ] Admin panel accessible
- [ ] Clear all data works

### Checklist 4: Cloud Sync

- [ ] Character save to GitHub creates/updates correct file path
- [ ] Character load from GitHub correctly parses and loads
- [ ] DM Screen cloud save uses 30-second debounce
- [ ] DM Screen cloud load only triggers when local data is empty/stale
- [ ] Delete operations sync to cloud before page refreshes (no resurrection bug)
- [ ] `_dmSkipNextCloudLoad` flag prevents race condition on delete
- [ ] Multiple characters save to separate files
- [ ] Cloud conflict resolution: uses whichever has more recent timestamp
- [ ] CDN fallback for pdf-lib: loads from CloudFlare when inline parse fails
- [ ] GitHub token validation works (isDmCloudConfigured check)

### Checklist 5: Equipment System

- [ ] Equip item: data fully preserved (all fields including new stats)
- [ ] Unequip item: full object moves to `unequippedItems` (not stripped to string)
- [ ] Re-equip from inventory: full object moves back, subject to validation
- [ ] Equip validation: no duplicate armor, no duplicate shield
- [ ] Attunement cap: max 3 attuned items enforced
- [ ] Attune/un-attune toggle: immediate effect on derived stats
- [ ] `isItemActive`: items requiring attunement but not attuned provide no magical benefits
- [ ] Ability overrides: only apply when override > base score
- [ ] Ability bonuses: stack on top of higher of base/override
- [ ] `getEffectiveAbilityScore`: cascades to all consumers (rolls, DC, AC, display)
- [ ] Save bonuses: apply to saves only, not ability checks
- [ ] Stealth disadvantage: rolls 2d20 take lower when active
- [ ] Charges: decrement, increment, recharge on correct rest type
- [ ] Daily uses: decrement, recharge on long rest only
- [ ] Speed bonus: displays correctly on dashboard
- [ ] Resistance: displays on dashboard, deduplicates across items
- [ ] Equipment form: progressive disclosure works, pre-fills on edit, preserves charges.current on save
- [ ] Quick item notes: editable, saved on blur

### Checklist 6: Code Architecture & Structure

**This checklist catches structural debt — misplaced data, cross-domain coupling, duplicated logic, and file organization problems. Run after adding new classes, features, or data files.**

**Data Placement:**
- [ ] No class-specific data living in another class's file (e.g., Wizard spells in fighter.js)
- [ ] Shared data (spell database, conditions, ability names) lives in shared files (data/spells.js, data/shared.js, data/spell-lists.js)
- [ ] Class-specific data lives in class-specific files (data/wizard.js, data/fighter.js, etc.)
- [ ] No function imports data from a file named for a different domain unless that file is explicitly shared/generic

**Function Placement:**
- [ ] Utility functions (mod, calculateAC, getEffectiveAbilityScore, etc.) live in js/utils.js
- [ ] Roll logic lives in js/rolls.js
- [ ] Equipment logic lives in js/resources.js
- [ ] Dashboard rendering lives in js/dashboard.js and js/equipment.js
- [ ] Combat/HP logic lives in js/combat.js
- [ ] No function is defined in one file but only used by a different domain's file (placement smell — Conductor Discipline #6)

**Duplication:**
- [ ] No duplicated spell data (all spells in SPELL_DB, single getSpell() lookup)
- [ ] No duplicated condition lists (single CONDITIONS/DM_CONDITIONS source)
- [ ] No duplicated slot tables (FULL_CASTER_SLOTS, HALF_CASTER_SLOTS, THIRD_CASTER_SLOTS used everywhere)
- [ ] Equipment form logic not duplicated between equipped and unequipped edit flows (shared builder)
- [ ] Rest logic not duplicated — each resource type resets in one place per rest function

**Cross-Consumer Imports:**
- [ ] Grep for function calls that cross domain boundaries. Flag any case where file A calls a function defined in file B where B is named for a different feature. Examples of GOOD cross-file calls: anything calling utils.js, rolls.js, or shared data. Examples of SMELL: dashboard.js calling a function defined in dm-screen.js, or dm-screen.js reading CLASS_DATA fields that should be exposed through a utility.
- [ ] For each smell found, classify: (a) should be moved to a shared file, (b) acceptable coupling, or (c) needs refactoring

**Naming Consistency:**
- [ ] Variable naming follows existing conventions (camelCase for functions/variables, UPPER_CASE for constants)
- [ ] Function names clearly indicate what they do (no generic names like "process" or "handle" without context)
- [ ] HTML element IDs follow a consistent pattern within each feature

**Dead Code:**
- [ ] No unused functions (grep for function definitions, then grep for their call sites)
- [ ] No commented-out code blocks larger than 5 lines
- [ ] No variables declared but never read
- [ ] No stale references to removed features or old data structures (e.g., references to removed progression.js)

**File Size & Complexity:**
- [ ] No single file exceeds ~3000 lines (flag for potential split)
- [ ] No single function exceeds ~150 lines (flag for extraction)
- [ ] Deeply nested callbacks or conditionals (4+ levels) flagged for simplification

### Checklist 7: Cross-Feature Interactions

- [ ] Concentration + damage → CON save prompt shows correct bonus (ability mod + proficiency + equipment)
- [ ] Buff system + roll system → buff dice bonuses apply and label correctly in roll breakdowns
- [ ] Equipment stats + spell DCs + dashboard display all show the same computed values
- [ ] Rest → resource reset + equipment charge/daily reset + buff clearing all fire in correct order
- [ ] Level-up → feature list, spell slot table, prepared count, cantrip count all update consistently
- [ ] Level-up CON ASI → retroactive HP prompt calculates correctly with equipment bonuses
- [ ] Unequip item with ability override → all derived displays (saves, skills, DCs, AC) revert immediately
- [ ] Cloud save → load round-trip: character data identical after save/reload cycle
- [ ] PDF export matches dashboard values for all derived stats

### Checklist 8: Performance & Edge Cases

- [ ] Large encounter (15+ combatants) on DM Screen: no scroll lag, turn controls remain usable
- [ ] Level 20 character with full spell list: dashboard renders without excessive scroll
- [ ] Multiple browser tabs: stale data doesn't corrupt saves (last-write-wins is acceptable, data loss is not)
- [ ] iPad Safari: no caching issues prevent new code from loading (verify with cache-busting or version check)
- [ ] iPad Safari: touch events work on all interactive elements (no hover-only interactions)
- [ ] iPad Safari: safe area insets respected (no content hidden behind notch or home bar)
- [ ] Empty state: new install with no characters, no DM data — all screens render without errors
- [ ] Character with zero equipped items, zero quick items, zero spells — dashboard renders cleanly
- [ ] Malformed localStorage: if data is corrupted, app doesn't crash on load (graceful fallback)

---

## Part 5: Implementation Notes

### New File: `js/audit.js`

All automated check logic lives here. Functions:

- `runAuditChecks()` — master runner, returns summary object, stores in localStorage
- `runCharacterChecks(c)` — Category A checks
- `runEquipmentPipelineChecks(c)` — Category B checks
- `runDmScreenChecks()` — Category C checks
- `runCrossReferenceChecks(c)` — Category D checks
- `updateAuditIndicator()` — reads stored results, updates the indicator icon
- `renderAuditResults(summary)` — builds the HTML for the admin panel results display

### Modified Files

- `index.html` — add `<script src="js/audit.js">` and the audit indicator `<div>`
- `js/home.js` — expand `showAdminOptions()` to include audit results, run button, and change admin password. Change `ADMIN_HASH` to read from localStorage with hard-coded fallback.
- `styles.css` — audit indicator styles, results display styles

### Admin Password Migration

Change the admin password system from hard-coded to localStorage-backed:

```js
function getAdminHash() {
  var stored = localStorage.getItem('dnd_admin_hash');
  if (stored) return stored;
  return simpleHash('tis');  // default fallback
}
```

Replace all references to `ADMIN_HASH` with `getAdminHash()`. The "Change Admin Password" flow stores the new hash via `localStorage.setItem('dnd_admin_hash', simpleHash(newPassword))`.

### Integration with Page Load

In `init()` (or immediately after it), add:

```js
runAuditChecks();
updateAuditIndicator();
```

This runs the checks silently on every page load and updates the indicator.

---

## Part 6: Phasing

**Phase 1 — Foundation:**
1. Create `js/audit.js` with the runner and all Category A–D checks
2. Add the audit indicator to `index.html` with CSS
3. Wire `runAuditChecks()` and `updateAuditIndicator()` into page load
4. Expand admin panel with results display and "Run Audit Now" button

**Phase 2 — Admin Enhancements:**
5. Migrate admin password from hard-coded to localStorage-backed
6. Add "Change Admin Password" flow to admin panel

**Phase 3 — Refinement (after table testing):**
7. Tune check thresholds based on real data (some checks may need warn vs fail adjustment)
8. Add any new checks discovered during manual audits

The manual checklists (Part 4) don't require implementation — they exist as spec reference for CC audit sessions.

---

## Testing the Audit System Itself

After implementation, verify:
- [ ] Green indicator shows when all checks pass
- [ ] Intentionally corrupt a character's proficiency bonus → red indicator appears
- [ ] Fix the corruption → green returns after reload
- [ ] Admin panel shows correct counts and failed check details
- [ ] "Run Audit Now" button refreshes results live
- [ ] Tapping the indicator opens admin panel (prompts for password)
- [ ] Change admin password → old password rejected, new password works
- [ ] Default "tis" password works on fresh install with no stored hash
- [ ] Audit runs in under 100ms with 5 characters loaded (check console.time)
