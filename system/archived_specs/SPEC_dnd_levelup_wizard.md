# D&D Level-Up Wizard — Spec v1

## Problem

Leveling up a 5e character requires knowing what changes at each level, what decisions are available, recalculating derived stats, and producing a usable sheet. This system guides the player through all of it and outputs a PDF for GoodNotes + Apple Pencil gameplay.

## Solution

A single self-contained HTML file that runs in iPad Safari. No server, no install. Two modes:

1. **Onboarding** — Enter your current character (level 3 Cleric for v1).
2. **Level-Up Wizard** — Step-by-step guided flow for each level transition.
3. **Dashboard** — View current character summary, trigger level-up, export PDF.

---

## Scope

### v1 Builds For
- **Class:** Cleric (Life Domain) only.
- **Edition:** 5e 2014 PHB rules.
- **Starting point:** Character enters at level 3 with all stats filled.
- **Level-up coverage:** Levels 4 through 20 (data for full progression).
- **PDF export:** Clean, annotation-friendly sheet for GoodNotes.

### v1 Does NOT Build
- Other classes (architecture supports adding them later as JSON data blocks).
- Character creation from level 1 (onboarding assumes you already have a character).
- Multiclassing.
- Homebrew content.
- Spell lookup/descriptions (too much data for v1; system shows spell names and slots).

### Extension Points
- Adding a new class = adding a new JSON data block to the class registry.
- Adding spell descriptions = adding a spell database JSON block.
- Multiclass support = future architecture change.

---

## Architecture

### Single File
- One `.html` file. All HTML, CSS, JS, and game data embedded.
- No external dependencies. No CDN. No build step.
- Player stores it in iPad Files or iCloud, taps to open in Safari.

### Data Storage
- `localStorage` persists the character JSON between sessions.
- Character object stores: identity, ability scores, HP, class features gained, spell/cantrip selections, equipment notes, and a level history log.
- Includes "Reset Character" (with confirmation dialog) and "Edit Character" mode.

### iPad Safari Requirements
- Touch targets minimum 44x44px.
- No hover-dependent interactions.
- Works in both landscape and portrait.
- Respects safe area insets.
- PDF export via browser print-to-PDF or jsPDF (evaluate during build — jsPDF preferred for layout control if bundle size is acceptable).

---

## Data Model

### Character Object (stored in localStorage)

```
{
  name: "Thorin Iron Shield",
  race: "Hill Dwarf",
  class: "Cleric",
  subclass: "Life Domain",
  background: "Soldier",
  alignment: "Neutral Good",
  level: 3,

  abilityScores: {
    str: 14, dex: 8, con: 15, int: 10, wis: 16, cha: 12
  },

  hp: {
    max: 26,          // Current max HP (user-entered, includes CON + racial)
    hitDiceType: 8,    // d8 for Cleric
    hitDiceCount: 3,   // Equal to level
    hpHistory: [       // Track each level's HP gain for audit
      { level: 1, gained: 11, method: "base", notes: "8 + 2 CON + 1 Dwarf Toughness" },
      { level: 2, gained: 8, method: "roll", notes: "5 + 2 CON + 1 Dwarf Toughness" },
      { level: 3, gained: 7, method: "roll", notes: "4 + 2 CON + 1 Dwarf Toughness" }
    ]
  },

  proficiencyBonus: 2,    // Derived from level
  ac: 16,                 // User-entered (gear-dependent)
  speed: 25,              // Dwarf base
  initiative: -1,         // DEX mod

  savingThrows: ["wis", "cha"],   // Cleric proficiencies
  skillProficiencies: ["athletics", "medicine", "religion"],

  cantripsKnown: ["Light", "Thaumaturgy", "Sacred Flame"],
  
  spellSlots: { 1: 4, 2: 2 },          // Derived from level
  preparedSpellCount: 6,                 // Level + WIS mod
  currentPreparedSpells: [              // Player's current prep list (names only)
    "Healing Word", "Guiding Bolt", "Command", "Sanctuary", "Aid", "Prayer of Healing"
  ],
  domainSpells: {                        // Always prepared, don't count against limit
    1: ["Bless", "Cure Wounds"],
    3: ["Lesser Restoration", "Spiritual Weapon"]
  },
  
  features: [
    "Disciple of Life",
    "Channel Divinity: Turn Undead",
    "Channel Divinity: Preserve Life"
  ],
  channelDivinityUses: 1,

  equipment: "",          // Free text — player manages this
  notes: "",              // Free text — campaign notes, personality, etc.
  
  levelHistory: [         // Decisions log for each level-up
    // Populated as player levels up through the wizard
  ]
}
```

### Cleric Level-Up Data (embedded JSON)

Defines what happens at each level. The wizard reads this to know what to present.

```
clericProgression: {
  4: {
    hpDie: "d8",
    features: [],
    spellSlots: { 1: 4, 2: 3 },
    preparedSpellFormula: "level + wisMod",
    cantripsKnown: 4,                    // Gains 1 new cantrip (had 3)
    channelDivinityUses: 1,
    proficiencyBonus: 2,
    decisions: [
      {
        type: "asi_or_feat",
        label: "Ability Score Improvement",
        description: "Choose one: increase one ability score by 2, increase two different ability scores by 1 each, or take a feat.",
        options: ["asi_plus_2", "asi_plus_1_1", "feat"]
      },
      {
        type: "cantrip_choice",
        label: "New Cantrip",
        description: "You learn one additional cleric cantrip.",
        options: ["Guidance", "Mending", "Resistance", "Sacred Flame", "Spare the Dying", "Thaumaturgy", "Light", "Toll the Dead"]
        // Filter out already-known cantrips at runtime
      }
    ],
    newSpellAccess: {
      note: "No new spell level unlocked. Your prepared spell count increases to level + WIS mod."
    }
  },
  5: {
    hpDie: "d8",
    features: ["Destroy Undead (CR 1/2)"],
    spellSlots: { 1: 4, 2: 3, 3: 2 },
    preparedSpellFormula: "level + wisMod",
    cantripsKnown: 4,
    channelDivinityUses: 1,
    proficiencyBonus: 3,                  // Increases!
    decisions: [],                         // No choices at level 5
    domainSpells: {
      5: ["Beacon of Hope", "Revivify"]
    },
    newSpellAccess: {
      level: 3,
      note: "You can now prepare and cast 3rd-level spells."
    },
    proficiencyIncrease: {
      from: 2,
      to: 3,
      affects: [
        "Spell save DC increases to 14 (8 + 3 + WIS mod)",
        "Spell attack bonus increases to +6",
        "Proficient skill and save bonuses increase by 1",
        "Turn Undead DC increases to 14"
      ]
    }
  }
  // ... levels 6-20 follow same pattern
}
```

### Life Domain Specific Data

```
lifeDomain: {
  domainSpells: {
    1: ["Bless", "Cure Wounds"],
    3: ["Lesser Restoration", "Spiritual Weapon"],
    5: ["Beacon of Hope", "Revivify"],
    7: ["Death Ward", "Guardian of Faith"],
    9: ["Mass Cure Wounds", "Raise Dead"]
  },
  features: {
    1: { name: "Disciple of Life", level: 1 },
    2: { name: "Channel Divinity: Preserve Life", level: 2 },
    6: { name: "Blessed Healer", level: 6 },
    8: { name: "Divine Strike", level: 8 },
    17: { name: "Supreme Healing", level: 17 }
  }
}
```

---

## User Flows — Detail

### Onboarding (First Launch)

Multi-step form. Progress bar at top. Back/Next navigation. Each step validates before proceeding.

**Step 1 — Identity**
- Character name
- Race (dropdown — Hill Dwarf default for v1)
- Class → Cleric (only option in v1)
- Domain → Life (only option in v1)
- Background (text input)
- Alignment (dropdown)
- Level: 3 (number input — v1 starts here)

**Step 2 — Ability Scores**
- Six fields: STR, DEX, CON, INT, WIS, CHA
- Modifiers auto-calculate and display beside each
- Pre-fill with Thorin's scores as defaults (player can change)

**Step 3 — Combat Stats**
- HP Maximum (number input)
- AC (number input)
- Speed (pre-filled 25 for Dwarf)
- HP history: optional — allow entering per-level HP breakdown or just total

**Step 4 — Spells & Cantrips**
- Show cantrips known (checkboxes from Cleric cantrip list, select 3 for level 3)
- Show domain spells (auto-populated, read-only, labeled "always prepared")
- Prepared spell count displayed: "You can prepare 6 spells (level 3 + WIS mod 3)"
- Optional: select currently prepared spells from Cleric spell list

**Step 5 — Equipment & Notes**
- Equipment: free text area (player types or pastes their gear)
- Notes: free text area (personality, bonds, campaign notes)
- These carry through to the PDF but are player-managed

**Step 6 — Review & Save**
- Full summary of everything entered
- "Save Character" button → writes to localStorage → navigates to Dashboard

### Dashboard (Returning Player)

The home screen after onboarding. Shows:

- Character name, class, level prominently
- Key stats at a glance: HP, AC, Spell Save DC, Spell Attack, Prof Bonus
- Ability scores with modifiers
- Current spell slots
- **"Level Up" button** (large, prominent)
- **"Export PDF" button**
- **"Edit Character" button** (opens editable version of onboarding)

### Level-Up Wizard

Triggered from Dashboard. Displays: "Level 3 → Level 4"

The wizard reads the `clericProgression[4]` data and presents each change/decision sequentially.

**Screen 1 — HP Increase**
- Shows: "Your hit die is a d8. Your CON modifier is +2. Hill Dwarf Toughness adds +1."
- Two options:
  - "Roll" → number input where player types their actual roll → system adds CON mod + racial → shows new total
  - "Take Average" → auto-calculates (5 + CON mod + Dwarf Toughness = 8) → shows new total
- Display: "HP Max: 26 → [new value]"

**Screen 2 — ASI or Feat (Level 4 specific)**
- Explains: "At level 4, you gain an Ability Score Improvement."
- Three options presented with descriptions:
  - **+2 to one score** → dropdown to pick which ability → shows before/after including mod change
  - **+1 to two scores** → two dropdowns → shows before/after
  - **Take a Feat** → text input for feat name + free text for notes (v1 doesn't have full feat database — player enters what they've chosen; future version could have a feat picker)
- Recalculates all affected derived stats in real-time:
  - If WIS increases: spell save DC, spell attack, prepared spell count, Perception, Insight, Medicine
  - If CON increases: retroactive HP note (flag this — 5e doesn't retroactively change HP from CON ASI by RAW, but many tables house-rule it)

**Screen 3 — New Cantrip (Level 4 specific)**
- Shows Cleric cantrip list minus already-known cantrips
- Player picks one
- Brief mechanical note for each option (v1: just names; future: descriptions)

**Screen 4 — Spell Slot Changes**
- Shows: "Your spell slots change from [old] to [new]"
- Visual slot display (filled circles or similar)
- If new spell level unlocked: highlighted callout
- Shows new prepared spell count

**Screen 5 — New Features (if any)**
- At level 4: none for Cleric
- At level 5: shows "Destroy Undead (CR 1/2)" with description
- At levels with domain features: shows domain feature with description

**Screen 6 — Summary & Confirm**
- Shows everything that changed, all at once:
  - HP: 26 → 34 (or whatever)
  - New cantrip: [selection]
  - ASI/Feat: [selection]
  - Spell slots: [old → new]
  - Prepared spells: [old count → new count]
  - Any new features
- "Confirm Level Up" button → applies all changes to character object → saves to localStorage → returns to Dashboard at new level
- "Go Back" option to revise any decision

---

## PDF Export

### Design Philosophy
- **NOT a replica of the official WotC sheet.** Custom layout optimized for readability and Apple Pencil annotation.
- Clean, organized sections with generous whitespace.
- Designated blank areas for in-game notes.
- Sized for iPad screen viewing in GoodNotes (letter or A4).

### Sheet Layout (Single Page if possible, 2 pages max)

**Header Row**
- Character name (large), Class/Level, Race, Background, Alignment

**Left Column**
- Ability Scores (score + modifier for each)
- Saving Throws (marked proficiencies)
- Skills (marked proficiencies, calculated bonuses)

**Center Column**
- AC, Initiative, Speed
- HP Maximum, Hit Dice
- Proficiency Bonus
- Attacks (user-entered or from equipment)
- Spell Save DC, Spell Attack Bonus

**Right Column**
- Features & Traits (bulleted list)
- Channel Divinity uses
- Equipment summary

**Bottom Section (or Page 2)**
- Cantrips known
- Spell slots per level (visual: filled/empty circles)
- Domain spells (labeled "always prepared")
- Prepared spell list (with blank lines for player to pencil in daily changes)
- Large "Notes" area — blank lined space for Apple Pencil

### Technical Approach
- Prefer jsPDF for layout control (evaluate bundle size — if too heavy, use `window.print()` with a print-optimized CSS stylesheet as fallback).
- PDF generation happens entirely client-side in the browser.
- "Export PDF" button → generates → triggers download → player opens in GoodNotes.

---

## Visual Design

### App UI (the wizard itself)
- Dark parchment/warm tone aesthetic — feels like D&D without being corny.
- Large readable type. Minimal chrome.
- Step indicators for multi-screen flows.
- Big touch-friendly buttons.
- Subtle transitions between wizard steps.

### PDF Sheet
- Clean black on white/off-white. No decorative borders or fantasy fonts.
- Designed for print clarity and pencil annotation.
- Monospace or clean sans-serif for stats. Readable serif for features/text blocks.
- Section dividers, not boxes (easier to annotate around).

---

## Build Plan for CC

### Phase 1 — Skeleton & Onboarding
- HTML/CSS/JS scaffold. localStorage integration.
- Onboarding flow with all 6 steps.
- Dashboard view.
- Pre-load Thorin's level 3 data as defaults.

### Phase 2 — Level-Up Engine
- Cleric progression data (levels 4-20).
- Life Domain data.
- Level-up wizard flow: HP → decisions → spells → features → summary → confirm.
- Derived stat recalculation on every change.

### Phase 3 — PDF Export
- jsPDF integration (or print CSS fallback).
- Character sheet layout.
- Export button on dashboard.

### Phase 4 — Polish
- iPad Safari testing / layout fixes.
- Transitions and micro-interactions.
- Edge case handling (what if localStorage is cleared, etc.).

---

## Thorin's Level 3 Baseline (Seed Data)

For onboarding defaults and testing:

```
Name: Thorin Iron Shield
Race: Hill Dwarf
Class: Cleric (Life Domain)
Background: Soldier
Alignment: Neutral Good
Level: 3

STR 14 (+2)  DEX 8 (-1)  CON 15 (+2)
INT 10 (+0)  WIS 16 (+3)  CHA 12 (+1)

HP Max: 26
AC: 16 (Chain Mail + Shield)
Speed: 25 ft
Initiative: -1
Proficiency Bonus: +2

Saving Throws: WIS (+5), CHA (+3)
Skills: Athletics (+4), Insight (+3), Medicine (+5), Religion (+2)
  Insight is NOT proficient — +3 is WIS mod only (confirmed by player)

Cantrips: Light, Thaumaturgy, Sacred Flame
Spell Save DC: 13
Spell Attack: +5
Spell Slots: 1st: 4, 2nd: 2
Prepared Spell Count: 6 (3 + 3)

Domain Spells (always prepared):
  1st: Bless, Cure Wounds
  2nd: Lesser Restoration, Spiritual Weapon

Currently Prepared (non-domain, 6 of 6):
  1st: Healing Word, Guiding Bolt, Command, Sanctuary
  2nd: Aid, Prayer of Healing

Channel Divinity: 1/rest (Turn Undead, Preserve Life)

Attacks:
  Brain Smoothie (Morningstar — possibly magical/homebrew, standard is 1d8): +4, 2d8+2 piercing (+2 STR)
  Handaxe: +4, 1d6+2 slashing (throwable 20/60, disadvantage)

Equipment:
  Chain mail, shield, 2x handaxe, 1 scimitar, morningstar ("Brain Smoothie")
  Light crossbow, 5 bolts
  Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox,
  10 days rations, waterskin, 50ft rope, mason's tools,
  dagger from fallen enemy, holy symbol, playing cards,
  trophy, deck of playing cards, pouch, common clothes,
  rank insignia (sergeant)
  3 apples, gem eye patch, semi-precious stones,
  ring from 2x Rivas, scroll of augury
  3 gold idols
  49 GP, 63 SP, 10 GP (separate stash?)

Notes:
  25g each if we kill Glass-Staff
  1 point of inspiration
  Tressender Family Rings x2
```

---

## Open Questions (resolve during build or with player)

1. ~~**Insight skill:**~~ RESOLVED — Not proficient, +3 (WIS mod only) is correct.
2. ~~**Prepared spell count:**~~ RESOLVED — Shield of Faith removed. 6 prepared spells, at limit.
3. ~~**Brain Smoothie weapon:**~~ RESOLVED — Morningstar or mace. 2d8+2 piercing is non-standard (1d8 is PHB norm). Likely magical or homebrew. System stores as-is.
4. **HP history:** We know max is 26 at level 3. If player wants per-level breakdown in the system, they can enter it during onboarding. Otherwise just the total.
5. **CON ASI retroactive HP:** If player chooses +1 CON at level 4, does the table rule retroactive HP? System should ask.
6. **jsPDF vs print CSS:** Evaluate during Phase 3. jsPDF gives layout control but adds ~200KB to the file. Print CSS is zero-dependency but less predictable on iPad Safari.
