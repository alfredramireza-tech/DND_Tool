// rogue.js — Rogue class data, sneak attack, subclass features, progression
/* ═══════════════════════════════════════════
   ROGUE DATA
   ═══════════════════════════════════════════ */

/* Sneak Attack dice count: Math.ceil(level / 2) d6s */
function getSneakAttackDice(level) {
  return Math.ceil(level / 2);
}

/* Rogue progression: levels 2-20 */
const ROGUE_PROGRESSION = {
  2:  { features: ['Cunning Action'], asi: false, proficiencyBonus: 2, sneakAttackDice: 1 },
  3:  { features: ['_subclass_'], asi: false, proficiencyBonus: 2, sneakAttackDice: 2 },
  4:  { features: [], asi: true, proficiencyBonus: 2, sneakAttackDice: 2 },
  5:  { features: ['Uncanny Dodge'], asi: false, proficiencyBonus: 3, sneakAttackDice: 3 },
  6:  { features: ['Expertise (2 more)'], asi: false, proficiencyBonus: 3, sneakAttackDice: 3 },
  7:  { features: ['Evasion'], asi: false, proficiencyBonus: 3, sneakAttackDice: 4 },
  8:  { features: [], asi: true, proficiencyBonus: 3, sneakAttackDice: 4 },
  9:  { features: ['_subclass_'], asi: false, proficiencyBonus: 4, sneakAttackDice: 5 },
  10: { features: [], asi: true, proficiencyBonus: 4, sneakAttackDice: 5 },
  11: { features: ['Reliable Talent'], asi: false, proficiencyBonus: 4, sneakAttackDice: 6 },
  12: { features: [], asi: true, proficiencyBonus: 4, sneakAttackDice: 6 },
  13: { features: ['_subclass_'], asi: false, proficiencyBonus: 5, sneakAttackDice: 7 },
  14: { features: ['Blindsense'], asi: false, proficiencyBonus: 5, sneakAttackDice: 7 },
  15: { features: ['Slippery Mind'], asi: false, proficiencyBonus: 5, sneakAttackDice: 8 },
  16: { features: [], asi: true, proficiencyBonus: 5, sneakAttackDice: 8 },
  17: { features: ['_subclass_'], asi: false, proficiencyBonus: 6, sneakAttackDice: 9 },
  18: { features: ['Elusive'], asi: false, proficiencyBonus: 6, sneakAttackDice: 9 },
  19: { features: [], asi: true, proficiencyBonus: 6, sneakAttackDice: 10 },
  20: { features: ['Stroke of Luck'], asi: false, proficiencyBonus: 6, sneakAttackDice: 10 }
};

/* Subclass features injected at '_subclass_' levels */
const ROGUE_SUBCLASS_FEATURES = {
  'Thief': {
    3: ['Fast Hands', 'Second-Story Work'],
    9: ['Supreme Sneak'],
    13: ['Use Magic Device'],
    17: ["Thief's Reflexes"]
  },
  'Assassin': {
    3: ['Assassinate', 'Bonus Proficiencies'],
    9: ['Infiltration Expertise'],
    13: ['Impostor'],
    17: ['Death Strike']
  },
  'Arcane Trickster': {
    3: ['Spellcasting', 'Mage Hand Legerdemain'],
    9: ['Magical Ambush'],
    13: ['Versatile Trickster'],
    17: ['Spell Thief']
  }
};

/* Feature descriptions */
const ROGUE_FEATURE_DESCRIPTIONS = {
  // Core features
  'Sneak Attack': 'Once per turn, you can deal extra damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or ranged weapon. You don\'t need advantage if another enemy of the target is within 5 feet of it, that enemy isn\'t incapacitated, and you don\'t have disadvantage.',
  "Thieves' Cant": 'A secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation. Only another creature that knows thieves\' cant understands such messages. You also understand a set of signs and symbols used to convey short, simple messages.',
  'Cunning Action': 'You can take a bonus action on each of your turns in combat to Dash, Disengage, or Hide.',
  'Uncanny Dodge': 'When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack\'s damage against you.',
  'Evasion': 'When you are subjected to an effect that allows you to make a DEX saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail. You can\'t use this if you\'re incapacitated.',
  'Reliable Talent': 'Whenever you make an ability check that lets you add your proficiency bonus, you can treat a d20 roll of 9 or lower as a 10.',
  'Blindsense': 'If you are able to hear, you are aware of the location of any hidden or invisible creature within 10 feet of you.',
  'Slippery Mind': 'You gain proficiency in Wisdom saving throws.',
  'Elusive': 'No attack roll has advantage against you while you aren\'t incapacitated.',
  'Stroke of Luck': 'If your attack misses a target within range, you can turn the miss into a hit. Alternatively, if you fail an ability check, you can treat the d20 roll as a 20. Once you use this feature, you can\'t use it again until you finish a short or long rest.',
  'Expertise (2 more)': 'Choose two more of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.',

  // Thief
  'Fast Hands': 'You can use the bonus action granted by Cunning Action to make a Sleight of Hand check, use your thieves\' tools to disarm a trap or open a lock, or take the Use an Object action.',
  'Second-Story Work': 'Climbing no longer costs you extra movement. When you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier.',
  'Supreme Sneak': 'You have advantage on a Stealth check if you move no more than half your speed on the same turn.',
  'Use Magic Device': 'You ignore all class, race, and level requirements on the use of magic items.',
  "Thief's Reflexes": 'You can take two turns during the first round of any combat. You take your first turn at your normal initiative and your second turn at your initiative minus 10. You can\'t use this feature when you are surprised.',

  // Assassin
  'Assassinate': 'You have advantage on attack rolls against any creature that hasn\'t taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit.',
  'Bonus Proficiencies': 'You gain proficiency with the disguise kit and the poisoner\'s kit.',
  'Infiltration Expertise': 'You can unfailingly create false identities for yourself. You must spend seven days and 25 gp to establish the history, profession, and affiliations for an identity. You can\'t establish an identity that belongs to someone else.',
  'Impostor': 'You gain the ability to unerringly mimic another person\'s speech, writing, and behavior. You must spend at least three hours studying these three components. Your ruse is indiscernible to the casual observer. A suspicious creature can make a contested Insight vs. your Deception check.',
  'Death Strike': 'When you attack and hit a creature that is surprised, it must make a Constitution saving throw (DC 8 + your Dexterity modifier + your proficiency bonus). On a failed save, double the damage of your attack against the creature.',

  // Arcane Trickster
  'Spellcasting': 'You gain the ability to cast wizard spells. You learn three cantrips (including Mage Hand) and three 1st-level wizard spells (two must be Enchantment or Illusion). You use Intelligence as your spellcasting ability.',
  'Mage Hand Legerdemain': 'When you cast Mage Hand, you can make the spectral hand invisible. You can use the hand to stow or retrieve an object in a container worn or carried by another creature, use thieves\' tools to pick locks and disarm traps at range, and control the hand as a bonus action.',
  'Magical Ambush': 'If you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any saving throw it makes against the spell on that turn.',
  'Versatile Trickster': 'You gain the ability to distract targets with your Mage Hand. As a bonus action, you can designate a creature within 5 feet of the spectral hand. You have advantage on attack rolls against that creature until the end of the turn.',
  'Spell Thief': 'When a creature casts a spell that targets you or includes you in its area of effect, you can use your reaction to force the creature to make a saving throw with its spellcasting ability modifier. The DC equals your spell save DC. On a failed save, you negate the spell\'s effect against you, and you steal the knowledge of the spell if it is at least 1st level and of a level you can cast. For 8 hours, you know the spell and can cast it using your spell slots. The creature can\'t cast that spell until the 8 hours have passed. Once you use this feature, you can\'t use it again until you finish a long rest.'
};

/* Rogue cumulative feature list builder */
function getRogueFeatures(level, subclass) {
  var f = [];
  if (level >= 1) f.push('Sneak Attack', "Thieves' Cant");
  if (level >= 2) f.push('Cunning Action');
  if (level >= 5) f.push('Uncanny Dodge');
  if (level >= 6) f.push('Expertise (2 more)');
  if (level >= 7) f.push('Evasion');
  if (level >= 11) f.push('Reliable Talent');
  if (level >= 14) f.push('Blindsense');
  if (level >= 15) f.push('Slippery Mind');
  if (level >= 18) f.push('Elusive');
  if (level >= 20) f.push('Stroke of Luck');
  // Subclass features
  var subFeats = ROGUE_SUBCLASS_FEATURES[subclass];
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
function getRogueLevelFeatures(level, subclass) {
  var prog = ROGUE_PROGRESSION[level];
  if (!prog || !prog.features) return [];
  var features = [];
  prog.features.forEach(function(f) {
    if (f === '_subclass_') {
      var subFeats = ROGUE_SUBCLASS_FEATURES[subclass];
      if (subFeats && subFeats[level]) {
        features = features.concat(subFeats[level]);
      }
    } else {
      features.push(f);
    }
  });
  return features;
}
