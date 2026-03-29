// dashboard.js — Main dashboard rendering, fighter dashboard, edit/reset
/* ═══════════════════════════════════════════
   DASHBOARD RENDERING
   ═══════════════════════════════════════════ */

function getShortRestDescription(cls, sub, level) {
  if (cls === 'Cleric') return 'Restores Channel Divinity';
  if (cls === 'Paladin') return 'Restores Channel Divinity';
  if (cls === 'Fighter') {
    var parts = ['Second Wind', 'Action Surge'];
    if (sub === 'Battle Master') parts.push('Superiority Dice');
    return 'Restores ' + parts.join(', ');
  }
  if (cls === 'Rogue') return (level || 0) >= 20 ? 'Restores Stroke of Luck' : 'Recover hit dice';
  return 'Recover hit dice, some abilities';
}

function renderDashboard(c, preserveScroll) {
  var container = document.getElementById('dashboard-content');
  var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  var isCaster = cd.isCaster;
  var spellDC = isCaster ? 8 + c.proficiencyBonus + getEffectiveMod(c, cd.spellcastingAbility) : 0;
  var spellAtk = isCaster ? c.proficiencyBonus + getEffectiveMod(c, cd.spellcastingAbility) : 0;
  var ac = (c.equippedItems && c.equippedItems.length > 0) ? calculateAC(c) : c.ac;
  var effectiveMax = getEffectiveMaxHp(c);
  var currentHp = c.currentHp !== undefined ? c.currentHp : effectiveMax;
  var tempHp = c.tempHp || 0;

  var html = '';

  // Combat mode bar
  html += '<div class="combat-mode-bar"></div>';

  // Header (scrolls away)
  html += '<div class="dash-header">';
  var raceDisplay = c.subrace ? c.subrace + ' ' + c.race : c.race;
  html += '<h1 style="margin:0;text-align:center">' + escapeHtml(c.name) + '</h1>';
  html += '<div class="dash-subtitle" style="text-align:center">' + raceDisplay + ' ' + c.class + (c.subclass ? ' (' + c.subclass + ')' : '') + ' — Level ' + c.level + '</div>';
  html += '<div class="text-dim" style="font-size:0.85rem;margin-top:4px;text-align:center">' + escapeHtml(c.background) + ' · ' + c.alignment + '</div>';
  html += '</div>';

  // Sticky Combat HUD
  html += '<div class="hp-sticky">';
  html += '<div class="hud-columns">';

  // Left column: HP + Inspiration + buttons
  var effectiveHp = currentHp + tempHp;
  html += '<div class="hud-left">';
  html += '<span class="hud-insp' + (c.inspiration ? ' active' : '') + '" onclick="toggleInspiration()" title="Inspiration">' + (c.inspiration ? '\u2605' : '\u2606') + '</span>';
  var boostLabel = (c.maxHpBoost && c.maxHpBoost.value > 0) ? ' <span style="font-size:0.7rem;color:var(--success)">[+' + c.maxHpBoost.value + ']</span>' : '';
  html += '<div class="hud-hp-big"><span class="hp-current">' + effectiveHp + '</span><span class="hp-separator"> / </span><span class="hp-max">' + effectiveMax + '</span>' + boostLabel + '</div>';
  if (tempHp > 0) html += '<div class="hud-hp-sub">+' + tempHp + ' temp (' + currentHp + ' real)</div>';
  if (c.maxHpBoost && c.maxHpBoost.value > 0) {
    var boostSrc = c.maxHpBoost.source || 'boost';
    var safeBoostSrc = boostSrc.replace(/'/g, "\\'");
    html += '<div class="hud-hp-sub" style="cursor:pointer" onclick="event.stopPropagation();showBadgePopover(\'Max HP +' + c.maxHpBoost.value + '\',\'' + safeBoostSrc + '. Tap X on badge to remove.\',event)">base ' + c.hp.max + ' + ' + c.maxHpBoost.value + ' ' + escapeHtml(boostSrc) + ' <span style="cursor:pointer;opacity:0.6" onclick="event.stopPropagation();removeMaxHpBoost()">\u00d7</span></div>';
  }
  html += '<div class="hud-hp-btns">';
  html += '<button class="hp-btn damage" onclick="showHpInput(\'damage\')">Dmg</button>';
  html += '<button class="hp-btn heal" onclick="showHpInput(\'heal\')">Heal</button>';
  html += '<button class="hp-btn temp" onclick="showHpInput(\'temp\')">Temp</button>';
  html += '</div>';
  // HUD dice roller
  html += '<div class="hud-dice-roller">';
  html += '<input type="number" id="gr-count" value="1" min="1" max="10" class="hud-dice-input" title="Count">';
  html += '<select id="gr-sides" class="hud-dice-select" title="Die">';
  html += '<option value="4">d4</option><option value="6">d6</option><option value="8">d8</option><option value="10">d10</option><option value="12">d12</option><option value="20" selected>d20</option><option value="100">d100</option>';
  html += '</select>';
  html += '<input type="number" id="gr-mod" value="0" class="hud-dice-input" title="Modifier" placeholder="+0">';
  html += '<button class="hud-dice-roll-btn" onclick="doGeneralRoll()" title="Roll">&#127922;</button>';
  html += '</div>';
  html += '</div>';

  // Right column: Quick Action
  html += renderQuickAction(c);

  html += '</div>'; // end hud-columns

  // Resource strip
  html += renderResourceStrip(c);

  // Button bar — bottom of sticky HUD, never reflows
  var initLabel = lastInitiative !== null ? '&#127922; Init: ' + lastInitiative : '&#127922; Initiative';
  html += '<div class="dash-btn-bar">';
  html += '<button class="init-btn" id="init-btn" onclick="rollInitiative()">' + initLabel + '</button>';
  html += '<button class="combat-mode-btn' + (combatModeOn ? ' active' : '') + '" id="combat-mode-btn" onclick="toggleCombatMode()">&#9876; Combat</button>';
  html += '</div>';

  html += '</div>'; // end hp-sticky

  // Death Saves (when HP = 0)
  html += renderDeathSaves(c);

  // Concentration banner (with Drop/Change buttons)
  html += renderConcentrationBanner(c);

  // External buff badges
  html += renderExternalBuffBadges(c);

  // Conditions/Concentration/Buff buttons
  html += '<div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap">';
  html += '<button class="btn btn-secondary" onclick="showConditionsPanel()" style="font-size:0.8rem;padding:6px 12px">Conditions</button>';
  html += '<button class="btn btn-secondary" onclick="showSetConcentration()" style="font-size:0.8rem;padding:6px 12px">Set Concentration</button>';
  html += '<button class="btn btn-secondary" onclick="showAddBuff()" style="font-size:0.8rem;padding:6px 12px">+ Buff</button>';
  html += '<button class="btn btn-secondary" onclick="showMaxHpBoostPrompt()" style="font-size:0.8rem;padding:6px 12px">+ Max HP</button>';
  html += '</div>';

  // Rest Section (collapsible) — first body section for quick access
  html += '<div class="rest-section" id="rest-section">';
  html += '<div class="rest-header" onclick="toggleRestSection()">';
  html += '<h2>Rest</h2><span class="rest-toggle">options</span></div>';
  html += '<div class="rest-body"><div class="rest-buttons">';
  html += '<button class="rest-btn" onclick="confirmShortRest()">Short Rest<span class="rest-label">' + getShortRestDescription(c.class, c.subclass, c.level) + '</span></button>';
  html += '<button class="rest-btn" onclick="confirmLongRest()">Long Rest<span class="rest-label">Restores everything</span></button>';
  html += '</div></div></div>';

  // Compute AC buff annotation (from externalBuffs only)
  var acBuff = 0;
  if (c.externalBuffs) {
    c.externalBuffs.forEach(function(buff) { (buff.effects || []).forEach(function(eff) { if (eff.type === 'acBonus') acBuff += eff.value; }); });
  }
  var acNote = acBuff > 0 ? ' <span style="font-size:0.7rem;color:var(--accent)">(+' + acBuff + ')</span>' : '';

  // Stats — collapsible, collapsed by default, centered heading
  html += '<div class="dash-section"><details><summary style="text-align:center"><h2 style="display:inline">Stats</h2></summary>';
  // Stat cards
  html += '<div class="stat-grid">';
  html += '<div class="stat-card"><div class="stat-value">' + ac + acNote + '</div><div class="stat-label">Armor Class</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + c.speed + ' ft</div><div class="stat-label">Speed</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + (c.initiative >= 0 ? '+' : '') + c.initiative + '</div><div class="stat-label">Initiative</div></div>';
  html += '<div class="stat-card"><div class="stat-value">+' + c.proficiencyBonus + '</div><div class="stat-label">Prof. Bonus</div></div>';
  if (isCaster && !(c.class === 'Paladin' && c.level < 2)) {
    html += '<div class="stat-card"><div class="stat-value">' + spellDC + '</div><div class="stat-label">Spell Save DC</div></div>';
    html += '<div class="stat-card"><div class="stat-value">+' + spellAtk + '</div><div class="stat-label">Spell Attack</div></div>';
  }
  html += '</div>';
  // Ability Scores sub-section
  html += '<details open><summary><h3 style="display:inline;font-size:1rem">Ability Scores</h3></summary><div class="ability-row-dash">';
  ABILITIES.forEach(function(ab) {
    html += '<div class="ability-card"><div class="ab-name">' + ABILITY_NAMES[ab] + '</div>';
    html += '<div class="ab-mod">' + modStr(getEffectiveAbilityScore(c, ab)) + '</div>';
    html += '<div class="ab-score">' + getEffectiveAbilityScore(c, ab) + '</div></div>';
  });
  html += '</div></details>';
  // Proficiencies sub-section
  html += '<details open><summary><h3 style="display:inline;font-size:1rem">Proficiencies</h3></summary>';
  html += '<div style="margin:8px 0"><span class="text-dim" style="font-size:0.85rem">Saving Throws: </span>';
  (c.savingThrows || []).forEach(function(st) {
    var bonus = getEffectiveMod(c, st) + c.proficiencyBonus + getEquipSaveBonus(c, st);
    html += '<span class="tag accent">' + ABILITY_NAMES[st] + ' +' + bonus + '</span> ';
  });
  html += '</div><div><span class="text-dim" style="font-size:0.85rem">Skills: </span>';
  (c.skillProficiencies || []).forEach(function(sk) {
    var skill = SKILLS.find(function(s) { return s.name.toLowerCase() === sk.toLowerCase(); });
    if (!skill) { html += '<span class="tag">' + sk + '</span> '; return; }
    var isExpertise = c.expertiseSkills && c.expertiseSkills.indexOf(sk.toLowerCase()) >= 0;
    var bonus = getEffectiveMod(c, skill.ability) + c.proficiencyBonus * (isExpertise ? 2 : 1);
    html += '<span class="tag accent">' + skill.name + ' +' + bonus + (isExpertise ? ' (E)' : '') + '</span> ';
  });
  html += '</div></details>';
  // Features & Traits sub-section — collapsed by default
  html += '<details><summary><h3 style="display:inline;font-size:1rem">Features &amp; Traits</h3></summary>';
  if (c.features && c.features.length > 0) {
    html += '<ul class="feature-list">';
    c.features.forEach(function(f) { html += '<li>' + f + '</li>'; });
    html += '</ul>';
  } else {
    html += '<p class="text-dim">No features yet</p>';
  }
  html += '<div class="text-dim mt-8" style="font-size:0.85rem">Hit Dice: ' + c.hp.hitDiceCount + 'd' + c.hp.hitDiceType + '</div>';
  html += '</details>';
  html += '</details></div>';

  // Ability Checks (saving throws & ability checks only)
  html += renderAbilityChecks(c);

  // Class Abilities — collapsible, collapsed by default, centered heading
  html += '<div class="dash-section"><details><summary style="text-align:center"><h2 style="display:inline">Class Abilities</h2></summary>';

  // Channel Divinity Tracker (Cleric or Paladin level 3+)
  if (c.class === 'Cleric' || (c.class === 'Paladin' && c.level >= 3)) {
    var cdMax = c.channelDivinityUses || 1;
    var cdUsed = c.channelDivinityUsed || 0;
    html += '<h3 style="font-size:1rem;margin:8px 0">Channel Divinity <span class="text-dim" style="font-size:0.85rem;font-weight:normal">(' + cdMax + '/rest)</span></h3>';
    html += '<div class="cd-tracker"><div class="cd-uses">';
    for (var cdi = 0; cdi < cdMax; cdi++) {
      html += '<div class="cd-icon' + (cdi < cdUsed ? ' spent' : '') + '" onclick="toggleCD(' + cdi + ')">&#9889;</div>';
    }
    html += '</div></div>';

    // Channel Divinity description cards
    html += '<div class="cd-cards">';
    if (c.class === 'Cleric') {
      var destroyThreshold = '';
      if (c.level >= 17) destroyThreshold = 'CR 4 or lower';
      else if (c.level >= 14) destroyThreshold = 'CR 3 or lower';
      else if (c.level >= 11) destroyThreshold = 'CR 2 or lower';
      else if (c.level >= 8) destroyThreshold = 'CR 1 or lower';
      else if (c.level >= 5) destroyThreshold = 'CR 1/2 or lower';
      html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
      html += '<div class="cd-card-header"><span class="cd-name">Turn Undead</span>';
      html += '<span class="cd-brief">Action, 30 ft, WIS save DC ' + spellDC + '</span>';
      html += '<span class="cd-expand">&#9654;</span></div>';
      html += '<div class="cd-card-body">';
      html += '<p>Each undead within 30 ft that can see or hear you must make a <span class="cd-highlight">WIS save (DC ' + spellDC + ')</span>. On failure, it is turned for 1 minute &mdash; it must Dash away and cannot take reactions. Ends if it takes damage.</p>';
      if (destroyThreshold) {
        html += '<p style="margin-top:8px"><span class="cd-highlight">Destroy Undead:</span> Instantly destroys turned undead of <span class="cd-highlight">' + destroyThreshold + '</span>.</p>';
      }
      html += '</div></div>';
      var plPool = 5 * c.level;
      html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
      html += '<div class="cd-card-header"><span class="cd-name">Preserve Life</span>';
      html += '<span class="cd-brief">Action, 30 ft, ' + plPool + ' HP pool</span>';
      html += '<span class="cd-expand">&#9654;</span></div>';
      html += '<div class="cd-card-body">';
      html += '<p>Distribute up to <span class="cd-highlight">' + plPool + ' HP</span> among any creatures within 30 ft. Cannot restore a creature above half its max HP.</p>';
      html += '</div></div>';
    }
    if (c.class === 'Paladin') {
      var subFeats = PALADIN_SUBCLASS_FEATURES[c.subclass];
      if (subFeats && subFeats[3]) {
        subFeats[3].forEach(function(featName) {
          var desc = PALADIN_FEATURE_DESCRIPTIONS[featName] || '';
          html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
          html += '<div class="cd-card-header"><span class="cd-name">' + escapeHtml(featName) + '</span>';
          html += '<span class="cd-expand">&#9654;</span></div>';
          html += '<div class="cd-card-body"><p>' + desc + '</p></div></div>';
        });
      }
    }
    html += '</div>';
  }

  // Fighter class features
  if (c.class === 'Fighter') {
    html += renderFighterDashboard(c);
  }

  // Paladin class features
  if (c.class === 'Paladin') {
    html += renderPaladinDashboard(c);
  }

  // Rogue class features
  if (c.class === 'Rogue') {
    html += renderRogueDashboard(c);
  }

  // Wizard class features
  if (c.class === 'Wizard') {
    html += renderWizardDashboard(c);
  }

  // "Coming Soon" placeholder for classes without full implementation
  if (c.class !== 'Cleric' && c.class !== 'Fighter' && c.class !== 'Paladin' && c.class !== 'Rogue' && c.class !== 'Wizard') {
    html += '<div style="border:2px dashed var(--border);border-radius:var(--radius);padding:24px;text-align:center;margin:16px 0">';
    html += '<p class="text-dim" style="font-size:0.95rem">Class features coming soon — <strong>' + escapeHtml(c.class) + '</strong>.</p>';
    html += '<p class="text-dim" style="font-size:0.85rem;margin-top:4px">Class-specific resources and abilities will appear here in a future update.</p>';
    html += '</div>';
  }

  // Aasimar Racial Traits
  if (c.race === 'Aasimar') {
    html += renderResourceTracker('Healing Hands', 'healingHands', 1, c, {
      icon: '&#10084;',
      description: 'Action, touch: heal ' + c.level + ' HP. 1 use per long rest.',
      restType: 'long rest'
    });
    if (c.subrace && AASIMAR_SUBRACES[c.subrace] && c.level >= AASIMAR_SUBRACES[c.subrace].transformation.minLevel) {
      var trans = AASIMAR_SUBRACES[c.subrace].transformation;
      var transDesc = trans.description
        .replace(/your level/g, c.level + '')
        .replace(/half your level \(round up\)/g, Math.ceil(c.level / 2) + '');
      // Necrotic Shroud: compute CHA save DC
      if (c.subrace === 'Fallen') {
        var chaSaveDC = 8 + c.proficiencyBonus + getEffectiveMod(c, 'cha');
        transDesc = transDesc.replace('a CHA save', 'a CHA save (DC ' + chaSaveDC + ')');
      }
      html += renderResourceTracker(trans.name, 'aasTransform', 1, c, {
        icon: '&#10024;',
        description: transDesc,
        restType: 'long rest'
      });
    }
  }

  html += '</details></div>';

  // Spells — collapsible, centered heading
  html += '<div class="dash-section"><details><summary style="text-align:center"><h2 style="display:inline">Spells</h2></summary>';

  // Spell Slots (casters only)
  if (isCaster && c.spellSlots && Object.keys(c.spellSlots).length > 0) {
    var slotEntries = Object.entries(c.spellSlots);
    html += '<h3 style="font-size:1rem;margin:8px 0">Spell Slots</h3>';
    slotEntries.forEach(function(entry) {
      var level = entry[0], count = entry[1];
      var used = (c.spellSlotsUsed && c.spellSlotsUsed[level]) || 0;
      html += '<div class="slot-row"><span class="slot-label">' + ordinal(parseInt(level)) + ' Level</span>';
      for (var si = 0; si < count; si++) {
        html += '<span class="slot-dot filled interactive' + (si < used ? ' spent' : '') + '" onclick="toggleSlot(' + level + ',' + si + ')"></span>';
      }
      html += '</div>';
    });
  }

  // Cantrips
  var displayCantrips = (c.cantripsKnown || []).slice();
  var hasInnateLight = c.race === 'Aasimar' && displayCantrips.indexOf('Light') < 0;
  if (hasInnateLight) displayCantrips.push('Light');
  if (displayCantrips.length > 0) {
    html += '<h3 style="font-size:1rem;margin:8px 0">Cantrips</h3>';
    html += '<div class="cantrip-chips">';
    displayCantrips.forEach(function(name, ci) {
      var isInnate = (name === 'Light' && hasInnateLight) || (name === 'Light' && c.race === 'Aasimar');
      html += '<span class="cantrip-chip" onclick="toggleCantripDetail(' + ci + ')">' + escapeHtml(name) + (isInnate ? ' (R)' : '') + '</span>';
    });
    html += '</div>';
    html += '<div id="cantrip-detail-area"></div>';
  }

  // Domain/Oath Spells
  if (c.class === 'Cleric' || (c.class === 'Paladin' && c.level >= 2)) {
    var domainLabel = c.class === 'Paladin' ? 'Oath Spells' : 'Domain Spells';
    var domainList = getDomainSpellList(c.level, c.class, c.subclass);
    html += '<details><summary><h3 style="display:inline;font-size:1rem">' + domainLabel + ' <span class="badge">Always Prepared</span></h3> <span class="text-dim" style="font-size:0.85rem">(' + domainList.length + ')</span></summary>';
    domainList.forEach(function(name) {
      var sp = getSpell(name);
      if (sp) html += renderSpellCard(sp, c, { domain: true });
      else html += '<span class="tag accent">' + escapeHtml(name) + '</span>';
    });
    html += '</details>';
  }

  // Prepared Spells
  if (c.class === 'Cleric' || (c.class === 'Paladin' && c.level >= 2) || c.class === 'Wizard') {
    var wizPrepCount = c.class === 'Wizard' ? getWizardPreparedCount(c.level, getEffectiveMod(c, 'int')) : c.preparedSpellCount;
    var prepDisplay = c.class === 'Wizard' ? (c.currentPreparedSpells || []).length + '/' + wizPrepCount : (c.currentPreparedSpells || []).length + '/' + c.preparedSpellCount;
    html += '<details><summary><h3 style="display:inline;font-size:1rem">Prepared Spells</h3> <span class="text-dim" style="font-size:0.85rem">(' + prepDisplay + ')</span></summary>';
    if (c.class === 'Wizard') {
      html += '<button class="btn btn-secondary" onclick="showChangePreparedWizard()" style="margin:8px 0;font-size:0.85rem;padding:6px 14px">Change Prepared Spells</button>';
    }
    if (c.currentPreparedSpells && c.currentPreparedSpells.length > 0) {
      c.currentPreparedSpells.forEach(function(name) {
        var sp = getSpell(name);
        if (sp) html += renderSpellCard(sp, c);
        else html += '<span class="tag">' + escapeHtml(name) + '</span>';
      });
    } else {
      html += '<p class="text-dim">No prepared spells selected</p>';
    }
    html += '</details>';
  }

  // Spellbook (Wizard only)
  if (c.class === 'Wizard' && c.spellbook && c.spellbook.length > 0) {
    html += '<details><summary><h3 style="display:inline;font-size:1rem">Spellbook</h3> <span class="text-dim" style="font-size:0.85rem">(' + c.spellbook.length + ' spells)</span></summary>';
    html += '<button class="btn btn-secondary" onclick="showCopySpellToSpellbook()" style="margin:8px 0;font-size:0.85rem;padding:6px 14px">+ Copy Spell to Spellbook</button>';
    var sbByLevel = {};
    c.spellbook.forEach(function(name) { var sp = getSpell(name); var sl = sp ? sp.level : 1; if (!sbByLevel[sl]) sbByLevel[sl] = []; sbByLevel[sl].push(name); });
    Object.keys(sbByLevel).sort(function(a,b){return a-b;}).forEach(function(sl) {
      html += '<h4 class="text-dim" style="font-size:0.8rem;text-transform:uppercase;margin:8px 0 4px">' + ordinal(parseInt(sl)) + '-Level</h4>';
      sbByLevel[sl].forEach(function(name) {
        var sp = getSpell(name);
        var isPrepared = (c.currentPreparedSpells || []).indexOf(name) >= 0;
        if (sp) {
          html += renderSpellCard(sp, c, { innateLabel: isPrepared ? '' : 'Not Prepared' });
        } else {
          html += '<span class="tag' + (isPrepared ? '' : ' text-dim') + '">' + escapeHtml(name) + (isPrepared ? '' : ' (Not Prepared)') + '</span>';
        }
      });
    });
    html += '</details>';
  }

  html += '</details></div>';

  // Inventory — collapsible, centered heading
  html += '<div class="dash-section"><details><summary style="text-align:center"><h2 style="display:inline">Inventory</h2></summary>';

  // Currency (at top)
  var cur = c.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  html += '<h3 style="font-size:1rem;margin:8px 0">Currency</h3>';
  html += '<div class="currency-grid">';
  ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(function(d) {
    html += '<div class="currency-cell">';
    html += '<div class="cur-label">' + d.toUpperCase() + '</div>';
    html += '<div class="cur-value" id="cur-' + d + '" onclick="editCurrency(\'' + d + '\')">' + (cur[d] || 0) + '</div>';
    html += '<div class="cur-btns">';
    html += '<button class="cur-adj" onclick="event.stopPropagation();adjustCurrency(\'' + d + '\',-1)">−</button>';
    html += '<button class="cur-adj" onclick="event.stopPropagation();adjustCurrency(\'' + d + '\',1)">+</button>';
    html += '</div></div>';
  });
  html += '</div>';
  var gpEquiv = (cur.cp / 100) + (cur.sp / 10) + (cur.ep / 2) + cur.gp + (cur.pp * 10);
  html += '<div class="currency-total">≈ ' + gpEquiv.toFixed(1) + ' GP total</div>';

  // Weapons
  html += '<h3 style="font-size:1rem;margin:16px 0 8px">Weapons <button class="inline-edit-btn" onclick="showWeaponForm(-1)">+ Add</button></h3>';
  html += '<div id="weapon-form-area"></div>';
  if (c.weapons && c.weapons.length > 0) {
    c.weapons.forEach(function(w, wi) {
      var abilMod = getEffectiveMod(c, w.ability || 'str');
      var profB = w.proficient ? c.proficiencyBonus : 0;
      var magB = w.magicBonus || 0;
      var atkTotal = abilMod + profB + magB;
      var dmgTotal = abilMod + magB;
      html += '<div class="equip-item"><div class="ei-info">';
      html += '<div class="ei-name">' + escapeHtml(w.name) + (magB ? ' <span class="text-accent" style="font-size:0.8rem">+' + magB + '</span>' : '') + '</div>';
      var impSmite = (c.class === 'Paladin' && c.level >= 11) ? ' + 1d8 radiant' : '';
      html += '<div class="ei-detail">+' + atkTotal + ' to hit · ' + w.damage + (dmgTotal >= 0 ? '+' : '') + dmgTotal + ' ' + w.damageType + impSmite + (w.notes ? ' · ' + w.notes : '') + '</div>';
      html += '</div><div class="ei-actions">';
      html += '<button class="ei-btn" onclick="showWeaponForm(' + wi + ')">Edit</button>';
      html += '<button class="ei-btn" onclick="confirmDeleteWeapon(' + wi + ')" style="color:var(--error)">×</button>';
      html += '</div></div>';
    });
  } else {
    html += '<p class="text-dim">No weapons</p>';
  }

  // Equipped Gear
  html += '<h3 style="font-size:1rem;margin:16px 0 8px">Equipped Gear <button class="inline-edit-btn" onclick="showEquipForm(-1)">+ Add</button></h3>';
  html += '<div id="equip-form-area"></div>';
  var equipped = c.equippedItems || [];
  if (equipped.length > 0) {
    equipped.forEach(function(item, idx) {
      html += '<div class="equip-item"><div class="ei-info">';
      var eiMagic = item.magicBonus || 0;
      html += '<div class="ei-name">' + escapeHtml(item.name) + (eiMagic ? ' <span class="text-accent" style="font-size:0.8rem">+' + eiMagic + '</span>' : '') + '</div>';
      var detail = item.slot;
      if (item.stats && item.stats.ac) detail += ' · AC ' + item.stats.ac + (eiMagic ? '+' + eiMagic : '');
      if (item.stats && item.stats.acBonus) detail += ' · +' + ((item.stats.acBonus || 0) + eiMagic) + ' AC';
      if (item.notes) detail += ' · ' + item.notes;
      html += '<div class="ei-detail">' + detail + '</div></div>';
      html += '<div class="ei-actions">';
      html += '<button class="ei-btn" onclick="showEquipForm(' + idx + ')">Edit</button>';
      html += '<button class="ei-btn" onclick="unequipItem(' + idx + ')">Unequip</button>';
      html += '<button class="ei-btn" onclick="removeEquipItem(' + idx + ')" style="color:var(--error)">×</button>';
      html += '</div></div>';
    });
  } else {
    html += '<p class="text-dim">No equipped gear</p>';
  }

  // Unequipped Gear
  var unequipped = c.unequippedItems || [];
  if (unequipped.length > 0) {
    html += '<h3 style="font-size:1rem;margin:16px 0 8px">Unequipped Gear</h3>';
    unequipped.forEach(function(item, idx) {
      var eiMagic = item.magicBonus || 0;
      html += '<div class="equip-item"><div class="ei-info">';
      html += '<div class="ei-name">' + escapeHtml(item.name) + (eiMagic ? ' <span class="text-accent" style="font-size:0.8rem">+' + eiMagic + '</span>' : '') + '</div>';
      var detail = item.slot;
      if (item.stats && item.stats.ac) detail += ' · AC ' + item.stats.ac + (eiMagic ? '+' + eiMagic : '');
      if (item.stats && item.stats.acBonus) detail += ' · +' + ((item.stats.acBonus || 0) + eiMagic) + ' AC';
      html += '<div class="ei-detail">' + detail + '</div>';
      html += '<div style="margin-top:4px"><input type="text" class="uneq-note-input" id="uneq-note-' + idx + '" value="' + escapeHtml(item.notes || '') + '" placeholder="Notes..." onblur="saveUnequippedNote(' + idx + ')" onclick="event.stopPropagation()"></div>';
      html += '</div><div class="ei-actions">';
      html += '<button class="ei-btn" onclick="equipFromInventory(' + idx + ')">Equip</button>';
      html += '<button class="ei-btn" onclick="showEditUnequippedForm(' + idx + ')">Edit</button>';
      html += '<button class="ei-btn" onclick="deleteUnequippedItem(' + idx + ')" style="color:var(--error)">×</button>';
      html += '</div></div>';
    });
  }

  // Quick Items
  html += '<h3 style="font-size:1rem;margin:16px 0 8px">Quick Items</h3>';
  html += '<div class="quick-add">';
  html += '<input type="text" id="quick-item-input" placeholder="Add item..." onclick="event.stopPropagation()" onkeydown="if(event.key===\'Enter\')addQuickItem()">';
  html += '<button class="btn btn-secondary" onclick="addQuickItem()" style="padding:8px 16px">Add</button></div>';
  html += '<div id="quick-items-list">';
  (c.quickItems || []).forEach(function(item, idx) {
    var qiName = typeof item === 'string' ? item : item.name;
    var qiNotes = typeof item === 'string' ? '' : (item.notes || '');
    html += '<div class="qi-card">';
    html += '<div class="qi-card-header"><span class="qi-card-name">' + escapeHtml(qiName) + '</span>';
    html += '<button class="qi-remove" onclick="removeQuickItem(' + idx + ')">×</button></div>';
    html += '<input type="text" class="qi-note-input" id="qi-note-' + idx + '" value="' + escapeHtml(qiNotes) + '" placeholder="Add note..." onblur="saveQuickItemNote(' + idx + ')" onclick="event.stopPropagation()">';
    html += '</div>';
  });
  html += '</div>';

  // Inventory (bulk gear text)
  html += '<h3 style="font-size:1rem;margin:16px 0 8px">Inventory <button class="inline-edit-btn" onclick="toggleBulkGearEdit()">Edit</button></h3>';
  html += '<div id="bulk-gear-area">';
  if (c.bulkGear) html += '<div class="dash-text">' + escapeHtml(c.bulkGear) + '</div>';
  else html += '<p class="text-dim">No inventory items</p>';
  html += '</div>';

  html += '</details></div>';

  // Reference — collapsible, collapsed by default, centered heading
  html += '<div class="dash-section"><details><summary style="text-align:center"><h2 style="display:inline">Reference</h2></summary>';

  // Notes (inline edit)
  html += '<h3 style="font-size:1rem;margin:8px 0">Notes <button class="inline-edit-btn" onclick="toggleNotesEdit()">Edit</button></h3>';
  html += '<div id="notes-area">';
  if (c.notes) html += '<div class="dash-text">' + escapeHtml(c.notes) + '</div>';
  else html += '<p class="text-dim">No notes</p>';
  html += '</div>';

  // Session Journal
  html += renderJournal(c);

  // Session Log
  html += renderSessionLog(c);

  // Quick Rules Reference
  html += renderQuickRules();

  html += '</details></div>';

  // Actions — 2-column grid
  html += '<div class="dash-actions-grid combat-hide">';
  if (c.class !== 'Cleric' && c.class !== 'Fighter' && c.class !== 'Paladin' && c.class !== 'Rogue' && c.class !== 'Wizard') {
    html += '<button class="btn btn-primary btn-large btn-full" disabled style="opacity:0.4">Level Up — ' + escapeHtml(c.class) + ' coming in a future update</button>';
  } else {
    var lvlUpDisabled = c.level >= 20;
    html += lvlUpDisabled
      ? '<button class="btn btn-primary btn-large btn-full" disabled style="opacity:0.4">Level Up (Max Level)</button>'
      : '<button class="btn btn-primary btn-large btn-full" onclick="startLevelUp()">Level Up</button>';
  }
  html += '<button class="btn btn-secondary" onclick="exportPDF()">Export PDF</button>';
  html += '<button class="btn btn-secondary" onclick="saveToCloud()">Save to Cloud</button>';
  html += '<button class="btn btn-secondary" onclick="editCharacter()">Edit Character</button>';
  html += '<button class="btn btn-secondary" onclick="showThemeEditor()">Theme</button>';
  html += '<button class="btn btn-secondary" onclick="showChangePassword()">Change Password</button>';
  html += '<button class="btn btn-secondary" onclick="goHome()">Back to Home</button>';
  html += '<button class="btn btn-danger" onclick="showResetModal()">Delete Character</button>';
  html += '</div>';

  container.innerHTML = html;
  // Set sticky offset for section headings based on HUD height
  var hud = container.querySelector('.hp-sticky');
  if (hud) {
    document.documentElement.style.setProperty('--hud-height', hud.offsetHeight + 'px');
  }
  if (!preserveScroll) window.scrollTo(0, 0);
  // Apply combat mode state
  combatModeOn = localStorage.getItem('dnd_combatMode') === '1';
  applyCombatMode();
  // Setup long-press tooltips
  setTimeout(setupLongPress, 100);
}

/* ═══════════════════════════════════════════
   EDIT / RESET
   ═══════════════════════════════════════════ */

function editCharacter() {
  const saved = loadCharacter();
  if (!saved) return;
  isEditing = true;
  document.getElementById('onboarding-subtitle').textContent = 'Edit your character details';
  populateForm(saved);
  showOnboarding();
}

function showResetModal() { document.getElementById('reset-modal').classList.remove('hidden'); }
function hideResetModal() { document.getElementById('reset-modal').classList.add('hidden'); }

function confirmReset() {
  if (activeCharId) {
    var chars = loadAllCharacters();
    var charToDelete = chars.find(function(ch) { return ch.id === activeCharId; });
    chars = chars.filter(function(ch) { return ch.id !== activeCharId; });
    saveAllCharacters(chars);
    if (charToDelete) deleteFromCloud(activeCharId, charToDelete.name);
  }
  hideResetModal();
  isEditing = false;
  showHomeScreen();
}

/* ═══════════════════════════════════════════
   FIGHTER DASHBOARD
   ═══════════════════════════════════════════ */

function renderFighterDashboard(c) {
  var html = '';
  var sub = c.subclass || '';

  // Extra Attack (level 5+)
  var extraAtks = c.level >= 20 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1;
  if (extraAtks > 1) {
    html += '<div class="dash-section" style="text-align:center;padding:12px">';
    html += '<div style="font-size:1.4rem;color:var(--accent);font-weight:bold">Attacks per Action: ' + extraAtks + '</div>';
    html += '</div>';
  }

  // Second Wind (level 1+)
  html += renderResourceTracker('Second Wind', 'secondWind', 1, c, {
    icon: '&#10084;',
    description: 'Bonus action: Regain 1d10 + ' + c.level + ' (' + (c.level) + ') HP. Refreshes on short rest.',
    restType: 'short rest'
  });
  html += '<div style="margin:-8px 0 16px 0"><button class="btn btn-secondary" onclick="rollSecondWind()" style="font-size:0.85rem;padding:8px 16px">Roll Second Wind</button></div>';

  // Action Surge (level 2+)
  if (c.level >= 2) {
    var asUses = c.level >= 17 ? 2 : 1;
    var asNote = '';
    if (extraAtks > 1) asNote = ' Action Surge with Extra Attack = ' + extraAtks + ' additional attacks.';
    html += renderResourceTracker('Action Surge', 'actionSurge', asUses, c, {
      icon: '&#9889;',
      description: 'Take one additional action on your turn.' + asNote + ' Refreshes on short rest.',
      restType: 'short rest'
    });
  }

  // Indomitable (level 9+)
  if (c.level >= 9) {
    var indUses = c.level >= 17 ? 3 : c.level >= 13 ? 2 : 1;
    html += renderResourceTracker('Indomitable', 'indomitable', indUses, c, {
      icon: '&#128170;',
      description: 'Reroll a failed saving throw (must use the new roll). Refreshes on long rest.',
      restType: 'long rest'
    });
  }

  // Fighting Style(s)
  if (c.fightingStyle) {
    html += '<div class="dash-section"><h2>Fighting Style</h2>';
    html += renderFightingStyleCard(c.fightingStyle);
    if (c.fightingStyle2) html += renderFightingStyleCard(c.fightingStyle2);
    html += '</div>';
  }

  // Champion: Critical Range
  if (sub === 'Champion' && c.level >= 3) {
    var critRange = c.level >= 15 ? '18-20' : '19-20';
    html += '<div class="dash-section" style="text-align:center;padding:12px">';
    html += '<div style="font-size:1.1rem;color:var(--accent);font-weight:bold">Critical Hit Range: ' + critRange + '</div>';
    html += '<div class="text-dim" style="font-size:0.85rem">' + (c.level >= 15 ? 'Superior Critical' : 'Improved Critical') + '</div>';
    html += '</div>';
  }

  // Champion: Remarkable Athlete
  if (sub === 'Champion' && c.level >= 7) {
    var halfProf = Math.ceil(c.proficiencyBonus / 2);
    html += '<div class="dash-section"><h2>Remarkable Athlete</h2>';
    html += '<p class="text-dim" style="font-size:0.85rem">+' + halfProf + ' to unproficient STR, DEX, CON checks. Also adds to running long jump.</p></div>';
  }

  // Champion: Survivor
  if (sub === 'Champion' && c.level >= 18) {
    var survivorHeal = 5 + getEffectiveMod(c, 'con');
    var halfMax = Math.floor(getEffectiveMaxHp(c) / 2);
    html += '<div class="dash-section"><h2>Survivor</h2>';
    html += '<p class="text-dim" style="font-size:0.85rem">Regain ' + survivorHeal + ' HP per turn when below ' + halfMax + ' HP (and above 0 HP).</p></div>';
  }

  // Battle Master: Superiority Dice + Maneuvers
  if (sub === 'Battle Master' && c.level >= 3) {
    var bmCount = getBmDiceCount(c.level);
    var bmSize = getBmDiceSize(c.level);
    var mDC = getManeuverDC(c);
    html += renderResourceTracker('Superiority Dice', 'superiorityDice', bmCount, c, {
      icon: '&#9878;',
      description: bmCount + 'd' + bmSize + ' — Maneuver Save DC: ' + mDC + '. Refreshes on short rest.',
      restType: 'short rest'
    });

    // Maneuver cards
    if (c.maneuversKnown && c.maneuversKnown.length > 0) {
      html += '<div class="dash-section"><h2>Maneuvers <span class="text-dim" style="font-size:0.85rem;font-weight:normal">DC ' + mDC + '</span></h2>';
      c.maneuversKnown.forEach(function(name) {
        var desc = MANEUVERS[name] || '';
        html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
        html += '<div class="cd-card-header"><span class="cd-name">' + escapeHtml(name) + '</span>';
        html += '<span class="cd-brief">1 superiority die</span>';
        html += '<span class="cd-expand">&#9654;</span></div>';
        html += '<div class="cd-card-body"><p>' + desc + '</p></div></div>';
      });
      html += '</div>';
    }
  }

  // Eldritch Knight: Spell DC / Attack + Spell Slots
  if (sub === 'Eldritch Knight' && c.level >= 3) {
    var ekDC = 8 + c.proficiencyBonus + getEffectiveMod(c, 'int');
    var ekAtk = c.proficiencyBonus + getEffectiveMod(c, 'int');
    html += '<div class="stat-grid" style="margin-bottom:16px">';
    html += '<div class="stat-card"><div class="stat-value">' + ekDC + '</div><div class="stat-label">Spell Save DC</div></div>';
    html += '<div class="stat-card"><div class="stat-value">+' + ekAtk + '</div><div class="stat-label">Spell Attack</div></div>';
    html += '</div>';

    // EK Spell Slots
    var ekSlots = c.spellSlots || getThirdCasterSlots(c.level);
    if (ekSlots && Object.keys(ekSlots).length > 0) {
      html += '<div class="dash-section"><h2>Spell Slots</h2>';
      Object.entries(ekSlots).forEach(function(entry) {
        var level = entry[0], count = entry[1];
        var used = (c.spellSlotsUsed && c.spellSlotsUsed[level]) || 0;
        html += '<div class="slot-row"><span class="slot-label">' + ordinal(parseInt(level)) + ' Level</span>';
        for (var si = 0; si < count; si++) {
          html += '<span class="slot-dot filled interactive' + (si < used ? ' spent' : '') + '" onclick="toggleSlot(' + level + ',' + si + ')"></span>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // EK Cantrips
    if (c.cantripsKnown && c.cantripsKnown.length > 0) {
      html += '<div class="dash-section"><h2>Cantrips</h2>';
      c.cantripsKnown.forEach(function(name) {
        var sp = getSpell(name);
        if (sp) html += renderSpellCard(sp, c);
        else html += '<span class="tag">' + escapeHtml(name) + '</span>';
      });
      html += '</div>';
    }

    // EK Known Spells
    if (c.spellsKnown && c.spellsKnown.length > 0) {
      html += '<div class="dash-section"><h2>Spells Known <span class="text-dim" style="font-size:0.85rem;font-weight:normal">(' + c.spellsKnown.length + ')</span></h2>';
      c.spellsKnown.forEach(function(name) {
        var sp = getSpell(name);
        if (sp) html += renderSpellCard(sp, c);
        else html += '<span class="tag">' + escapeHtml(name) + '</span>';
      });
      html += '</div>';
    }

    // EK subclass features (War Magic, etc.)
    if (c.level >= 7) {
      html += '<div class="dash-section"><h2>Eldritch Knight Features</h2>';
      if (c.level >= 7) html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')"><div class="cd-card-header"><span class="cd-name">' + (c.level >= 18 ? 'Improved War Magic' : 'War Magic') + '</span><span class="cd-expand">&#9654;</span></div><div class="cd-card-body"><p>' + (c.level >= 18 ? FIGHTER_FEATURE_DESCRIPTIONS['Improved War Magic'] : FIGHTER_FEATURE_DESCRIPTIONS['War Magic']) + '</p></div></div>';
      if (c.level >= 10) html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')"><div class="cd-card-header"><span class="cd-name">Eldritch Strike</span><span class="cd-expand">&#9654;</span></div><div class="cd-card-body"><p>' + FIGHTER_FEATURE_DESCRIPTIONS['Eldritch Strike'] + '</p></div></div>';
      if (c.level >= 15) html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')"><div class="cd-card-header"><span class="cd-name">Arcane Charge</span><span class="cd-expand">&#9654;</span></div><div class="cd-card-body"><p>' + FIGHTER_FEATURE_DESCRIPTIONS['Arcane Charge'] + '</p></div></div>';
      html += '</div>';
    }
  }

  return html;
}

/* ═══════════════════════════════════════════
   PALADIN DASHBOARD
   ═══════════════════════════════════════════ */

function renderPaladinDashboard(c) {
  var html = '';
  var sub = c.subclass || '';
  var chaMod = getEffectiveMod(c, 'cha');

  // Divine Smite Reference Card (level 2+)
  if (c.level >= 2) {
    html += '<div class="dash-section"><h2>Divine Smite</h2>';
    html += '<div class="cd-card expanded" style="border-color:var(--accent)">';
    html += '<div class="cd-card-body">';
    html += '<p>On a <span class="cd-highlight">melee weapon hit</span>, spend a spell slot for extra radiant damage:</p>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px 16px;margin:8px 0;font-size:0.9rem">';
    html += '<div><span class="cd-highlight">1st:</span> 2d8</div>';
    html += '<div><span class="cd-highlight">2nd:</span> 3d8</div>';
    html += '<div><span class="cd-highlight">3rd:</span> 4d8</div>';
    html += '<div><span class="cd-highlight">4th+:</span> 5d8 (max)</div>';
    html += '</div>';
    html += '<p style="font-size:0.85rem;color:var(--accent)">+1d8 vs undead or fiend</p>';
    if (c.level >= 11) {
      html += '<p style="margin-top:8px;font-weight:bold;color:var(--success)">Improved Divine Smite: All melee attacks deal +1d8 radiant (automatic, no slot cost)</p>';
    }
    html += '</div></div></div>';
  }

  // Lay on Hands (level 1+)
  var lohMax = 5 * c.level;
  var lohUsed = (c.resources && c.resources.layOnHands) ? (c.resources.layOnHands.used || 0) : 0;
  var lohRemaining = Math.max(0, lohMax - lohUsed);
  html += '<div class="dash-section"><h2>Lay on Hands</h2>';
  html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">';
  html += '<div style="font-size:2rem;font-weight:bold;color:var(--accent)">' + lohRemaining + '</div>';
  html += '<div><div style="font-size:0.85rem;color:var(--text-dim)">of ' + lohMax + ' HP remaining</div>';
  html += '<div style="background:var(--surface-raised);border-radius:4px;height:8px;margin-top:4px;overflow:hidden"><div style="background:var(--accent);height:100%;width:' + (lohMax > 0 ? (lohRemaining / lohMax * 100) : 0) + '%;transition:width 0.3s"></div></div>';
  html += '</div></div>';
  html += '<button class="btn btn-primary" onclick="showLayOnHandsPrompt()" style="font-size:0.85rem;padding:8px 16px">Use Lay on Hands</button>';
  html += '<p class="text-dim" style="font-size:0.85rem;margin-top:8px">Action: touch a creature to restore HP from your pool. Spend 5 points to cure one disease or neutralize one poison.</p>';
  html += '</div>';

  // Divine Sense (level 1+)
  var dsDivUses = Math.max(0, 1 + chaMod);
  html += renderResourceTracker('Divine Sense', 'divineSense', dsDivUses, c, {
    icon: '&#128065;',
    description: 'Action: detect celestials, fiends, or undead within 60 ft, and consecrated/desecrated places. ' + dsDivUses + ' uses per long rest.',
    restType: 'long rest'
  });

  // Extra Attack (level 5+)
  if (c.level >= 5) {
    html += '<div class="dash-section" style="text-align:center;padding:12px">';
    html += '<div style="font-size:1.4rem;color:var(--accent);font-weight:bold">Attacks per Action: 2</div>';
    html += '</div>';
  }

  // Auras (level 6+)
  if (c.level >= 6) {
    var auraRange = c.level >= 18 ? 30 : 10;
    html += '<div class="dash-section"><h2>Active Auras <span class="text-dim" style="font-size:0.85rem;font-weight:normal">(' + auraRange + ' ft)</span></h2>';

    // Aura of Protection (level 6)
    var auraBonus = Math.max(1, chaMod);
    html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
    html += '<div class="cd-card-header"><span class="cd-name">Aura of Protection</span>';
    html += '<span class="cd-brief">+' + auraBonus + ' to saves, ' + auraRange + ' ft</span>';
    html += '<span class="cd-expand">&#9654;</span></div>';
    html += '<div class="cd-card-body"><p>' + PALADIN_FEATURE_DESCRIPTIONS['Aura of Protection'] + '</p></div></div>';

    // Oath-specific aura (level 7)
    if (c.level >= 7) {
      var subFeats7 = PALADIN_SUBCLASS_FEATURES[sub];
      if (subFeats7 && subFeats7[7]) {
        subFeats7[7].forEach(function(featName) {
          var desc = PALADIN_FEATURE_DESCRIPTIONS[featName] || '';
          html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
          html += '<div class="cd-card-header"><span class="cd-name">' + escapeHtml(featName) + '</span>';
          html += '<span class="cd-brief">' + auraRange + ' ft</span>';
          html += '<span class="cd-expand">&#9654;</span></div>';
          html += '<div class="cd-card-body"><p>' + desc + '</p></div></div>';
        });
      }
    }

    // Aura of Courage (level 10)
    if (c.level >= 10) {
      html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
      html += '<div class="cd-card-header"><span class="cd-name">Aura of Courage</span>';
      html += '<span class="cd-brief">Immune to frightened, ' + auraRange + ' ft</span>';
      html += '<span class="cd-expand">&#9654;</span></div>';
      html += '<div class="cd-card-body"><p>' + PALADIN_FEATURE_DESCRIPTIONS['Aura of Courage'] + '</p></div></div>';
    }
    html += '</div>';
  }

  // Cleansing Touch (level 14+)
  if (c.level >= 14) {
    var ctUses = Math.max(1, chaMod);
    html += renderResourceTracker('Cleansing Touch', 'cleansingTouch', ctUses, c, {
      icon: '&#10024;',
      description: 'Action: end one spell on yourself or a willing creature you touch. ' + ctUses + ' uses per long rest.',
      restType: 'long rest'
    });
  }

  // Fighting Style
  if (c.fightingStyle) {
    html += '<div class="dash-section"><h2>Fighting Style</h2>';
    html += renderFightingStyleCard(c.fightingStyle);
    html += '</div>';
  }

  // Oath subclass features (level 15+)
  if (c.level >= 15) {
    var subFeats15 = PALADIN_SUBCLASS_FEATURES[sub];
    if (subFeats15 && subFeats15[15]) {
      html += '<div class="dash-section"><h2>Oath Features</h2>';
      subFeats15[15].forEach(function(featName) {
        var desc = PALADIN_FEATURE_DESCRIPTIONS[featName] || '';
        html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
        html += '<div class="cd-card-header"><span class="cd-name">' + escapeHtml(featName) + '</span>';
        html += '<span class="cd-expand">&#9654;</span></div>';
        html += '<div class="cd-card-body"><p>' + desc + '</p></div></div>';
      });
      html += '</div>';
    }
  }

  // Oath Capstone (level 20)
  if (c.level >= 20) {
    var subFeats20 = PALADIN_SUBCLASS_FEATURES[sub];
    if (subFeats20 && subFeats20[20]) {
      subFeats20[20].forEach(function(featName) {
        html += renderResourceTracker(featName, 'oathCapstone', 1, c, {
          icon: '&#9733;',
          description: PALADIN_FEATURE_DESCRIPTIONS[featName] || '',
          restType: 'long rest'
        });
      });
    }
  }

  return html;
}

/* ═══════════════════════════════════════════
   ROGUE DASHBOARD
   ═══════════════════════════════════════════ */

function renderRogueDashboard(c) {
  var html = '';
  var sub = c.subclass || '';
  var saDice = getSneakAttackDice(c.level);

  // Sneak Attack — large, prominent
  html += '<div class="dash-section" style="text-align:center;padding:16px;border:2px solid var(--accent);border-radius:var(--radius)">';
  html += '<div style="font-size:2rem;font-weight:bold;color:var(--accent)">Sneak Attack: ' + saDice + 'd6</div>';
  html += '<button class="btn btn-primary" onclick="rollSneakAttack()" style="margin:12px 0;font-size:1rem;padding:10px 24px">Roll ' + saDice + 'd6</button>';
  html += '<div class="cd-card expanded" style="border-color:var(--border);text-align:left;margin-top:8px">';
  html += '<div class="cd-card-body" style="font-size:0.85rem">';
  html += '<p style="font-weight:bold;margin-bottom:6px">SNEAK ATTACK — once per turn</p>';
  html += '<p>You need ONE of:</p>';
  html += '<p style="margin-left:8px;color:var(--success)">\u2713 Advantage on the attack roll</p>';
  html += '<p style="margin-left:8px;color:var(--success)">\u2713 An ally within 5ft of the target (and you don\'t have disadvantage)</p>';
  html += '<p style="margin-top:6px;color:var(--text-dim)">Must use a finesse or ranged weapon.</p>';
  html += '</div></div></div>';

  // Cunning Action (level 2+)
  if (c.level >= 2) {
    html += '<div class="dash-section"><h2>Cunning Action</h2>';
    html += '<p class="text-dim" style="font-size:0.85rem;margin-bottom:8px">Bonus action: choose one</p>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
    html += '<div class="cd-card" style="flex:1;min-width:120px" onclick="this.classList.toggle(\'expanded\')">';
    html += '<div class="cd-card-header"><span class="cd-name">Dash</span><span class="cd-expand">&#9654;</span></div>';
    html += '<div class="cd-card-body"><p>Double your movement this turn.</p></div></div>';
    html += '<div class="cd-card" style="flex:1;min-width:120px" onclick="this.classList.toggle(\'expanded\')">';
    html += '<div class="cd-card-header"><span class="cd-name">Disengage</span><span class="cd-expand">&#9654;</span></div>';
    html += '<div class="cd-card-body"><p>Your movement doesn\'t provoke opportunity attacks this turn.</p></div></div>';
    html += '<div class="cd-card" style="flex:1;min-width:120px" onclick="this.classList.toggle(\'expanded\')">';
    html += '<div class="cd-card-header"><span class="cd-name">Hide</span><span class="cd-expand">&#9654;</span></div>';
    html += '<div class="cd-card-body"><p>Make a Stealth check. Success = hidden (advantage on next attack).</p>';
    html += '<button class="btn btn-secondary" onclick="event.stopPropagation();doSkillRoll(\'Stealth\')" style="margin-top:6px;font-size:0.8rem;padding:4px 12px">Roll Stealth</button>';
    html += '</div></div>';
    html += '</div>';

    // Thief: Fast Hands adds extra Cunning Action options
    if (sub === 'Thief' && c.level >= 3) {
      html += '<p class="text-dim" style="font-size:0.8rem;margin-top:8px"><strong>Fast Hands:</strong> Also Use an Object, Sleight of Hand check, or thieves\' tools.</p>';
    }
    // Thief: Supreme Sneak note
    if (sub === 'Thief' && c.level >= 9) {
      html += '<p class="text-dim" style="font-size:0.8rem;margin-top:4px"><strong>Supreme Sneak:</strong> Advantage on Stealth if you move \u2264 half speed.</p>';
    }
    html += '</div>';
  }

  // Uncanny Dodge (level 5+)
  if (c.level >= 5) {
    html += '<div class="dash-section"><h2>Uncanny Dodge</h2>';
    html += '<p class="text-dim" style="font-size:0.85rem">Reaction: When an attacker you can see hits you, halve the damage. Uses your reaction for the round.</p>';
    html += '</div>';
  }

  // Evasion (level 7+)
  if (c.level >= 7) {
    html += '<div class="dash-section"><h2>Evasion</h2>';
    html += '<p class="text-dim" style="font-size:0.85rem">DEX saves: success = no damage. Failure = half damage. Doesn\'t work if incapacitated.</p>';
    html += '</div>';
  }

  // Reliable Talent (level 11+)
  if (c.level >= 11) {
    html += '<div class="dash-section" style="text-align:center;padding:12px">';
    html += '<div style="font-size:1.1rem;color:var(--accent);font-weight:bold">Reliable Talent</div>';
    html += '<div class="text-dim" style="font-size:0.85rem">Minimum d20 roll of 10 on proficient skill checks.</div>';
    html += '</div>';
  }

  // Blindsense (level 14+)
  if (c.level >= 14) {
    html += '<div class="dash-section"><h2>Blindsense</h2>';
    html += '<p class="text-dim" style="font-size:0.85rem">You know the location of any hidden or invisible creature within 10 feet, if you can hear.</p>';
    html += '</div>';
  }

  // Slippery Mind (level 15+)
  if (c.level >= 15) {
    html += '<div class="dash-section"><h2>Slippery Mind</h2>';
    html += '<p class="text-dim" style="font-size:0.85rem">Proficiency in Wisdom saving throws.</p>';
    html += '</div>';
  }

  // Elusive (level 18+)
  if (c.level >= 18) {
    html += '<div class="dash-section"><h2>Elusive</h2>';
    html += '<p class="text-dim" style="font-size:0.85rem">No attack roll has advantage against you while you aren\'t incapacitated.</p>';
    html += '</div>';
  }

  // Subclass feature cards (non-core features)
  var subFeats = ROGUE_SUBCLASS_FEATURES[sub];
  if (subFeats) {
    var shownFeats = [];
    Object.keys(subFeats).forEach(function(lvl) {
      if (c.level >= parseInt(lvl)) {
        subFeats[lvl].forEach(function(featName) {
          // Skip features already shown inline (Fast Hands, Supreme Sneak are in Cunning Action)
          if (featName === 'Fast Hands' || featName === 'Supreme Sneak') return;
          // Skip Spellcasting for AT (handled separately in Handoff 4)
          if (featName === 'Spellcasting') return;
          shownFeats.push(featName);
        });
      }
    });
    if (shownFeats.length > 0) {
      html += '<div class="dash-section"><h2>' + escapeHtml(sub) + ' Features</h2>';
      shownFeats.forEach(function(featName) {
        var desc = ROGUE_FEATURE_DESCRIPTIONS[featName] || '';
        // Assassinate gets a special prominent layout
        if (featName === 'Assassinate') {
          html += '<div class="cd-card expanded" style="border-color:var(--accent)">';
          html += '<div class="cd-card-body">';
          html += '<p style="font-weight:bold;margin-bottom:6px">ASSASSINATE</p>';
          html += '<p style="color:var(--success)">\u2713 Advantage vs creatures that haven\'t acted yet</p>';
          html += '<p style="color:var(--success)">\u2713 Auto-crit on surprised creatures</p>';
          html += '<p style="margin-top:8px;font-size:0.85rem;color:var(--text-dim)">Surprised target: weapon dice \u00d72 + sneak attack dice \u00d72</p>';
          html += '</div></div>';
        } else if (featName === 'Death Strike') {
          var dsDC = 8 + getEffectiveMod(c, 'dex') + c.proficiencyBonus;
          html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
          html += '<div class="cd-card-header"><span class="cd-name">Death Strike</span>';
          html += '<span class="cd-brief">CON save DC ' + dsDC + '</span>';
          html += '<span class="cd-expand">&#9654;</span></div>';
          html += '<div class="cd-card-body"><p>' + desc + '</p>';
          html += '<p style="margin-top:8px;color:var(--accent);font-weight:bold">Save DC: ' + dsDC + '</p>';
          html += '</div></div>';
        } else {
          html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
          html += '<div class="cd-card-header"><span class="cd-name">' + escapeHtml(featName) + '</span>';
          html += '<span class="cd-expand">&#9654;</span></div>';
          html += '<div class="cd-card-body"><p>' + desc + '</p></div></div>';
        }
      });
      html += '</div>';
    }
  }

  // Arcane Trickster spell section (level 3+)
  if (sub === 'Arcane Trickster' && c.level >= 3) {
    var atIntMod = getEffectiveMod(c, 'int');
    var atDC = 8 + c.proficiencyBonus + atIntMod;
    var atAtk = c.proficiencyBonus + atIntMod;
    html += '<div class="stat-grid" style="margin-bottom:16px">';
    html += '<div class="stat-card"><div class="stat-value">' + atDC + '</div><div class="stat-label">Spell Save DC</div></div>';
    html += '<div class="stat-card"><div class="stat-value">+' + atAtk + '</div><div class="stat-label">Spell Attack</div></div>';
    html += '</div>';

    // AT Spell Slots
    var atSlots = c.spellSlots || getThirdCasterSlots(c.level);
    if (atSlots && Object.keys(atSlots).length > 0) {
      html += '<div class="dash-section"><h2>Spell Slots</h2>';
      Object.entries(atSlots).forEach(function(entry) {
        var level = entry[0], count = entry[1];
        var used = (c.spellSlotsUsed && c.spellSlotsUsed[level]) || 0;
        html += '<div class="slot-row"><span class="slot-label">' + ordinal(parseInt(level)) + ' Level</span>';
        for (var si = 0; si < count; si++) {
          html += '<span class="slot-dot filled interactive' + (si < used ? ' spent' : '') + '" onclick="toggleSlot(' + level + ',' + si + ')"></span>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // AT Cantrips
    if (c.cantripsKnown && c.cantripsKnown.length > 0) {
      html += '<div class="dash-section"><h2>Cantrips</h2>';
      c.cantripsKnown.forEach(function(name) {
        var sp = getSpell(name);
        if (sp) html += renderSpellCard(sp, c);
        else html += '<span class="tag">' + escapeHtml(name) + '</span>';
      });
      html += '</div>';
    }

    // AT Known Spells
    if (c.spellsKnown && c.spellsKnown.length > 0) {
      html += '<div class="dash-section"><h2>Spells Known <span class="text-dim" style="font-size:0.85rem;font-weight:normal">(' + c.spellsKnown.length + ')</span></h2>';
      c.spellsKnown.forEach(function(name) {
        var sp = getSpell(name);
        if (sp) html += renderSpellCard(sp, c);
        else html += '<span class="tag">' + escapeHtml(name) + '</span>';
      });
      html += '</div>';
    }

    // Spell Thief (level 17+)
    if (c.level >= 17) {
      html += renderResourceTracker('Spell Thief', 'spellThief', 1, c, {
        icon: '&#10024;',
        description: 'Reaction: When targeted by a spell, make ability check (DC 10 + spell level). On success, negate the spell and learn it for 8 hours. 1 use per long rest.',
        restType: 'long rest'
      });
    }
  }

  // Stroke of Luck (level 20)
  if (c.level >= 20) {
    html += renderResourceTracker('Stroke of Luck', 'strokeOfLuck', 1, c, {
      icon: '&#9733;',
      description: 'Turn a missed attack into a hit, or treat an ability check as a 20. 1 use per short rest.',
      restType: 'short rest'
    });
  }

  return html;
}

/* ═══════════════════════════════════════════
   WIZARD DASHBOARD
   ═══════════════════════════════════════════ */

function renderWizardDashboard(c) {
  var html = '';
  var sub = c.subclass || '';
  var intMod = getEffectiveMod(c, 'int');

  // Arcane Recovery (level 1+)
  var arBudget = getArcaneRecoveryBudget(c.level);
  html += renderResourceTracker('Arcane Recovery', 'arcaneRecovery', 1, c, {
    icon: '&#9889;',
    description: 'During a short rest, recover up to ' + arBudget + ' levels of spell slots (no slot 6th+). 1 use per long rest.',
    restType: 'long rest'
  });
  html += '<div style="margin:-8px 0 16px 0"><button class="btn btn-secondary" onclick="showArcaneRecoveryModal()" style="font-size:0.85rem;padding:8px 16px">Use Arcane Recovery</button></div>';

  // Subclass features
  var subFeats = WIZARD_SUBCLASS_FEATURES[sub];
  if (subFeats) {
    // Divination: Portent (level 2+)
    if (sub === 'School of Divination' && c.level >= 2) {
      var portentDice = (c.resources && c.resources.portentDice) || [];
      var numDice = c.level >= 14 ? 3 : 2;
      html += '<div class="dash-section"><h2>Portent Dice</h2>';
      html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">';
      for (var pi = 0; pi < numDice; pi++) {
        var die = portentDice[pi];
        if (die && !die.used) {
          html += '<div style="display:flex;flex-direction:column;align-items:center">';
          html += '<div style="font-size:2rem;font-weight:bold;color:var(--accent);width:50px;height:50px;display:flex;align-items:center;justify-content:center;border:2px solid var(--accent);border-radius:var(--radius)">' + die.value + '</div>';
          html += '<button class="btn btn-secondary" onclick="usePortentDie(' + pi + ')" style="font-size:0.75rem;padding:4px 8px;margin-top:4px">Use</button>';
          html += '</div>';
        } else if (die && die.used) {
          html += '<div style="display:flex;flex-direction:column;align-items:center;opacity:0.3">';
          html += '<div style="font-size:2rem;font-weight:bold;width:50px;height:50px;display:flex;align-items:center;justify-content:center;border:2px solid var(--border);border-radius:var(--radius)">' + die.value + '</div>';
          html += '<span style="font-size:0.75rem;color:var(--text-dim)">Used</span></div>';
        } else {
          html += '<div style="font-size:2rem;width:50px;height:50px;display:flex;align-items:center;justify-content:center;border:2px dashed var(--border);border-radius:var(--radius);color:var(--text-dim)">?</div>';
        }
      }
      html += '</div>';
      html += '<button class="btn btn-secondary" onclick="rollPortentDice()" style="font-size:0.85rem;padding:6px 14px">Roll Portent Dice</button>';
      html += '<p class="text-dim" style="font-size:0.85rem;margin-top:8px">' + WIZARD_FEATURE_DESCRIPTIONS['Portent'] + '</p>';
      html += '</div>';
    }

    // Abjuration: Arcane Ward (level 2+)
    if (sub === 'School of Abjuration' && c.level >= 2) {
      var wardMax = c.level * 2 + intMod;
      var ward = (c.resources && c.resources.arcaneWard) || { current: 0, max: wardMax };
      html += '<div class="dash-section"><h2>Arcane Ward</h2>';
      html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">';
      html += '<div style="font-size:2rem;font-weight:bold;color:var(--accent)">' + ward.current + '</div>';
      html += '<div><div style="font-size:0.85rem;color:var(--text-dim)">of ' + wardMax + ' HP</div>';
      html += '<div style="background:var(--surface-raised);border-radius:4px;height:8px;margin-top:4px;overflow:hidden;width:120px"><div style="background:var(--accent);height:100%;width:' + (wardMax > 0 ? (ward.current / wardMax * 100) : 0) + '%;transition:width 0.3s"></div></div></div>';
      html += '<div style="display:flex;gap:4px">';
      html += '<button class="btn btn-secondary" onclick="adjustArcaneWard(-1)" style="padding:4px 10px">−</button>';
      html += '<button class="btn btn-secondary" onclick="adjustArcaneWard(1)" style="padding:4px 10px">+</button>';
      html += '</div></div>';
      html += '<p class="text-dim" style="font-size:0.85rem">' + WIZARD_FEATURE_DESCRIPTIONS['Arcane Ward'] + '</p>';
      html += '</div>';
    }

    // General subclass feature cards
    var shownFeats = [];
    Object.keys(subFeats).forEach(function(lvl) {
      if (c.level >= parseInt(lvl)) {
        subFeats[lvl].forEach(function(featName) {
          // Skip features with custom displays above
          if (featName === 'Portent' || featName === 'Greater Portent' || featName === 'Arcane Ward') return;
          shownFeats.push(featName);
        });
      }
    });
    if (shownFeats.length > 0) {
      html += '<div class="dash-section"><h2>' + escapeHtml(sub) + ' Features</h2>';
      shownFeats.forEach(function(featName) {
        var desc = WIZARD_FEATURE_DESCRIPTIONS[featName] || '';
        html += '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">';
        html += '<div class="cd-card-header"><span class="cd-name">' + escapeHtml(featName) + '</span>';
        html += '<span class="cd-expand">&#9654;</span></div>';
        html += '<div class="cd-card-body"><p>' + desc + '</p></div></div>';
      });
      html += '</div>';
    }
  }

  // Spell Mastery (level 18+)
  if (c.level >= 18 && c.spellMastery) {
    html += '<div class="dash-section"><h2>Spell Mastery <span class="badge">At Will</span></h2>';
    html += '<p class="text-dim" style="font-size:0.85rem;margin-bottom:8px">Cast at base level without expending a slot.</p>';
    if (c.spellMastery.firstLevel) {
      var sp1 = getSpell(c.spellMastery.firstLevel);
      if (sp1) html += renderSpellCard(sp1, c, { innateLabel: 'At Will (1st)' });
    }
    if (c.spellMastery.secondLevel) {
      var sp2 = getSpell(c.spellMastery.secondLevel);
      if (sp2) html += renderSpellCard(sp2, c, { innateLabel: 'At Will (2nd)' });
    }
    html += '</div>';
  }

  // Signature Spells (level 20)
  if (c.level >= 20 && c.signatureSpells && c.signatureSpells.length > 0) {
    html += '<div class="dash-section"><h2>Signature Spells <span class="badge">Always Prepared</span></h2>';
    html += '<p class="text-dim" style="font-size:0.85rem;margin-bottom:8px">Always prepared. One free cast each per short rest.</p>';
    c.signatureSpells.forEach(function(name) {
      var sigUsed = (c.resources && c.resources.signatureSpellUses && c.resources.signatureSpellUses[name]) || false;
      var sp = getSpell(name);
      if (sp) html += renderSpellCard(sp, c, { innateLabel: sigUsed ? 'Free cast used' : '1 Free Cast' });
    });
    html += '</div>';
  }

  return html;
}

function renderFightingStyleCard(style) {
  var data = FIGHTING_STYLES[style];
  if (!data) return '<div class="cd-card"><div class="cd-card-header"><span class="cd-name">' + escapeHtml(style) + '</span></div></div>';
  return '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">' +
    '<div class="cd-card-header"><span class="cd-name">' + escapeHtml(style) + '</span><span class="cd-expand">&#9654;</span></div>' +
    '<div class="cd-card-body"><p>' + data.effect + '</p></div></div>';
}

/* getWizardSpell eliminated — use getSpell() (unified spell database) */

function rollSecondWind() {
  var c = loadCharacter();
  if (!c) return;
  // Check if Second Wind is available
  if (c.resources && c.resources.secondWind && c.resources.secondWind.used >= 1) {
    alert('Second Wind already used. Take a short rest to restore it.');
    return;
  }
  var dieRoll = rollDie(10);
  var total = dieRoll + c.level;
  showModal(
    '<h3>Second Wind</h3>' +
    '<p style="font-size:1.2rem;text-align:center;margin:16px 0"><strong>1d10:</strong> ' + dieRoll + ' + <strong>' + c.level + '</strong> (level) = <span style="color:var(--success);font-size:1.4rem;font-weight:bold">' + total + ' HP</span></p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="applySecondWind(' + total + ')">Heal ' + total + ' HP</button></div>'
  );
}

function applySecondWind(amount) {
  var c = loadCharacter();
  if (!c) return;
  c.currentHp = Math.min((c.currentHp || 0) + amount, getEffectiveMaxHp(c));
  // Mark Second Wind as used
  if (!c.resources) c.resources = {};
  if (!c.resources.secondWind) c.resources.secondWind = { used: 0, max: 1 };
  c.resources.secondWind.used = 1;
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

