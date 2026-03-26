# SPEC: Fighter Class — Full PHB Implementation

## Overview

- **Hit Die:** d10
- **Saving Throws:** STR, CON
- **Armor Proficiencies:** All armor, shields
- **Weapon Proficiencies:** Simple weapons, martial weapons
- **Skill Choices:** Pick 2 from Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival

---

## Fighter Progression (Levels 1-20)

```
Level  Prof  Features
 1     +2    Fighting Style, Second Wind
 2     +2    Action Surge (1 use)
 3     +2    Subclass
 4     +2    ASI/Feat
 5     +3    Extra Attack (2 attacks per action)
 6     +3    ASI/Feat
 7     +3    Subclass feature
 8     +3    ASI/Feat
 9     +4    Indomitable (1 use)
10     +4    Subclass feature
11     +4    Extra Attack (3 attacks per action)
12     +4    ASI/Feat
13     +5    Indomitable (2 uses)
14     +5    ASI/Feat
15     +5    Subclass feature
16     +5    ASI/Feat
17     +6    Action Surge (2 uses), Indomitable (3 uses)
18     +6    Subclass feature
19     +6    ASI/Feat
20     +6    Extra Attack (4 attacks per action)
```

Note: Fighter gets ASI at 4, 6, 8, 12, 14, 16, 19 — more ASIs than any other class (7 total vs. the standard 5).

---

## Fighting Style (Level 1)

Selected during onboarding. Store as `fightingStyle` in character object. Only one can be chosen (Champion gets a second at level 10).

| Style | Effect | Dashboard Display | Mechanical Integration |
|-------|--------|-------------------|----------------------|
| Archery | +2 to attack rolls with ranged weapons | Persistent card | Add +2 to ranged weapon attack bonus calculation |
| Defense | +1 AC while wearing armor | Persistent card | Add +1 to AC calculation when any armor is equipped |
| Dueling | +2 damage with one-handed melee weapon when no other weapon in other hand | Persistent card | Add +2 to damage on qualifying weapons |
| Great Weapon Fighting | Reroll 1s and 2s on damage dice with two-handed/versatile melee weapons | Persistent card + note on weapon rolls | Note in roll display, don't auto-reroll (player decides) |
| Protection | Reaction: impose disadvantage on attack against creature within 5ft (requires shield) | Persistent card | Reference only |
| Two-Weapon Fighting | Add ability mod to damage of off-hand attack when dual wielding | Persistent card | Reference only (dual wield is complex) |

The Fighting Style card should always be visible on the dashboard as a persistent reference — players forget what their style does.

Add the Fighting Style selection to onboarding: after class selection, if class is Fighter, show a Fighting Style picker with descriptions before moving to ability scores. Add a `fightingStyle` field to Step 1 (Identity) or as a new sub-step.

---

## Core Features — Descriptions and Tracker Requirements

### Second Wind (Level 1)
**Type:** Resource tracker, 1 use, refreshes on SHORT rest.
**Description:** "Bonus action. Regain 1d10 + fighter level hit points."
**Dashboard:** Tappable pip + Roll button (rolls 1d10 + character level, applies as healing).
**Dice integration:** Roll result shows "1d10: [X] + [fighter level] = Y HP" and offers to apply as healing.

### Action Surge (Level 2)
**Type:** Resource tracker, 1 use (2 uses at level 17), refreshes on SHORT rest.
**Description:** "You can take one additional action on your turn. This action can include the Attack action, giving you another full round of attacks."
**Dashboard:** Tappable pip(s). Description card.
**Note at level 5+:** When Extra Attack is active, remind: "Action Surge with Extra Attack = [X] additional attacks" where X is the Extra Attack count.

### Extra Attack
**Type:** Passive display (not a tracker).
**Levels:** 2 attacks at 5, 3 at 11, 4 at 20.
**Dashboard:** Prominent display near weapons: "Attacks per Action: 2"
**Updates automatically** with level.

### Indomitable (Level 9)
**Type:** Resource tracker, 1 use (2 at 13, 3 at 17), refreshes on LONG rest.
**Description:** "When you fail a saving throw, you can reroll it. You must use the new roll."
**Dashboard:** Tappable pip(s). 

---

## Subclass: Champion

### Improved Critical (Level 3)
**Type:** Passive.
**Effect:** Critical hit on 19-20 (normally only 20).
**Dashboard:** Display "Critical Range: 19-20" near the weapons section. Dice roller should flag rolls of 19 as critical for Champions.
**Level 15 upgrade (Superior Critical):** Range becomes 18-20. Dashboard updates automatically.

### Remarkable Athlete (Level 7)
**Type:** Passive.
**Effect:** Add half proficiency bonus (round up) to STR, DEX, and CON checks that don't already use proficiency. Also add to running long jump distance.
**Dashboard:** Note under abilities. Skill roller should apply this bonus when rolling an unproficient STR/DEX/CON check for a Champion level 7+.

### Additional Fighting Style (Level 10)
**Type:** Selection during level-up.
**Effect:** Pick a second Fighting Style from the list. Cannot pick one already chosen.
**Store:** `fightingStyle2` or extend `fightingStyle` to an array.
**Dashboard:** Shows both Fighting Style cards.

### Superior Critical (Level 15)
**Type:** Passive upgrade to Improved Critical.
**Effect:** Crit on 18-20.
**Dashboard:** "Critical Range: 18-20". Dice roller flags 18, 19, 20 as crits.

### Survivor (Level 18)
**Type:** Passive.
**Effect:** At start of each of your turns, regain 5 + CON modifier HP if you are below half your HP max and have at least 1 HP.
**Dashboard:** Reference card with calculated value: "Survivor: Regain [5 + CON mod] HP per turn when below [half max HP] HP."

---

## Subclass: Battle Master

### Combat Superiority (Level 3)
**Superiority Dice:** 4 dice, d8. Resource tracker, refreshes on SHORT rest.
- Level 7: 5 dice
- Level 10: dice become d10
- Level 15: 6 dice
- Level 18: dice become d12

**Dashboard:** Tappable pip tracker for dice. Display current die size prominently: "Superiority Dice: 4d8"

### Maneuvers
At level 3, choose 3 maneuvers. Learn more at 7 (5 total), 10 (7 total), 15 (9 total).

**Maneuver Save DC:** 8 + proficiency + STR mod or DEX mod (whichever is higher). Display calculated DC on dashboard.

During level-up, when a Battle Master gains new maneuvers, show the full list minus already-known and let them pick.

Each maneuver needs a reference card on the dashboard showing: name, cost (1 superiority die), trigger, effect, and whether it uses the save DC.

**PHB Maneuvers (all cost 1 superiority die):**

**Commander's Strike:** Forgo one attack. An ally within hearing uses reaction to make one weapon attack, adding the superiority die to damage.

**Disarming Attack:** Add superiority die to damage. Target makes STR save or drops one held item.

**Distracting Strike:** Add superiority die to damage. Next attack by someone else against the target has advantage (before start of your next turn).

**Evasive Footwork:** When you move, add superiority die roll to AC until you stop moving.

**Feinting Attack:** Bonus action. Advantage on next attack against a creature within 5ft. If it hits, add superiority die to damage.

**Goading Attack:** Add superiority die to damage. Target makes WIS save or has disadvantage on attacks against anyone but you (until end of your next turn).

**Lunging Attack:** Increase melee reach by 5ft for one attack. Add superiority die to damage.

**Maneuvering Attack:** Add superiority die to damage. Choose an ally. That ally can use reaction to move half speed without provoking opportunity attacks.

**Menacing Attack:** Add superiority die to damage. Target makes WIS save or is frightened of you until end of your next turn.

**Parry:** Reaction when hit by melee. Reduce damage by superiority die + DEX mod.

**Precision Attack:** Add superiority die to attack roll (before or after rolling, but before knowing if it hits).

**Pushing Attack:** Add superiority die to damage. Target makes STR save or is pushed 15ft.

**Rally:** Bonus action. Choose an ally within 60ft who can hear you. That ally gains temp HP equal to superiority die + CHA mod.

**Riposte:** Reaction when a creature misses you with melee. Make one melee attack. If it hits, add superiority die to damage.

**Sweeping Attack:** When you hit a creature, choose another creature within 5ft of the target and within your reach. If original attack roll would hit the second creature, it takes superiority die damage.

**Trip Attack:** Add superiority die to damage. Target makes STR save or is knocked prone (if Large or smaller).

### Student of War (Level 3)
Proficiency with one artisan's tool. Store in character data, reference only.

### Know Your Enemy (Level 7)
Spend 1 minute observing a creature to learn if it is equal, superior, or inferior in two characteristics. Reference card only — no mechanical integration needed.

---

## Subclass: Eldritch Knight

### Spellcasting (Level 3)

Eldritch Knights LEARN spells — they do not prepare. Track `spellsKnown` instead of `currentPreparedSpells`.

**Cantrips:** 2 from Wizard list at level 3. Gain a third at level 10.

**Spells Known progression:**
```
Level  Spells Known  Cantrips  Slots 1st  2nd  3rd  4th
 3     3             2         2          —    —    —
 4     4             2         3          —    —    —
 7     5             2         4          2    —    —
 8     6             2         4          2    —    —
10     7             3         4          3    —    —
11     8             3         4          3    —    —
13     9             3         4          3    2    —
14    10             3         4          3    2    —
16    11             3         4          3    3    —
19    12             3         4          3    3    1
20    13             3         4          3    3    1
```

**School Restriction:** When learning a new spell (not cantrips), it must be Abjuration or Evocation from the Wizard list. Exception: at levels 3, 8, 14, and 20, the Fighter can learn ONE spell from ANY school.

During level-up spell selection, highlight which schools are available. If it's a free-pick level, show all schools. Otherwise, filter to Abjuration and Evocation.

When a Fighter gains a spell at certain levels, they can also swap one known spell for another Wizard spell (following school restrictions). Show this option during level-up.

### Eldritch Knight Features

**War Magic (Level 7):** When you use your action to cast a cantrip, you can make one weapon attack as a bonus action. Reference card.

**Eldritch Strike (Level 10):** When you hit a creature with a weapon attack, it has disadvantage on the next saving throw it makes against your spells before the end of your next turn. Reference card.

**Arcane Charge (Level 15):** When you use Action Surge, you can teleport up to 30ft to an unoccupied space before or after the additional action. Reference card.

**Improved War Magic (Level 18):** When you use your action to cast a spell (not just a cantrip), you can make one weapon attack as a bonus action. Upgrade to War Magic reference card.

### Wizard Spell Data (Levels 1-4, PHB)

Include full structured spell data for the following Wizard spells. Each needs: name, level, school, castingTime, range, components, duration, description, and where applicable: damage, save, attack, upcast.

Mark each spell with `school` for enforcement of the Abjuration/Evocation restriction.

**Wizard Cantrips (PHB):**
Acid Splash, Blade Ward, Chill Touch, Dancing Lights, Fire Bolt, Friends, Light, Mage Hand, Mending, Message, Minor Illusion, Poison Spray, Prestidigitation, Ray of Frost, Shocking Grasp, True Strike

**1st Level — Abjuration:**
Alarm (ritual), Mage Armor, Protection from Evil and Good, Shield

**1st Level — Evocation:**
Burning Hands, Chromatic Orb, Magic Missile, Thunderwave, Witch Bolt

**1st Level — Other Schools (free picks only):**
Charm Person (Enchantment), Color Spray (Illusion), Comprehend Languages (Divination, ritual), Detect Magic (Divination, ritual), Disguise Self (Illusion), Expeditious Retreat (Transmutation), False Life (Necromancy), Feather Fall (Transmutation), Find Familiar (Conjuration, ritual), Fog Cloud (Conjuration), Grease (Conjuration), Identify (Divination, ritual), Illusory Script (Illusion, ritual), Jump (Transmutation), Longstrider (Transmutation), Silent Image (Illusion), Sleep (Enchantment), Tasha's Hideous Laughter (Enchantment), Unseen Servant (Conjuration, ritual)

**2nd Level — Abjuration:**
Arcane Lock

**2nd Level — Evocation:**
Darkness, Flaming Sphere, Gust of Wind, Scorching Ray, Shatter

**2nd Level — Other Schools:**
Blindness/Deafness (Necromancy), Blur (Illusion), Crown of Madness (Enchantment), Darkvision (Transmutation), Enlarge/Reduce (Transmutation), Gentle Repose (Necromancy, ritual), Hold Person (Enchantment), Invisibility (Illusion), Knock (Transmutation), Levitate (Transmutation), Magic Mouth (Illusion, ritual), Magic Weapon (Transmutation), Misty Step (Conjuration), Mirror Image (Illusion), Phantasmal Force (Illusion), Ray of Enfeeblement (Necromancy), Rope Trick (Transmutation), See Invisibility (Divination), Spider Climb (Transmutation), Suggestion (Enchantment), Web (Conjuration)

**3rd Level — Abjuration:**
Counterspell, Dispel Magic, Glyph of Warding, Magic Circle, Nondetection, Protection from Energy, Remove Curse

**3rd Level — Evocation:**
Daylight, Fireball, Lightning Bolt, Sending, Wind Wall

**3rd Level — Other Schools:**
Animate Dead (Necromancy), Bestow Curse (Necromancy), Blink (Transmutation), Clairvoyance (Divination), Fear (Illusion), Feign Death (Necromancy, ritual), Fly (Transmutation), Gaseous Form (Transmutation), Haste (Transmutation), Hypnotic Pattern (Illusion), Leomund's Tiny Hut (Evocation, ritual), Major Image (Illusion), Phantom Steed (Illusion, ritual), Slow (Transmutation), Stinking Cloud (Conjuration), Tongues (Divination), Vampiric Touch (Necromancy), Water Breathing (Transmutation, ritual)

**4th Level — Abjuration:**
Banishment, Fire Shield, Stoneskin

**4th Level — Evocation:**
Ice Storm, Otiluke's Resilient Sphere, Wall of Fire

**4th Level — Other Schools:**
Arcane Eye (Divination), Blight (Necromancy), Confusion (Enchantment), Dimension Door (Conjuration), Evard's Black Tentacles (Conjuration), Fabricate (Transmutation), Greater Invisibility (Illusion), Hallucinatory Terrain (Illusion), Locate Creature (Divination), Phantasmal Killer (Illusion), Polymorph (Transmutation), Stone Shape (Transmutation)

Each spell needs the same structured data format used for Cleric spells in the existing `SPELL_DB`. Share entries for spells that appear on both Cleric and Wizard lists (e.g., Detect Magic, Protection from Evil and Good).

---

## Level-Up Engine — Fighter

Add `FIGHTER_PROGRESSION` object following the same pattern as `CLERIC_PROGRESSION`. Each level entry specifies: features, asi (boolean), spellSlots (EK only), proficiencyBonus, resources gained.

Level-up wizard screens for Fighter:
1. HP (always) — d10 hit die
2. ASI/Feat (at levels 4, 6, 8, 12, 14, 16, 19)
3. Fighting Style selection (level 1 onboarding, level 10 Champion only)
4. Subclass selection (level 3)
5. Maneuver selection (Battle Master at 3, 7, 10, 15)
6. Spell learning (Eldritch Knight at spell-gain levels)
7. New features display
8. Spell slot changes (EK only)
9. Proficiency bonus increase (at 5, 9, 13, 17)
10. Summary & Confirm

Only show screens that apply to this level and subclass. A Champion at level 5 sees: HP → Extra Attack feature → Prof bonus increase → Summary. A Battle Master at level 7 sees: HP → New maneuvers → Know Your Enemy feature → Summary.

---

## Dashboard Layout — Fighter

Section order:
1. HP Tracker (prominent)
2. Stat Cards (AC, Speed, Initiative, Prof Bonus)
3. Weapons (with attack/damage rollers)
4. Extra Attack display (level 5+)
5. Action Surge tracker (level 2+)
6. Second Wind tracker with Roll button (level 1+)
7. Fighting Style reference card(s)
8. Indomitable tracker (level 9+)
9. Critical Range display (Champion only, level 3+)
10. Superiority Dice tracker + Maneuver cards (Battle Master only, level 3+)
11. Spell section (Eldritch Knight only, level 3+)
12. Abilities + Saves + Skills
13. Rest buttons
14. Dice rollers
15. Currency
16. Equipped items
17. Inventory
18. Notes
