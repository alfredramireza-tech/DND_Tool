// fighter.js — Fighter class data, fighting styles, maneuvers, EK spells, progression
/* ═══════════════════════════════════════════
   FIGHTER DATA
   ═══════════════════════════════════════════ */

/* FIGHTING_STYLES moved to shared.js */

const MANEUVERS = {
  "Commander's Strike": 'Forgo one attack. An ally within hearing uses reaction to make one weapon attack, adding the superiority die to damage.',
  "Disarming Attack": 'Add superiority die to damage. Target makes STR save or drops one held item.',
  "Distracting Strike": 'Add superiority die to damage. Next attack by someone else against the target has advantage (before start of your next turn).',
  "Evasive Footwork": 'When you move, add superiority die roll to AC until you stop moving.',
  "Feinting Attack": 'Bonus action. Advantage on next attack against creature within 5ft. If it hits, add superiority die to damage.',
  "Goading Attack": 'Add superiority die to damage. Target makes WIS save or has disadvantage on attacks against anyone but you (until end of your next turn).',
  "Lunging Attack": 'Increase melee reach by 5ft for one attack. Add superiority die to damage.',
  "Maneuvering Attack": 'Add superiority die to damage. Choose an ally — they can use reaction to move half speed without provoking opportunity attacks.',
  "Menacing Attack": 'Add superiority die to damage. Target makes WIS save or is frightened of you until end of your next turn.',
  "Parry": 'Reaction when hit by melee. Reduce damage by superiority die + DEX modifier.',
  "Precision Attack": 'Add superiority die to attack roll (before or after rolling, but before knowing if it hits).',
  "Pushing Attack": 'Add superiority die to damage. Target makes STR save or is pushed 15ft.',
  "Rally": 'Bonus action. Choose ally within 60ft who can hear you. They gain temp HP equal to superiority die + your CHA modifier.',
  "Riposte": 'Reaction when a creature misses you with melee. Make one melee attack. If it hits, add superiority die to damage.',
  "Sweeping Attack": 'When you hit, choose another creature within 5ft of target and within your reach. If original attack roll would hit, it takes superiority die damage.',
  "Trip Attack": 'Add superiority die to damage. Target (Large or smaller) makes STR save or is knocked prone.'
};

/* EK_SPELL_SLOTS, EK_SPELLS_KNOWN, EK_CANTRIPS_KNOWN, EK_FREE_PICK_LEVELS
   moved to spell-lists.js as THIRD_CASTER_* (with backward-compat aliases) */

/* WIZARD_SPELL_LIST moved to spell-lists.js */

/* Get all EK-accessible Wizard spell names (levels 1-4 only) */
function getEkSpellNames() {
  var names = [];
  [1, 2, 3, 4].forEach(function(lvl) {
    if (WIZARD_SPELL_LIST[lvl]) names = names.concat(WIZARD_SPELL_LIST[lvl]);
  });
  return names;
}

/* Get all EK-accessible spell objects (data lives in unified SPELL_DB) */
function getAllEkSpells() {
  return getEkSpellNames().map(function(name) {
    return getSpell(name);
  }).filter(Boolean);
}

/* WIZARD_CANTRIPS merged into CANTRIP_DATA in spells.js */

/* WIZARD_SPELL_DB merged into SPELL_DB in spells.js */

/* Fighter Feature Descriptions */
const FIGHTER_FEATURE_DESCRIPTIONS = {
  'Second Wind': 'Bonus action. Regain 1d10 + fighter level hit points. Refreshes on a short rest.',
  'Action Surge': 'You can take one additional action on your turn beyond your normal action and a possible bonus action. Refreshes on a short rest.',
  'Action Surge (2 uses)': 'You can use Action Surge twice between rests (but only once per turn).',
  'Extra Attack': 'You can attack twice, instead of once, whenever you take the Attack action on your turn.',
  'Extra Attack (3)': 'You can attack three times whenever you take the Attack action on your turn.',
  'Extra Attack (4)': 'You can attack four times whenever you take the Attack action on your turn.',
  'Indomitable': 'When you fail a saving throw, you can reroll it. You must use the new roll. 1 use per long rest.',
  'Indomitable (2 uses)': 'You can use Indomitable twice between long rests.',
  'Indomitable (3 uses)': 'You can use Indomitable three times between long rests.',
  'Improved Critical': 'Your weapon attacks score a critical hit on a roll of 19 or 20.',
  'Remarkable Athlete': 'Add half your proficiency bonus (round up) to any STR, DEX, or CON check that doesn\'t already include your proficiency bonus. Also adds to running long jump distance.',
  'Additional Fighting Style': 'You learn a second Fighting Style. You cannot choose one you already have.',
  'Superior Critical': 'Your weapon attacks score a critical hit on a roll of 18, 19, or 20.',
  'Survivor': 'At the start of each of your turns, you regain 5 + CON modifier hit points if you have no more than half your hit points left and at least 1 HP.',
  'Combat Superiority': 'You learn maneuvers powered by superiority dice. You have 4 superiority dice (d8). Refreshes on a short rest.',
  'Combat Superiority (5 dice)': 'You gain a 5th superiority die.',
  'Combat Superiority (d10)': 'Your superiority dice become d10s.',
  'Combat Superiority (6 dice)': 'You gain a 6th superiority die.',
  'Combat Superiority (d12)': 'Your superiority dice become d12s.',
  'Student of War': 'You gain proficiency with one type of artisan\'s tools.',
  'Know Your Enemy': 'Spend 1 minute observing a creature outside combat. You learn if it is your equal, superior, or inferior in two of: STR, DEX, CON, AC, current HP, total class levels, fighter class levels.',
  'War Magic': 'When you use your action to cast a cantrip, you can make one weapon attack as a bonus action.',
  'Eldritch Strike': 'When you hit a creature with a weapon attack, that creature has disadvantage on the next saving throw it makes against your spells before the end of your next turn.',
  'Arcane Charge': 'When you use Action Surge, you can teleport up to 30 feet to an unoccupied space you can see, either before or after the additional action.',
  'Improved War Magic': 'When you use your action to cast a spell, you can make one weapon attack as a bonus action.'
};

/* Fighter progression: levels 2-20 */
const FIGHTER_PROGRESSION = {
  2: { features: ['Action Surge'], asi: false, proficiencyBonus: 2, actionSurgeUses: 1, secondWindUses: 1 },
  3: { features: ['_subclass_'], asi: false, proficiencyBonus: 2, actionSurgeUses: 1, secondWindUses: 1 },
  4: { features: [], asi: true, proficiencyBonus: 2, actionSurgeUses: 1, secondWindUses: 1 },
  5: { features: ['Extra Attack'], asi: false, proficiencyBonus: 3, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 2 },
  6: { features: [], asi: true, proficiencyBonus: 3, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 2 },
  7: { features: ['_subclass_'], asi: false, proficiencyBonus: 3, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 2 },
  8: { features: [], asi: true, proficiencyBonus: 3, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 2 },
  9: { features: ['Indomitable'], asi: false, proficiencyBonus: 4, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 2, indomitableUses: 1 },
  10: { features: ['_subclass_'], asi: false, proficiencyBonus: 4, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 2, indomitableUses: 1 },
  11: { features: ['Extra Attack (3)'], asi: false, proficiencyBonus: 4, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 3, indomitableUses: 1 },
  12: { features: [], asi: true, proficiencyBonus: 4, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 3, indomitableUses: 1 },
  13: { features: ['Indomitable (2 uses)'], asi: false, proficiencyBonus: 5, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 3, indomitableUses: 2 },
  14: { features: [], asi: true, proficiencyBonus: 5, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 3, indomitableUses: 2 },
  15: { features: ['_subclass_'], asi: false, proficiencyBonus: 5, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 3, indomitableUses: 2 },
  16: { features: [], asi: true, proficiencyBonus: 5, actionSurgeUses: 1, secondWindUses: 1, extraAttacks: 3, indomitableUses: 2 },
  17: { features: ['Action Surge (2 uses)', 'Indomitable (3 uses)'], asi: false, proficiencyBonus: 6, actionSurgeUses: 2, secondWindUses: 1, extraAttacks: 3, indomitableUses: 3 },
  18: { features: ['_subclass_'], asi: false, proficiencyBonus: 6, actionSurgeUses: 2, secondWindUses: 1, extraAttacks: 3, indomitableUses: 3 },
  19: { features: [], asi: true, proficiencyBonus: 6, actionSurgeUses: 2, secondWindUses: 1, extraAttacks: 3, indomitableUses: 3 },
  20: { features: ['Extra Attack (4)'], asi: false, proficiencyBonus: 6, actionSurgeUses: 2, secondWindUses: 1, extraAttacks: 4, indomitableUses: 3 }
};

/* Subclass features injected at '_subclass_' levels */
const FIGHTER_SUBCLASS_FEATURES = {
  Champion: {
    3: ['Improved Critical'],
    7: ['Remarkable Athlete'],
    10: ['Additional Fighting Style'],
    15: ['Superior Critical'],
    18: ['Survivor']
  },
  'Battle Master': {
    3: ['Combat Superiority', 'Student of War'],
    7: ['Know Your Enemy', 'Combat Superiority (5 dice)'],
    10: ['Combat Superiority (d10)'],
    15: ['Combat Superiority (6 dice)'],
    18: ['Combat Superiority (d12)']
  },
  'Eldritch Knight': {
    3: ['Spellcasting'],
    7: ['War Magic'],
    10: ['Eldritch Strike'],
    15: ['Arcane Charge'],
    18: ['Improved War Magic']
  }
};

/* Battle Master: how many maneuvers known at each level */
const BM_MANEUVERS_KNOWN = {3:3,7:5,10:7,15:9};
/* Battle Master: superiority dice count and size */
function getBmDiceCount(level) { return level >= 15 ? 6 : level >= 7 ? 5 : 4; }
function getBmDiceSize(level) { return level >= 18 ? 12 : level >= 10 ? 10 : 8; }
/* Maneuver Save DC = 8 + prof + max(STR mod, DEX mod) */
function getManeuverDC(c) { return 8 + c.proficiencyBonus + Math.max(getEffectiveMod(c, 'str'), getEffectiveMod(c, 'dex')); }

/* Fighter feature list builder */
function getFighterFeatures(level, subclass) {
  var f = [];
  if (level >= 1) f.push('Second Wind');
  if (level >= 2) f.push('Action Surge');
  if (level >= 5) f.push('Extra Attack');
  if (level >= 9) f.push('Indomitable');
  if (level >= 11) f.push('Extra Attack (3)');
  if (level >= 13) f.push('Indomitable (2 uses)');
  if (level >= 17) { f.push('Action Surge (2 uses)'); f.push('Indomitable (3 uses)'); }
  if (level >= 20) f.push('Extra Attack (4)');
  // Subclass features
  var subFeats = FIGHTER_SUBCLASS_FEATURES[subclass];
  if (subFeats) {
    Object.keys(subFeats).forEach(function(lvl) {
      if (level >= parseInt(lvl)) {
        subFeats[lvl].forEach(function(feat) { f.push(feat); });
      }
    });
  }
  return f;
}

/* EK spell slots for a given fighter level */
/* getEkSpellSlots moved to spell-lists.js as alias for getThirdCasterSlots */

/* Get maneuvers known count at a given level */
function getBmManeuversKnown(level) {
  var known = 0;
  var keys = Object.keys(BM_MANEUVERS_KNOWN).map(Number).sort(function(a,b){return a-b;});
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] <= level) known = BM_MANEUVERS_KNOWN[keys[i]];
  }
  return known;
}

/* Get features gained at a specific level (not cumulative) */
function getFighterLevelFeatures(level, subclass) {
  var prog = FIGHTER_PROGRESSION[level];
  if (!prog || !prog.features) return [];
  var features = [];
  prog.features.forEach(function(f) {
    if (f === '_subclass_') {
      var subFeats = FIGHTER_SUBCLASS_FEATURES[subclass];
      if (subFeats && subFeats[level]) {
        features = features.concat(subFeats[level]);
      }
    } else {
      features.push(f);
    }
  });
  return features;
}

