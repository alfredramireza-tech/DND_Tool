# SPEC: File Split — T4 Architect

**Goal:** Split the monolithic `index.html` (10,990 lines) into modular files so PM can load and reason about individual modules, and so future class implementations don't push the file past the point of no return.

**Why now:** PM can no longer reliably load the full file in a single context window. At 10,990 lines the split is a half-day task. At 20,000+ it becomes multi-session. Every new class adds ~1,500-2,000 lines. We have 5 classes left to build.

**Approach:** Extract CSS, data, and JS into separate files. Keep `index.html` as the shell (HTML markup + `<script>`/`<link>` tags). All code stays in global scope — no module bundler, no build step, no ES modules. This is a pure extraction refactor: the app must behave identically before and after.

---

## File Plan

Extract in this order. Each file is one commit so you can revert cleanly.

### Phase 1: CSS Extraction
| New file | Source lines | Contents |
|----------|-------------|----------|
| `styles.css` | 7–1,036 | Everything inside `<style>...</style>`. Remove the `<style>` block from index.html and add `<link rel="stylesheet" href="styles.css">` in `<head>`. |

### Phase 2: Data Files (no dependencies on functions)
| New file | Source lines (approx) | Contents |
|----------|----------------------|----------|
| `data/classes.js` | 1,372–1,550 | `AASIMAR_SUBRACES`, `CLASS_DATA`, `COLOR_THEMES` |
| `data/spells.js` | 1,552–2,903 | `CANTRIP_DATA`, `SPELL_DB`, spell enhancements, `CLERIC_CANTRIPS`, `CLERIC_SPELLS`, `getSpell()`, `LIFE_DOMAIN_SPELLS`, `CLERIC_SPELL_SLOTS` |
| `data/fighter.js` | 3,193–3,515 | `FIGHTING_STYLES`, `MANEUVERS`, `EK_SPELL_SLOTS`, EK cantrip/spell constants, `WIZARD_CANTRIPS`, `WIZARD_SPELL_DB`, `FIGHTER_FEATURE_DESCRIPTIONS`, `FIGHTER_PROGRESSION`, `FIGHTER_SUBCLASS_FEATURES`, Battle Master functions, fighter feature builders |
| `data/progression.js` | 2,885–3,192 | `SKILLS`, `SAMPLE_CHARACTER`, `BLANK_DEFAULTS`, level-up constants (`CHAR_LEVEL_TO_SPELL_LEVEL`, `ASI_LEVELS`, `CANTRIP_GAIN_LEVELS`, etc.), `FEATURE_DESCRIPTIONS`, `CLERIC_PROGRESSION` |

### Phase 3: Functional Modules
| New file | Source lines (approx) | Contents |
|----------|----------------------|----------|
| `js/utils.js` | 3,519–3,976 | `mod()`, `modStr()`, `esc()`, migration helpers, `calcBaseMaxHp()`, `getEffectiveMaxHp()`, AC calculation, theme functions (`applyTheme`, color utilities, theme editor), `simpleHash`, multi-character storage helpers (`loadAllChars`, `saveAllChars`, `saveChar`, `deleteChar`), cloud-related storage |
| `js/onboarding.js` | 3,976–4,663 | `init()`, `buildProgressBar()`, `buildAbilityGrid()`, `buildSkillChecks()`, `buildCantripList()`, form population, validation, step navigation, ability score modes, `showOnboarding()`, `showStep()`, `nextStep()`, `prevStep()` |
| `js/dashboard.js` | 5,119–5,780 | `renderDashboard()`, `renderFighterDashboard()`, fighting style display, Second Wind mechanics |
| `js/levelup.js` | 5,781–7,131 | `startLevelUp()`, `renderLuScreen()`, all level-up step renderers, level-up summary, confirmation & save |
| `js/session.js` | 7,132–7,335 | Event logging, session journal, roll history, dice tumble animation |
| `js/combat.js` | 7,336–8,724 | Cantrip display, inspiration, quick actions, resource strip, badge popovers, death saves, initiative, concentration, conditions, buff management, combat mode toggle, tooltips, quick rules, spell casting prompt, spell rolls, party view |
| `js/rolls.js` | 8,725–9,051 | Core roll functions, roll display, weapon rolling, ability checks, skill rolls, general dice rolling |
| `js/equipment.js` | 9,052–9,439 | Weapon management, selection cards, spell display/cards, dice roller panel |
| `js/pdf-export.js` | 9,439–9,955 | PDF form field mapping, `exportPDF()` |
| `js/home.js` | 9,955–10,187 | `renderHomeScreen()`, character loading, password protection, deletion, sample character |
| `js/resources.js` | 10,187–10,627 | Max HP boost, HP tracking, spell slot management, channel divinity, resource tracker, rest/recovery, currency, equipment form, quick items, weapon form, bulk editing, notes |
| `js/cloud-sync.js` | 10,759–10,964 | GitHub API helpers, `saveToCloud()`, `loadFromCloud()`, `downloadCloudChar()`, `deleteFromCloud()` |

### Phase 4: Remaining index.html
After extraction, `index.html` should contain only:
1. `<!DOCTYPE html>`, `<head>` with meta tags, `<link>` to `styles.css`
2. `<body>` with HTML markup (the home screen, onboarding wizard, dashboard templates, PDF container) — approx lines 1,037–1,352
3. `<script src="...">` tags in correct load order (see below)
4. The embedded pdf-lib library (keep inline — it's minified vendor code, ~20 lines)
5. The `DOMContentLoaded` boot listener

---

## Load Order

This is critical. Data first, then utilities, then features:

```html
<!-- CSS -->
<link rel="stylesheet" href="styles.css">

<!-- Data (no function dependencies) -->
<script src="data/classes.js"></script>
<script src="data/spells.js"></script>
<script src="data/progression.js"></script>
<script src="data/fighter.js"></script>

<!-- Core utilities (depend on data) -->
<script src="js/utils.js"></script>

<!-- Feature modules (depend on data + utils) -->
<script src="js/onboarding.js"></script>
<script src="js/dashboard.js"></script>
<script src="js/levelup.js"></script>
<script src="js/session.js"></script>
<script src="js/combat.js"></script>
<script src="js/rolls.js"></script>
<script src="js/equipment.js"></script>
<script src="js/pdf-export.js"></script>
<script src="js/home.js"></script>
<script src="js/resources.js"></script>
<script src="js/cloud-sync.js"></script>

<!-- Vendor (embedded) -->
<script>/* pdf-lib minified — keep inline */</script>

<!-- Boot -->
<script>document.addEventListener('DOMContentLoaded', init);</script>
```

---

## Guardrails

1. **Pure extraction.** Do not rename functions, change signatures, reorder logic, or "improve" anything. Copy-paste, then delete the original block. The app must be byte-for-byte identical in behavior.
2. **No build tools.** No webpack, no Vite, no npm, no ES modules. Plain `<script>` tags.
3. **No new features.** If you spot a bug or improvement opportunity, note it in the completion report — do not fix it.
4. **One file per commit.** Extract one file, test that the app still loads, commit. This makes rollback trivial.
5. **Global scope.** All functions and data objects remain global (`var` or bare `function`). Do not wrap anything in IIFEs, classes, or modules.
6. **Line numbers are approximate.** The line ranges above are from a scan of the current file. Fact-check each boundary by searching for the actual function/object names before cutting. Section comments in the source (if any) are your best guide.
7. **Storage keys unchanged.** `STORAGE_KEY`, `GITHUB_*` constants, and localStorage key strings must not change.
8. **Keep the embedded pdf-lib inline** in index.html. It's vendor code and benefits from being self-contained for offline use.

---

## Acceptance Criteria

- [ ] `index.html` is under 1,500 lines (HTML markup + script tags + pdf-lib + boot)
- [ ] App loads and renders the home screen with existing saved characters
- [ ] Can create a new character through full onboarding wizard
- [ ] Can open an existing character dashboard — all sections render
- [ ] Combat mode, concentration, buffs, conditions, death saves all functional
- [ ] Level-up flow works (test with a Cleric or Fighter)
- [ ] Dice rolls work (attack, save, skill, general)
- [ ] Cloud sync (save/load) works
- [ ] PDF export works
- [ ] Theme switching works
- [ ] No console errors on any of the above
- [ ] Each extracted file has a brief header comment: `// filename.js — one-line description`

---

## Effort Level

**Standard.** This is mechanical extraction — lots of copy-paste, lots of verification, but no design decisions. The hardest part is getting the cut points right and verifying load order. Expect ~16 files created, ~16 commits.

---

## What CC Should Do

1. Read this spec.
2. Fact-check the line ranges against the actual file — the numbers above are approximate.
3. Create the `data/` and `js/` directories.
4. Extract one file at a time, in the order listed above (CSS first, then data, then JS modules).
5. After each extraction, verify the remaining index.html + new file would still work (check for any references that cross the boundary you just cut).
6. Commit after each file extraction.
7. After all extractions, do a final check against the acceptance criteria.
8. Post a completion report listing all files created, final line count of index.html, and any surprises.
