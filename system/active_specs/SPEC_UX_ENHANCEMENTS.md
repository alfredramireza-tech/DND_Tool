# SPEC: UX Enhancements — Combat, Quality of Life & Party Features

## Overview

Ten features that transform the dashboard from a character sheet into a full combat companion. Build in order — each section is independent but they reference shared patterns.

---

## 1. Combat Mode Toggle

A button at the top of the dashboard that strips the view down to combat essentials only. The player's turn at the table is ~30 seconds — they shouldn't be scrolling past inventory and notes to find spell slots.

**Toggle button:** Persistent at the top of the dashboard, next to the character name/level. Label: "Combat Mode" with a sword/shield icon or similar. Tap to activate, tap again to deactivate. Store state in localStorage so it persists between refreshes.

**When Combat Mode is ON, show only:**
- HP Tracker (with temp HP)
- Active conditions (see feature #6)
- Concentration tracker (see feature #5)
- Death Saves (if HP = 0, see feature #3)
- Dice & Rolls section
- Spell Slots (interactive)
- Channel Divinity / Rage / Ki / Action Surge — whatever class resources apply
- Weapons with attack/damage rollers
- Cantrips and prepared spell cards (with Roll buttons)
- Cunning Action / Reckless Attack — class-specific combat options

**When Combat Mode is ON, hide:**
- Ability scores grid
- Full skills list
- Equipment / Inventory
- Currency
- Notes
- Features & Traits (full list)
- Theme button
- Edit Character / Level Up buttons

**Visual indicator:** When Combat Mode is active, show a subtle persistent banner or border color shift so the player always knows they're in combat view. Maybe the accent color intensifies slightly or a thin colored bar appears at the very top.

**All classes:** The combat mode section list should be class-aware, using the same class-based section ordering from SPEC_THEME_SYSTEM.md but filtered to combat-relevant sections only.

---

## 2. Spell Slot Spending from Spell Cards

Currently casting a spell requires two separate actions: check the spell card for details, then manually mark a spell slot as spent. Integrate these into one flow.

**When the player taps a Roll button on a leveled spell card (not cantrips):**

1. Before rolling, show a quick prompt: "Cast at what level?" 
2. Display available slot levels as tappable buttons. Each button shows: "[level] — [available]/[total] slots". Gray out levels with no remaining slots.
3. The minimum level shown is the spell's base level. Higher levels shown for upcasting.
4. Player taps a level → that slot is marked as spent → roll executes with the appropriate dice for that cast level (including upcast bonuses) → result displays.
5. If only one valid slot level exists (e.g., a 1st-level spell when only 1st-level slots remain), still show the prompt but pre-highlight the only option for quick one-tap casting.

**Cancel option:** "Cancel" button on the prompt to back out without casting or spending a slot.

**Cantrips:** Skip the prompt entirely — cantrips don't use slots. Roll immediately on tap.

**Domain spells / always prepared:** Same flow — they still cost spell slots to cast.

**Integration with Disciple of Life:** When a healing spell is cast at a higher level, the Disciple of Life bonus should recalculate: 2 + [cast level], not 2 + [spell's base level].

---

## 3. Death Save Tracker

When current HP reaches 0, the dashboard should surface a Death Saves section prominently — either replacing the HP area or appearing directly below it.

**Display:** Three success boxes and three failure boxes. Tap a box to mark it. Tap again to unmark (in case of mistakes).

**Roll button:** "Roll Death Save" button that rolls a d20 with no modifier.
- 10 or higher: mark one success
- 9 or lower: mark one failure
- **Natural 20:** Player regains 1 HP and is conscious. Auto-mark, show celebration animation, and update HP to 1. Clear death saves.
- **Natural 1:** Counts as TWO failures. Auto-mark two failure boxes.

**Resolution:**
- Three successes: player is stabilized. Show "Stabilized" message. Clear death save marks. HP stays at 0 (conscious but at 0 until healed).
- Three failures: show "Dead" message. Keep the state displayed.

**Rules reminder** displayed near the tracker:
- "Taking damage while at 0 HP = 1 death save failure"
- "A critical hit while at 0 HP = 2 failures"
- "Being healed clears all death saves"

**Integration:** When the player uses the Heal button and HP goes above 0, automatically clear all death save marks and hide the Death Save section.

**Data model:**
```
deathSaves: { successes: 0, failures: 0 }
```
Persist in localStorage. Clear on heal or long rest.

---

## 4. Initiative Roller

A quick-access initiative roll available from the dashboard header area — always visible, no scrolling needed.

**Display:** A small "Roll Initiative" button or d20 icon in the dashboard header, near the character name/level. Tap to roll.

**Roll:** d20 + DEX modifier. Show result prominently.

**Class-specific modifiers:**
- Barbarian (level 7+ Feral Instinct): Roll with advantage — roll 2d20, take the higher. Show both rolls.
- Champion Fighter (level 7+ Remarkable Athlete): Add half proficiency bonus (round up) to the roll if not already proficient in initiative (which no one is — initiative is a DEX check, not a save/skill).

**Result display:** Large number with breakdown: "d20: [14] + 2 (DEX) = 16" — displayed prominently so the player can call it out to the DM immediately.

**The result should persist** in a small display next to the button showing "Initiative: 16" until the next roll or until cleared. This way the player can reference it if the DM asks again later in the round.

---

## 5. Concentration Tracker

Many powerful spells require concentration. Players constantly forget they're concentrating, drop concentration accidentally, or forget the save DC when they take damage.

**Active concentration display:** When a concentration spell is active, show a persistent banner at the top of the dashboard (below the header, above HP):
```
⟡ Concentrating: Bless
  CON save to maintain if you take damage (DC = max of 10 or half damage taken)
```

**Activating concentration:** When the player casts a concentration spell through the spell card flow (feature #2), automatically activate the concentration tracker with that spell's name. If another concentration spell is already active, prompt: "You're already concentrating on [spell]. Casting this will end [spell]. Continue?"

**Manual activation:** A "Set Concentration" button that lets the player type or pick a spell name. For spells cast outside the app's roll flow (e.g., the DM asks you to cast something narratively).

**Taking damage while concentrating:** When the player uses "Take Damage" on the HP tracker while concentration is active, automatically show: "CON save DC [calculated DC] to maintain [spell name]" where DC = max(10, floor(damage/2)). Include a "Roll CON Save" button right there that rolls d20 + CON save bonus.

**Ending concentration:** 
- "Drop Concentration" button on the banner — tap to end voluntarily
- Auto-clears on long rest
- Auto-clears if a new concentration spell is activated
- Auto-clears if CON save fails (player taps "Failed" after rolling)

**Data model:**
```
concentration: { active: true, spellName: "Bless" }
```
Persist in localStorage.

**Tagging concentration spells:** Spells with "Concentration" in their duration field are automatically tagged. The spell card should show a visible "C" badge or "Concentration" tag so the player knows before casting.

---

## 6. Conditions Reference & Active Condition Tracking

A dual-purpose feature: quick reference for what each condition does, AND active tracking of conditions currently affecting the character.

**Conditions panel:** Accessible from a "Conditions" button on the dashboard (near HP tracker or in Combat Mode). Opens a panel/modal showing all 14 D&D conditions:

| Condition | Summary |
|-----------|---------|
| Blinded | Can't see. Auto-fail sight checks. Attacks have disadvantage. Attacks against you have advantage. |
| Charmed | Can't attack the charmer. Charmer has advantage on social checks against you. |
| Deafened | Can't hear. Auto-fail hearing checks. |
| Frightened | Disadvantage on ability checks and attacks while source is in line of sight. Can't willingly move closer to the source. |
| Grappled | Speed becomes 0. Ends if grappler is incapacitated or you're moved out of reach. |
| Incapacitated | Can't take actions or reactions. |
| Invisible | Impossible to see without magic/special sense. Advantage on attacks. Attacks against you have disadvantage. |
| Paralyzed | Incapacitated. Can't move or speak. Auto-fail STR and DEX saves. Attacks have advantage. Hits within 5ft are auto-crits. |
| Petrified | Turned to stone. Incapacitated. Unaware of surroundings. Weight ×10. Auto-fail STR and DEX saves. Resistance to all damage. Immune to poison and disease. |
| Poisoned | Disadvantage on attack rolls and ability checks. |
| Prone | Disadvantage on attacks. Melee attacks within 5ft have advantage against you. Ranged attacks beyond 5ft have disadvantage against you. Stand up costs half movement. |
| Restrained | Speed 0. Attacks have disadvantage. Attacks against you have advantage. Disadvantage on DEX saves. |
| Stunned | Incapacitated. Can't move. Speak only falteringly. Auto-fail STR and DEX saves. Attacks against you have advantage. |
| Unconscious | Incapacitated. Can't move or speak. Unaware. Drop what you're holding. Fall prone. Auto-fail STR/DEX saves. Attacks have advantage. Hits within 5ft are auto-crits. |

**Toggle conditions on/off:** Each condition has a toggle. When active, it appears as a status badge near the HP display on the dashboard. Active conditions are always visible — even in Combat Mode.

**Active condition reminders:** When a condition is active that affects attack rolls (Frightened, Poisoned, Prone, Restrained, Blinded), show a reminder near the weapon/spell roll buttons: "Disadvantage — [condition name]"

**Data model:**
```
activeConditions: ["poisoned", "prone"]
```
Persist in localStorage. Clear relevant conditions on long rest (DM discretion — the app doesn't auto-clear conditions since their duration varies).

---

## 7. Long Press Quick Info

Long-pressing (touch-hold ~500ms) on any interactive element shows a contextual tooltip explaining what it is and how it's used. Aimed at newer players.

**Ability scores:** Long-press STR → "Strength — Athletics, melee attack/damage with most weapons, carrying capacity, breaking objects, grappling."

**All six abilities:**
- STR: "Athletics, melee attacks, carrying capacity, grappling, breaking objects"
- DEX: "Acrobatics, Stealth, Sleight of Hand, initiative, AC, ranged attacks, finesse weapons, DEX saves (dodge effects)"
- CON: "Hit points, CON saves (concentration, poison, endurance). No skills use CON."
- INT: "Arcana, History, Investigation, Nature, Religion. Wizard/AT spellcasting."
- WIS: "Insight, Medicine, Perception, Survival, Animal Handling. Cleric/Monk spellcasting. Common save target."
- CHA: "Deception, Intimidation, Performance, Persuasion. Paladin/Bard/Sorcerer/Warlock spellcasting."

**Skills:** Long-press any skill → brief description of when it's used. Example: "Perception — Spot hidden creatures, notice traps, hear approaching enemies. The most-rolled skill in the game."

**Saving throws:** Long-press → "DEX Save — Dodge fireballs, lightning bolts, traps. Evasion feature makes this even better."

**Spell slots:** Long-press → "1st Level Slots — Used to cast 1st-level spells or higher-level spells at minimum power. You get these back on a long rest."

**Implementation:** Use a custom touch-hold handler (touchstart → setTimeout 500ms → show tooltip, touchend/touchmove → clear timeout). Display as a floating card near the touched element. Dismiss on any tap. Keep tooltips brief — 1-2 sentences max.

**Accessibility:** Also show tooltips on hover for desktop/laptop users.

---

## 8. Session Log

An auto-generated running log of significant actions the player takes during a session. Creates a play-by-play that's fun to read afterward and helps the party recap next session.

**Auto-logged events:**
- Level up: "Leveled to 4 — WIS 16→18, gained Toll the Dead cantrip"
- HP changes: "Took 14 damage — HP 31→17" / "Healed 9 HP — HP 17→26"
- Death saves: "Death save: success (2/3)" / "Death save: NAT 20! Regained 1 HP"
- Spell cast (via the spell card flow): "Cast Bless at 1st level (3 slots remaining)"
- Concentration: "Began concentrating on Bless" / "Lost concentration on Bless"
- Rage/Ki/Action Surge used: "Used Rage (2 remaining)" / "Spent 1 Ki on Stunning Strike"
- Rest: "Short Rest — Channel Divinity restored" / "Long Rest — all resources restored, HP full"
- Conditions: "Condition added: Poisoned" / "Condition removed: Poisoned"
- Dice rolls (optional — could get noisy): "Guiding Bolt attack: 19 to hit. Damage: 4d6 = 15 radiant"

**Display:** A collapsible "Session Log" section at the bottom of the dashboard (above Notes). Shows entries in reverse chronological order (newest first). Each entry has a timestamp (time only, not date — "2:34 PM").

**Controls:**
- "Clear Log" button to start fresh for a new session
- Log persists in localStorage between refreshes during the same session
- Consider a "New Session" button that archives the current log into a session history and starts fresh

**Data model:**
```
sessionLog: [
  { time: "2:34 PM", text: "Took 14 damage — HP 31→17" },
  { time: "2:33 PM", text: "Cast Guiding Bolt at 1st level" }
]
```

**Integration:** Every function that modifies character state (takeDamage, heal, cast spell, use resource, toggle condition, rest) should call a shared `logEvent(text)` function that prepends to the log.

---

## 9. Common Rules Reference Cards

A collapsible "Rules" section accessible from the dashboard with the most frequently looked-up rules at the table. Every table wastes 5 minutes per session looking these up.

**Section:** Collapsible, labeled "Quick Rules Reference." Place below the main content, above Notes.

**Cards (each individually expandable):**

**Actions in Combat:**
- Attack: Make one melee or ranged attack (or more with Extra Attack)
- Cast a Spell: Cast a spell with a casting time of 1 action
- Dash: Double your movement speed for the turn
- Disengage: Your movement doesn't provoke opportunity attacks
- Dodge: Attacks against you have disadvantage. Advantage on DEX saves.
- Help: Give an ally advantage on their next ability check or attack roll
- Hide: Make a Stealth check to become hidden
- Ready: Set a trigger and a reaction to take when the trigger occurs
- Search: Make a Perception or Investigation check
- Use an Object: Interact with a second object (first interaction is free)

**Bonus Actions:**
- You get one per turn — it's NOT a second action
- Only specific features/spells grant bonus actions
- Common bonus actions: offhand attack (two-weapon fighting), Cunning Action (Rogue), Martial Arts unarmed strike (Monk), Spiritual Weapon attack, Healing Word

**Reactions:**
- One per round (not per turn — resets at start of your turn)
- Common reactions: opportunity attack, Shield spell, Uncanny Dodge, Counterspell, Absorb Elements

**Cover:**
- Half cover: +2 AC and DEX saves (low wall, furniture, another creature)
- Three-quarters cover: +5 AC and DEX saves (portcullis, arrow slit, thick tree)
- Full cover: Can't be targeted directly

**Falling Damage:**
- 1d6 bludgeoning per 10 feet fallen
- Maximum 20d6 (200 feet)

**Grappling:**
- Action: Athletics check vs target's Athletics or Acrobatics (their choice)
- Target must be no more than one size larger
- Success: target's speed becomes 0
- Escape: target uses action, Athletics or Acrobatics vs your Athletics

**Shoving:**
- Action: Athletics check vs target's Athletics or Acrobatics
- Target must be no more than one size larger
- Success: knock prone OR push 5 feet away

**Two-Weapon Fighting:**
- Must be holding a light weapon in each hand
- When you take Attack action with one, bonus action attack with the other
- Don't add ability modifier to bonus attack damage (unless you have Two-Weapon Fighting style)

**Opportunity Attacks:**
- Reaction when a hostile creature you can see moves out of your reach
- One melee attack
- Disengage action prevents opportunity attacks

**Difficult Terrain:**
- Every foot costs 2 feet of movement
- Examples: rubble, mud, heavy undergrowth, stairs, snow, shallow water

---

## 10. Party View

A read-only view showing all characters saved to the cloud. Useful for DMs or party awareness.

**Access:** A "Party View" button on the home screen (not inside any character's dashboard).

**Display:** Loads all character JSON files from the GitHub `characters/` directory. For each character shows:
- Name, Race, Class, Level
- Current HP / Max HP (color coded: green above 50%, yellow 25-50%, red below 25%)
- AC
- Active conditions (if any)
- Status: "Raging" / "Concentrating on [spell]" / normal

**Layout:** Compact cards in a grid or list. No expandable details — this is a quick status overview.

**Privacy:** Party View shows only the summary fields listed above — it does NOT show ability scores, spell lists, inventory, notes, or any other character details. Per-character passwords (from Phase 4) do NOT apply to Party View — the summary info is always visible. If a player wants full privacy, they should not save to cloud.

**Read-only:** No editing from Party View. Tap a character card to see a slightly expanded summary (add spell slots remaining, resources remaining) but still no editing.

**Auto-refresh:** On opening Party View, always fetch fresh data from GitHub. Add a "Refresh" button for manual re-fetch during the session.

**Note:** This feature depends on the GitHub cloud sync being functional and all party members saving their characters to the same repo. If no cloud connection is configured, show: "Connect to GitHub to see your party."

---

## Build Notes

- Features 1-9 can be built independently on the current codebase.
- Feature 10 (Party View) depends on GitHub cloud sync working for multiple users.
- Feature 2 (spell slot spending) modifies the spell card roll flow — test thoroughly with Disciple of Life, upcast scaling, and Supreme Healing interactions.
- Feature 5 (concentration) and Feature 2 (spell casting flow) should integrate: casting a concentration spell through the flow auto-activates the concentration tracker.
- Feature 8 (session log) should hook into Features 1-7 — any state change from any feature should log.
- All features must work on iPad Safari with touch interactions. Long-press (Feature 7) needs touch-hold detection.
