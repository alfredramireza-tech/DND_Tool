# SPEC: Paladin Class — Full PHB Implementation

## Overview

- **Hit Die:** d10
- **Saving Throws:** WIS, CHA
- **Armor Proficiencies:** All armor, shields
- **Weapon Proficiencies:** Simple weapons, martial weapons
- **Skill Choices:** Pick 2 from Athletics, Insight, Intimidation, Medicine, Persuasion, Religion

The Paladin is a half-caster who prepares spells (like Cleric) but also has unique mechanics: Divine Smite (burn spell slots for burst melee damage), Lay on Hands (flexible healing pool), and powerful auras that buff the entire party.

---

## Color Theme — Paladin (Holy Silver)

```
accent: #c0c8d8, accentHover: #d0d8e8, accentDim: #8090a8
bg: #121418, surface: #1a1e24, surfaceRaised: #242830
border: #2d3340, text: #e0e4ec, textDim: #8890a0
```

Add to CLASS_DATA and theme preset list.

---

## Paladin Progression (Levels 1-20)

```
Level  Prof  Features                                          Spell Slots
                                                               1st 2nd 3rd 4th 5th
 1     +2    Divine Sense, Lay on Hands                         —   —   —   —   —
 2     +2    Fighting Style, Spellcasting, Divine Smite         2   —   —   —   —
 3     +2    Divine Health, Sacred Oath (subclass)              3   —   —   —   —
 4     +2    ASI/Feat                                           3   —   —   —   —
 5     +3    Extra Attack                                       4   2   —   —   —
 6     +3    Aura of Protection                                 4   2   —   —   —
 7     +3    Sacred Oath feature                                4   3   —   —   —
 8     +3    ASI/Feat                                           4   3   —   —   —
 9     +4    —                                                  4   3   2   —   —
10     +4    Aura of Courage                                    4   3   2   —   —
11     +4    Improved Divine Smite                              4   3   3   —   —
12     +4    ASI/Feat                                           4   3   3   —   —
13     +5    —                                                  4   3   3   1   —
14     +5    Cleansing Touch                                    4   3   3   1   —
15     +5    Sacred Oath feature                                4   3   3   2   —
16     +5    ASI/Feat                                           4   3   3   2   —
17     +6    —                                                  4   3   3   3   1
18     +6    Aura improvements (range 30ft)                     4   3   3   3   1
19     +6    ASI/Feat                                           4   3   3   3   2
20     +6    Sacred Oath feature                                4   3   3   3   2
```

Note: Paladins don't get spellcasting until level 2. Spell slots follow the half-caster table.

---

## Spellcasting (Level 2)

Paladins are prepared casters like Clerics.

**Preparing spells:** Number of prepared spells = CHA modifier + half paladin level (round down), minimum 1.

**Spell save DC:** 8 + proficiency + CHA modifier.

**Spell attack bonus:** proficiency + CHA modifier.

**Important difference from Cleric:** Paladin uses CHA, not WIS. All spell card calculations, Disciple of Life equivalents, save DCs, etc. must use CHA mod.

**Ritual casting:** Paladins CANNOT cast rituals (unlike Cleric).

### Paladin Spell List (PHB, Levels 1-5)

**1st Level:**
Bless, Command, Compelled Duel, Cure Wounds, Detect Evil and Good, Detect Magic, Detect Poison and Disease, Divine Favor, Heroism, Protection from Evil and Good, Purify Food and Drink, Searing Smite, Shield of Faith, Thunderous Smite, Wrathful Smite

**2nd Level:**
Aid, Branding Smite, Find Steed, Lesser Restoration, Locate Object, Magic Weapon, Protection from Poison, Zone of Truth

**3rd Level:**
Aura of Vitality, Blinding Smite, Create Food and Water, Crusader's Mantle, Daylight, Dispel Magic, Elemental Weapon, Magic Circle, Remove Curse, Revivify

**4th Level:**
Aura of Life, Aura of Purity, Banishment, Death Ward, Locate Creature, Staggering Smite

**5th Level:**
Banishing Smite, Circle of Power, Destructive Wave, Dispel Evil and Good, Geas, Raise Dead

Each spell needs structured data (same format as Cleric spells): name, level, school, castingTime, range, components, duration, description, and where applicable: damage, healing, save, attack, upcast.

**Shared spells with Cleric:** Bless, Command, Cure Wounds, Detect Evil and Good, Detect Magic, Detect Poison and Disease, Protection from Evil and Good, Purify Food and Drink, Aid, Lesser Restoration, Locate Object, Protection from Poison, Zone of Truth, Create Food and Water, Daylight, Dispel Magic, Magic Circle, Remove Curse, Revivify, Banishment, Death Ward, Locate Creature, Dispel Evil and Good, Geas, Raise Dead. Reuse existing spell data — do NOT duplicate entries.

**Smite spells** are unique to Paladin and need new entries: Searing Smite, Thunderous Smite, Wrathful Smite, Branding Smite, Blinding Smite, Staggering Smite, Banishing Smite. These are concentration spells that add damage on your next hit. Each needs:
- Concentration tag
- Damage dice and type
- Special effect on hit
- Duration

---

## Divine Smite (Level 2)

The Paladin's signature burst damage. This is NOT a spell — it uses spell slots but doesn't count as casting.

**Mechanic:** When you hit with a melee weapon attack, you can expend a spell slot to deal extra radiant damage: 2d8 for a 1st-level slot, +1d8 per slot level above 1st (max 5d8). Deal an additional +1d8 if the target is undead or fiend (max 6d8 total).

### Dashboard Integration — THIS IS CRITICAL

Divine Smite must be the most prominent feature on the Paladin dashboard after HP. The flow:

1. Player taps weapon → rolls attack → sees result
2. If hit: "Divine Smite?" prompt appears with slot level buttons:
   - "1st Level (2d8 radiant) — [X] slots remaining"
   - "2nd Level (3d8 radiant) — [X] slots remaining"
   - etc. for each available slot level
   - "No Smite" to skip
3. Player taps a level → slot is spent → smite damage rolls → added to weapon damage
4. If target is undead/fiend, show a toggle: "+1d8 (undead/fiend)" that adds the bonus die

**This integrates with the spell slot tracker** — spending a smite uses a slot just like casting a spell.

**Improved Divine Smite (Level 11):** All melee weapon attacks deal an extra 1d8 radiant damage automatically (no slot cost). This is passive — weapon damage cards should show "+1d8 radiant" added to every melee weapon at level 11+. This stacks with regular Divine Smite.

### Smite Damage Reference Card
Always visible on dashboard:
```
DIVINE SMITE — on melee hit, spend a spell slot:
1st level: 2d8 radiant
2nd level: 3d8 radiant
3rd level: 4d8 radiant
4th level: 5d8 radiant (max)
+1d8 vs undead/fiend
```

---

## Lay on Hands (Level 1)

A flexible healing pool — not dice-based like Cure Wounds.

**Pool:** 5 × paladin level HP. Refreshes on LONG rest.

**Usage:** As an action, touch a creature and spend points from the pool:
- Spend any number of points to restore that many HP
- Spend 5 points to cure one disease or neutralize one poison
- Can divide healing among multiple uses

### Dashboard Integration
Resource tracker showing current/max pool: "Lay on Hands: 15 / 20"

**Not a pip tracker** — this is a point pool, not discrete uses. Display as a number with +/- adjustment buttons or tap-to-type. When the player uses it:
1. Tap "Use Lay on Hands"
2. Enter amount to spend
3. "Heal [amount]" or "Cure disease/poison (5 points)"
4. Deduct from pool, apply healing to target (or just show the healing amount — the player tells the DM)

Store as `resources.layOnHands: { used: 0, max: 20 }` where max = 5 × level. Display remaining = max - used.

---

## Divine Sense (Level 1)

**Type:** Action, limited uses: 1 + CHA modifier per long rest.
**Effect:** Detect celestials, fiends, and undead within 60ft (not behind total cover). Also detect consecrated/desecrated places or objects. Lasts until end of your next turn.
**Dashboard:** Resource tracker (1 + CHA mod uses, long rest). Reference card.

---

## Fighting Style (Level 2)

Same system as Fighter. Paladin can choose from: Defense, Dueling, Great Weapon Fighting, Protection.

NOT available to Paladin: Archery, Two-Weapon Fighting (those are Fighter-only).

Reuse the Fighting Style selection and display system from SPEC_FIGHTER.md. Just filter the available options.

---

## Aura Features

Paladin auras are passive and affect allies. They are a defining party role feature.

### Aura of Protection (Level 6)
**Effect:** You and friendly creatures within 10ft gain a bonus to saving throws equal to your CHA modifier (minimum +1). You must be conscious.
**Level 18:** Range increases to 30ft.
**Dashboard:** Persistent reference card showing: "Aura of Protection: +[CHA mod] to saves for you and allies within [10/30] ft." This is always active — no tracker needed.

### Aura of Courage (Level 10)
**Effect:** You and friendly creatures within 10ft can't be frightened while you are conscious.
**Level 18:** Range increases to 30ft.
**Dashboard:** Persistent reference card.

### Aura Display
Show auras as a grouped section: "Active Auras" with each aura's range and effect. At level 18, update all ranges to 30ft automatically.

---

## Core Features

### Divine Health (Level 3)
**Type:** Passive.
**Effect:** Immune to disease.
**Dashboard:** Reference card.

### Extra Attack (Level 5)
**Type:** Passive.
**Dashboard:** "Attacks per Action: 2" near weapons.

### Cleansing Touch (Level 14)
**Type:** Action, limited uses: CHA modifier per long rest (minimum 1).
**Effect:** End one spell on yourself or a willing creature you touch.
**Dashboard:** Resource tracker + reference card.

---

## Subclass: Oath of Devotion

### Oath Spells (always prepared, don't count against limit):
- Level 3: Protection from Evil and Good, Sanctuary
- Level 5: Lesser Restoration, Zone of Truth
- Level 9: Beacon of Hope, Dispel Magic
- Level 13: Freedom of Movement, Guardian of Faith
- Level 17: Commune, Flame Strike

### Channel Divinity (Level 3, 1 use per short rest)
Two options:

**Sacred Weapon:** Action. For 1 minute, add CHA modifier to attack rolls with one weapon (minimum +1). Weapon emits bright light 20ft. Ends if you drop the weapon or fall unconscious.

**Turn the Unholy:** Action, 30ft. Fiends and undead make WIS save (spell DC) or are turned for 1 minute (flee, can't take reactions). Ends if they take damage.

### Aura of Devotion (Level 7)
You and allies within 10ft can't be charmed while you are conscious. 30ft at level 18.

### Purity of Spirit (Level 15)
Always under the effects of Protection from Evil and Good.

### Holy Nimbus (Level 20)
Action, 1 minute, 1/long rest. Emit bright light 30ft, dim 30ft more. Enemies starting turn in bright light take 10 radiant damage. Advantage on saves vs fiend/undead spells.

---

## Subclass: Oath of the Ancients

### Oath Spells:
- Level 3: Ensnaring Strike, Speak with Animals
- Level 5: Misty Step, Moonbeam
- Level 9: Plant Growth, Protection from Energy
- Level 13: Ice Storm, Stoneskin
- Level 17: Commune with Nature, Tree Stride

Note: Several of these spells are Druid/Ranger spells not on the Paladin list. They need new spell data entries: Ensnaring Strike, Speak with Animals, Misty Step, Moonbeam, Plant Growth, Ice Storm, Stoneskin, Commune with Nature, Tree Stride.

### Channel Divinity (Level 3, 1 use per short rest)

**Nature's Wrath:** Action. Spectral vines restrain a creature within 10ft. Target makes STR or DEX save (their choice) against spell DC. Restrained until they succeed on a save (repeated at end of each of their turns) or the vines are destroyed.

**Turn the Faithless:** Action, 30ft. Fey and fiends make WIS save or are turned for 1 minute.

### Aura of Warding (Level 7)
You and allies within 10ft have resistance to damage from spells. 30ft at level 18.

### Undying Sentinel (Level 15)
When reduced to 0 HP and not killed outright, drop to 1 HP instead. 1/long rest. Also: no aging effects.

### Elder Champion (Level 20)
Action, 1 minute, 1/long rest. Transform: regain 10 HP at start of each turn. Cast paladin spells as bonus action. Enemies within 10ft have disadvantage on saves vs your spells and Channel Divinity.

---

## Subclass: Oath of Vengeance

### Oath Spells:
- Level 3: Bane, Hunter's Mark
- Level 5: Hold Person, Misty Step
- Level 9: Haste, Protection from Energy
- Level 13: Banishment, Dimension Door
- Level 17: Hold Monster, Scrying

Note: New spell data needed for: Hunter's Mark, Misty Step, Haste, Dimension Door, Hold Monster, Scrying. Some overlap with Wizard list from SPEC_FIGHTER.md (Misty Step, Haste, Dimension Door, Hold Person, Banishment, Scrying).

### Channel Divinity (Level 3, 1 use per short rest)

**Abjure Enemy:** Action. One creature within 60ft makes WIS save. Fail: frightened for 1 minute, speed 0 (or half speed if immune to frightened). Fiend/undead have disadvantage on the save.

**Vow of Enmity:** Bonus action. Choose one creature within 10ft. Advantage on attack rolls against it for 1 minute.

### Relentless Avenger (Level 7)
When you hit with an opportunity attack, you can move up to half your speed immediately after as part of the same reaction. Movement doesn't provoke opportunity attacks.

### Soul of Vengeance (Level 15)
When a creature under your Vow of Enmity attacks, you can use your reaction to make a melee weapon attack against it.

### Avenging Angel (Level 20)
Action, 1 hour, 1/long rest. Sprout wings (60ft fly speed). Emanate menacing aura 30ft — enemies entering or starting turn in it make WIS save or are frightened for 1 minute.

---

## Paladin Channel Divinity

Paladins get Channel Divinity at level 3 (from their oath), 1 use per SHORT rest.

Reuse the existing Channel Divinity tracker pattern from Cleric. Each oath has two options — display both as reference cards below the tracker, same as Cleric's Turn Undead / Preserve Life.

---

## Level-Up Engine — Paladin

Level-up wizard screens:
1. HP (always) — d10 hit die
2. ASI/Feat (at levels 4, 8, 12, 16, 19)
3. Fighting Style selection (level 2)
4. Subclass selection (level 3)
5. Spell slot changes (when slots change)
6. New spell level access (at 5, 9, 13, 17)
7. Prepared spell count change
8. Aura feature display (at 6, 7, 10, 18)
9. New features display
10. Proficiency bonus increase (at 5, 9, 13, 17)
11. Summary & Confirm

Level 2 is special — gains spellcasting, Fighting Style, AND Divine Smite all at once. Show all three.

---

## Dashboard Layout — Paladin

Section order:
1. HP Tracker (prominent)
2. Divine Smite reference + integration with weapon rolls (THE signature feature)
3. Stat Cards (AC, Speed, Initiative, Prof Bonus, Spell Save DC, Spell Attack)
4. Lay on Hands pool tracker
5. Weapons (with Divine Smite prompt on hit)
6. Extra Attack display (level 5+)
7. Channel Divinity tracker + oath option cards
8. Active Auras display (level 6+)
9. Spell Slots (interactive)
10. Prepared Spell cards
11. Oath Spell cards (always prepared)
12. Fighting Style reference
13. Abilities + Saves + Skills
14. Rest buttons
15. Dice rollers
16. Currency
17. Equipped items
18. Inventory
19. Notes

---

## Healing Spell Interaction

Paladins have Cure Wounds and other healing spells. However, they do NOT have Disciple of Life (that's Cleric Life Domain). The spell card auto-calculation must use CHA mod (not WIS) and must NOT add Disciple of Life bonuses. Cure Wounds for a Paladin with CHA 16 = "1d8 + 3 HP" (no DoL bonus).

Ensure the spell card rendering checks class/subclass before applying Cleric-specific bonuses.
