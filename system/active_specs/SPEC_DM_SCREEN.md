# SPEC: DM Screen — Combat Management & Encounter Tools

## Overview

A dedicated view for the Dungeon Master, accessible from the home screen alongside Party View. This is the first non-character-bound feature — it doesn't belong to any character. It manages encounters: initiative order, monster HP, conditions on NPCs, and session notes.

**Access:** "DM Screen" button on the home screen, next to "Party View."

**Design philosophy:** The DM's bottleneck at the table is context switching — checking initiative, tracking monster HP, remembering conditions, consulting notes. Every tap the DM saves is 2–3 seconds of table flow preserved. Optimize for one-handed iPad use: big tap targets, minimal typing, information density over whitespace.

---

## Data Storage

### Local (primary — zero latency during combat)

DM Screen data persists in localStorage under key `dnd_dm_screen`, separate from character data. Structure:

```javascript
{
  encounters: [
    {
      id: "enc_abc123",
      name: "Goblin Ambush",
      created: "2026-03-26T...",
      initiative: [
        { id: "init_1", name: "Thorin", type: "pc", charId: "abc", initiative: 18, ac: 16, maxHp: 26, currentHp: 26, conditions: [], concentration: null },
        { id: "init_2", name: "Goblin 1", type: "npc", initiative: 14, ac: 15, maxHp: 7, currentHp: 7, conditions: [], concentration: null, attackBonus: 4, damageDice: "1d6+2", damageType: "slashing", attack: "+4, 1d6+2 slashing", notes: "Nimble Escape: Disengage or Hide as bonus action", dexMod: 2 },
        // ...
      ],
      currentTurn: 0,    // index into sorted initiative array
      round: 1,
      notes: "",
      log: [],            // auto-generated encounter log
      active: true        // only one encounter active at a time
    }
  ],
  quickMonsters: [
    // Saved monster templates for reuse
    { name: "Goblin", ac: 15, maxHp: 7, attackBonus: 4, damageDice: "1d6+2", damageType: "slashing", attack: "+4, 1d6+2 slashing", dexMod: 2, notes: "Nimble Escape: Disengage or Hide as bonus action" },
    { name: "Bugbear", ac: 16, maxHp: 27, attackBonus: 4, damageDice: "2d8+2", damageType: "piercing", dexMod: 2, notes: "Surprise Attack: +2d6 on first hit if target is surprised" }
  ],
  sessionNotes: ""       // persistent scratchpad across encounters
}
```

### Cloud backup (persistent across devices and cache clears)

Save DM data to `dm/dm-screen.json` in the same GitHub repo using the existing cloud sync infrastructure (`saveToCloud` / `loadFromCloud` pattern).

**Write triggers:** Auto-save to cloud on meaningful changes — encounter created/ended, monster library edited, session notes saved. Use the same debounce pattern as character cloud saves (30-second delay after last change). Do NOT cloud-save on every HP tick during combat — that would be too frequent.

**Read triggers:** Auto-load from cloud when opening DM Screen if localStorage is empty or stale. If both localStorage and cloud have data, use whichever has a more recent timestamp.

**Privacy note:** DM data lives in the shared GitHub repo. Players could theoretically browse it to see monster HP or encounter plans. This is a social problem, not a technical one — nobody browses raw JSON mid-session. If this becomes a concern in the future, DM data could move to a separate private repo.

---

## Module 1: Initiative Tracker + Turn Order

This is the core module — the thing the DM interacts with every 30 seconds during combat.

### Starting an Encounter

1. DM taps "New Encounter" → names it (optional, defaults to "Encounter 1")
2. **Auto-import PCs:** If cloud sync is configured, fetch Party View data and pre-populate all PCs with their name, AC, current HP, and active conditions. Initiative fields left blank for DM to enter after players roll.
3. **Add monsters:** DM taps "+ Add Monster" → quick form: Name, AC, HP (number or dice formula like "2d6+2"), Attack Bonus (number), Damage Dice (e.g. "1d6+2"), Damage Type, DEX Mod (optional, for auto-initiative), Notes. Or pick from saved Quick Monsters (see Module 2).
4. **Duplicate button:** "Add 3 more Goblins" — duplicates a monster entry with auto-numbered names (Goblin 1, Goblin 2, etc.) and individually tracked HP. If HP was entered as a dice formula, each duplicate rolls separately (Goblin 1 = 8 HP, Goblin 2 = 5 HP).
5. **Auto-roll initiative for monsters:** If the monster has a DEX mod, a "Roll All NPC Initiative" button rolls d20 + dexMod for each NPC and fills their initiative fields. DM can still override manually.
6. DM enters initiative values for PCs (number input per row, as reported by players).
7. Tap "Start Combat" → list sorts by initiative (descending). Ties: DM breaks manually by dragging or tapping "Move After [name]."

### During Combat — Layout

```
╔══════════════════════════════════════════╗
║  Round 2                    [End Combat] ║
╠══════════════════════════════════════════╣
║ ► Thorin (PC)         Init 18       [PC]║
║   HP: 22/26  AC: 16                     ║
║   Concentrating: Bless                  ║
║                                         ║
║   Goblin 1 (NPC)      Init 14     [NPC] ║
║   HP: ███░░░░ 5/7  AC: 15              ║
║   [Deal Damage] [Heal] [Roll Atk] [Dmg]║
║   Conditions: [Frightened] [+Cond]      ║
║   Atk: +4, 1d6+2 slashing              ║
║                                         ║
║   Elena (PC)           Init 12      [PC]║
║   HP: 31/35  AC: 18                     ║
║   ⚠ Poisoned                            ║
║                                         ║
║   Goblin 2 (NPC)       Init 8     [NPC] ║
║   ░ Goblin 2 — DEAD              [Undo] ║
║                                         ║
╠══════════════════════════════════════════╣
║  [Select Multiple]                       ║
║        [ ← Previous ]  [ Next → Elena ] ║
╚══════════════════════════════════════════╝
```

### Visual Design Rules

**PC vs NPC distinction:** PC rows have a subtle blue-tinted left border. NPC rows have a red-tinted left border. Instant visual parsing of friend vs foe.

**Active turn highlighting:** The current combatant's row has a prominent accent border/background. All other rows are dimmed slightly.

**Dead NPCs collapse:** When an NPC reaches 0 HP, their row shrinks to a single thin line: "[name] — DEAD [Undo]". Tap to expand if the DM needs to check stats. Keeps the initiative list tight as monsters die off during combat.

**PCs at 0 HP stay in turn order.** PCs don't die at 0 HP — they go unconscious and make death saves on their turn. Show "Unconscious" as a condition badge but do NOT skip them in initiative. Only NPCs are auto-skipped when dead.

### Turn Controls

**"Next Turn" button:** Advances to the next living combatant (skip dead NPCs automatically). Shows who's next: "Next → Elena (PC)" so the DM can announce it as they tap. When it wraps past the bottom of the list, increment the round counter. This is the most-tapped button on the screen — make it large (full width, prominent). **Must be sticky at the bottom of the viewport** — the DM should never scroll to find it.

**"Previous Turn" button:** Goes back one step (for mistakes). Decrements round if wrapping backward.

### PC Rows (read-only)

Show name, HP, AC, conditions, concentration. DM cannot edit PC HP or conditions — players manage their own.

**Live sync:** If cloud sync is active, auto-refresh PC data from GitHub every 60 seconds. Update HP and conditions on PC rows without resetting initiative or turn order. Show "Last synced: Xs ago" indicator. If cloud is not connected, PC data comes from the initial import and goes stale — show a "⚠ No live sync" indicator.

### NPC Rows (interactive)

**HP Tracking — "Deal Damage" is the primary interaction:**

The DM hears "I hit for 14 damage" and needs to subtract 14 in one action. The flow:
1. DM taps "Deal Damage" on the NPC row
2. Number input appears inline (or a quick modal): type "14"
3. Tap confirm (or press Enter) → HP reduces by 14, health bar updates
4. If HP reaches 0: row collapses to "DEAD" state

Also provide:
- "Heal" button → same number input flow but adds HP (for when the DM heals an NPC)
- Small +1/−1 buttons for fine adjustments
- Tap the HP number itself to type an exact value (set HP to a specific number)

**Attack Roll Buttons:**
- "Roll Atk" → rolls d20 + attackBonus, displays result prominently: "d20 [14] + 4 = 18"
- "Roll Dmg" → rolls damageDice, displays result: "1d6 [4] + 2 = 6 slashing"
- These are the same pattern as player weapon rolls. The DM rolls for every monster every round — making this one-tap instead of manual dice saves significant time.
- If `attackBonus` or `damageDice` are not set (older templates or text-only `attack` field), hide the roll buttons and show the text description instead.

**Conditions:** Tap "+Cond" to add from the standard D&D condition list (same 14 conditions from the player app: Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious). Tap a condition badge to remove it. Use a modal picker, not a native `<select>` (better touch UX on iPad).

**Concentration for NPC casters:** Enemy spellcasters concentrate too. "Concentrating: [spell name]" appears as a special badge on the NPC row. When the DM deals damage to an NPC with active concentration, show a reminder: "CON save DC [max(10, floor(damage/2))] to maintain [spell]." DM manually resolves the save and taps to keep or drop concentration.

**Condition reminders on active turn:** When an NPC with conditions is the active combatant, show a collapsible reminder panel below their row with the mechanical effects:
- Frightened: "Cannot move closer to source. Disadvantage on attacks and ability checks while source is in line of sight."
- Poisoned: "Disadvantage on attacks and ability checks."
- Prone: "Disadvantage on attacks. Melee within 5ft has advantage against. Stand costs half movement."
- Restrained: "Speed 0. Disadvantage on attacks and DEX saves. Attacks against have advantage."
- Stunned: "Incapacitated, can't move. Auto-fails STR/DEX saves. Attacks against have advantage."
- (Full list matches the CONDITIONS array in js/combat.js)

**Per-monster notes:** Tap to expand a small text area for per-monster notes ("used Multiattack this turn", "has half cover", "Nimble Escape available").

### Multi-Target Damage

Fireball hits 4 goblins. The DM needs to apply the same damage to all of them at once.

**Flow:**
1. DM taps "Select Multiple" button (below the initiative list)
2. Checkboxes appear on each NPC row
3. DM checks the 4 goblins that were hit
4. Tap "Deal Damage to Selected" → number input → enters 24 → all 4 goblins take 24 damage
5. Each NPC's HP updates individually. Any that drop to 0 collapse to DEAD state.
6. "Cancel Selection" returns to normal mode.

Alternative: DM can also long-press an NPC row to start multi-select mode (same behavior).

### Held/Delayed Actions

DM taps "Move" on a combatant's row → picks a new position via "Move After [name]" buttons that appear on other rows. This reorders for the current combat only. Phase 1 MVP. Drag-to-reorder is Phase 3 polish.

### Ending Combat

DM taps "End Combat" → confirm dialog → encounter saves to history (with its log). DM can review old encounters but not reactivate them. The active encounter slot clears.

---

## Module 2: Monster/NPC Quick Stats

A library of saved monster stat blocks the DM can reuse across encounters.

### Quick Monster Template

```
Name:         Goblin
AC:           15
Max HP:       7        (or dice formula: "2d6+2")
Attack Bonus: +4       (for Roll Atk button)
Damage Dice:  1d6+2    (for Roll Dmg button)
Damage Type:  slashing
DEX Mod:      +2       (for auto-initiative rolling)
Notes:        Nimble Escape: Disengage or Hide as bonus action
```

This is deliberately minimal — not a full Monster Manual entry. Just what the DM needs at the table: AC (to know if attacks hit), HP (to track), attack stats (to roll), DEX (for initiative), and notes (special abilities to remember).

### Management

- "Save as Template" button on any NPC in the initiative tracker → saves to `quickMonsters` library
- "Monster Library" section on the DM Screen home showing all saved templates
- Edit/delete templates
- When adding a monster to a new encounter, DM can pick from the library or type fresh
- No pre-loaded monsters — the DM builds their library as they play (we can't bundle Monster Manual content due to copyright)

### HP Roller

When adding a monster with an HP dice formula (e.g. "2d6+2"), the app rolls it and sets the result as that individual monster's max HP. When duplicating, each copy rolls separately — Goblin 1 might have 8 HP while Goblin 2 has 5. This creates natural HP variation among groups, just like rolling at the real table.

The DM can also type a fixed number instead of a formula. The field accepts both.

---

## Module 3: Encounter Notes / Scratchpad

Two levels of notes:

### Session Notes (persistent)
A free-text area that persists across encounters and sessions. For ongoing campaign notes: "Party owes the merchant 50gp", "Elena is cursed — remove curse before level 6", "Thorin's backstory hook: the forge symbol."

Accessible from the DM Screen home, always visible. Simple textarea with auto-save on blur. Syncs to cloud.

### Per-Encounter Notes
Each encounter has its own notes field. For tactical notes during combat: "Goblins flee below 3 members", "Reinforcements arrive round 4", "Treasure: 15gp + potion of healing in chest."

Visible during the active encounter, below the initiative tracker. Saves with the encounter data.

---

## Module 4: Condition Tracker for Enemies

Integrated into the initiative tracker (Module 1) rather than a separate screen. See the NPC Rows section in Module 1 for the full interaction design.

### Adding Conditions to NPCs

Tap "+Cond" on any NPC row → modal picker showing all 14 D&D conditions (same list as player conditions). The condition appears as a colored badge on the NPC's row. Tap a badge to remove it.

### Condition Reminders on Active Turn

When an NPC with conditions is the current combatant, show mechanical reminders (see Module 1 NPC Rows section for the full list).

### Duration Tracking (Phase 3 — not MVP)

For conditions with known durations, the DM can set "Expires after [N] rounds" or "Save at end of turn: [DC] [ability]". The tracker shows a countdown and prompts the DM: "Goblin 2 makes a WIS save (DC 14) to end Frightened."

This is Phase 3 polish. MVP is add/remove badges without duration tracking.

---

## Module 5: Encounter Log

Auto-generated event log during combat. Creates a combat recap the DM can reference for disputes or session summaries.

### Auto-logged events:
- Turn changes: "Round 2 — Thorin's turn"
- HP changes: "Goblin 1 took 14 damage (7→0, dead)"
- Conditions: "Goblin 3: Frightened added"
- NPC deaths: "Goblin 2 killed (Round 3)"
- Concentration: "Goblin Shaman lost concentration on Hold Person"
- Custom entries: DM can tap "Add Log Note" to type a freeform entry

### Display
Collapsible section below the initiative tracker during combat. Scrollable, newest at top. Saves with the encounter data for post-combat review.

### Past encounter logs
When reviewing a past encounter from the DM Screen home, the full log is visible. Useful for "what happened last session?" recaps.

---

## DM Screen Home Layout

When the DM taps "DM Screen" from the home screen:

```
╔══════════════════════════════════════════╗
║           ⚔ DM Screen                    ║
╠══════════════════════════════════════════╣
║                                          ║
║  [▶ Resume: Goblin Ambush — Round 3]     ║
║     (or [+ New Encounter] if none)       ║
║                                          ║
║  ──── Monster Library ────               ║
║  Goblin  AC 15  HP 7  Atk +4            ║
║  Bugbear AC 16  HP 27 Atk +4            ║
║  Orc     AC 13  HP 15 Atk +5            ║
║  [+ Add Monster Template]               ║
║                                          ║
║  ──── Session Notes ────                 ║
║  [ editable textarea ]                   ║
║                                          ║
║  ──── Past Encounters ────               ║
║  Goblin Ambush (3 rounds, 2 days ago)    ║
║  Bandit Camp (8 rounds, 1 week ago)      ║
║                                          ║
║  [← Back to Home]                        ║
╚══════════════════════════════════════════╝
```

---

## Color Theme

The DM Screen uses a neutral theme distinct from any class:

```
accent: #a0a8b8, accentHover: #b0b8c8, accentDim: #707888
bg: #131517, surface: #1b1d21, surfaceRaised: #252830
border: #2e3340, text: #dce0e8, textDim: #8890a0
error: #c45a5a, success: #6aaa5a, inputBg: #171a1e
```

Additional colors for PC/NPC row distinction:
```
pcBorder: #4a6a9a    (blue-tinted left border for PC rows)
npcBorder: #9a4a4a   (red-tinted left border for NPC rows)
```

Apply this theme when entering the DM Screen, restore the previous character's theme when leaving.

---

## Technical Architecture

### New File: `js/dm-screen.js`

All DM Screen logic lives in one new file. Functions:

**Screen management:**
- `showDmScreen()` — renders the DM Screen home
- `showDmEncounter(enc)` — the active encounter / initiative tracker view

**Encounter lifecycle:**
- `newEncounter()` — creates encounter, imports PCs from cloud
- `startCombat()` — sorts by initiative, sets round 1
- `endEncounter()` — archive and clear active
- `resumeEncounter()` — re-open the active encounter

**Turn management:**
- `nextTurn()` — advance to next living combatant, increment round on wrap
- `prevTurn()` — go back one step

**NPC management:**
- `addMonsterToEncounter(template?)` — add from library or custom form
- `duplicateMonster(id, count)` — add N copies with auto-numbered names and individual HP rolls
- `dealDamage(id, amount)` — subtract HP, check for death, log event
- `healNpc(id, amount)` — add HP
- `dealDamageToSelected(ids, amount)` — multi-target damage
- `rollNpcAttack(id)` — d20 + attackBonus, display result
- `rollNpcDamage(id)` — roll damageDice, display result
- `toggleNpcCondition(id, condition)` — add/remove condition badge
- `setNpcConcentration(id, spellName)` — set/clear concentration
- `moveAfter(id, targetId)` — reorder initiative

**Monster library:**
- `renderMonsterLibrary()` — display saved templates
- `saveMonsterTemplate(npcData)` — save to library
- `editMonsterTemplate(index)` / `deleteMonsterTemplate(index)`

**Initiative helpers:**
- `rollAllNpcInitiative()` — auto-roll for all NPCs with dexMod
- `importPcsFromCloud()` — fetch Party View data, create PC initiative entries

**Encounter log:**
- `logEncounterEvent(text)` — append to active encounter's log array
- `renderEncounterLog(enc)` — display log

**Notes:**
- `renderSessionNotes()` — persistent scratchpad
- `renderEncounterNotes(enc)` — per-encounter notes

**Persistence:**
- `saveDmData()` — write to localStorage + debounced cloud save
- `loadDmData()` — read from localStorage, fall back to cloud
- `dmCloudSave()` — save to `dm/dm-screen.json` in GitHub repo
- `dmCloudLoad()` — load from GitHub repo

### New File: `data/dm-data.js`

Static data:
- `DM_CONDITIONS` — the 14 D&D conditions with reminder text. Reuse the `CONDITIONS` array from `js/combat.js` if it's accessible, or duplicate the data here. Same 14 entries, same descriptions.
- `DM_THEME` — the neutral color theme object
- `DM_PC_BORDER` / `DM_NPC_BORDER` — row accent colors

### Modified Files
- `js/home.js` — add "DM Screen" button to home screen
- `index.html` — add `<script>` tags for `data/dm-data.js` and `js/dm-screen.js`, add DM Screen HTML containers (dm-screen view, encounter view)
- `styles.css` — DM Screen styles: initiative rows with left-border accents, HP bars (green/yellow/red), condition badges, dead-NPC collapsed rows, turn highlighting, sticky Next Turn button, multi-select checkboxes, roll result display

### Party View Integration

When creating a new encounter with cloud sync active:
1. Call `fetchPartyChars(headers)` (existing function in `js/combat.js`)
2. For each PC, create an initiative entry with `type: "pc"`, populate name/AC/HP/conditions/concentration from cloud data
3. During combat, if cloud sync is active, auto-refresh PC data every 60 seconds — update HP and conditions on PC rows without resetting initiative or turn order
4. If cloud is not available, PCs are added manually (same form as monsters but marked as PC type)

---

## Build Phasing

### Phase 1 (MVP) — covers 80% of DM combat management
- Initiative tracker: add PCs + monsters, enter initiative, sort, navigate turns
- NPC HP tracking with "Deal Damage" / "Heal" flow
- NPC attack and damage roll buttons
- Multi-target damage
- NPC condition badges (add/remove)
- Condition reminders on active turn
- PC/NPC visual distinction
- Dead NPC collapse + PC unconscious handling
- "Next → [name]" turn button (sticky)
- Encounter log (auto-generated)
- Per-encounter notes
- localStorage persistence

### Phase 2 — library and persistence
- Monster Library (save/load/edit/delete templates)
- Session notes (persistent scratchpad)
- Cloud backup (save/load DM data to GitHub)
- Auto-import PCs from Party View
- Auto-roll NPC initiative
- Past encounter history with logs

### Phase 3 — polish
- HP dice formula rolling on monster add/duplicate
- NPC concentration tracking with damage-triggered save reminders
- Condition duration tracking and save prompts
- Drag-to-reorder initiative
- Encounter history search/filter
- PC live-sync during combat (60-second refresh)

---

## iPad Safari Notes

- All tap targets minimum 44px height (Apple HIG)
- The "Next Turn" and "Previous Turn" buttons must be sticky at the bottom of the viewport — the DM should never have to scroll past dead goblins to find them
- NPC "Deal Damage" and roll buttons need generous hit areas — the DM is tapping these in rapid succession during combat
- Condition picker should use a modal, not a native `<select>` (better touch UX)
- The initiative list will extend beyond one screen for 6+ combatants — ensure smooth scrolling with the active turn auto-scrolled into view
- HP bars should use CSS gradients, not images — fast rendering on re-draw during combat

## Intentional Exclusions

These were considered and deliberately cut to keep the DM Screen focused:

- **Legendary/lair actions:** Too niche. Only applies to boss fights. DM can use per-monster notes.
- **Encounter difficulty calculator:** Requires CR data from the Monster Manual which we can't bundle (copyright). DM can use external tools like Kobold Fight Club.
- **Surprise round handling:** DM can tell surprised creatures to skip their first turn. Not worth a dedicated feature.
- **Monster Manual integration:** Copyright prevents bundling stat blocks. The monster library is build-your-own.
- **Map/grid integration:** Out of scope. This is a combat tracker, not a VTT.
