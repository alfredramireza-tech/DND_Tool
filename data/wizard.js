// wizard.js — Wizard class data, arcane traditions, spell progression, feature descriptions
/* ═══════════════════════════════════════════
   WIZARD DATA
   ═══════════════════════════════════════════ */

/* Wizard cantrips known by level */
const WIZARD_CANTRIPS_KNOWN = {
  1:3,2:3,3:3,4:4,5:4,6:4,7:4,8:4,9:4,10:5,
  11:5,12:5,13:5,14:5,15:5,16:5,17:5,18:5,19:5,20:5
};

function getWizardCantripsKnown(level) {
  return WIZARD_CANTRIPS_KNOWN[level] || 3;
}

/* Arcane Recovery budget: ceil(level / 2) total spell slot levels */
function getArcaneRecoveryBudget(level) {
  return Math.ceil(level / 2);
}

/* Wizard prepared count: INT mod + wizard level, minimum 1 */
function getWizardPreparedCount(level, intMod) {
  return Math.max(1, level + intMod);
}

/* Wizard progression: levels 2-20 */
const WIZARD_PROGRESSION = {
  2:  { features: ['_subclass_'], asi: false, proficiencyBonus: 2, cantripsKnown: 3, spellbookAdds: 2 },
  3:  { features: [], asi: false, proficiencyBonus: 2, cantripsKnown: 3, spellbookAdds: 2, newSpellLevel: 2 },
  4:  { features: [], asi: true, proficiencyBonus: 2, cantripsKnown: 4, spellbookAdds: 2, newCantrip: true },
  5:  { features: [], asi: false, proficiencyBonus: 3, cantripsKnown: 4, spellbookAdds: 2, newSpellLevel: 3 },
  6:  { features: ['_subclass_'], asi: false, proficiencyBonus: 3, cantripsKnown: 4, spellbookAdds: 2 },
  7:  { features: [], asi: false, proficiencyBonus: 3, cantripsKnown: 4, spellbookAdds: 2, newSpellLevel: 4 },
  8:  { features: [], asi: true, proficiencyBonus: 3, cantripsKnown: 4, spellbookAdds: 2 },
  9:  { features: [], asi: false, proficiencyBonus: 4, cantripsKnown: 4, spellbookAdds: 2, newSpellLevel: 5 },
  10: { features: ['_subclass_'], asi: false, proficiencyBonus: 4, cantripsKnown: 5, spellbookAdds: 2, newCantrip: true },
  11: { features: [], asi: false, proficiencyBonus: 4, cantripsKnown: 5, spellbookAdds: 2, newSpellLevel: 6 },
  12: { features: [], asi: true, proficiencyBonus: 4, cantripsKnown: 5, spellbookAdds: 2 },
  13: { features: [], asi: false, proficiencyBonus: 5, cantripsKnown: 5, spellbookAdds: 2, newSpellLevel: 7 },
  14: { features: ['_subclass_'], asi: false, proficiencyBonus: 5, cantripsKnown: 5, spellbookAdds: 2 },
  15: { features: [], asi: false, proficiencyBonus: 5, cantripsKnown: 5, spellbookAdds: 2, newSpellLevel: 8 },
  16: { features: [], asi: true, proficiencyBonus: 5, cantripsKnown: 5, spellbookAdds: 2 },
  17: { features: [], asi: false, proficiencyBonus: 6, cantripsKnown: 5, spellbookAdds: 2, newSpellLevel: 9 },
  18: { features: ['Spell Mastery'], asi: false, proficiencyBonus: 6, cantripsKnown: 5, spellbookAdds: 2 },
  19: { features: [], asi: true, proficiencyBonus: 6, cantripsKnown: 5, spellbookAdds: 2 },
  20: { features: ['Signature Spells'], asi: false, proficiencyBonus: 6, cantripsKnown: 5, spellbookAdds: 2 }
};

/* Subclass features injected at '_subclass_' levels (2, 6, 10, 14) */
const WIZARD_SUBCLASS_FEATURES = {
  'School of Abjuration': {
    2: ['Abjuration Savant', 'Arcane Ward'],
    6: ['Projected Ward'],
    10: ['Improved Abjuration'],
    14: ['Spell Resistance']
  },
  'School of Conjuration': {
    2: ['Conjuration Savant', 'Minor Conjuration'],
    6: ['Benign Transposition'],
    10: ['Focused Conjuration'],
    14: ['Durable Summons']
  },
  'School of Divination': {
    2: ['Divination Savant', 'Portent'],
    6: ['Expert Divination'],
    10: ['The Third Eye'],
    14: ['Greater Portent']
  },
  'School of Enchantment': {
    2: ['Enchantment Savant', 'Hypnotic Gaze'],
    6: ['Instinctive Charm'],
    10: ['Split Enchantment'],
    14: ['Alter Memories']
  },
  'School of Evocation': {
    2: ['Evocation Savant', 'Sculpt Spells'],
    6: ['Potent Cantrip'],
    10: ['Empowered Evocation'],
    14: ['Overchannel']
  },
  'School of Illusion': {
    2: ['Illusion Savant', 'Improved Minor Illusion'],
    6: ['Malleable Illusions'],
    10: ['Illusory Self'],
    14: ['Illusory Reality']
  },
  'School of Necromancy': {
    2: ['Necromancy Savant', 'Grim Harvest'],
    6: ['Undead Thralls'],
    10: ['Inured to Undeath'],
    14: ['Command Undead']
  },
  'School of Transmutation': {
    2: ['Transmutation Savant', 'Minor Alchemy'],
    6: ["Transmuter's Stone"],
    10: ['Shapechanger'],
    14: ['Master Transmuter']
  }
};

/* Feature descriptions */
const WIZARD_FEATURE_DESCRIPTIONS = {
  // Core features
  'Arcane Recovery': 'Once per day during a short rest, you can recover expended spell slots with a combined level equal to or less than half your wizard level (rounded up). None of the slots can be 6th level or higher.',
  'Spell Mastery': 'Choose one 1st-level and one 2nd-level wizard spell in your spellbook. You can cast those spells at their lowest level without expending a spell slot. To cast either spell at a higher level, you must expend a spell slot as normal.',
  'Signature Spells': 'Choose two 3rd-level wizard spells in your spellbook as signature spells. You always have them prepared, they don\'t count against your prepared spell limit, and you can cast each of them once at 3rd level without expending a spell slot. You regain the ability to do so on a short or long rest.',

  // School of Abjuration
  'Abjuration Savant': 'The gold and time to copy abjuration spells into your spellbook is halved.',
  'Arcane Ward': 'When you cast an abjuration spell of 1st level or higher, you can create a magical ward on yourself. The ward has hit points equal to twice your wizard level + your Intelligence modifier. Whenever you take damage, the ward takes the damage instead. When you cast another abjuration spell of 1st level or higher, the ward regains hit points equal to twice the spell\'s level.',
  'Projected Ward': 'When a creature you can see within 30 feet takes damage, you can use your reaction to cause your Arcane Ward to absorb that damage instead.',
  'Improved Abjuration': 'When you cast an abjuration spell that requires you to make an ability check as part of casting that spell (as in Counterspell and Dispel Magic), you add your proficiency bonus to that check.',
  'Spell Resistance': 'You have advantage on saving throws against spells. You have resistance to damage dealt by spells.',

  // School of Conjuration
  'Conjuration Savant': 'The gold and time to copy conjuration spells into your spellbook is halved.',
  'Minor Conjuration': 'As an action, you conjure a nonmagical object in your hand or on the ground in an unoccupied space within 10 feet. The object can be no larger than 3 feet on a side and weighs no more than 10 pounds, and it must be in the form of a nonmagical object you have seen. It is visibly magical and lasts until you use this feature again, after 1 hour, or if it takes or deals damage.',
  'Benign Transposition': 'As an action, teleport up to 30 feet to an unoccupied space you can see, or swap places with a willing Small or Medium creature within 30 feet. Once used, you can\'t do so again until you finish a long rest or cast a conjuration spell of 1st level or higher.',
  'Focused Conjuration': 'Your concentration on a conjuration spell can\'t be broken as a result of taking damage.',
  'Durable Summons': 'Any creature you summon or create with a conjuration spell has 30 temporary hit points.',

  // School of Divination
  'Divination Savant': 'The gold and time to copy divination spells into your spellbook is halved.',
  'Portent': 'After finishing a long rest, roll two d20s and record the numbers rolled. You can replace any attack roll, saving throw, or ability check made by you or a creature you can see with one of these foretelling rolls. You must choose to do so before the roll. Each foretelling roll can be used only once.',
  'Expert Divination': 'When you cast a divination spell of 2nd level or higher using a spell slot, you regain one expended spell slot. The slot must be of a level lower than the spell you cast and can\'t be higher than 5th level.',
  'The Third Eye': 'As an action, gain one of these benefits until you finish a short or long rest: darkvision 60 feet, see into the Ethereal Plane within 60 feet, read any language, or see invisible creatures/objects within 10 feet (you can see into the Ethereal Plane as well).',
  'Greater Portent': 'You roll three d20s for your Portent feature, instead of two.',

  // School of Enchantment
  'Enchantment Savant': 'The gold and time to copy enchantment spells into your spellbook is halved.',
  'Hypnotic Gaze': 'As an action, choose one creature you can see within 5 feet. If it can see or hear you, it must make a Wisdom saving throw or be charmed by you until the end of your next turn. The charmed creature\'s speed drops to 0, and it is incapacitated. On subsequent turns, you can use your action to maintain this effect, extending the duration until the end of your next turn. The effect ends if you move more than 5 feet from the creature, the creature takes damage, or it can\'t see or hear you.',
  'Instinctive Charm': 'When a creature you can see within 30 feet makes an attack roll against you, you can use your reaction to divert the attack, provided another creature is within the attack\'s range. The attacker must make a Wisdom saving throw. On a failed save, the attacker must target the creature closest to it (not including you). Creatures immune to being charmed are unaffected. Once you use this feature, you can\'t use it again until you finish a long rest or cast an enchantment spell of 1st level or higher.',
  'Split Enchantment': 'When you cast an enchantment spell of 1st level or higher that targets only one creature, you can have it target a second creature.',
  'Alter Memories': 'When you cast an enchantment spell to charm one or more creatures, you can alter one creature\'s understanding so that it remains unaware of being charmed. Additionally, once before the spell expires, you can use your action to try to make the chosen creature forget some of the time it spent charmed. The creature must succeed on an Intelligence saving throw against your wizard spell save DC or lose a number of hours of its memories equal to 1 + your Charisma modifier (minimum 1).',

  // School of Evocation
  'Evocation Savant': 'The gold and time to copy evocation spells into your spellbook is halved.',
  'Sculpt Spells': 'When you cast an evocation spell that affects other creatures you can see, you can choose a number of them equal to 1 + the spell\'s level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.',
  'Potent Cantrip': 'When a creature succeeds on a saving throw against your cantrip, the creature takes half the cantrip\'s damage (if any) but suffers no additional effect from the cantrip.',
  'Empowered Evocation': 'You can add your Intelligence modifier to one damage roll of any wizard evocation spell you cast.',
  'Overchannel': 'When you cast a wizard spell of 1st through 5th level that deals damage, you can deal maximum damage with that spell. The first time you do so, you suffer no adverse effect. Each additional time before you finish a long rest, you take 2d12 necrotic damage for each level of the spell, immediately after you deal the maximum damage. This damage ignores resistance and immunity.',

  // School of Illusion
  'Illusion Savant': 'The gold and time to copy illusion spells into your spellbook is halved.',
  'Improved Minor Illusion': 'You learn the Minor Illusion cantrip. When you cast it, you can create both a sound and an image with a single casting.',
  'Malleable Illusions': 'When you cast an illusion spell that has a duration of 1 minute or longer, you can use your action to change the nature of that illusion (using the spell\'s normal parameters), provided you can see the illusion.',
  'Illusory Self': 'When a creature makes an attack roll against you, you can use your reaction to create an illusory duplicate of yourself. The attack automatically misses you, then the illusion dissipates. Once you use this feature, you can\'t use it again until you finish a short or long rest.',
  'Illusory Reality': 'When you cast an illusion spell of 1st level or higher, you can choose one inanimate, nonmagical object that is part of the illusion and make that object real. The object remains real for 1 minute. The object can\'t deal damage or otherwise directly harm anyone.',

  // School of Necromancy
  'Necromancy Savant': 'The gold and time to copy necromancy spells into your spellbook is halved.',
  'Grim Harvest': 'When you kill one or more creatures with a spell of 1st level or higher, you regain hit points equal to twice the spell\'s level, or three times the spell\'s level if the spell belongs to the School of Necromancy. You don\'t gain this benefit for killing constructs or undead.',
  'Undead Thralls': 'You add the Animate Dead spell to your spellbook if it is not there already. When you cast Animate Dead, you can target one additional corpse or pile of bones, creating another zombie or skeleton. Whenever you create an undead using a necromancy spell, it has additional benefits: its hit point maximum is increased by an amount equal to your wizard level, and it adds your proficiency bonus to its weapon damage rolls.',
  'Inured to Undeath': 'You have resistance to necrotic damage, and your hit point maximum can\'t be reduced.',
  'Command Undead': 'As an action, choose one undead that you can see within 60 feet. That creature must make a Charisma saving throw against your wizard spell save DC. If it succeeds, you can\'t use this feature on it again. If it fails, it becomes friendly to you and obeys your commands until you use this feature again. Intelligent undead (INT 12 or higher) have advantage on the saving throw, and if they have INT 8 or higher, they can repeat the save at the end of every hour.',

  // School of Transmutation
  'Transmutation Savant': 'The gold and time to copy transmutation spells into your spellbook is halved.',
  'Minor Alchemy': 'You can spend 10 minutes to temporarily transform one nonmagical object made of wood, stone, iron, copper, or silver into a different one of those materials. The transformation lasts for 1 hour or until you lose concentration. For each 10 minutes you spend performing this procedure, you can transform up to 1 cubic foot of material.',
  "Transmuter's Stone": 'Starting at 6th level, you can spend 8 hours creating a transmuter\'s stone that stores transmutation magic. The stone grants a benefit to the creature holding it (your choice when creating): darkvision 60 feet, +10 feet speed, proficiency in Constitution saving throws, or resistance to acid, cold, fire, lightning, or thunder damage (your choice). You choose the benefit when you create the stone. You can change the benefit each time you cast a transmutation spell of 1st level or higher. You can also destroy the stone as an action for a powerful one-time effect.',
  'Shapechanger': 'You add the Polymorph spell to your spellbook if it is not there already. You can cast Polymorph without expending a spell slot, targeting only yourself and transforming into a beast whose challenge rating is 1 or lower. Once you cast Polymorph in this way, you can\'t do so again until you finish a short or long rest.',
  'Master Transmuter': 'You can use your action to consume the reserve of transmutation magic stored within your transmuter\'s stone in a single burst. When you do so, choose one of the following effects: transmute a nonmagical object (up to 5 feet per side) into another nonmagical object of similar size and mass; remove all curses, diseases, and poisons affecting a creature you touch (also restores 5d6 hit points); cast Raise Dead without a spell slot or material components; or restore a young adult age to a creature you touch.'
};

/* Wizard cumulative feature list builder */
function getWizardFeatures(level, subclass) {
  var f = [];
  if (level >= 1) f.push('Arcane Recovery');
  if (level >= 18) f.push('Spell Mastery');
  if (level >= 20) f.push('Signature Spells');
  // Subclass features
  var subFeats = WIZARD_SUBCLASS_FEATURES[subclass];
  if (subFeats) {
    Object.keys(subFeats).forEach(function(lvl) {
      if (level >= parseInt(lvl)) {
        subFeats[lvl].forEach(function(feat) { f.push(feat); });
      }
    });
  }
  return f;
}

/* Get features gained at a specific level (not cumulative) — used by level-up wizard */
function getWizardLevelFeatures(level, subclass) {
  var prog = WIZARD_PROGRESSION[level];
  if (!prog || !prog.features) return [];
  var features = [];
  prog.features.forEach(function(f) {
    if (f === '_subclass_') {
      var subFeats = WIZARD_SUBCLASS_FEATURES[subclass];
      if (subFeats && subFeats[level]) {
        features = features.concat(subFeats[level]);
      }
    } else {
      features.push(f);
    }
  });
  return features;
}
