# SPEC AMENDMENT — Tier 1 Corrections

Apply these corrections when building from the Tier 1 specs.

---

## 1. Unarmored Defense + Shield (SPEC_THEME_SYSTEM.md, Section 0e)

The original spec says both Barbarian and Monk can use a shield with Unarmored Defense. This is wrong for Monk.

**Correct rule:**
- **Barbarian:** CAN use a shield with Unarmored Defense. AC = 10 + DEX mod + CON mod + shield bonus.
- **Monk:** CANNOT use a shield. A shield disables BOTH Unarmored Defense AND Unarmored Movement. If a Monk equips a shield, fall back to AC = 10 + DEX mod + shield bonus (no WIS mod).

The `calculateAC()` function must check: if class is Monk and a shield is equipped, do NOT use the Monk Unarmored Defense formula.

---

## 2. Leomund's Tiny Hut School (SPEC_FIGHTER.md)

Move "Leomund's Tiny Hut" from "3rd Level — Other Schools" to "3rd Level — Evocation." It is Evocation in the PHB.

---

## 3. Absorb Elements Not PHB (SPEC_FIGHTER.md)

Remove "Absorb Elements" from "1st Level — Other Schools" in the Wizard spell list. It is from Xanathar's Guide to Everything, not the PHB. All spell data in this project is PHB only.
