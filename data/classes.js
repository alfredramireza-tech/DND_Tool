// classes.js — Race data, class definitions, and color themes
// ============================================================
// RACE DATA — Aasimar
// ============================================================

const AASIMAR_SUBRACES = {
  Protector: {
    abilityBonus: 'WIS +1',
    bonusAbility: 'wis',
    bonusAmount: 1,
    transformation: {
      name: 'Radiant Soul',
      minLevel: 3,
      description: 'Action: sprout spectral wings for 1 minute. Fly speed 30 ft. Once per turn, deal extra radiant damage equal to your level on one damage roll.',
      shortDesc: 'Fly 30ft, +level radiant damage'
    }
  },
  Scourge: {
    abilityBonus: 'CON +1',
    bonusAbility: 'con',
    bonusAmount: 1,
    transformation: {
      name: 'Radiant Consumption',
      minLevel: 3,
      description: 'Action: radiant light for 1 minute. End of each of your turns: you and creatures within 10 ft take half your level (round up) radiant damage. Once per turn, deal extra radiant damage equal to your level on one damage roll.',
      shortDesc: 'AoE radiant aura, +level radiant damage'
    }
  },
  Fallen: {
    abilityBonus: 'STR +1',
    bonusAbility: 'str',
    bonusAmount: 1,
    transformation: {
      name: 'Necrotic Shroud',
      minLevel: 3,
      description: 'Action: skeletal ghostly wings for 1 minute. Creatures within 10 ft must make a CHA save or be frightened until end of your next turn. Once per turn, deal extra necrotic damage equal to your level on one damage roll.',
      shortDesc: 'Frighten nearby, +level necrotic damage'
    }
  }
};

// ============================================================
// CLASS DATA — Tier 1 Classes
// ============================================================

const CLASS_DATA = {
  Cleric: {
    hitDice: 8,
    savingThrows: ['wis', 'cha'],
    skillChoices: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    expertiseCount: 0,
    subclasses: ['Life Domain', 'Light Domain', 'Knowledge Domain', 'Nature Domain', 'Tempest Domain', 'Trickery Domain', 'War Domain'],
    subclassLabel: 'Domain',
    isCaster: true,
    spellcastingAbility: 'wis',
    defaultTheme: 'clericGold',
    unarmoredDefense: null,
    unarmoredNoShield: false,
    shortRestResets: ['channelDivinity'],
    longRestResets: ['channelDivinity', 'spellSlots'],
    recommendedStats: { str: 14, dex: 10, con: 13, int: 8, wis: 15, cha: 12 },
    recommendedSkills: ['insight', 'medicine'],
    recommendedExpertise: []
  },
  Fighter: {
    hitDice: 10,
    savingThrows: ['str', 'con'],
    skillChoices: ['acrobatics', 'animal handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    skillCount: 2,
    expertiseCount: 0,
    subclasses: ['Champion', 'Battle Master', 'Eldritch Knight'],
    subclassLabel: 'Archetype',
    isCaster: false,
    spellcastingAbility: 'int',
    defaultTheme: 'fighterSteel',
    unarmoredDefense: null,
    unarmoredNoShield: false,
    shortRestResets: ['secondWind', 'actionSurge', 'superiorityDice'],
    longRestResets: ['secondWind', 'actionSurge', 'superiorityDice', 'indomitable'],
    recommendedStats: { str: 15, dex: 12, con: 14, int: 10, wis: 13, cha: 8 },
    recommendedSkills: ['athletics', 'perception'],
    recommendedExpertise: []
  },
  Barbarian: {
    hitDice: 12,
    savingThrows: ['str', 'con'],
    skillChoices: ['animal handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    skillCount: 2,
    expertiseCount: 0,
    subclasses: ['Path of the Berserker', 'Path of the Totem Warrior'],
    subclassLabel: 'Path',
    isCaster: false,
    spellcastingAbility: null,
    defaultTheme: 'barbarianCrimson',
    unarmoredDefense: 'con',
    unarmoredNoShield: false,
    shortRestResets: [],
    longRestResets: [],
    recommendedStats: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 },
    recommendedSkills: ['athletics', 'perception'],
    recommendedExpertise: []
  },
  Monk: {
    hitDice: 8,
    savingThrows: ['str', 'dex'],
    skillChoices: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    skillCount: 2,
    expertiseCount: 0,
    subclasses: ['Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements'],
    subclassLabel: 'Tradition',
    isCaster: false,
    spellcastingAbility: null,
    defaultTheme: 'monkJade',
    unarmoredDefense: 'wis',
    unarmoredNoShield: true,
    shortRestResets: [],
    longRestResets: [],
    recommendedStats: { str: 8, dex: 15, con: 14, int: 10, wis: 13, cha: 12 },
    recommendedSkills: ['acrobatics', 'stealth'],
    recommendedExpertise: []
  },
  Rogue: {
    hitDice: 8,
    savingThrows: ['dex', 'int'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight of hand', 'stealth'],
    skillCount: 4,
    expertiseCount: 2,
    subclasses: ['Thief', 'Assassin', 'Arcane Trickster'],
    subclassLabel: 'Archetype',
    isCaster: false,
    spellcastingAbility: null,
    defaultTheme: 'roguePurple',
    unarmoredDefense: null,
    unarmoredNoShield: false,
    shortRestResets: [],
    longRestResets: [],
    recommendedStats: { str: 8, dex: 15, con: 14, int: 12, wis: 13, cha: 10 },
    recommendedSkills: ['acrobatics', 'stealth', 'perception', 'deception'],
    recommendedExpertise: ['stealth', 'perception']
  }
};

const COLOR_THEMES = {
  clericGold: {
    name: 'Cleric Gold',
    accent: '#c4a35a', accentHover: '#d4b36a', accentDim: '#8a7340',
    bg: '#1a1410', surface: '#241e16', surfaceRaised: '#2e2720',
    border: '#3d3428', text: '#e8dcc8', textDim: '#a89880',
    error: '#c45a5a', success: '#6aaa5a', inputBg: '#1e1812'
  },
  fighterSteel: {
    name: 'Fighter Steel',
    accent: '#6a9bc5', accentHover: '#7aadd5', accentDim: '#4a7090',
    bg: '#121820', surface: '#1a2230', surfaceRaised: '#222c3a',
    border: '#2e3a4d', text: '#d8e0ec', textDim: '#8898aa',
    error: '#c45a5a', success: '#6aaa5a', inputBg: '#141c28'
  },
  barbarianCrimson: {
    name: 'Barbarian Crimson',
    accent: '#c45a5a', accentHover: '#d46a6a', accentDim: '#8a4040',
    bg: '#1a1214', surface: '#241a1c', surfaceRaised: '#2e2224',
    border: '#3d2a2e', text: '#e8d0d0', textDim: '#a88888',
    error: '#c45a5a', success: '#6aaa5a', inputBg: '#1e1416'
  },
  monkJade: {
    name: 'Monk Jade',
    accent: '#5aaa6a', accentHover: '#6abb7a', accentDim: '#407848',
    bg: '#121a14', surface: '#1a241c', surfaceRaised: '#222e24',
    border: '#2e3d30', text: '#d0e8d4', textDim: '#88a890',
    error: '#c45a5a', success: '#6aaa5a', inputBg: '#141e16'
  },
  roguePurple: {
    name: 'Rogue Purple',
    accent: '#9a6ac5', accentHover: '#aa7ad5', accentDim: '#6a4890',
    bg: '#16121a', surface: '#1e1a24', surfaceRaised: '#28222e',
    border: '#362e3d', text: '#dcd0e8', textDim: '#9888a8',
    error: '#c45a5a', success: '#6aaa5a', inputBg: '#1a141e'
  }
};
