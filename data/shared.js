// shared.js — Shared constants: skills, character templates, fighting styles, UI labels
/* ═══════════════════════════════════════════
   SHARED DATA
   ═══════════════════════════════════════════ */

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
  unequippedItems: [],
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

/* Fighting Styles — shared between Fighter, Paladin, Ranger */
const FIGHTING_STYLES = {
  'Archery': { effect: '+2 to attack rolls with ranged weapons', mechanical: 'ranged_attack_bonus' },
  'Defense': { effect: '+1 AC while wearing armor', mechanical: 'ac_bonus_armor' },
  'Dueling': { effect: '+2 damage with one-handed melee weapon (no other weapon in other hand)', mechanical: 'dueling_damage' },
  'Great Weapon Fighting': { effect: 'Reroll 1s and 2s on damage dice with two-handed/versatile melee weapons (you choose)', mechanical: 'gwf_reroll' },
  'Protection': { effect: 'Reaction: impose disadvantage on attack vs. creature within 5ft (requires shield)', mechanical: 'reference' },
  'Two-Weapon Fighting': { effect: 'Add ability modifier to damage of off-hand attack when dual wielding', mechanical: 'reference' }
};

/* UI step labels for onboarding wizard */
const STEP_LABELS = ['Identity', 'Abilities', 'Combat', 'Spells', 'Gear', 'Password', 'Review'];

/* Ability score abbreviations and display names */
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_NAMES = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
