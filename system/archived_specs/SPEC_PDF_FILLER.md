# SPEC: PDF Template Filler — Character Sheet Export

## Purpose

Replace the current bare-bones print CSS PDF export with a proper form-fill system. The app fills a professional fillable PDF template with the character's data and offers it for download. The result looks like a hand-filled official character sheet.

## Template

The template file is `Current_Standard_CS_v1_4.pdf` in this folder. It is a 4-page fillable PDF with 610 form fields:
- Page 1: Main character sheet (stats, combat, skills, equipment, features)
- Page 2: Backstory, appearance, allies
- Page 3: Spellcasting (cantrips, spells 1-9 with slots and prepared checkboxes)
- Page 4: Companions/pets (skip for now — fill only if data exists)

## Technical Approach

Use **pdf-lib** (JavaScript, runs client-side in the browser) to fill the PDF. Embed the pdf-lib library inline in the HTML file (same pattern as other embedded dependencies — no CDN).

If pdf-lib's minified source is too large to embed directly (it's ~300KB), use this approach instead:
1. Embed the fillable PDF template as a base64 string in the JavaScript
2. Use pdf-lib loaded via a `<script>` tag from a CDN as a fallback: `https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js`
3. Since the app already requires internet for GitHub sync, a CDN dependency is acceptable here

**Wait — the app is designed to work offline too.** If possible, embed pdf-lib inline. If file size is truly prohibitive, use the CDN but show a graceful error if offline: "PDF export requires an internet connection."

### Flow

1. Player taps "Export PDF" on dashboard
2. App loads the embedded template (base64 → bytes)
3. App reads the character object and maps every field
4. pdf-lib fills each form field with the calculated value
5. PDF bytes are generated
6. Browser triggers a download: `[character-name]-level-[X].pdf`
7. Player opens in GoodNotes, annotates with Apple Pencil

---

## Field Mapping — Page 1 (Main Sheet)

### Header
| PDF Field | Source |
|-----------|--------|
| CharacterName | `character.name` |
| ClassLevel | `character.class + " " + character.level` (e.g., "Cleric 4") |
| Background | `character.background` |
| PlayerName | Leave blank (player fills in) |
| Race  | `character.race` (+ subrace if exists) |
| Alignment | `character.alignment` |
| XP | Leave blank (we track levels, not XP) |

### Ability Scores & Modifiers
| PDF Field | Source |
|-----------|--------|
| STR | `character.abilityScores.str` |
| STRmod | `mod(str)` with +/- sign |
| DEX | `character.abilityScores.dex` |
| DEXmod | `mod(dex)` with +/- sign |
| CON | `character.abilityScores.con` |
| CONmod | `mod(con)` with +/- sign |
| INT | `character.abilityScores.int` |
| INTmod | `mod(int)` with +/- sign |
| WIS | `character.abilityScores.wis` |
| WISmod | `mod(wis)` with +/- sign |
| CHA | `character.abilityScores.cha` |
| CHAmod | `mod(cha)` with +/- sign |

### Saving Throws
| PDF Field | Source |
|-----------|--------|
| SavingThrows | STR save bonus (mod + prof if proficient) |
| SavingThrows2 | DEX save bonus |
| SavingThrows3 | CON save bonus |
| SavingThrows4 | INT save bonus |
| SavingThrows5 | WIS save bonus |
| SavingThrows6 | CHA save bonus |

Saving throw proficiency checkboxes: check the ones matching `character.savingThrows` array. The checkbox field names need to be discovered — look for `Check Box` fields near each saving throw on page 1.

### Skills
Each skill has a text field for the bonus:
| PDF Field | Source |
|-----------|--------|
| Acrobatics | DEX mod + (prof if proficient) + (prof×2 if expertise) |
| Animal Handling | WIS mod + prof/expertise |
| Arcana | INT mod + prof/expertise |
| Athletics | STR mod + prof/expertise |
| Deception | CHA mod + prof/expertise |
| History | INT mod + prof/expertise |
| Insight | WIS mod + prof/expertise |
| Intimidation | CHA mod + prof/expertise |
| Investigation | INT mod + prof/expertise |
| Medicine | WIS mod + prof/expertise |
| Nature | INT mod + prof/expertise |
| Perception | WIS mod + prof/expertise |
| Performance | CHA mod + prof/expertise |
| Persuasion | CHA mod + prof/expertise |
| Religion | INT mod + prof/expertise |
| SleightofHand | DEX mod + prof/expertise |
| Stealth | DEX mod + prof/expertise |
| Survival | WIS mod + prof/expertise |

Skill proficiency checkboxes: check the ones in `character.skillProficiencies`. Expertise skills should also be checked (they're proficient too). The checkbox field names need discovery.

### Combat
| PDF Field | Source |
|-----------|--------|
| AC | `calculateAC(character)` |
| Initiative | DEX mod (+ other bonuses if applicable) |
| Speed | `character.speed` + any class bonuses |
| HPMax | `character.hp.max` |
| HPCurrent | `character.currentHp` |
| HPTemp | `character.tempHp` (if > 0) |
| HD | Hit die type: "1d10" for Fighter, "1d8" for Cleric, etc. |
| HDTotal | `character.hp.hitDiceCount` (= character level) |
| ProBonus | `character.proficiencyBonus` with + sign |
| Passive | 10 + Perception bonus (passive Wisdom/Perception) |
| Conditions | Join active conditions: `character.activeConditions.join(", ")` |
| Boons | Leave blank |

### Weapons (5 slots available)
Map from `character.weapons` array:
| PDF Field | Source |
|-----------|--------|
| Wpn Name | `weapons[0].name` |
| Wpn1 AtkBonus | Calculated: ability mod + prof (if proficient) + magic bonus |
| Wpn1 Damage | Calculated: `damage` dice + ability mod + magic bonus + " " + damageType |
| Wpn Name 2 | `weapons[1].name` |
| Wpn2 AtkBonus  | (note: field has trailing spaces — match exactly) |
| Wpn2 Damage  | |
| Wpn Name 3 | `weapons[2].name` |
| Wpn3 AtkBonus   | |
| Wpn3 Damage  | |
| Wpn Name 4 | `weapons[3].name` |
| Wpn4 AtkBonus | |
| Wpn4 Damage | |
| Wpn Name 5 | `weapons[4].name` |
| Wpn5 AtkBonus | |
| Wpn5 Damage | |

### Currency
| PDF Field | Source |
|-----------|--------|
| CP | `character.currency.cp` |
| SP | `character.currency.sp` |
| EP | `character.currency.ep` |
| GP | `character.currency.gp` |
| PP | `character.currency.pp` |

### Equipment
| PDF Field | Source |
|-----------|--------|
| Equipment | Equipped items list (names) + quick items, joined with newlines |
| Equipment2 | `character.bulkGear` (overflow text) |

### Features & Personality
| PDF Field | Source |
|-----------|--------|
| Features and Traits | `character.features.join("\n")` — full feature list |
| PersonalityTraits  | `character.notes` (or split if we add personality fields later) |
| Ideals | Leave blank (or from character data if we add these fields) |
| Bonds | Leave blank |
| Flaws | Leave blank |
| ProficienciesLang | Proficiencies list: armor, weapons, tools, languages. Build from class data. |

### Class Resources
| PDF Field | Source |
|-----------|--------|
| TrackingTxt1 | Class resource label, e.g., "Channel Divinity" or "Action Surge" |
| TrackingTxt2 | Second resource label |
| TrackingTxt3-6 | Additional resources |

These are text fields — fill with resource name + uses. Example: "Channel Divinity: 1/rest", "Lay on Hands: 20 HP", "Ki Points: 4", "Rage: 3/day"

### Encumbrance
| PDF Field | Source |
|-----------|--------|
| Current Weight | Leave blank (we don't track weight) |
| MAX Weight | STR score × 15 (carrying capacity) |

---

## Field Mapping — Page 2 (Backstory)

| PDF Field | Source |
|-----------|--------|
| CharacterName 2 | `character.name` |
| Age | Leave blank (or from data if we add these) |
| Height | Leave blank |
| Weight | Leave blank |
| Eyes | Leave blank |
| Skin | Leave blank |
| Hair | Leave blank |
| Backstory | `character.notes` |
| Allies | Leave blank |
| FactionName | Leave blank |
| Feat+Traits | Additional features that overflow from page 1 |
| Other | Leave blank |

---

## Field Mapping — Page 3 (Spellcasting)

Only fill this page if the character is a spellcaster (Cleric, Paladin, Wizard, Eldritch Knight, Arcane Trickster, Four Elements Monk with spell-like disciplines).

### Header
| PDF Field | Source |
|-----------|--------|
| Spellcasting Class 2 | Class + " " + spellcasting ability: "Cleric WIS" or "Wizard INT" |
| SpellSaveDC  2 | Calculated spell save DC |
| SpellAtkBonus 2 | Calculated spell attack bonus with + sign |
| Total Prepared Spells | `character.preparedSpellCount` (or spells known count for learned casters) |

### Spell Slots
Slots total per level (fields: SlotsTotal 19 through SlotsTotal 27 for levels 1-9):
| PDF Field | Spell Level |
|-----------|-------------|
| SlotsTotal 19 | 1st level total |
| SlotsTotal 20 | 2nd level total |
| SlotsTotal 21 | 3rd level total |
| SlotsTotal 22 | 4th level total |
| SlotsTotal 23 | 5th level total |
| SlotsTotal 24 | 6th level total |
| SlotsTotal 25 | 7th level total |
| SlotsTotal 26 | 8th level total |
| SlotsTotal 27 | 9th level total |

Fill from `character.spellSlots`.

### Cantrips
Fields `Spells 1014` through `Spells 1023` (10 cantrip slots). Fill from `character.cantripsKnown`.

### Spell Names (Levels 1-9)
The spell name fields follow the pattern `Spells 10XX` where XX varies by level. There are ~12 slots per spell level across levels 1-9.

Fill these with:
- For prepared casters (Cleric, Paladin): list ALL known/available spells with the prepared checkbox checked for currently prepared ones + domain/oath spells
- For learned casters (Wizard spellbook, EK, AT): list spells known with prepared checkbox for currently prepared

The prepared checkboxes follow the pattern `Check Box 3XXX`. Map each spell line's checkbox to the corresponding spell name field.

**IMPORTANT: Field name discovery.** The exact mapping of spell fields to spell levels needs to be verified by inspecting which fields correspond to which section on page 3. Run a test fill putting numbered values in each field to visually verify the mapping. The pattern appears to be:
- Cantrips: Spells 1014-1023
- Level 1: Spells 1024-1035 (approx)
- Level 2: Spells 1036-1047
- etc.

But this MUST be verified empirically. Write a test function that fills every spell field with its field name so you can visually see which field is where on the PDF.

---

## Field Mapping — Page 4 (Companions)

Skip for v1. Leave blank unless the character has companion/pet data (which our data model doesn't currently support).

---

## Proficiency Checkbox Discovery

The PDF has ~110 checkboxes. Many correspond to skill proficiencies and saving throw proficiencies. The field names follow the pattern `Check Box XXX` which doesn't tell us which skill/save they belong to.

**Discovery approach:** Write a test function that checks EVERY checkbox in the PDF, generates the output, and visually inspect which dots are filled. Then map each checkbox field name to its skill/save. Store the mapping as a constant:

```javascript
const CHECKBOX_MAP = {
  'Check Box 314': 'str_save_prof',
  'Check Box 315': 'athletics_prof',
  // etc.
};
```

This is a one-time discovery task. Once mapped, it's permanent.

---

## Spell Detail Integration

For the printed sheet, spell names alone aren't enough — the player needs quick reference during play. Where space allows in the spell name fields, append a brief stat summary:

Example entries:
- "Healing Word — 1d4+6 HP, BA, 60ft"
- "Guiding Bolt — 4d6 rad, +5 atk, 120ft"  
- "Bless — 3 targets, +1d4, Conc"
- "Shield — R: +5 AC til next turn"

Keep it short — these are text fields with limited width. Abbreviate: BA=bonus action, R=reaction, Conc=concentration, rad=radiant, atk=attack. Calculate all numbers from character stats.

For cantrips with scaling damage, show the current-level damage: "Sacred Flame — 1d8 rad, DEX DC 14"

---

## Class-Specific Fills

### Cleric
- Spellcasting: fill spell page with Cleric spells
- Features: include Disciple of Life, Channel Divinity options, domain features
- Class resources: "Channel Divinity: 1/rest"
- Domain spells marked as prepared (always)
- Healing spells show Disciple of Life bonus in the stat summary

### Fighter
- No spell page fill for Champion/Battle Master
- Eldritch Knight: fill spell page with known spells
- Features: Fighting Style, Extra Attack count, Action Surge, Second Wind
- Class resources: "Action Surge: 1/SR", "Second Wind: 1/SR (1d10+[level])"
- Battle Master: "Superiority Dice: 4d8/SR" + maneuver list in Features
- Champion: note "Crit Range: 19-20" in Features

### Paladin (when built)
- Fill spell page with prepared spells + oath spells
- Features: Divine Smite reference, Lay on Hands pool, Aura descriptions
- Class resources: "Lay on Hands: [pool] HP", "Channel Divinity: 1/SR", "Divine Sense: [uses]/LR"

### Wizard (when built)
- Fill spell page — spellbook contents with prepared marked
- Features: Arcane Recovery, school features
- Class resources: "Arcane Recovery: 1/LR ([budget] levels)"

### Other classes
- Fill based on whatever class-specific data exists in the character object
- Non-casters skip page 3 entirely

---

## Export Button Integration

Replace the current "Export PDF" button behavior on the dashboard. Keep the button in the same location.

1. On tap: show a brief "Generating PDF..." indicator
2. Load the embedded template
3. Fill all mapped fields using the character data
4. Generate the PDF bytes
5. Create a blob URL and trigger download
6. Filename: `[character-name]-level-[X].pdf` (sanitized, lowercase, hyphens)

Example: `thorin-iron-shield-level-4.pdf`

---

## Embedding the Template

The fillable PDF template must be embedded in the HTML file as a base64 string so the app works without loading external files:

```javascript
const PDF_TEMPLATE_B64 = "JVBERi0xLj..."; // Full base64 of the template
```

The template is ~200-300KB as a PDF, which becomes ~270-400KB as base64. Combined with the existing ~230KB HTML file, the total will be ~500-630KB. This is acceptable for a single-file app.

---

## Testing Plan

1. **Field discovery test:** Fill every field with its own name → generate PDF → visually verify mapping
2. **Checkbox discovery test:** Check every checkbox → generate PDF → map to skills/saves
3. **Spell field discovery:** Fill spell name fields with level numbers → verify which fields go to which spell level section
4. **Thorin test:** Fill with Thorin's level 4 data → verify all values are correct and readable
5. **Fighter test:** Fill with a sample Fighter → verify non-caster fields work, spell page is skipped
6. **Readability check:** Ensure text fits within field boundaries — truncate if needed, don't overflow

---

## What NOT to Build

- Custom PDF generation (no jsPDF, no building a PDF from scratch)
- Page 4 companion filling
- Personality/backstory fields beyond what we currently store (leave blank for player to handwrite)
- Multiple template support (just this one template for now)
