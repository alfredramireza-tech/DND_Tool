# SPEC: Barbarian Class — Full PHB Implementation

## Overview

- **Hit Die:** d12
- **Saving Throws:** STR, CON
- **Armor Proficiencies:** Light armor, medium armor, shields
- **Weapon Proficiencies:** Simple weapons, martial weapons
- **Skill Choices:** Pick 2 from Animal Handling, Athletics, Intimidation, Nature, Perception, Survival

---

## Prerequisites — Roll & Buff System Gaps

The following roll system capabilities DO NOT EXIST yet and must be built before or during Barbarian implementation. These were identified during the Cleric buff/concentration separation work (March 2026).

**1. Flat roll bonus support.**
The `rollBonus` field in `SPELL_BUFF_EFFECTS` and `externalBuffs` currently only supports dice expressions (`"1d4"`, `"1d8"`). Rage damage is a flat number (+2/+3/+4). The roll system needs to accept both dice expressions and flat integers. The `rollBonus` structure should handle:
```
// Dice expression (existing):
rollBonus: { dice: "1d4", appliesTo: ["attacks", "saves"] }

// Flat bonus (new):
rollBonus: { flat: 2, appliesTo: ["damage"] }

// Both formats must work in the roll output:
// "d20 [14] + 5 (STR) + 1d4 [3] (Bless) = 22"     <- dice
// "1d12 [7] + 3 (STR) + 2 (Rage) = 12"              <- flat
```

**2. Damage roll type in `appliesTo`.**
Currently `appliesTo` supports `["attacks", "saves", "checks"]`. Rage bonus applies to melee STR *damage* rolls, not attack rolls. Add `"damage"` as a valid roll type. The roll system must check active buffs/effects when building damage rolls, not just attack/save/check rolls.

Further, Rage damage only applies to **STR-based melee** weapon attacks. The roll integration needs to know which stat a weapon uses. When the weapon roller calculates damage, it should check: is this a STR-based melee weapon AND is Rage active? If yes, include rage damage bonus. This is narrower than the generic buff system — implement it as Rage-specific logic in the weapon damage roller, not as a generic buff `appliesTo` filter.

**3. Advantage/disadvantage is NOT modeled in the buff system.**
Rage grants advantage on STR checks and STR saves. Reckless Attack grants advantage on your melee attacks (and gives enemies advantage on attacks against you). These are tracked as active states (`rageActive`, `recklessActive`) with dashboard reminders — they are NOT buff entries. Do not try to model advantage/disadvantage through `externalBuffs`. Instead:
- When rolling a STR check or STR save while `rageActive === true`: auto-roll 2d20, take higher, show both in output: `"2d20 [8, 15] + 4 (STR) = 19 (Advantage - Rage)"`
- When rolling a melee attack while `recklessActive === true`: same 2d20 advantage format
- Condition-based disadvantage (Poisoned, Frightened, etc.) already shows reminders — these can evolve into auto-applied disadvantage using the same 2d20 mechanic

**4. AC formula overrides vs. bonuses.**
Barbarian Unarmored Defense (10 + DEX + CON) is an AC *formula*, not a +X bonus. It replaces the base AC calculation when no armor is equipped. This goes in `calculateAC()` as a class-specific branch, NOT through the buff system. The existing spec already describes this correctly (see Unarmored Defense section) — this note is here to prevent confusion with the `acBonus` field in `externalBuffs`, which is additive only.

**5. Rage is NOT a buff — keep it separate.**
Rage has its own activation rules, visual treatment, and status card as specced. Do not model Rage as an `externalBuffs` entry. The Rage toggle, damage integration, and status display are a dedicated system. The buff system is for spells and external effects. Rage interacts with the roll system directly through `rageActive` state checks in the weapon damage roller.

---

## Barbarian Progression (Levels 1-20)

```
Level  Prof  Rages  Rage Dmg  Features
 1     +2    2      +2        Rage, Unarmored Defense
 2     +2    2      +2        Reckless Attack, Danger Sense
 3     +2    3      +2        Subclass
 4     +2    3      +2        ASI/Feat
 5     +3    3      +2        Extra Attack, Fast Movement (+10ft)
 6     +3    4      +2        Subclass feature
 7     +3    4      +2        Feral Instinct
 8     +3    4      +2        ASI/Feat
 9     +4    4      +3        Brutal Critical (1 die)
10     +4    4      +3        Subclass feature
11     +4    4      +3        Relentless Rage
12     +4    5      +3        ASI/Feat
13     +5    5      +3        Brutal Critical (2 dice)
14     +5    5      +3        Subclass feature
15     +5    5      +3        Persistent Rage
16     +5    5      +4        ASI/Feat
17     +6    6      +4        Brutal Critical (3 dice)
18     +6    6      +4        Indomitable Might
19     +6    6      +4        ASI/Feat
20     +6    Unlim. +4        Primal Champion (STR +4, CON +4, max 24)
```

---

## Rage System

This is the defining Barbarian mechanic. It must be prominent, trackable, and integrated into combat calculations.

### Rage Resource Tracker
- Tappable pips showing total rages per day (see progression table)
- Refreshes on LONG rest only (NOT short rest)
- Level 20: unlimited rages — hide the pip tracker, show "Unlimited"

### Rage Active State
Add `rageActive` (boolean) to the character object. The dashboard needs a large "RAGE" toggle button.

**When rage is activated:**
- Dashboard shows a visual indicator — accent color intensifies, a "RAGING" badge appears, or a subtle border/glow effect. The player must always know at a glance if they're raging.
- A persistent status card appears showing all active benefits:
  - Advantage on STR checks and STR saves
  - +[rage damage bonus] to melee STR damage
  - Resistance to bludgeoning, piercing, slashing damage
- Weapon damage rolls automatically include the rage damage bonus when raging
- One rage pip is consumed when rage starts

**When rage ends (player taps toggle off):**
- Visual indicator clears
- Status card disappears
- Rage damage bonus removed from weapon calculations

**Rage ends automatically if:**
- You haven't attacked a hostile creature or taken damage since your last turn
- You fall unconscious
- You choose to end it (player taps toggle)

These auto-end conditions should be noted on the rage status card as a reminder, but the app doesn't enforce them — the player manages it.

### Rage Does NOT Work With:
- Heavy armor (remind if heavy armor is equipped)
- Spellcasting (Barbarians can't cast while raging — irrelevant for base Barbarian but matters for multiclass in future)

---

## Core Features — Descriptions

### Unarmored Defense (Level 1)
**Type:** Passive. AC = 10 + DEX mod + CON mod when not wearing armor.
**Integration:** The `calculateAC()` function checks: if class is Barbarian and no armor equipped, AC = 10 + DEX + CON + shield bonus. Can use a shield with Unarmored Defense.
**Dashboard:** If unarmored, show "AC: [value] (Unarmored: 10 + DEX + CON + Shield)"

### Reckless Attack (Level 2)
**Type:** Per-turn toggle (not a tracked resource).
**Effect:** On your first attack each turn, you can choose to gain advantage on ALL melee weapon attacks this turn. In exchange, all attacks against you have advantage until your next turn.
**Dashboard:** A toggle button near weapons. When active, shows the tradeoff reminder: "You have advantage on melee attacks. Attacks against you have advantage."
**Store `recklessActive` in character object** — but this resets conceptually each turn. The toggle is a visual reminder, not a persistent state. Reset it when the player manually turns it off.

### Danger Sense (Level 2)
**Type:** Passive.
**Effect:** Advantage on DEX saves against effects you can see (spells, traps, etc.). Does not work if blinded, deafened, or incapacitated.
**Dashboard:** Reference card under abilities.

### Extra Attack (Level 5)
**Type:** Passive.
**Effect:** 2 attacks per Attack action.
**Dashboard:** "Attacks per Action: 2" near weapons.

### Fast Movement (Level 5)
**Type:** Passive.
**Effect:** +10ft speed while not wearing heavy armor.
**Dashboard:** Add 10 to speed display. Show "(includes +10 Fast Movement)" note. Warn if heavy armor is equipped.

### Feral Instinct (Level 7)
**Type:** Passive.
**Effect:** Advantage on initiative rolls. If surprised, you can act normally on your first turn as long as you enter a rage first.
**Dashboard:** Note near initiative. The dice roller for initiative should note "Advantage (Feral Instinct)" for Barbarians level 7+.

### Brutal Critical (Levels 9, 13, 17)
**Type:** Passive, scales.
**Effect:** Roll 1 additional weapon damage die on a critical hit. Increases to 2 extra dice at 13 and 3 at 17.
**Dashboard:** Note near weapons: "Brutal Critical: +1 extra damage die on crits" (updates at 13, 17).
**Dice roller integration:** When a weapon attack shows a critical hit, the damage roll should automatically include the extra Brutal Critical dice.

### Relentless Rage (Level 11)
**Type:** Passive with escalating DC.
**Effect:** If you drop to 0 HP while raging, make a CON save (DC 10 for the first time, +5 each subsequent time). On success, drop to 1 HP instead. DC resets on short or long rest.
**Dashboard:** Reference card. Optionally track the current DC: "Relentless Rage DC: 10" (increases with each use — player can tap to increment).

### Persistent Rage (Level 15)
**Type:** Passive.
**Effect:** Rage only ends early if you choose to end it or fall unconscious. No longer ends for not attacking or taking damage.
**Dashboard:** Update the rage status card to remove the auto-end reminder.

### Indomitable Might (Level 18)
**Type:** Passive.
**Effect:** If your total for a STR check is less than your STR score, you can use your STR score instead.
**Dashboard:** Note near abilities. Skill roller should enforce this: if rolling a STR check and total is below STR score, show "Using STR score ([X]) — Indomitable Might."

### Primal Champion (Level 20)
**Type:** Passive.
**Effect:** STR and CON each increase by 4. Maximum for these scores becomes 24 instead of 20.
**Level-up integration:** When reaching level 20, automatically apply +4 STR and +4 CON. Recalculate all derived stats. Note the new maximum of 24.

---

## Subclass: Path of the Berserker

### Frenzy (Level 3)
**Type:** Toggle (activates with Rage).
**Effect:** While raging, you can choose to go into a Frenzy. For the duration of the rage, you can make a single melee weapon attack as a bonus action on each of your turns. When the rage ends, you suffer one level of exhaustion.
**Dashboard:** When rage is active, show a "Frenzy" toggle. If activated, add a reminder: "Bonus Action: one melee attack per turn. WARNING: Exhaustion when rage ends."
**Exhaustion tracking:** Add an `exhaustion` field to the character object (0-6). When Frenzy rage ends, prompt "Add 1 level of exhaustion?" with yes/no. Show exhaustion level on dashboard if > 0. Exhaustion effects:
- 1: Disadvantage on ability checks
- 2: Speed halved
- 3: Disadvantage on attacks and saves
- 4: HP max halved
- 5: Speed reduced to 0
- 6: Death
Long rest removes 1 level of exhaustion (not all — this is RAW).

### Mindless Rage (Level 6)
**Type:** Passive.
**Effect:** Can't be charmed or frightened while raging. If already charmed/frightened, the effect is suspended during rage.
**Dashboard:** Note on rage status card when active.

### Intimidating Presence (Level 10)
**Type:** Action ability.
**Effect:** Use action to frighten one creature within 30ft. Your CHA check vs target's WIS save (DC = your CHA check result). Lasts until end of your next turn. Can maintain on subsequent turns as an action.
**Dashboard:** Reference card with calculated CHA bonus.

### Retaliation (Level 14)
**Type:** Reaction.
**Effect:** When you take damage from a creature within 5ft, you can use your reaction to make one melee weapon attack against that creature.
**Dashboard:** Reference card.

---

## Subclass: Path of the Totem Warrior

### Totem Choices
Totem Warrior makes a choice at levels 3, 6, and 14. Each choice is INDEPENDENT — the player can mix animals across tiers. Store as:
```
totemChoices: {
  spirit: "bear",    // Level 3
  aspect: "eagle",   // Level 6
  attunement: "wolf"  // Level 14
}
```

### Spirit Seeker (Level 3)
**Type:** Passive.
**Effect:** Can cast Beast Sense and Speak with Animals as rituals.
**Dashboard:** Reference card.

### Totem Spirit (Level 3) — Choose one:

**Bear:** While raging, resistance to ALL damage except psychic.
- Dashboard: Replace rage status card's "Resistance to bludgeoning, piercing, slashing" with "Resistance to ALL damage except psychic."

**Eagle:** While raging, opportunity attacks against you have disadvantage. You can Dash as a bonus action.
- Dashboard: Add to rage status card.

**Wolf:** While raging, allies have advantage on melee attack rolls against any hostile creature within 5ft of you.
- Dashboard: Add to rage status card: "Allies have advantage on melee attacks vs creatures within 5ft of you."

### Aspect of the Beast (Level 6) — Choose one:

**Bear:** Carrying capacity doubled. Advantage on STR checks for pushing, pulling, lifting, breaking.
- Dashboard: Reference card.

**Eagle:** Can see up to 1 mile with no difficulty. Dim light doesn't impose disadvantage on Perception.
- Dashboard: Reference card.

**Wolf:** Can track creatures at a fast pace. Move stealthily at normal pace while traveling.
- Dashboard: Reference card.

### Spirit Walker (Level 10)
**Type:** All Totem Warriors get this (no choice).
**Effect:** Cast Commune with Nature as a ritual.
**Dashboard:** Reference card.

### Totemic Attunement (Level 14) — Choose one:

**Bear:** While raging, any hostile creature within 5ft of you has disadvantage on attack rolls against targets other than you. Enemies must focus you.
- Dashboard: Add to rage status card.

**Eagle:** While raging, gain a flying speed equal to your walking speed. You fall if you end your turn in the air.
- Dashboard: Add to rage status card with warning note about falling.

**Wolf:** While raging, when you hit with a melee attack, you can use a bonus action to knock the target prone if it is Large or smaller.
- Dashboard: Add to rage status card.

---

## Level-Up Engine — Barbarian

Level-up wizard screens for Barbarian:
1. HP (always) — d12 hit die
2. ASI/Feat (at levels 4, 8, 12, 16, 19)
3. Subclass selection (level 3)
4. Totem choice (Totem Warrior at 3, 6, 14)
5. Rage progression display (when rages/day or rage damage changes)
6. New features display
7. Proficiency bonus increase (at 5, 9, 13, 17)
8. Summary & Confirm

Level 20 is special — auto-apply STR +4 and CON +4 with recalculation of all derived stats. Note the new maximum of 24.

---

## Dashboard Layout — Barbarian

Section order:
1. HP Tracker (extra large — Barbarians are meat shields)
2. Rage toggle + tracker + status card (THE defining feature)
3. Stat Cards (AC, Speed, Initiative, Prof Bonus)
4. Reckless Attack toggle (level 2+)
5. Weapons (with rage damage auto-included when raging)
6. Extra Attack display (level 5+)
7. Brutal Critical display (level 9+)
8. Abilities + Saves + Skills
9. Exhaustion tracker (if Berserker, or for general use)
10. Feature reference cards
11. Rest buttons
12. Dice rollers
13. Currency
14. Equipped items
15. Inventory
16. Notes
