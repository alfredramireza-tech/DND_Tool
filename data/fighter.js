// fighter.js — Fighter class data, fighting styles, maneuvers, EK spells, progression
/* ═══════════════════════════════════════════
   FIGHTER DATA
   ═══════════════════════════════════════════ */

const FIGHTING_STYLES = {
  'Archery': { effect: '+2 to attack rolls with ranged weapons', mechanical: 'ranged_attack_bonus' },
  'Defense': { effect: '+1 AC while wearing armor', mechanical: 'ac_bonus_armor' },
  'Dueling': { effect: '+2 damage with one-handed melee weapon (no other weapon in other hand)', mechanical: 'dueling_damage' },
  'Great Weapon Fighting': { effect: 'Reroll 1s and 2s on damage dice with two-handed/versatile melee weapons (you choose)', mechanical: 'gwf_reroll' },
  'Protection': { effect: 'Reaction: impose disadvantage on attack vs. creature within 5ft (requires shield)', mechanical: 'reference' },
  'Two-Weapon Fighting': { effect: 'Add ability modifier to damage of off-hand attack when dual wielding', mechanical: 'reference' }
};

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

/* Eldritch Knight spell slot progression */
const EK_SPELL_SLOTS = {
  3:{1:2}, 4:{1:3}, 5:{1:3}, 6:{1:3}, 7:{1:4,2:2}, 8:{1:4,2:2}, 9:{1:4,2:2}, 10:{1:4,2:3},
  11:{1:4,2:3}, 12:{1:4,2:3}, 13:{1:4,2:3,3:2}, 14:{1:4,2:3,3:2}, 15:{1:4,2:3,3:2}, 16:{1:4,2:3,3:3},
  17:{1:4,2:3,3:3}, 18:{1:4,2:3,3:3}, 19:{1:4,2:3,3:3,4:1}, 20:{1:4,2:3,3:3,4:1}
};

const EK_SPELLS_KNOWN = {3:3,4:4,5:4,6:4,7:5,8:6,9:6,10:7,11:8,12:8,13:9,14:10,15:10,16:11,17:11,18:11,19:12,20:13};
const EK_CANTRIPS_KNOWN = {3:2,4:2,5:2,6:2,7:2,8:2,9:2,10:3,11:3,12:3,13:3,14:3,15:3,16:3,17:3,18:3,19:3,20:3};
/* Levels where EK can pick from ANY school (not just Abj/Evo) */
const EK_FREE_PICK_LEVELS = [3, 8, 14, 20];

/* Wizard Cantrips for Eldritch Knight */
const WIZARD_CANTRIPS = [
  {name:'Acid Splash',school:'Conjuration',castingTime:'1 action',range:'60 feet',components:'V, S',duration:'Instantaneous',description:'Hurl a bubble of acid. One creature within range, or two creatures within 5ft of each other, must make a DEX save or take 1d6 acid damage. Scales: 2d6 at 5th, 3d6 at 11th, 4d6 at 17th.',save:'dex',tags:['damage']},
  {name:'Blade Ward',school:'Abjuration',castingTime:'1 action',range:'Self',components:'V, S',duration:'1 round',description:'You gain resistance to bludgeoning, piercing, and slashing damage from weapon attacks until the end of your next turn.',tags:['defense']},
  {name:'Chill Touch',school:'Necromancy',castingTime:'1 action',range:'120 feet',components:'V, S',duration:'1 round',description:'Ranged spell attack. 1d8 necrotic damage, target can\'t regain HP until start of your next turn. Undead also have disadvantage on attacks against you. Scales: 2d8 at 5th, 3d8 at 11th, 4d8 at 17th.',attack:true,tags:['damage']},
  {name:'Dancing Lights',school:'Evocation',castingTime:'1 action',range:'120 feet',components:'V, S, M (a bit of phosphorus or wychwood, or a glowworm)',duration:'Concentration, up to 1 minute',description:'Create up to four torch-sized lights within range. Each sheds dim light in a 10ft radius. You can move them up to 60ft as a bonus action.',tags:['utility','concentration']},
  {name:'Fire Bolt',school:'Evocation',castingTime:'1 action',range:'120 feet',components:'V, S',duration:'Instantaneous',description:'Ranged spell attack. 1d10 fire damage. Ignites unattended flammable objects. Scales: 2d10 at 5th, 3d10 at 11th, 4d10 at 17th.',attack:true,tags:['damage']},
  {name:'Friends',school:'Enchantment',castingTime:'1 action',range:'Self',components:'S, M (a small amount of makeup)',duration:'Concentration, up to 1 minute',description:'You have advantage on all CHA checks directed at one creature that isn\'t hostile. When the spell ends, the creature realizes you used magic and becomes hostile.',tags:['social','concentration']},
  {name:'Light',school:'Evocation',castingTime:'1 action',range:'Touch',components:'V, M (a firefly or phosphorescent moss)',duration:'1 hour',description:'Touch an object no larger than 10ft in any dimension. It sheds bright light in a 20ft radius and dim light for 20ft beyond. Can be colored. Covering it blocks the light.',tags:['utility']},
  {name:'Mage Hand',school:'Conjuration',castingTime:'1 action',range:'30 feet',components:'V, S',duration:'1 minute',description:'A spectral hand appears. You can use it to manipulate objects, open doors, retrieve items, or pour out vials. It can carry up to 10 pounds and can\'t attack or activate magic items.',tags:['utility']},
  {name:'Mending',school:'Transmutation',castingTime:'1 minute',range:'Touch',components:'V, S, M (two lodestones)',duration:'Instantaneous',description:'Repair a single break or tear in an object you touch, as long as the break is no larger than 1 foot in any dimension.',tags:['utility']},
  {name:'Message',school:'Transmutation',castingTime:'1 action',range:'120 feet',components:'V, S, M (a short piece of copper wire)',duration:'1 round',description:'Whisper a message to a creature within range. Only the target hears it and can reply in a whisper. Can pass through solid objects if you know the target.',tags:['utility']},
  {name:'Minor Illusion',school:'Illusion',castingTime:'1 action',range:'30 feet',components:'S, M (a bit of fleece)',duration:'1 minute',description:'Create a sound or image of an object within range. The image can\'t create sensory effects. Physical interaction reveals it as an illusion. Investigation check vs. your spell DC to discern.',tags:['utility']},
  {name:'Poison Spray',school:'Conjuration',castingTime:'1 action',range:'10 feet',components:'V, S',duration:'Instantaneous',description:'A puff of noxious gas at one creature within range. CON save or take 1d12 poison damage. Scales: 2d12 at 5th, 3d12 at 11th, 4d12 at 17th.',save:'con',tags:['damage']},
  {name:'Prestidigitation',school:'Transmutation',castingTime:'1 action',range:'10 feet',components:'V, S',duration:'Up to 1 hour',description:'Minor magical trick. Create sensory effect, light/snuff a flame, clean/soil a small object, chill/warm/flavor material, make a color/mark/symbol appear for 1 hour. Up to 3 simultaneous non-instantaneous effects.',tags:['utility']},
  {name:'Ray of Frost',school:'Evocation',castingTime:'1 action',range:'60 feet',components:'V, S',duration:'Instantaneous',description:'Ranged spell attack. 1d8 cold damage and speed reduced by 10ft until start of your next turn. Scales: 2d8 at 5th, 3d8 at 11th, 4d8 at 17th.',attack:true,tags:['damage']},
  {name:'Shocking Grasp',school:'Evocation',castingTime:'1 action',range:'Touch',components:'V, S',duration:'Instantaneous',description:'Melee spell attack with advantage if target wears metal armor. 1d8 lightning damage and target can\'t take reactions until start of its next turn. Scales: 2d8 at 5th, 3d8 at 11th, 4d8 at 17th.',attack:true,tags:['damage']},
  {name:'True Strike',school:'Divination',castingTime:'1 action',range:'30 feet',components:'S',duration:'Concentration, up to 1 round',description:'You gain advantage on your first attack roll against the target on your next turn.',tags:['buff','concentration']}
];

/* Wizard Spells levels 1-4 for EK (PHB only, per amendment: no Absorb Elements, Leomund's is Evocation) */
const WIZARD_SPELL_DB = [
  // 1st Level — Abjuration
  {name:'Alarm',level:1,school:'Abjuration',castingTime:'1 minute',range:'30 feet',components:'V, S, M (a tiny bell and a piece of fine silver wire)',duration:'8 hours',description:'Set a ward on a 20ft cube area. Alerts you (mental or audible alarm) when a Tiny or larger creature enters.',tags:['utility','ritual']},
  {name:'Mage Armor',level:1,school:'Abjuration',castingTime:'1 action',range:'Touch',components:'V, S, M (a piece of cured leather)',duration:'8 hours',description:'Touch a willing creature not wearing armor. Its AC becomes 13 + DEX modifier. The spell ends if the target dons armor or you dismiss it.',tags:['defense']},
  {name:'Protection from Evil and Good',level:1,school:'Abjuration',castingTime:'1 action',range:'Touch',components:'V, S, M (holy water or powdered silver and iron)',duration:'Concentration, up to 10 minutes',description:'Touch a willing creature. Aberrations, celestials, elementals, fey, fiends, and undead have disadvantage on attack rolls against it. The target also can\'t be charmed, frightened, or possessed by them.',tags:['defense','concentration']},
  {name:'Shield',level:1,school:'Abjuration',castingTime:'1 reaction (when hit by attack or targeted by magic missile)',range:'Self',components:'V, S',duration:'1 round',description:'An invisible barrier of magical force appears. You get +5 bonus to AC until the start of your next turn, including against the triggering attack. Also blocks Magic Missile.',tags:['defense']},
  // 1st Level — Evocation
  {name:'Burning Hands',level:1,school:'Evocation',castingTime:'1 action',range:'Self (15-foot cone)',components:'V, S',duration:'Instantaneous',description:'15ft cone of flames. Each creature makes a DEX save. 3d6 fire damage on failure, half on success. Ignites unattended flammable objects.',save:'dex',upcast:{perLevel:'+1d6 damage',note:'Add 1d6 fire damage per slot level above 1st'},tags:['damage']},
  {name:'Chromatic Orb',level:1,school:'Evocation',castingTime:'1 action',range:'90 feet',components:'V, S, M (a diamond worth at least 50 gp)',duration:'Instantaneous',description:'Ranged spell attack. Choose acid, cold, fire, lightning, poison, or thunder. 3d8 damage of chosen type.',attack:true,upcast:{perLevel:'+1d8 damage',note:'Add 1d8 damage per slot level above 1st'},tags:['damage']},
  {name:'Magic Missile',level:1,school:'Evocation',castingTime:'1 action',range:'120 feet',components:'V, S',duration:'Instantaneous',description:'Three darts of magical force. Each dart hits a creature you can see and deals 1d4+1 force damage. Can target same or different creatures.',upcast:{perLevel:'+1 dart',note:'One additional dart per slot level above 1st'},tags:['damage']},
  {name:'Thunderwave',level:1,school:'Evocation',castingTime:'1 action',range:'Self (15-foot cube)',components:'V, S',duration:'Instantaneous',description:'Wave of thunderous force. Each creature in 15ft cube makes CON save. 2d8 thunder damage on failure (half on success), pushed 10ft away. Audible 300ft away.',save:'con',upcast:{perLevel:'+1d8 damage',note:'Add 1d8 thunder damage per slot level above 1st'},tags:['damage']},
  {name:'Witch Bolt',level:1,school:'Evocation',castingTime:'1 action',range:'30 feet',components:'V, S, M (a twig from a tree that has been struck by lightning)',duration:'Concentration, up to 1 minute',description:'Ranged spell attack. 1d12 lightning damage. On subsequent turns, use action to deal 1d12 automatically. Ends if target moves out of range, you don\'t use your action for it, or you lose concentration.',attack:true,upcast:{perLevel:'+1d12 initial damage',note:'Add 1d12 to initial damage per slot level above 1st'},tags:['damage','concentration']},
  // 1st Level — Other Schools
  {name:'Charm Person',level:1,school:'Enchantment',castingTime:'1 action',range:'30 feet',components:'V, S',duration:'1 hour',description:'A humanoid must make a WIS save (advantage if you or allies are fighting it). On failure, it is charmed by you — regards you as a friendly acquaintance. It knows it was charmed when the spell ends.',save:'wis',upcast:{perLevel:'+1 target',note:'One additional target per slot level above 1st'},tags:['social']},
  {name:'Color Spray',level:1,school:'Illusion',castingTime:'1 action',range:'Self (15-foot cone)',components:'V, S, M (a pinch of powder or sand colored red, yellow, and blue)',duration:'1 round',description:'6d10 HP of creatures are affected, starting with the lowest current HP. Each affected creature is blinded until the end of your next turn.',upcast:{perLevel:'+2d10 HP affected',note:'Add 2d10 HP worth of creatures affected per slot level above 1st'},tags:['debuff']},
  {name:'Comprehend Languages',level:1,school:'Divination',castingTime:'1 action',range:'Self',components:'V, S, M (a pinch of soot and salt)',duration:'1 hour',description:'You understand the literal meaning of any spoken language you hear, and written language you touch. Does not decode ciphers or reveal messages in non-language symbols.',tags:['utility','ritual']},
  {name:'Detect Magic',level:1,school:'Divination',castingTime:'1 action',range:'Self',components:'V, S',duration:'Concentration, up to 10 minutes',description:'Sense the presence of magic within 30 feet. You can use your action to see a faint aura and learn its school of magic.',tags:['utility','concentration','ritual']},
  {name:'Disguise Self',level:1,school:'Illusion',castingTime:'1 action',range:'Self',components:'V, S',duration:'1 hour',description:'Make yourself look different — including clothing, armor, weapons, and other belongings. You can seem up to 1 foot shorter or taller and can appear thin, fat, or in between. Investigation check vs. your spell DC to see through.',tags:['utility']},
  {name:'Expeditious Retreat',level:1,school:'Transmutation',castingTime:'1 bonus action',range:'Self',components:'V, S',duration:'Concentration, up to 10 minutes',description:'Take the Dash action as a bonus action on each of your turns until the spell ends.',tags:['utility','concentration']},
  {name:'False Life',level:1,school:'Necromancy',castingTime:'1 action',range:'Self',components:'V, S, M (a small amount of alcohol or distilled spirits)',duration:'1 hour',description:'Gain 1d4+4 temporary hit points for the duration.',upcast:{perLevel:'+5 temp HP',note:'Gain 5 additional temporary HP per slot level above 1st'},tags:['defense']},
  {name:'Feather Fall',level:1,school:'Transmutation',castingTime:'1 reaction (when you or a creature within 60ft falls)',range:'60 feet',components:'V, M (a small feather or piece of down)',duration:'1 minute',description:'Up to 5 falling creatures\' rate of descent slows to 60ft per round. If they land before the spell ends, they take no falling damage and can land on their feet.',tags:['utility']},
  {name:'Find Familiar',level:1,school:'Conjuration',castingTime:'1 hour',range:'10 feet',components:'V, S, M (10gp worth of charcoal, incense, and herbs consumed)',duration:'Instantaneous',description:'Gain the service of a familiar (bat, cat, crab, frog, hawk, lizard, octopus, owl, poisonous snake, fish, rat, raven, sea horse, spider, or weasel). Can communicate telepathically within 100ft. As an action, see through its eyes/ears. Can deliver touch spells.',tags:['utility','ritual']},
  {name:'Fog Cloud',level:1,school:'Conjuration',castingTime:'1 action',range:'120 feet',components:'V, S',duration:'Concentration, up to 1 hour',description:'Create a 20ft-radius sphere of fog centered on a point within range. The area is heavily obscured. Dispersed by strong wind.',upcast:{perLevel:'+20ft radius',note:'Radius increases by 20ft per slot level above 1st'},tags:['utility','concentration']},
  {name:'Grease',level:1,school:'Conjuration',castingTime:'1 action',range:'60 feet',components:'V, S, M (a bit of pork rind or butter)',duration:'1 minute',description:'10ft square of slippery grease. DEX save or fall prone. Creatures entering or ending their turn there must also save.',save:'dex',tags:['control']},
  {name:'Identify',level:1,school:'Divination',castingTime:'1 minute',range:'Touch',components:'V, S, M (a pearl worth at least 100 gp and an owl feather)',duration:'Instantaneous',description:'Learn the properties of one magic item or magic-affected object. Learn what spells are affecting a creature you touch.',tags:['utility','ritual']},
  {name:'Illusory Script',level:1,school:'Illusion',castingTime:'1 minute',range:'Touch',components:'S, M (a lead-based ink worth at least 10 gp, consumed)',duration:'10 days',description:'Write on parchment that appears as normal writing to you and designated creatures, but appears as unintelligible or a different message to all others. CHA save to read it; on failure, creature is unable to read it for the duration.',tags:['utility','ritual']},
  {name:'Jump',level:1,school:'Transmutation',castingTime:'1 action',range:'Touch',components:'V, S, M (a grasshopper\'s hind leg)',duration:'1 minute',description:'Touch a creature. Its jump distance is tripled until the spell ends.',tags:['utility']},
  {name:'Longstrider',level:1,school:'Transmutation',castingTime:'1 action',range:'Touch',components:'V, S, M (a pinch of dirt)',duration:'1 hour',description:'Touch a creature. Its speed increases by 10ft until the spell ends.',upcast:{perLevel:'+1 target',note:'One additional target per slot level above 1st'},tags:['utility']},
  {name:'Silent Image',level:1,school:'Illusion',castingTime:'1 action',range:'60 feet',components:'V, S, M (a bit of fleece)',duration:'Concentration, up to 10 minutes',description:'Create the image of an object, creature, or visible phenomenon within a 15ft cube. It looks real but has no sound, smell, or texture. Move it within range as an action. Investigation check vs. your spell DC.',tags:['utility','concentration']},
  {name:'Sleep',level:1,school:'Enchantment',castingTime:'1 action',range:'90 feet',components:'V, S, M (a pinch of fine sand, rose petals, or a cricket)',duration:'1 minute',description:'Roll 5d8; that total is the HP of creatures this spell can affect, starting with the lowest current HP creature within 20ft of a point. Each affected creature falls unconscious. Undead and immune-to-charm creatures unaffected.',upcast:{perLevel:'+2d8 HP affected',note:'Add 2d8 to the HP roll per slot level above 1st'},tags:['control']},
  {name:"Tasha's Hideous Laughter",level:1,school:'Enchantment',castingTime:'1 action',range:'30 feet',components:'V, S, M (tiny tarts and a feather)',duration:'Concentration, up to 1 minute',description:'Target must make WIS save or fall prone, incapacitated, and unable to stand up for the duration. Creature with INT 4 or less is unaffected. Repeat save at end of each turn and when it takes damage.',save:'wis',tags:['control','concentration']},
  {name:'Unseen Servant',level:1,school:'Conjuration',castingTime:'1 action',range:'60 feet',components:'V, S, M (a piece of string and a bit of wood)',duration:'1 hour',description:'Create an invisible, mindless force that performs simple tasks at your command. It has AC 10, 1 HP, STR 2, and can\'t attack. It can carry up to 30 pounds or push 60.',tags:['utility','ritual']},
  // 2nd Level — Abjuration
  {name:'Arcane Lock',level:2,school:'Abjuration',castingTime:'1 action',range:'Touch',components:'V, S, M (gold dust worth at least 25 gp, consumed)',duration:'Until dispelled',description:'Touch a closed door, window, gate, chest, or other entryway. It becomes locked. You and designated creatures can open it normally. Can be suppressed for 1 minute by Knock spell. Dispel Magic also works.',tags:['utility']},
  // 2nd Level — Evocation
  {name:'Darkness',level:2,school:'Evocation',castingTime:'1 action',range:'60 feet',components:'V, M (bat fur and a drop of pitch or piece of coal)',duration:'Concentration, up to 10 minutes',description:'Magical darkness spreads from a point in a 15ft-radius sphere. Darkvision can\'t see through it. Nonmagical light can\'t illuminate it. Cancels and is cancelled by light of 2nd level or higher.',tags:['utility','concentration']},
  {name:'Flaming Sphere',level:2,school:'Evocation',castingTime:'1 action',range:'60 feet',components:'V, S, M (a bit of tallow, a pinch of brimstone, and a dusting of powdered iron)',duration:'Concentration, up to 1 minute',description:'5ft-diameter sphere of fire. Creatures within 5ft must make DEX save: 2d6 fire damage on failure, half on success. As a bonus action, move it 30ft. Ignites flammable objects.',save:'dex',upcast:{perLevel:'+1d6 damage',note:'Add 1d6 fire damage per slot level above 2nd'},tags:['damage','concentration']},
  {name:'Gust of Wind',level:2,school:'Evocation',castingTime:'1 action',range:'Self (60-foot line)',components:'V, S, M (a legume seed)',duration:'Concentration, up to 1 minute',description:'A 60ft long, 10ft wide line of strong wind blasts from you. Creatures in the line must make STR save or be pushed 15ft away. Movement against the wind costs double. Disperses gas/vapor.',save:'str',tags:['control','concentration']},
  {name:'Scorching Ray',level:2,school:'Evocation',castingTime:'1 action',range:'120 feet',components:'V, S',duration:'Instantaneous',description:'Create three rays of fire. Make a ranged spell attack for each. Each ray deals 2d6 fire damage. Target same or different creatures.',attack:true,upcast:{perLevel:'+1 ray',note:'One additional ray per slot level above 2nd'},tags:['damage']},
  {name:'Shatter',level:2,school:'Evocation',castingTime:'1 action',range:'60 feet',components:'V, S, M (a chip of mica)',duration:'Instantaneous',description:'A sudden loud ringing noise in a 10ft-radius sphere. Each creature makes CON save: 3d8 thunder damage on failure, half on success. Creatures made of stone, crystal, or metal have disadvantage. Nonmagical objects also take damage.',save:'con',upcast:{perLevel:'+1d8 damage',note:'Add 1d8 thunder damage per slot level above 2nd'},tags:['damage']},
  // 2nd Level — Other Schools
  {name:'Blindness/Deafness',level:2,school:'Necromancy',castingTime:'1 action',range:'30 feet',components:'V',duration:'1 minute',description:'Blind or deafen a creature. CON save; on failure, affected for the duration. Repeat save at end of each turn.',save:'con',upcast:{perLevel:'+1 target',note:'One additional target per slot level above 2nd'},tags:['debuff']},
  {name:'Blur',level:2,school:'Illusion',castingTime:'1 action',range:'Self',components:'V',duration:'Concentration, up to 1 minute',description:'Your body becomes blurred. Any creature has disadvantage on attack rolls against you. A creature immune to this effect can see through illusions or has truesight.',tags:['defense','concentration']},
  {name:'Crown of Madness',level:2,school:'Enchantment',castingTime:'1 action',range:'120 feet',components:'V, S',duration:'Concentration, up to 1 minute',description:'A humanoid must make WIS save or be charmed. Before each of its turns, it must make a melee attack against a creature you choose. If no target, it acts normally. Repeat save at end of each turn.',save:'wis',tags:['control','concentration']},
  {name:'Darkvision',level:2,school:'Transmutation',castingTime:'1 action',range:'Touch',components:'V, S, M (either a pinch of dried carrot or an agate)',duration:'8 hours',description:'Touch a willing creature. It gains darkvision out to 60 feet for the duration.',tags:['utility']},
  {name:'Enlarge/Reduce',level:2,school:'Transmutation',castingTime:'1 action',range:'30 feet',components:'V, S, M (a pinch of powdered iron)',duration:'Concentration, up to 1 minute',description:'Enlarge: target doubles in size, advantage on STR checks/saves, +1d4 weapon damage. Reduce: target halves in size, disadvantage on STR checks/saves, -1d4 weapon damage. Unwilling: CON save.',save:'con',tags:['utility','concentration']},
  {name:'Gentle Repose',level:2,school:'Necromancy',castingTime:'1 action',range:'Touch',components:'V, S, M (a pinch of salt and one copper piece placed on each eye)',duration:'10 days',description:'Touch a corpse. It is protected from decay and can\'t become undead. Also extends the time limit on raising the dead.',tags:['utility','ritual']},
  {name:'Hold Person',level:2,school:'Enchantment',castingTime:'1 action',range:'60 feet',components:'V, S, M (a small, straight piece of iron)',duration:'Concentration, up to 1 minute',description:'A humanoid must make WIS save or be paralyzed for the duration. Repeat save at end of each turn.',save:'wis',upcast:{perLevel:'+1 target',note:'One additional target per slot level above 2nd'},tags:['control','concentration']},
  {name:'Invisibility',level:2,school:'Illusion',castingTime:'1 action',range:'Touch',components:'V, S, M (an eyelash encased in gum arabic)',duration:'Concentration, up to 1 hour',description:'Touch a creature. It becomes invisible until the spell ends. Anything the target is wearing or carrying is also invisible. The spell ends if the target attacks or casts a spell.',upcast:{perLevel:'+1 target',note:'One additional target per slot level above 2nd'},tags:['utility','concentration']},
  {name:'Knock',level:2,school:'Transmutation',castingTime:'1 action',range:'60 feet',components:'V',duration:'Instantaneous',description:'Choose an object you can see. If it is locked, it becomes unlocked. If it has multiple locks, only one is unlocked. If held shut by Arcane Lock, that spell is suppressed for 10 minutes. The spell produces a loud knock audible within 300ft.',tags:['utility']},
  {name:'Levitate',level:2,school:'Transmutation',castingTime:'1 action',range:'60 feet',components:'V, S, M (either a small leather loop or a piece of golden wire bent into a cup shape with a long shank on one end)',duration:'Concentration, up to 10 minutes',description:'One creature or object (up to 500 lbs) rises vertically up to 20ft and remains suspended. Target can move only by pushing or pulling against fixed objects. Unwilling: CON save.',save:'con',tags:['utility','concentration']},
  {name:'Magic Mouth',level:2,school:'Illusion',castingTime:'1 minute',range:'30 feet',components:'V, S, M (a small bit of honeycomb and jade dust worth at least 10 gp, consumed)',duration:'Until dispelled',description:'Implant a message within an object. When triggered by conditions you set, a mouth appears and speaks the message (up to 25 words). You can make the spell end after the message is delivered or have it remain.',tags:['utility','ritual']},
  {name:'Magic Weapon',level:2,school:'Transmutation',castingTime:'1 bonus action',range:'Touch',components:'V, S',duration:'Concentration, up to 1 hour',description:'Touch a nonmagical weapon. It becomes +1 (attack and damage). At 4th-level slot: +2. At 6th-level slot: +3.',upcast:{perLevel:'Increased bonus',note:'+2 bonus at 4th level slot, +3 at 6th level slot'},tags:['buff','concentration']},
  {name:'Misty Step',level:2,school:'Conjuration',castingTime:'1 bonus action',range:'Self',components:'V',duration:'Instantaneous',description:'Teleport up to 30 feet to an unoccupied space that you can see.',tags:['utility']},
  {name:'Mirror Image',level:2,school:'Illusion',castingTime:'1 action',range:'Self',components:'V, S',duration:'1 minute',description:'Three illusory duplicates appear. When attacked, roll d20: 6+ hits a duplicate (AC 10+DEX mod). Duplicates have 1 HP. With 3 remaining: 6+. With 2: 8+. With 1: 11+.',tags:['defense']},
  {name:'Phantasmal Force',level:2,school:'Illusion',castingTime:'1 action',range:'60 feet',components:'V, S, M (a bit of fleece)',duration:'Concentration, up to 1 minute',description:'Craft an illusion in a creature\'s mind (10ft cube). INT save. On failure, the target perceives the illusion as real and rationalizes irrational outcomes. Can deal 1d6 psychic damage per turn. Investigation check to disbelieve.',save:'int',tags:['control','concentration']},
  {name:'Ray of Enfeeblement',level:2,school:'Necromancy',castingTime:'1 action',range:'60 feet',components:'V, S',duration:'Concentration, up to 1 minute',description:'Ranged spell attack. On hit, target deals only half damage with STR-based weapon attacks. Target makes CON save at end of each turn to end the effect.',attack:true,tags:['debuff','concentration']},
  {name:'Rope Trick',level:2,school:'Transmutation',castingTime:'1 action',range:'Touch',components:'V, S, M (powdered corn extract and a twisted loop of parchment)',duration:'1 hour',description:'Touch a length of rope up to 60ft. One end rises into an extradimensional space that can hold up to 8 Medium creatures. The rope can be pulled into the space, making it invisible from outside. Attacks and spells can\'t cross.',tags:['utility']},
  {name:'See Invisibility',level:2,school:'Divination',castingTime:'1 action',range:'Self',components:'V, S, M (a pinch of talc and a small sprinkling of powdered silver)',duration:'1 hour',description:'You can see invisible creatures and objects, and see into the Ethereal Plane within 60 feet.',tags:['utility']},
  {name:'Spider Climb',level:2,school:'Transmutation',castingTime:'1 action',range:'Touch',components:'V, S, M (a drop of bitumen and a spider)',duration:'Concentration, up to 1 hour',description:'Touch a willing creature. It gains the ability to move up, down, and across vertical surfaces and upside down along ceilings, with hands free. Climbing speed equal to walking speed.',tags:['utility','concentration']},
  {name:'Suggestion',level:2,school:'Enchantment',castingTime:'1 action',range:'30 feet',components:'V, M (a snake\'s tongue and either a bit of honeycomb or a drop of sweet oil)',duration:'Concentration, up to 8 hours',description:'Suggest a course of activity (limited to a sentence or two) to a creature that can hear and understand you. WIS save. The suggestion must be worded to sound reasonable. The creature pursues the course of action for the duration.',save:'wis',tags:['control','concentration']},
  {name:'Web',level:2,school:'Conjuration',castingTime:'1 action',range:'60 feet',components:'V, S, M (a bit of spiderweb)',duration:'Concentration, up to 1 hour',description:'Conjure a mass of thick, sticky webbing in a 20ft cube. DEX save or restrained. Difficult terrain, lightly obscured. Restrained creatures can use action to make STR check vs. your spell DC to break free. Flammable: burns away in 1 round, dealing 2d4 fire damage to anyone restrained in it.',save:'dex',tags:['control','concentration']},
  // 3rd Level — Abjuration
  {name:'Counterspell',level:3,school:'Abjuration',castingTime:'1 reaction (when a creature within 60ft casts a spell)',range:'60 feet',components:'S',duration:'Instantaneous',description:'Attempt to interrupt a creature casting a spell. If the spell is 3rd level or lower, it fails. For higher levels, make an ability check (DC 10 + spell level). Success: the spell fails.',tags:['defense']},
  {name:'Dispel Magic',level:3,school:'Abjuration',castingTime:'1 action',range:'120 feet',components:'V, S',duration:'Instantaneous',description:'Choose one creature, object, or magical effect within range. Any spell of 3rd level or lower ends. For higher levels, make an ability check (DC 10 + spell level).',upcast:{perLevel:'Auto-dispel higher levels',note:'Automatically ends spells of the slot level used or lower'},tags:['utility']},
  {name:'Glyph of Warding',level:3,school:'Abjuration',castingTime:'1 hour',range:'Touch',components:'V, S, M (incense and powdered diamond worth at least 200 gp, consumed)',duration:'Until dispelled or triggered',description:'Inscribe a glyph on a surface or within an object. When triggered, it can either deal 5d8 acid/cold/fire/lightning/thunder damage (DEX save for half) or cast a stored spell of 3rd level or lower.',save:'dex',upcast:{perLevel:'+1d8 or higher stored spell',note:'Explosive rune: +1d8 damage per slot above 3rd. Spell glyph: can store a spell up to slot level used'},tags:['utility']},
  {name:'Magic Circle',level:3,school:'Abjuration',castingTime:'1 minute',range:'10 feet',components:'V, S, M (holy water or powdered silver and iron worth at least 100 gp, consumed)',duration:'1 hour',description:'Create a 10ft-radius, 20ft-tall cylinder of magical energy on the ground. Choose celestials, elementals, fey, fiends, or undead. Chosen type can\'t willingly enter, has disadvantage on attacks against targets in it, and can\'t charm/frighten/possess those in it.',upcast:{perLevel:'+1 hour duration',note:'Duration increases by 1 hour per slot level above 3rd'},tags:['defense']},
  {name:'Nondetection',level:3,school:'Abjuration',castingTime:'1 action',range:'Touch',components:'V, S, M (a pinch of diamond dust worth 25 gp, consumed)',duration:'8 hours',description:'Touch a creature, place, or object up to 10ft in any dimension. The target can\'t be targeted by any divination magic or perceived through magical scrying sensors.',tags:['utility']},
  {name:'Protection from Energy',level:3,school:'Abjuration',castingTime:'1 action',range:'Touch',components:'V, S',duration:'Concentration, up to 1 hour',description:'Touch a willing creature. It has resistance to one damage type of your choice: acid, cold, fire, lightning, or thunder.',tags:['defense','concentration']},
  {name:'Remove Curse',level:3,school:'Abjuration',castingTime:'1 action',range:'Touch',components:'V, S',duration:'Instantaneous',description:'Touch a creature. All curses affecting it end. If the object is a cursed magic item, the curse remains, but the spell breaks the owner\'s attunement so it can be removed or discarded.',tags:['utility']},
  // 3rd Level — Evocation (per amendment: Leomund's Tiny Hut is Evocation)
  {name:'Daylight',level:3,school:'Evocation',castingTime:'1 action',range:'60 feet',components:'V, S',duration:'1 hour',description:'A 60ft-radius sphere of bright light (and 60ft dim light beyond) springs from a point you choose. Magical darkness of 3rd level or lower is dispelled. Can be cast on an object.',tags:['utility']},
  {name:'Fireball',level:3,school:'Evocation',castingTime:'1 action',range:'150 feet',components:'V, S, M (a tiny ball of bat guano and sulfur)',duration:'Instantaneous',description:'A bright streak to a point within range, then a 20ft-radius sphere of flame. Each creature makes DEX save: 8d6 fire damage on failure, half on success. Ignites unattended flammable objects.',save:'dex',upcast:{perLevel:'+1d6 damage',note:'Add 1d6 fire damage per slot level above 3rd'},tags:['damage']},
  {name:'Lightning Bolt',level:3,school:'Evocation',castingTime:'1 action',range:'Self (100-foot line)',components:'V, S, M (a bit of fur and a rod of amber, crystal, or glass)',duration:'Instantaneous',description:'A stroke of lightning 100ft long and 5ft wide from you. Each creature in the line makes DEX save: 8d6 lightning damage on failure, half on success. Ignites unattended flammable objects.',save:'dex',upcast:{perLevel:'+1d6 damage',note:'Add 1d6 lightning damage per slot level above 3rd'},tags:['damage']},
  {name:"Leomund's Tiny Hut",level:3,school:'Evocation',castingTime:'1 minute',range:'Self (10-foot-radius hemisphere)',components:'V, S, M (a small crystal bead)',duration:'8 hours',description:'A 10ft-radius immobile dome of force surrounds you. 9 Medium creatures can fit inside. Spells and effects can\'t extend through it. The atmosphere inside is comfortable and dry. You control lighting inside.',tags:['utility','ritual']},
  {name:'Sending',level:3,school:'Evocation',castingTime:'1 action',range:'Unlimited',components:'V, S, M (a short piece of fine copper wire)',duration:'1 round',description:'Send a 25-word message to a creature you are familiar with. The creature hears the message and can reply with 25 words. 5% chance of failure to creatures on other planes.',tags:['utility']},
  {name:'Wind Wall',level:3,school:'Evocation',castingTime:'1 action',range:'120 feet',components:'V, S, M (a tiny fan and a feather of exotic origin)',duration:'Concentration, up to 1 minute',description:'A wall of strong wind rises from the ground at a point you choose. Up to 50ft long, 15ft high, 1ft thick. Any direction. Creatures in the wall make STR save: 3d8 bludgeoning damage on failure, half on success. Disperses gases, keeps flying creatures at bay. Small or smaller projectiles can\'t pass through.',save:'str',tags:['control','concentration']},
  // 3rd Level — Other Schools
  {name:'Animate Dead',level:3,school:'Necromancy',castingTime:'1 minute',range:'10 feet',components:'V, S, M (a drop of blood, a piece of flesh, and a pinch of bone dust)',duration:'Instantaneous',description:'Create an undead servant: skeleton or zombie from a corpse/bones. The creature is under your control for 24 hours. You can reassert control as an action. Each day, you must recast to maintain control.',upcast:{perLevel:'+2 undead',note:'Animate or reassert control over two additional undead per slot level above 3rd'},tags:['utility']},
  {name:'Bestow Curse',level:3,school:'Necromancy',castingTime:'1 action',range:'Touch',components:'V, S',duration:'Concentration, up to 1 minute',description:'Touch a creature. WIS save. Choose a curse: disadvantage on an ability\'s checks/saves, disadvantage on attacks against you, WIS save each turn or waste action, or spell damage deals extra 1d8 necrotic.',save:'wis',upcast:{perLevel:'Longer duration',note:'4th: up to 10 min. 5th: 8 hours. 7th: 24 hours. 9th: permanent'},tags:['debuff','concentration']},
  {name:'Blink',level:3,school:'Transmutation',castingTime:'1 action',range:'Self',components:'V, S',duration:'1 minute',description:'Each turn, roll d20. On 11+, you vanish to the Ethereal Plane until the start of your next turn. You can see and hear the plane you left (within 60ft), but everything there is grey. Can only affect/be affected by creatures on the Ethereal Plane.',tags:['defense']},
  {name:'Clairvoyance',level:3,school:'Divination',castingTime:'10 minutes',range:'1 mile',components:'V, S, M (a focus worth at least 100 gp: crystal ball, silver mirror, or font with holy water)',duration:'Concentration, up to 10 minutes',description:'Create an invisible sensor at a location you are familiar with. Choose to see or hear through the sensor (you can switch as an action).',tags:['utility','concentration']},
  {name:'Fear',level:3,school:'Illusion',castingTime:'1 action',range:'Self (30-foot cone)',components:'V, S, M (a white feather or the heart of a hen)',duration:'Concentration, up to 1 minute',description:'Each creature in a 30ft cone makes WIS save or drops whatever it\'s holding and becomes frightened. A frightened creature must Dash away. It can repeat the WIS save at end of each turn if it can\'t see you.',save:'wis',tags:['control','concentration']},
  {name:'Feign Death',level:3,school:'Necromancy',castingTime:'1 action',range:'Touch',components:'V, S, M (a pinch of graveyard dirt)',duration:'1 hour',description:'Touch a willing creature. It appears dead (even to magical examination). It is blinded and incapacitated, speed drops to 0, resistance to all damage except psychic. Disease and poison are suspended.',tags:['utility','ritual']},
  {name:'Fly',level:3,school:'Transmutation',castingTime:'1 action',range:'Touch',components:'V, S, M (a wing feather from any bird)',duration:'Concentration, up to 10 minutes',description:'Touch a willing creature. It gains a flying speed of 60 feet. When the spell ends, the creature falls if it is still aloft.',upcast:{perLevel:'+1 target',note:'One additional target per slot level above 3rd'},tags:['utility','concentration']},
  {name:'Gaseous Form',level:3,school:'Transmutation',castingTime:'1 action',range:'Touch',components:'V, S, M (a bit of gauze and a wisp of smoke)',duration:'Concentration, up to 1 hour',description:'Touch a willing creature. It transforms into a misty cloud with a fly speed of 10ft. It can pass through small holes, has resistance to nonmagical damage, advantage on STR/DEX/CON saves.',tags:['utility','concentration']},
  {name:'Haste',level:3,school:'Transmutation',castingTime:'1 action',range:'30 feet',components:'V, S, M (a shaving of licorice root)',duration:'Concentration, up to 1 minute',description:'Choose a willing creature. Its speed is doubled, +2 AC, advantage on DEX saves, one additional action each turn (Attack [one weapon attack only], Dash, Disengage, Hide, or Use an Object). When the spell ends, the target can\'t move or take actions until after its next turn.',tags:['buff','concentration']},
  {name:'Hypnotic Pattern',level:3,school:'Illusion',castingTime:'1 action',range:'120 feet',components:'S, M (a glowing stick of incense or a crystal vial filled with phosphorescent material)',duration:'Concentration, up to 1 minute',description:'A twisting pattern of colors weaves in a 30ft cube. Each creature that sees it makes WIS save or is charmed: incapacitated and speed 0. Ends if the creature takes damage or someone uses an action to shake it out of it.',save:'wis',tags:['control','concentration']},
  {name:'Major Image',level:3,school:'Illusion',castingTime:'1 action',range:'120 feet',components:'V, S, M (a bit of fleece)',duration:'Concentration, up to 10 minutes',description:'Create the image of an object, creature, or phenomenon no larger than a 20ft cube. It seems real with sound, smell, and temperature. Physical interaction reveals it. Investigation check vs. your spell DC.',upcast:{perLevel:'Permanent at 6th',note:'Cast at 6th level or higher: the spell lasts until dispelled, no concentration'},tags:['utility','concentration']},
  {name:'Phantom Steed',level:3,school:'Illusion',castingTime:'1 minute',range:'30 feet',components:'V, S',duration:'1 hour',description:'A Large quasi-real, horselike creature appears. It has the statistics of a riding horse but speed 100ft. It can travel 13 miles in an hour. When the spell ends, the steed fades, giving the rider 1 minute to dismount.',tags:['utility','ritual']},
  {name:'Slow',level:3,school:'Transmutation',castingTime:'1 action',range:'120 feet',components:'V, S, M (a drop of molasses)',duration:'Concentration, up to 1 minute',description:'Up to 6 creatures in a 40ft cube. WIS save. On failure: speed halved, -2 AC and DEX saves, can\'t use reactions, can only use an action or bonus action (not both), and only one spell per turn. Repeat save at end of each turn.',save:'wis',tags:['control','concentration']},
  {name:'Stinking Cloud',level:3,school:'Conjuration',castingTime:'1 action',range:'90 feet',components:'V, S, M (a rotten egg or several skunk cabbage leaves)',duration:'Concentration, up to 1 minute',description:'20ft-radius sphere of nauseating gas. Heavily obscured. Creatures starting their turn there make CON save or spend their action retching. Moderate wind disperses it in 4 rounds; strong wind in 1.',save:'con',tags:['control','concentration']},
  {name:'Tongues',level:3,school:'Divination',castingTime:'1 action',range:'Touch',components:'V, M (a small clay model of a ziggurat)',duration:'1 hour',description:'Touch a creature. It understands any spoken language it hears. When it speaks, any creature that knows at least one language can understand it.',tags:['utility']},
  {name:'Vampiric Touch',level:3,school:'Necromancy',castingTime:'1 action',range:'Self',components:'V, S',duration:'Concentration, up to 1 minute',description:'Melee spell attack. On hit, 3d6 necrotic damage and you regain HP equal to half the necrotic damage dealt. Until the spell ends, you can make the attack again on each of your turns as an action.',attack:true,upcast:{perLevel:'+1d6 damage',note:'Add 1d6 necrotic damage per slot level above 3rd'},tags:['damage','healing','concentration']},
  {name:'Water Breathing',level:3,school:'Transmutation',castingTime:'1 action',range:'30 feet',components:'V, S, M (a short reed or piece of straw)',duration:'24 hours',description:'Up to 10 willing creatures can breathe underwater for the duration. Affected creatures also retain their normal breathing.',tags:['utility','ritual']},
  // 4th Level — Abjuration
  {name:'Banishment',level:4,school:'Abjuration',castingTime:'1 action',range:'60 feet',components:'V, S, M (an item distasteful to the target)',duration:'Concentration, up to 1 minute',description:'CHA save. On failure, the target is banished to a harmless demiplane (incapacitated). If native to a different plane: permanent banishment if concentration is maintained for full duration.',save:'cha',upcast:{perLevel:'+1 target',note:'One additional target per slot level above 4th'},tags:['control','concentration']},
  {name:'Fire Shield',level:4,school:'Abjuration',castingTime:'1 action',range:'Self',components:'V, S, M (a bit of phosphorus or a firefly)',duration:'10 minutes',description:'Choose warm or cold shield. Warm: resistance to cold damage; attackers take 2d8 fire damage. Cold: resistance to fire damage; attackers take 2d8 cold damage.',tags:['defense']},
  {name:'Stoneskin',level:4,school:'Abjuration',castingTime:'1 action',range:'Touch',components:'V, S, M (diamond dust worth 100 gp, consumed)',duration:'Concentration, up to 1 hour',description:'Touch a willing creature. Its body becomes stone-hard. It has resistance to nonmagical bludgeoning, piercing, and slashing damage.',tags:['defense','concentration']},
  // 4th Level — Evocation
  {name:'Ice Storm',level:4,school:'Evocation',castingTime:'1 action',range:'300 feet',components:'V, S, M (a pinch of dust and a few drops of water)',duration:'Instantaneous',description:'Hailstones pound a 20ft-radius, 40ft-high cylinder. Each creature makes DEX save: 2d8 bludgeoning + 4d6 cold damage on failure, half on success. Area becomes difficult terrain until end of your next turn.',save:'dex',upcast:{perLevel:'+1d8 bludgeoning',note:'Add 1d8 bludgeoning damage per slot level above 4th'},tags:['damage']},
  {name:"Otiluke's Resilient Sphere",level:4,school:'Evocation',castingTime:'1 action',range:'30 feet',components:'V, S, M (a hemispherical piece of clear crystal and a matching hemispherical piece of gum arabic)',duration:'Concentration, up to 1 minute',description:'A sphere of shimmering force encloses a creature or object (Large or smaller). DEX save to avoid. Enclosed creature can breathe but is otherwise trapped. Nothing can pass through.',save:'dex',tags:['control','concentration']},
  {name:'Wall of Fire',level:4,school:'Evocation',castingTime:'1 action',range:'120 feet',components:'V, S, M (a small piece of phosphorus)',duration:'Concentration, up to 1 minute',description:'Create a wall of fire up to 60ft long, 20ft high, and 1ft thick (or a 20ft-radius, 20ft-high ring). One side deals 5d8 fire damage to creatures within 10ft (DEX save for half). Entering the wall deals 5d8 fire.',save:'dex',upcast:{perLevel:'+1d8 damage',note:'Add 1d8 fire damage per slot level above 4th'},tags:['damage','concentration']},
  // 4th Level — Other Schools
  {name:'Arcane Eye',level:4,school:'Divination',castingTime:'1 action',range:'30 feet',components:'V, S, M (a bit of bat fur)',duration:'Concentration, up to 1 hour',description:'Create an invisible, magical eye within range that hovers in the air. You receive visual information from it. The eye can move up to 30ft per turn in any direction. It can pass through openings 1 inch in diameter.',tags:['utility','concentration']},
  {name:'Blight',level:4,school:'Necromancy',castingTime:'1 action',range:'30 feet',components:'V, S',duration:'Instantaneous',description:'Necromantic energy washes over a creature. CON save: 8d8 necrotic damage on failure, half on success. Plants and magical plant creatures have disadvantage and take maximum damage.',save:'con',upcast:{perLevel:'+1d8 damage',note:'Add 1d8 necrotic damage per slot level above 4th'},tags:['damage']},
  {name:'Confusion',level:4,school:'Enchantment',castingTime:'1 action',range:'90 feet',components:'V, S, M (three nut shells)',duration:'Concentration, up to 1 minute',description:'10ft-radius sphere. Each creature makes WIS save. On failure, roll d10 each turn to determine action: 1=move randomly, 2-6=no action or movement, 7-8=melee attack random adjacent creature, 9-10=normal action. Repeat save at end of each turn.',save:'wis',upcast:{perLevel:'+5ft radius',note:'Radius increases by 5ft per slot level above 4th'},tags:['control','concentration']},
  {name:'Dimension Door',level:4,school:'Conjuration',castingTime:'1 action',range:'500 feet',components:'V',duration:'Instantaneous',description:'Teleport to any spot within range. You can describe a specific location or state a direction and distance. Can bring one willing creature of your size or smaller. If you arrive in an occupied space, both take 4d6 force damage.',tags:['utility']},
  {name:"Evard's Black Tentacles",level:4,school:'Conjuration',castingTime:'1 action',range:'90 feet',components:'V, S, M (a piece of tentacle from a giant octopus or a giant squid)',duration:'Concentration, up to 1 minute',description:'Writhing black tentacles fill a 20ft square on the ground. Creatures entering or starting their turn there make DEX save or take 3d6 bludgeoning damage and are restrained. Restrained creatures take 3d6 bludgeoning at start of each turn.',save:'dex',tags:['damage','control','concentration']},
  {name:'Fabricate',level:4,school:'Transmutation',castingTime:'10 minutes',range:'120 feet',components:'V, S',duration:'Instantaneous',description:'Convert raw materials into products of the same material. A 10ft cube of nonmineral material or a 5ft cube of mineral material. If working with mineral, you must be proficient with the relevant artisan\'s tools.',tags:['utility']},
  {name:'Greater Invisibility',level:4,school:'Illusion',castingTime:'1 action',range:'Touch',components:'V, S',duration:'Concentration, up to 1 minute',description:'Touch a willing creature. It becomes invisible for the duration. Unlike regular Invisibility, the invisibility does not end when the target attacks or casts a spell.',tags:['utility','concentration']},
  {name:'Hallucinatory Terrain',level:4,school:'Illusion',castingTime:'10 minutes',range:'300 feet',components:'V, S, M (a stone, a twig, and a bit of green plant)',duration:'24 hours',description:'Make a 150ft-cube area look, sound, and smell like a different kind of natural terrain. Structures and creatures are not disguised. If physical interaction or Investigation check (vs. your spell DC) reveals the illusion.',tags:['utility']},
  {name:'Locate Creature',level:4,school:'Divination',castingTime:'1 action',range:'Self',components:'V, S, M (a bit of fur from a bloodhound)',duration:'Concentration, up to 1 hour',description:'Describe or name a creature. You sense the direction to the creature\'s location within 1000ft. If the creature is moving, you know its direction. Can search for a specific known creature or the nearest creature of a specific kind.',tags:['utility','concentration']},
  {name:'Phantasmal Killer',level:4,school:'Illusion',castingTime:'1 action',range:'120 feet',components:'V, S',duration:'Concentration, up to 1 minute',description:'Tap into a creature\'s nightmares. WIS save. On failure: frightened. At end of each turn, target makes WIS save: on failure, 4d10 psychic damage. On success, the spell ends.',save:'wis',upcast:{perLevel:'+1d10 damage',note:'Add 1d10 psychic damage on failed save per slot level above 4th'},tags:['damage','concentration']},
  {name:'Polymorph',level:4,school:'Transmutation',castingTime:'1 action',range:'60 feet',components:'V, S, M (a caterpillar cocoon)',duration:'Concentration, up to 1 hour',description:'Transform a creature into a new beast form. WIS save (unwilling). The target\'s statistics are replaced by the beast\'s (CR equal to or less than the target\'s level/CR). When it drops to 0 HP, it reverts.',save:'wis',tags:['utility','concentration']},
  {name:'Stone Shape',level:4,school:'Transmutation',castingTime:'1 action',range:'Touch',components:'V, S, M (soft clay, which must be worked into roughly the desired shape of the stone object)',duration:'Instantaneous',description:'Touch a stone object of Medium size or smaller, or a section of stone no more than 5ft in any dimension. Form it into any shape. Can include crude mechanical items like doors, hinges, levers.',tags:['utility']}
];

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
function getManeuverDC(c) { return 8 + c.proficiencyBonus + Math.max(mod(c.abilityScores.str), mod(c.abilityScores.dex)); }

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
function getEkSpellSlots(level) { return EK_SPELL_SLOTS[level] || {}; }

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

