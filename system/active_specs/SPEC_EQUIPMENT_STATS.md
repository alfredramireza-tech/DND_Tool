# SPEC_EQUIPMENT_STATS — Magic Item Mechanical Integration

**Status:** Draft — awaiting review  
**Scope:** Equipment form expansion, ability score pipeline, save bonuses, attunement, charges, daily uses, speed, stealth disadvantage  
**Files affected:** `js/resources.js`, `js/utils.js`, `js/rolls.js`, `js/equipment.js`, `js/dashboard.js`, `js/combat.js`, `js/levelup.js`, `js/onboarding.js`, `data/shared.js`, `styles.css`

---

## Overview

Currently, equipment items only carry AC-related stats (base AC, AC bonus, magic bonus, armor type). Real D&D magic items affect ability scores, saving throws, speed, stealth, and have charges or daily-use abilities. This spec adds full mechanical integration so that equipped items automatically affect all derived statistics.

**Design principle:** Only **equipped** items affect mechanics. Unequipped items in `c.unequippedItems` store the same data but are inert. Equipping/unequipping an item immediately recalculates all derived stats.

---

## Part 1: Equipment Data Model Expansion

### New Fields on Equipment Item Objects

Add these optional fields to the equipment item schema (applies to both `equippedItems` and `unequippedItems`):

```js
{
  // Existing fields (unchanged)
  name: "Cloak of Protection",
  slot: "cloak",           // armor | shield | ring | cloak | other
  armorType: null,         // light | medium | heavy | null
  stats: { ac: 0, acBonus: 0 },
  magicBonus: 1,
  notes: "",

  // NEW FIELDS — all optional, default to null/empty when absent
  saveBonusAll: 1,              // +N to ALL six saving throws
  saveBonusSpecific: null,      // { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 } — per-ability save bonuses
  abilityOverride: null,        // { str: 19 } — sets ability score TO this value (only if higher than natural)
  abilityBonus: null,           // { con: 2 } — adds to ability score
  resistance: [],               // ["fire", "poison"] — damage resistances (display only, no auto-calculation)
  speedBonus: 0,                // +N feet to speed
  stealthDisadvantage: false,   // true = disadvantage on Stealth checks
  requiresAttunement: false,    // true = counts toward 3-item attunement limit
  attuned: false,               // true = currently attuned (only meaningful if requiresAttunement is true)
  charges: null,                // { max: 7, current: 7, rechargeOn: "dawn" } or null if no charges
                                // rechargeOn: "dawn" | "short" | "long" | "none"
  dailyUses: null               // { max: 1, current: 1, label: "Cast Invisibility" } or null if no daily use
                                // Always recharges at dawn (long rest). For items with "once per day" abilities.
}
```

### Charges vs Daily Uses

These are two separate systems for two different item patterns:

**Charges** (`charges` field): For items with a pool of expendable uses where different abilities may cost different amounts. Example: Staff of Healing has 10 charges — Cure Wounds costs 1, Mass Cure Wounds costs 5. The player decides how many to spend per use.

**Daily Uses** (`dailyUses` field): For items with simple "once per day" (or N per day) abilities. Example: Cloak of Displacement can be activated once per day. Helm of Teleportation lets you cast Teleport once per day. The player taps "Use" and it decrements by 1.

An item can have BOTH — some items mix a charge pool with a separate daily ability. In practice, most items use one or the other.

Both recharge similarly but at different triggers:
- `charges.rechargeOn` determines when charges refill (dawn/short/long/none)
- `dailyUses` ALWAYS recharges at dawn (long rest) — this is the D&D standard for "per day" abilities

### Attunement Rules

- D&D 5e limits a character to **3 attuned items** at once.
- `requiresAttunement` marks items that need attunement.
- `attuned` tracks whether the item is currently attuned.
- **Items that require attunement but are NOT attuned provide no magical benefits.** Their stat fields (saveBonusAll, abilityOverride, etc.) must be ignored by all calculation functions unless `attuned` is true. Non-attunement items always apply their stats.
- The equipment form sets `attuned = true` automatically when equipping an attunement item if the character has fewer than 3 attuned items. If at the cap, show an error and block equipping (or allow equipping without attunement — let the player choose to un-attune something else first).

### Helper: `isItemActive(item)`

Returns `true` if the item's magical stats should apply:
```
function isItemActive(item) {
  if (!item.requiresAttunement) return true;
  return !!item.attuned;
}
```

All stat-reading functions below use this check before including an item's bonuses.

---

## Part 2: The Ability Score Pipeline

### Core Function: `getEffectiveAbilityScore(c, ability)`

**Location:** `js/utils.js` (alongside `mod()`, `calculateAC()`, and other shared utilities)

```
function getEffectiveAbilityScore(c, ability) {
  var base = c.abilityScores[ability] || 10;
  var highestOverride = null;
  var totalBonus = 0;

  (c.equippedItems || []).forEach(function(item) {
    if (!isItemActive(item)) return;
    if (item.abilityOverride && item.abilityOverride[ability] !== undefined) {
      var ov = item.abilityOverride[ability];
      if (highestOverride === null || ov > highestOverride) highestOverride = ov;
    }
    if (item.abilityBonus && item.abilityBonus[ability]) {
      totalBonus += item.abilityBonus[ability];
    }
  });

  // Override replaces base if higher; bonuses stack on top of the higher of base/override
  var effective = highestOverride !== null ? Math.max(base, highestOverride) : base;
  effective += totalBonus;

  return effective;
}
```

**D&D rule:** Ability score overrides (like Gauntlets of Ogre Power setting STR to 19) only apply if the override is higher than the natural score. If the character's natural STR is 20, the Gauntlets do nothing. Bonuses (like a +2 CON from an item) stack on top of whichever is higher.

**No cap at 20:** Magic items can push ability scores above 20 (Belt of Storm Giant Strength sets STR to 29). Do not cap.

### Convenience: `getEffectiveMod(c, ability)`

```
function getEffectiveMod(c, ability) {
  return mod(getEffectiveAbilityScore(c, ability));
}
```

### Consumer Migration — All Direct Reads Must Change

Every place in the codebase that reads `c.abilityScores[ability]` to compute a mechanical value must switch to `getEffectiveAbilityScore(c, ability)`. **CC must search the entire codebase** for patterns like:

- `c.abilityScores.str` / `c.abilityScores[ability]` / `char.abilityScores[ability]`
- `mod(c.abilityScores.` / `mod(char.abilityScores.`

And replace with `getEffectiveAbilityScore()` / `getEffectiveMod()` **except** in these cases where the RAW base score is correct:

- **Level-up ASI selection UI** (`js/levelup.js`): When showing "STR 14 → 16", the base score is what's being modified. ASIs increase the base `c.abilityScores`, not the effective score. The selection dropdowns and score display should show base scores. However, the **modifier preview** needs special handling — see below.
- **Onboarding form** (`js/onboarding.js`): During character creation, there are no equipped items yet. `abilityScores` reads are fine as-is, though using `getEffectiveAbilityScore` wouldn't break anything since `equippedItems` would be empty.
- **Saving the character object**: The stored `c.abilityScores` must remain the BASE scores. Never write effective scores back to the character object.

### Level-Up ASI Preview with Equipment Overrides

When computing ASI derived changes in `getAsiDerivedChanges()`, the **old** modifier should use `getEffectiveMod(c, ability)` to reflect current equipment. The **new** modifier requires simulating what the effective score would be after the ASI:

1. Store the original base: `var origBase = c.abilityScores[ability]`
2. Temporarily set: `c.abilityScores[ability] = origBase + asiIncrease`
3. Call `getEffectiveAbilityScore(c, ability)` to get the simulated new effective value
4. Restore: `c.abilityScores[ability] = origBase`
5. Use the simulated value for the new modifier

This matters because if base STR is 14 and Gauntlets override to 19, adding +2 ASI makes base 16 — but effective is still 19 (override wins). The preview should reflect that the modifier doesn't actually change in this case.

If this temporary mutation approach is too fragile, an acceptable fallback: skip the modifier preview entirely when an equipment override is active on that ability, showing a note like "Modified by equipment" instead.

### Known Consumer Locations (non-exhaustive — CC must search for all)

| File | Function | What it reads | What changes |
|------|----------|---------------|--------------|
| `js/rolls.js` | `doAbilityRoll()` | `char.abilityScores[ability]` | Use `getEffectiveAbilityScore` |
| `js/rolls.js` | `doSkillRoll()` | `char.abilityScores[skill.ability]` | Use `getEffectiveAbilityScore` |
| `js/combat.js` | `rollInitiative()` | `c.abilityScores.dex` | Use `getEffectiveAbilityScore` |
| `js/utils.js` | `calculateAC()` | `c.abilityScores.dex` (and unarmored defense ability) | Use `getEffectiveAbilityScore` |
| `js/equipment.js` | `renderAbilityChecks()` | `c.abilityScores[ab]` for save/skill bonus display | Use `getEffectiveAbilityScore` |
| `js/equipment.js` | Spell save DC / spell attack display | WIS/INT/CHA mod computation | Use `getEffectiveMod` |
| `js/dashboard.js` | Stat cards display | Ability mods shown on dashboard | Use `getEffectiveMod` |
| `js/levelup.js` | `getAsiDerivedChanges()` | Computes spell DC, attack, prepared spells | Use `getEffectiveMod` for old values; simulate for new values (see above) |
| `js/resources.js` | `applyHpChange()` (concentration check) | `mod(c.abilityScores.con)` for CON save bonus display | Use `getEffectiveMod(c, 'con')` and add `getEquipSaveBonus(c, 'con')` to the displayed bonus |
| `js/onboarding.js` | `onPreparedChange()` | `mod(abilScore)` for prepared spell count | Safe as-is (no equipment at onboarding) |
| `js/onboarding.js` | `collectFormData()` | Initiative = `mod(abilityScores.dex)` | Safe as-is |
| `data/shared.js` | Default character data | Static data, not computed | No change |

---

## Part 3: Saving Throw Bonuses

### How It Works

Equipment can add bonuses to saving throws via two fields:
- `saveBonusAll` — flat number added to ALL six saves (Cloak of Protection, Ring of Protection)
- `saveBonusSpecific` — object with per-ability bonuses (e.g., a ring granting +2 to DEX saves only)

### New Helper: `getEquipSaveBonus(c, ability)`

**Location:** `js/utils.js`

```
function getEquipSaveBonus(c, ability) {
  var total = 0;
  (c.equippedItems || []).forEach(function(item) {
    if (!isItemActive(item)) return;
    if (item.saveBonusAll) total += item.saveBonusAll;
    if (item.saveBonusSpecific && item.saveBonusSpecific[ability]) {
      total += item.saveBonusSpecific[ability];
    }
  });
  return total;
}
```

### Consumer Updates

**`doAbilityRoll()` in `js/rolls.js`** — when `isProficient` is true (it's a save roll):
- After computing `bonus`, add `getEquipSaveBonus(char, ability)`.
- Include in the modifier label: if equipment save bonus > 0, append `+N equip` to `modLabel`.
- **Important:** Equipment save bonuses only apply to saves, not ability checks. The `getEquipSaveBonus` call must be gated on `isProficient`.

**`renderAbilityChecks()` in `js/equipment.js`** — the save button display:
- When computing the displayed bonus number for each save button, add `getEquipSaveBonus(c, ab)`.
- This ensures the button shows the correct total before the player taps it.

**`applyHpChange()` in `js/resources.js`** — the concentration check display:
- The inline CON save bonus calculation must include `getEquipSaveBonus(c, 'con')` in addition to the ability mod and proficiency bonus.

---

## Part 4: Speed Bonus

### How It Works

Equipment with `speedBonus` adds to the character's base speed.

### Display Update

In the dashboard header or stat display area where speed is shown, compute:

```
var equipSpeedBonus = 0;
(c.equippedItems || []).forEach(function(item) {
  if (!isItemActive(item)) return;
  equipSpeedBonus += (item.speedBonus || 0);
});
var effectiveSpeed = (c.speed || 30) + equipSpeedBonus;
```

Display `effectiveSpeed` instead of raw `c.speed`. If there's a bonus, optionally show `"30 + 10 = 40 ft"` or just `"40 ft"`.

### Initiative / Movement

Speed doesn't affect initiative in 5e, and we don't track movement per turn, so this is display-only.

---

## Part 5: Stealth Disadvantage

### How It Works

Equipment with `stealthDisadvantage: true` imposes disadvantage on Stealth checks. This already exists conceptually for heavy armor (the notes field says "Disadvantage on Stealth") but isn't mechanically enforced.

### Consumer Update

**`doSkillRoll()` in `js/rolls.js`** — when `skillName` is `"Stealth"`:
- Check if any equipped item has `stealthDisadvantage: true` AND `isItemActive(item)`.
- If yes, roll 2d20 and take the lower (disadvantage). Show both rolls in the result.
- If the character also has a source of advantage on Stealth (e.g., from a buff in `externalBuffs`), they cancel out — roll normally. Check `externalBuffs` for any advantage-granting buffs on stealth/checks.

### Display

In `renderAbilityChecks()`, if stealth disadvantage is active from equipment, add a small indicator next to the Stealth skill button — e.g., a dim "(disadv)" label.

---

## Part 6: Resistance Display

### How It Works

Equipment `resistance` arrays list damage types the character resists. This is **display-only** — we don't auto-halve damage (damage application is manual).

### Display

In the dashboard, if any equipped active item has non-empty `resistance` arrays, show a "Resistances" line in the stats area or near HP:

```
Resistances: fire, poison
```

Collect from all equipped active items, deduplicate, sort alphabetically.

---

## Part 7: Attunement Tracking

### Dashboard Display

Add an "Attunement" indicator near the equipment section header:

```
Attunement: 2/3
```

Count: number of equipped items where `requiresAttunement && attuned` is true. Only show this indicator if the character has at least one item with `requiresAttunement`.

### Equip Validation (extends existing equip validation)

When equipping an item with `requiresAttunement: true`:
1. Count current attuned items.
2. If count < 3, auto-set `attuned = true`.
3. If count >= 3, show inline error: "You're already attuned to 3 items. Un-attune one first."
4. Allow equipping WITHOUT attunement — the item occupies the slot but provides no magical benefits. The player can tap to attune later after freeing a slot.

### Attune/Un-attune Toggle

On each equipped item that has `requiresAttunement`, add a toggle button:
- If attuned: show "Attuned ✓" (tap to un-attune)
- If not attuned: show "Attune" (tap to attune, subject to 3-item cap)

Un-attuning an item means its magical stats stop applying immediately (all derived stats recalculate on next dashboard render).

---

## Part 8: Charge Tracking

### Data Model

```js
charges: {
  max: 7,
  current: 7,
  rechargeOn: "dawn"   // "dawn" | "short" | "long" | "none"
}
```

### Dashboard Display

For each equipped item with `charges !== null`, show a charge counter below the item name:

```
Staff of Healing       [Edit] [Unequip] [×]
  Charges: ●●●●●○○  5/7   [-1] [+1]
  Recharges at dawn
```

- **-1 button:** Decrements `current` by 1 (minimum 0). If the player needs to spend multiple charges, they tap multiple times.
- **+1 button:** Increments `current` by 1 (maximum `max`). For manual correction.
- Use dots/pips for `max <= 10`, numeric display for `max > 10`.

### Rest Integration

**In `doShortRest()`:** After existing resource resets, iterate `c.equippedItems`. For each item where `isItemActive(item)` and `item.charges` exists:
- If `charges.rechargeOn === "short"`, set `charges.current = charges.max` and log: `logEvent(item.name + ' recharged to ' + charges.max + '/' + charges.max, c)`.

**In `doLongRest()`:** After existing resource resets, iterate `c.equippedItems`. For each item where `isItemActive(item)` and `item.charges` exists:
- If `charges.rechargeOn === "short"` OR `"long"` OR `"dawn"`, set `charges.current = charges.max` and log the recharge.

Both functions handle charge recharge independently — `doLongRest` does NOT call `doShortRest`, so "short" recharge items must be explicitly handled in both.

**`rechargeOn` values explained:**
- `"dawn"` — recharges at dawn. Treated as long rest for game purposes. Display says "Recharges at dawn."
- `"long"` — recharges on long rest. Display says "Recharges on long rest."
- `"short"` — recharges on short rest (and therefore also long rest). Display says "Recharges on short rest."
- `"none"` — does not recharge automatically. Player uses the +1 button manually. Display says "Does not recharge."

### Log Events

When using a charge: `logEvent('Used 1 charge of ' + itemName + ' (' + remaining + '/' + max + ' left)', c)`.
When charges recharge via rest: `logEvent(itemName + ' recharged to ' + max + '/' + max, c)`.

---

## Part 9: Daily Use Tracking

### Data Model

```js
dailyUses: {
  max: 1,
  current: 1,
  label: "Cast Invisibility"   // Descriptive label for what the ability does
}
```

This covers the common "once per day" item pattern (Cloak of Displacement, Helm of Teleportation, etc.) as well as "N times per day" items. The `label` field lets the dashboard show what the ability actually does rather than a generic "Use" button.

### Dashboard Display

For each equipped item with `dailyUses !== null`, show below the item name:

```
Cloak of Displacement           [Edit] [Unequip] [×]
  Cast Invisibility: ● 1/1     [Use]
```

Or for multi-use:
```
Helm of Teleportation           [Edit] [Unequip] [×]
  Cast Teleport: ●●○ 2/3       [Use] [+]
```

- **Use button:** Decrements `current` by 1 (minimum 0).
- **+ button:** Increments `current` by 1 (maximum `max`). For manual correction.
- Use dots/pips since daily uses are typically low numbers (1–3).

### Rest Integration

**In `doLongRest()` only:** After existing resource resets, iterate `c.equippedItems`. For each item where `isItemActive(item)` and `item.dailyUses` exists:
- Set `dailyUses.current = dailyUses.max`.
- Log: `logEvent(item.name + ' daily use restored', c)`.

Daily uses do NOT recharge on short rest — they always recharge at dawn/long rest per D&D convention.

### Log Events

When using: `logEvent('Used ' + item.name + ': ' + dailyUses.label + ' (' + remaining + '/' + max + ' left)', c)`.

### Distinction from Charges

If the player isn't sure whether to use `charges` or `dailyUses` for a particular item:
- **Charges** if the item has a pool where different abilities cost different amounts (Staff of Healing: Cure Wounds = 1 charge, Mass Cure Wounds = 5 charges)
- **Daily uses** if the item has a simple "you can do X once/twice/etc. per day" (Cloak of Displacement, Helm of Teleportation)
- Both can coexist on the same item if needed

---

## Part 10: Equipment Form Updates

### Expanded Form Layout

The equipment form (`showEquipForm()` in `js/resources.js`) needs new fields. Organize the form into sections so it doesn't become overwhelming:

**Section 1 — Basic Info (existing, unchanged)**
- Name, Slot, Armor Type, Base AC / AC Bonus, Magic Bonus, Notes

**Section 2 — Attunement (new, always visible)**
- Requires Attunement: checkbox (single checkbox, low visual weight)

**Section 3 — Charges (new, progressive disclosure)**
- "Has Charges" checkbox — if checked, reveal:
  - Max Charges: number input
  - Recharge On: select (dawn / short rest / long rest / none)
  - Current charges auto-set to max on creation

**Section 4 — Daily Uses (new, progressive disclosure)**
- "Has Daily Use" checkbox — if checked, reveal:
  - Uses Per Day: number input (default 1)
  - Ability Label: text input (e.g., "Cast Invisibility", "Activate Displacement")
  - Current uses auto-set to max on creation

**Section 5 — Advanced Stats (new, behind expandable "More Properties" toggle)**
- Ability Override: a row of 6 small number inputs (STR through CHA). Empty = no override. Hint text: "Sets score to this value (e.g., 19 for Gauntlets of Ogre Power)"
- Ability Bonus: a row of 6 small number inputs. Empty = no bonus. Hint text: "Adds to score (e.g., +2 CON)"
- Save Bonus (All): number input. Hint: "+N to all saving throws"
- Save Bonus (Specific): a row of 6 small number inputs (STR through CHA). For items that boost specific saves only.
- Speed Bonus: number input. Hint: "+N feet to speed"
- Stealth Disadvantage: checkbox. Pre-check automatically when slot is "armor" and armorType is "heavy" (but allow the player to override — some heavy armor like Mithral doesn't impose disadvantage).
- Resistance: text input or tag-style entry. Player types damage types separated by commas. Store as array.

### Form Layout — Progressive Disclosure

Not every item needs every field. The form must NOT show 20+ fields at once:

1. Basic fields (name, slot, AC stuff, magic bonus, notes) — always visible
2. Attunement checkbox — always visible (it's just one checkbox)
3. "Has Charges" checkbox — if checked, reveal charge fields
4. "Has Daily Use" checkbox — if checked, reveal daily use fields
5. "More Properties" expandable section — contains ability overrides, ability bonuses, save bonuses, speed, stealth, resistance

Most items (mundane armor, simple shields) use only section 1. Magic items expand sections as needed.

---

## Part 11: Migration

### Existing Characters

No destructive migration needed. The new fields are all optional and default to null/empty/false. Existing equipment items simply won't have them, and all helper functions use fallbacks:

- `isItemActive(item)` returns true if `requiresAttunement` is falsy (undefined treated as false)
- `getEquipSaveBonus` skips items with no `saveBonusAll`/`saveBonusSpecific`
- `getEffectiveAbilityScore` skips items with no `abilityOverride`/`abilityBonus`
- Charges/dailyUses: null = no display

### Quick Items Migration

Already handled by the prior handoff (string[] → object[]). No additional migration needed here.

### Stealth Disadvantage Back-fill

Do NOT auto-set `stealthDisadvantage: true` on existing heavy armor items. The field doesn't exist on old items, and the stealth check function should treat missing `stealthDisadvantage` as false. Players add it manually when editing items, or it gets set automatically on new heavy armor items created through the form.

---

## Part 12: Dashboard Display Integration

### Stat Cards / Header Area

Where the dashboard shows ability scores and modifiers:

- If any equipped active item changes an ability score (override or bonus), show the **effective** score with a visual indicator that it's modified. E.g., `STR 19*` or `STR 19 (14)` or a colored highlight showing the base in dim text.
- The modifier displayed should use `getEffectiveMod()`.

### Resistances Line

If any equipped active item has non-empty `resistance`, show below the HP area or in the stats section:

```
Resistances: fire, poison
```

### Effective Speed

Replace raw `c.speed` display with the computed effective speed (base + equipment bonuses).

### Attunement Counter

Show `"Attunement: N/3"` near the equipment section header. Only show this if the character has at least one item with `requiresAttunement`.

---

## Part 13: PDF Export Updates

**Location:** PDF export function (search for `quickItems` and `equippedItems` references in the PDF code).

- Ability scores on the PDF should use `getEffectiveAbilityScore()`.
- Saving throw bonuses should include equipment bonuses via `getEquipSaveBonus()`.
- Speed should use effective speed (base + equipment bonuses).
- The equipment list text can note attunement status: `"Cloak of Protection +1 (attuned)"`.
- Charges: include in equipment notes: `"Staff of Healing (5/7 charges)"`.
- Daily uses: include in equipment notes: `"Cloak of Displacement (1/1 daily)"`.

---

## Part 14: Phasing Recommendation

This is a large spec. CC should implement in this order to minimize risk:

**Phase A — Foundation (must ship together):**
1. `isItemActive()` helper
2. `getEffectiveAbilityScore()` and `getEffectiveMod()` in `js/utils.js`
3. Migrate ALL consumer reads of `c.abilityScores` to use the new functions (the big find-and-replace — see consumer table in Part 2)
4. `getEquipSaveBonus()` helper
5. Wire save bonuses into `doAbilityRoll()`, `renderAbilityChecks()`, and `applyHpChange()` concentration check
6. Verify nothing breaks — all existing functionality must work identically since no items have the new fields yet

**Phase B — Form & Attunement:**
7. Expand the equipment form with new fields (progressive disclosure layout)
8. Attunement tracking (3-item cap, attune/un-attune toggle, `isItemActive` gate)

**Phase C — Charges, Daily Uses & Rest:**
9. Charge counter display on dashboard
10. Use/+1 buttons for charges
11. Daily use counter display on dashboard
12. Use/+ buttons for daily uses
13. Rest integration — charges in BOTH `doShortRest()` and `doLongRest()`, daily uses in `doLongRest()` only
14. Log events for charge use, daily use, and recharge

**Phase D — Display & Polish:**
15. Speed bonus display
16. Stealth disadvantage integration in `doSkillRoll()`
17. Resistance display on dashboard
18. Effective ability score visual indicators on dashboard
19. Attunement counter display
20. PDF export updates

---

## Testing Checklist

After implementation, verify:

- [ ] Equip Gauntlets of Ogre Power (STR override 19) on a character with STR 14 → STR-based attack rolls use +4 mod, not +2
- [ ] Same character with STR 20 → Gauntlets don't lower it, attacks still use +5
- [ ] Cloak of Protection +1 attuned → all six save buttons show +1 higher, save rolls include the bonus
- [ ] Un-attune the Cloak → save bonuses revert immediately
- [ ] Equip 3 attuned items → trying to attune a 4th shows error
- [ ] Ring with +2 CON bonus → CON modifier display updates, concentration check bonus updates
- [ ] Staff with 7 charges → -1 button decrements, rest restores based on rechargeOn
- [ ] Item with "short" rechargeOn → charges refill on BOTH short rest and long rest
- [ ] Item with "dawn" rechargeOn → charges refill on long rest only
- [ ] Item with dailyUses (1/day) → Use button decrements, long rest restores, short rest does NOT restore
- [ ] Item with dailyUses (3/day) → Use decrements one at a time, long rest restores all 3
- [ ] Heavy armor with stealthDisadvantage → Stealth roll uses disadvantage (2d20 take lower)
- [ ] Speed bonus item equipped → dashboard shows updated speed
- [ ] Resistance from equipped item → displays on dashboard
- [ ] Unequip an item with overrides → all derived stats revert to base scores
- [ ] PDF export uses effective scores, not base scores
- [ ] Level-up ASI preview shows base scores being modified; modifier preview accounts for equipment overrides
- [ ] Item with both charges AND dailyUses → both counters display and function independently
- [ ] Attunement-required item equipped but not attuned → no mechanical benefits apply
- [ ] Concentration check after taking damage shows correct CON save bonus including equipment
