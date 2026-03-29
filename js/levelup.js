// levelup.js — Level-up wizard, ASI selection, spell selection, summary
/* ═══════════════════════════════════════════
   LEVEL-UP WIZARD
   ═══════════════════════════════════════════ */

let luState = null; // Holds all wizard state during a level-up

function startLevelUp() {
  const char = loadCharacter();
  if (!char) return;
  if (char.level >= 20) { alert('Already at max level (20).'); return; }

  const newLevel = char.level + 1;
  const cls = char.class || 'Cleric';
  const cd = CLASS_DATA[cls] || CLASS_DATA.Cleric;

  // Select correct progression table
  var prog;
  if (cls === 'Fighter') {
    prog = FIGHTER_PROGRESSION[newLevel];
  } else if (cls === 'Paladin') {
    prog = PALADIN_PROGRESSION[newLevel];
  } else if (cls === 'Rogue') {
    prog = ROGUE_PROGRESSION[newLevel];
  } else if (cls === 'Wizard') {
    prog = WIZARD_PROGRESSION[newLevel];
  } else {
    prog = CLERIC_PROGRESSION[newLevel];
  }
  if (!prog) { alert('No progression data for level ' + newLevel); return; }

  const conMod = getEffectiveMod(char, 'con');
  const isHillDwarf = char.race === 'Hill Dwarf';
  const hitDie = cd.hitDice;
  const avgRoll = Math.floor(hitDie / 2) + 1; // d8→5, d10→6, d12→7

  // Initialize wizard state
  luState = {
    char: JSON.parse(JSON.stringify(char)), // Deep copy
    newLevel,
    prog,
    cls,
    cd,
    hitDie,
    avgRoll,
    // HP
    hpMethod: null, // 'roll' or 'average'
    hpRoll: null,
    hpGained: 0,
    conMod,
    dwarfBonus: isHillDwarf ? 1 : 0,
    // ASI
    asiChoice: null, // 'plus2', 'plus1_1', 'feat'
    asiAbility1: null,
    asiAbility2: null,
    asiAmount1: 0,
    asiAmount2: 0,
    featName: '',
    featNotes: '',
    retroHp: false,
    retroHpAmount: 0,
    // Cantrip (Cleric)
    newCantrip: null,
    // Fighter-specific
    subclassSelection: null,
    fightingStyleSelection: null,
    maneuverSelections: [],
    ekCantripSelections: [],
    ekSpellSelections: [],
    ekSpellSwap: { from: null, to: null },
    // Rogue-specific
    newExpertiseSkills: [],
    // Paladin spell preparation
    paladinPrepSelections: [],
    // Wizard-specific
    wizSpellbookAdds: [],
    wizNewCantrip: null,
    wizSpellMastery: { firstLevel: null, secondLevel: null },
    wizSignatureSpells: [],
    // Screens
    screens: [],
    currentScreen: 0,
    // Track ability score changes for derived stat calc
    abilityChanges: {}
  };

  // Build the screen list (only screens that apply to this level)
  const screens = [];
  screens.push('hp');
  if (prog.asi) screens.push('asi');

  if (cls === 'Fighter') {
    var sub = char.subclass || '';
    // Subclass selection at level 3 if not yet set
    if (newLevel === 3 && !sub) screens.push('subclassSelect');
    // Champion: Additional Fighting Style at level 10
    if (sub === 'Champion' && newLevel === 10) screens.push('fightingStyleSelect');
    // Battle Master: Maneuver selection at levels where new maneuvers are gained
    if (sub === 'Battle Master') {
      var bmOld = getBmManeuversKnown(char.level);
      var bmNew = getBmManeuversKnown(newLevel);
      if (bmNew > bmOld) screens.push('maneuverSelect');
    }
    // Eldritch Knight: Cantrip gain
    if (sub === 'Eldritch Knight') {
      var ekCantOld = THIRD_CASTER_CANTRIPS_KNOWN[char.level] || 0;
      var ekCantNew = THIRD_CASTER_CANTRIPS_KNOWN[newLevel] || 0;
      if (ekCantNew > ekCantOld) screens.push('ekCantripSelect');
    }
    // Eldritch Knight: Spell learning
    if (sub === 'Eldritch Knight') {
      var ekSpOld = THIRD_CASTER_SPELLS_KNOWN[char.level] || 0;
      var ekSpNew = THIRD_CASTER_SPELLS_KNOWN[newLevel] || 0;
      if (ekSpNew > ekSpOld) screens.push('ekSpellSelect');
    }
    // Features
    var fighterFeats = getFighterLevelFeatures(newLevel, sub);
    if (fighterFeats.length > 0) screens.push('features');
    // EK spell slot changes
    if (sub === 'Eldritch Knight') {
      var oldEkSlots = getThirdCasterSlots(char.level);
      var newEkSlots = getThirdCasterSlots(newLevel);
      if (JSON.stringify(oldEkSlots) !== JSON.stringify(newEkSlots)) screens.push('spellslots');
    }
  } else if (cls === 'Paladin') {
    var palSub = char.subclass || '';
    // Fighting Style at level 2 (if entering from level 1 with no style)
    if (newLevel === 2 && !char.fightingStyle) screens.push('paladinFightingStyle');
    // Oath (subclass) selection at level 3
    if (newLevel === 3 && !palSub) screens.push('subclassSelect');
    // Spell slot changes
    var oldPalSlots = getHalfCasterSlots(char.level);
    var newPalSlots = getHalfCasterSlots(newLevel);
    if (JSON.stringify(oldPalSlots) !== JSON.stringify(newPalSlots)) screens.push('spellslots');
    // New oath spells
    var oldOathSpells = getOathSpells(palSub, char.level);
    var newOathSpells = getOathSpells(palSub, newLevel);
    if (JSON.stringify(oldOathSpells) !== JSON.stringify(newOathSpells)) screens.push('domainspells');
    // Spell preparation: required at level 2 (first spells), offered at new spell level access (5, 9, 13, 17)
    var palNewSpellLevel = [5, 9, 13, 17].indexOf(newLevel) >= 0;
    if (newLevel === 2 || palNewSpellLevel) screens.push('paladinPrepare');
    // Features
    var palFeats = getPaladinLevelFeatures(newLevel, palSub);
    if (palFeats.length > 0) screens.push('features');
  } else if (cls === 'Rogue') {
    var rogueSub = char.subclass || '';
    // Subclass selection at level 3
    if (newLevel === 3 && !rogueSub) screens.push('subclassSelect');
    // Expertise selection at level 6
    if (newLevel === 6) screens.push('expertiseSelect');
    // Arcane Trickster: spell screens (same tables as EK)
    if (rogueSub === 'Arcane Trickster') {
      var atCantOld = THIRD_CASTER_CANTRIPS_KNOWN[char.level] || 0;
      var atCantNew = THIRD_CASTER_CANTRIPS_KNOWN[newLevel] || 0;
      if (atCantNew > atCantOld) screens.push('ekCantripSelect');
      var atSpOld = THIRD_CASTER_SPELLS_KNOWN[char.level] || 0;
      var atSpNew = THIRD_CASTER_SPELLS_KNOWN[newLevel] || 0;
      if (atSpNew > atSpOld) screens.push('ekSpellSelect');
      var oldAtSlots = getThirdCasterSlots(char.level);
      var newAtSlots = getThirdCasterSlots(newLevel);
      if (JSON.stringify(oldAtSlots) !== JSON.stringify(newAtSlots)) screens.push('spellslots');
    }
    // Features
    var rogueFeats = getRogueLevelFeatures(newLevel, rogueSub);
    if (rogueFeats.length > 0) screens.push('features');
  } else if (cls === 'Wizard') {
    var wizSub = char.subclass || '';
    // Subclass at level 2
    if (newLevel === 2 && !wizSub) screens.push('subclassSelect');
    // New cantrip
    if (prog.newCantrip) screens.push('wizardCantrip');
    // Spellbook adds (every level)
    screens.push('wizardSpellbookAdd');
    // Spell Mastery (level 18)
    if (newLevel === 18) screens.push('spellMastery');
    // Signature Spells (level 20)
    if (newLevel === 20) screens.push('signatureSpells');
    // Spell slot changes
    var oldWizSlots = getFullCasterSlots(char.level);
    var newWizSlots = getFullCasterSlots(newLevel);
    if (JSON.stringify(oldWizSlots) !== JSON.stringify(newWizSlots)) screens.push('spellslots');
    // Features
    var wizFeats = getWizardLevelFeatures(newLevel, wizSub);
    if (wizFeats.length > 0) screens.push('features');
  } else {
    // Cleric screens
    if (prog.newCantrip) screens.push('cantrip');
    screens.push('spellslots');
    if (prog.features && prog.features.length > 0) screens.push('features');
    if (prog.domainSpells) screens.push('domainspells');
  }

  if (prog.proficiencyBonus > getProfBonus(char.level)) screens.push('profbonus');
  screens.push('summary');
  luState.screens = screens;
  luState.currentScreen = 0;

  // Show wizard
  document.getElementById('lu-old-level').textContent = char.level;
  document.getElementById('lu-new-level').textContent = newLevel;

  showView('levelup');
  renderLuScreen();
}

function renderLuScreen(preserveScroll) {
  var savedScroll = preserveScroll ? window.scrollY : 0;
  const screen = luState.screens[luState.currentScreen];
  const container = document.getElementById('lu-screens');

  switch (screen) {
    case 'hp': container.innerHTML = renderHpScreen(); break;
    case 'asi': container.innerHTML = renderAsiScreen(); break;
    case 'cantrip': container.innerHTML = renderCantripScreen(); break;
    case 'spellslots': container.innerHTML = renderSpellSlotsScreen(); break;
    case 'features': container.innerHTML = renderFeaturesScreen(); break;
    case 'domainspells': container.innerHTML = renderDomainSpellsScreen(); break;
    case 'profbonus': container.innerHTML = renderProfBonusScreen(); break;
    case 'summary': container.innerHTML = renderLuSummary(); break;
    case 'subclassSelect': container.innerHTML = renderSubclassSelectScreen(); break;
    case 'fightingStyleSelect': container.innerHTML = renderFightingStyleSelectScreen(); break;
    case 'maneuverSelect': container.innerHTML = renderManeuverSelectScreen(); break;
    case 'ekCantripSelect': container.innerHTML = renderEkCantripSelectScreen(); break;
    case 'ekSpellSelect': container.innerHTML = renderEkSpellSelectScreen(); break;
    case 'paladinFightingStyle': container.innerHTML = renderPaladinFightingStyleScreen(); break;
    case 'expertiseSelect': container.innerHTML = renderExpertiseSelectScreen(); break;
    case 'paladinPrepare': container.innerHTML = renderPaladinPrepareScreen(); break;
    case 'wizardCantrip': container.innerHTML = renderWizardCantripScreen(); break;
    case 'wizardSpellbookAdd': container.innerHTML = renderWizardSpellbookAddScreen(); break;
    case 'spellMastery': container.innerHTML = renderSpellMasteryScreen(); break;
    case 'signatureSpells': container.innerHTML = renderSignatureSpellsScreen(); break;
  }

  // Update nav buttons
  const backBtn = document.getElementById('lu-back-btn');
  const nextBtn = document.getElementById('lu-next-btn');
  const isFirst = luState.currentScreen === 0;
  const isLast = luState.currentScreen === luState.screens.length - 1;

  backBtn.textContent = isFirst ? 'Cancel' : 'Back';
  backBtn.onclick = isFirst ? cancelLevelUp : luPrev;
  nextBtn.textContent = isLast ? 'Confirm Level Up' : 'Next';
  nextBtn.onclick = isLast ? confirmLevelUp : luNext;
  nextBtn.className = isLast ? 'btn btn-primary btn-large' : 'btn btn-primary';

  window.scrollTo(0, savedScroll);
}

function luNext() {
  if (!validateLuScreen()) return;
  if (luState.currentScreen < luState.screens.length - 1) {
    luState.currentScreen++;
    renderLuScreen();
  }
}

function luPrev() {
  if (luState.currentScreen > 0) {
    luState.currentScreen--;
    renderLuScreen();
  }
}

function cancelLevelUp() {
  var char = loadCharacter();
  luState = null;
  if (char) showDashboard(char);
  else showHomeScreen();
}

function validateLuScreen() {
  const screen = luState.screens[luState.currentScreen];
  switch (screen) {
    case 'hp':
      if (!luState.hpMethod) { alert('Please choose how to determine your HP.'); return false; }
      if (luState.hpMethod === 'roll' && (!luState.hpRoll || luState.hpRoll < 1 || luState.hpRoll > luState.hitDie)) {
        alert('Please enter a valid die roll (1-' + luState.hitDie + ').'); return false;
      }
      return true;
    case 'asi':
      if (!luState.asiChoice) { alert('Please choose an option.'); return false; }
      if (luState.asiChoice === 'plus2' && !luState.asiAbility1) { alert('Please select an ability.'); return false; }
      if (luState.asiChoice === 'plus1_1' && (!luState.asiAbility1 || !luState.asiAbility2)) { alert('Please select two abilities.'); return false; }
      if (luState.asiChoice === 'plus1_1' && luState.asiAbility1 === luState.asiAbility2) { alert('Please select two different abilities.'); return false; }
      if (luState.asiChoice === 'feat' && !luState.featName.trim()) { alert('Please enter the feat name.'); return false; }
      // Check 20 cap
      if (luState.asiChoice === 'plus2') {
        if (luState.char.abilityScores[luState.asiAbility1] + 2 > 20) { alert('Ability score cannot exceed 20.'); return false; }
      }
      if (luState.asiChoice === 'plus1_1') {
        if (luState.char.abilityScores[luState.asiAbility1] + 1 > 20) { alert(ABILITY_NAMES[luState.asiAbility1] + ' would exceed 20.'); return false; }
        if (luState.char.abilityScores[luState.asiAbility2] + 1 > 20) { alert(ABILITY_NAMES[luState.asiAbility2] + ' would exceed 20.'); return false; }
      }
      return true;
    case 'cantrip':
      if (!luState.newCantrip) { alert('Please select a cantrip.'); return false; }
      return true;
    case 'subclassSelect':
      if (!luState.subclassSelection) { alert('Please choose a subclass.'); return false; }
      return true;
    case 'fightingStyleSelect':
      if (!luState.fightingStyleSelection) { alert('Please choose a fighting style.'); return false; }
      return true;
    case 'maneuverSelect': {
      var prevKnown = luState.char.maneuversKnown ? luState.char.maneuversKnown.length : 0;
      var totalNeeded = getBmManeuversKnown(luState.newLevel);
      var newToChoose = totalNeeded - prevKnown;
      if (luState.maneuverSelections.length !== newToChoose) { alert('Please choose ' + newToChoose + ' maneuver' + (newToChoose > 1 ? 's' : '') + '.'); return false; }
      return true;
    }
    case 'ekCantripSelect': {
      var ekCantOld = THIRD_CASTER_CANTRIPS_KNOWN[luState.char.level] || 0;
      var ekCantNew = THIRD_CASTER_CANTRIPS_KNOWN[luState.newLevel] || 0;
      var cantToChoose = ekCantNew - ekCantOld;
      if (luState.ekCantripSelections.length !== cantToChoose) { alert('Please choose ' + cantToChoose + ' cantrip' + (cantToChoose > 1 ? 's' : '') + '.'); return false; }
      return true;
    }
    case 'ekSpellSelect': {
      var ekSpOld = THIRD_CASTER_SPELLS_KNOWN[luState.char.level] || 0;
      var ekSpNew = THIRD_CASTER_SPELLS_KNOWN[luState.newLevel] || 0;
      var spToChoose = ekSpNew - ekSpOld;
      if (luState.ekSpellSelections.length !== spToChoose) { alert('Please choose ' + spToChoose + ' spell' + (spToChoose > 1 ? 's' : '') + '.'); return false; }
      if (luState.ekSpellSwap.from && !luState.ekSpellSwap.to) { alert('Please select a replacement spell or cancel the swap.'); return false; }
      return true;
    }
    case 'paladinFightingStyle':
      if (!luState.fightingStyleSelection) { alert('Please choose a fighting style.'); return false; }
      return true;
    case 'expertiseSelect':
      if (luState.newExpertiseSkills.length !== 2) { alert('Please choose exactly 2 skills for Expertise.'); return false; }
      return true;
    case 'paladinPrepare':
      // Required at level 2 (first time getting spells), optional at higher levels
      if (luState.newLevel === 2) {
        var palPrepSelected = document.querySelectorAll('input[name="pal-prepare"]:checked').length;
        if (palPrepSelected === 0) { alert('Please prepare at least one spell.'); return false; }
      }
      return true;
    case 'wizardCantrip':
      if (!luState.wizNewCantrip) { alert('Please select a cantrip.'); return false; }
      return true;
    case 'wizardSpellbookAdd':
      if (luState.wizSpellbookAdds.length !== 2) { alert('Please choose exactly 2 spells for your spellbook.'); return false; }
      return true;
    case 'spellMastery':
      if (!luState.wizSpellMastery.firstLevel || !luState.wizSpellMastery.secondLevel) { alert('Please select one 1st-level and one 2nd-level spell.'); return false; }
      return true;
    case 'signatureSpells':
      if (luState.wizSignatureSpells.length !== 2) { alert('Please select exactly 2 third-level spells.'); return false; }
      return true;
    default:
      return true;
  }
}

/* ── Screen Renderers ── */

function renderHpScreen() {
  const s = luState;
  const hitDie = s.hitDie;
  const avgRoll = s.avgRoll;
  const totalAvg = avgRoll + s.conMod + s.dwarfBonus;
  const totalRoll = s.hpRoll ? (s.hpRoll + s.conMod + s.dwarfBonus) : null;
  const oldHp = s.char.hp.max;

  let html = `<div class="lu-screen active">
    <h2>Hit Points</h2>
    <div class="lu-callout">
      Your hit die is a <strong>d${hitDie}</strong>. Your CON modifier is <strong>${s.conMod >= 0 ? '+' : ''}${s.conMod}</strong>.${s.dwarfBonus ? ' Hill Dwarf Toughness adds <strong>+1</strong>.' : ''}
    </div>
    <div class="lu-option-group">
      <div class="lu-option ${s.hpMethod === 'roll' ? 'selected' : ''}" onclick="luSelectHpMethod('roll')">
        <div class="opt-title">I rolled</div>
        <div class="opt-desc">Enter your d${hitDie} roll, and modifiers will be added automatically</div>
        ${s.hpMethod === 'roll' ? `
          <div style="margin-top:12px">
            <label style="font-size:0.85rem;color:var(--text-dim)">Die roll (1-${hitDie}):</label>
            <input type="number" id="lu-hp-roll" min="1" max="${hitDie}" value="${s.hpRoll || ''}"
                   onclick="event.stopPropagation()" oninput="luUpdateHpRoll(this.value)"
                   style="width:80px;margin-left:8px;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem">
            ${totalRoll !== null ? `<div class="lu-result" style="margin-top:8px">
              <div class="res-label">${s.hpRoll} (roll) + ${s.conMod} (CON) ${s.dwarfBonus ? '+ 1 (Dwarf) ' : ''}= <span class="res-value">${totalRoll}</span> HP gained</div>
            </div>` : ''}
          </div>` : ''}
      </div>
      <div class="lu-option ${s.hpMethod === 'average' ? 'selected' : ''}" onclick="luSelectHpMethod('average')">
        <div class="opt-title">Take average</div>
        <div class="opt-desc">${avgRoll} (avg d${hitDie}) + ${s.conMod} (CON) ${s.dwarfBonus ? '+ 1 (Dwarf) ' : ''}= <strong>${totalAvg}</strong> HP gained</div>
      </div>
    </div>`;

  const gained = s.hpMethod === 'average' ? totalAvg : (totalRoll || 0);
  s.hpGained = gained;

  if (s.hpMethod) {
    html += `<div class="lu-change" style="border-top:1px solid var(--border);padding-top:12px;font-size:1.1rem">
      <span class="change-label">HP Max:</span>
      <span class="change-old">${oldHp}</span>
      <span class="change-arrow">→</span>
      <span class="change-new">${oldHp + gained}</span>
    </div>`;
  }

  html += '</div>';
  return html;
}

function luSelectHpMethod(method) {
  luState.hpMethod = method;
  if (method === 'average') {
    luState.hpRoll = null;
    luState.hpGained = luState.avgRoll + luState.conMod + luState.dwarfBonus;
  }
  renderLuScreen(true);
  if (method === 'roll') {
    const input = document.getElementById('lu-hp-roll');
    if (input) input.focus();
  }
}

function luUpdateHpRoll(val) {
  luState.hpRoll = parseInt(val) || null;
  if (luState.hpRoll) {
    luState.hpGained = luState.hpRoll + luState.conMod + luState.dwarfBonus;
  }
  // Only re-render the result area, not the whole screen (to keep focus)
  renderLuScreen(true);
  const input = document.getElementById('lu-hp-roll');
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

function renderAsiScreen() {
  const s = luState;
  const scores = s.char.abilityScores;

  let html = `<div class="lu-screen active">
    <h2>Ability Score Improvement</h2>
    <div class="lu-callout">At level ${s.newLevel}, you gain an Ability Score Improvement. Choose one option below.</div>
    <div class="lu-option-group">
      <div class="lu-option ${s.asiChoice === 'plus2' ? 'selected' : ''}" onclick="luSelectAsi('plus2')">
        <div class="opt-title">+2 to one ability score</div>
        <div class="opt-desc">Increase a single ability score by 2 (max 20)</div>
        ${s.asiChoice === 'plus2' ? renderAsiPlus2() : ''}
      </div>
      <div class="lu-option ${s.asiChoice === 'plus1_1' ? 'selected' : ''}" onclick="luSelectAsi('plus1_1')">
        <div class="opt-title">+1 to two ability scores</div>
        <div class="opt-desc">Increase two different ability scores by 1 each (max 20)</div>
        ${s.asiChoice === 'plus1_1' ? renderAsiPlus1_1() : ''}
      </div>
      <div class="lu-option ${s.asiChoice === 'feat' ? 'selected' : ''}" onclick="luSelectAsi('feat')">
        <div class="opt-title">Take a Feat</div>
        <div class="opt-desc">Choose a feat from the PHB. Enter the name and any notes below.</div>
        ${s.asiChoice === 'feat' ? renderAsiFeat() : ''}
      </div>
    </div>`;

  // Show preview of all ability scores with changes highlighted
  html += renderAsiPreview();

  // CON retroactive HP check
  if (s.asiChoice && s.asiChoice !== 'feat') {
    const conChanged = (s.asiChoice === 'plus2' && s.asiAbility1 === 'con') ||
      (s.asiChoice === 'plus1_1' && (s.asiAbility1 === 'con' || s.asiAbility2 === 'con'));
    if (conChanged) {
      const oldConMod = mod(scores.con);
      const increase = s.asiChoice === 'plus2' ? 2 : 1;
      const newConMod = mod(scores.con + increase);
      if (newConMod > oldConMod) {
        const retroAmount = (newConMod - oldConMod) * (s.char.level);
        s.retroHpAmount = retroAmount;
        html += `<div class="retro-hp-toggle">
          <p style="font-size:0.9rem;color:var(--text-dim);margin-bottom:8px">
            Your CON modifier is increasing from ${modStr(scores.con)} to ${newConMod >= 0 ? '+' : ''}${newConMod}.
          </p>
          <label>
            <input type="checkbox" ${s.retroHp ? 'checked' : ''} onchange="luState.retroHp=this.checked;renderLuScreen(true)">
            Apply retroactive HP? (+${retroAmount} HP for ${s.char.level} previous levels)
          </label>
          <p style="font-size:0.8rem;color:var(--text-dim);margin-top:4px">Some tables house-rule retroactive HP from CON increases. Check if your table uses this.</p>
        </div>`;
      }
    }
  }

  html += '</div>';
  return html;
}

function luSelectAsi(choice) {
  if (luState.asiChoice !== choice) {
    luState.asiAbility1 = null;
    luState.asiAbility2 = null;
    luState.featName = '';
    luState.featNotes = '';
    luState.retroHp = false;
    luState.retroHpAmount = 0;
  }
  luState.asiChoice = choice;
  luState.abilityChanges = {};
  renderLuScreen(true);
}

function renderAsiPlus2() {
  const scores = luState.char.abilityScores;
  const opts = ABILITIES.filter(ab => scores[ab] + 2 <= 20);
  return `<div style="margin-top:12px">
    <select id="lu-asi1" style="min-height:44px;padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem;width:100%"
            onclick="event.stopPropagation()" onchange="luSetAsiAbility(1,this.value)">
      <option value="">Select ability...</option>
      ${opts.map(ab => `<option value="${ab}" ${luState.asiAbility1 === ab ? 'selected' : ''}>${ABILITY_NAMES[ab]} (${scores[ab]} → ${scores[ab] + 2})</option>`).join('')}
    </select>
    ${luState.asiAbility1 ? renderModChangeNote(luState.asiAbility1, 2) : ''}
  </div>`;
}

function renderAsiPlus1_1() {
  const scores = luState.char.abilityScores;
  const opts1 = ABILITIES.filter(ab => scores[ab] + 1 <= 20);
  const opts2 = ABILITIES.filter(ab => scores[ab] + 1 <= 20 && ab !== luState.asiAbility1);
  return `<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
    <select style="min-height:44px;padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem"
            onclick="event.stopPropagation()" onchange="luSetAsiAbility(1,this.value)">
      <option value="">First ability...</option>
      ${opts1.map(ab => `<option value="${ab}" ${luState.asiAbility1 === ab ? 'selected' : ''}>${ABILITY_NAMES[ab]} (${scores[ab]} → ${scores[ab] + 1})</option>`).join('')}
    </select>
    <select style="min-height:44px;padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem"
            onclick="event.stopPropagation()" onchange="luSetAsiAbility(2,this.value)">
      <option value="">Second ability...</option>
      ${opts2.map(ab => `<option value="${ab}" ${luState.asiAbility2 === ab ? 'selected' : ''}>${ABILITY_NAMES[ab]} (${scores[ab]} → ${scores[ab] + 1})</option>`).join('')}
    </select>
    ${luState.asiAbility1 ? renderModChangeNote(luState.asiAbility1, 1) : ''}
    ${luState.asiAbility2 ? renderModChangeNote(luState.asiAbility2, 1) : ''}
  </div>`;
}

function renderAsiFeat() {
  return `<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
    <input type="text" placeholder="Feat name" value="${luState.featName}"
           onclick="event.stopPropagation()" oninput="luState.featName=this.value"
           style="min-height:44px;padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem">
    <textarea placeholder="Notes / mechanical effects" rows="3"
              onclick="event.stopPropagation()" oninput="luState.featNotes=this.value"
              style="padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem;resize:vertical;min-height:80px">${luState.featNotes}</textarea>
  </div>`;
}

function luSetAsiAbility(slot, ability) {
  if (slot === 1) luState.asiAbility1 = ability || null;
  if (slot === 2) luState.asiAbility2 = ability || null;
  luState.retroHp = false;
  luState.retroHpAmount = 0;
  renderLuScreen(true);
}

function renderModChangeNote(ability, increase) {
  const oldScore = luState.char.abilityScores[ability];
  const newScore = oldScore + increase;
  const oldMod = mod(oldScore);
  const newMod = mod(newScore);
  if (newMod !== oldMod) {
    return `<div style="margin-top:4px;padding:8px;background:rgba(196,163,90,0.1);border-radius:var(--radius);font-size:0.85rem">
      <strong style="color:var(--accent)">${ABILITY_NAMES[ability]} modifier changes:</strong> ${modStr(oldScore)} → ${newMod >= 0 ? '+' : ''}${newMod}
    </div>`;
  }
  return '';
}

function renderAsiPreview() {
  const s = luState;
  const scores = s.char.abilityScores;
  const changes = {};

  if (s.asiChoice === 'plus2' && s.asiAbility1) {
    changes[s.asiAbility1] = 2;
  } else if (s.asiChoice === 'plus1_1') {
    if (s.asiAbility1) changes[s.asiAbility1] = 1;
    if (s.asiAbility2) changes[s.asiAbility2] = 1;
  }
  s.abilityChanges = changes;

  if (Object.keys(changes).length === 0) return '';

  let html = '<h3 style="margin-top:16px;margin-bottom:8px;font-size:0.95rem">Ability Score Preview</h3>';
  html += '<div class="lu-asi-preview">';
  for (const ab of ABILITIES) {
    const change = changes[ab] || 0;
    const oldScore = scores[ab];
    const newScore = oldScore + change;
    html += `<div class="lu-asi-card ${change ? 'changed' : ''}">
      <div class="asi-name">${ABILITY_NAMES[ab]}</div>
      <div class="asi-val">${change
        ? `${oldScore} <span class="asi-arrow">→ ${newScore}</span> (${modStr(newScore)})`
        : `${oldScore} (${modStr(oldScore)})`}</div>
    </div>`;
  }
  html += '</div>';

  // Derived stat changes
  const derivedChanges = getAsiDerivedChanges(changes, scores, s);
  if (derivedChanges.length > 0) {
    html += '<div style="margin-top:12px">';
    derivedChanges.forEach(d => {
      html += `<div class="lu-change"><span class="change-label">${d.label}</span>
        <span class="change-old">${d.old}</span><span class="change-arrow">→</span><span class="change-new">${d.new_}</span></div>`;
    });
    html += '</div>';
  }

  return html;
}

function getAsiDerivedChanges(changes, scores, s) {
  var derived = [];
  var newProfBonus = s.prog.proficiencyBonus;

  // Cleric: WIS affects Spell DC / Attack / Prepared Spells
  if (s.cls === 'Cleric' || !s.cls) {
    if (changes.wis) {
      var oldWisMod = mod(scores.wis);
      var newWisMod = mod(scores.wis + changes.wis);
      if (newWisMod !== oldWisMod) {
        derived.push({ label: 'Spell Save DC', old: 8 + newProfBonus + oldWisMod, new_: 8 + newProfBonus + newWisMod });
        derived.push({ label: 'Spell Attack', old: '+' + (newProfBonus + oldWisMod), new_: '+' + (newProfBonus + newWisMod) });
        derived.push({ label: 'Prepared Spells', old: s.newLevel + oldWisMod, new_: s.newLevel + newWisMod });
      }
    }
  }
  // Rogue AT: INT affects Spell DC / Attack (same as EK)
  if (s.cls === 'Rogue') {
    var rSub = s.char.subclass || s.subclassSelection;
    if (rSub === 'Arcane Trickster' && changes.int) {
      var oldIntMod2 = mod(scores.int);
      var newIntMod2 = mod(scores.int + changes.int);
      if (newIntMod2 !== oldIntMod2) {
        derived.push({ label: 'Spell Save DC', old: 8 + newProfBonus + oldIntMod2, new_: 8 + newProfBonus + newIntMod2 });
        derived.push({ label: 'Spell Attack', old: '+' + (newProfBonus + oldIntMod2), new_: '+' + (newProfBonus + newIntMod2) });
      }
    }
  }
  // Wizard: INT affects Spell DC / Attack / Prepared Spells
  if (s.cls === 'Wizard') {
    if (changes.int) {
      var oldWizIntMod = mod(scores.int);
      var newWizIntMod = mod(scores.int + changes.int);
      if (newWizIntMod !== oldWizIntMod) {
        derived.push({ label: 'Spell Save DC', old: 8 + newProfBonus + oldWizIntMod, new_: 8 + newProfBonus + newWizIntMod });
        derived.push({ label: 'Spell Attack', old: '+' + (newProfBonus + oldWizIntMod), new_: '+' + (newProfBonus + newWizIntMod) });
        var oldWizPrep = Math.max(1, s.newLevel + oldWizIntMod);
        var newWizPrep = Math.max(1, s.newLevel + newWizIntMod);
        derived.push({ label: 'Prepared Spells', old: oldWizPrep, new_: newWizPrep });
      }
    }
  }
  // Paladin: CHA affects Spell DC / Attack / Prepared Spells
  if (s.cls === 'Paladin') {
    if (changes.cha) {
      var oldChaMod = mod(scores.cha);
      var newChaMod = mod(scores.cha + changes.cha);
      if (newChaMod !== oldChaMod) {
        derived.push({ label: 'Spell Save DC', old: 8 + newProfBonus + oldChaMod, new_: 8 + newProfBonus + newChaMod });
        derived.push({ label: 'Spell Attack', old: '+' + (newProfBonus + oldChaMod), new_: '+' + (newProfBonus + newChaMod) });
        var oldPrep = Math.max(1, oldChaMod + Math.floor(s.newLevel / 2));
        var newPrep = Math.max(1, newChaMod + Math.floor(s.newLevel / 2));
        derived.push({ label: 'Prepared Spells', old: oldPrep, new_: newPrep });
      }
    }
  }
  // Fighter EK: INT affects Spell DC / Attack
  if (s.cls === 'Fighter') {
    var sub = s.char.subclass || s.subclassSelection;
    if (sub === 'Eldritch Knight' && changes.int) {
      var oldIntMod = mod(scores.int);
      var newIntMod = mod(scores.int + changes.int);
      if (newIntMod !== oldIntMod) {
        derived.push({ label: 'Spell Save DC', old: 8 + newProfBonus + oldIntMod, new_: 8 + newProfBonus + newIntMod });
        derived.push({ label: 'Spell Attack', old: '+' + (newProfBonus + oldIntMod), new_: '+' + (newProfBonus + newIntMod) });
      }
    }
    if (sub === 'Battle Master' && (changes.str || changes.dex)) {
      var oldBest = Math.max(mod(scores.str), mod(scores.dex));
      var newBest = Math.max(mod(scores.str + (changes.str || 0)), mod(scores.dex + (changes.dex || 0)));
      if (newBest !== oldBest) {
        derived.push({ label: 'Maneuver Save DC', old: 8 + newProfBonus + oldBest, new_: 8 + newProfBonus + newBest });
      }
    }
  }
  if (changes.dex) {
    var oldDexMod = mod(scores.dex);
    var newDexMod = mod(scores.dex + changes.dex);
    if (newDexMod !== oldDexMod) {
      derived.push({ label: 'Initiative', old: (oldDexMod >= 0 ? '+' : '') + oldDexMod, new_: (newDexMod >= 0 ? '+' : '') + newDexMod });
    }
  }
  return derived;
}

function renderCantripScreen() {
  const known = luState.char.cantripsKnown;
  const available = CLERIC_CANTRIPS.filter(c => !known.includes(c));

  let html = `<div class="lu-screen active">
    <h2>New Cantrip</h2>
    <div class="lu-callout">You learn one additional cleric cantrip. You currently know: <strong>${known.join(', ')}</strong></div>
    <div class="lu-option-group">
      ${available.map(c => `<div class="lu-option ${luState.newCantrip === c ? 'selected' : ''}" onclick="luState.newCantrip='${c}';renderLuScreen(true)">
        <div class="opt-title">${c}</div>
      </div>`).join('')}
    </div>
  </div>`;
  return html;
}

function renderSpellSlotsScreen() {
  const s = luState;

  // EK/AT: use 1/3 caster spell slot table
  if ((s.cls === 'Fighter' && (s.char.subclass === 'Eldritch Knight' || s.subclassSelection === 'Eldritch Knight')) ||
      (s.cls === 'Rogue' && (s.char.subclass === 'Arcane Trickster' || s.subclassSelection === 'Arcane Trickster'))) {
    return renderEkSpellSlotsScreen();
  }

  // Determine slot tables and prep count based on class
  var oldSlots, newSlots, oldPrepCount, newPrepCount, prepLabel;
  if (s.cls === 'Paladin') {
    oldSlots = getHalfCasterSlots(s.char.level);
    newSlots = getHalfCasterSlots(s.newLevel);
    var chaChange = s.abilityChanges.cha || 0;
    var oldChaMod = getEffectiveMod(s.char, 'cha');
    var origCha = s.char.abilityScores.cha; s.char.abilityScores.cha += chaChange;
    var newChaMod = getEffectiveMod(s.char, 'cha'); s.char.abilityScores.cha = origCha;
    oldPrepCount = Math.max(1, oldChaMod + Math.floor(s.char.level / 2));
    newPrepCount = Math.max(1, newChaMod + Math.floor(s.newLevel / 2));
    prepLabel = 'CHA modifier + half paladin level';
  } else if (s.cls === 'Wizard') {
    oldSlots = getFullCasterSlots(s.char.level);
    newSlots = getFullCasterSlots(s.newLevel);
    var intChange = s.abilityChanges.int || 0;
    var oldIntMod = getEffectiveMod(s.char, 'int');
    var origInt = s.char.abilityScores.int; s.char.abilityScores.int += intChange;
    var newIntMod = getEffectiveMod(s.char, 'int'); s.char.abilityScores.int = origInt;
    oldPrepCount = Math.max(1, s.char.level + oldIntMod);
    newPrepCount = Math.max(1, s.newLevel + newIntMod);
    prepLabel = 'level + INT modifier';
  } else {
    // Cleric
    oldSlots = s.char.spellSlots;
    newSlots = s.prog.spellSlots;
    var oldWisMod = getEffectiveMod(s.char, 'wis');
    var wisChange = s.abilityChanges.wis || 0;
    var origWis = s.char.abilityScores.wis; s.char.abilityScores.wis += wisChange;
    var newWisMod = getEffectiveMod(s.char, 'wis'); s.char.abilityScores.wis = origWis;
    oldPrepCount = Math.max(1, s.char.level + oldWisMod);
    newPrepCount = Math.max(1, s.newLevel + newWisMod);
    prepLabel = 'level + WIS modifier';
  }

  let html = '<div class="lu-screen active"><h2>Spell Slots &amp; Access</h2>';

  // Check for new spell level
  var oldMaxLevel = 0, newMaxLevel = 0;
  Object.keys(oldSlots).forEach(function(k) { oldMaxLevel = Math.max(oldMaxLevel, parseInt(k)); });
  Object.keys(newSlots).forEach(function(k) { newMaxLevel = Math.max(newMaxLevel, parseInt(k)); });
  if (newMaxLevel > oldMaxLevel) {
    html += '<div class="lu-callout highlight"><strong>New spell level unlocked!</strong> You can now prepare and cast <strong>' + ordinal(newMaxLevel) + '-level spells</strong>.</div>';
  }

  const allLevels = new Set([...Object.keys(oldSlots).map(Number), ...Object.keys(newSlots).map(Number)]);
  const sortedLevels = [...allLevels].sort((a, b) => a - b);

  html += '<div class="lu-section">';
  sortedLevels.forEach(sl => {
    const old = oldSlots[sl] || 0;
    const nw = newSlots[sl] || 0;
    const changed = old !== nw;
    html += '<div class="lu-slot-compare">';
    html += '<span style="min-width:80px;font-size:0.85rem;color:var(--text-dim)">' + ordinal(sl) + ' Level</span>';
    html += '<div class="slot-side old">' + '<span class="slot-dot filled"></span>'.repeat(old) + (old === 0 ? '<span style="color:var(--text-dim);font-size:0.85rem">—</span>' : '') + '</div>';
    if (changed) {
      html += '<span class="change-arrow" style="font-size:0.9rem">→</span>';
      html += '<div class="slot-side">' + '<span class="slot-dot filled"></span>'.repeat(nw) + '</div>';
    }
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="lu-change" style="margin-top:12px"><span class="change-label">Prepared Spells</span>';
  html += '<span class="change-old">' + oldPrepCount + '</span><span class="change-arrow">→</span><span class="change-new">' + newPrepCount + '</span></div>';

  html += '</div>';
  return html;
}

function renderEkSpellSlotsScreen() {
  var s = luState;
  var oldSlots = getThirdCasterSlots(s.char.level);
  var newSlots = getThirdCasterSlots(s.newLevel);
  var html = '<div class="lu-screen active"><h2>Spell Slots</h2>';

  // Check for new spell level
  var oldMaxLevel = 0, newMaxLevel = 0;
  Object.keys(oldSlots).forEach(function(k) { oldMaxLevel = Math.max(oldMaxLevel, parseInt(k)); });
  Object.keys(newSlots).forEach(function(k) { newMaxLevel = Math.max(newMaxLevel, parseInt(k)); });
  if (newMaxLevel > oldMaxLevel) {
    html += '<div class="lu-callout highlight"><strong>New spell level unlocked!</strong> You can now cast <strong>' + ordinal(newMaxLevel) + '-level spells</strong>.</div>';
  }

  var allLevels = {};
  Object.keys(oldSlots).forEach(function(k) { allLevels[k] = true; });
  Object.keys(newSlots).forEach(function(k) { allLevels[k] = true; });
  var sortedLevels = Object.keys(allLevels).map(Number).sort(function(a,b){return a-b;});

  html += '<div class="lu-section">';
  sortedLevels.forEach(function(sl) {
    var old = oldSlots[sl] || 0;
    var nw = newSlots[sl] || 0;
    var changed = old !== nw;
    html += '<div class="lu-slot-compare">';
    html += '<span style="min-width:80px;font-size:0.85rem;color:var(--text-dim)">' + ordinal(sl) + ' Level</span>';
    html += '<div class="slot-side old">' + '<span class="slot-dot filled"></span>'.repeat(old) + (old === 0 ? '<span style="color:var(--text-dim);font-size:0.85rem">—</span>' : '') + '</div>';
    if (changed) {
      html += '<span class="change-arrow" style="font-size:0.9rem">→</span>';
      html += '<div class="slot-side">' + '<span class="slot-dot filled"></span>'.repeat(nw) + '</div>';
    }
    html += '</div>';
  });
  html += '</div>';

  // Spells known count
  var oldSpellsKnown = THIRD_CASTER_SPELLS_KNOWN[s.char.level] || 0;
  var newSpellsKnown = THIRD_CASTER_SPELLS_KNOWN[s.newLevel] || 0;
  if (oldSpellsKnown !== newSpellsKnown) {
    html += '<div class="lu-change" style="margin-top:12px"><span class="change-label">Spells Known</span>';
    html += '<span class="change-old">' + oldSpellsKnown + '</span><span class="change-arrow">→</span><span class="change-new">' + newSpellsKnown + '</span></div>';
  }

  html += '</div>';
  return html;
}

function renderFeaturesScreen() {
  var s = luState;
  var features, featureDescriptions;

  if (s.cls === 'Fighter') {
    features = getFighterLevelFeatures(s.newLevel, s.char.subclass || s.subclassSelection);
    featureDescriptions = FIGHTER_FEATURE_DESCRIPTIONS;
  } else if (s.cls === 'Paladin') {
    features = getPaladinLevelFeatures(s.newLevel, s.char.subclass || s.subclassSelection);
    featureDescriptions = PALADIN_FEATURE_DESCRIPTIONS;
  } else if (s.cls === 'Rogue') {
    features = getRogueLevelFeatures(s.newLevel, s.char.subclass || s.subclassSelection);
    featureDescriptions = ROGUE_FEATURE_DESCRIPTIONS;
  } else if (s.cls === 'Wizard') {
    features = getWizardLevelFeatures(s.newLevel, s.char.subclass || s.subclassSelection);
    featureDescriptions = WIZARD_FEATURE_DESCRIPTIONS;
  } else {
    features = s.prog.features || [];
    featureDescriptions = CLERIC_FEATURE_DESCRIPTIONS;
  }

  let html = '<div class="lu-screen active"><h2>New Features</h2>';

  // Cleric: Channel Divinity increase
  if (s.cls === 'Cleric' && s.prog.channelDivinityUses > getChannelDivUses(s.char.level)) {
    const oldUses = getChannelDivUses(s.char.level);
    const newUses = s.prog.channelDivinityUses;
    const featureName = 'Channel Divinity (' + newUses + '/rest)';
    html += '<div class="lu-feature"><h3>' + featureName + '</h3>';
    html += '<p>' + (featureDescriptions[featureName] || 'You can now use Channel Divinity ' + newUses + ' times between rests (was ' + oldUses + ').') + '</p></div>';
  }

  features.forEach(function(f) {
    html += '<div class="lu-feature"><h3>' + f + '</h3>';
    html += '<p>' + (featureDescriptions[f] || '') + '</p></div>';
  });

  html += '</div>';
  return html;
}

function renderDomainSpellsScreen() {
  var s = luState;
  var isPaladin = s.cls === 'Paladin';
  var sectionLabel = isPaladin ? 'Oath Spells' : 'Domain Spells';

  // Compute new spells gained at this level
  var ds;
  if (isPaladin) {
    var oath = s.char.subclass || s.subclassSelection || '';
    var oathTable = OATH_SPELLS[oath];
    if (oathTable && oathTable[s.newLevel]) {
      ds = {};
      ds[s.newLevel] = oathTable[s.newLevel];
    } else {
      ds = {};
    }
  } else {
    ds = s.prog.domainSpells || {};
  }

  let html = '<div class="lu-screen active">';
  html += '<h2>New ' + sectionLabel + '</h2>';
  html += '<div class="lu-callout highlight">These spells are <strong>always prepared</strong> and don\'t count against your prepared spell limit.</div>';

  var paladinOathLevelMap = { 3: 1, 5: 2, 9: 3, 13: 4, 17: 5 };
  for (const [lvl, spells] of Object.entries(ds)) {
    var spellLevel = isPaladin ? (paladinOathLevelMap[parseInt(lvl)] || 1) : (CLERIC_LEVEL_TO_SPELL_LEVEL[parseInt(lvl)] || 1);
    html += '<div class="lu-feature">';
    html += '<h3>' + ordinal(spellLevel) + '-Level ' + sectionLabel + '</h3>';
    html += '<div class="tag-list" style="margin-top:8px">' + spells.map(function(sp) { return '<span class="tag accent">' + escapeHtml(sp) + '</span>'; }).join('') + '</div>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/* ── Fighter-specific Level-Up Screens ── */

function renderSubclassSelectScreen() {
  var s = luState;
  var cd = s.cd;
  var html = '<div class="lu-screen active"><h2>Choose Your ' + cd.subclassLabel + '</h2>';
  var subCallout = s.cls === 'Paladin'
    ? 'At level 3, you swear your Sacred Oath. This determines your oath spells and Channel Divinity options.'
    : s.cls === 'Rogue'
    ? 'At level 3, you choose your Roguish Archetype. This determines your specialized abilities.'
    : s.cls === 'Wizard'
    ? 'At level 2, you choose your Arcane Tradition. This determines your school-specific abilities.'
    : 'At level 3, you choose your martial archetype. This determines your specialized abilities.';
  html += '<div class="lu-callout">' + subCallout + '</div>';
  html += '<div class="lu-option-group">';
  cd.subclasses.forEach(function(sub) {
    var selected = s.subclassSelection === sub;
    var desc = '';
    if (sub === 'Champion') desc = 'Improved criticals, remarkable athleticism, and survivability. Simple and powerful.';
    else if (sub === 'Battle Master') desc = 'Tactical superiority dice and combat maneuvers. Strategic and versatile.';
    else if (sub === 'Eldritch Knight') desc = 'Blend martial prowess with arcane magic (Wizard spells). Defensive and offensive casting.';
    else if (sub === 'Oath of Devotion') desc = 'Honor, virtue, and the protection of the innocent. Buff-focused with Sacred Weapon and aura of anti-charm.';
    else if (sub === 'Oath of the Ancients') desc = 'Preserve the light against darkness. Nature-themed with spell damage resistance aura.';
    else if (sub === 'Oath of Vengeance') desc = 'Punish the wicked with righteous fury. Offense-focused with advantage on specific targets.';
    else if (sub === 'Thief') desc = 'Quick hands, climbing prowess, and the ultimate ability to use any magic item. Versatile and fast.';
    else if (sub === 'Assassin') desc = 'Master of surprise and disguise. Devastating first strikes with auto-crits on surprised targets.';
    else if (sub === 'Arcane Trickster') desc = 'Blend roguish skills with Enchantment and Illusion magic (Wizard spells). Tricky and magical.';
    else if (sub === 'School of Abjuration') desc = 'Protective magic specialist. Arcane Ward absorbs damage for you.';
    else if (sub === 'School of Conjuration') desc = 'Summon creatures and objects. Teleportation and focused concentration.';
    else if (sub === 'School of Divination') desc = 'See the future with Portent dice. Replace any roll with your foretelling.';
    else if (sub === 'School of Enchantment') desc = 'Control minds with Hypnotic Gaze and split targeting on charm spells.';
    else if (sub === 'School of Evocation') desc = 'Master of damage spells. Sculpt Spells protects allies from your Fireballs.';
    else if (sub === 'School of Illusion') desc = 'Create convincing illusions. Make illusions real at higher levels.';
    else if (sub === 'School of Necromancy') desc = 'Harvest life from kills. Command undead with enhanced servants.';
    else if (sub === 'School of Transmutation') desc = 'Transform matter and self. Transmuter\'s Stone grants versatile benefits.';
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luSelectSubclass(\'' + sub.replace(/'/g, "\\'") + '\')">';
    html += '<div class="opt-title">' + escapeHtml(sub) + '</div>';
    html += '<div class="opt-desc">' + desc + '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function luSelectSubclass(sub) {
  luState.subclassSelection = sub;
  renderLuScreen(true);
}

function renderFightingStyleSelectScreen() {
  var s = luState;
  var existingStyle = s.char.fightingStyle || '';
  var html = '<div class="lu-screen active"><h2>Additional Fighting Style</h2>';
  html += '<div class="lu-callout">As a Champion, you learn a second Fighting Style.' + (existingStyle ? ' You cannot choose your existing style (' + existingStyle + ').' : '') + '</div>';
  html += '<div class="lu-option-group">';
  Object.keys(FIGHTING_STYLES).forEach(function(style) {
    if (style === existingStyle) return;
    var data = FIGHTING_STYLES[style];
    var selected = s.fightingStyleSelection === style;
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luSelectFightingStyle(\'' + style.replace(/'/g, "\\'") + '\')">';
    html += '<div class="opt-title">' + escapeHtml(style) + '</div>';
    html += '<div class="opt-desc">' + data.effect + '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function luSelectFightingStyle(style) {
  luState.fightingStyleSelection = style;
  renderLuScreen(true);
}

function renderPaladinFightingStyleScreen() {
  var s = luState;
  var html = '<div class="lu-screen active"><h2>Choose Your Fighting Style</h2>';
  html += '<div class="lu-callout">At level 2, you learn a Fighting Style that enhances your combat technique.</div>';
  html += '<div class="lu-option-group">';
  Object.keys(PALADIN_FIGHTING_STYLES).forEach(function(style) {
    var data = PALADIN_FIGHTING_STYLES[style];
    var selected = s.fightingStyleSelection === style;
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luSelectFightingStyle(\'' + style.replace(/'/g, "\\'") + '\')">';
    html += '<div class="opt-title">' + escapeHtml(style) + '</div>';
    html += '<div class="opt-desc">' + data.effect + '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function renderExpertiseSelectScreen() {
  var s = luState;
  var existingExpertise = s.char.expertiseSkills || [];
  var profSkills = (s.char.skillProficiencies || []).filter(function(sk) {
    return existingExpertise.indexOf(sk.toLowerCase()) < 0;
  });

  var html = '<div class="lu-screen active"><h2>Choose 2 More Expertise Skills</h2>';
  html += '<div class="lu-callout">Your proficiency bonus is doubled for the chosen skills. You already have Expertise in: <strong>' + (existingExpertise.length > 0 ? existingExpertise.map(function(s2) { return s2.charAt(0).toUpperCase() + s2.slice(1); }).join(', ') : 'none') + '</strong></div>';
  html += '<div style="margin-bottom:8px;font-size:0.85rem;color:var(--accent)">Selected: ' + s.newExpertiseSkills.length + ' / 2</div>';
  html += '<div class="lu-option-group">';
  profSkills.forEach(function(sk) {
    var name = sk.charAt(0).toUpperCase() + sk.slice(1);
    var skill = SKILLS.find(function(s2) { return s2.name.toLowerCase() === sk.toLowerCase(); });
    var abilMod = skill ? getEffectiveMod(s.char, skill.ability) : 0;
    var expBonus = abilMod + s.char.proficiencyBonus * 2;
    var selected = s.newExpertiseSkills.indexOf(sk) >= 0;
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luToggleExpertise(\'' + sk.replace(/'/g, "\\'") + '\')">';
    html += '<div class="opt-title">' + escapeHtml(name) + '</div>';
    html += '<div class="opt-desc">Current: +' + (abilMod + s.char.proficiencyBonus) + ' \u2192 Expertise: +' + expBonus + '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function luToggleExpertise(skill) {
  var s = luState;
  var idx = s.newExpertiseSkills.indexOf(skill);
  if (idx >= 0) {
    s.newExpertiseSkills.splice(idx, 1);
  } else if (s.newExpertiseSkills.length < 2) {
    s.newExpertiseSkills.push(skill);
  }
  renderLuScreen(true);
}

function renderManeuverSelectScreen() {
  var s = luState;
  var knownManeuvers = (s.char.maneuversKnown || []).slice();
  var prevKnown = knownManeuvers.length;
  var totalNeeded = getBmManeuversKnown(s.newLevel);
  var newToChoose = totalNeeded - prevKnown;

  var html = '<div class="lu-screen active"><h2>Learn Maneuvers</h2>';
  html += '<div class="lu-callout">Choose <strong>' + newToChoose + '</strong> new maneuver' + (newToChoose > 1 ? 's' : '') + '. You will know ' + totalNeeded + ' total.</div>';

  if (knownManeuvers.length > 0) {
    html += '<div style="margin-bottom:16px"><strong>Already known:</strong> ' + knownManeuvers.map(escapeHtml).join(', ') + '</div>';
  }

  html += '<div style="margin-bottom:8px;font-size:0.85rem;color:var(--accent)">Selected: ' + s.maneuverSelections.length + ' / ' + newToChoose + '</div>';
  html += '<div class="lu-option-group">';
  Object.keys(MANEUVERS).forEach(function(name) {
    if (knownManeuvers.indexOf(name) >= 0) return;
    var selected = s.maneuverSelections.indexOf(name) >= 0;
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luToggleManeuver(\'' + name.replace(/'/g, "\\'") + '\')">';
    html += '<div class="opt-title">' + escapeHtml(name) + '</div>';
    html += '<div class="opt-desc" style="font-size:0.8rem">' + MANEUVERS[name] + '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function luToggleManeuver(name) {
  var s = luState;
  var idx = s.maneuverSelections.indexOf(name);
  var prevKnown = s.char.maneuversKnown ? s.char.maneuversKnown.length : 0;
  var totalNeeded = getBmManeuversKnown(s.newLevel);
  var newToChoose = totalNeeded - prevKnown;
  if (idx >= 0) {
    s.maneuverSelections.splice(idx, 1);
  } else if (s.maneuverSelections.length < newToChoose) {
    s.maneuverSelections.push(name);
  }
  renderLuScreen(true);
}

function renderEkCantripSelectScreen() {
  var s = luState;
  var isAT = s.cls === 'Rogue' && (s.char.subclass === 'Arcane Trickster' || s.subclassSelection === 'Arcane Trickster');
  var known = (s.char.cantripsKnown || []).slice();
  var oldCount = THIRD_CASTER_CANTRIPS_KNOWN[s.char.level] || 0;
  var newCount = THIRD_CASTER_CANTRIPS_KNOWN[s.newLevel] || 0;
  var toChoose = newCount - oldCount;

  var html = '<div class="lu-screen active">';
  html += '<div class="lu-callout">Choose ' + toChoose + ' new wizard cantrip' + (toChoose > 1 ? 's' : '') + '.</div>';

  // AT: Mage Hand is a free bonus cantrip at level 3
  if (isAT && s.newLevel === 3) {
    html += '<div style="margin-bottom:12px;padding:8px;background:rgba(196,163,90,0.1);border-radius:var(--radius)"><strong style="color:var(--accent)">Mage Hand</strong> — free bonus cantrip (Mage Hand Legerdemain)</div>';
  }

  if (known.length > 0) {
    html += '<div style="margin-bottom:12px"><strong>Known:</strong> ' + known.map(escapeHtml).join(', ') + '</div>';
  }

  html += '<div class="sticky-picker-header"><h2>New Cantrip' + (toChoose > 1 ? 's' : '') + '</h2>';
  html += '<div style="font-size:0.85rem;color:var(--accent)">Selected: ' + s.ekCantripSelections.length + ' / ' + toChoose + '</div></div>';
  html += '<div class="lu-option-group">';
  WIZARD_CANTRIPS.forEach(function(cantrip) {
    if (known.indexOf(cantrip.name) >= 0) return;
    // AT: exclude Mage Hand from picker (it's auto-added)
    if (isAT && cantrip.name === 'Mage Hand') return;
    var selected = s.ekCantripSelections.indexOf(cantrip.name) >= 0;
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luToggleEkCantrip(\'' + cantrip.name.replace(/'/g, "\\'") + '\')">';
    html += '<div class="opt-title">' + escapeHtml(cantrip.name) + ' <span class="text-dim" style="font-size:0.75rem">' + cantrip.school + '</span></div>';
    html += '<div class="opt-desc" style="font-size:0.8rem">' + cantrip.description.substring(0, 120) + (cantrip.description.length > 120 ? '...' : '') + '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function luToggleEkCantrip(name) {
  var s = luState;
  var idx = s.ekCantripSelections.indexOf(name);
  var oldCount = THIRD_CASTER_CANTRIPS_KNOWN[s.char.level] || 0;
  var newCount = THIRD_CASTER_CANTRIPS_KNOWN[s.newLevel] || 0;
  var toChoose = newCount - oldCount;
  if (idx >= 0) {
    s.ekCantripSelections.splice(idx, 1);
  } else if (s.ekCantripSelections.length < toChoose) {
    s.ekCantripSelections.push(name);
  }
  renderLuScreen(true);
}

function renderEkSpellSelectScreen() {
  var s = luState;
  var isAT = s.cls === 'Rogue' && (s.char.subclass === 'Arcane Trickster' || s.subclassSelection === 'Arcane Trickster');
  var known = (s.char.spellsKnown || []).slice();
  var oldCount = THIRD_CASTER_SPELLS_KNOWN[s.char.level] || 0;
  var newCount = THIRD_CASTER_SPELLS_KNOWN[s.newLevel] || 0;
  var toChoose = newCount - oldCount;
  var isFreePickLevel = THIRD_CASTER_FREE_PICK_LEVELS.indexOf(s.newLevel) >= 0;

  // School filter: EK = Abjuration/Evocation, AT = Enchantment/Illusion
  var school1 = isAT ? 'Enchantment' : 'Abjuration';
  var school2 = isAT ? 'Illusion' : 'Evocation';

  // Determine max spell level available
  var ekSlots = getThirdCasterSlots(s.newLevel);
  var maxSpellLevel = 0;
  Object.keys(ekSlots).forEach(function(k) { maxSpellLevel = Math.max(maxSpellLevel, parseInt(k)); });

  var html = '<div class="lu-screen active">';
  html += '<div class="lu-callout">Choose <strong>' + toChoose + '</strong> new wizard spell' + (toChoose > 1 ? 's' : '') + '. ';
  if (isFreePickLevel) {
    html += '<strong style="color:var(--accent)">Free pick!</strong> You can choose from any school.';
  } else {
    html += 'Must be <strong>' + school1 + '</strong> or <strong>' + school2 + '</strong>.';
  }
  html += '</div>';

  if (known.length > 0) {
    html += '<div style="margin-bottom:12px"><strong>Known:</strong> ' + known.map(escapeHtml).join(', ') + '</div>';
  }

  html += '<div class="sticky-picker-header"><h2>Learn Spells</h2>';
  html += '<div style="font-size:0.85rem;color:var(--accent)">Selected: ' + s.ekSpellSelections.length + ' / ' + toChoose + '</div></div>';

  // Filter available spells
  var available = getAllEkSpells().filter(function(sp) {
    if (sp.level > maxSpellLevel || sp.level < 1) return false;
    if (known.indexOf(sp.name) >= 0) return false;
    if (s.ekSpellSelections.indexOf(sp.name) >= 0) return true;
    if (!isFreePickLevel && sp.school !== school1 && sp.school !== school2) return false;
    return true;
  });

  // Group by level
  var byLevel = {};
  available.forEach(function(sp) {
    if (!byLevel[sp.level]) byLevel[sp.level] = [];
    byLevel[sp.level].push(sp);
  });

  html += '<div class="lu-option-group">';
  Object.keys(byLevel).sort(function(a,b){return a-b;}).forEach(function(level) {
    html += '<h3 style="margin:16px 0 8px;font-size:1rem;color:var(--accent)">' + ordinal(parseInt(level)) + ' Level</h3>';
    byLevel[level].forEach(function(sp) {
      var selected = s.ekSpellSelections.indexOf(sp.name) >= 0;
      var schoolTag = '';
      if (isFreePickLevel && sp.school !== school1 && sp.school !== school2) {
        schoolTag = ' <span style="font-size:0.7rem;background:var(--surface);padding:2px 6px;border-radius:4px;color:var(--text-dim)">' + sp.school + '</span>';
      }
      html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luToggleEkSpell(\'' + sp.name.replace(/'/g, "\\'") + '\')">';
      html += '<div class="opt-title">' + escapeHtml(sp.name) + schoolTag + '</div>';
      html += '<div class="opt-desc" style="font-size:0.8rem">' + sp.description.substring(0, 100) + (sp.description.length > 100 ? '...' : '') + '</div></div>';
    });
  });
  html += '</div>';

  // Spell swap option
  if (known.length > 0) {
    html += '<div style="border-top:1px solid var(--border);margin-top:16px;padding-top:16px">';
    html += '<h3 style="margin-bottom:8px">Swap a Spell (Optional)</h3>';
    html += '<div class="text-dim" style="font-size:0.85rem;margin-bottom:8px">You may replace one known spell with a different Wizard spell (following school restrictions).</div>';
    html += '<select onchange="luSetSpellSwapFrom(this.value)" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);width:100%;margin-bottom:8px;font-size:0.95rem">';
    html += '<option value="">— No swap —</option>';
    known.forEach(function(name) {
      html += '<option value="' + escapeHtml(name) + '" ' + (s.ekSpellSwap.from === name ? 'selected' : '') + '>' + escapeHtml(name) + '</option>';
    });
    html += '</select>';

    if (s.ekSpellSwap.from) {
      var swapAvailable = getAllEkSpells().filter(function(sp) {
        if (sp.level > maxSpellLevel || sp.level < 1) return false;
        if (known.indexOf(sp.name) >= 0 && sp.name !== s.ekSpellSwap.from) return false;
        if (s.ekSpellSelections.indexOf(sp.name) >= 0) return false;
        if (!isFreePickLevel && sp.school !== school1 && sp.school !== school2) return false;
        return true;
      });
      html += '<select onchange="luState.ekSpellSwap.to=this.value" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);width:100%;font-size:0.95rem">';
      html += '<option value="">— Select replacement —</option>';
      swapAvailable.forEach(function(sp) {
        html += '<option value="' + escapeHtml(sp.name) + '" ' + (s.ekSpellSwap.to === sp.name ? 'selected' : '') + '>' + escapeHtml(sp.name) + ' (' + sp.school + ')</option>';
      });
      html += '</select>';
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function luSetSpellSwapFrom(val) {
  luState.ekSpellSwap.from = val || null;
  luState.ekSpellSwap.to = null;
  renderLuScreen(true);
}

function luToggleEkSpell(name) {
  var s = luState;
  var idx = s.ekSpellSelections.indexOf(name);
  var oldCount = THIRD_CASTER_SPELLS_KNOWN[s.char.level] || 0;
  var newCount = THIRD_CASTER_SPELLS_KNOWN[s.newLevel] || 0;
  var toChoose = newCount - oldCount;
  if (idx >= 0) {
    s.ekSpellSelections.splice(idx, 1);
  } else if (s.ekSpellSelections.length < toChoose) {
    s.ekSpellSelections.push(name);
  }
  renderLuScreen(true);
}

/* ═══════════════════════════════════════════
   PALADIN SPELL PREPARATION (Level-Up)
   ═══════════════════════════════════════════ */

function renderPaladinPrepareScreen() {
  var s = luState;
  var _origCha = s.char.abilityScores.cha; s.char.abilityScores.cha += (s.abilityChanges.cha || 0);
  var chaMod = getEffectiveMod(s.char, 'cha'); s.char.abilityScores.cha = _origCha;
  var maxPrep = Math.max(1, chaMod + Math.floor(s.newLevel / 2));
  var sub = s.char.subclass || s.subclassSelection || '';
  var oathSpells = (typeof getOathSpells === 'function') ? getOathSpells(sub, s.newLevel) : [];
  var slots = getHalfCasterSlots(s.newLevel);
  var maxSpellLevel = 0;
  Object.keys(slots).forEach(function(k) { maxSpellLevel = Math.max(maxSpellLevel, parseInt(k)); });

  var current = s.char.currentPreparedSpells || [];
  // Use previous selections if revisiting this screen
  if (s.paladinPrepSelections.length > 0) current = s.paladinPrepSelections;

  var isFirst = s.newLevel === 2;
  var html = '<div class="lu-screen active">';
  html += '<div class="lu-callout">' + (isFirst ? 'You can now cast spells! Choose which Paladin spells to prepare.' : 'You have access to new spell levels. Update your prepared spells if you wish.') + '</div>';
  html += '<p class="text-dim" style="font-size:0.85rem;margin-bottom:8px">Prepare up to <strong>' + maxPrep + '</strong> spells (CHA modifier ' + (chaMod >= 0 ? '+' : '') + chaMod + ' + half paladin level ' + Math.floor(s.newLevel / 2) + ').</p>';

  // Show oath spells as always-prepared (read-only)
  if (oathSpells.length > 0) {
    html += '<div style="margin-bottom:12px"><strong>Oath Spells (always prepared):</strong> ' + oathSpells.map(escapeHtml).join(', ') + '</div>';
  }

  html += '<div class="sticky-picker-header"><h2>' + (isFirst ? 'Prepare Your Spells' : 'Update Prepared Spells') + '</h2>';
  html += '<div id="pal-prep-count" style="font-size:0.85rem;color:var(--accent)">Selected: ' + current.length + ' / ' + maxPrep + '</div></div>';
  html += '<div class="lu-option-group">';
  for (var sl = 1; sl <= maxSpellLevel; sl++) {
    var spells = (PALADIN_SPELLS[sl] || []).filter(function(n) { return oathSpells.indexOf(n) < 0; });
    if (spells.length === 0) continue;
    html += '<h3 style="margin:12px 0 8px;font-size:1rem;color:var(--accent)">' + ordinal(sl) + ' Level</h3>';
    spells.forEach(function(name) {
      var checked = current.indexOf(name) >= 0;
      html += '<label style="display:block;padding:4px 0;cursor:pointer"><input type="checkbox" name="pal-prepare" value="' + escapeHtml(name) + '"' + (checked ? ' checked' : '') + ' onclick="event.stopPropagation();onPalPrepChange(' + maxPrep + ')"> ' + escapeHtml(name) + '</label>';
    });
  }
  html += '</div></div>';
  return html;
}

function onPalPrepChange(maxPrep) {
  var count = document.querySelectorAll('input[name="pal-prepare"]:checked').length;
  var el = document.getElementById('pal-prep-count');
  if (el) el.textContent = 'Selected: ' + count + ' / ' + maxPrep;
  // Enforce limit
  if (count > maxPrep) {
    var all = document.querySelectorAll('input[name="pal-prepare"]:checked');
    all[all.length - 1].checked = false;
    count--;
    if (el) el.textContent = 'Selected: ' + count + ' / ' + maxPrep;
  }
  // Store selections in luState
  var selected = [];
  document.querySelectorAll('input[name="pal-prepare"]:checked').forEach(function(cb) { selected.push(cb.value); });
  luState.paladinPrepSelections = selected;
}

/* ═══════════════════════════════════════════
   WIZARD LEVEL-UP SCREENS
   ═══════════════════════════════════════════ */

function renderWizardCantripScreen() {
  var s = luState;
  var known = (s.char.cantripsKnown || []).slice();
  var available = WIZARD_CANTRIPS.filter(function(name) { return known.indexOf(name) < 0; });
  var html = '<div class="lu-screen active"><h2>New Cantrip</h2>';
  html += '<div class="lu-callout">Choose 1 new wizard cantrip. You currently know: <strong>' + known.join(', ') + '</strong></div>';
  html += '<div class="lu-option-group">';
  available.forEach(function(name) {
    var selected = s.wizNewCantrip === name;
    var sp = getSpell(name);
    var desc = sp ? sp.description.substring(0, 100) + (sp.description.length > 100 ? '...' : '') : '';
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luState.wizNewCantrip=\'' + name.replace(/'/g, "\\'") + '\';renderLuScreen(true)">';
    html += '<div class="opt-title">' + escapeHtml(name) + '</div>';
    if (desc) html += '<div class="opt-desc" style="font-size:0.8rem">' + desc + '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function renderWizardSpellbookAddScreen() {
  var s = luState;
  var spellbook = (s.char.spellbook || []).slice();
  var slots = getFullCasterSlots(s.newLevel);
  var maxSpellLevel = 0;
  Object.keys(slots).forEach(function(k) { maxSpellLevel = Math.max(maxSpellLevel, parseInt(k)); });
  var newSpellLevel = s.prog.newSpellLevel;

  var html = '<div class="lu-screen active">';
  html += '<div class="lu-callout">Choose <strong>2</strong> wizard spells to add to your spellbook.</div>';
  if (newSpellLevel) {
    html += '<div class="lu-callout highlight"><strong>New spell level unlocked!</strong> You can now learn <strong>' + ordinal(newSpellLevel) + '-level spells</strong>.</div>';
  }
  html += '<div class="sticky-picker-header"><h2>Add Spells to Spellbook</h2>';
  html += '<div style="font-size:0.85rem;color:var(--accent)">Selected: ' + s.wizSpellbookAdds.length + ' / 2</div></div>';
  html += '<div class="lu-option-group">';
  for (var sl = 1; sl <= maxSpellLevel; sl++) {
    var spells = (WIZARD_SPELL_LIST[sl] || []).filter(function(n) { return spellbook.indexOf(n) < 0 && s.wizSpellbookAdds.indexOf(n) < 0 || s.wizSpellbookAdds.indexOf(n) >= 0; });
    spells = spells.filter(function(n) { return spellbook.indexOf(n) < 0; });
    if (spells.length === 0) continue;
    html += '<h3 style="margin:16px 0 8px;font-size:1rem;color:var(--accent)">' + ordinal(sl) + ' Level</h3>';
    spells.forEach(function(name) {
      var selected = s.wizSpellbookAdds.indexOf(name) >= 0;
      var sp = getSpell(name);
      var desc = sp ? sp.description.substring(0, 80) + (sp.description.length > 80 ? '...' : '') : '';
      html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luToggleWizSpellbook(\'' + name.replace(/'/g, "\\'") + '\')">';
      html += '<div class="opt-title">' + escapeHtml(name) + (sp ? ' <span class="text-dim" style="font-size:0.75rem">' + sp.school + '</span>' : '') + '</div>';
      if (desc) html += '<div class="opt-desc" style="font-size:0.8rem">' + desc + '</div>';
      html += '</div>';
    });
  }
  html += '</div></div>';
  return html;
}

function luToggleWizSpellbook(name) {
  var idx = luState.wizSpellbookAdds.indexOf(name);
  if (idx >= 0) { luState.wizSpellbookAdds.splice(idx, 1); }
  else if (luState.wizSpellbookAdds.length < 2) { luState.wizSpellbookAdds.push(name); }
  renderLuScreen(true);
}

function renderSpellMasteryScreen() {
  var s = luState;
  var spellbook = s.char.spellbook || [];
  var level1 = spellbook.filter(function(n) { var sp = getSpell(n); return sp && sp.level === 1; });
  var level2 = spellbook.filter(function(n) { var sp = getSpell(n); return sp && sp.level === 2; });

  var html = '<div class="lu-screen active"><h2>Spell Mastery</h2>';
  html += '<div class="lu-callout highlight">Choose one 1st-level and one 2nd-level spell from your spellbook. You can cast these at their lowest level <strong>without expending a spell slot</strong>.</div>';

  html += '<h3 style="margin:12px 0 8px">1st-Level Spell</h3>';
  html += '<div class="lu-option-group">';
  level1.forEach(function(name) {
    var selected = s.wizSpellMastery.firstLevel === name;
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luState.wizSpellMastery.firstLevel=\'' + name.replace(/'/g, "\\'") + '\';renderLuScreen(true)">';
    html += '<div class="opt-title">' + escapeHtml(name) + '</div></div>';
  });
  html += '</div>';

  html += '<h3 style="margin:12px 0 8px">2nd-Level Spell</h3>';
  html += '<div class="lu-option-group">';
  level2.forEach(function(name) {
    var selected = s.wizSpellMastery.secondLevel === name;
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luState.wizSpellMastery.secondLevel=\'' + name.replace(/'/g, "\\'") + '\';renderLuScreen(true)">';
    html += '<div class="opt-title">' + escapeHtml(name) + '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function renderSignatureSpellsScreen() {
  var s = luState;
  var spellbook = s.char.spellbook || [];
  var level3 = spellbook.filter(function(n) { var sp = getSpell(n); return sp && sp.level === 3; });

  var html = '<div class="lu-screen active"><h2>Signature Spells</h2>';
  html += '<div class="lu-callout highlight">Choose <strong>2</strong> third-level spells from your spellbook. They are <strong>always prepared</strong> (don\'t count against your limit) and you can cast each once <strong>without a spell slot</strong>. Recharges on short or long rest.</div>';
  html += '<div style="margin-bottom:8px;font-size:0.85rem;color:var(--accent)">Selected: ' + s.wizSignatureSpells.length + ' / 2</div>';
  html += '<div class="lu-option-group">';
  level3.forEach(function(name) {
    var selected = s.wizSignatureSpells.indexOf(name) >= 0;
    html += '<div class="lu-option ' + (selected ? 'selected' : '') + '" onclick="luToggleSignatureSpell(\'' + name.replace(/'/g, "\\'") + '\')">';
    html += '<div class="opt-title">' + escapeHtml(name) + '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function luToggleSignatureSpell(name) {
  var idx = luState.wizSignatureSpells.indexOf(name);
  if (idx >= 0) { luState.wizSignatureSpells.splice(idx, 1); }
  else if (luState.wizSignatureSpells.length < 2) { luState.wizSignatureSpells.push(name); }
  renderLuScreen(true);
}

function renderProfBonusScreen() {
  var s = luState;
  var oldProf = getProfBonus(s.char.level);
  var newProf = s.prog.proficiencyBonus;
  var scores = s.char.abilityScores;

  var html = '<div class="lu-screen active"><h2>Proficiency Bonus Increase</h2>';
  html += '<div class="lu-callout highlight">Your proficiency bonus increases from <strong>+' + oldProf + '</strong> to <strong>+' + newProf + '</strong>. This affects many of your bonuses.</div>';
  html += '<div class="lu-section">';

  var changes = [];

  // Class-specific derived stats
  if (s.cls === 'Cleric') {
    var wisChange = s.abilityChanges.wis || 0;
    var wisMod = mod(scores.wis + wisChange);
    var oldDC = 8 + oldProf + wisMod;
    var newDC = 8 + newProf + wisMod;
    changes.push({ label: 'Spell Save DC', old: oldDC, new_: newDC });
    changes.push({ label: 'Spell Attack Bonus', old: '+' + (oldProf + wisMod), new_: '+' + (newProf + wisMod) });
    changes.push({ label: 'Turn Undead DC', old: oldDC, new_: newDC });
  } else if (s.cls === 'Paladin') {
    var chaChange = s.abilityChanges.cha || 0;
    var chaMod = mod(scores.cha + chaChange);
    var palOldDC = 8 + oldProf + chaMod;
    var palNewDC = 8 + newProf + chaMod;
    changes.push({ label: 'Spell Save DC', old: palOldDC, new_: palNewDC });
    changes.push({ label: 'Spell Attack Bonus', old: '+' + (oldProf + chaMod), new_: '+' + (newProf + chaMod) });
  } else if (s.cls === 'Wizard') {
    var wizIntChange = s.abilityChanges.int || 0;
    var wizIntMod = mod(scores.int + wizIntChange);
    var wizOldDC = 8 + oldProf + wizIntMod;
    var wizNewDC = 8 + newProf + wizIntMod;
    changes.push({ label: 'Spell Save DC', old: wizOldDC, new_: wizNewDC });
    changes.push({ label: 'Spell Attack Bonus', old: '+' + (oldProf + wizIntMod), new_: '+' + (newProf + wizIntMod) });
  } else if (s.cls === 'Rogue') {
    var rSub2 = s.char.subclass || s.subclassSelection;
    if (rSub2 === 'Arcane Trickster') {
      var intChange2 = s.abilityChanges.int || 0;
      var intMod2 = mod(scores.int + intChange2);
      var atOldDC = 8 + oldProf + intMod2;
      var atNewDC = 8 + newProf + intMod2;
      changes.push({ label: 'Spell Save DC', old: atOldDC, new_: atNewDC });
      changes.push({ label: 'Spell Attack Bonus', old: '+' + (oldProf + intMod2), new_: '+' + (newProf + intMod2) });
    }
  } else if (s.cls === 'Fighter') {
    var sub = s.char.subclass || s.subclassSelection;
    if (sub === 'Eldritch Knight') {
      var intChange = s.abilityChanges.int || 0;
      var intMod = mod(scores.int + intChange);
      var ekOldDC = 8 + oldProf + intMod;
      var ekNewDC = 8 + newProf + intMod;
      changes.push({ label: 'Spell Save DC', old: ekOldDC, new_: ekNewDC });
      changes.push({ label: 'Spell Attack Bonus', old: '+' + (oldProf + intMod), new_: '+' + (newProf + intMod) });
    }
    if (sub === 'Battle Master') {
      var strMod = mod(scores.str + (s.abilityChanges.str || 0));
      var dexMod = mod(scores.dex + (s.abilityChanges.dex || 0));
      var bestMod = Math.max(strMod, dexMod);
      var oldBestMod = Math.max(mod(scores.str), mod(scores.dex));
      changes.push({ label: 'Maneuver Save DC', old: 8 + oldProf + oldBestMod, new_: 8 + newProf + bestMod });
    }
  }

  // Saving throws
  s.char.savingThrows.forEach(function(st) {
    var stMod = mod(scores[st] + (s.abilityChanges[st] || 0));
    changes.push({ label: ABILITY_NAMES[st] + ' Save', old: '+' + (oldProf + stMod), new_: '+' + (newProf + stMod) });
  });

  // Proficient skills (with expertise awareness)
  var expSkills = s.char.expertiseSkills || [];
  s.char.skillProficiencies.forEach(function(sk) {
    var skill = SKILLS.find(function(s2) { return s2.name.toLowerCase() === sk.toLowerCase(); });
    if (skill) {
      var sMod = mod(scores[skill.ability] + (s.abilityChanges[skill.ability] || 0));
      var isExp = expSkills.indexOf(sk.toLowerCase()) >= 0;
      var profMult = isExp ? 2 : 1;
      changes.push({ label: skill.name + (isExp ? ' (E)' : ''), old: '+' + (oldProf * profMult + sMod), new_: '+' + (newProf * profMult + sMod) });
    }
  });

  changes.forEach(function(c) {
    html += '<div class="lu-change"><span class="change-label">' + c.label + '</span>';
    html += '<span class="change-old">' + c.old + '</span><span class="change-arrow">→</span><span class="change-new">' + c.new_ + '</span></div>';
  });

  html += '</div></div>';
  return html;
}

function renderLuSummary() {
  var s = luState;
  var char = s.char;
  var oldHp = char.hp.max;
  var newHp = oldHp + s.hpGained + (s.retroHp ? s.retroHpAmount : 0);
  var oldProf = getProfBonus(char.level);
  var newProf = s.prog.proficiencyBonus;

  var html = '<div class="lu-screen active"><h2>Level Up Summary</h2>';
  html += '<p class="subtitle">Review all changes before confirming</p>';

  // HP
  html += '<div class="lu-summary-section"><h3>Hit Points</h3>';
  html += '<div class="lu-change"><span class="change-label">HP Max</span>';
  html += '<span class="change-old">' + oldHp + '</span><span class="change-arrow">→</span><span class="change-new">' + newHp + '</span></div>';
  html += '<div class="text-dim" style="font-size:0.85rem">+' + s.hpGained + ' (' + (s.hpMethod === 'average' ? 'average' : 'rolled ' + s.hpRoll) + ' + ' + s.conMod + ' CON' + (s.dwarfBonus ? ' + 1 Dwarf' : '') + ')' + (s.retroHp ? ' + ' + s.retroHpAmount + ' retroactive CON HP' : '') + '</div></div>';

  // ASI/Feat
  if (s.prog.asi) {
    html += '<div class="lu-summary-section"><h3>Ability Score Improvement</h3>';
    if (s.asiChoice === 'plus2') {
      html += '<div class="lu-change"><span class="change-label">' + ABILITY_NAMES[s.asiAbility1] + '</span>';
      html += '<span class="change-old">' + char.abilityScores[s.asiAbility1] + '</span><span class="change-arrow">→</span>';
      html += '<span class="change-new">' + (char.abilityScores[s.asiAbility1] + 2) + '</span></div>';
    } else if (s.asiChoice === 'plus1_1') {
      [s.asiAbility1, s.asiAbility2].forEach(function(ab) {
        html += '<div class="lu-change"><span class="change-label">' + ABILITY_NAMES[ab] + '</span>';
        html += '<span class="change-old">' + char.abilityScores[ab] + '</span><span class="change-arrow">→</span>';
        html += '<span class="change-new">' + (char.abilityScores[ab] + 1) + '</span></div>';
      });
    } else if (s.asiChoice === 'feat') {
      html += '<div style="padding:4px 0;font-size:0.95rem"><strong>Feat:</strong> ' + escapeHtml(s.featName) + '</div>';
      if (s.featNotes) html += '<div style="font-size:0.85rem;color:var(--text-dim)">' + escapeHtml(s.featNotes) + '</div>';
    }
    html += '</div>';
  }

  // Fighter-specific: Subclass selection
  if (s.subclassSelection) {
    html += '<div class="lu-summary-section"><h3>Subclass</h3><div class="tag accent">' + escapeHtml(s.subclassSelection) + '</div></div>';
  }

  // Fighting Style (Fighter additional or Paladin first)
  if (s.fightingStyleSelection) {
    var fsLabel = s.cls === 'Paladin' ? 'Fighting Style' : 'Additional Fighting Style';
    var fsSource = s.cls === 'Paladin' ? PALADIN_FIGHTING_STYLES : FIGHTING_STYLES;
    html += '<div class="lu-summary-section"><h3>' + fsLabel + '</h3><div class="tag accent">' + escapeHtml(s.fightingStyleSelection) + '</div>';
    html += '<div class="text-dim" style="font-size:0.85rem;margin-top:4px">' + fsSource[s.fightingStyleSelection].effect + '</div></div>';
  }

  // Fighter-specific: Maneuvers
  if (s.maneuverSelections.length > 0) {
    html += '<div class="lu-summary-section"><h3>New Maneuvers</h3>';
    html += '<div class="tag-list">' + s.maneuverSelections.map(function(m) { return '<span class="tag accent">' + escapeHtml(m) + '</span>'; }).join('') + '</div></div>';
  }

  // Fighter-specific: EK Cantrips
  if (s.ekCantripSelections.length > 0) {
    html += '<div class="lu-summary-section"><h3>New Cantrips</h3>';
    html += '<div class="tag-list">' + s.ekCantripSelections.map(function(c2) { return '<span class="tag accent">' + escapeHtml(c2) + '</span>'; }).join('') + '</div></div>';
  }

  // Fighter-specific: EK Spells
  if (s.ekSpellSelections.length > 0) {
    html += '<div class="lu-summary-section"><h3>New Spells Known</h3>';
    html += '<div class="tag-list">' + s.ekSpellSelections.map(function(sp) { return '<span class="tag accent">' + escapeHtml(sp) + '</span>'; }).join('') + '</div></div>';
  }

  // Fighter-specific: EK Spell Swap
  if (s.ekSpellSwap.from && s.ekSpellSwap.to) {
    html += '<div class="lu-summary-section"><h3>Spell Swap</h3>';
    html += '<div class="lu-change"><span class="change-label">Replace</span>';
    html += '<span class="change-old">' + escapeHtml(s.ekSpellSwap.from) + '</span><span class="change-arrow">→</span>';
    html += '<span class="change-new">' + escapeHtml(s.ekSpellSwap.to) + '</span></div></div>';
  }

  // Cleric: Cantrip
  if (s.cls === 'Cleric' && s.prog.newCantrip && s.newCantrip) {
    html += '<div class="lu-summary-section"><h3>New Cantrip</h3><div class="tag accent">' + escapeHtml(s.newCantrip) + '</div></div>';
  }

  // Spell slots
  if (s.cls === 'Cleric' || s.cls === 'Paladin' || s.cls === 'Wizard') {
    var sumOldSlots = s.cls === 'Paladin' ? getHalfCasterSlots(char.level) : s.cls === 'Wizard' ? getFullCasterSlots(char.level) : char.spellSlots;
    var sumNewSlots = s.cls === 'Paladin' ? getHalfCasterSlots(s.newLevel) : s.cls === 'Wizard' ? getFullCasterSlots(s.newLevel) : s.prog.spellSlots;
    var slotsChanged = JSON.stringify(sumOldSlots) !== JSON.stringify(sumNewSlots);
    if (slotsChanged) {
      html += '<div class="lu-summary-section"><h3>Spell Slots</h3>';
      var allLevels = new Set([...Object.keys(sumOldSlots).map(Number), ...Object.keys(sumNewSlots).map(Number)]);
      [...allLevels].sort(function(a,b){return a-b;}).forEach(function(sl) {
        var old = sumOldSlots[sl] || 0;
        var nw = sumNewSlots[sl] || 0;
        if (old !== nw) {
          html += '<div class="lu-change"><span class="change-label">' + ordinal(sl) + ' Level</span>';
          html += '<span class="change-old">' + old + '</span><span class="change-arrow">→</span><span class="change-new">' + nw + '</span></div>';
        }
      });
      html += '</div>';
    }
    // New spell level callout
    var sumOldMax = 0, sumNewMax = 0;
    Object.keys(sumOldSlots).forEach(function(k) { sumOldMax = Math.max(sumOldMax, parseInt(k)); });
    Object.keys(sumNewSlots).forEach(function(k) { sumNewMax = Math.max(sumNewMax, parseInt(k)); });
    if (sumNewMax > sumOldMax) {
      html += '<div class="lu-callout highlight" style="margin-bottom:16px"><strong>New:</strong> You can now prepare ' + ordinal(sumNewMax) + '-level spells!</div>';
    }
    // Prep count
    var sumOldPrep, sumNewPrep;
    if (s.cls === 'Paladin') {
      var chaChg = s.abilityChanges.cha || 0;
      sumOldPrep = Math.max(1, getEffectiveMod(char, 'cha') + Math.floor(char.level / 2));
      var _oc = char.abilityScores.cha; char.abilityScores.cha += chaChg;
      sumNewPrep = Math.max(1, getEffectiveMod(char, 'cha') + Math.floor(s.newLevel / 2)); char.abilityScores.cha = _oc;
    } else if (s.cls === 'Wizard') {
      var intChg = s.abilityChanges.int || 0;
      sumOldPrep = Math.max(1, char.level + getEffectiveMod(char, 'int'));
      var _oi = char.abilityScores.int; char.abilityScores.int += intChg;
      var newIntMod2 = getEffectiveMod(char, 'int'); char.abilityScores.int = _oi;
      sumNewPrep = Math.max(1, s.newLevel + newIntMod2);
    } else {
      var wisChange = s.abilityChanges.wis || 0;
      sumOldPrep = Math.max(1, char.level + getEffectiveMod(char, 'wis'));
      var _ow = char.abilityScores.wis; char.abilityScores.wis += wisChange;
      var newWisMod = getEffectiveMod(char, 'wis'); char.abilityScores.wis = _ow;
      sumNewPrep = Math.max(1, s.newLevel + newWisMod);
    }
    if (sumOldPrep !== sumNewPrep) {
      html += '<div class="lu-summary-section"><div class="lu-change"><span class="change-label">Prepared Spells</span>';
      html += '<span class="change-old">' + sumOldPrep + '</span><span class="change-arrow">→</span><span class="change-new">' + sumNewPrep + '</span></div></div>';
    }
  } else if (s.cls === 'Fighter' && (s.char.subclass === 'Eldritch Knight' || s.subclassSelection === 'Eldritch Knight')) {
    var ekOldSlots = getThirdCasterSlots(char.level);
    var ekNewSlots = getThirdCasterSlots(s.newLevel);
    var ekSlotsChanged = JSON.stringify(ekOldSlots) !== JSON.stringify(ekNewSlots);
    if (ekSlotsChanged) {
      html += '<div class="lu-summary-section"><h3>Spell Slots</h3>';
      var ekAllLevels = {};
      Object.keys(ekOldSlots).forEach(function(k) { ekAllLevels[k] = true; });
      Object.keys(ekNewSlots).forEach(function(k) { ekAllLevels[k] = true; });
      Object.keys(ekAllLevels).map(Number).sort(function(a,b){return a-b;}).forEach(function(sl) {
        var old = ekOldSlots[sl] || 0;
        var nw = ekNewSlots[sl] || 0;
        if (old !== nw) {
          html += '<div class="lu-change"><span class="change-label">' + ordinal(sl) + ' Level</span>';
          html += '<span class="change-old">' + old + '</span><span class="change-arrow">→</span><span class="change-new">' + nw + '</span></div>';
        }
      });
      html += '</div>';
    }
  }

  // Domain/Oath spells
  if (s.cls === 'Cleric' && s.prog.domainSpells) {
    var allNew = Object.values(s.prog.domainSpells).flat();
    html += '<div class="lu-summary-section"><h3>New Domain Spells</h3>';
    html += '<div class="tag-list">' + allNew.map(function(sp) { return '<span class="tag accent">' + escapeHtml(sp) + '</span>'; }).join('') + '</div></div>';
  }
  if (s.cls === 'Paladin') {
    var palOath = s.char.subclass || s.subclassSelection || '';
    var oathTable = OATH_SPELLS[palOath];
    if (oathTable && oathTable[s.newLevel]) {
      html += '<div class="lu-summary-section"><h3>New Oath Spells</h3>';
      html += '<div class="tag-list">' + oathTable[s.newLevel].map(function(sp) { return '<span class="tag accent">' + escapeHtml(sp) + '</span>'; }).join('') + '</div></div>';
    }
  }

  // Rogue: Sneak Attack dice change
  if (s.cls === 'Rogue') {
    var oldSA = getSneakAttackDice(char.level);
    var newSA = getSneakAttackDice(s.newLevel);
    if (oldSA !== newSA) {
      html += '<div class="lu-summary-section"><div class="lu-change"><span class="change-label">Sneak Attack</span>';
      html += '<span class="change-old">' + oldSA + 'd6</span><span class="change-arrow">\u2192</span><span class="change-new">' + newSA + 'd6</span></div></div>';
    }
    // New expertise at level 6
    if (s.newExpertiseSkills.length > 0) {
      html += '<div class="lu-summary-section"><h3>New Expertise</h3>';
      html += '<div class="tag-list">' + s.newExpertiseSkills.map(function(sk) { return '<span class="tag accent">' + escapeHtml(sk.charAt(0).toUpperCase() + sk.slice(1)) + '</span>'; }).join('') + '</div></div>';
    }
    // Slippery Mind at level 15
    if (s.newLevel === 15) {
      html += '<div class="lu-summary-section"><div class="tag accent">WIS save proficiency gained (Slippery Mind)</div></div>';
    }
  }

  // Paladin: prepared spells from level-up
  if (s.cls === 'Paladin' && s.paladinPrepSelections.length > 0) {
    html += '<div class="lu-summary-section"><h3>Prepared Spells</h3>';
    html += '<div class="tag-list">' + s.paladinPrepSelections.map(function(sp) { return '<span class="tag accent">' + escapeHtml(sp) + '</span>'; }).join('') + '</div></div>';
  }

  // Wizard-specific summary items
  if (s.cls === 'Wizard') {
    if (s.wizNewCantrip) {
      html += '<div class="lu-summary-section"><h3>New Cantrip</h3><div class="tag accent">' + escapeHtml(s.wizNewCantrip) + '</div></div>';
    }
    if (s.wizSpellbookAdds.length > 0) {
      html += '<div class="lu-summary-section"><h3>Spellbook Additions</h3>';
      html += '<div class="tag-list">' + s.wizSpellbookAdds.map(function(sp) { return '<span class="tag accent">' + escapeHtml(sp) + '</span>'; }).join('') + '</div></div>';
    }
    if (s.wizSpellMastery.firstLevel) {
      html += '<div class="lu-summary-section"><h3>Spell Mastery</h3>';
      html += '<div class="tag accent">' + escapeHtml(s.wizSpellMastery.firstLevel) + ' (1st, At Will)</div>';
      html += '<div class="tag accent">' + escapeHtml(s.wizSpellMastery.secondLevel) + ' (2nd, At Will)</div></div>';
    }
    if (s.wizSignatureSpells.length > 0) {
      html += '<div class="lu-summary-section"><h3>Signature Spells</h3>';
      html += '<div class="tag-list">' + s.wizSignatureSpells.map(function(sp) { return '<span class="tag accent">' + escapeHtml(sp) + ' (3rd)</span>'; }).join('') + '</div></div>';
    }
  }

  // Features
  var allFeatures = [];
  if (s.cls === 'Fighter') {
    allFeatures = getFighterLevelFeatures(s.newLevel, s.char.subclass || s.subclassSelection);
  } else if (s.cls === 'Paladin') {
    allFeatures = getPaladinLevelFeatures(s.newLevel, s.char.subclass || s.subclassSelection);
  } else if (s.cls === 'Rogue') {
    allFeatures = getRogueLevelFeatures(s.newLevel, s.char.subclass || s.subclassSelection);
  } else if (s.cls === 'Wizard') {
    allFeatures = getWizardLevelFeatures(s.newLevel, s.char.subclass || s.subclassSelection);
  } else {
    allFeatures = (s.prog.features || []).slice();
    if (s.prog.channelDivinityUses > getChannelDivUses(char.level)) {
      allFeatures.unshift('Channel Divinity (' + s.prog.channelDivinityUses + '/rest)');
    }
  }
  if (allFeatures.length > 0) {
    html += '<div class="lu-summary-section"><h3>New Features</h3>';
    html += allFeatures.map(function(f) { return '<div class="tag" style="margin-bottom:4px">' + escapeHtml(f) + '</div>'; }).join('');
    html += '</div>';
  }

  // Prof bonus
  if (newProf > oldProf) {
    html += '<div class="lu-summary-section"><div class="lu-change"><span class="change-label">Proficiency Bonus</span>';
    html += '<span class="change-old">+' + oldProf + '</span><span class="change-arrow">→</span><span class="change-new">+' + newProf + '</span></div></div>';
  }

  // Derived stats summary
  var derivedChanges = [];
  // Helper: simulate new effective mod after ASI change
  function _simMod(ab, chg) {
    if (!chg) return getEffectiveMod(char, ab);
    var orig = char.abilityScores[ab]; char.abilityScores[ab] += chg;
    var r = getEffectiveMod(char, ab); char.abilityScores[ab] = orig; return r;
  }
  if (s.cls === 'Cleric') {
    var wisChg = s.abilityChanges.wis || 0;
    var oDC = 8 + oldProf + getEffectiveMod(char, 'wis');
    var nDC = 8 + newProf + _simMod('wis', wisChg);
    if (oDC !== nDC) derivedChanges.push({ label: 'Spell Save DC', old: oDC, new_: nDC });
    var oAtk = oldProf + getEffectiveMod(char, 'wis');
    var nAtk = newProf + _simMod('wis', wisChg);
    if (oAtk !== nAtk) derivedChanges.push({ label: 'Spell Attack', old: '+' + oAtk, new_: '+' + nAtk });
  } else if (s.cls === 'Wizard') {
    var wizChg = s.abilityChanges.int || 0;
    var oWizDC = 8 + oldProf + getEffectiveMod(char, 'int');
    var nWizDC = 8 + newProf + _simMod('int', wizChg);
    if (oWizDC !== nWizDC) derivedChanges.push({ label: 'Spell Save DC', old: oWizDC, new_: nWizDC });
    var oWizAtk = oldProf + getEffectiveMod(char, 'int');
    var nWizAtk = newProf + _simMod('int', wizChg);
    if (oWizAtk !== nWizAtk) derivedChanges.push({ label: 'Spell Attack', old: '+' + oWizAtk, new_: '+' + nWizAtk });
  } else if (s.cls === 'Rogue') {
    var rSub3 = s.char.subclass || s.subclassSelection;
    if (rSub3 === 'Arcane Trickster') {
      var iChg2 = s.abilityChanges.int || 0;
      var oAtDC = 8 + oldProf + getEffectiveMod(char, 'int');
      var nAtDC = 8 + newProf + _simMod('int', iChg2);
      if (oAtDC !== nAtDC) derivedChanges.push({ label: 'Spell Save DC', old: oAtDC, new_: nAtDC });
      var oAtAtk = oldProf + getEffectiveMod(char, 'int');
      var nAtAtk = newProf + _simMod('int', iChg2);
      if (oAtAtk !== nAtAtk) derivedChanges.push({ label: 'Spell Attack', old: '+' + oAtAtk, new_: '+' + nAtAtk });
    }
  } else if (s.cls === 'Paladin') {
    var chaChg2 = s.abilityChanges.cha || 0;
    var oPalDC = 8 + oldProf + getEffectiveMod(char, 'cha');
    var nPalDC = 8 + newProf + _simMod('cha', chaChg2);
    if (oPalDC !== nPalDC) derivedChanges.push({ label: 'Spell Save DC', old: oPalDC, new_: nPalDC });
    var oPalAtk = oldProf + getEffectiveMod(char, 'cha');
    var nPalAtk = newProf + _simMod('cha', chaChg2);
    if (oPalAtk !== nPalAtk) derivedChanges.push({ label: 'Spell Attack', old: '+' + oPalAtk, new_: '+' + nPalAtk });
  } else if (s.cls === 'Fighter') {
    var fSub = s.char.subclass || s.subclassSelection;
    if (fSub === 'Eldritch Knight') {
      var iChg = s.abilityChanges.int || 0;
      var oEkDC = 8 + oldProf + getEffectiveMod(char, 'int');
      var nEkDC = 8 + newProf + _simMod('int', iChg);
      if (oEkDC !== nEkDC) derivedChanges.push({ label: 'Spell Save DC', old: oEkDC, new_: nEkDC });
      var oEkAtk = oldProf + getEffectiveMod(char, 'int');
      var nEkAtk = newProf + _simMod('int', iChg);
      if (oEkAtk !== nEkAtk) derivedChanges.push({ label: 'Spell Attack', old: '+' + oEkAtk, new_: '+' + nEkAtk });
    }
    if (fSub === 'Battle Master') {
      var oBest = Math.max(getEffectiveMod(char, 'str'), getEffectiveMod(char, 'dex'));
      var nBest = Math.max(_simMod('str', s.abilityChanges.str || 0), _simMod('dex', s.abilityChanges.dex || 0));
      var oBmDC = 8 + oldProf + oBest;
      var nBmDC = 8 + newProf + nBest;
      if (oBmDC !== nBmDC) derivedChanges.push({ label: 'Maneuver Save DC', old: oBmDC, new_: nBmDC });
    }
  }

  if (derivedChanges.length > 0) {
    html += '<div class="lu-summary-section"><h3>Derived Stats</h3>';
    derivedChanges.forEach(function(c2) {
      html += '<div class="lu-change"><span class="change-label">' + c2.label + '</span>';
      html += '<span class="change-old">' + c2.old + '</span><span class="change-arrow">→</span><span class="change-new">' + c2.new_ + '</span></div>';
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/* ── Apply Level-Up ── */

function confirmLevelUp() {
  var s = luState;
  var char = s.char;
  var newLevel = s.newLevel;
  var cls = s.cls;

  // Build level history record
  var historyEntry = {
    level: newLevel,
    from: char.level,
    hpMethod: s.hpMethod,
    hpRoll: s.hpRoll,
    hpGained: s.hpGained,
    retroHp: s.retroHp,
    retroHpAmount: s.retroHp ? s.retroHpAmount : 0
  };

  // Apply HP
  char.hp.max += s.hpGained + (s.retroHp ? s.retroHpAmount : 0);
  char.hp.hitDiceCount = newLevel;
  char.hp.hpHistory.push({
    level: newLevel,
    gained: s.hpGained,
    method: s.hpMethod,
    notes: s.hpMethod === 'roll'
      ? s.hpRoll + ' (roll) + ' + s.conMod + ' CON' + (s.dwarfBonus ? ' + 1 Dwarf' : '')
      : s.avgRoll + ' (avg) + ' + s.conMod + ' CON' + (s.dwarfBonus ? ' + 1 Dwarf' : '')
  });

  // Apply ASI
  if (s.prog.asi && s.asiChoice) {
    if (s.asiChoice === 'plus2') {
      char.abilityScores[s.asiAbility1] += 2;
      historyEntry.asi = { type: 'plus2', ability: s.asiAbility1 };
    } else if (s.asiChoice === 'plus1_1') {
      char.abilityScores[s.asiAbility1] += 1;
      char.abilityScores[s.asiAbility2] += 1;
      historyEntry.asi = { type: 'plus1_1', abilities: [s.asiAbility1, s.asiAbility2] };
    } else if (s.asiChoice === 'feat') {
      historyEntry.asi = { type: 'feat', name: s.featName, notes: s.featNotes };
    }
  }

  // Update level
  char.level = newLevel;

  // Recalculate common derived stats
  char.proficiencyBonus = s.prog.proficiencyBonus;
  char.initiative = getEffectiveMod(char, 'dex');

  if (cls === 'Fighter') {
    // Apply subclass selection (level 3)
    if (s.subclassSelection) {
      char.subclass = s.subclassSelection;
      historyEntry.subclass = s.subclassSelection;
    }

    // Apply additional fighting style (Champion level 10)
    if (s.fightingStyleSelection) {
      char.fightingStyle2 = s.fightingStyleSelection;
      historyEntry.fightingStyle2 = s.fightingStyleSelection;
    }

    // Apply maneuvers (Battle Master)
    if (s.maneuverSelections.length > 0) {
      if (!char.maneuversKnown) char.maneuversKnown = [];
      char.maneuversKnown = char.maneuversKnown.concat(s.maneuverSelections);
      historyEntry.newManeuvers = s.maneuverSelections;
    }

    // Apply EK cantrips
    if (s.ekCantripSelections.length > 0) {
      if (!char.cantripsKnown) char.cantripsKnown = [];
      char.cantripsKnown = char.cantripsKnown.concat(s.ekCantripSelections);
      historyEntry.ekCantrips = s.ekCantripSelections;
    }

    // Apply EK spells
    if (s.ekSpellSelections.length > 0) {
      if (!char.spellsKnown) char.spellsKnown = [];
      char.spellsKnown = char.spellsKnown.concat(s.ekSpellSelections);
      historyEntry.ekSpells = s.ekSpellSelections;
    }

    // Apply EK spell swap
    if (s.ekSpellSwap.from && s.ekSpellSwap.to && char.spellsKnown) {
      var swapIdx = char.spellsKnown.indexOf(s.ekSpellSwap.from);
      if (swapIdx >= 0) char.spellsKnown[swapIdx] = s.ekSpellSwap.to;
      historyEntry.spellSwap = { from: s.ekSpellSwap.from, to: s.ekSpellSwap.to };
    }

    // Update EK spell slots
    var fSub = char.subclass;
    if (fSub === 'Eldritch Knight') {
      char.spellSlots = getThirdCasterSlots(newLevel);

    }

    // Update Fighter features
    char.features = getFighterFeatures(newLevel, char.subclass);

  } else if (cls === 'Rogue') {
    // Subclass selection (level 3)
    if (s.subclassSelection) {
      char.subclass = s.subclassSelection;
      historyEntry.subclass = s.subclassSelection;
    }
    // Expertise (level 6)
    if (s.newExpertiseSkills.length > 0) {
      if (!char.expertiseSkills) char.expertiseSkills = [];
      char.expertiseSkills = char.expertiseSkills.concat(s.newExpertiseSkills);
      historyEntry.newExpertise = s.newExpertiseSkills;
    }
    // Slippery Mind (level 15) — add WIS save proficiency
    if (newLevel >= 15 && char.savingThrows.indexOf('wis') < 0) {
      char.savingThrows.push('wis');
    }
    // Arcane Trickster: spellcasting
    if (char.subclass === 'Arcane Trickster') {
      // Cantrips (auto-add Mage Hand at level 3)
      if (s.ekCantripSelections.length > 0) {
        if (!char.cantripsKnown) char.cantripsKnown = [];
        char.cantripsKnown = char.cantripsKnown.concat(s.ekCantripSelections);
        historyEntry.atCantrips = s.ekCantripSelections;
      }
      if (newLevel === 3 && (char.cantripsKnown || []).indexOf('Mage Hand') < 0) {
        if (!char.cantripsKnown) char.cantripsKnown = [];
        char.cantripsKnown.push('Mage Hand');
      }
      // Spells
      if (s.ekSpellSelections.length > 0) {
        if (!char.spellsKnown) char.spellsKnown = [];
        char.spellsKnown = char.spellsKnown.concat(s.ekSpellSelections);
        historyEntry.atSpells = s.ekSpellSelections;
      }
      // Spell swap
      if (s.ekSpellSwap.from && s.ekSpellSwap.to && char.spellsKnown) {
        var atSwapIdx = char.spellsKnown.indexOf(s.ekSpellSwap.from);
        if (atSwapIdx >= 0) char.spellsKnown[atSwapIdx] = s.ekSpellSwap.to;
        historyEntry.spellSwap = { from: s.ekSpellSwap.from, to: s.ekSpellSwap.to };
      }
      // Spell slots (1/3 caster — same table as EK)
      char.spellSlots = getThirdCasterSlots(newLevel);

    }
    // Features
    char.features = getRogueFeatures(newLevel, char.subclass);
  } else if (cls === 'Paladin') {
    // Fighting style (level 2)
    if (s.fightingStyleSelection) {
      char.fightingStyle = s.fightingStyleSelection;
      historyEntry.fightingStyle = s.fightingStyleSelection;
    }
    // Subclass / oath (level 3)
    if (s.subclassSelection) {
      char.subclass = s.subclassSelection;
      historyEntry.subclass = s.subclassSelection;
    }
    // Spell slots (half-caster)
    char.spellSlots = getHalfCasterSlots(newLevel);
    // Prepared spell count (CHA-based)
    var chaModFinal = getEffectiveMod(char, 'cha');
    char.preparedSpellCount = Math.max(1, chaModFinal + Math.floor(newLevel / 2));
    // Channel Divinity
    char.channelDivinityUses = s.prog.channelDivinityUses || 0;
    // Features
    char.features = getPaladinFeatures(newLevel, char.subclass);
    // Oath spells (stored in domainSpells for backward compat)
    char.domainSpells = getDomainSpells(newLevel, 'Paladin', char.subclass);
    // Apply spell preparation selections (if the prep screen was shown)
    if (s.paladinPrepSelections.length > 0) {
      char.currentPreparedSpells = s.paladinPrepSelections;
    }
  } else if (cls === 'Wizard') {
    // Subclass (level 2)
    if (s.subclassSelection) {
      char.subclass = s.subclassSelection;
      historyEntry.subclass = s.subclassSelection;
    }
    // New cantrip
    if (s.wizNewCantrip) {
      if (!char.cantripsKnown) char.cantripsKnown = [];
      char.cantripsKnown.push(s.wizNewCantrip);
      historyEntry.newCantrip = s.wizNewCantrip;
    }
    // Spellbook additions
    if (s.wizSpellbookAdds.length > 0) {
      if (!char.spellbook) char.spellbook = [];
      char.spellbook = char.spellbook.concat(s.wizSpellbookAdds);
      historyEntry.spellbookAdds = s.wizSpellbookAdds;
    }
    // Spell Mastery (level 18)
    if (s.wizSpellMastery.firstLevel) {
      char.spellMastery = { firstLevel: s.wizSpellMastery.firstLevel, secondLevel: s.wizSpellMastery.secondLevel };
      historyEntry.spellMastery = char.spellMastery;
    }
    // Signature Spells (level 20)
    if (s.wizSignatureSpells.length > 0) {
      char.signatureSpells = s.wizSignatureSpells;
      if (!char.resources) char.resources = {};
      char.resources.signatureSpellUses = {};
      s.wizSignatureSpells.forEach(function(sp) { char.resources.signatureSpellUses[sp] = false; });
      historyEntry.signatureSpells = s.wizSignatureSpells;
    }
    // Spell slots (full caster)
    char.spellSlots = getFullCasterSlots(newLevel);
    // Prepared spell count (INT-based)
    char.preparedSpellCount = Math.max(1, newLevel + getEffectiveMod(char, 'int'));
    // Features
    char.features = getWizardFeatures(newLevel, char.subclass);
    // Portent dice (Divination, level 2+)
    if (char.subclass === 'School of Divination' && newLevel >= 2) {
      var numPortent = newLevel >= 14 ? 3 : 2;
      if (!char.resources) char.resources = {};
      char.resources.portentDice = [];
      for (var pi = 0; pi < numPortent; pi++) {
        char.resources.portentDice.push({ value: Math.floor(Math.random() * 20) + 1, used: false });
      }
    }
    // Arcane Ward (Abjuration) — update max every level
    if (char.subclass === 'School of Abjuration' && newLevel >= 2) {
      if (!char.resources) char.resources = {};
      if (!char.resources.arcaneWard) char.resources.arcaneWard = { current: 0, max: 0 };
      char.resources.arcaneWard.max = newLevel * 2 + getEffectiveMod(char, 'int');
    }
  } else {
    // Cleric
    if (s.prog.newCantrip && s.newCantrip) {
      char.cantripsKnown.push(s.newCantrip);
      historyEntry.newCantrip = s.newCantrip;
    }
    char.spellSlots = s.prog.spellSlots;
    char.preparedSpellCount = Math.max(1, newLevel + getEffectiveMod(char, 'wis'));
    char.channelDivinityUses = s.prog.channelDivinityUses;
    char.features = getFeatures(newLevel);
    char.domainSpells = getDomainSpells(newLevel);
  }

  // Add to history
  char.levelHistory = char.levelHistory || [];
  char.levelHistory.push(historyEntry);

  // Save and return to dashboard
  saveCurrentCharacter(char);
  luState = null;
  showDashboard(char);
}



