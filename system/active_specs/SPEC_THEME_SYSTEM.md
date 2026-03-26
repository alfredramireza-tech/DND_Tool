# SPEC: Theme System & Architecture — Tier 1 Class Expansion

## Purpose

Extend the app from Cleric-only to support multiple classes. This spec covers the shared architecture changes that must be built BEFORE any individual class is added.

---

## 0a. Color Theme System

The app currently uses hardcoded CSS variables for the gold/parchment Cleric theme. Convert to a dynamic theme system.

### Theme Data Model

Add `colorTheme` to the character object:

```
colorTheme: {
  preset: "cleric",
  accent: "#c4a35a",
  accentHover: "#d4b36a",
  accentDim: "#8a7340",
  surface: "#241e16",
  surfaceRaised: "#2e2720",
  bg: "#1a1410",
  border: "#3d3428",
  text: "#e8dcc8",
  textDim: "#a89880"
}
```

### Class Presets

**Cleric (Gold) — current theme:**
```
accent: #c4a35a, accentHover: #d4b36a, accentDim: #8a7340
bg: #1a1410, surface: #241e16, surfaceRaised: #2e2720
border: #3d3428, text: #e8dcc8, textDim: #a89880
```

**Fighter (Steel Blue):**
```
accent: #5a8abf, accentHover: #6a9acf, accentDim: #3a6090
bg: #121820, surface: #1a2230, surfaceRaised: #222e3d
border: #2d3a4d, text: #d8e4f0, textDim: #8098b8
```

**Barbarian (Crimson):**
```
accent: #c45a5a, accentHover: #d46a6a, accentDim: #8a3a3a
bg: #1a1012, surface: #281a1c, surfaceRaised: #322226
border: #4a2a30, text: #f0d8d8, textDim: #a88080
```

**Monk (Jade):**
```
accent: #5aaa6a, accentHover: #6aba7a, accentDim: #3a7a4a
bg: #101a14, surface: #182820, surfaceRaised: #203228
border: #2a4434, text: #d8f0e0, textDim: #80a888
```

**Rogue (Purple):**
```
accent: #8a6abf, accentHover: #9a7acf, accentDim: #6a4a90
bg: #16101a, surface: #201828, surfaceRaised: #2a2232
border: #3a2d4a, text: #e0d8f0, textDim: #9888b8
```

### Theme Application

On dashboard load:
```javascript
function applyTheme(theme) {
  if (!theme) return;
  var map = {
    accent: '--accent', accentHover: '--accent-hover', accentDim: '--accent-dim',
    surface: '--surface', surfaceRaised: '--surface-raised', bg: '--bg',
    border: '--border', text: '--text', textDim: '--text-dim'
  };
  Object.keys(map).forEach(function(key) {
    if (theme[key]) document.documentElement.style.setProperty(map[key], theme[key]);
  });
  document.body.style.background = theme.bg || '';
  document.querySelector('html').style.background = theme.bg || '';
}
```

Call `applyTheme(character.colorTheme)` when loading dashboard and when switching characters.

When creating a new character, auto-assign the class default theme.

### Custom Theme Editor

Accessible from dashboard via "Theme" or "Appearance" button (near Edit Character).

Shows:
- **Preset buttons** — one per class (Cleric, Fighter, Barbarian, Monk, Rogue). Tap to apply instantly with live preview.
- **Color pickers** — individual pickers for: accent, background, surface, text. Only for players who want to customize beyond presets.
- **"Reset to Class Default" button**
- Changes save to the character object immediately.

Keep this simple. Presets are the main feature. Custom pickers are optional power-user controls.

---

## 0b. Class Selection in Onboarding

Update the Class dropdown in onboarding Step 1:

**Class options:** Cleric, Fighter, Barbarian, Monk, Rogue

**Subclass dropdown changes based on class:**
- Cleric → Domain: Life
- Fighter → Archetype: Champion, Battle Master, Eldritch Knight
- Barbarian → Path: Berserker, Totem Warrior
- Monk → Tradition: Open Hand, Shadow, Four Elements
- Rogue → Archetype: Thief, Assassin, Arcane Trickster

**Saving throws auto-set by class:**
- Cleric: WIS, CHA
- Fighter: STR, CON
- Barbarian: STR, CON
- Monk: STR, DEX
- Rogue: DEX, INT

**Skill proficiency options change by class (onboarding Step 2):**
- Cleric: choose 2 from History, Insight, Medicine, Persuasion, Religion
- Fighter: choose 2 from Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival
- Barbarian: choose 2 from Animal Handling, Athletics, Intimidation, Nature, Perception, Survival
- Monk: choose 2 from Acrobatics, Athletics, History, Insight, Religion, Stealth
- Rogue: choose 4 from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth

**Rogue Expertise:** At level 1, Rogue picks 2 skills for Expertise (double proficiency). Add this to onboarding — after skill selection, show "Choose 2 skills for Expertise" from the proficient skills. Store as `expertiseSkills` array in character object.

**Step 4 (Spells & Cantrips) visibility:**
- Cleric: show (full prepared caster)
- Fighter: skip UNLESS subclass is Eldritch Knight (then show limited spell selection)
- Barbarian: skip always
- Monk: skip UNLESS subclass is Four Elements (then show discipline selection instead of spells)
- Rogue: skip UNLESS subclass is Arcane Trickster (then show limited spell selection)

**Hit Dice by class:**
- Cleric: d8
- Fighter: d10
- Barbarian: d12
- Monk: d8
- Rogue: d8

---

## 0c. Class-Specific Dashboard Layout

The dashboard reorders sections based on class. Define section order:

**Cleric:** HP → Stats → Abilities → Spell Slots → Channel Divinity → Cantrips → Domain Spells → Prepared Spells → Weapons → Rest → Dice → Currency → Equipped → Inventory → Notes

**Fighter:** HP → Stats → Weapons → Action Surge → Second Wind → Extra Attack → Fighting Style → Abilities → Spell Slots (Eldritch Knight only) → Rest → Dice → Currency → Equipped → Inventory → Notes

**Barbarian:** HP → Rage → Stats → Weapons → Reckless Attack → Abilities → Rest → Dice → Currency → Equipped → Inventory → Notes

**Monk:** HP → Ki Points → Stats → Ki Abilities → Martial Arts → Weapons → Abilities → Rest → Dice → Currency → Equipped → Inventory → Notes

**Rogue:** HP → Sneak Attack → Stats → Cunning Action → Weapons → Abilities → Spell Slots (Arcane Trickster only) → Rest → Dice → Currency → Equipped → Inventory → Notes

The `renderDashboard()` function checks `character.class` and assembles sections in the defined order. Sections that don't apply to a class are omitted entirely.

---

## 0d. Reusable Resource Tracker Component

Multiple classes need tappable resource pips (Rage, Ki, Action Surge, Superiority Dice, Channel Divinity, etc.). Build one reusable component:

```
function renderResourceTracker(name, resourceKey, max, char, options)
```

Parameters:
- `name`: Display label ("Ki Points", "Rage", etc.)
- `resourceKey`: Key in `character.resources` object
- `max`: Maximum uses
- `char`: Character object
- `options`: { icon, color, description, restType: "short"|"long" }

Shows `max` pips/icons. Tapped pips toggle used/available. Persists via:
```
resources: {
  rage: { used: 0 },
  ki: { used: 0 },
  actionSurge: { used: 0 },
  secondWind: { used: 0 },
  superiorityDice: { used: 0 },
  channelDivinity: { used: 0 }
}
```

Migrate existing `channelDivinityUsed` and `spellSlotsUsed` into this `resources` object for consistency, or keep them separate — whichever is cleaner. But all NEW resource trackers should use this pattern.

### Rest Button Updates

Rest buttons need class-aware refresh logic:

**Short Rest refreshes:**
- Cleric: Channel Divinity
- Fighter: Action Surge, Second Wind, Superiority Dice (Battle Master)
- Barbarian: nothing
- Monk: Ki Points
- Rogue: nothing (Stroke of Luck at level 20 only)

**Long Rest refreshes:**
- All classes: everything (all resources, spell slots, HP to max, temp HP cleared)

---

## 0e. Unarmored Defense

Barbarian and Monk both have Unarmored Defense but with different formulas. The AC calculation system needs to handle:

- **No armor + not Barbarian/Monk:** AC = 10 + DEX mod
- **No armor + Barbarian:** AC = 10 + DEX mod + CON mod
- **No armor + Monk:** AC = 10 + DEX mod + WIS mod
- **Armor equipped:** Use current armor calculation (heavy/medium/light + shield)

A character using Unarmored Defense can still use a shield (+2 AC) on top of the unarmored calculation.

Update `calculateAC()` to check `character.class` when no armor is equipped.

---

## 0f. Backward Compatibility

When loading an existing character (saved before this update):
- If `colorTheme` is missing, assign the Cleric default
- If `resources` is missing, default to `{}`
- If `expertiseSkills` is missing, default to `[]`
- Existing Cleric characters should work exactly as before with no changes required
