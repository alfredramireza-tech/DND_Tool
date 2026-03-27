// dashboard.js — Main dashboard rendering, fighter dashboard, edit/reset
/* ═══════════════════════════════════════════
   DASHBOARD RENDERING
   ═══════════════════════════════════════════ */

function getShortRestDescription(cls, sub) {
  if (cls === 'Cleric') return 'Restores Channel Divinity';
  if (cls === 'Fighter') {
    var parts = ['Second Wind', 'Action Surge'];
    if (sub === 'Battle Master') parts.push('Superiority Dice');
    return 'Restores ' + parts.join(', ');
  }
  return 'Recover hit dice, some abilities';
}

function renderDashboard(c, preserveScroll) {
  var container = document.getElementById('dashboard-content');
  var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  var isCaster = cd.isCaster;
  var spellDC = isCaster ? 8 + c.proficiencyBonus + mod(c.abilityScores[cd.spellcastingAbility]) : 0;
  var spellAtk = isCaster ? c.proficiencyBonus + mod(c.abilityScores[cd.spellcastingAbility]) : 0;
  var ac = (c.equippedItems && c.equippedItems.length > 0) ? calculateAC(c) : c.ac;
  var effectiveMax = getEffectiveMaxHp(c);
  var currentHp = c.currentHp !== undefined ? c.currentHp : effectiveMax;
  var tempHp = c.tempHp || 0;

  var html = '';

  // Combat mode bar
  html += '<div class="combat-mode-bar"></div>';

  // Header
  html += '<div class="dash-header">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">';
  html += '<h1 style="margin:0">' + escapeHtml(c.name) + '</h1>';
  html += '<div style="display:flex;align-items:center;gap:8px">';
  html += '<div class="init-roller"><button class="init-btn" onclick="rollInitiative()">&#127922; Initiative</button>';
  html += '<span class="init-result" id="init-display">' + (lastInitiative !== null ? 'Initiative: ' + lastInitiative : '') + '</span></div>';
  html += '<button class="combat-mode-btn' + (combatModeOn ? ' active' : '') + '" id="combat-mode-btn" onclick="toggleCombatMode()">&#9876; Combat</button>';
  html += '</div></div>';
  var raceDisplay = c.subrace ? c.subrace + ' ' + c.race : c.race;
  html += '<div class="dash-subtitle">' + raceDisplay + ' ' + c.class + (c.subclass ? ' (' + c.subclass + ')' : '') + ' — Level ' + c.level + '</div>';
  html += '<div class="text-dim" style="font-size:0.85rem;margin-top:4px">' + escapeHtml(c.background) + ' · ' + c.alignment + '</div>';
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
  html += '</div></div>';

  // Right column: Quick Action
  html += renderQuickAction(c);

  html += '</div>'; // end hud-columns

  // Resource strip
  html += renderResourceStrip(c);

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

  // Dice & Rolls (directly below HP for combat use)
  html += renderDiceRollers(c);

  // Compute AC buff annotation (from externalBuffs only)
  var acBuff = 0;
  if (c.externalBuffs) {
    c.externalBuffs.forEach(function(buff) { (buff.effects || []).forEach(function(eff) { if (eff.type === 'acBonus') acBuff += eff.value; }); });
  }
  var acNote = acBuff > 0 ? ' <span style="font-size:0.7rem;color:var(--accent)">(+' + acBuff + ')</span>' : '';

  // Stat cards
  html += '<div class="stat-grid">';
  html += '<div class="stat-card"><div class="stat-value">' + ac + acNote + '</div><div class="stat-label">Armor Class</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + c.speed + ' ft</div><div class="stat-label">Speed</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + (c.initiative >= 0 ? '+' : '') + c.initiative + '</div><div class="stat-label">Initiative</div></div>';
  html += '<div class="stat-card"><div class="stat-value">+' + c.proficiencyBonus + '</div><div class="stat-label">Prof. Bonus</div></div>';
  if (isCaster) {
    html += '<div class="stat-card"><div class="stat-value">' + spellDC + '</div><div class="stat-label">Spell Save DC</div></div>';
    html += '<div class="stat-card"><div class="stat-value">+' + spellAtk + '</div><div class="stat-label">Spell Attack</div></div>';
  }
  html += '</div>';

  // Channel Divinity Tracker (Cleric only)
  if (c.class === 'Cleric') {
    var cdMax = c.channelDivinityUses || 1;
    var cdUsed = c.channelDivinityUsed || 0;
    html += '<div class="dash-section"><h2>Channel Divinity <span class="text-dim" style="font-size:0.85rem;font-weight:normal">(' + cdMax + '/rest)</span></h2>';
    html += '<div class="cd-tracker"><div class="cd-uses">';
    for (var cdi = 0; cdi < cdMax; cdi++) {
      html += '<div class="cd-icon' + (cdi < cdUsed ? ' spent' : '') + '" onclick="toggleCD(' + cdi + ')">&#9889;</div>';
    }
    html += '</div></div>';

    // Channel Divinity description cards
    html += '<div class="cd-cards">';
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
    html += '</div></div>';
  }

  // Fighter class features
  if (c.class === 'Fighter') {
    html += renderFighterDashboard(c);
  }

  // "Coming Soon" placeholder for classes without full implementation
  if (c.class !== 'Cleric' && c.class !== 'Fighter') {
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
        var chaSaveDC = 8 + c.proficiencyBonus + mod(c.abilityScores.cha);
        transDesc = transDesc.replace('a CHA save', 'a CHA save (DC ' + chaSaveDC + ')');
      }
      html += renderResourceTracker(trans.name, 'aasTransform', 1, c, {
        icon: '&#10024;',
        description: transDesc,
        restType: 'long rest'
      });
    }
  }

  // Spell Slots (casters only)
  if (isCaster && c.spellSlots && Object.keys(c.spellSlots).length > 0) {
    var slotEntries = Object.entries(c.spellSlots);
    html += '<div class="dash-section"><h2>Spell Slots</h2>';
    slotEntries.forEach(function(entry) {
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

  // Rest Section (collapsible)
  html += '<div class="rest-section" id="rest-section">';
  html += '<div class="rest-header" onclick="toggleRestSection()">';
  html += '<h2>Rest</h2><span class="rest-toggle">options</span></div>';
  html += '<div class="rest-body"><div class="rest-buttons">';
  html += '<button class="rest-btn" onclick="confirmShortRest()">Short Rest<span class="rest-label">' + getShortRestDescription(c.class, c.subclass) + '</span></button>';
  html += '<button class="rest-btn" onclick="confirmLongRest()">Long Rest<span class="rest-label">Restores everything</span></button>';
  html += '</div></div></div>';

  // Ability Scores — collapsible, default open
  html += '<div class="dash-section combat-hide"><details open><summary><h2 style="display:inline">Ability Scores</h2></summary><div class="ability-row-dash">';
  ABILITIES.forEach(function(ab) {
    html += '<div class="ability-card"><div class="ab-name">' + ABILITY_NAMES[ab] + '</div>';
    html += '<div class="ab-mod">' + modStr(c.abilityScores[ab]) + '</div>';
    html += '<div class="ab-score">' + c.abilityScores[ab] + '</div></div>';
  });
  html += '</div></details></div>';

  // Proficiencies
  html += '<div class="dash-section"><h2>Proficiencies</h2>';
  html += '<div style="margin-bottom:8px"><span class="text-dim" style="font-size:0.85rem">Saving Throws: </span>';
  (c.savingThrows || []).forEach(function(st) {
    var bonus = mod(c.abilityScores[st]) + c.proficiencyBonus;
    html += '<span class="tag accent">' + ABILITY_NAMES[st] + ' +' + bonus + '</span> ';
  });
  html += '</div><div><span class="text-dim" style="font-size:0.85rem">Skills: </span>';
  (c.skillProficiencies || []).forEach(function(sk) {
    var skill = SKILLS.find(function(s) { return s.name.toLowerCase() === sk.toLowerCase(); });
    if (!skill) { html += '<span class="tag">' + sk + '</span> '; return; }
    var isExpertise = c.expertiseSkills && c.expertiseSkills.indexOf(sk.toLowerCase()) >= 0;
    var bonus = mod(c.abilityScores[skill.ability]) + c.proficiencyBonus * (isExpertise ? 2 : 1);
    html += '<span class="tag accent">' + skill.name + ' +' + bonus + (isExpertise ? ' (E)' : '') + '</span> ';
  });
  html += '</div></div>';

  // Cantrips — compact chips with tap-to-expand
  var displayCantrips = (c.cantripsKnown || []).slice();
  var hasInnateLight = c.race === 'Aasimar' && displayCantrips.indexOf('Light') < 0;
  if (hasInnateLight) displayCantrips.push('Light');
  if (displayCantrips.length > 0) {
    html += '<div class="dash-section"><h2>Cantrips</h2>';
    html += '<div class="cantrip-chips">';
    displayCantrips.forEach(function(name, ci) {
      var isInnate = (name === 'Light' && hasInnateLight) || (name === 'Light' && c.race === 'Aasimar');
      html += '<span class="cantrip-chip" onclick="toggleCantripDetail(' + ci + ')">' + escapeHtml(name) + (isInnate ? ' (R)' : '') + '</span>';
    });
    html += '</div>';
    html += '<div id="cantrip-detail-area"></div>';
    html += '</div>';
  }

  // Domain Spells (Cleric only) — collapsible
  if (c.class === 'Cleric') {
    var domainList = getDomainSpellList(c.level);
    html += '<div class="dash-section"><details><summary><h2 style="display:inline">Domain Spells <span class="badge">Always Prepared</span></h2> <span class="text-dim" style="font-size:0.85rem">(' + domainList.length + ')</span></summary>';
    domainList.forEach(function(name) {
      var sp = getSpell(name);
      if (sp) html += renderSpellCard(sp, c, { domain: true });
      else html += '<span class="tag accent">' + escapeHtml(name) + '</span>';
    });
    html += '</details></div>';
  }

  // Prepared Spells (Cleric only) — collapsible
  if (c.class === 'Cleric') {
    html += '<div class="dash-section"><details><summary><h2 style="display:inline">Prepared Spells</h2> <span class="text-dim" style="font-size:0.85rem">(' + (c.currentPreparedSpells || []).length + '/' + c.preparedSpellCount + ')</span></summary>';
    if (c.currentPreparedSpells && c.currentPreparedSpells.length > 0) {
      c.currentPreparedSpells.forEach(function(name) {
        var sp = getSpell(name);
        if (sp) html += renderSpellCard(sp, c);
        else html += '<span class="tag">' + escapeHtml(name) + '</span>';
      });
    } else {
      html += '<p class="text-dim">No prepared spells selected</p>';
    }
    html += '</details></div>';
  }

  // Weapons (from weapons array — single source of truth)
  html += '<div class="dash-section"><h2>Weapons <button class="inline-edit-btn" onclick="showWeaponForm(-1)">+ Add</button></h2>';
  html += '<div id="weapon-form-area"></div>';
  if (c.weapons && c.weapons.length > 0) {
    c.weapons.forEach(function(w, wi) {
      var abilMod = mod(c.abilityScores[w.ability] || 10);
      var profB = w.proficient ? c.proficiencyBonus : 0;
      var magB = w.magicBonus || 0;
      var atkTotal = abilMod + profB + magB;
      var dmgTotal = abilMod + magB;
      html += '<div class="equip-item"><div class="ei-info">';
      html += '<div class="ei-name">' + escapeHtml(w.name) + (magB ? ' <span class="text-accent" style="font-size:0.8rem">+' + magB + '</span>' : '') + '</div>';
      html += '<div class="ei-detail">+' + atkTotal + ' to hit · ' + w.damage + (dmgTotal >= 0 ? '+' : '') + dmgTotal + ' ' + w.damageType + (w.notes ? ' · ' + w.notes : '') + '</div>';
      html += '</div><div class="ei-actions">';
      html += '<button class="ei-btn" onclick="showWeaponForm(' + wi + ')">Edit</button>';
      html += '<button class="ei-btn" onclick="confirmDeleteWeapon(' + wi + ')" style="color:var(--error)">×</button>';
      html += '</div></div>';
    });
  } else {
    html += '<p class="text-dim">No weapons</p>';
  }
  html += '</div>';

  // Equipment (equipped + inventory)
  html += '<div class="dash-section combat-hide"><h2>Equipped Gear <button class="inline-edit-btn" onclick="showEquipForm(-1)">+ Add</button></h2>';
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

  // Quick Items
  html += '<h3 class="mt-16" style="font-size:0.95rem">Quick Items</h3>';
  html += '<div class="quick-add">';
  html += '<input type="text" id="quick-item-input" placeholder="Add item..." onclick="event.stopPropagation()" onkeydown="if(event.key===\'Enter\')addQuickItem()">';
  html += '<button class="btn btn-secondary" onclick="addQuickItem()" style="padding:8px 16px">Add</button></div>';
  html += '<div id="quick-items-list">';
  (c.quickItems || []).forEach(function(item, idx) {
    html += '<span class="quick-item">' + escapeHtml(item) + '<button class="qi-remove" onclick="removeQuickItem(' + idx + ')">×</button></span>';
  });
  html += '</div>';

  // Bulk Gear
  html += '<h3 class="mt-16" style="font-size:0.95rem">Inventory <button class="inline-edit-btn" onclick="toggleBulkGearEdit()">Edit</button></h3>';
  html += '<div id="bulk-gear-area">';
  if (c.bulkGear) html += '<div class="dash-text">' + escapeHtml(c.bulkGear) + '</div>';
  else html += '<p class="text-dim">No inventory items</p>';
  html += '</div></div>';

  // Currency
  html += '<div class="combat-hide">';
  var cur = c.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  html += '<div class="dash-section"><h2>Currency</h2>';
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
  html += '<div class="currency-total">≈ ' + gpEquiv.toFixed(1) + ' GP total</div></div>';
  html += '</div>'; // end combat-hide for currency

  // Notes (inline edit)
  html += '<div class="dash-section combat-hide"><h2>Notes <button class="inline-edit-btn" onclick="toggleNotesEdit()">Edit</button></h2>';
  html += '<div id="notes-area">';
  if (c.notes) html += '<div class="dash-text">' + escapeHtml(c.notes) + '</div>';
  else html += '<p class="text-dim">No notes</p>';
  html += '</div></div>';

  // Session Journal
  html += renderJournal(c);

  // Features
  html += '<div class="dash-section combat-hide"><h2>Features &amp; Traits</h2>';
  if (c.features && c.features.length > 0) {
    html += '<ul class="feature-list">';
    c.features.forEach(function(f) { html += '<li>' + f + '</li>'; });
    html += '</ul>';
  } else {
    html += '<p class="text-dim">No features yet</p>';
  }
  html += '<div class="text-dim mt-8" style="font-size:0.85rem">Hit Dice: ' + c.hp.hitDiceCount + 'd' + c.hp.hitDiceType + '</div></div>';

  // Session Log
  html += renderSessionLog(c);

  // Quick Rules Reference
  html += renderQuickRules();

  // Actions — 2-column grid
  html += '<div class="dash-actions-grid combat-hide">';
  if (c.class !== 'Cleric' && c.class !== 'Fighter') {
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
    chars = chars.filter(function(ch) { return ch.id !== activeCharId; });
    saveAllCharacters(chars);
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
    var survivorHeal = 5 + mod(c.abilityScores.con);
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
    var ekDC = 8 + c.proficiencyBonus + mod(c.abilityScores.int);
    var ekAtk = c.proficiencyBonus + mod(c.abilityScores.int);
    html += '<div class="stat-grid" style="margin-bottom:16px">';
    html += '<div class="stat-card"><div class="stat-value">' + ekDC + '</div><div class="stat-label">Spell Save DC</div></div>';
    html += '<div class="stat-card"><div class="stat-value">+' + ekAtk + '</div><div class="stat-label">Spell Attack</div></div>';
    html += '</div>';

    // EK Spell Slots
    var ekSlots = c.ekSpellSlots || getEkSpellSlots(c.level);
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
        var sp = getWizardSpell(name) || getSpell(name);
        if (sp) html += renderSpellCard(sp, c);
        else html += '<span class="tag">' + escapeHtml(name) + '</span>';
      });
      html += '</div>';
    }

    // EK Known Spells
    if (c.ekSpellsKnown && c.ekSpellsKnown.length > 0) {
      html += '<div class="dash-section"><h2>Spells Known <span class="text-dim" style="font-size:0.85rem;font-weight:normal">(' + c.ekSpellsKnown.length + ')</span></h2>';
      c.ekSpellsKnown.forEach(function(name) {
        var sp = getWizardSpell(name) || getSpell(name);
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

function renderFightingStyleCard(style) {
  var data = FIGHTING_STYLES[style];
  if (!data) return '<div class="cd-card"><div class="cd-card-header"><span class="cd-name">' + escapeHtml(style) + '</span></div></div>';
  return '<div class="cd-card" onclick="this.classList.toggle(\'expanded\')">' +
    '<div class="cd-card-header"><span class="cd-name">' + escapeHtml(style) + '</span><span class="cd-expand">&#9654;</span></div>' +
    '<div class="cd-card-body"><p>' + data.effect + '</p></div></div>';
}

function getWizardSpell(name) {
  return WIZARD_SPELL_DB.find(function(s) { return s.name === name; }) ||
         WIZARD_CANTRIPS.find(function(s) { return s.name === name; });
}

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
  showDashboard(c);
}

