// spell-lists.js — Class spell rosters, spell slot tables, domain/oath spell tables
/* ═══════════════════════════════════════════
   SPELL SLOT TABLES
   ═══════════════════════════════════════════ */

/* Full caster table (Cleric, Wizard) — levels 1-20 */
const FULL_CASTER_SLOTS = {
  1:{1:2}, 2:{1:3}, 3:{1:4,2:2}, 4:{1:4,2:3},
  5:{1:4,2:3,3:2}, 6:{1:4,2:3,3:3}, 7:{1:4,2:3,3:3,4:1}, 8:{1:4,2:3,3:3,4:2},
  9:{1:4,2:3,3:3,4:3,5:1}, 10:{1:4,2:3,3:3,4:3,5:2},
  11:{1:4,2:3,3:3,4:3,5:2,6:1}, 12:{1:4,2:3,3:3,4:3,5:2,6:1},
  13:{1:4,2:3,3:3,4:3,5:2,6:1,7:1}, 14:{1:4,2:3,3:3,4:3,5:2,6:1,7:1},
  15:{1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1}, 16:{1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1},
  17:{1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1,9:1}, 18:{1:4,2:3,3:3,4:3,5:3,6:1,7:1,8:1,9:1},
  19:{1:4,2:3,3:3,4:3,5:3,6:2,7:1,8:1,9:1}, 20:{1:4,2:3,3:3,4:3,5:3,6:2,7:2,8:1,9:1}
};

/* Half caster table (Paladin) — levels 1-20 */
const HALF_CASTER_SLOTS = {
  1:{},
  2:{1:2}, 3:{1:3}, 4:{1:3},
  5:{1:4,2:2}, 6:{1:4,2:2}, 7:{1:4,2:3}, 8:{1:4,2:3},
  9:{1:4,2:3,3:2}, 10:{1:4,2:3,3:2}, 11:{1:4,2:3,3:3}, 12:{1:4,2:3,3:3},
  13:{1:4,2:3,3:3,4:1}, 14:{1:4,2:3,3:3,4:1}, 15:{1:4,2:3,3:3,4:2}, 16:{1:4,2:3,3:3,4:2},
  17:{1:4,2:3,3:3,4:3,5:1}, 18:{1:4,2:3,3:3,4:3,5:1},
  19:{1:4,2:3,3:3,4:3,5:2}, 20:{1:4,2:3,3:3,4:3,5:2}
};

/* Third caster table (Eldritch Knight, Arcane Trickster) — levels 3-20 */
const THIRD_CASTER_SLOTS = {
  3:{1:2}, 4:{1:3}, 5:{1:3}, 6:{1:3}, 7:{1:4,2:2}, 8:{1:4,2:2}, 9:{1:4,2:2}, 10:{1:4,2:3},
  11:{1:4,2:3}, 12:{1:4,2:3}, 13:{1:4,2:3,3:2}, 14:{1:4,2:3,3:2}, 15:{1:4,2:3,3:2}, 16:{1:4,2:3,3:3},
  17:{1:4,2:3,3:3}, 18:{1:4,2:3,3:3}, 19:{1:4,2:3,3:3,4:1}, 20:{1:4,2:3,3:3,4:1}
};

/* Third caster spells/cantrips known (shared EK/AT) */
const THIRD_CASTER_SPELLS_KNOWN = {3:3,4:4,5:4,6:4,7:5,8:6,9:6,10:7,11:8,12:8,13:9,14:10,15:10,16:11,17:11,18:11,19:12,20:13};
const THIRD_CASTER_CANTRIPS_KNOWN = {3:2,4:2,5:2,6:2,7:2,8:2,9:2,10:3,11:3,12:3,13:3,14:3,15:3,16:3,17:3,18:3,19:3,20:3};
const THIRD_CASTER_FREE_PICK_LEVELS = [3, 8, 14, 20];

/* Slot table lookup helpers */
function getFullCasterSlots(level) { return FULL_CASTER_SLOTS[Math.min(Math.max(level, 1), 20)] || { 1: 2 }; }
function getHalfCasterSlots(level) { return HALF_CASTER_SLOTS[level] || {}; }
function getThirdCasterSlots(level) { return THIRD_CASTER_SLOTS[level] || {}; }
function getThirdCasterSpellsKnown(level) { return THIRD_CASTER_SPELLS_KNOWN[level] || 0; }
function getThirdCasterCantripsKnown(level) { return THIRD_CASTER_CANTRIPS_KNOWN[level] || 0; }

/* ═══════════════════════════════════════════
   CLASS SPELL NAME ROSTERS
   ═══════════════════════════════════════════ */

/* Cleric cantrip names */
const CLERIC_CANTRIPS = ['Guidance', 'Light', 'Mending', 'Resistance', 'Sacred Flame', 'Spare the Dying', 'Thaumaturgy', 'Toll the Dead'];

/* Wizard cantrip names (16 PHB Wizard cantrips — shared with EK/AT) */
const WIZARD_CANTRIPS = ['Acid Splash', 'Blade Ward', 'Chill Touch', 'Dancing Lights', 'Fire Bolt', 'Friends', 'Light', 'Mage Hand', 'Mending', 'Message', 'Minor Illusion', 'Poison Spray', 'Prestidigitation', 'Ray of Frost', 'Shocking Grasp', 'True Strike'];

/* PHB Cleric Spell List */
const CLERIC_SPELL_LIST = [
  'Bane', 'Bless', 'Command', 'Create or Destroy Water', 'Cure Wounds',
  'Detect Evil and Good', 'Detect Magic', 'Detect Poison and Disease',
  'Guiding Bolt', 'Healing Word', 'Inflict Wounds',
  'Protection from Evil and Good', 'Purify Food and Drink', 'Sanctuary', 'Shield of Faith',
  'Aid', 'Augury', 'Blindness/Deafness', 'Calm Emotions', 'Continual Flame',
  'Enhance Ability', 'Find Traps', 'Gentle Repose', 'Hold Person',
  'Lesser Restoration', 'Locate Object', 'Prayer of Healing',
  'Protection from Poison', 'Silence', 'Spiritual Weapon', 'Warding Bond', 'Zone of Truth',
  'Animate Dead', 'Beacon of Hope', 'Bestow Curse', 'Clairvoyance',
  'Create Food and Water', 'Daylight', 'Dispel Magic', 'Feign Death',
  'Glyph of Warding', 'Magic Circle', 'Mass Healing Word', 'Meld into Stone',
  'Protection from Energy', 'Remove Curse', 'Revivify', 'Sending',
  'Speak with Dead', 'Spirit Guardians', 'Tongues', 'Water Walk',
  'Banishment', 'Control Water', 'Death Ward', 'Divination',
  'Freedom of Movement', 'Guardian of Faith', 'Locate Creature', 'Stone Shape',
  'Commune', 'Contagion', 'Dispel Evil and Good', 'Flame Strike',
  'Geas', 'Greater Restoration', 'Hallow', 'Insect Plague',
  'Legend Lore', 'Mass Cure Wounds', 'Planar Binding', 'Raise Dead', 'Scrying',
  'Blade Barrier', 'Create Undead', 'Find the Path', 'Forbiddance',
  'Harm', 'Heal', "Heroes' Feast", 'Planar Ally', 'True Seeing', 'Word of Recall',
  'Conjure Celestial', 'Divine Word', 'Etherealness', 'Fire Storm',
  'Plane Shift', 'Regenerate', 'Resurrection', 'Symbol',
  'Antimagic Field', 'Control Weather', 'Earthquake', 'Holy Aura',
  'Astral Projection', 'Gate', 'Mass Heal', 'True Resurrection'
];

/* Cleric spells filtered from SPELL_DB by CLERIC_SPELL_LIST */
const CLERIC_SPELLS = {};
CLERIC_SPELL_LIST.forEach(function(name) {
  var s = SPELL_DB.find(function(sp) { return sp.name === name; });
  if (s) {
    if (!CLERIC_SPELLS[s.level]) CLERIC_SPELLS[s.level] = [];
    CLERIC_SPELLS[s.level].push(s.name);
  }
});

/* PHB Paladin Spell List */
const PALADIN_SPELL_LIST = {
  1: ['Bless', 'Command', 'Compelled Duel', 'Cure Wounds', 'Detect Evil and Good', 'Detect Magic', 'Detect Poison and Disease', 'Divine Favor', 'Heroism', 'Protection from Evil and Good', 'Purify Food and Drink', 'Searing Smite', 'Shield of Faith', 'Thunderous Smite', 'Wrathful Smite'],
  2: ['Aid', 'Branding Smite', 'Find Steed', 'Lesser Restoration', 'Locate Object', 'Magic Weapon', 'Protection from Poison', 'Zone of Truth'],
  3: ['Aura of Vitality', 'Blinding Smite', 'Create Food and Water', 'Crusader\'s Mantle', 'Daylight', 'Dispel Magic', 'Elemental Weapon', 'Magic Circle', 'Remove Curse', 'Revivify'],
  4: ['Aura of Life', 'Aura of Purity', 'Banishment', 'Death Ward', 'Locate Creature', 'Staggering Smite'],
  5: ['Banishing Smite', 'Circle of Power', 'Destructive Wave', 'Dispel Evil and Good', 'Geas', 'Raise Dead']
};

/* Paladin spells filtered from SPELL_DB */
const PALADIN_SPELLS = {};
SPELL_DB.forEach(function(s) {
  Object.keys(PALADIN_SPELL_LIST).forEach(function(lvl) {
    if (PALADIN_SPELL_LIST[lvl].indexOf(s.name) !== -1) {
      if (!PALADIN_SPELLS[s.level]) PALADIN_SPELLS[s.level] = [];
      PALADIN_SPELLS[s.level].push(s.name);
    }
  });
});

/* PHB Wizard Spell List — levels 1-9 (name roster, data in unified SPELL_DB) */
const WIZARD_SPELL_LIST = {
  1: ['Alarm', 'Burning Hands', 'Charm Person', 'Color Spray', 'Comprehend Languages',
      'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life',
      'Feather Fall', 'Find Familiar', 'Fog Cloud', 'Grease', 'Identify',
      'Illusory Script', 'Jump', 'Longstrider', 'Mage Armor', 'Magic Missile',
      'Protection from Evil and Good', 'Ray of Sickness', 'Shield', 'Silent Image',
      'Sleep', "Tasha's Hideous Laughter", "Tenser's Floating Disk", 'Thunderwave',
      'Unseen Servant', 'Witch Bolt'],
  2: ['Alter Self', 'Arcane Lock', 'Blindness/Deafness', 'Blur', 'Cloud of Daggers',
      'Continual Flame', 'Crown of Madness', 'Darkness', 'Darkvision',
      'Detect Thoughts', 'Enlarge/Reduce', 'Flaming Sphere', 'Gentle Repose',
      'Gust of Wind', 'Hold Person', 'Invisibility', 'Knock', 'Levitate',
      'Locate Object', 'Magic Mouth', 'Magic Weapon', "Melf's Acid Arrow",
      'Mirror Image', 'Misty Step', "Nystul's Magic Aura", 'Phantasmal Force',
      'Ray of Enfeeblement', 'Rope Trick', 'Scorching Ray', 'See Invisibility',
      'Shatter', 'Spider Climb', 'Suggestion', 'Web'],
  3: ['Animate Dead', 'Bestow Curse', 'Blink', 'Clairvoyance', 'Counterspell',
      'Dispel Magic', 'Fear', 'Feign Death', 'Fireball', 'Fly', 'Gaseous Form',
      'Glyph of Warding', 'Haste', 'Hypnotic Pattern', "Leomund's Tiny Hut",
      'Lightning Bolt', 'Magic Circle', 'Major Image', 'Nondetection',
      'Phantom Steed', 'Protection from Energy', 'Remove Curse', 'Sending',
      'Sleet Storm', 'Slow', 'Stinking Cloud', 'Tongues', 'Vampiric Touch',
      'Water Breathing'],
  4: ['Arcane Eye', 'Banishment', 'Blight', 'Confusion', 'Conjure Minor Elementals',
      'Control Water', 'Dimension Door', "Evard's Black Tentacles", 'Fabricate',
      'Fire Shield', 'Greater Invisibility', 'Hallucinatory Terrain', 'Ice Storm',
      "Leomund's Secret Chest", 'Locate Creature', "Mordenkainen's Faithful Hound",
      "Mordenkainen's Private Sanctum", "Otiluke's Resilient Sphere",
      'Phantasmal Killer', 'Polymorph', 'Stone Shape', 'Stoneskin', 'Wall of Fire'],
  5: ['Animate Objects', "Bigby's Hand", 'Cloudkill', 'Cone of Cold',
      'Conjure Elemental', 'Contact Other Plane', 'Creation', 'Dominate Person',
      'Dream', 'Geas', 'Hold Monster', 'Legend Lore', 'Mislead',
      'Modify Memory', 'Passwall', 'Planar Binding', "Rary's Telepathic Bond",
      'Scrying', 'Seeming', 'Telekinesis', 'Teleportation Circle', 'Wall of Force',
      'Wall of Stone'],
  6: ['Arcane Gate', 'Chain Lightning', 'Circle of Death', 'Contingency',
      'Create Undead', 'Disintegrate', "Drawmij's Instant Summons",
      'Eyebite', 'Flesh to Stone', 'Globe of Invulnerability',
      'Guards and Wards', 'Magic Jar', 'Mass Suggestion',
      'Move Earth', "Otiluke's Freezing Sphere", "Otto's Irresistible Dance",
      'Programmed Illusion', 'Sunbeam', 'True Seeing', 'Wall of Ice'],
  7: ['Delayed Blast Fireball', 'Etherealness', 'Finger of Death',
      'Forcecage', 'Mirage Arcane', "Mordenkainen's Magnificent Mansion",
      "Mordenkainen's Sword", 'Plane Shift', 'Prismatic Spray',
      'Project Image', 'Reverse Gravity', 'Sequester', 'Simulacrum',
      'Symbol', 'Teleport'],
  8: ['Antimagic Field', 'Antipathy/Sympathy', 'Clone', 'Control Weather',
      'Demiplane', 'Dominate Monster', 'Feeblemind', 'Incendiary Cloud',
      'Maze', 'Mind Blank', 'Power Word Stun', 'Sunburst',
      'Telepathy', 'Trap the Soul'],
  9: ['Astral Projection', 'Foresight', 'Gate', 'Imprisonment',
      'Meteor Swarm', 'Power Word Kill', 'Prismatic Wall',
      'Shapechange', 'Time Stop', 'True Polymorph', 'Weird', 'Wish']
};

/* ═══════════════════════════════════════════
   DOMAIN / OATH SPELL TABLES
   ═══════════════════════════════════════════ */

/* Life Domain always-prepared spells */
const LIFE_DOMAIN_SPELLS = {
  1: ['Bless', 'Cure Wounds'],
  3: ['Lesser Restoration', 'Spiritual Weapon'],
  5: ['Beacon of Hope', 'Revivify'],
  7: ['Death Ward', 'Guardian of Faith'],
  9: ['Mass Cure Wounds', 'Raise Dead']
};

/* Paladin Oath spell tables */
const OATH_SPELLS = {
  'Oath of Devotion': {
    3: ['Protection from Evil and Good', 'Sanctuary'],
    5: ['Lesser Restoration', 'Zone of Truth'],
    9: ['Beacon of Hope', 'Dispel Magic'],
    13: ['Freedom of Movement', 'Guardian of Faith'],
    17: ['Commune', 'Flame Strike']
  },
  'Oath of the Ancients': {
    3: ['Ensnaring Strike', 'Speak with Animals'],
    5: ['Moonbeam', 'Misty Step'],
    9: ['Plant Growth', 'Protection from Energy'],
    13: ['Ice Storm', 'Stoneskin'],
    17: ['Commune with Nature', 'Tree Stride']
  },
  'Oath of Vengeance': {
    3: ["Hunter's Mark", 'Bane'],
    5: ['Hold Person', 'Misty Step'],
    9: ['Haste', 'Protection from Energy'],
    13: ['Banishment', 'Dimension Door'],
    17: ['Hold Monster', 'Scrying']
  }
};
