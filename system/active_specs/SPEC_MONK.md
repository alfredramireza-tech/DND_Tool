# SPEC: Monk Class — Full PHB Implementation

## Overview

- **Hit Die:** d8
- **Saving Throws:** STR, DEX
- **Armor Proficiencies:** None
- **Weapon Proficiencies:** Simple weapons, shortswords
- **Skill Choices:** Pick 2 from Acrobatics, Athletics, History, Insight, Religion, Stealth
- **Tool Proficiency:** One artisan's tool OR one musical instrument (player's choice during onboarding)

---

## Monk Progression (Levels 1-20)

```
Level  Prof  Martial Arts  Ki  Unarmored Movement  Features
 1     +2    1d4           —   —                   Unarmored Defense, Martial Arts
 2     +2    1d4           2   +10ft               Ki, Unarmored Movement
 3     +2    1d4           3   +10ft               Subclass, Deflect Missiles
 4     +2    1d4           4   +10ft               ASI/Feat, Slow Fall
 5     +3    1d6           5   +10ft               Extra Attack, Stunning Strike
 6     +3    1d6           6   +15ft               Ki-Empowered Strikes, Subclass feature
 7     +3    1d6           7   +15ft               Evasion, Stillness of Mind
 8     +3    1d6           8   +15ft               ASI/Feat
 9     +4    1d6           9   +15ft               Unarmored Movement Improvement
10     +4    1d6          10   +20ft               Purity of Body
11     +4    1d8          11   +20ft               Subclass feature
12     +4    1d8          12   +20ft               ASI/Feat
13     +5    1d8          13   +20ft               Tongue of the Sun and Moon
14     +5    1d8          14   +25ft               Diamond Soul
15     +5    1d8          15   +25ft               Timeless Body
16     +5    1d8          16   +25ft               ASI/Feat
17     +6    1d10         17   +25ft               Subclass feature
18     +6    1d10         18   +30ft               Empty Body
19     +6    1d10         19   +30ft               ASI/Feat
20     +6    1d10         20   +30ft               Perfect Self
```

---

## Ki System

The central Monk resource. Everything revolves around ki budget management.

### Ki Point Tracker
- Tappable pips equal to monk level
- Refreshes on SHORT rest (and long rest)
- Most prominent element on the Monk dashboard
- Display: "Ki: 3/4" with visual pips

### Ki Abilities (unlocked at Level 2)
These should display as always-visible compact cards below the ki tracker. Each shows name, ki cost, action type, and a brief description.

**Flurry of Blows (1 ki):**
After you take the Attack action, make 2 unarmed strikes as a bonus action.
Roll button: rolls martial arts die + DEX mod for each strike.

**Patient Defense (1 ki):**
Take the Dodge action as a bonus action.
Reference only — no roll needed.

**Step of the Wind (1 ki):**
Take the Disengage or Dash action as a bonus action. Jump distance doubled for the turn.
Reference only — no roll needed.

**Stunning Strike (1 ki, level 5+):**
When you hit with a melee weapon attack, spend 1 ki. Target makes CON save or is stunned until end of your next turn.
Show calculated DC: 8 + proficiency + WIS mod.
Dashboard: "Stunning Strike DC: [calculated]"

Each ki ability card should have a "Use" button that deducts 1 ki from the tracker. For Flurry of Blows, the Use button should also trigger the unarmed strike rolls.

---

## Martial Arts

The Monk's unique combat mechanic. Affects unarmed strikes and monk weapons (simple weapons without the two-handed or heavy property, plus shortswords).

### Martial Arts Die
Display prominently: "Martial Arts: 1d6" (scales per table above).

### Martial Arts Rules (reference card on dashboard):
- Can use DEX instead of STR for attack and damage rolls with unarmed strikes and monk weapons
- Can roll martial arts die instead of weapon's normal damage for monk weapons
- When you use the Attack action with an unarmed strike or monk weapon, you can make one unarmed strike as a bonus action (free — no ki cost)

### Weapon Integration
Monk weapons should auto-detect if the martial arts die is higher than the weapon's normal die. If so, offer both options when rolling damage. Example: a shortsword does 1d6, and at level 11 the martial arts die is 1d8 — show the option to use 1d8 instead.

---

## Core Features — Descriptions

### Unarmored Defense (Level 1)
**AC = 10 + DEX mod + WIS mod** when not wearing armor. Can use a shield (but monks generally don't).
**Integration:** `calculateAC()` checks: if class is Monk and no armor equipped, AC = 10 + DEX + WIS + shield.

### Deflect Missiles (Level 3)
**Type:** Reaction.
**Effect:** When hit by a ranged weapon attack, reduce damage by 1d10 + DEX mod + monk level. If reduced to 0, spend 1 ki to catch and throw it back (ranged attack, monk weapon, 20/60 range).
**Dashboard:** Reference card with Roll button: "Reduce by 1d10 + [DEX mod] + [monk level]." Shows calculated range: "1d10 + [X]."
**Dice roller:** Rolls 1d10 + DEX mod + monk level. If result >= damage taken (player enters), show "Caught! Spend 1 ki to throw back?"

### Slow Fall (Level 4)
**Type:** Reaction.
**Effect:** Reduce falling damage by 5 × monk level.
**Dashboard:** Reference card: "Reduce falling damage by [5 × level]."

### Extra Attack (Level 5)
**Type:** Passive.
**Dashboard:** "Attacks per Action: 2" near weapons.

### Stunning Strike (Level 5)
See Ki Abilities section above. This is the Monk's most impactful combat ability.

### Ki-Empowered Strikes (Level 6)
**Type:** Passive.
**Effect:** Unarmed strikes count as magical for overcoming resistance/immunity.
**Dashboard:** Note near martial arts: "Unarmed strikes are magical."

### Evasion (Level 7)
**Type:** Passive.
**Effect:** DEX saves: success = 0 damage (not half). Failure = half damage (not full).
**Dashboard:** Reference card. Note near DEX save in skills section.

### Stillness of Mind (Level 7)
**Type:** Action.
**Effect:** End one charmed or frightened effect on yourself.
**Dashboard:** Reference card.

### Unarmored Movement Improvement (Level 9)
**Type:** Passive.
**Effect:** Can run along vertical surfaces and across liquid surfaces without falling during movement (fall if you end turn on them).
**Dashboard:** Note near speed.

### Purity of Body (Level 10)
**Type:** Passive.
**Effect:** Immune to disease and poison.
**Dashboard:** Reference card.

### Tongue of the Sun and Moon (Level 13)
**Type:** Passive.
**Effect:** Understand all spoken languages. Any creature that understands a language can understand you.
**Dashboard:** Reference card.

### Diamond Soul (Level 14)
**Type:** Passive.
**Effect:** Proficiency in ALL saving throws. Also, spend 1 ki to reroll a failed saving throw (must use new roll).
**Dashboard:** All six saving throws now show proficiency. Add note: "Spend 1 ki to reroll a failed save."
**Level-up integration:** When reaching level 14, automatically add proficiency to all saves. Recalculate save bonuses.

### Timeless Body (Level 15)
**Type:** Passive.
**Effect:** No frailty of old age. Can't be aged magically. Don't need food or water.
**Dashboard:** Reference card.

### Empty Body (Level 18)
**Type:** Action.
**Options:**
- Spend 4 ki: become invisible for 1 minute + resistance to all damage except force
- Spend 8 ki: cast Astral Projection (no material components)
**Dashboard:** Reference card with ki costs.

### Perfect Self (Level 20)
**Type:** Passive.
**Effect:** At the start of combat (initiative roll), if you have no ki remaining, regain 4 ki.
**Dashboard:** Note on ki tracker.

---

## Speed Calculation

Monks have complex speed:
- Base race speed (e.g., 30ft for Human, 25ft for Dwarf)
- Plus Unarmored Movement bonus (see table) IF not wearing armor or shield
- Level 5 Fast Movement does NOT apply — that's Barbarian

Display: "[base] + [unarmored bonus] = [total] ft" when unarmored.
If armor is equipped, only show base speed with note: "Unarmored Movement disabled (wearing armor)."

**Important:** Unarmored Movement requires NO armor AND NO shield per PHB. If a Monk equips a shield, they lose the speed bonus.

---

## Subclass: Way of the Open Hand

### Open Hand Technique (Level 3)
**Type:** Passive modifier to Flurry of Blows.
**Effect:** When you hit with a Flurry of Blows attack, impose ONE of three effects:
- Target makes DEX save (DC = ki save DC) or is knocked prone
- Target makes STR save (DC = ki save DC) or is pushed up to 15ft
- Target can't take reactions until end of your next turn (no save)

**Dashboard:** When Flurry of Blows is used, show the three options as buttons. Show ki save DC.

### Wholeness of Body (Level 6)
**Type:** Action, 1 use per LONG rest.
**Effect:** Regain HP equal to 3 × monk level.
**Dashboard:** Tracker (1 use). Roll button (no dice — flat value: 3 × level). "Heal [3 × level] HP."

### Tranquility (Level 11)
**Type:** Passive.
**Effect:** At end of each long rest, gain the effect of Sanctuary spell until start of next long rest. Ends if you attack or cast a spell affecting an enemy. Save DC = ki save DC.
**Dashboard:** Reference card. "Sanctuary active (DC [ki save DC]). Ends if you attack."

### Quivering Palm (Level 17)
**Type:** Special. Costs 3 ki.
**Effect:** When you hit with an unarmed strike, spend 3 ki to set up vibrations in the target. Any time within [monk level] days, use action to end vibrations: target makes CON save. Fail = reduced to 0 HP. Success = 10d10 necrotic damage.
**Dashboard:** Reference card. Roll button for 10d10 damage. Tracker for active targets (optional — text note is fine).

---

## Subclass: Way of Shadow

### Shadow Arts (Level 3)
**Type:** Ki-powered pseudo-spells.
**Effect:** Spend 2 ki to cast one of: Darkness, Darkvision, Pass without Trace, Silence. Also learn Minor Illusion cantrip (no ki cost).

These need spell-card-style reference cards with ki cost shown instead of spell slot cost. No actual spell slots. Each shows: name, ki cost (2), casting time, range, duration, description.

**Spell data needed:**
- Minor Illusion (cantrip): Action, 30ft, 1 minute. Create a sound or image of an object within range.
- Darkness (2 ki): Action, 60ft, Concentration up to 10 min. 15ft radius sphere of magical darkness.
- Darkvision (2 ki): Action, touch, 8 hours. Target gains darkvision 60ft.
- Pass without Trace (2 ki): Action, self, Concentration up to 1 hour. +10 to Stealth for you and allies within 30ft.
- Silence (2 ki): Action, 120ft, Concentration up to 10 min. 20ft radius sphere — no sound can be created or pass through.

### Shadow Step (Level 6)
**Type:** Bonus action. No ki cost.
**Effect:** While in dim light or darkness, teleport up to 60ft to another dim light/dark spot you can see. First melee attack after teleporting has advantage.
**Dashboard:** Reference card. "Teleport 60ft (dim light to dim light). Advantage on first melee attack after."

### Cloak of Shadows (Level 11)
**Type:** Action. No ki cost.
**Effect:** While in dim light or darkness, become invisible. Lasts until you make an attack, cast a spell, or are in bright light.
**Dashboard:** Reference card.

### Opportunist (Level 17)
**Type:** Reaction.
**Effect:** When a creature within 5ft of you is hit by an attack from someone else, you can use your reaction to make a melee attack against that creature.
**Dashboard:** Reference card.

---

## Subclass: Way of the Four Elements

### Disciple of the Elements (Level 3)
Learn Elemental Attunement (free) + 1 discipline. Learn additional disciplines at levels 6, 11, 17.

Some disciplines have level prerequisites. During level-up discipline selection, only show disciplines the Monk qualifies for.

### Elemental Attunement (Free)
Use action to briefly create one minor elemental effect:
- Create harmless sensory effect (spark, gust, pebbles, water mist)
- Light/snuff a candle, torch, or small campfire
- Chill or warm up to 1 pound of nonliving material for 1 hour
- Shape earth/fire/water/mist into a crude form (~1ft cube) for 1 minute

### Disciplines

Each needs a spell-card-style reference card with: name, ki cost, level requirement, effect. Where the discipline replicates a spell, include the full spell description.

**No Level Requirement:**

**Fangs of the Fire Snake (1+ ki):** Your unarmed strikes gain 10ft reach for the turn and deal fire damage. When you hit, spend 1 additional ki for +1d10 fire damage. Dashboard: Toggle for reach, roll button for bonus damage.

**Fist of Four Thunders (2 ki):** Cast Thunderwave. 15ft cube, 2d8 thunder, STR save for half + not pushed. Upcast: +1 ki per extra level.

**Fist of Unbroken Air (2+ ki):** Target within 30ft takes 3d10 bludgeoning, STR save or pushed up to 20ft + knocked prone. +1d10 per extra ki spent. Roll button.

**Rush of the Gale Spirits (2 ki):** Cast Gust of Wind. 60ft line, 10ft wide, STR save or pushed 15ft. Concentration, 1 min.

**Shape the Flowing River (1 ki):** Control water or ice in a 30ft cube. Freeze/thaw, shape, direct flow. Lasts until end of next turn.

**Sweeping Cinder Strike (2 ki):** Cast Burning Hands. 15ft cone, 3d6 fire, DEX save for half. Upcast: +1 ki per extra level.

**Water Whip (2+ ki):** Target within 30ft takes 3d10 bludgeoning, STR save or pulled up to 25ft + knocked prone. +1d10 per extra ki. Alternatively, knock prone a creature already grappled by you.

**Level 6 Required:**

**Clench of the North Wind (3 ki):** Cast Hold Person. Concentration, 1 min. WIS save or paralyzed. Target repeats save each turn. Upcast: +1 ki per extra target.

**Gong of the Summit (3 ki):** Cast Shatter. 10ft sphere, 3d8 thunder, CON save for half. Upcast: +1 ki per extra level.

**Level 11 Required:**

**Flames of the Phoenix (4 ki):** Cast Fireball. 20ft sphere, 150ft range, 8d6 fire, DEX save for half. Upcast: +1 ki per extra level.

**Mist Stance (4 ki):** Cast Gaseous Form on yourself. Concentration, 1 hour.

**Ride the Wind (4 ki):** Cast Fly on yourself. Concentration, 10 min. 60ft fly speed.

**Level 17 Required:**

**Breath of Winter (6 ki):** Cast Cone of Cold. 60ft cone, 8d8 cold, CON save for half.

**Eternal Mountain Defense (5 ki):** Cast Stoneskin on yourself. Concentration, 1 hour. Resistance to nonmagical bludgeoning/piercing/slashing.

**River of Hungry Flame (5 ki):** Cast Wall of Fire. Concentration, 1 min. 60ft long wall, 10d8 fire to creatures within 10ft on one side.

**Wave of Rolling Earth (6 ki):** Cast Wall of Stone. Concentration, 10 min.

### Spell Data Needed
Many disciplines reference spells. Include structured spell data for: Thunderwave, Gust of Wind, Burning Hands, Hold Person, Shatter, Fireball, Gaseous Form, Fly, Cone of Cold, Stoneskin, Wall of Fire, Wall of Stone.

Reuse existing spell data where it overlaps with Cleric list (Gust of Wind → no, Thunderwave → no — these are mostly Wizard/Sorcerer spells). Add new entries for each.

---

## Level-Up Engine — Monk

Level-up wizard screens:
1. HP (always) — d8 hit die
2. ASI/Feat (at levels 4, 8, 12, 16, 19)
3. Subclass selection (level 3)
4. Ki pool increase display (every level from 2+)
5. Martial Arts die upgrade (at levels 5, 11, 17)
6. Discipline selection (Four Elements at 3, 6, 11, 17)
7. Totem/Shadow/Open Hand feature display (at subclass feature levels)
8. Speed increase display (at levels 2, 6, 10, 14, 18)
9. New features display
10. Proficiency bonus increase (at 5, 9, 13, 17)
11. Summary & Confirm

Level 14 (Diamond Soul) is special — auto-add proficiency to all saves.

---

## Dashboard Layout — Monk

Section order:
1. HP Tracker
2. Ki Points tracker + Ki ability cards (THE central feature)
3. Stat Cards (AC with Unarmored Defense noted, Speed with bonus, Initiative, Prof Bonus)
4. Martial Arts die display + unarmed strike roller
5. Stunning Strike DC display (level 5+)
6. Weapons (monk weapons)
7. Deflect Missiles reference + roller (level 3+)
8. Extra Attack display (level 5+)
9. Abilities + Saves + Skills
10. Discipline cards (Four Elements only)
11. Shadow Arts spell cards (Shadow only)
12. Feature reference cards
13. Rest buttons
14. Dice rollers
15. Currency
16. Equipped items
17. Inventory
18. Notes
