# SPEC: UX Enhancement Handoff — Phase 2

**Purpose:** Implementation handoff for CC (Claude Code). Covers new features, completion of existing partially-built features, and UX polish improvements identified from code-level review.

**Source file:** Single `index.html` (~9,827 lines). All changes go here.

**Priority order:** Build top-to-bottom. Each section is independent unless noted.

---

## 1. Inspiration Toggle

**What:** A binary on/off toggle for the 5e Inspiration mechanic. Inspiration is either "you have it" or "you don't" — no stacking, no counting. Players constantly forget they have it.

**Placement:** Immediately below the HP tracker, above the Conditions/Concentration buttons row (line ~4951). It should be visible in both normal and Combat Mode.

**Visual design:**
```
┌──────────────────────────────────────┐
│  ★  Inspiration                [ON]  │
└──────────────────────────────────────┘
```
- When OFF: muted/dim star, label reads "Inspiration", toggle shows "—" or empty  
- When ON: gold/accent-colored star (★), label reads "Inspired!", toggle shows a filled indicator  
- Tap anywhere on the row to toggle  
- Subtle pulse animation on activation (like the nat 20 celebration, but briefer)

**Data model:** Add to character object:
```js
inspiration: false  // boolean
```

**Migration:** In `migrateCharacter()` (~line 3370), add:
```js
if (c.inspiration === undefined) c.inspiration = false;
```

**Integration:**
- `logEvent()` call: "Gained Inspiration" / "Used Inspiration"
- Persists in localStorage via normal `saveCurrentCharacter()` flow
- Included in cloud save JSON (auto, since it's on the character object)
- PDF export: check the Inspiration checkbox if `c.inspiration === true` (field name in template needs discovery — look for "Inspiration" in `fillPdfTemplate`)
- Death Save nat 20 or rest should NOT auto-grant inspiration (DM-only decision)

**Implementation:**
```js
function toggleInspiration() {
  var c = loadCharacter();
  c.inspiration = !c.inspiration;
  saveCurrentCharacter(c);
  logEvent(c.inspiration ? 'Gained Inspiration' : 'Used Inspiration');
  showDashboard(c);
}
```

Render function (call from `renderDashboard` after death saves):
```js
function renderInspiration(c) {
  var on = c.inspiration;
  return '<div class="inspiration-toggle' + (on ? ' active' : '') + '" onclick="toggleInspiration()">'
    + '<span class="insp-star">' + (on ? '★' : '☆') + '</span>'
    + '<span class="insp-label">' + (on ? 'Inspired!' : 'Inspiration') + '</span>'
    + '</div>';
}
```

**CSS:** Add to the stylesheet section (~line 7):
```css
.inspiration-toggle {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; margin: 8px 0;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); cursor: pointer;
  transition: all 0.3s; user-select: none;
}
.inspiration-toggle.active {
  border-color: var(--accent); background: rgba(196,163,90,0.08);
}
.insp-star { font-size: 1.4rem; color: var(--text-dim); transition: all 0.3s; }
.inspiration-toggle.active .insp-star { color: #ffd700; text-shadow: 0 0 8px rgba(255,215,0,0.4); }
.insp-label { font-size: 0.95rem; color: var(--text-dim); }
.inspiration-toggle.active .insp-label { color: var(--accent); font-weight: bold; }
```

---

## 2. Session Journal (Free-Form)

**What:** A free-text area where players write whatever they want — session notes, story recaps, NPC names, plot hooks, reminders. This is distinct from the auto-generated Session Log (which is machine-written). The Journal is player-written.

**Placement:** New collapsible section between Notes and Session Log on the dashboard. Label: "Session Journal." Should be in the `combat-hide` class (not needed during combat).

**Visual design:**
```
▸ Session Journal (3 entries)
  ┌─────────────────────────────────┐
  │ [+ New Entry]                   │
  ├─────────────────────────────────┤
  │ Mar 25 — Session 12            │
  │ Met the Black Spider in Wave   │
  │ Echo Cave. He offered a deal...│
  │                        [Delete] │
  ├─────────────────────────────────┤
  │ Mar 18 — Session 11            │
  │ Cleared the Redbrand hideout...│
  │                        [Delete] │
  └─────────────────────────────────┘
```

**Data model:** Add to character object:
```js
journal: [
  { date: "2025-03-25", title: "Session 12", body: "Met the Black Spider..." },
  { date: "2025-03-18", title: "Session 11", body: "Cleared the Redbrand hideout..." }
]
```

**Migration:** In `migrateCharacter()`:
```js
if (!c.journal) c.journal = [];
```

**Behavior:**
- "New Entry" button opens an inline form (not a modal — stay on the page):
  - Title field: pre-filled with "Session [N+1]" where N = journal.length
  - Body: textarea, min-height 120px, auto-grows
  - Date: auto-populated with today (display only, not editable)
  - "Save" and "Cancel" buttons
- Entries display in reverse chronological order (newest first)
- Each entry is collapsible — tap to expand, tap to collapse. Show first ~80 chars when collapsed.
- "Delete" button on each entry (with a confirm tap — "Tap again to confirm")
- Max 50 entries. Warn if approaching limit.

**Implementation notes:**
- Render as a `<details>` block like Session Log
- Use `contenteditable` or a `<textarea>` for the body
- Save immediately on "Save" tap — call `saveCurrentCharacter()`
- Include in cloud save JSON (auto)
- Do NOT include in PDF export (too free-form, unpredictable length)

---

## 3. Party View Enhancement — Detailed Character Drill-Down

### 3a. Current State Assessment

The existing `showPartyView()` (line 7609) works as follows:
- Fetches all `.json` files from `characters/` directory in the GitHub repo
- Each refresh = 1 API call (list directory) + N API calls (one per character file)
- For a 5-person party: ~6 API calls per refresh
- GitHub API rate limit: 5,000 requests/hour for authenticated users
- No auto-polling — purely manual "Refresh" button
- Cards show: name, race/class/level, HP (color-coded), AC, active conditions, concentration
- Cards toggle an `expanded` CSS class on click, but there's no expanded content — just the toggle

### 3b. Sync Timing Assessment

**Current latency model:**
- Player A saves to cloud → GitHub API PUT → ~500ms–2s (depends on file size and connection)
- Player B taps "Refresh" in Party View → directory list fetch (~300ms) + N file fetches (~200ms each, sequential) = ~1.5–3s for a 5-person party
- **Total delay from save to visibility: ~2–5 seconds** (assuming Player B refreshes after Player A's save completes)
- This is acceptable for a tabletop game where turns take 30+ seconds

**Rate limit math:**
- 5 players × 6 API calls per refresh × 20 refreshes per hour = 600 calls/hour (well within 5,000 limit)
- Even aggressive refreshing (every minute) won't hit limits

**Auto-refresh recommendation:** Add a 60-second auto-poll when Party View is open. This is low-cost and keeps data reasonably fresh without manual tapping. Show a "Last updated: X seconds ago" indicator.

### 3c. Enhanced Party View — Drill-Down Feature

**What:** Make party cards tappable to open a detailed read-only view of another player's character. View their stats, spells, abilities, and status — but NOT their gold/currency, and absolutely no editing.

**Card tap behavior (replace current toggle):**
- Tap a party card → slide/transition to a detailed read-only character sheet
- "← Back to Party" button at top to return to the card grid

**Detailed view shows (read-only):**

| Section | Show | Hide |
|---------|------|------|
| Header | Name, race, class, subclass, level, background, alignment | — |
| HP | Current/Max, temp HP, death save state if at 0 HP | — |
| Stats | AC, Speed, Initiative mod, Prof bonus, Spell DC (if caster) | — |
| Ability Scores | All 6 with modifiers | — |
| Conditions | Active conditions list | — |
| Concentration | Current concentration spell if any | — |
| Saving Throws | Proficient saves with bonuses | — |
| Skills | Proficient skills with bonuses, expertise marked | — |
| Class Resources | Channel Divinity, Rage, Ki, Action Surge, etc. (used/max) | — |
| Spell Slots | Remaining/total per level | — |
| Cantrips | List of known cantrips | — |
| Prepared/Known Spells | Spell names (not full cards — just names and levels) | — |
| Weapons | Name, attack bonus, damage | — |
| Features | Feature list | — |
| **Currency** | **HIDDEN** | ✗ |
| **Notes** | **HIDDEN** | ✗ |
| **Journal** | **HIDDEN** | ✗ |
| **Inventory/Equipment** | **HIDDEN** | ✗ |
| **Edit buttons** | **HIDDEN** | ✗ |

**Implementation approach:**

```js
function showPartyCharDetail(charJson) {
  var c = migrateCharacter(charJson);
  var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  // ... build read-only HTML using existing helper functions
  // Reuse: modStr(), calculateAC(), ordinal(), etc.
  // Do NOT reuse renderDashboard() — that's for the active character with editing
}
```

**Key constraint: READ-ONLY.** No `onclick` handlers for editing. No HP buttons. No slot toggles. No rest buttons. No save-to-cloud. Render everything as static display elements.

**Layout:** Use the same visual styling (stat cards, ability cards, tag chips) as the real dashboard but without interactive elements. Keep it vertically compact — use 2-column layouts where possible for the detail view.

**Auto-refresh in detail view:** When viewing a specific character's detail, re-fetch that single file every 60 seconds. Show "Updated Xs ago" at the top.

### 3d. Implementation Steps

1. Add auto-refresh polling to `showPartyView()`:
   ```js
   var partyPollInterval = null;
   function showPartyView() {
     // ... existing code ...
     clearInterval(partyPollInterval);
     partyPollInterval = setInterval(showPartyView, 60000);
   }
   ```
   Clear interval when navigating away from Party View.

2. Replace `this.classList.toggle('expanded')` on cards (line 7646) with:
   ```js
   onclick="showPartyCharDetail(partyChars[INDEX])"
   ```
   Store the fetched character array in a module-level variable `partyChars`.

3. Build `renderPartyCharDetail(c)` — the read-only character sheet renderer.

4. Add "← Back to Party" navigation.

5. Add "Last updated" timestamp display.

---

## 4. Session Log — Finish Auto-Logging Integration

### Current State
`logEvent()` exists (line 6872) and the Session Log renders (line 6886). But not all state-changing functions call it. The following integrations need wiring:

### Missing `logEvent()` Calls

**HP Changes** (~line 9108, `applyHpChange`):
- After damage: `logEvent('Took ' + amount + ' damage — HP ' + oldHp + '→' + newHp);`
- After heal: `logEvent('Healed ' + amount + ' HP — HP ' + oldHp + '→' + newHp);`
- After temp HP: `logEvent('Gained ' + amount + ' temp HP');`

**Death Saves** (wherever death save roll is processed):
- Success: `logEvent('Death save: success (' + c.deathSaves.successes + '/3)');`
- Failure: `logEvent('Death save: failure (' + c.deathSaves.failures + '/3)');`
- Nat 20: `logEvent('Death save: NAT 20! Regained 1 HP');`
- Nat 1: `logEvent('Death save: NAT 1 — two failures!');`
- Stabilized: `logEvent('Stabilized — unconscious, no longer dying');`

**Spell Casting** (spell slot spending flow):
- `logEvent('Cast ' + spellName + ' at ' + ordinal(level) + ' level (' + remaining + ' slots left)');`

**Concentration:**
- Started: `logEvent('Began concentrating on ' + spellName);`
- Dropped: `logEvent('Dropped concentration on ' + spellName);`
- Lost (failed save): `logEvent('Lost concentration on ' + spellName + ' (failed CON save)');`

**Conditions:**
- Added: `logEvent('Condition: ' + condName + ' (active)');`
- Removed: `logEvent('Condition: ' + condName + ' (removed)');`

**Resource Use:**
- Channel Divinity: `logEvent('Used Channel Divinity (' + remaining + ' left)');`
- Second Wind, Action Surge, etc.: `logEvent('Used ' + resourceName + ' (' + remaining + ' left)');`

**Rest:**
- Short rest: `logEvent('Short Rest — ' + restoredList.join(', ') + ' restored');`
- Long rest: `logEvent('Long Rest — all resources restored, HP full');`

**Dice Rolls** (in the roll result display functions):
- `logEvent(label + ': ' + total + breakdown);`

**Inspiration:**
- (Covered in Section 1 above)

### "New Session" Button

Add a "New Session" button next to "Clear Log":
```js
function newSession() {
  logEvent('═══ New Session ═══');
}
```
This inserts a visual divider in the log rather than clearing history. Players can still "Clear Log" to wipe everything.

---

## 5. UX Polish — Dashboard Vertical Length

### Problem Assessment (from code review)

The dashboard renders everything linearly in a single scrolling column. For a Level 5 Life Cleric with 6 prepared spells, the page is roughly:

| Section | Est. Height (px) |
|---------|-------------------|
| Header + subtitle | 120 |
| Concentration banner | 40 |
| HP tracker + buttons | 160 |
| Death saves (if at 0 HP) | 80 |
| Conditions/Concentration buttons | 44 |
| Dice rollers (expanded) | 400+ |
| Stat cards (3x2 grid) | 100 |
| Channel Divinity tracker + cards | 200 |
| Spell Slots | 120 |
| Rest (collapsible) | 60 collapsed |
| Ability Scores | 80 |
| Proficiencies | 100 |
| Cantrips (3–4 spell cards) | 300 |
| Domain Spells (5–10 cards) | 600+ |
| Prepared Spells (6+ cards) | 500+ |
| Weapons | 100 |
| Equipped Gear | 100 |
| Quick Items | 60 |
| Inventory | 60 |
| Currency | 100 |
| Notes | 60 |
| Features & Traits | 80 |
| Session Log | 60 collapsed |
| Quick Rules | 60 collapsed |
| Action buttons (7 buttons) | 350 |
| **TOTAL** | **~3,500+ px** |

That's 5–7 full screen scrolls on a phone. The spell cards are the biggest offenders — each card is ~80px tall, and a Cleric at level 5 can have 15+ spell cards visible.

### Recommended Fixes

**5a. Collapse spell sections by default.**
Domain Spells and Prepared Spells should render inside `<details>` elements, collapsed by default. Show the count: "Prepared Spells (6)" — tap to expand. The spell cards are reference material, not combat-critical (spell slots are already separate).

**5b. Make Cantrips more compact.**
Cantrips don't need full spell cards on the dashboard. Show them as a horizontal chip/tag list: `Sacred Flame · Guidance · Toll the Dead`. Tap a cantrip name to expand its card inline. Saves ~250px for a typical Cleric.

**5c. Collapse Dice Rollers by default.**
The dice section currently renders expanded and takes significant space. Wrap in `<details>` with summary "Dice & Rolls". In Combat Mode, auto-expand it.

**5d. Compact the action buttons at bottom.**
7 buttons stacked vertically = 350px. Use a 2-column grid for secondary actions:
```
[   Level Up   ] (full width, primary)
[Export PDF] [Save to Cloud]
[Edit Char ] [   Theme    ]
[Password  ] [ Back Home  ]
[      Delete Character     ] (full width, danger)
```

**5e. Ability Scores — make collapsible outside combat.**
The 6-card ability score grid is reference info. Wrap in collapsible `<details>`, default open (so it's visible but can be collapsed by players who know their scores).

### Implementation

These are all rendering changes in `renderDashboard()` (line 4894). Replace direct HTML with `<details>` wrappers where indicated. Add `open` attribute to sections that should default-open. Combat Mode already handles show/hide via `combat-hide` / `combat-show` classes — this is complementary.

---

## 6. UX Polish — Miscellaneous

**6a. Sticky HP tracker.**
The HP tracker is the most-used element but scrolls off screen quickly. Add `position: sticky; top: 0; z-index: 50;` to the HP tracker container so it pins to the top of the viewport while scrolling. Include the concentration banner and active conditions in the sticky block.

**6b. "Save to Cloud" after HP/resource changes.**
Currently cloud save is manual only. Add an auto-save debounce: after any state change (HP, spell slots, conditions, resources), set a 30-second timer. If no further changes, auto-save to cloud. Show a subtle "Syncing..." indicator. This keeps Party View data fresh without manual saves.

**6c. Scroll-to-top on dashboard load.**
After `container.innerHTML = html;` in `renderDashboard()`, add `window.scrollTo(0, 0);` to prevent the dashboard from loading mid-scroll.

**6d. Active conditions inline with HP.**
When conditions are active, they currently render as a separate div. Move them inline with the HP display — small colored badges right next to the HP numbers. Saves vertical space and keeps status visible when HP is sticky.

---

## 7. Death Save Stabilization Text (SPEC_UX_AMENDMENT Completion)

Verify that the stabilization message reads:
> "Stabilized — unconscious but no longer dying. You need healing to wake up (or you regain 1 HP in 1d4 hours)."

If the current text says anything about being "conscious at 0 HP," correct it. Search for `stabiliz` in the codebase to find the relevant string.

---

## 8. Quick Rules — Absorb Elements Removal (SPEC_UX_AMENDMENT Completion)

Verify that "Absorb Elements" does NOT appear in the Quick Rules Reference reactions list. It's Xanathar's Guide, not PHB. The reactions list should be: Opportunity Attack, Shield, Uncanny Dodge, Counterspell. If Hellish Rebuke was added as a replacement, that's fine too.

Search for `Absorb Elements` in `renderQuickRules()` to verify.

---

## Build Order Recommendation

| Order | Section | Effort | Impact |
|-------|---------|--------|--------|
| 1 | §1 Inspiration Toggle | Small | Medium — players ask for this constantly |
| 2 | §5 Dashboard vertical fixes | Medium | High — usability on phones |
| 3 | §6a Sticky HP | Small | High — most impactful single UX change |
| 4 | §4 Session Log wiring | Medium | Medium — completes existing feature |
| 5 | §2 Session Journal | Medium | Medium — players want note-taking |
| 6 | §3 Party View enhancement | Large | High — the "wow" social feature |
| 7 | §6b Auto cloud save | Small | Medium — keeps Party View fresh |
| 8 | §7–8 Amendment verification | Tiny | Low — correctness checks |
| 9 | §6c–d Polish items | Tiny | Low — small improvements |

---

## Testing Checklist

- [ ] Inspiration toggles on/off, persists across refresh, appears in Party View
- [ ] Journal entries save, display in order, collapse/expand, delete with confirm
- [ ] Party cards are tappable → detail view loads → Back returns to grid
- [ ] Party View auto-refreshes every 60s when open
- [ ] Party detail view hides currency, notes, journal, inventory, edit controls
- [ ] All logEvent integrations fire (HP, death saves, spells, conditions, rest, resources, rolls)
- [ ] "New Session" inserts divider without clearing log
- [ ] Spell sections collapsed by default, expand on tap
- [ ] HP tracker sticks to top on scroll
- [ ] Action buttons use 2-column grid
- [ ] Dashboard loads at scroll position 0
- [ ] Stabilization text matches amendment wording
- [ ] Absorb Elements absent from Quick Rules
- [ ] All changes work on iPad Safari (touch events, sticky positioning, details/summary)
- [ ] Combat Mode still correctly shows/hides sections after changes
- [ ] Cloud save JSON includes `inspiration` and `journal` fields
