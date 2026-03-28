# SPEC Amendment — Paladin & Wizard Corrections

## 1. Empowered Evocation Wording (SPEC_WIZARD.md, School of Evocation)

The spec says "Add INT modifier to damage of any wizard evocation spell." This is too broad.

**Correct PHB wording:** Add INT modifier to ONE damage roll of any wizard evocation spell. For an AoE like Fireball hitting 5 creatures, you add INT mod once to the damage total that all targets take — not separately per target. The distinction matters for spells like Magic Missile which have multiple separate damage rolls.

Update the spell card integration: "+[INT] Empowered Evocation" is added once to the total, not per target or per die.

## 2. Paladin-Only Spells Need New Data Entries (SPEC_PALADIN.md)

The spec lists Paladin spells and notes shared spells with Cleric, but doesn't explicitly call out which Paladin-unique spells need brand new structured data entries. These Paladin-only spells have NO existing data in the app and must be created from scratch:

**1st Level:** Compelled Duel, Divine Favor, Heroism, Searing Smite, Thunderous Smite, Wrathful Smite
**2nd Level:** Branding Smite, Find Steed
**3rd Level:** Aura of Vitality, Blinding Smite, Crusader's Mantle, Elemental Weapon
**4th Level:** Aura of Life, Aura of Purity, Staggering Smite
**5th Level:** Banishing Smite, Circle of Power, Destructive Wave

**Oath-granted spells also needing new data:**
- Oath of Devotion: Sanctuary (may exist from Cleric data — verify)
- Oath of Ancients: Ensnaring Strike, Speak with Animals, Moonbeam, Plant Growth, Tree Stride, Commune with Nature
- Oath of Vengeance: Hunter's Mark, Hold Monster

Each needs full structured data: name, level, school, castingTime, range, components, duration, description, and where applicable: damage, healing, save, attack, concentration tag, upcast.

## 3. Wizard Spellbook Onboarding for Higher Levels (SPEC_WIZARD.md)

The spec says for higher-level characters entering through onboarding: "let the player pick their total spellbook contents from all available levels in one batch." This needs a specific count.

**Correct count:** A wizard's spellbook at level N contains 6 + (2 × (N - 1)) spells total.
- Level 1: 6 spells
- Level 4: 12 spells
- Level 5: 14 spells
- Level 10: 24 spells
- Level 20: 44 spells

During onboarding, show: "Your spellbook should contain [count] spells. Select from the available wizard spells." Enforce the count strictly. Spells must be of a level for which the character would have spell slots — don't allow 5th-level picks for a level 4 wizard.
