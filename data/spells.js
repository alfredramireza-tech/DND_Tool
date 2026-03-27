// spells.js — Cantrip and spell databases, spell slot tables
// ============================================================
// Thorin Cleric Spell Database — PHB Cleric Spells (All Levels)
// ============================================================

const CANTRIP_DATA = [
  {
    name: "Guidance",
    level: 0,
    school: "Divination",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Concentration, up to 1 minute",
    description: "Target gains 1d4 to add to one ability check of its choice before the spell ends.",
    tags: ["buff", "concentration"]
  },
  {
    name: "Light",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, M (a firefly or phosphorescent moss)",
    duration: "1 hour",
    description: "Object you touch sheds bright light in a 20-foot radius and dim light for an additional 20 feet.",
    tags: ["utility"]
  },
  {
    name: "Mending",
    level: 0,
    school: "Transmutation",
    castingTime: "1 minute",
    range: "Touch",
    components: "V, S, M (two lodestones)",
    duration: "Instantaneous",
    description: "Repairs a single break or tear in an object you touch, such as a broken chain link or a torn cloak.",
    tags: ["utility"]
  },
  {
    name: "Resistance",
    level: 0,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (a miniature cloak)",
    duration: "Concentration, up to 1 minute",
    description: "Target can add 1d4 to one saving throw of its choice before the spell ends. The spell then ends.",
    tags: ["buff", "concentration"]
  },
  {
    name: "Sacred Flame",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "Flame-like radiance descends on a creature. DEX save or take 1d8 radiant damage. Target gains no benefit from cover.",
    damage: { dice: "1d8", type: "radiant" },
    save: "dex",
    scaling: { 5: "2d8", 11: "3d8", 17: "4d8" },
    tags: ["damage"]
  },
  {
    name: "Spare the Dying",
    level: 0,
    school: "Necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    description: "Touch a living creature at 0 hit points. The creature becomes stable.",
    tags: ["healing", "utility"]
  },
  {
    name: "Thaumaturgy",
    level: 0,
    school: "Transmutation",
    castingTime: "1 action",
    range: "30 feet",
    components: "V",
    duration: "Up to 1 minute",
    description: "Manifest a minor wonder: booming voice, tremors, flickering flames, slam doors open/shut, alter eye appearance. Up to 3 effects active at once.",
    tags: ["utility"]
  },
  {
    name: "Toll the Dead",
    level: 0,
    school: "Necromancy",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "Target makes a WIS save or takes 1d8 necrotic damage. If the target is missing any HP, the damage is 1d12 instead of 1d8.",
    damage: { dice: "1d8", type: "necrotic", altDice: "1d12", altNote: "1d12 if target is missing HP" },
    save: "wis",
    scaling: { 5: "2d8", 11: "3d8", 17: "4d8" },
    altScaling: { 5: "2d12", 11: "3d12", 17: "4d12" },
    tags: ["damage"]
  }
];

const SPELL_DB = [
  // ===================== LEVEL 1 (15 spells) =====================
  {
    name: "Bane",
    level: 1,
    school: "Enchantment",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S, M (a drop of blood)",
    duration: "Concentration, up to 1 minute",
    description: "Up to 3 creatures must make a CHA save. On a failure, they subtract 1d4 from all attack rolls and saving throws for the duration.",
    save: "cha",
    upcast: { perLevel: "+1 target", note: "One additional target per slot level above 1st" },
    tags: ["debuff", "concentration"]
  },
  {
    name: "Bless",
    level: 1,
    school: "Enchantment",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S, M (a sprinkling of holy water)",
    duration: "Concentration, up to 1 minute",
    description: "Up to 3 creatures add 1d4 to all attack rolls and saving throws for the duration.",
    upcast: { perLevel: "+1 target", note: "One additional target per slot level above 1st" },
    tags: ["buff", "concentration"]
  },
  {
    name: "Command",
    level: 1,
    school: "Enchantment",
    castingTime: "1 action",
    range: "60 feet",
    components: "V",
    duration: "1 round",
    description: "Speak a one-word command to a creature. WIS save or it obeys on its next turn. No effect on undead or if the command is directly harmful.",
    save: "wis",
    upcast: { perLevel: "+1 target", note: "One additional target per slot level above 1st" },
    tags: ["debuff"]
  },
  {
    name: "Create or Destroy Water",
    level: 1,
    school: "Transmutation",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S, M (a drop of water or a few grains of sand)",
    duration: "Instantaneous",
    description: "Create up to 10 gallons of clean water in a container, or as rain in a 30-foot cube. Alternatively, destroy up to 10 gallons of water.",
    upcast: { perLevel: "+10 gallons", note: "Create or destroy 10 additional gallons per slot level above 1st" },
    tags: ["utility"]
  },
  {
    name: "Cure Wounds",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    description: "Touch a creature to restore 1d8 + WIS modifier hit points. No effect on undead or constructs.",
    healing: { dice: "1d8", mod: "wis", discipleOfLife: true },
    upcast: { perLevel: "+1d8 healing", note: "Add 1d8 healing per slot level above 1st" },
    tags: ["healing"]
  },
  {
    name: "Detect Evil and Good",
    level: 1,
    school: "Divination",
    castingTime: "1 action",
    range: "Self",
    components: "V, S",
    duration: "Concentration, up to 10 minutes",
    description: "Know if an aberration, celestial, elemental, fey, fiend, or undead is within 30 feet, and its location. Also detects consecrated/desecrated places or objects.",
    tags: ["utility", "concentration"]
  },
  {
    name: "Detect Magic",
    level: 1,
    school: "Divination",
    castingTime: "1 action",
    range: "Self",
    components: "V, S",
    duration: "Concentration, up to 10 minutes",
    description: "Sense the presence of magic within 30 feet. You can use your action to see a faint aura and learn its school of magic.",
    tags: ["utility", "concentration", "ritual"]
  },
  {
    name: "Detect Poison and Disease",
    level: 1,
    school: "Divination",
    castingTime: "1 action",
    range: "Self",
    components: "V, S, M (a yew leaf)",
    duration: "Concentration, up to 10 minutes",
    description: "Sense the presence and location of poisons, poisonous creatures, and diseases within 30 feet. You can identify the kind in each case.",
    tags: ["utility", "concentration", "ritual"]
  },
  {
    name: "Guiding Bolt",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "1 round",
    description: "Ranged spell attack dealing 4d6 radiant damage. On hit, the next attack roll against the target before your next turn has advantage.",
    damage: { dice: "4d6", type: "radiant" },
    attack: true,
    upcast: { perLevel: "+1d6 damage", note: "Add 1d6 radiant damage per slot level above 1st" },
    tags: ["damage"]
  },
  {
    name: "Healing Word",
    level: 1,
    school: "Evocation",
    castingTime: "1 bonus action",
    range: "60 feet",
    components: "V",
    duration: "Instantaneous",
    description: "A creature you can see within range regains 1d4 + WIS modifier hit points. No effect on undead or constructs.",
    healing: { dice: "1d4", mod: "wis", discipleOfLife: true },
    upcast: { perLevel: "+1d4 healing", note: "Add 1d4 healing per slot level above 1st" },
    tags: ["healing", "bonus action"]
  },
  {
    name: "Inflict Wounds",
    level: 1,
    school: "Necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    description: "Melee spell attack dealing 3d10 necrotic damage on a hit.",
    damage: { dice: "3d10", type: "necrotic" },
    attack: true,
    upcast: { perLevel: "+1d10 damage", note: "Add 1d10 necrotic damage per slot level above 1st" },
    tags: ["damage"]
  },
  {
    name: "Protection from Evil and Good",
    level: 1,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (holy water or powdered silver and iron)",
    duration: "Concentration, up to 10 minutes",
    description: "Aberrations, celestials, elementals, fey, fiends, and undead have disadvantage on attack rolls against the target. Target can't be charmed, frightened, or possessed by them.",
    tags: ["buff", "concentration"]
  },
  {
    name: "Purify Food and Drink",
    level: 1,
    school: "Transmutation",
    castingTime: "1 action",
    range: "10 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "All nonmagical food and drink within a 5-foot-radius sphere centered on a point of your choice is rendered free of poison and disease.",
    tags: ["utility", "ritual"]
  },
  {
    name: "Sanctuary",
    level: 1,
    school: "Abjuration",
    castingTime: "1 bonus action",
    range: "30 feet",
    components: "V, S, M (a small silver mirror)",
    duration: "1 minute",
    description: "Any creature that targets the warded creature with an attack or harmful spell must first make a WIS save. On failure, it must choose a new target or lose the attack/spell. Ends if the warded creature attacks or casts a harmful spell.",
    save: "wis",
    tags: ["buff", "bonus action"]
  },
  {
    name: "Shield of Faith",
    level: 1,
    school: "Abjuration",
    castingTime: "1 bonus action",
    range: "60 feet",
    components: "V, S, M (a small parchment with holy text)",
    duration: "Concentration, up to 10 minutes",
    description: "A shimmering field grants the target +2 bonus to AC for the duration.",
    tags: ["buff", "bonus action", "concentration"]
  },

  // ===================== LEVEL 2 (17 spells) =====================
  {
    name: "Aid",
    level: 2,
    school: "Abjuration",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S, M (a tiny strip of white cloth)",
    duration: "8 hours",
    description: "Up to 3 creatures gain 5 extra maximum hit points and 5 current hit points for the duration.",
    upcast: { perLevel: "+5 HP", note: "Additional 5 HP per slot level above 2nd" },
    tags: ["buff"]
  },
  {
    name: "Augury",
    level: 2,
    school: "Divination",
    castingTime: "1 minute",
    range: "Self",
    components: "V, S, M (specially marked sticks, bones, or cards worth at least 25 gp)",
    duration: "Instantaneous",
    description: "Receive an omen about the results of a specific course of action within the next 30 minutes: weal, woe, weal and woe, or nothing.",
    tags: ["utility", "ritual"]
  },
  {
    name: "Blindness/Deafness",
    level: 2,
    school: "Necromancy",
    castingTime: "1 action",
    range: "30 feet",
    components: "V",
    duration: "1 minute",
    description: "Target makes a CON save or becomes blinded or deafened (your choice). Repeat save at end of each turn to end the effect.",
    save: "con",
    upcast: { perLevel: "+1 target", note: "One additional target per slot level above 2nd" },
    tags: ["debuff"]
  },
  {
    name: "Calm Emotions",
    level: 2,
    school: "Enchantment",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Concentration, up to 1 minute",
    description: "Creatures in a 20-foot sphere make a CHA save. On failure, you can suppress charmed/frightened effects or make a hostile creature indifferent.",
    save: "cha",
    tags: ["debuff", "concentration"]
  },
  {
    name: "Continual Flame",
    level: 2,
    school: "Evocation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (ruby dust worth 50 gp, which the spell consumes)",
    duration: "Until dispelled",
    description: "A flame equivalent to a torch springs from an object you touch. It emits no heat, doesn't use oxygen, and can't be extinguished by nonmagical means.",
    tags: ["utility"]
  },
  {
    name: "Enhance Ability",
    level: 2,
    school: "Transmutation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (fur or a feather from a beast)",
    duration: "Concentration, up to 1 hour",
    description: "Grant one creature advantage on ability checks for one chosen ability score. Some options also grant bonus effects (e.g., Bear's Endurance gives 2d6 temp HP).",
    upcast: { perLevel: "+1 target", note: "One additional target per slot level above 2nd" },
    tags: ["buff", "concentration"]
  },
  {
    name: "Find Traps",
    level: 2,
    school: "Divination",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "Sense the presence of any trap within line of sight and range. You learn the general nature of the danger but not exact location.",
    tags: ["utility"]
  },
  {
    name: "Gentle Repose",
    level: 2,
    school: "Necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (a pinch of salt and a copper piece for each eye)",
    duration: "10 days",
    description: "Protect a corpse from decay and from being raised as undead. Extends the time limit for spells like Raise Dead.",
    tags: ["utility", "ritual"]
  },
  {
    name: "Hold Person",
    level: 2,
    school: "Enchantment",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S, M (a small, straight piece of iron)",
    duration: "Concentration, up to 1 minute",
    description: "Target humanoid makes a WIS save or is paralyzed. Repeat save at end of each turn. Attacks within 5 feet of a paralyzed creature are automatic critical hits.",
    save: "wis",
    upcast: { perLevel: "+1 target", note: "One additional target per slot level above 2nd" },
    tags: ["debuff", "concentration"]
  },
  {
    name: "Lesser Restoration",
    level: 2,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    description: "Touch a creature to end one disease or one condition: blinded, deafened, paralyzed, or poisoned.",
    tags: ["healing", "utility"]
  },
  {
    name: "Locate Object",
    level: 2,
    school: "Divination",
    castingTime: "1 action",
    range: "Self",
    components: "V, S, M (a forked twig)",
    duration: "Concentration, up to 10 minutes",
    description: "Sense the direction to a specific object you are familiar with or the nearest object of a particular kind, as long as it is within 1,000 feet.",
    tags: ["utility", "concentration"]
  },
  {
    name: "Prayer of Healing",
    level: 2,
    school: "Evocation",
    castingTime: "10 minutes",
    range: "30 feet",
    components: "V",
    duration: "Instantaneous",
    description: "Up to 6 creatures each regain 2d8 + WIS modifier hit points. NOT usable in combat due to 10-minute casting time.",
    healing: { dice: "2d8", mod: "wis", discipleOfLife: true },
    upcast: { perLevel: "+1d8 healing", note: "Add 1d8 healing per slot level above 2nd" },
    tags: ["healing"]
  },
  {
    name: "Protection from Poison",
    level: 2,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "1 hour",
    description: "Neutralize one known poison in the target. For the duration, target has advantage on saves against being poisoned and resistance to poison damage.",
    tags: ["buff"]
  },
  {
    name: "Silence",
    level: 2,
    school: "Illusion",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Concentration, up to 10 minutes",
    description: "Create a 20-foot-radius sphere of silence. No sound can enter or leave. Creatures inside are immune to thunder damage and deafened. Verbal spell components are impossible.",
    tags: ["debuff", "concentration", "ritual"]
  },
  {
    name: "Spiritual Weapon",
    level: 2,
    school: "Evocation",
    castingTime: "1 bonus action",
    range: "60 feet",
    components: "V, S",
    duration: "1 minute",
    description: "Create a spectral weapon that makes a melee spell attack for 1d8 + WIS modifier force damage. On subsequent turns, use a bonus action to move it 20 feet and attack again.",
    damage: { dice: "1d8", type: "force" },
    attack: true,
    upcast: { perLevel: "+1d8 per two levels", note: "Damage increases by 1d8 for every two slot levels above 2nd (e.g., 2d8 at 4th, 3d8 at 6th)" },
    tags: ["damage", "bonus action"]
  },
  {
    name: "Warding Bond",
    level: 2,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (a pair of platinum rings worth at least 50 gp each, worn by both)",
    duration: "1 hour",
    description: "Target gains +1 AC, +1 to saving throws, and resistance to all damage. However, you take the same amount of damage the target takes each time it is damaged.",
    tags: ["buff"]
  },
  {
    name: "Zone of Truth",
    level: 2,
    school: "Enchantment",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "10 minutes",
    description: "15-foot-radius sphere where creatures must make a CHA save. On failure, they can't deliberately tell a lie. You know whether each creature succeeds or fails.",
    save: "cha",
    tags: ["utility"]
  },

  // ===================== LEVEL 3 (20 spells) =====================
  {
    name: "Animate Dead",
    level: 3,
    school: "Necromancy",
    castingTime: "1 minute",
    range: "10 feet",
    components: "V, S, M (a drop of blood, a piece of flesh, and a pinch of bone dust)",
    duration: "Instantaneous",
    description: "Create a zombie or skeleton from a corpse. It obeys your commands for 24 hours; you must recast to maintain control. Bonus action to command.",
    upcast: { perLevel: "+2 undead", note: "Animate or reassert control over 2 additional undead per slot level above 3rd" },
    tags: ["utility"]
  },
  {
    name: "Beacon of Hope",
    level: 3,
    school: "Abjuration",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S",
    duration: "Concentration, up to 1 minute",
    description: "Chosen creatures gain advantage on WIS saves and death saving throws, and regain the maximum number of HP from any healing for the duration.",
    tags: ["buff", "concentration"]
  },
  {
    name: "Bestow Curse",
    level: 3,
    school: "Necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Concentration, up to 1 minute",
    description: "Touch a creature; WIS save or be cursed. Choose an effect: disadvantage on one ability's checks/saves, disadvantage on attacks against you, waste turn on failed WIS save, or extra 1d8 necrotic on your attacks.",
    save: "wis",
    upcast: { perLevel: "longer duration", note: "5th: 8 hours (no concentration). 7th: 24 hours (no concentration). 9th: until dispelled (no concentration)." },
    tags: ["debuff", "concentration"]
  },
  {
    name: "Clairvoyance",
    level: 3,
    school: "Divination",
    castingTime: "10 minutes",
    range: "1 mile",
    components: "V, S, M (a focus worth at least 100 gp)",
    duration: "Concentration, up to 10 minutes",
    description: "Create an invisible sensor at a location you have seen before or an obvious location within range. You can see or hear (not both) through the sensor. Use an action to switch senses.",
    tags: ["utility", "concentration"]
  },
  {
    name: "Create Food and Water",
    level: 3,
    school: "Conjuration",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "Create 45 pounds of food and 30 gallons of water on the ground or in containers. The food is bland but nourishing and spoils after 24 hours.",
    tags: ["utility"]
  },
  {
    name: "Daylight",
    level: 3,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "1 hour",
    description: "A 60-foot-radius sphere of bright light spreads from a point you choose (can be an object). Dispels any darkness spell of 3rd level or lower covering the area.",
    tags: ["utility"]
  },
  {
    name: "Dispel Magic",
    level: 3,
    school: "Abjuration",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "End one spell on a target creature, object, or area. For spells of 4th level or higher, make a spellcasting ability check (DC 10 + spell level) to end it.",
    upcast: { perLevel: "auto-dispel higher", note: "Automatically end spells of a level equal to or less than the slot level used" },
    tags: ["utility"]
  },
  {
    name: "Feign Death",
    level: 3,
    school: "Necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (a pinch of graveyard dirt)",
    duration: "1 hour",
    description: "A willing creature appears dead to all outward inspection and magic. It is blinded, incapacitated, speed 0, and has resistance to all damage except psychic.",
    tags: ["utility", "ritual"]
  },
  {
    name: "Glyph of Warding",
    level: 3,
    school: "Abjuration",
    castingTime: "1 hour",
    range: "Touch",
    components: "V, S, M (incense and powdered diamond worth at least 200 gp, which the spell consumes)",
    duration: "Until dispelled or triggered",
    description: "Inscribe a glyph that triggers when conditions are met. Choose explosive runes (5d8 acid/cold/fire/lightning/thunder, DEX save half) or store a spell of 3rd level or lower.",
    save: "dex",
    upcast: { perLevel: "+1d8 or higher stored spell", note: "Explosive runes: +1d8 per level above 3rd. Spell glyph: can store a spell up to the slot level used." },
    tags: ["utility"]
  },
  {
    name: "Magic Circle",
    level: 3,
    school: "Abjuration",
    castingTime: "1 minute",
    range: "10 feet",
    components: "V, S, M (holy water or powdered silver and iron worth at least 100 gp, which the spell consumes)",
    duration: "1 hour",
    description: "Create a 10-foot-radius, 20-foot-tall cylinder that blocks chosen creature types (celestials, elementals, fey, fiends, or undead). They can't enter, charm, frighten, or possess creatures inside.",
    upcast: { perLevel: "+1 hour duration", note: "Duration increases by 1 hour per slot level above 3rd" },
    tags: ["utility"]
  },
  {
    name: "Mass Healing Word",
    level: 3,
    school: "Evocation",
    castingTime: "1 bonus action",
    range: "60 feet",
    components: "V",
    duration: "Instantaneous",
    description: "Up to 6 creatures you can see within range each regain 1d4 + WIS modifier hit points. No effect on undead or constructs.",
    healing: { dice: "1d4", mod: "wis", discipleOfLife: true },
    upcast: { perLevel: "+1d4 healing", note: "Add 1d4 healing per slot level above 3rd" },
    tags: ["healing", "bonus action"]
  },
  {
    name: "Meld into Stone",
    level: 3,
    school: "Transmutation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "8 hours",
    description: "Step into a stone surface large enough to contain you. You can't see outside but can hear. Minor physical damage won't harm you, but partial destruction or transmutation of the stone expels you and deals 6d6 bludgeoning.",
    tags: ["utility", "ritual"]
  },
  {
    name: "Protection from Energy",
    level: 3,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Concentration, up to 1 hour",
    description: "Touch a willing creature to grant resistance to one damage type of your choice: acid, cold, fire, lightning, or thunder.",
    tags: ["buff", "concentration"]
  },
  {
    name: "Remove Curse",
    level: 3,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    description: "All curses affecting one creature or object end. If the target is a cursed magic item, the curse remains but the attunement bond breaks so it can be removed.",
    tags: ["healing", "utility"]
  },
  {
    name: "Revivify",
    level: 3,
    school: "Necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (diamonds worth 300 gp, which the spell consumes)",
    duration: "Instantaneous",
    description: "Touch a creature that died within the last minute. It returns to life with 1 hit point. Can't restore missing body parts. Can't revive creatures that died of old age.",
    tags: ["healing"]
  },
  {
    name: "Sending",
    level: 3,
    school: "Evocation",
    castingTime: "1 action",
    range: "Unlimited",
    components: "V, S, M (a short piece of fine copper wire)",
    duration: "1 round",
    description: "Send a 25-word message to a creature you are familiar with. It recognizes you, and can reply with its own 25-word message. Works across planes (5% failure chance).",
    tags: ["utility"]
  },
  {
    name: "Speak with Dead",
    level: 3,
    school: "Necromancy",
    castingTime: "1 action",
    range: "10 feet",
    components: "V, S, M (burning incense)",
    duration: "10 minutes",
    description: "Ask a corpse up to 5 questions. It answers briefly and cryptically, using knowledge it had in life. It can't lie but isn't compelled to be helpful. Doesn't return the soul.",
    tags: ["utility"]
  },
  {
    name: "Spirit Guardians",
    level: 3,
    school: "Conjuration",
    castingTime: "1 action",
    range: "Self (15-foot radius)",
    components: "V, S, M (a holy symbol)",
    duration: "Concentration, up to 10 minutes",
    description: "Spirits swirl in a 15-foot radius around you. Hostile creatures entering the area or starting their turn there make a WIS save, taking 3d8 radiant (or necrotic) damage on a failure, or half on success. Also halves their speed.",
    damage: { dice: "3d8", type: "radiant" },
    save: "wis",
    upcast: { perLevel: "+1d8 damage", note: "Add 1d8 damage per slot level above 3rd" },
    tags: ["damage", "concentration"]
  },
  {
    name: "Tongues",
    level: 3,
    school: "Divination",
    castingTime: "1 action",
    range: "Touch",
    components: "V, M (a small clay model of a ziggurat)",
    duration: "1 hour",
    description: "The target understands any spoken language it hears. When it speaks, any creature that knows at least one language can understand it.",
    tags: ["utility"]
  },
  {
    name: "Water Walk",
    level: 3,
    school: "Transmutation",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S, M (a piece of cork)",
    duration: "1 hour",
    description: "Up to 10 willing creatures can walk on any liquid surface as if it were solid ground. If submerged, they rise 60 feet per round to the surface.",
    tags: ["utility", "ritual"]
  },

  // ===================== LEVEL 4 (8 spells) =====================
  {
    name: "Banishment",
    level: 4,
    school: "Abjuration",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S, M (an item distasteful to the target)",
    duration: "Concentration, up to 1 minute",
    description: "CHA save or target is banished. Native creatures go to a harmless demiplane (return when spell ends). Extraplanar creatures are sent to their home plane (permanent if concentration held for full duration).",
    save: "cha",
    upcast: { perLevel: "+1 target", note: "One additional target per slot level above 4th" },
    tags: ["debuff", "concentration"]
  },
  {
    name: "Control Water",
    level: 4,
    school: "Transmutation",
    castingTime: "1 action",
    range: "300 feet",
    components: "V, S, M (a drop of water and a pinch of dust)",
    duration: "Concentration, up to 10 minutes",
    description: "Manipulate freestanding water in a 100-foot cube. Choose: Flood (raise water up to 20 feet), Part Water, Redirect Flow, or Whirlpool (STR save or 2d8 bludgeoning).",
    tags: ["utility", "concentration"]
  },
  {
    name: "Death Ward",
    level: 4,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "8 hours",
    description: "The first time the target would drop to 0 HP, it drops to 1 HP instead and the spell ends. Also negates any effect that would kill it instantly without dealing damage.",
    tags: ["buff"]
  },
  {
    name: "Divination",
    level: 4,
    school: "Divination",
    castingTime: "1 action",
    range: "Self",
    components: "V, S, M (incense and a sacrificial offering worth at least 25 gp, which the spell consumes)",
    duration: "Instantaneous",
    description: "Contact your deity to ask one question about a goal, event, or activity to occur within 7 days. The DM offers a truthful reply (short phrase, cryptic rhyme, or omen).",
    tags: ["utility", "ritual"]
  },
  {
    name: "Freedom of Movement",
    level: 4,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (a leather strap)",
    duration: "1 hour",
    description: "Target's movement is unaffected by difficult terrain, and spells/effects can't reduce its speed or cause it to be paralyzed or restrained. Can spend 5 feet of movement to escape nonmagical restraints.",
    tags: ["buff"]
  },
  {
    name: "Guardian of Faith",
    level: 4,
    school: "Conjuration",
    castingTime: "1 action",
    range: "30 feet",
    components: "V",
    duration: "8 hours",
    description: "Summon a Large spectral guardian. Any hostile creature that moves within 10 feet of it for the first time on a turn must make a DEX save, taking 20 radiant damage on failure or half on success. Guardian vanishes after dealing 60 total damage.",
    damage: { dice: "20", type: "radiant" },
    save: "dex",
    tags: ["damage"]
  },
  {
    name: "Locate Creature",
    level: 4,
    school: "Divination",
    castingTime: "1 action",
    range: "Self",
    components: "V, S, M (a bit of fur from a bloodhound)",
    duration: "Concentration, up to 1 hour",
    description: "Sense the direction to a specific creature you are familiar with (or nearest of a kind) within 1,000 feet. Blocked by running water 10+ feet wide.",
    tags: ["utility", "concentration"]
  },
  {
    name: "Stone Shape",
    level: 4,
    school: "Transmutation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (soft clay)",
    duration: "Instantaneous",
    description: "Touch a stone object of Medium size or smaller, or a section of stone no more than 5 feet in any dimension, and form it into any shape you wish.",
    tags: ["utility"]
  },

  // ===================== LEVEL 5 (13 spells) =====================
  {
    name: "Commune",
    level: 5,
    school: "Divination",
    castingTime: "1 minute",
    range: "Self",
    components: "V, S, M (incense and a vial of holy or unholy water)",
    duration: "1 minute",
    description: "Contact your deity and ask up to 3 yes-or-no questions. You receive correct answers. DM may give \"unclear\" if the question goes beyond the deity's knowledge.",
    tags: ["utility", "ritual"]
  },
  {
    name: "Contagion",
    level: 5,
    school: "Necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "7 days",
    description: "Melee spell attack to inflict a natural disease. Target must fail 3 CON saves before succeeding 3 to become fully diseased. Diseases include blinding sickness, filth fever, flesh rot, mindfire, seizure, slimy doom.",
    attack: true,
    tags: ["debuff"]
  },
  {
    name: "Dispel Evil and Good",
    level: 5,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Self",
    components: "V, S, M (holy water or powdered silver and iron)",
    duration: "Concentration, up to 1 minute",
    description: "Aberrations, celestials, elementals, fey, fiends, and undead have disadvantage on attacks against you. You can also use an action to dismiss one such creature (CHA save) or break an enchantment on an ally, ending the spell.",
    tags: ["buff", "concentration"]
  },
  {
    name: "Flame Strike",
    level: 5,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S, M (a pinch of sulfur)",
    duration: "Instantaneous",
    description: "A column of divine fire roars down in a 10-foot radius, 40-foot-high cylinder. DEX save or take 4d6 fire + 4d6 radiant damage (half on success).",
    damage: { dice: "4d6 fire + 4d6 radiant", type: "fire/radiant" },
    save: "dex",
    upcast: { perLevel: "+1d6 fire damage", note: "Add 1d6 fire damage per slot level above 5th" },
    tags: ["damage"]
  },
  {
    name: "Geas",
    level: 5,
    school: "Enchantment",
    castingTime: "1 minute",
    range: "60 feet",
    components: "V",
    duration: "30 days",
    description: "WIS save or target is charmed and must carry out a command or take 5d10 psychic damage once per day. Immune creatures and creatures that can't understand you are unaffected.",
    save: "wis",
    upcast: { perLevel: "longer duration", note: "7th: 1 year. 9th: until dispelled (permanent)." },
    tags: ["debuff"]
  },
  {
    name: "Greater Restoration",
    level: 5,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (diamond dust worth at least 100 gp, which the spell consumes)",
    duration: "Instantaneous",
    description: "End one of the following effects on the target: one level of exhaustion, charmed/petrified condition, a curse, any ability score reduction, or one HP maximum reduction effect.",
    tags: ["healing", "utility"]
  },
  {
    name: "Hallow",
    level: 5,
    school: "Evocation",
    castingTime: "24 hours",
    range: "Touch",
    components: "V, S, M (herbs, oils, and incense worth at least 1,000 gp, which the spell consumes)",
    duration: "Until dispelled",
    description: "Consecrate or desecrate an area up to 60-foot radius. Celestials, elementals, fey, fiends, and undead can't enter (or choose another extra effect: courage, darkness, daylight, energy protection, everlasting rest, etc.).",
    tags: ["utility"]
  },
  {
    name: "Insect Plague",
    level: 5,
    school: "Conjuration",
    castingTime: "1 action",
    range: "300 feet",
    components: "V, S, M (a few grains of sugar, some kernels of grain, and a smear of fat)",
    duration: "Concentration, up to 10 minutes",
    description: "A 20-foot-radius sphere of biting locusts. Creatures entering or starting their turn there make a CON save, taking 4d10 piercing damage on failure or half on success. Area is lightly obscured and difficult terrain.",
    damage: { dice: "4d10", type: "piercing" },
    save: "con",
    upcast: { perLevel: "+1d10 damage", note: "Add 1d10 piercing damage per slot level above 5th" },
    tags: ["damage", "concentration"]
  },
  {
    name: "Legend Lore",
    level: 5,
    school: "Divination",
    castingTime: "10 minutes",
    range: "Self",
    components: "V, S, M (incense worth at least 250 gp, which the spell consumes, and four ivory strips worth at least 50 gp each)",
    duration: "Instantaneous",
    description: "Learn significant lore about a person, place, or object. The more information you already have, the more precise and detailed the lore you receive.",
    tags: ["utility"]
  },
  {
    name: "Mass Cure Wounds",
    level: 5,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "Choose up to 6 creatures in a 30-foot-radius sphere. Each regains 3d8 + WIS modifier hit points. No effect on undead or constructs.",
    healing: { dice: "3d8", mod: "wis", discipleOfLife: true },
    upcast: { perLevel: "+1d8 healing", note: "Add 1d8 healing per slot level above 5th" },
    tags: ["healing"]
  },
  {
    name: "Planar Binding",
    level: 5,
    school: "Abjuration",
    castingTime: "1 hour",
    range: "60 feet",
    components: "V, S, M (a jewel worth at least 1,000 gp, which the spell consumes)",
    duration: "24 hours",
    description: "Target a celestial, elemental, fey, or fiend within range (usually in a Magic Circle). CHA save or it must serve you for the duration and obey your commands.",
    save: "cha",
    upcast: { perLevel: "longer duration", note: "6th: 10 days. 7th: 30 days. 8th: 180 days. 9th: a year and a day." },
    tags: ["utility"]
  },
  {
    name: "Raise Dead",
    level: 5,
    school: "Necromancy",
    castingTime: "1 hour",
    range: "Touch",
    components: "V, S, M (a diamond worth at least 500 gp, which the spell consumes)",
    duration: "Instantaneous",
    description: "Return to life a creature that has been dead no more than 10 days. Creature returns with 1 HP and a -4 penalty to all d20 rolls, reduced by 1 per long rest. Can't restore missing body parts.",
    tags: ["healing"]
  },
  {
    name: "Scrying",
    level: 5,
    school: "Divination",
    castingTime: "10 minutes",
    range: "Self",
    components: "V, S, M (a focus worth at least 1,000 gp, such as a crystal ball or silver mirror)",
    duration: "Concentration, up to 10 minutes",
    description: "See and hear a particular creature on the same plane. Target makes a WIS save (modified by your familiarity and connection). On failure, you can observe it through an invisible sensor.",
    save: "wis",
    tags: ["utility", "concentration"]
  },

  // ===================== LEVEL 6 (10 spells) =====================
  {
    name: "Blade Barrier",
    level: 6,
    school: "Evocation",
    castingTime: "1 action",
    range: "90 feet",
    components: "V, S",
    duration: "Concentration, up to 10 minutes",
    description: "Create a wall of whirling blades (up to 100 feet long, 20 feet high, 5 feet thick, or a 60-foot-diameter ring). Creatures entering or starting their turn in it make a DEX save, taking 6d10 slashing damage on failure or half on success.",
    damage: { dice: "6d10", type: "slashing" },
    save: "dex",
    tags: ["damage", "concentration"]
  },
  {
    name: "Create Undead",
    level: 6,
    school: "Necromancy",
    castingTime: "1 minute",
    range: "10 feet",
    components: "V, S, M (one clay pot filled with grave dirt, one clay pot filled with brackish water, and one 150 gp black onyx stone per corpse)",
    duration: "Instantaneous",
    description: "Create up to 3 ghouls from Medium or Small humanoid corpses. They obey your commands for 24 hours; recast at night to maintain control.",
    upcast: { perLevel: "stronger undead", note: "7th: 4 ghouls or 2 ghasts/wights. 8th: 5 ghouls or 3 ghasts/wights or 2 mummies. 9th: 6 ghouls or 4 ghasts/wights or 3 mummies." },
    tags: ["utility"]
  },
  {
    name: "Find the Path",
    level: 6,
    school: "Divination",
    castingTime: "1 minute",
    range: "Self",
    components: "V, S, M (a set of divinatory tools worth 100 gp and an object from the location)",
    duration: "Concentration, up to 1 day",
    description: "Know the shortest, most direct physical route to a specific fixed location you are familiar with. You always know which way and how far you are from the destination.",
    tags: ["utility", "concentration"]
  },
  {
    name: "Forbiddance",
    level: 6,
    school: "Abjuration",
    castingTime: "10 minutes",
    range: "Touch",
    components: "V, S, M (holy water, rare incense, and powdered ruby worth at least 1,000 gp)",
    duration: "1 day",
    description: "Ward an area up to 40,000 square feet against planar travel. Choose creature types (celestials, elementals, fey, fiends, undead) to take 5d10 radiant or necrotic damage when entering or starting their turn. Casting daily for 30 days makes it permanent.",
    tags: ["utility", "ritual"]
  },
  {
    name: "Harm",
    level: 6,
    school: "Necromancy",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "Unleash a virulent disease. CON save: on failure, 14d6 necrotic damage; on success, half damage. Can't reduce the target below 1 HP. Also reduces the target's HP maximum by the damage dealt (restored by long rest).",
    damage: { dice: "14d6", type: "necrotic" },
    save: "con",
    tags: ["damage"]
  },
  {
    name: "Heal",
    level: 6,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "A surge of positive energy heals 70 HP and ends blindness, deafness, and any diseases affecting the target.",
    healing: { flat: 70, mod: null, discipleOfLife: true },
    upcast: { perLevel: "+10 HP", note: "Add 10 HP of healing per slot level above 6th" },
    tags: ["healing"]
  },
  {
    name: "Heroes' Feast",
    level: 6,
    school: "Conjuration",
    castingTime: "10 minutes",
    range: "30 feet",
    components: "V, S, M (a gem-encrusted bowl worth at least 1,000 gp, which the spell consumes)",
    duration: "24 hours",
    description: "Conjure a magnificent feast for up to 12 creatures. Benefits (24 hours): cured of all diseases and poison, immune to poison and being frightened, advantage on WIS saves, gain 2d10 temporary HP.",
    tags: ["buff"]
  },
  {
    name: "Planar Ally",
    level: 6,
    school: "Conjuration",
    castingTime: "10 minutes",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "Beseech an otherworldly entity to send a celestial, elemental, or fiend to aid you. The creature is not obligated to help without appropriate payment negotiated with the DM.",
    tags: ["utility"]
  },
  {
    name: "True Seeing",
    level: 6,
    school: "Divination",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (an ointment for the eyes that costs 25 gp, made from mushroom powder, saffron, and fat, which the spell consumes)",
    duration: "1 hour",
    description: "The target gains truesight to 120 feet: see through normal and magical darkness, see invisible creatures, automatically detect visual illusions, perceive the Ethereal Plane.",
    tags: ["buff"]
  },
  {
    name: "Word of Recall",
    level: 6,
    school: "Conjuration",
    castingTime: "1 action",
    range: "5 feet",
    components: "V",
    duration: "Instantaneous",
    description: "You and up to 5 willing creatures within 5 feet instantly teleport to a previously designated sanctuary associated with your deity. You must have previously used the spell there to designate it.",
    tags: ["utility"]
  },

  // ===================== LEVEL 7 (8 spells) =====================
  {
    name: "Conjure Celestial",
    level: 7,
    school: "Conjuration",
    castingTime: "1 minute",
    range: "90 feet",
    components: "V, S",
    duration: "Concentration, up to 1 hour",
    description: "Summon a celestial of CR 4 or lower, which appears in an unoccupied space you can see. It is friendly and obeys your verbal commands.",
    upcast: { perLevel: "higher CR", note: "9th level: summon a celestial of CR 5 or lower" },
    tags: ["utility", "concentration"]
  },
  {
    name: "Divine Word",
    level: 7,
    school: "Evocation",
    castingTime: "1 bonus action",
    range: "30 feet",
    components: "V",
    duration: "Instantaneous",
    description: "Any creature that hears the divine utterance is affected based on current HP: 50+ HP deafened 1 min; 40 or fewer deafened and blinded 10 min; 30 or fewer blinded, deafened, stunned 1 hour; 20 or fewer killed instantly. Extraplanar creatures are banished (CHA save).",
    save: "cha",
    tags: ["damage", "bonus action"]
  },
  {
    name: "Etherealness",
    level: 7,
    school: "Transmutation",
    castingTime: "1 action",
    range: "Self",
    components: "V, S",
    duration: "Up to 8 hours",
    description: "Enter the Border Ethereal. You can see/hear the Material Plane (gray, 60 feet visibility) but can't affect or be affected by anything on it. You can move in any direction and pass through solid objects.",
    upcast: { perLevel: "+3 creatures", note: "Bring up to 3 willing creatures per slot level above 7th" },
    tags: ["utility"]
  },
  {
    name: "Fire Storm",
    level: 7,
    school: "Evocation",
    castingTime: "1 action",
    range: "150 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "A storm of fire in up to ten 10-foot cubes arranged as you wish (each must share a face with at least one other cube). DEX save: 7d10 fire damage on failure, half on success. You can designate creatures/objects to be unharmed.",
    damage: { dice: "7d10", type: "fire" },
    save: "dex",
    tags: ["damage"]
  },
  {
    name: "Plane Shift",
    level: 7,
    school: "Conjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (a forked, metal rod worth at least 250 gp, attuned to a particular plane)",
    duration: "Instantaneous",
    description: "Transport yourself and up to 8 willing creatures to a different plane of existence. Alternatively, touch an unwilling creature: CHA save or it is transported to a random location on a specified plane.",
    save: "cha",
    tags: ["utility"]
  },
  {
    name: "Regenerate",
    level: 7,
    school: "Transmutation",
    castingTime: "1 minute",
    range: "Touch",
    components: "V, S, M (a prayer wheel and holy water)",
    duration: "1 hour",
    description: "Target regains 4d8 + 15 HP immediately, then 1 HP at the start of each of its turns for the duration (60 HP over the full duration). Severed body members regrow after 2 minutes.",
    healing: { dice: "4d8", flat: 15, mod: null, discipleOfLife: true },
    tags: ["healing"]
  },
  {
    name: "Resurrection",
    level: 7,
    school: "Necromancy",
    castingTime: "1 hour",
    range: "Touch",
    components: "V, S, M (a diamond worth at least 1,000 gp, which the spell consumes)",
    duration: "Instantaneous",
    description: "Return to life a creature that has been dead up to 100 years. Restores to full HP, neutralizes poisons, cures nonmagical diseases, restores lost limbs. -4 penalty to d20 rolls, reduced by 1 per long rest.",
    tags: ["healing"]
  },
  {
    name: "Symbol",
    level: 7,
    school: "Abjuration",
    castingTime: "1 minute",
    range: "Touch",
    components: "V, S, M (mercury, phosphorus, powdered diamond and opal worth at least 1,000 gp, which the spell consumes)",
    duration: "Until dispelled or triggered",
    description: "Inscribe a harmful glyph on a surface or in an object. When triggered, it activates in a 60-foot sphere. Choose: Death (10d10 necrotic), Discord, Fear, Hopelessness, Insanity, Pain, Sleep, or Stunning. CON or WIS save.",
    tags: ["utility"]
  },

  // ===================== LEVEL 8 (4 spells) =====================
  {
    name: "Antimagic Field",
    level: 8,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Self (10-foot-radius sphere)",
    components: "V, S, M (a pinch of powdered iron or iron filings)",
    duration: "Concentration, up to 1 hour",
    description: "A 10-foot-radius invisible sphere of antimagic surrounds you. Spells, magic items, and magical effects are suppressed within the sphere. Summoned creatures temporarily vanish.",
    tags: ["utility", "concentration"]
  },
  {
    name: "Control Weather",
    level: 8,
    school: "Transmutation",
    castingTime: "10 minutes",
    range: "Self (5-mile radius)",
    components: "V, S, M (burning incense and bits of earth and wood mixed in water)",
    duration: "Concentration, up to 8 hours",
    description: "You take control of the weather within 5 miles for the duration. You can change precipitation, temperature, and wind. Each change takes 1d4 x 10 minutes to take effect.",
    tags: ["utility", "concentration"]
  },
  {
    name: "Earthquake",
    level: 8,
    school: "Evocation",
    castingTime: "1 action",
    range: "500 feet",
    components: "V, S, M (a pinch of dirt, a piece of rock, and a lump of clay)",
    duration: "Concentration, up to 1 minute",
    description: "A 100-foot-radius area shakes. Creatures on the ground must make a CON save or be knocked prone. Concentration checks at disadvantage. Can create fissures, collapse structures, and damage buildings.",
    save: "con",
    tags: ["damage", "concentration"]
  },
  {
    name: "Holy Aura",
    level: 8,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Self",
    components: "V, S, M (a tiny reliquary worth at least 1,000 gp containing a sacred relic)",
    duration: "Concentration, up to 1 minute",
    description: "Divine light radiates from you in a 30-foot radius. Creatures of your choice gain advantage on all saving throws, and other creatures have disadvantage on attacks against them. Fiends and undead that hit an affected creature must make a CON save or be blinded until the spell ends.",
    save: "con",
    tags: ["buff", "concentration"]
  },

  // ===================== LEVEL 9 (4 spells) =====================
  {
    name: "Astral Projection",
    level: 9,
    school: "Necromancy",
    castingTime: "1 hour",
    range: "10 feet",
    components: "V, S, M (for each creature: one jacinth worth at least 1,000 gp and one ornately carved bar of silver worth at least 100 gp)",
    duration: "Special",
    description: "Project yourself and up to 8 willing creatures into the Astral Plane. Your physical bodies remain behind in a state of suspended animation. A silver cord connects you to your body; if severed, you die.",
    tags: ["utility"]
  },
  {
    name: "Gate",
    level: 9,
    school: "Conjuration",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S, M (a diamond worth at least 5,000 gp)",
    duration: "Concentration, up to 1 minute",
    description: "Conjure a portal to a precise location on another plane of existence. Creatures can pass through in either direction. If you speak a specific creature's true name, it is drawn through the gate directly to you.",
    tags: ["utility", "concentration"]
  },
  {
    name: "Mass Heal",
    level: 9,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "A flood of healing energy restores up to 700 HP total divided as you choose among creatures within range. Also cures all diseases, and ends blindness and deafness.",
    healing: { flat: 700, mod: null, discipleOfLife: true },
    tags: ["healing"]
  },
  {
    name: "True Resurrection",
    level: 9,
    school: "Necromancy",
    castingTime: "1 hour",
    range: "Touch",
    components: "V, S, M (a sprinkle of holy water and diamonds worth at least 25,000 gp, which the spell consumes)",
    duration: "Instantaneous",
    description: "Restore to life a creature that has been dead for no more than 200 years, even if no body remains. The creature is fully restored with all HP, no penalties. Can cure all diseases, poisons, and restore lost limbs.",
    tags: ["healing"]
  }
];


// Spell buff effects — mechanical effects applied when concentrating on these spells
var SPELL_BUFF_EFFECTS = {
  "Shield of Faith": [{ type: "acBonus", value: 2 }],
  "Haste": [{ type: "acBonus", value: 2 }, { type: "reminder", text: "+2 AC, double speed, extra action (Attack/Dash/Disengage/Hide/Use Object only)" }],
  "Barkskin": [{ type: "acMinimum", value: 16 }],
  "Shield": [{ type: "reminder", text: "+5 AC until start of next turn (not concentration - track manually)" }],
  "Bless": [{ type: "rollReminder", text: "+1d4", rollBonus: { dice: "1d4", appliesTo: ["attacks", "saves"] } }],
  "Bane": [{ type: "rollReminder", text: "-1d4", rollBonus: { dice: "1d4", appliesTo: ["attacks", "saves"], subtract: true } }],
  "Enhance Ability": [{ type: "reminder", text: "Advantage on chosen ability checks" }],
  "Protection from Evil and Good": [{ type: "reminder", text: "Aberrations/celestials/elementals/fey/fiends/undead have disadvantage attacking you" }],
  "Beacon of Hope": [{ type: "reminder", text: "Advantage on WIS saves & death saves. Maximize healing received." }],
  "Spirit Guardians": [{ type: "reminder", text: "Enemies within 15ft: half speed, 3d8 radiant/necrotic on entering or starting turn (WIS save for half)" }],
  "Spiritual Weapon": [{ type: "reminder", text: "Bonus action: melee spell attack, 1d8+WIS force damage" }],
  "Warding Bond": [{ type: "acBonus", value: 1 }, { type: "reminder", text: "Target also gets +1 saves, resistance to all damage. You take same damage they take." }]
};

// Derived name arrays for backward compatibility with onboarding/level-up spell pickers
const CLERIC_CANTRIPS = CANTRIP_DATA.map(c => c.name);
const CLERIC_SPELLS = {};
SPELL_DB.forEach(s => { if (!CLERIC_SPELLS[s.level]) CLERIC_SPELLS[s.level] = []; CLERIC_SPELLS[s.level].push(s.name); });

function getSpell(name) {
  return SPELL_DB.find(s => s.name === name) || CANTRIP_DATA.find(c => c.name === name) || null;
}

const LIFE_DOMAIN_SPELLS = {
  1: ['Bless', 'Cure Wounds'],
  3: ['Lesser Restoration', 'Spiritual Weapon'],
  5: ['Beacon of Hope', 'Revivify'],
  7: ['Death Ward', 'Guardian of Faith'],
  9: ['Mass Cure Wounds', 'Raise Dead']
};

const CLERIC_SPELL_SLOTS = {
  1:{1:2}, 2:{1:3}, 3:{1:4,2:2}, 4:{1:4,2:3},
  5:{1:4,2:3,3:2}, 6:{1:4,2:3,3:3}, 7:{1:4,2:3,3:3,4:1}, 8:{1:4,2:3,3:3,4:2},
  9:{1:4,2:3,3:3,4:3,5:1}, 10:{1:4,2:3,3:3,4:3,5:2},
  11:{1:4,2:3,3:3,4:3,5:2,6:1}, 12:{1:4,2:3,3:3,4:3,5:2,6:1},
  13:{1:4,2:3,3:3,4:3,5:2,6:1,7:1}, 14:{1:4,2:3,3:3,4:3,5:2,6:1,7:1},
  15:{1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1}, 16:{1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1},
  17:{1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1,9:1}, 18:{1:4,2:3,3:3,4:3,5:3,6:1,7:1,8:1,9:1},
  19:{1:4,2:3,3:3,4:3,5:3,6:2,7:1,8:1,9:1}, 20:{1:4,2:3,3:3,4:3,5:3,6:2,7:2,8:1,9:1}
};
