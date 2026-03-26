# SPEC: Rogue Class — Full PHB Implementation

## Overview

- **Hit Die:** d8
- **Saving Throws:** DEX, INT
- **Armor Proficiencies:** Light armor
- **Weapon Proficiencies:** Simple weapons, hand crossbows, longswords, rapiers, shortswords
- **Tool Proficiency:** Thieves' tools
- **Skill Choices:** Pick 4 from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth
- **Expertise:** At level 1, choose 2 proficient skills (or one skill + thieves' tools) for Expertise (double proficiency bonus). Choose 2 more at level 6.

Note: Rogues get 4 skill proficiencies — more than any other class. Combined with Expertise, they are the best skill users in the game.

---

## Rogue Progression (Levels 1-20)

```
Level  Prof  Sneak Attack  Features
 1     +2    1d6           Expertise (2), Sneak Attack, Thieves' Cant
 2     +2    1d6           Cunning Action
 3     +2    2d6           Subclass
 4     +2    2d6           ASI/Feat
 5     +3    3d6           Uncanny Dodge
 6     +3    3d6           Expertise (2 more)
 7     +3    4d6           Evasion
 8     +3    4d6           ASI/Feat
 9     +4    5d6           Subclass feature
10     +4    5d6           ASI/Feat
11     +4    6d6           Reliable Talent
12     +4    6d6           ASI/Feat
13     +5    7d6           Subclass feature
14     +5    7d6           Blindsense
15     +5    8d6           Slippery Mind
16     +5    8d6           ASI/Feat
17     +6    9d6           Subclass feature
18     +6    9d6           Elusive
19     +6    10d6          ASI/Feat
20     +6    10d6          Stroke of Luck
```

Note: Rogues get ASI at 4, 8, 10, 12, 16, 19 — that extra ASI at 10 is unique to Rogues (and Fighters who get even more).

---

## Expertise System

Expertise doubles the proficiency bonus for chosen skills. The character needs a third skill state beyond proficient/not-proficient.

### Data Model
Store as `expertiseSkills` array in character object:
```
expertiseSkills: ["stealth", "perception"]  // Level 1 picks
// At level 6, add 2 more
```

### Display
Skills section on dashboard must show three states clearly:
- **Not proficient:** ability mod only, normal text
- **Proficient:** ability mod + proficiency, marked with single dot/circle
- **Expertise:** ability mod + (proficiency × 2), marked with double dot or gold/accent highlight

Example at level 5 (prof +3, DEX 16):
- Stealth (Expertise): +3 DEX + 6 (prof×2) = +9
- Acrobatics (Proficient): +3 DEX + 3 = +6
- Athletics (Not proficient): +0 STR = +0

### Skill Roller Integration
When rolling a skill with Expertise, the roller shows double proficiency in the breakdown:
"d20: [14] + 3 (DEX) + 6 (Expertise) = 23"

### Reliable Talent Integration (Level 11+)
When rolling any skill the Rogue is proficient in (including Expertise), if the d20 shows below 10, use 10 instead. The roller should display: "d20: [4] → 10 (Reliable Talent) + 9 (Stealth) = 19"

---

## Sneak Attack

The defining Rogue combat feature. Must be the most prominent element on the Rogue dashboard.

### Damage Progression
Scales every odd level: 1d6 at 1, 2d6 at 3, 3d6 at 5... up to 10d6 at 19.
Formula: `Math.ceil(rogueLevel / 2)` d6.

### Dashboard Display
Large, prominent: "Sneak Attack: 3d6" with a Roll button.

Below it, a persistent rules reminder card:
```
SNEAK ATTACK — once per turn
You need ONE of:
  ✓ Advantage on the attack roll
  ✓ An ally within 5ft of the target (and you don't have disadvantage)
Must use a finesse or ranged weapon.
```

### Dice Roller Integration
When rolling weapon damage for a Rogue, show a "Add Sneak Attack" button. If tapped, rolls the sneak attack dice and adds to the damage total.

Example flow:
1. Tap rapier → rolls d20+7 to hit → "18 to hit"
2. Tap "Roll Damage" → rolls 1d8+4 = 9 piercing
3. Tap "Add Sneak Attack" → rolls 3d6 = [2, 5, 4] = 11
4. Shows total: "9 + 11 = 20 damage"

---

## Cunning Action (Level 2)

**Type:** Passive ability (always available from level 2+).
**Effect:** As a bonus action, you can Dash, Disengage, or Hide.

### Dashboard Display
Always-visible reference card with three options:
- **Dash:** Double your movement this turn
- **Disengage:** Your movement doesn't provoke opportunity attacks
- **Hide:** Make a Stealth check. If you succeed, you are hidden (advantage on your next attack = Sneak Attack enabler)

The Hide option should link to the skill roller for Stealth.

---

## Core Features — Descriptions

### Thieves' Cant (Level 1)
**Type:** Passive.
**Effect:** Secret mix of dialect, jargon, and code. Can speak in hidden messages. Also understand a set of signs and symbols for leaving messages.
**Dashboard:** Reference card under features.

### Uncanny Dodge (Level 5)
**Type:** Reaction.
**Effect:** When an attacker you can see hits you with an attack, halve the damage.
**Dashboard:** Reference card. No tracker needed — it's a reaction that resets each round. Note: uses your reaction, so you can't also use it for opportunity attacks that round.

### Evasion (Level 7)
**Type:** Passive.
**Effect:** DEX saves: success = 0 damage. Failure = half damage. Doesn't work if incapacitated.
**Dashboard:** Reference card. Note near DEX save in skills section.

### Reliable Talent (Level 11)
**Type:** Passive.
**Effect:** Any ability check using a skill you're proficient in: treat any d20 roll of 9 or lower as a 10.
**Dashboard:** Note near skills: "Minimum d20 roll of 10 on proficient skills."
**Roller integration:** Enforce minimum 10 on proficient skill rolls. Display "10 (Reliable Talent)" when triggered.

### Blindsense (Level 14)
**Type:** Passive.
**Effect:** If able to hear, you know the location of any hidden or invisible creature within 10ft.
**Dashboard:** Reference card.

### Slippery Mind (Level 15)
**Type:** Passive.
**Effect:** Gain proficiency in WIS saving throws.
**Level-up integration:** Auto-add WIS to saving throw proficiencies. Recalculate WIS save bonus.
**Dashboard:** WIS save now shows proficiency.

### Elusive (Level 18)
**Type:** Passive.
**Effect:** No attack roll has advantage against you unless you are incapacitated.
**Dashboard:** Reference card.

### Stroke of Luck (Level 20)
**Type:** Resource, 1 use per SHORT rest.
**Effect:** If you miss an attack, turn it into a hit. OR treat an ability check result as 20.
**Dashboard:** Tappable tracker (1 pip). Description card with both options.

---

## Subclass: Thief

### Fast Hands (Level 3)
**Type:** Passive extension of Cunning Action.
**Effect:** Cunning Action can also: Use an Object, make Sleight of Hand check, or use thieves' tools to disarm a trap or open a lock.
**Dashboard:** Add these options to the Cunning Action reference card.

### Second-Story Work (Level 3)
**Type:** Passive.
**Effect:** Climbing doesn't cost extra movement. Running long jump distance increases by DEX mod feet.
**Dashboard:** Reference card. Show calculated jump distance if relevant.

### Supreme Sneak (Level 9)
**Type:** Passive.
**Effect:** Advantage on Stealth checks if you move no more than half your speed on your turn.
**Dashboard:** Note on Cunning Action Hide option: "Advantage on Stealth if you move ≤ half speed."

### Use Magic Device (Level 13)
**Type:** Passive.
**Effect:** Ignore all class, race, and level requirements on the use of magic items.
**Dashboard:** Reference card.

### Thief's Reflexes (Level 17)
**Type:** Passive.
**Effect:** In the first round of combat, you get two turns: one at your normal initiative, one at initiative minus 10. Can't use this if surprised.
**Dashboard:** Reference card: "First round: two turns (normal initiative and initiative - 10)."

---

## Subclass: Assassin

### Assassinate (Level 3)
**Type:** Passive.
**Effect:** Advantage on attack rolls against creatures that haven't taken a turn yet in combat. Any hit against a surprised creature is a critical hit.
**Dashboard:** Prominent checklist card:
```
ASSASSINATE
✓ Advantage vs creatures that haven't acted yet
✓ Auto-crit on surprised creatures

Is the target surprised?
→ Advantage + Auto-Crit + Sneak Attack
= weapon dice ×2 + sneak attack dice ×2
```

**Dice roller integration:** When rolling damage against a surprised target, the roller should double all damage dice (weapon + sneak attack) for the critical hit.

### Bonus Proficiencies (Level 3)
Proficiency with disguise kit and poisoner's kit. Add to character data.

### Infiltration Expertise (Level 9)
**Type:** Downtime ability.
**Effect:** Spend 7 days and 25 gp to create a false identity (documentation, appearance, background). The identity holds up to casual scrutiny.
**Dashboard:** Reference card.

### Impostor (Level 13)
**Type:** Passive.
**Effect:** Unerringly mimic another person's speech, writing, and behavior after observing them for at least 3 hours. Creatures must win a contested Insight vs your Deception to see through the ruse.
**Dashboard:** Reference card.

### Death Strike (Level 17)
**Type:** Passive.
**Effect:** When you hit a surprised creature, it must make a CON save (DC = 8 + DEX mod + proficiency). On failure, the attack's damage is DOUBLED.
**This stacks with Assassinate critical:** weapon dice ×2 (crit) + sneak attack dice ×2 (crit), then the entire total is doubled (Death Strike). At level 17 with a rapier: (1d8×2 + 9d6×2) × 2 + DEX mod.

**Dashboard:** Show calculated DC. Reference card explaining the stack:
```
DEATH STRIKE (vs surprised targets)
1. Hit → auto-crit (Assassinate)
2. Target makes CON save DC [X]
3. Fail → ALL damage doubled again
Potential: (weapon×2 + 9d6×2) × 2 + DEX
```

**Dice roller:** When a Death Strike triggers, roll weapon dice ×2 + sneak attack ×2, then double the total.

---

## Subclass: Arcane Trickster

### Spellcasting (Level 3)

Same progression as Eldritch Knight but different school restrictions:

**School Restriction:** Spells must be Enchantment or Illusion from the Wizard list. Exception: at levels 3, 8, 14, and 20, can learn ONE spell from ANY school.

**Spells Known / Slot progression:** Identical to Eldritch Knight table (see SPEC_FIGHTER.md).

**Cantrips:** 2 from Wizard list at level 3. Gain Mage Hand as a bonus cantrip (free — 3 total). Third non-Mage-Hand cantrip at level 10.

Uses the same Wizard spell list data as Eldritch Knight. The only difference is the school filter: show Enchantment and Illusion as default, allow any school on free-pick levels.

### Mage Hand Legerdemain (Level 3)
**Type:** Passive.
**Effect:** When you cast Mage Hand, the hand is invisible. You can use it to:
- Stow/retrieve an object in a container worn by another creature
- Use thieves' tools to pick locks or disarm traps at range
- Use bonus action to control the hand (instead of action)
**Dashboard:** Reference card.

### Magical Ambush (Level 9)
**Type:** Passive.
**Effect:** If you are hidden when you cast a spell, the target has disadvantage on the saving throw.
**Dashboard:** Reference card. Note on spell cards: "Hidden → target has disadvantage on save."

### Versatile Trickster (Level 13)
**Type:** Bonus action.
**Effect:** As a bonus action, designate a creature within 5ft of your Mage Hand. You have advantage on attack rolls against that creature until end of turn. This is a Sneak Attack enabler — no ally needed.
**Dashboard:** Reference card near Sneak Attack: "Mage Hand + Versatile Trickster = advantage = Sneak Attack."

### Spell Thief (Level 17)
**Type:** Reaction, 1 use per LONG rest.
**Effect:** When a creature casts a spell targeting you, make an ability check (DC = 10 + spell level). On success: negate the spell, and you know it for 8 hours. Can cast it using your spell slots. Resource tracker (1 use).
**Dashboard:** Tracker + reference card.

---

## Level-Up Engine — Rogue

Level-up wizard screens:
1. HP (always) — d8 hit die
2. ASI/Feat (at levels 4, 8, 10, 12, 16, 19)
3. Subclass selection (level 3)
4. Sneak Attack die increase display (every odd level)
5. Expertise selection (level 1 onboarding, level 6 pick 2 more)
6. Spell learning (Arcane Trickster at spell-gain levels)
7. New features display
8. Proficiency bonus increase (at 5, 9, 13, 17)
9. Summary & Confirm

Level 15 (Slippery Mind) is special — auto-add WIS save proficiency.

---

## Dashboard Layout — Rogue

Section order:
1. HP Tracker
2. Sneak Attack display + rules reminder + Roll button (THE defining feature)
3. Stat Cards (AC, Speed, Initiative, Prof Bonus)
4. Cunning Action reference card (level 2+)
5. Weapons (with "Add Sneak Attack" button on damage rolls)
6. Uncanny Dodge reference (level 5+)
7. Abilities + Saves + Skills (with Expertise clearly marked, three-state display)
8. Spell section (Arcane Trickster only)
9. Assassinate checklist (Assassin only)
10. Subclass feature cards
11. Stroke of Luck tracker (level 20)
12. Rest buttons
13. Dice rollers
14. Currency
15. Equipped items
16. Inventory
17. Notes
