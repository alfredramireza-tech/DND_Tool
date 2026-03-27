// paladin.js — Paladin class data, oath spells, progression, feature descriptions
/* ═══════════════════════════════════════════
   PALADIN DATA
   ═══════════════════════════════════════════ */

/* Paladin Fighting Styles — subset of Fighter's FIGHTING_STYLES */
const PALADIN_FIGHTING_STYLES = {
  'Defense': FIGHTING_STYLES['Defense'],
  'Dueling': FIGHTING_STYLES['Dueling'],
  'Great Weapon Fighting': FIGHTING_STYLES['Great Weapon Fighting'],
  'Protection': FIGHTING_STYLES['Protection']
};

/* PALADIN_SPELL_SLOTS moved to spell-lists.js as HALF_CASTER_SLOTS */
/* OATH_SPELLS moved to spell-lists.js */

/* Paladin progression: levels 2-20 */
const PALADIN_PROGRESSION = {
  2:  { features: ['Divine Smite', 'Spellcasting', 'Fighting Style'], asi: false, proficiencyBonus: 2, spellSlots: {1:2}, channelDivinityUses: 0, layOnHandsPool: 10, divineSenseUses: null, extraAttacks: 1, cleansingTouchUses: 0 },
  3:  { features: ['Divine Health', 'Channel Divinity', '_subclass_'], asi: false, proficiencyBonus: 2, spellSlots: {1:3}, channelDivinityUses: 1, layOnHandsPool: 15, divineSenseUses: null, extraAttacks: 1, cleansingTouchUses: 0 },
  4:  { features: [], asi: true, proficiencyBonus: 2, spellSlots: {1:3}, channelDivinityUses: 1, layOnHandsPool: 20, divineSenseUses: null, extraAttacks: 1, cleansingTouchUses: 0 },
  5:  { features: ['Extra Attack'], asi: false, proficiencyBonus: 3, spellSlots: {1:4,2:2}, channelDivinityUses: 1, layOnHandsPool: 25, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  6:  { features: ['Aura of Protection'], asi: false, proficiencyBonus: 3, spellSlots: {1:4,2:2}, channelDivinityUses: 1, layOnHandsPool: 30, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  7:  { features: ['_subclass_'], asi: false, proficiencyBonus: 3, spellSlots: {1:4,2:3}, channelDivinityUses: 1, layOnHandsPool: 35, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  8:  { features: [], asi: true, proficiencyBonus: 3, spellSlots: {1:4,2:3}, channelDivinityUses: 1, layOnHandsPool: 40, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  9:  { features: [], asi: false, proficiencyBonus: 4, spellSlots: {1:4,2:3,3:2}, channelDivinityUses: 1, layOnHandsPool: 45, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  10: { features: ['Aura of Courage'], asi: false, proficiencyBonus: 4, spellSlots: {1:4,2:3,3:2}, channelDivinityUses: 1, layOnHandsPool: 50, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  11: { features: ['Improved Divine Smite'], asi: false, proficiencyBonus: 4, spellSlots: {1:4,2:3,3:3}, channelDivinityUses: 1, layOnHandsPool: 55, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  12: { features: [], asi: true, proficiencyBonus: 4, spellSlots: {1:4,2:3,3:3}, channelDivinityUses: 1, layOnHandsPool: 60, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  13: { features: [], asi: false, proficiencyBonus: 5, spellSlots: {1:4,2:3,3:3,4:1}, channelDivinityUses: 1, layOnHandsPool: 65, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: 0 },
  14: { features: ['Cleansing Touch'], asi: false, proficiencyBonus: 5, spellSlots: {1:4,2:3,3:3,4:1}, channelDivinityUses: 1, layOnHandsPool: 70, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: null },
  15: { features: ['_subclass_'], asi: false, proficiencyBonus: 5, spellSlots: {1:4,2:3,3:3,4:2}, channelDivinityUses: 1, layOnHandsPool: 75, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: null },
  16: { features: [], asi: true, proficiencyBonus: 5, spellSlots: {1:4,2:3,3:3,4:2}, channelDivinityUses: 1, layOnHandsPool: 80, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: null },
  17: { features: [], asi: false, proficiencyBonus: 6, spellSlots: {1:4,2:3,3:3,4:3,5:1}, channelDivinityUses: 1, layOnHandsPool: 85, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: null },
  18: { features: ['Aura Improvements'], asi: false, proficiencyBonus: 6, spellSlots: {1:4,2:3,3:3,4:3,5:1}, channelDivinityUses: 1, layOnHandsPool: 90, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: null },
  19: { features: [], asi: true, proficiencyBonus: 6, spellSlots: {1:4,2:3,3:3,4:3,5:2}, channelDivinityUses: 1, layOnHandsPool: 95, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: null },
  20: { features: ['_subclass_'], asi: false, proficiencyBonus: 6, spellSlots: {1:4,2:3,3:3,4:3,5:2}, channelDivinityUses: 1, layOnHandsPool: 100, divineSenseUses: null, extraAttacks: 2, cleansingTouchUses: null }
};

/* Subclass features injected at '_subclass_' levels */
const PALADIN_SUBCLASS_FEATURES = {
  'Oath of Devotion': {
    3: ['Sacred Weapon', 'Turn the Unholy'],
    7: ['Aura of Devotion'],
    15: ['Purity of Spirit'],
    20: ['Holy Nimbus']
  },
  'Oath of the Ancients': {
    3: ["Nature's Wrath", 'Turn the Faithless'],
    7: ['Aura of Warding'],
    15: ['Undying Sentinel'],
    20: ['Elder Champion']
  },
  'Oath of Vengeance': {
    3: ['Abjure Enemy', 'Vow of Enmity'],
    7: ['Relentless Avenger'],
    15: ['Soul of Vengeance'],
    20: ['Avenging Angel']
  }
};

/* Feature descriptions */
const PALADIN_FEATURE_DESCRIPTIONS = {
  // Core features
  'Divine Sense': 'As an action, you can detect the location of any celestial, fiend, or undead within 60 feet that is not behind total cover. You also detect the presence of any consecrated or desecrated place or object within the same range. You can use this feature 1 + CHA modifier times per long rest.',
  'Lay on Hands': 'You have a pool of healing power equal to 5 × your Paladin level. As an action, touch a creature and restore any number of HP from the pool. Alternatively, spend 5 HP from the pool to cure one disease or neutralize one poison.',
  'Divine Smite': 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal extra radiant damage: 2d8 for a 1st-level slot, plus 1d8 per slot level above 1st (max 5d8). +1d8 vs. undead or fiend.',
  'Improved Divine Smite': 'Starting at 11th level, whenever you hit a creature with a melee weapon, the creature takes an extra 1d8 radiant damage.',
  'Divine Health': 'The divine magic flowing through you makes you immune to disease.',
  'Extra Attack': 'You can attack twice, instead of once, whenever you take the Attack action on your turn.',
  'Aura of Protection': 'Whenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus to the saving throw equal to your CHA modifier (minimum +1). You must be conscious. At 18th level, the range increases to 30 feet.',
  'Aura of Courage': 'You and friendly creatures within 10 feet of you can\'t be frightened while you are conscious. At 18th level, the range increases to 30 feet.',
  'Cleansing Touch': 'You can use your action to end one spell on yourself or on one willing creature that you touch. You can use this feature a number of times equal to your CHA modifier (minimum 1). You regain all uses on a long rest.',
  'Aura Improvements': 'At 18th level, the range of your Aura of Protection and Aura of Courage increases to 30 feet.',
  'Fighting Style': 'You adopt a particular style of fighting as your specialty. Choose one: Defense, Dueling, Great Weapon Fighting, or Protection.',

  // Oath of Devotion
  'Sacred Weapon': 'Channel Divinity. As an action, imbue one weapon you are holding with positive energy for 1 minute. You add your CHA modifier to attack rolls made with that weapon (minimum +1). The weapon emits bright light in a 20-foot radius and dim light 20 feet beyond that. You can end this effect on your turn (no action required).',
  'Turn the Unholy': 'Channel Divinity. As an action, each fiend or undead within 30 feet must make a WIS save. On failure, it is turned for 1 minute or until it takes damage.',
  'Aura of Devotion': 'You and friendly creatures within 10 feet of you can\'t be charmed while you are conscious. At 18th level, the range increases to 30 feet.',
  'Purity of Spirit': 'You are always under the effects of a Protection from Evil and Good spell.',
  'Holy Nimbus': 'As an action, emanate an aura of sunlight for 1 minute. Bright light 30 feet, dim light 30 feet beyond. Enemies starting their turn in the bright light take 10 radiant damage. You have advantage on saves against spells cast by fiends or undead. Once per long rest.',

  // Oath of the Ancients
  "Nature's Wrath": 'Channel Divinity. As an action, cause spectral vines to restrain a creature you can see within 10 feet. The creature must make a STR or DEX save (its choice) or be restrained. It can repeat the save at the end of each of its turns.',
  'Turn the Faithless': 'Channel Divinity. As an action, each fey or fiend within 30 feet must make a WIS save. On failure, it is turned for 1 minute or until it takes damage.',
  'Aura of Warding': 'You and friendly creatures within 10 feet have resistance to damage from spells. At 18th level, the range increases to 30 feet.',
  'Undying Sentinel': 'When you are reduced to 0 HP and not killed outright, you can choose to drop to 1 HP instead. Once per long rest. Additionally, you suffer none of the drawbacks of old age, and you can\'t be aged magically.',
  'Elder Champion': 'As an action, transform for 1 minute. Regain 10 HP at the start of each turn. Paladin spells you cast have their casting time reduced to a bonus action. Enemies within 10 feet have disadvantage on saves against your Paladin spells and Channel Divinity. Once per long rest.',

  // Oath of Vengeance
  'Abjure Enemy': 'Channel Divinity. As an action, choose one creature within 60 feet. It must make a WIS save or be frightened for 1 minute or until it takes damage. Fiends and undead have disadvantage on the save. While frightened, its speed is 0 and it can\'t benefit from bonuses to speed.',
  'Vow of Enmity': 'Channel Divinity. As a bonus action, choose a creature within 10 feet. You gain advantage on attack rolls against it for 1 minute or until it drops to 0 HP or falls unconscious.',
  'Relentless Avenger': 'When you hit a creature with an opportunity attack, you can move up to half your speed immediately after the attack as part of the same reaction. This movement doesn\'t provoke opportunity attacks.',
  'Soul of Vengeance': 'When a creature under your Vow of Enmity makes an attack, you can use your reaction to make a melee weapon attack against it.',
  'Avenging Angel': 'As an action, transform for 1 hour. Sprout wings (fly speed 60 feet). Emanate a menacing aura in a 30-foot radius. Enemies entering for the first time or starting their turn there must make a WIS save or be frightened for 1 minute (save at end of each turn). Once per long rest.'
};

/* Paladin feature list builder */
function getPaladinFeatures(level, subclass) {
  var f = [];
  if (level >= 1) f.push('Divine Sense', 'Lay on Hands');
  if (level >= 2) f.push('Divine Smite', 'Spellcasting', 'Fighting Style');
  if (level >= 3) f.push('Divine Health', 'Channel Divinity');
  if (level >= 5) f.push('Extra Attack');
  if (level >= 6) f.push('Aura of Protection');
  if (level >= 10) f.push('Aura of Courage');
  if (level >= 11) f.push('Improved Divine Smite');
  if (level >= 14) f.push('Cleansing Touch');
  if (level >= 18) f.push('Aura Improvements');
  // Subclass features
  var subFeats = PALADIN_SUBCLASS_FEATURES[subclass];
  if (subFeats) {
    Object.keys(subFeats).forEach(function(lvl) {
      if (level >= parseInt(lvl)) {
        subFeats[lvl].forEach(function(feat) { f.push(feat); });
      }
    });
  }
  return f;
}

/* Paladin spell slots for a given paladin level */
/* getPaladinSpellSlots moved to spell-lists.js as alias for getHalfCasterSlots */

/* Get features gained at a specific level (not cumulative) — used by level-up wizard */
function getPaladinLevelFeatures(level, subclass) {
  var prog = PALADIN_PROGRESSION[level];
  if (!prog || !prog.features) return [];
  var features = [];
  prog.features.forEach(function(f) {
    if (f === '_subclass_') {
      var subFeats = PALADIN_SUBCLASS_FEATURES[subclass];
      if (subFeats && subFeats[level]) {
        features = features.concat(subFeats[level]);
      }
    } else {
      features.push(f);
    }
  });
  return features;
}

/* Get oath spells for a given oath and paladin level */
function getOathSpells(oath, level) {
  var spells = [];
  var oathTable = OATH_SPELLS[oath];
  if (!oathTable) return spells;
  Object.keys(oathTable).forEach(function(lvl) {
    if (level >= parseInt(lvl)) {
      oathTable[lvl].forEach(function(s) { spells.push(s); });
    }
  });
  return spells;
}
