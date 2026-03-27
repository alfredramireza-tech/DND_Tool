// cleric.js — Cleric class data, progression, feature descriptions
/* ═══════════════════════════════════════════
   CLERIC DATA
   ═══════════════════════════════════════════ */

/* Character-level to spell-level mapping for domain spells */
const CLERIC_LEVEL_TO_SPELL_LEVEL = { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5 };

/* Feature descriptions for Cleric / Life Domain */
const CLERIC_FEATURE_DESCRIPTIONS = {
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

/* Cleric progression: what happens at each level 2-20 */
const CLERIC_PROGRESSION = {
  2: { features: ['Channel Divinity: Turn Undead', 'Channel Divinity: Preserve Life'], asi: false, newCantrip: false, spellSlots: {1: 3}, channelDivinityUses: 1, proficiencyBonus: 2 },
  3: { features: [], asi: false, newCantrip: false, spellSlots: {1: 4, 2: 2}, channelDivinityUses: 1, proficiencyBonus: 2, domainSpells: {3: ['Lesser Restoration', 'Spiritual Weapon']}, newSpellLevel: 2 },
  4: { features: [], asi: true, newCantrip: true, spellSlots: {1:4, 2:3}, channelDivinityUses: 1, proficiencyBonus: 2 },
  5: { features: ['Destroy Undead (CR 1/2)'], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:2}, channelDivinityUses: 1, proficiencyBonus: 3, domainSpells: {5: ['Beacon of Hope', 'Revivify']}, newSpellLevel: 3 },
  6: { features: ['Blessed Healer'], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3}, channelDivinityUses: 2, proficiencyBonus: 3 },
  7: { features: [], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:1}, channelDivinityUses: 2, proficiencyBonus: 3, domainSpells: {7: ['Death Ward', 'Guardian of Faith']}, newSpellLevel: 4 },
  8: { features: ['Destroy Undead (CR 1)', 'Divine Strike'], asi: true, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:2}, channelDivinityUses: 2, proficiencyBonus: 3 },
  9: { features: [], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:1}, channelDivinityUses: 2, proficiencyBonus: 4, domainSpells: {9: ['Mass Cure Wounds', 'Raise Dead']}, newSpellLevel: 5 },
  10: { features: ['Divine Intervention'], asi: false, newCantrip: true, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2}, channelDivinityUses: 2, proficiencyBonus: 4 },
  11: { features: ['Destroy Undead (CR 2)'], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1}, channelDivinityUses: 2, proficiencyBonus: 4, newSpellLevel: 6 },
  12: { features: [], asi: true, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1}, channelDivinityUses: 2, proficiencyBonus: 4 },
  13: { features: [], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1}, channelDivinityUses: 2, proficiencyBonus: 5, newSpellLevel: 7 },
  14: { features: ['Destroy Undead (CR 3)', 'Divine Strike Improvement'], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1}, channelDivinityUses: 2, proficiencyBonus: 5 },
  15: { features: [], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1}, channelDivinityUses: 2, proficiencyBonus: 5, newSpellLevel: 8 },
  16: { features: [], asi: true, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1}, channelDivinityUses: 2, proficiencyBonus: 5 },
  17: { features: ['Destroy Undead (CR 4)', 'Supreme Healing'], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1, 9:1}, channelDivinityUses: 2, proficiencyBonus: 6, newSpellLevel: 9 },
  18: { features: ['Channel Divinity (3/rest)'], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:3, 6:1, 7:1, 8:1, 9:1}, channelDivinityUses: 3, proficiencyBonus: 6 },
  19: { features: [], asi: true, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:3, 6:2, 7:1, 8:1, 9:1}, channelDivinityUses: 3, proficiencyBonus: 6 },
  20: { features: ['Divine Intervention Improvement'], asi: false, newCantrip: false, spellSlots: {1:4, 2:3, 3:3, 4:3, 5:3, 6:2, 7:2, 8:1, 9:1}, channelDivinityUses: 3, proficiencyBonus: 6 }
};
