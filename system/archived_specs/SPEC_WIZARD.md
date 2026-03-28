# SPEC: Wizard Class — Full PHB Implementation

## Overview

- **Hit Die:** d6
- **Saving Throws:** INT, WIS
- **Armor Proficiencies:** None
- **Weapon Proficiencies:** Daggers, darts, slings, quarterstaffs, light crossbows
- **Skill Choices:** Pick 2 from Arcana, History, Insight, Investigation, Medicine, Religion

The Wizard has the largest spell list in the game (200+ spells across levels 1-9). They learn spells into a spellbook and prepare from that list daily. Their power is versatility — given time, a Wizard can learn almost any arcane spell.

---

## Color Theme — Wizard (Arcane Blue)

```
accent: #6a8cc8, accentHover: #7a9cd8, accentDim: #4a6ca0
bg: #10141c, surface: #181e2a, surfaceRaised: #202838
border: #283048, text: #d8e0f0, textDim: #8898b8
```

Add to CLASS_DATA and theme preset list.

---

## Wizard Progression (Levels 1-20)

```
Level  Prof  Features                                Cantrips  Spell Slots
                                                               1st 2nd 3rd 4th 5th 6th 7th 8th 9th
 1     +2    Spellcasting, Arcane Recovery            3         2   —   —   —   —   —   —   —   —
 2     +2    Arcane Tradition (subclass)              3         3   —   —   —   —   —   —   —   —
 3     +2    —                                        3         4   2   —   —   —   —   —   —   —
 4     +2    ASI/Feat                                 4         4   3   —   —   —   —   —   —   —
 5     +3    —                                        4         4   3   2   —   —   —   —   —   —
 6     +3    Arcane Tradition feature                 4         4   3   3   —   —   —   —   —   —
 7     +3    —                                        4         4   3   3   1   —   —   —   —   —
 8     +3    ASI/Feat                                 4         4   3   3   2   —   —   —   —   —
 9     +4    —                                        4         4   3   3   3   1   —   —   —   —
10     +4    Arcane Tradition feature                 5         4   3   3   3   2   —   —   —   —
11     +4    —                                        5         4   3   3   3   2   1   —   —   —
12     +4    ASI/Feat                                 5         4   3   3   3   2   1   —   —   —
13     +5    —                                        5         4   3   3   3   2   1   1   —   —
14     +5    Arcane Tradition feature                 5         4   3   3   3   2   1   1   —   —
15     +5    —                                        5         4   3   3   3   2   1   1   1   —
16     +5    ASI/Feat                                 5         4   3   3   3   2   1   1   1   —
17     +6    —                                        5         4   3   3   3   2   1   1   1   1
18     +6    Spell Mastery                            5         4   3   3   3   3   1   1   1   1
19     +6    ASI/Feat                                 5         4   3   3   3   3   2   1   1   1
20     +6    Signature Spells                         5         4   3   3   3   3   2   2   1   1
```

Note: Wizard spell slots follow the full caster table (same as Cleric).

---

## Spellcasting — The Spellbook System

This is the unique Wizard mechanic. Unlike Cleric (who accesses the full class list) or Sorcerer (who learns a fixed set), Wizards build a personal spellbook over time.

### Spellbook

**Starting spells:** At level 1, the spellbook contains 6 first-level wizard spells.

**Learning on level-up:** Each level, add 2 wizard spells to the spellbook. These must be of a level for which you have spell slots.

**Learning from scrolls/books:** Wizards can also copy spells from scrolls or other spellbooks they find during adventures. This is a key part of Wizard gameplay. Add a "Copy Spell to Spellbook" function on the dashboard (see Dashboard section).

### Preparing Spells

From the spellbook, the Wizard prepares a subset each day.

**Prepared spell count:** INT modifier + wizard level (minimum 1).

**The key distinction from Cleric:** Clerics can prepare from their ENTIRE class spell list. Wizards can only prepare from spells IN THEIR SPELLBOOK. The onboarding and level-up flows must enforce this — the preparation picker only shows spellbook contents, not the full Wizard list.

### Spell Save DC and Attack

**Spell save DC:** 8 + proficiency + INT modifier.
**Spell attack bonus:** proficiency + INT modifier.

All spell cards must use INT mod, not WIS or CHA.

### Data Model

```
spellbook: ["Shield", "Magic Missile", "Detect Magic", "Mage Armor", "Thunderwave", "Find Familiar"],
currentPreparedSpells: ["Shield", "Magic Missile", "Detect Magic", "Mage Armor"]
```

The `spellbook` array is the master list. `currentPreparedSpells` is the subset prepared today. Preparation picker only shows spells from `spellbook`.

### Copy Spell to Spellbook (Dashboard Feature)

A "Copy Spell" button in the spell section. Opens a picker showing the full Wizard spell list filtered to levels the character has slots for, minus spells already in the spellbook. Player picks a spell to add to the spellbook.

Show a note: "Copying a spell costs 2 hours and 50 gp per spell level. (The app doesn't track this — manage with your DM.)"

---

## Arcane Recovery (Level 1)

**Type:** 1 use per LONG rest (usable during a short rest).
**Effect:** Recover expended spell slots with a combined level equal to or less than half your wizard level (round up). No individual slot can be 6th level or higher.

### Dashboard Integration

Resource tracker: 1 use, long rest. When tapped "Use Arcane Recovery":
1. Show current spent slots
2. Show budget: "Recover up to [ceil(level/2)] levels of spell slots"
3. Player taps slots to recover: "+1st" "+2nd" etc. Each tap adds that slot level to the total. Running counter shows "X / [budget] levels used"
4. Cannot select 6th+ level slots
5. Confirm → restore those slots, mark Arcane Recovery as used

Example at level 5 (budget = 3): could recover one 3rd-level slot, or one 2nd + one 1st, or three 1st-level slots.

---

## Core Features

### Spell Mastery (Level 18)
**Type:** Selection.
**Effect:** Choose one 1st-level and one 2nd-level spell from your spellbook. You can cast them at their lowest level without expending a spell slot. If you want to cast them at a higher level, you spend a slot as normal.
**Dashboard:** Chosen spells are marked "At Will" on their spell cards. Roll buttons don't prompt for slot spending.
**Level-up:** At level 18, player picks one 1st-level and one 2nd-level spell from their spellbook.

### Signature Spells (Level 20)
**Type:** Selection.
**Effect:** Choose two 3rd-level spells from your spellbook. They are always prepared (don't count against limit) and you can cast each once without a slot (recharge on short/long rest).
**Dashboard:** Marked "Signature — 1 free cast per rest" on spell cards. Tracker for free casts (2 pips, short rest recharge).
**Level-up:** At level 20, player picks two 3rd-level spells from their spellbook.

---

## Wizard Cantrips (PHB)

All 16 PHB Wizard cantrips (same list as Eldritch Knight, already in the data from SPEC_FIGHTER.md):

Acid Splash, Blade Ward, Chill Touch, Dancing Lights, Fire Bolt, Friends, Light, Mage Hand, Mending, Message, Minor Illusion, Poison Spray, Prestidigitation, Ray of Frost, Shocking Grasp, True Strike

Each needs structured spell data. Damage cantrips scale at levels 5, 11, 17:
- Fire Bolt: 1d10 → 2d10 → 3d10 → 4d10
- Acid Splash: 1d6 → 2d6 → 3d6 → 4d6
- Chill Touch: 1d8 → 2d8 → 3d8 → 4d8
- Poison Spray: 1d12 → 2d12 → 3d12 → 4d12
- Ray of Frost: 1d8 → 2d8 → 3d8 → 4d8
- Shocking Grasp: 1d8 → 2d8 → 3d8 → 4d8

---

## Wizard Spell List (PHB, Levels 1-9)

This is the largest spell list in the game. Every spell needs structured data. Reuse spell data already built for Cleric (shared spells) and Eldritch Knight (Wizard levels 1-4 from SPEC_FIGHTER.md). Only ADD spells not yet in the database.

### Spells already in the database (reuse — do not duplicate):

**From Cleric spell data:** Detect Magic, Detect Poison and Disease, Protection from Evil and Good, Purify Food and Drink (overlap is minimal — most Wizard spells are unique)

**From Eldritch Knight data (SPEC_FIGHTER.md):** All Wizard spells levels 1-4 should already be built. Verify they exist and reuse them.

### New spells to add (levels 5-9 only, since 1-4 should exist):

**5th Level:**
Animate Objects, Arcane Hand, Cloudkill, Cone of Cold, Conjure Elemental, Contact Other Plane, Creation, Dominate Person, Dream, Geas, Hold Monster, Legend Lore, Mislead, Modify Memory, Passwall, Planar Binding, Scrying, Seeming, Telekinesis, Telepathic Bond, Teleportation Circle, Wall of Force, Wall of Stone

**6th Level:**
Arcane Gate, Chain Lightning, Circle of Death, Contingency, Create Undead, Disintegrate, Eyebite, Flesh to Stone, Globe of Invulnerability, Guards and Wards, Instant Summons, Irresistible Dance, Magic Jar, Mass Suggestion, Move Earth, Programmed Illusion, Sunbeam, True Seeing, Wall of Ice

**7th Level:**
Delayed Blast Fireball, Etherealness, Finger of Death, Forcecage, Mirage Arcane, Mordenkainen's Sword, Plane Shift, Prismatic Spray, Project Image, Reverse Gravity, Sequester, Simulacrum, Symbol, Teleport

**8th Level:**
Antimagic Field, Antipathy/Sympathy, Clone, Control Weather, Demiplane, Dominate Monster, Feeblemind, Incendiary Cloud, Maze, Mind Blank, Power Word Stun, Sunburst, Telepathy

**9th Level:**
Astral Projection, Foresight, Gate, Imprisonment, Meteor Swarm, Power Word Kill, Prismatic Wall, Shapechange, Time Stop, True Polymorph, Weird, Wish

For each spell, include: name, level, school, castingTime, range, components, duration, description. For damage/healing spells, include dice, type, save, attack, upcast where applicable.

**Prioritize damage/utility spells that players commonly use.** The description for rarely-used spells can be brief. The description for commonly-used spells (Shield, Fireball, Counterspell, Misty Step, etc.) should be detailed with mechanical specifics.

---

## Subclasses — Arcane Traditions

The PHB has 8 Wizard subclasses, one per school of magic. They all follow the same pattern with minor variations. This makes them efficient to implement.

### Common Subclass Pattern (all 8 schools):

**Level 2 — Savant:** Halved time and gold cost to copy [school] spells into spellbook.
**Level 2 — School Feature:** A unique ability.
**Level 6 — School Feature:** A unique ability.
**Level 10 — School Feature:** A unique ability.
**Level 14 — School Feature:** A unique ability.

### School of Abjuration

**Abjuration Savant (Level 2):** Half time/gold to copy abjuration spells.

**Arcane Ward (Level 2):** When you cast an abjuration spell of 1st level+, create a ward with HP = wizard level × 2 + INT mod. The ward absorbs damage for you. When you cast another abjuration spell, the ward regains HP = spell level × 2.
**Dashboard:** A special resource: "Arcane Ward: [current]/[max] HP". Separate from character HP. When taking damage, prompt: "Absorb with Arcane Ward?" Damage reduces ward HP first.

**Projected Ward (Level 6):** Reaction — when a creature within 30ft takes damage, Arcane Ward absorbs it instead.

**Improved Abjuration (Level 10):** Add proficiency bonus to ability checks for abjuration spells (Counterspell, Dispel Magic).

**Spell Resistance (Level 14):** Advantage on saves vs spells. Resistance to spell damage.

### School of Conjuration

**Conjuration Savant (Level 2):** Half time/gold for conjuration spells.

**Minor Conjuration (Level 2):** Action — create a nonmagical object up to 3ft per side, 10 lbs. Lasts until you use this again, 1 hour, or it takes damage.

**Benign Transposition (Level 6):** Action — teleport 30ft to unoccupied space, or swap with willing Small/Medium creature. 1/long rest, or recharges when you cast a conjuration spell.

**Focused Conjuration (Level 10):** Concentration on conjuration spells can't be broken by taking damage.

**Durable Summons (Level 14):** Creatures you summon/create with conjuration spells gain 30 temp HP.

### School of Divination

**Divination Savant (Level 2):** Half time/gold for divination spells.

**Portent (Level 2):** After a long rest, roll 2d20 and record the numbers. Before a long rest, you can replace any attack roll, save, or ability check made by a creature you can see with one of your portent dice. You must choose to do so before the roll.
**Dashboard:** This is the signature Divination feature. Show "Portent Dice" with the two rolled values displayed prominently. Each has a "Use" button. When used, it's consumed. At level 14, roll 3d20 instead of 2.
**Roll portent dice** on long rest automatically or via a "Roll Portent" button.

**Expert Divination (Level 6):** When you cast a divination spell of 2nd level+, regain a spell slot of lower level (max 5th). Essentially free lower-level slots when casting divination.

**The Third Eye (Level 10):** Action, until rest. Choose one: darkvision 60ft, see Ethereal Plane 60ft, read any language, or see invisible creatures within 10ft.

**Greater Portent (Level 14):** Roll 3d20 for Portent instead of 2.

### School of Enchantment

**Enchantment Savant (Level 2):** Half time/gold for enchantment spells.

**Hypnotic Gaze (Level 2):** Action — charm a creature within 5ft (WIS save). Incapacitated and speed 0 while charmed. Lasts until end of your next turn. Can use action on subsequent turns to maintain (no save). Ends if you move more than 5ft from target, target takes damage, or target can't see/hear you.

**Instinctive Charm (Level 6):** Reaction when attacked by creature within 30ft. It must make WIS save or redirect the attack to the closest creature other than you. 1/long rest (or recharges when you cast an enchantment spell). Doesn't work on targets immune to charm.

**Split Enchantment (Level 10):** When you cast an enchantment spell that targets one creature, target a second creature too.

**Alter Memories (Level 14):** When you charm a creature, it doesn't know it was charmed when the effect ends. Also, before the charm ends, use action to make the target forget some of the time it was charmed (INT save, hours = CHA mod forgotten, min 1).

### School of Evocation

**Evocation Savant (Level 2):** Half time/gold for evocation spells.

**Sculpt Spells (Level 2):** When casting an evocation spell affecting others, choose a number of creatures = 1 + spell level. Those creatures auto-succeed on the save and take no damage.
**Dashboard:** Reference card. Very important for Fireball usage — "Choose up to [1 + spell level] allies to protect."

**Potent Cantrip (Level 6):** When a creature succeeds on a save vs your cantrip, it takes half damage (not zero).

**Empowered Evocation (Level 10):** Add INT modifier to damage of any wizard evocation spell.
**Dashboard integration:** Auto-add INT mod to evocation spell damage in spell cards and dice rolls. Mark: "(+[INT] Empowered Evocation)"

**Overchannel (Level 14):** When you cast a wizard spell of 5th level or lower that deals damage, deal maximum damage. First use per long rest: no penalty. Subsequent uses before long rest: 2d12 necrotic damage per spell level (bypasses resistance/immunity) per previous Overchannel since last rest.
**Dashboard:** "Overchannel" toggle on damage spell cards. Track uses: "Overchannel uses this rest: [N]" with warning about self-damage.

### School of Illusion

**Illusion Savant (Level 2):** Half time/gold for illusion spells.

**Improved Minor Illusion (Level 2):** Minor Illusion cantrip can create both a sound AND an image simultaneously.

**Malleable Illusions (Level 6):** When you cast an illusion spell with duration 1 minute+, use action to change the nature of the illusion (within the spell's normal parameters).

**Illusory Self (Level 10):** Reaction when attacked — create illusory duplicate, attack auto-misses. 1/short rest.
**Dashboard:** Resource tracker (1 use, short rest).

**Illusory Reality (Level 14):** When you cast an illusion spell of 1st level+, choose one inanimate nonmagical object in the illusion — it becomes real for 1 minute. Object can't deal damage or directly harm.

### School of Necromancy

**Necromancy Savant (Level 2):** Half time/gold for necromancy spells.

**Grim Harvest (Level 2):** When you kill a creature with a spell of 1st level+, regain HP = 2 × spell level (3 × spell level if necromancy). Doesn't work on constructs/undead.
**Dashboard:** Reference card. Auto-calculate: "On kill with [level] spell: regain [2 × level] HP ([3 × level] if necromancy spell)."

**Undead Thralls (Level 6):** Add Animate Dead to spellbook (free if not already there). When you cast Animate Dead, target gains extra HP = wizard level, and adds proficiency bonus to weapon damage.

**Inured to Undeath (Level 10):** Resistance to necrotic damage. HP max can't be reduced.

**Command Undead (Level 14):** Action — target one undead you can see within 60ft. WIS save (INT 12+ undead have advantage). On fail, it obeys your commands until you use this again.

### School of Transmutation

**Transmutation Savant (Level 2):** Half time/gold for transmutation spells.

**Minor Alchemy (Level 2):** Spend 10 minutes to transform up to 1 cubic foot of wood/stone/iron/copper/silver into another of those materials. Lasts 1 hour or until you lose concentration.

**Transmuter's Stone (Level 6):** Spend 8 hours to create a stone granting one benefit to the holder (you choose when creating): darkvision 60ft, +10ft speed, proficiency in CON saves, or resistance to acid/cold/fire/lightning/thunder (choose one). Can change the benefit when you cast a transmutation spell of 1st level+. Can destroy the stone to: change one creature's age by 3d10 years (younger/older), remove all curses/diseases/poisons from a creature, cast Raise Dead without a slot or material components, or change a creature's form (Polymorph, CON save negates).
**Dashboard:** Track which benefit is active on the stone and who holds it.

**Shapechanger (Level 10):** Add Polymorph to spellbook. Can cast it on yourself without a slot, targeting only yourself, transforming into a beast of CR 1 or lower. 1/short rest.

**Master Transmuter (Level 14):** Action — destroy Transmuter's Stone for one of: turn a 5ft cube of nonmagical object into any other nonmagical object of similar size/mass, remove all curses/diseases/poisons + heal 5d6 HP, cast Raise Dead without a slot/components, or restore youth (target ages to young adult).

---

## Onboarding — Wizard-Specific

### Step 4 (Spells) — Modified for Spellbook

The normal Cleric-style "prepared spells" step doesn't work for Wizard. Instead:

**Cantrips:** Pick cantrips from Wizard cantrip list (3 at level 1, 4 at level 4, 5 at level 10).

**Spellbook Entry:** "Choose 6 first-level wizard spells for your spellbook." Show the full 1st-level Wizard spell list as expandable cards (with details). Player selects exactly 6. Strict enforcement.

If entering at a higher level: the spellbook should contain 6 + (2 × (level - 1)) spells total. Show the appropriate number of picks per spell level the character has access to. This is complex — simplify by letting the player pick their total spellbook contents from all available levels in one batch, with a counter showing "X / Y spells selected."

**Prepared spells:** After spellbook is set, show a preparation picker showing ONLY spellbook contents. Prepared count = INT mod + wizard level. Strict enforcement.

### Subclass Selection (Level 2)

Show 8 options (one per school). Each with a brief description of the school's flavor and level 2 feature.

---

## Level-Up Engine — Wizard

Level-up wizard screens:
1. HP (always) — d6 hit die (Wizards are fragile!)
2. ASI/Feat (at levels 4, 8, 12, 16, 19)
3. New cantrip (at levels 4, 10)
4. Add spells to spellbook — "Choose 2 wizard spells to add" at every level. Must be a level for which you have spell slots. Show available spells not already in the spellbook.
5. Spell slot changes
6. New spell level access (at 3, 5, 7, 9, 11, 13, 15, 17)
7. Subclass selection (level 2)
8. Subclass features
9. Prepared spell count change
10. Proficiency bonus increase (at 5, 9, 13, 17)
11. Portent dice roll (Divination, level 2+) — prompt on each long rest or level-up
12. Spell Mastery selection (level 18) — pick one 1st and one 2nd level spell
13. Signature Spells selection (level 20) — pick two 3rd-level spells
14. Summary & Confirm

---

## Dashboard Layout — Wizard

Section order:
1. HP Tracker (Wizards are squishy — make this prominent)
2. Arcane Recovery tracker (level 1+)
3. Stat Cards (AC, Speed, Initiative, Prof Bonus, Spell Save DC, Spell Attack)
4. Portent Dice display (Divination only, level 2+)
5. Arcane Ward HP tracker (Abjuration only, level 2+)
6. Spell Slots (interactive — most important for Wizard)
7. Cantrip spell cards
8. Prepared Spell cards (from spellbook only)
9. Spellbook section (full list of known spells — collapsible, tap to see all)
10. Copy Spell to Spellbook button
11. Weapons (Wizards still have daggers/quarterstaffs)
12. School-specific feature cards
13. Abilities + Saves + Skills
14. Concentration tracker
15. Rest buttons
16. Dice rollers
17. Currency
18. Equipped items
19. Inventory
20. Notes

---

## Recommended Stats — Wizard

Standard Array allocation:
```
STR 8, DEX 14, CON 13, INT 15, WIS 12, CHA 10
```
Rationale: INT powers everything. DEX for AC (no armor) and initiative. CON for concentration saves and HP on a d6. WIS for common saves.

Recommended skills: Arcana, Investigation.

---

## Healing Spell Note

Wizards have almost no healing spells (only Life Transference at 3rd level in XGtE, which is not PHB). Do NOT apply any healing spell bonuses (Disciple of Life, Blessed Healer, etc.) to Wizard spell cards. The spell card renderer must check class before applying Cleric-specific bonuses.
