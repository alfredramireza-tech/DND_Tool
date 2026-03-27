// progression.js — Skills, character templates, cleric progression tables
const SKILLS = [
  { name: 'Acrobatics', ability: 'dex' },
  { name: 'Animal Handling', ability: 'wis' },
  { name: 'Arcana', ability: 'int' },
  { name: 'Athletics', ability: 'str' },
  { name: 'Deception', ability: 'cha' },
  { name: 'History', ability: 'int' },
  { name: 'Insight', ability: 'wis' },
  { name: 'Intimidation', ability: 'cha' },
  { name: 'Investigation', ability: 'int' },
  { name: 'Medicine', ability: 'wis' },
  { name: 'Nature', ability: 'int' },
  { name: 'Perception', ability: 'wis' },
  { name: 'Performance', ability: 'cha' },
  { name: 'Persuasion', ability: 'cha' },
  { name: 'Religion', ability: 'int' },
  { name: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth', ability: 'dex' },
  { name: 'Survival', ability: 'wis' }
];

const SAMPLE_CHARACTER = {
  name: 'Thorin Iron Shield',
  race: 'Hill Dwarf',
  class: 'Cleric',
  subclass: 'Life Domain',
  background: 'Soldier',
  alignment: 'Neutral Good',
  level: 3,
  abilityScores: { str: 14, dex: 8, con: 15, int: 10, wis: 16, cha: 12 },
  hp: {
    max: 26, hitDiceType: 8, hitDiceCount: 3,
    hpHistory: [
      { level: 1, gained: 11, method: 'base', notes: '8 + 2 CON + 1 Dwarf Toughness' },
      { level: 2, gained: 8, method: 'roll', notes: '5 + 2 CON + 1 Dwarf Toughness' },
      { level: 3, gained: 7, method: 'roll', notes: '4 + 2 CON + 1 Dwarf Toughness' }
    ]
  },
  ac: 16,
  speed: 25,
  savingThrows: ['wis', 'cha'],
  skillProficiencies: ['athletics', 'medicine', 'religion'],
  cantripsKnown: ['Light', 'Thaumaturgy', 'Sacred Flame'],
  currentPreparedSpells: ['Healing Word', 'Guiding Bolt', 'Command', 'Sanctuary', 'Aid', 'Prayer of Healing'],
  features: ['Disciple of Life', 'Channel Divinity: Turn Undead', 'Channel Divinity: Preserve Life'],
  equipment: `Chain mail, shield, 2x handaxe, 1 scimitar, morningstar ("Brain Smoothie")
Light crossbow, 5 bolts
Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox
10 days rations, waterskin, 50ft rope, mason's tools
Dagger from fallen enemy, holy symbol, playing cards
Trophy, pouch, common clothes, rank insignia (sergeant)
3 apples, gem eye patch, semi-precious stones
Ring from 2x Rivas, scroll of augury
3 gold idols
49 GP, 63 SP, 10 GP`,
  notes: `25g each if we kill Glass-Staff
1 point of inspiration
Tressender Family Rings x2`,
  weapons: [
    { name: 'Brain Smoothie', ability: 'str', proficient: true, damage: '2d8', damageType: 'piercing', notes: 'Morningstar' },
    { name: 'Handaxe', ability: 'str', proficient: true, damage: '1d6', damageType: 'slashing', notes: 'Thrown 20/60, disadvantage' },
    { name: 'Light Crossbow', ability: 'dex', proficient: true, damage: '1d8', damageType: 'piercing', notes: '5 bolts' }
  ],
  currentHp: 26,
  tempHp: 0,
  spellSlotsUsed: {},
  channelDivinityUsed: 0,
  currency: { cp: 0, sp: 63, ep: 0, gp: 59, pp: 0 },
  equippedItems: [
    { name: 'Chain Mail', slot: 'armor', armorType: 'heavy', stats: { ac: 16 }, notes: 'Disadvantage on Stealth' },
    { name: 'Shield', slot: 'shield', armorType: 'shield', stats: { acBonus: 2 }, notes: '' },
    { name: 'Holy Symbol', slot: 'other', armorType: null, stats: {}, notes: '' }
  ],
  quickItems: ['2x Handaxe', '1 Scimitar', 'Light Crossbow', '5 Bolts', 'Dagger'],
  bulkGear: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50ft rope, mason\'s tools, playing cards, trophy, pouch, common clothes, rank insignia (sergeant), 3 apples, gem eye patch, semi-precious stones, ring from 2x Rivas, scroll of augury, 3 gold idols, Tressender Family Rings x2',
  levelHistory: [],
  resources: {},
  expertiseSkills: [],
  colorTheme: {
    name: 'Cleric Gold',
    accent: '#c4a35a', accentHover: '#d4b36a', accentDim: '#8a7340',
    bg: '#1a1410', surface: '#241e16', surfaceRaised: '#2e2720',
    border: '#3d3428', text: '#e8dcc8', textDim: '#a89880',
    error: '#c45a5a', success: '#6aaa5a', inputBg: '#1e1812'
  }
};

const BLANK_DEFAULTS = {
  name: '',
  race: '',
  subrace: '',
  class: '',
  subclass: '',
  background: '',
  alignment: '',
  level: 1,
  abilityScores: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },
  hp: { max: '', hitDiceType: 8, hitDiceCount: 1, hpHistory: [] },
  ac: '',
  speed: 25,
  savingThrows: [],
  skillProficiencies: [],
  cantripsKnown: [],
  currentPreparedSpells: [],
  features: [],
  equipment: '',
  notes: '',
  weapons: [],
  currentHp: 0,
  tempHp: 0,
  spellSlotsUsed: {},
  channelDivinityUsed: 0,
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  equippedItems: [],
  quickItems: [],
  bulkGear: '',
  levelHistory: [],
  resources: {},
  expertiseSkills: [],
  colorTheme: null,
  deathSaves: { successes: 0, failures: 0 },
  concentration: { active: false, spellName: '' },
  activeConditions: [],
  sessionLog: []
};

/* Character-level to spell-level mapping for domain spells */
const CHAR_LEVEL_TO_SPELL_LEVEL = { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5 };

/* Levels where ASI/Feat is offered */
const ASI_LEVELS = [4, 8, 12, 16, 19];

/* Levels where Cleric gains a new cantrip */
const CANTRIP_GAIN_LEVELS = [4, 10];

/* Levels where new domain spells are gained */
const DOMAIN_SPELL_LEVELS = [3, 5, 7, 9];

/* Levels where proficiency bonus increases */
const PROF_INCREASE_LEVELS = [5, 9, 13, 17];

/* Feature descriptions for Cleric / Life Domain */
const FEATURE_DESCRIPTIONS = {
  'Destroy Undead (CR 1/2)': 'When an undead fails its saving throw against your Turn Undead, it is instantly destroyed if its CR is 1/2 or lower.',
  'Destroy Undead (CR 1)': 'When an undead fails its saving throw against your Turn Undead, it is instantly destroyed if its CR is 1 or lower.',
  'Destroy Undead (CR 2)': 'When an undead fails its saving throw against your Turn Undead, it is instantly destroyed if its CR is 2 or lower.',
  'Destroy Undead (CR 3)': 'When an undead fails its saving throw against your Turn Undead, it is instantly destroyed if its CR is 3 or lower.',
  'Destroy Undead (CR 4)': 'When an undead fails its saving throw against your Turn Undead, it is instantly destroyed if its CR is 4 or lower.',
  'Blessed Healer': 'When you cast a healing spell of 1st level or higher that restores hit points to a creature other than you, you regain hit points equal to 2 + the spell\'s level.',
  'Divine Strike': 'Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 radiant damage. At 14th level, the extra damage increases to 2d8.',
  'Divine Intervention': 'You can call on your deity to intervene on your behalf. Describe the assistance you seek, then roll a percentile die. If the number is equal to or less than your cleric level, your deity intervenes. If successful, you can\'t use this feature again for 7 days; otherwise, you can try again after a long rest.',
  'Supreme Healing': 'When you would normally roll one or more dice to restore hit points with a spell, you instead use the highest number possible for each die. For example, instead of restoring 2d6 hit points, you restore 12.',
  'Divine Intervention Improvement': 'Your call to your deity for Divine Intervention succeeds automatically, no roll required.',
  'Channel Divinity (2/rest)': 'You can now use Channel Divinity twice between rests.',
  'Channel Divinity (3/rest)': 'You can now use Channel Divinity three times between rests.',
  'Divine Strike Improvement': 'Your Divine Strike damage increases to 2d8 radiant damage.'
};

/* Cleric progression: what happens at each level 4-20 */
const CLERIC_PROGRESSION = {
  4: {
    features: [],
    asi: true,
    newCantrip: true,
    spellSlots: {1:4, 2:3},
    channelDivinityUses: 1,
    proficiencyBonus: 2
  },
  5: {
    features: ['Destroy Undead (CR 1/2)'],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:2},
    channelDivinityUses: 1,
    proficiencyBonus: 3,
    domainSpells: {5: ['Beacon of Hope', 'Revivify']},
    newSpellLevel: 3
  },
  6: {
    features: ['Blessed Healer'],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3},
    channelDivinityUses: 2,
    proficiencyBonus: 3
  },
  7: {
    features: [],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:1},
    channelDivinityUses: 2,
    proficiencyBonus: 3,
    domainSpells: {7: ['Death Ward', 'Guardian of Faith']},
    newSpellLevel: 4
  },
  8: {
    features: ['Destroy Undead (CR 1)', 'Divine Strike'],
    asi: true,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:2},
    channelDivinityUses: 2,
    proficiencyBonus: 3
  },
  9: {
    features: [],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:1},
    channelDivinityUses: 2,
    proficiencyBonus: 4,
    domainSpells: {9: ['Mass Cure Wounds', 'Raise Dead']},
    newSpellLevel: 5
  },
  10: {
    features: ['Divine Intervention'],
    asi: false,
    newCantrip: true,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2},
    channelDivinityUses: 2,
    proficiencyBonus: 4
  },
  11: {
    features: ['Destroy Undead (CR 2)'],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1},
    channelDivinityUses: 2,
    proficiencyBonus: 4,
    newSpellLevel: 6
  },
  12: {
    features: [],
    asi: true,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1},
    channelDivinityUses: 2,
    proficiencyBonus: 4
  },
  13: {
    features: [],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1},
    channelDivinityUses: 2,
    proficiencyBonus: 5,
    newSpellLevel: 7
  },
  14: {
    features: ['Destroy Undead (CR 3)', 'Divine Strike Improvement'],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1},
    channelDivinityUses: 2,
    proficiencyBonus: 5
  },
  15: {
    features: [],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1},
    channelDivinityUses: 2,
    proficiencyBonus: 5,
    newSpellLevel: 8
  },
  16: {
    features: [],
    asi: true,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1},
    channelDivinityUses: 2,
    proficiencyBonus: 5
  },
  17: {
    features: ['Destroy Undead (CR 4)', 'Supreme Healing'],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1, 9:1},
    channelDivinityUses: 2,
    proficiencyBonus: 6,
    newSpellLevel: 9
  },
  18: {
    features: ['Channel Divinity (3/rest)'],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:3, 6:1, 7:1, 8:1, 9:1},
    channelDivinityUses: 3,
    proficiencyBonus: 6
  },
  19: {
    features: [],
    asi: true,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:3, 6:2, 7:1, 8:1, 9:1},
    channelDivinityUses: 3,
    proficiencyBonus: 6
  },
  20: {
    features: ['Divine Intervention Improvement'],
    asi: false,
    newCantrip: false,
    spellSlots: {1:4, 2:3, 3:3, 4:3, 5:3, 6:2, 7:2, 8:1, 9:1},
    channelDivinityUses: 3,
    proficiencyBonus: 6
  }
};
