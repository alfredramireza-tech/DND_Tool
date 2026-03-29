// resources.js — HP tracker, spell slots, channel divinity, rest system, currency, equipment, weapons, inline editing
/* ═══════════════════════════════════════════
   HP TRACKER
   ═══════════════════════════════════════════ */

function showMaxHpBoostPrompt() {
  var c = loadCharacter();
  if (!c) return;
  var current = c.maxHpBoost && c.maxHpBoost.value > 0 ? c.maxHpBoost : null;
  var html = '<h3>Max HP Boost</h3>';
  if (current) {
    html += '<p class="text-dim" style="font-size:0.85rem">Current: +' + current.value + (current.source ? ' (' + escapeHtml(current.source) + ')' : '') + '</p>';
    html += '<p class="text-dim" style="font-size:0.8rem">A new boost will replace the current one.</p>';
  }
  html += '<div style="text-align:left;margin-bottom:12px">';
  html += '<label style="font-size:0.8rem;color:var(--text-dim)">Amount</label>';
  html += '<input type="number" id="boost-amount" min="1" placeholder="e.g., 5" onclick="event.stopPropagation()" style="width:100%;box-sizing:border-box;margin-bottom:8px">';
  html += '<label style="font-size:0.8rem;color:var(--text-dim)">Source (optional)</label>';
  html += '<input type="text" id="boost-source" placeholder="e.g., Aid, Heroes\' Feast" onclick="event.stopPropagation()" style="width:100%;box-sizing:border-box">';
  html += '</div>';
  html += '<div class="confirm-actions">';
  html += '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="applyMaxHpBoost()">Apply</button></div>';
  showModal(html);
  setTimeout(function() { var el = document.getElementById('boost-amount'); if (el) el.focus(); }, 100);
}

function applyMaxHpBoost() {
  var amount = parseInt(document.getElementById('boost-amount').value) || 0;
  if (amount <= 0) return;
  var source = (document.getElementById('boost-source').value || '').trim();
  var c = loadCharacter();
  if (!c) return;
  var oldMax = getEffectiveMaxHp(c);
  c.maxHpBoost = { value: amount, source: source };
  // Aid also raises current HP by the boost amount
  c.currentHp = (c.currentHp || 0) + amount;
  var newMax = getEffectiveMaxHp(c);
  logEvent('Max HP boosted by ' + amount + (source ? ' (' + source + ')' : '') + ' \u2014 HP max ' + oldMax + ' \u2192 ' + newMax, c);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function removeMaxHpBoost() {
  var c = loadCharacter();
  if (!c || !c.maxHpBoost || c.maxHpBoost.value <= 0) return;
  var oldMax = getEffectiveMaxHp(c);
  var source = c.maxHpBoost.source;
  c.maxHpBoost = { value: 0, source: '' };
  // Cap current HP at base max
  if (c.currentHp > c.hp.max) c.currentHp = c.hp.max;
  var newMax = c.hp.max;
  logEvent('Max HP boost removed' + (source ? ' (' + source + ')' : '') + ' \u2014 HP max ' + oldMax + ' \u2192 ' + newMax, c);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function showHpInput(mode) {
  var title = mode === 'damage' ? 'Take Damage' : mode === 'heal' ? 'Heal' : 'Set Temp HP';
  var btnClass = mode === 'damage' ? 'btn-danger' : 'btn-primary';
  showModal(
    '<h3>' + title + '</h3>' +
    '<input type="number" id="hp-input-val" min="0" onclick="event.stopPropagation()" ' +
    'onkeydown="if(event.key===\'Enter\')applyHpChange(\'' + mode + '\')">' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn ' + btnClass + '" onclick="applyHpChange(\'' + mode + '\')">Apply</button></div>'
  );
  setTimeout(function() { var el = document.getElementById('hp-input-val'); if (el) el.focus(); }, 100);
}

function applyHpChange(mode) {
  var val = parseInt(document.getElementById('hp-input-val').value) || 0;
  if (val <= 0) { closeModal(); return; }
  var c = loadCharacter();
  if (!c) return;
  var effMax = getEffectiveMaxHp(c);
  if (c.currentHp === undefined) c.currentHp = effMax;
  if (c.tempHp === undefined) c.tempHp = 0;
  var oldHp = c.currentHp;
  if (mode === 'damage') {
    var actualDmg = val;
    if (c.tempHp > 0) {
      if (val <= c.tempHp) { c.tempHp -= val; actualDmg = 0; val = 0; }
      else { actualDmg = val - c.tempHp; val -= c.tempHp; c.tempHp = 0; }
    }
    c.currentHp = Math.max(0, c.currentHp - val);
    logEvent('Took ' + actualDmg + ' damage \u2014 HP ' + oldHp + '\u2192' + c.currentHp, c);
    // Death save failure if at 0 HP and took damage while already at 0
    if (oldHp === 0 && c.currentHp === 0 && val > 0) {
      if (!c.deathSaves) c.deathSaves = { successes: 0, failures: 0 };
      c.deathSaves.failures = Math.min(3, c.deathSaves.failures + 1);
      logEvent('Damage at 0 HP: +1 death save failure', c);
    }
    // Concentration save prompt
    if (c.concentration && c.concentration.active && actualDmg > 0) {
      var concDC = Math.max(10, Math.floor(actualDmg / 2));
      var conBonus = getEffectiveMod(c, 'con') + (c.savingThrows.indexOf('con') >= 0 ? c.proficiencyBonus : 0) + getEquipSaveBonus(c, 'con');
      saveCurrentCharacter(c);
      closeModal();
      showModal(
        '<h3>Concentration Check</h3>' +
        '<p>You took ' + actualDmg + ' damage while concentrating on <strong>' + escapeHtml(c.concentration.spellName) + '</strong>.</p>' +
        '<p>CON save DC <strong>' + concDC + '</strong> (your bonus: +' + conBonus + ')</p>' +
        '<div class="confirm-actions">' +
        '<button class="btn btn-primary" onclick="closeModal();doAbilityRoll(\'con\',' + (c.savingThrows.indexOf('con') >= 0) + ')">Roll CON Save</button>' +
        '<button class="btn btn-secondary" onclick="closeModal();dropConcentration()">Failed \u2014 Drop</button>' +
        '<button class="btn btn-secondary" onclick="closeModal()">Maintained</button></div>'
      );
      showDashboard(c, true);
      return;
    }
  } else if (mode === 'heal') {
    c.currentHp = Math.min(effMax, c.currentHp + val);
    logEvent('Healed ' + val + ' HP \u2014 HP ' + oldHp + '\u2192' + c.currentHp, c);
    // Clear death saves when healed above 0
    if (oldHp === 0 && c.currentHp > 0) {
      clearDeathSaves(c);
    }
  } else if (mode === 'temp') {
    c.tempHp = val;
    logEvent('Set temp HP to ' + val, c);
  }
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   SPELL SLOT TRACKER
   ═══════════════════════════════════════════ */

function toggleSlot(level, idx) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.spellSlotsUsed) c.spellSlotsUsed = {};
  var used = c.spellSlotsUsed[level] || 0;
  if (idx < used) c.spellSlotsUsed[level] = idx;
  else c.spellSlotsUsed[level] = idx + 1;
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   CHANNEL DIVINITY TRACKER
   ═══════════════════════════════════════════ */

function toggleCD(idx) {
  var c = loadCharacter();
  if (!c) return;
  var used = c.channelDivinityUsed || 0;
  if (idx < used) c.channelDivinityUsed = idx;
  else c.channelDivinityUsed = idx + 1;
  var cdMax = c.channelDivinityUses || 1;
  var remaining = cdMax - c.channelDivinityUsed;
  logEvent('Channel Divinity: ' + remaining + '/' + cdMax + ' remaining', c);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   REUSABLE RESOURCE TRACKER
   ═══════════════════════════════════════════ */

function renderResourceTracker(name, resourceKey, max, char, options) {
  options = options || {};
  var icon = options.icon || '&#9889;';
  var restType = options.restType || 'rest';
  var used = (char.resources && char.resources[resourceKey]) ? (char.resources[resourceKey].used || 0) : 0;
  var html = '<div class="dash-section"><h2>' + escapeHtml(name) + ' <span class="text-dim" style="font-size:0.85rem;font-weight:normal">(' + max + '/' + restType + ')</span></h2>';
  html += '<div class="cd-tracker"><div class="cd-uses">';
  for (var i = 0; i < max; i++) {
    html += '<div class="cd-icon' + (i < used ? ' spent' : '') + '" onclick="toggleResource(\'' + resourceKey + '\',' + i + ',' + max + ')">' + icon + '</div>';
  }
  html += '</div></div>';
  if (options.description) {
    html += '<p class="text-dim" style="font-size:0.85rem;margin-top:8px">' + options.description + '</p>';
  }
  html += '</div>';
  return html;
}

function toggleResource(resourceKey, idx, max) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.resources) c.resources = {};
  if (!c.resources[resourceKey]) c.resources[resourceKey] = { used: 0, max: max };
  var used = c.resources[resourceKey].used || 0;
  if (idx < used) c.resources[resourceKey].used = idx;
  else c.resources[resourceKey].used = idx + 1;
  var remaining = max - c.resources[resourceKey].used;
  var displayName = resourceKey.replace(/([A-Z])/g, ' $1').replace(/^./, function(s) { return s.toUpperCase(); });
  logEvent('Used ' + displayName + ' (' + remaining + '/' + max + ' remaining)', c);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   REST BUTTONS
   ═══════════════════════════════════════════ */

function toggleRestSection() {
  document.getElementById('rest-section').classList.toggle('open');
}

/* ═══════════════════════════════════════════
   LAY ON HANDS (Paladin)
   ═══════════════════════════════════════════ */

function showLayOnHandsPrompt() {
  var c = loadCharacter();
  if (!c) return;
  var lohMax = 5 * c.level;
  var lohUsed = (c.resources && c.resources.layOnHands) ? (c.resources.layOnHands.used || 0) : 0;
  var lohRemaining = Math.max(0, lohMax - lohUsed);
  if (lohRemaining <= 0) {
    showModal('<h3>Lay on Hands</h3><p>No points remaining. Take a long rest to restore your pool.</p>' +
      '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">OK</button></div>');
    return;
  }
  var html = '<h3>Lay on Hands</h3>';
  html += '<p class="text-dim" style="font-size:0.85rem">Pool: ' + lohRemaining + ' / ' + lohMax + ' HP remaining</p>';
  html += '<div style="text-align:left;margin-bottom:12px">';
  html += '<label style="font-size:0.8rem;color:var(--text-dim)">HP to restore</label>';
  html += '<input type="number" id="loh-amount" min="1" max="' + lohRemaining + '" placeholder="Amount" onclick="event.stopPropagation()" onkeydown="if(event.key===\'Enter\')useLayOnHands()" style="width:100%;box-sizing:border-box;margin-bottom:8px">';
  html += '</div>';
  html += '<div class="confirm-actions" style="flex-wrap:wrap;gap:8px">';
  if (lohRemaining >= 5) {
    html += '<button class="btn btn-secondary" onclick="useLayOnHandsCure()" style="font-size:0.85rem">Cure Disease/Poison (5 pts)</button>';
  }
  html += '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="useLayOnHands()">Heal</button></div>';
  showModal(html);
  setTimeout(function() { var el = document.getElementById('loh-amount'); if (el) el.focus(); }, 100);
}

function useLayOnHands() {
  var amountEl = document.getElementById('loh-amount');
  var amount = parseInt(amountEl ? amountEl.value : 0) || 0;
  if (amount <= 0) return;
  var c = loadCharacter();
  if (!c) return;
  var lohMax = 5 * c.level;
  if (!c.resources) c.resources = {};
  if (!c.resources.layOnHands) c.resources.layOnHands = { used: 0, max: lohMax };
  var lohUsed = c.resources.layOnHands.used || 0;
  var lohRemaining = Math.max(0, lohMax - lohUsed);
  if (amount > lohRemaining) amount = lohRemaining;
  c.resources.layOnHands.used = lohUsed + amount;
  logEvent('Lay on Hands: healed ' + amount + ' HP (' + (lohRemaining - amount) + '/' + lohMax + ' remaining)', c);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function useLayOnHandsCure() {
  var c = loadCharacter();
  if (!c) return;
  var lohMax = 5 * c.level;
  if (!c.resources) c.resources = {};
  if (!c.resources.layOnHands) c.resources.layOnHands = { used: 0, max: lohMax };
  var lohUsed = c.resources.layOnHands.used || 0;
  var lohRemaining = Math.max(0, lohMax - lohUsed);
  if (lohRemaining < 5) {
    showModal('<h3>Not Enough Points</h3><p>Curing a disease or poison costs 5 points. You have ' + lohRemaining + ' remaining.</p>' +
      '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">OK</button></div>');
    return;
  }
  c.resources.layOnHands.used = lohUsed + 5;
  logEvent('Lay on Hands: cured disease/poison (' + (lohRemaining - 5) + '/' + lohMax + ' remaining)', c);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   WIZARD FEATURES
   ═══════════════════════════════════════════ */

function showArcaneRecoveryModal() {
  var c = loadCharacter();
  if (!c) return;
  if (c.resources && c.resources.arcaneRecovery && c.resources.arcaneRecovery.used >= 1) {
    showModal('<h3>Arcane Recovery</h3><p>Already used today. Take a long rest to restore.</p><div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">OK</button></div>');
    return;
  }
  var budget = getArcaneRecoveryBudget(c.level);
  var html = '<h3>Arcane Recovery</h3>';
  html += '<p class="text-dim" style="font-size:0.85rem">Budget: recover up to <strong>' + budget + '</strong> levels of spell slots. No 6th level or higher.</p>';
  html += '<div id="ar-selections" style="margin:12px 0"></div>';
  html += '<div id="ar-total" style="font-size:1.1rem;color:var(--accent);margin:8px 0;text-align:center">0 / ' + budget + ' levels selected</div>';
  html += '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn btn-primary" id="ar-confirm-btn" onclick="confirmArcaneRecovery()">Recover</button></div>';
  showModal(html);
  // Build slot buttons
  var selDiv = document.getElementById('ar-selections');
  var selHtml = '';
  for (var lvl = 1; lvl <= 5; lvl++) {
    var total = (c.spellSlots && c.spellSlots[lvl]) || 0;
    var used = (c.spellSlotsUsed && c.spellSlotsUsed[lvl]) || 0;
    if (used > 0) {
      selHtml += '<button class="btn btn-secondary ar-slot-btn" data-level="' + lvl + '" data-cost="' + lvl + '" onclick="toggleArSlot(this,' + budget + ')" style="margin:4px;padding:8px 16px">+' + ordinal(lvl) + ' (' + used + ' spent)</button>';
    }
  }
  if (!selHtml) selHtml = '<p class="text-dim">No spell slots are currently spent (levels 1-5).</p>';
  selDiv.innerHTML = selHtml;
}

function toggleArSlot(btn, budget) {
  btn.classList.toggle('selected');
  btn.style.background = btn.classList.contains('selected') ? 'var(--accent)' : '';
  btn.style.color = btn.classList.contains('selected') ? 'var(--bg)' : '';
  // Recalculate total
  var total = 0;
  document.querySelectorAll('.ar-slot-btn.selected').forEach(function(b) { total += parseInt(b.dataset.cost); });
  document.getElementById('ar-total').textContent = total + ' / ' + budget + ' levels selected';
  // Disable if over budget
  if (total > budget) {
    btn.classList.remove('selected');
    btn.style.background = '';
    btn.style.color = '';
    total -= parseInt(btn.dataset.cost);
    document.getElementById('ar-total').textContent = total + ' / ' + budget + ' levels selected';
  }
}

function confirmArcaneRecovery() {
  var c = loadCharacter();
  if (!c) return;
  var recovered = [];
  document.querySelectorAll('.ar-slot-btn.selected').forEach(function(btn) {
    var lvl = parseInt(btn.dataset.level);
    recovered.push(lvl);
    if (!c.spellSlotsUsed) c.spellSlotsUsed = {};
    c.spellSlotsUsed[lvl] = Math.max(0, (c.spellSlotsUsed[lvl] || 0) - 1);
  });
  if (recovered.length === 0) { closeModal(); return; }
  if (!c.resources) c.resources = {};
  if (!c.resources.arcaneRecovery) c.resources.arcaneRecovery = { used: 0, max: 1 };
  c.resources.arcaneRecovery.used = 1;
  logEvent('Arcane Recovery: restored ' + recovered.map(function(l) { return ordinal(l) + '-level'; }).join(', '), c);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function rollPortentDice() {
  var c = loadCharacter();
  if (!c) return;
  var numDice = c.level >= 14 ? 3 : 2;
  var dice = [];
  for (var i = 0; i < numDice; i++) {
    dice.push({ value: Math.floor(Math.random() * 20) + 1, used: false });
  }
  if (!c.resources) c.resources = {};
  c.resources.portentDice = dice;
  var values = dice.map(function(d) { return d.value; }).join(', ');
  logEvent('Portent Dice rolled: ' + values, c);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function usePortentDie(idx) {
  var c = loadCharacter();
  if (!c || !c.resources || !c.resources.portentDice || !c.resources.portentDice[idx]) return;
  c.resources.portentDice[idx].used = true;
  logEvent('Used Portent Die: ' + c.resources.portentDice[idx].value, c);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function adjustArcaneWard(delta) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.resources) c.resources = {};
  var intMod = getEffectiveMod(c, 'int');
  var wardMax = c.level * 2 + intMod;
  if (!c.resources.arcaneWard) c.resources.arcaneWard = { current: 0, max: wardMax };
  c.resources.arcaneWard.max = wardMax;
  c.resources.arcaneWard.current = Math.max(0, Math.min(wardMax, c.resources.arcaneWard.current + delta));
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function showChangePreparedWizard() {
  var c = loadCharacter();
  if (!c) return;
  var intMod = getEffectiveMod(c, 'int');
  var maxPrep = getWizardPreparedCount(c.level, intMod);
  var current = c.currentPreparedSpells || [];
  var spellbook = c.spellbook || [];
  var html = '<h3>Change Prepared Spells</h3>';
  html += '<p class="text-dim" style="font-size:0.85rem;margin-bottom:8px">Prepare up to <strong>' + maxPrep + '</strong> spells from your spellbook (level ' + c.level + ' + INT modifier ' + (intMod >= 0 ? '+' : '') + intMod + ').</p>';
  html += '<div id="wiz-prep-list" style="max-height:400px;overflow-y:auto">';
  var byLevel = {};
  spellbook.forEach(function(name) { var sp = getSpell(name); var sl = sp ? sp.level : 1; if (!byLevel[sl]) byLevel[sl] = []; byLevel[sl].push(name); });
  Object.keys(byLevel).sort(function(a,b){return a-b;}).forEach(function(sl) {
    html += '<h4 class="text-dim" style="font-size:0.8rem;text-transform:uppercase;margin:8px 0 4px">' + ordinal(parseInt(sl)) + '-Level</h4>';
    byLevel[sl].forEach(function(name) {
      var checked = current.indexOf(name) >= 0 ? ' checked' : '';
      html += '<label style="display:block;padding:4px 0;cursor:pointer"><input type="checkbox" name="wiz-prep" value="' + escapeHtml(name) + '"' + checked + ' onclick="event.stopPropagation()"> ' + escapeHtml(name) + '</label>';
    });
  });
  html += '</div>';
  html += '<div id="wiz-prep-count" style="text-align:center;margin:8px 0;color:var(--accent)">' + current.length + ' / ' + maxPrep + '</div>';
  html += '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="applyWizardPrepared(' + maxPrep + ')">Apply</button></div>';
  showModal(html);
  // Add live count
  document.querySelectorAll('input[name="wiz-prep"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      var count = document.querySelectorAll('input[name="wiz-prep"]:checked').length;
      document.getElementById('wiz-prep-count').textContent = count + ' / ' + maxPrep;
      if (count > maxPrep) { cb.checked = false; document.getElementById('wiz-prep-count').textContent = (count-1) + ' / ' + maxPrep; }
    });
  });
}

function applyWizardPrepared(maxPrep) {
  var c = loadCharacter();
  if (!c) return;
  var selected = [];
  document.querySelectorAll('input[name="wiz-prep"]:checked').forEach(function(cb) { selected.push(cb.value); });
  if (selected.length > maxPrep) { alert('Too many spells selected. Maximum: ' + maxPrep); return; }
  c.currentPreparedSpells = selected;
  c.preparedSpellCount = maxPrep;
  logEvent('Changed prepared spells (' + selected.length + '/' + maxPrep + ')', c);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function showCopySpellToSpellbook() {
  var c = loadCharacter();
  if (!c) return;
  var slots = c.spellSlots || {};
  var maxLevel = 0;
  Object.keys(slots).forEach(function(k) { maxLevel = Math.max(maxLevel, parseInt(k)); });
  var spellbook = c.spellbook || [];
  var html = '<h3>Copy Spell to Spellbook</h3>';
  html += '<p class="text-dim" style="font-size:0.85rem;margin-bottom:8px">Copying a spell costs 2 hours and 50 gp per spell level. (Track this with your DM.)</p>';
  html += '<div style="max-height:400px;overflow-y:auto">';
  for (var sl = 1; sl <= maxLevel; sl++) {
    var spells = (WIZARD_SPELL_LIST[sl] || []).filter(function(n) { return spellbook.indexOf(n) < 0; });
    if (spells.length === 0) continue;
    html += '<h4 class="text-dim" style="font-size:0.8rem;text-transform:uppercase;margin:8px 0 4px">' + ordinal(sl) + '-Level (' + (sl * 50) + ' gp, ' + (sl * 2) + ' hours)</h4>';
    spells.forEach(function(name) {
      var sp = getSpell(name);
      var desc = sp ? sp.description.substring(0, 80) + (sp.description.length > 80 ? '...' : '') : '';
      html += '<div class="lu-option" style="padding:8px;margin:4px 0;cursor:pointer" onclick="doCopySpellToSpellbook(\'' + name.replace(/'/g, "\\'") + '\')">';
      html += '<div style="font-weight:bold">' + escapeHtml(name) + (sp ? ' <span class="text-dim" style="font-size:0.75rem">' + sp.school + '</span>' : '') + '</div>';
      if (desc) html += '<div style="font-size:0.8rem;color:var(--text-dim)">' + desc + '</div>';
      html += '</div>';
    });
  }
  html += '</div>';
  html += '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>';
  showModal(html);
}

function doCopySpellToSpellbook(name) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.spellbook) c.spellbook = [];
  if (c.spellbook.indexOf(name) >= 0) return;
  c.spellbook.push(name);
  var sp = getSpell(name);
  var cost = sp ? sp.level * 50 : 50;
  logEvent('Copied ' + name + ' to spellbook (' + cost + ' gp, ' + (sp ? sp.level * 2 : 2) + ' hours)', c);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function confirmShortRest() {
  var c = loadCharacter();
  var desc = 'This will ';
  if (c && c.class === 'Cleric') desc += 'restore all Channel Divinity uses.';
  else if (c && c.class === 'Paladin') desc += 'restore Channel Divinity.';
  else desc += 'allow recovery of some abilities.';
  showModal(
    '<h3>Short Rest</h3><p>' + desc + '</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="doShortRest()">Rest</button></div>'
  );
}

function confirmLongRest() {
  var c = loadCharacter();
  var cdInfo = CLASS_DATA[c ? c.class : 'Cleric'] || CLASS_DATA.Cleric;
  var desc = 'This will restore HP to max and clear temp HP';
  if (cdInfo.isCaster) desc += ', restore all spell slots';
  if (c && c.class === 'Cleric') desc += ', restore Channel Divinity';
  if (c && c.class === 'Paladin') desc += ', restore Channel Divinity, Lay on Hands pool, Divine Sense, and Cleansing Touch';
  desc += '.';
  showModal(
    '<h3>Long Rest</h3><p>' + desc + '</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="doLongRest()">Rest</button></div>'
  );
}

function doShortRest() {
  var c = loadCharacter();
  if (!c) return;
  var cdInfo = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  if (cdInfo.shortRestResets && cdInfo.shortRestResets.indexOf('channelDivinity') >= 0) {
    c.channelDivinityUsed = 0;
  }
  if (c.resources) {
    Object.keys(c.resources).forEach(function(key) {
      if (cdInfo.shortRestResets && cdInfo.shortRestResets.indexOf(key) >= 0) {
        // Signature Spell Uses: reset per-spell booleans
        if (key === 'signatureSpellUses' && typeof c.resources[key] === 'object' && !c.resources[key].max) {
          Object.keys(c.resources[key]).forEach(function(sp) { c.resources[key][sp] = false; });
        } else {
          c.resources[key].used = 0;
        }
      }
    });
  }
  logEvent('Short Rest \u2014 ' + getShortRestDescription(c.class, c.subclass, c.level), c);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function doLongRest() {
  var c = loadCharacter();
  if (!c) return;
  var cdInfo = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  // Clear max HP boost first (before healing)
  if (c.maxHpBoost && c.maxHpBoost.value > 0) {
    logEvent('Max HP boost expired' + (c.maxHpBoost.source ? ' (' + c.maxHpBoost.source + ')' : ''), c);
    c.maxHpBoost = { value: 0, source: '' };
  }
  c.currentHp = c.hp.max; // Heal to base max (boost is gone)
  c.tempHp = 0;
  if (cdInfo.isCaster || (c.spellSlots && Object.keys(c.spellSlots).length > 0)) c.spellSlotsUsed = {};
  if (c.class === 'Cleric' || c.class === 'Paladin') c.channelDivinityUsed = 0;
  if (c.resources) {
    Object.keys(c.resources).forEach(function(key) {
      c.resources[key].used = 0;
    });
  }
  // Clear death saves, concentration, and external buffs on long rest
  clearDeathSaves(c);
  c.concentration = { active: false, spellName: '' };
  c.externalBuffs = [];
  // Wizard Divination: auto-roll new Portent dice on long rest
  if (c.class === 'Wizard' && c.subclass === 'School of Divination' && c.level >= 2) {
    var numPortent = c.level >= 14 ? 3 : 2;
    var newPortent = [];
    for (var pi = 0; pi < numPortent; pi++) {
      newPortent.push({ value: Math.floor(Math.random() * 20) + 1, used: false });
    }
    if (!c.resources) c.resources = {};
    c.resources.portentDice = newPortent;
    var pValues = newPortent.map(function(d) { return d.value; }).join(', ');
    logEvent('Long Rest \u2014 all resources restored, HP full. Portent Dice: ' + pValues, c);
  } else {
    logEvent('Long Rest \u2014 all resources restored, HP full', c);
  }
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   CURRENCY TRACKER
   ═══════════════════════════════════════════ */

function adjustCurrency(denom, delta) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.currency) c.currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  c.currency[denom] = Math.max(0, (c.currency[denom] || 0) + delta);
  saveCurrentCharacter(c);
  var el = document.getElementById('cur-' + denom);
  if (el && !el.querySelector('input')) el.textContent = c.currency[denom];
  var cur = c.currency;
  var gpEquiv = (cur.cp / 100) + (cur.sp / 10) + (cur.ep / 2) + cur.gp + (cur.pp * 10);
  var totalEl = document.querySelector('.currency-total');
  if (totalEl) totalEl.textContent = '≈ ' + gpEquiv.toFixed(1) + ' GP total';
}

function editCurrency(denom) {
  var c = loadCharacter();
  if (!c) return;
  var cur = c.currency || {};
  var el = document.getElementById('cur-' + denom);
  if (!el) return;
  var current = cur[denom] || 0;
  el.innerHTML = '<input type="number" id="cur-input-' + denom + '" value="' + current + '" min="0" ' +
    'onblur="saveCurrencyEdit(\'' + denom + '\')" onkeydown="if(event.key===\'Enter\')this.blur()" ' +
    'onclick="event.stopPropagation()">';
  document.getElementById('cur-input-' + denom).select();
}

function saveCurrencyEdit(denom) {
  var input = document.getElementById('cur-input-' + denom);
  if (!input) return;
  var val = Math.max(0, parseInt(input.value) || 0);
  var c = loadCharacter();
  if (!c) return;
  if (!c.currency) c.currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  c.currency[denom] = val;
  saveCurrentCharacter(c);
  var el = document.getElementById('cur-' + denom);
  if (el) el.textContent = val;
  var cur = c.currency;
  var gpEquiv = (cur.cp / 100) + (cur.sp / 10) + (cur.ep / 2) + cur.gp + (cur.pp * 10);
  var totalEl = document.querySelector('.currency-total');
  if (totalEl) totalEl.textContent = '≈ ' + gpEquiv.toFixed(1) + ' GP total';
}

/* ═══════════════════════════════════════════
   EQUIPMENT SYSTEM
   ═══════════════════════════════════════════ */

function showEquipForm(idx) {
  var c = loadCharacter();
  if (!c) return;
  var item = idx >= 0 ? (c.equippedItems[idx] || {}) : { name: '', slot: 'other', armorType: null, stats: {}, notes: '' };
  var area = document.getElementById('equip-form-area');
  if (!area) return;
  var showArmorType = (item.slot === 'armor' || item.slot === 'shield');
  area.innerHTML = '<div class="equip-form">' +
    '<div class="ef-row"><div class="form-group"><label>Name</label>' +
    '<input type="text" id="ef-name" value="' + escapeHtml(item.name || '') + '" onclick="event.stopPropagation()"></div></div>' +
    '<div class="ef-row"><div class="form-group"><label>Slot</label>' +
    '<select id="ef-slot" onchange="onEquipSlotChange()" onclick="event.stopPropagation()">' +
    '<option value="armor"' + (item.slot === 'armor' ? ' selected' : '') + '>Armor</option>' +
    '<option value="shield"' + (item.slot === 'shield' ? ' selected' : '') + '>Shield</option>' +
    '<option value="ring"' + (item.slot === 'ring' ? ' selected' : '') + '>Ring</option>' +
    '<option value="cloak"' + (item.slot === 'cloak' ? ' selected' : '') + '>Cloak</option>' +
    '<option value="other"' + (item.slot === 'other' ? ' selected' : '') + '>Other</option>' +
    '</select></div>' +
    '<div class="form-group" id="ef-armor-type-group" style="' + (showArmorType ? '' : 'display:none') + '">' +
    '<label>Armor Type</label><select id="ef-armor-type" onclick="event.stopPropagation()">' +
    '<option value="light"' + (item.armorType === 'light' ? ' selected' : '') + '>Light</option>' +
    '<option value="medium"' + (item.armorType === 'medium' ? ' selected' : '') + '>Medium</option>' +
    '<option value="heavy"' + (item.armorType === 'heavy' ? ' selected' : '') + '>Heavy</option>' +
    '</select></div></div>' +
    '<div class="ef-row"><div class="form-group"><label>Base AC / AC Bonus</label>' +
    '<input type="number" id="ef-ac" value="' + ((item.stats && item.stats.ac) || (item.stats && item.stats.acBonus) || '') + '" onclick="event.stopPropagation()"></div>' +
    '<div class="form-group"><label>Magic Bonus (+1, +2, etc.)</label>' +
    '<input type="number" id="ef-magic" value="' + (item.magicBonus || 0) + '" min="0" onclick="event.stopPropagation()"></div></div>' +
    '<div class="ef-row"><div class="form-group"><label>Notes</label>' +
    '<input type="text" id="ef-notes" value="' + escapeHtml(item.notes || '') + '" onclick="event.stopPropagation()"></div></div>' +
    '<div class="ef-actions">' +
    '<button class="btn btn-primary" onclick="saveEquipItem(' + idx + ')" style="padding:10px 20px">Save</button>' +
    '<button class="btn btn-secondary" onclick="cancelEquipForm()" style="padding:10px 20px">Cancel</button></div></div>';
}

function onEquipSlotChange() {
  var slot = document.getElementById('ef-slot').value;
  var g = document.getElementById('ef-armor-type-group');
  if (g) g.style.display = (slot === 'armor' || slot === 'shield') ? '' : 'none';
}

function saveEquipItem(idx) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.equippedItems) c.equippedItems = [];
  var name = document.getElementById('ef-name').value.trim();
  if (!name) return;
  var slot = document.getElementById('ef-slot').value;
  var armorType = (slot === 'armor' || slot === 'shield') ? document.getElementById('ef-armor-type').value : null;
  var acVal = parseInt(document.getElementById('ef-ac').value) || 0;
  var notes = document.getElementById('ef-notes').value.trim();
  var stats = {};
  if (slot === 'shield') stats.acBonus = acVal || 2;
  else if (slot === 'armor') stats.ac = acVal;
  else if (acVal) stats.acBonus = acVal;
  var magicBonus = parseInt(document.getElementById('ef-magic').value) || 0;
  var item = { name: name, slot: slot, armorType: armorType, stats: stats, magicBonus: magicBonus, notes: notes };
  // Validate when adding new (not editing existing)
  if (idx < 0) {
    var msg = checkEquipConflict(c, item);
    if (msg) { showEquipAlert(msg); return; }
  }
  if (idx >= 0) c.equippedItems[idx] = item;
  else c.equippedItems.push(item);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function cancelEquipForm() {
  var area = document.getElementById('equip-form-area');
  if (area) area.innerHTML = '';
}

function removeEquipItem(idx) {
  var c = loadCharacter();
  if (!c) return;
  c.equippedItems.splice(idx, 1);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function unequipItem(idx) {
  var c = loadCharacter();
  if (!c) return;
  var item = c.equippedItems[idx];
  if (!item) return;
  c.equippedItems.splice(idx, 1);
  if (!c.unequippedItems) c.unequippedItems = [];
  c.unequippedItems.push(item);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function equipFromInventory(idx) {
  var c = loadCharacter();
  if (!c || !c.unequippedItems) return;
  var item = c.unequippedItems[idx];
  if (!item) return;
  // Validate: no duplicate armor or shield
  var msg = checkEquipConflict(c, item);
  if (msg) { showEquipAlert(msg); return; }
  c.unequippedItems.splice(idx, 1);
  if (!c.equippedItems) c.equippedItems = [];
  c.equippedItems.push(item);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function deleteUnequippedItem(idx) {
  var c = loadCharacter();
  if (!c || !c.unequippedItems || !c.unequippedItems[idx]) return;
  var name = c.unequippedItems[idx].name;
  showModal(
    '<h3>Delete Item?</h3><p>Remove ' + escapeHtml(name) + '?</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" onclick="doDeleteUnequipped(' + idx + ')">Delete</button></div>'
  );
}

function doDeleteUnequipped(idx) {
  var c = loadCharacter();
  if (!c || !c.unequippedItems) return;
  c.unequippedItems.splice(idx, 1);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function saveUnequippedNote(idx) {
  var input = document.getElementById('uneq-note-' + idx);
  if (!input) return;
  var c = loadCharacter();
  if (!c || !c.unequippedItems || !c.unequippedItems[idx]) return;
  c.unequippedItems[idx].notes = input.value.trim();
  saveCurrentCharacter(c);
}

function showEditUnequippedForm(idx) {
  var c = loadCharacter();
  if (!c || !c.unequippedItems) return;
  var item = c.unequippedItems[idx];
  if (!item) return;
  var area = document.getElementById('equip-form-area');
  if (!area) return;
  var showArmorType = (item.slot === 'armor' || item.slot === 'shield');
  area.innerHTML = '<div class="equip-form">' +
    '<div class="ef-row"><div class="form-group"><label>Name</label>' +
    '<input type="text" id="ef-name" value="' + escapeHtml(item.name || '') + '" onclick="event.stopPropagation()"></div></div>' +
    '<div class="ef-row"><div class="form-group"><label>Slot</label>' +
    '<select id="ef-slot" onchange="onEquipSlotChange()" onclick="event.stopPropagation()">' +
    '<option value="armor"' + (item.slot === 'armor' ? ' selected' : '') + '>Armor</option>' +
    '<option value="shield"' + (item.slot === 'shield' ? ' selected' : '') + '>Shield</option>' +
    '<option value="ring"' + (item.slot === 'ring' ? ' selected' : '') + '>Ring</option>' +
    '<option value="cloak"' + (item.slot === 'cloak' ? ' selected' : '') + '>Cloak</option>' +
    '<option value="other"' + (item.slot === 'other' ? ' selected' : '') + '>Other</option>' +
    '</select></div>' +
    '<div class="form-group" id="ef-armor-type-group" style="' + (showArmorType ? '' : 'display:none') + '">' +
    '<label>Armor Type</label><select id="ef-armor-type" onclick="event.stopPropagation()">' +
    '<option value="light"' + (item.armorType === 'light' ? ' selected' : '') + '>Light</option>' +
    '<option value="medium"' + (item.armorType === 'medium' ? ' selected' : '') + '>Medium</option>' +
    '<option value="heavy"' + (item.armorType === 'heavy' ? ' selected' : '') + '>Heavy</option>' +
    '</select></div></div>' +
    '<div class="ef-row"><div class="form-group"><label>Base AC / AC Bonus</label>' +
    '<input type="number" id="ef-ac" value="' + ((item.stats && item.stats.ac) || (item.stats && item.stats.acBonus) || '') + '" onclick="event.stopPropagation()"></div>' +
    '<div class="form-group"><label>Magic Bonus (+1, +2, etc.)</label>' +
    '<input type="number" id="ef-magic" value="' + (item.magicBonus || 0) + '" min="0" onclick="event.stopPropagation()"></div></div>' +
    '<div class="ef-row"><div class="form-group"><label>Notes</label>' +
    '<input type="text" id="ef-notes" value="' + escapeHtml(item.notes || '') + '" onclick="event.stopPropagation()"></div></div>' +
    '<div class="ef-actions">' +
    '<button class="btn btn-primary" onclick="saveUnequippedEdit(' + idx + ')" style="padding:10px 20px">Save</button>' +
    '<button class="btn btn-secondary" onclick="cancelEquipForm()" style="padding:10px 20px">Cancel</button></div></div>';
}

function saveUnequippedEdit(idx) {
  var c = loadCharacter();
  if (!c || !c.unequippedItems) return;
  var name = document.getElementById('ef-name').value.trim();
  if (!name) return;
  var slot = document.getElementById('ef-slot').value;
  var armorType = (slot === 'armor' || slot === 'shield') ? document.getElementById('ef-armor-type').value : null;
  var acVal = parseInt(document.getElementById('ef-ac').value) || 0;
  var notes = document.getElementById('ef-notes').value.trim();
  var stats = {};
  if (slot === 'shield') stats.acBonus = acVal || 2;
  else if (slot === 'armor') stats.ac = acVal;
  else if (acVal) stats.acBonus = acVal;
  var magicBonus = parseInt(document.getElementById('ef-magic').value) || 0;
  c.unequippedItems[idx] = { name: name, slot: slot, armorType: armorType, stats: stats, magicBonus: magicBonus, notes: notes };
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function checkEquipConflict(c, item) {
  if (item.slot === 'armor' && c.equippedItems.some(function(e) { return e.slot === 'armor'; })) {
    return 'You already have armor equipped. Unequip it first.';
  }
  if (item.slot === 'shield' && c.equippedItems.some(function(e) { return e.slot === 'shield'; })) {
    return 'You already have a shield equipped. Unequip it first.';
  }
  return null;
}

function showEquipAlert(msg) {
  var container = document.getElementById('equip-form-area');
  if (!container) container = document.querySelector('.dash-section');
  if (!container) return;
  var alert = document.createElement('div');
  alert.style.cssText = 'background:rgba(139,32,32,0.15);border:1px solid var(--error);color:var(--error);border-radius:var(--radius);padding:8px 12px;font-size:0.85rem;margin:8px 0';
  alert.textContent = msg;
  container.prepend(alert);
  setTimeout(function() { if (alert.parentNode) alert.parentNode.removeChild(alert); }, 3000);
}

function addQuickItem() {
  var input = document.getElementById('quick-item-input');
  if (!input || !input.value.trim()) return;
  var c = loadCharacter();
  if (!c) return;
  if (!c.quickItems) c.quickItems = [];
  c.quickItems.push({ name: input.value.trim(), notes: '' });
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function removeQuickItem(idx) {
  var c = loadCharacter();
  if (!c) return;
  c.quickItems.splice(idx, 1);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function saveQuickItemNote(idx) {
  var input = document.getElementById('qi-note-' + idx);
  if (!input) return;
  var c = loadCharacter();
  if (!c || !c.quickItems || !c.quickItems[idx]) return;
  c.quickItems[idx].notes = input.value.trim();
  saveCurrentCharacter(c);
}

/* ═══════════════════════════════════════════
   WEAPON MANAGEMENT (Dashboard Inline)
   ═══════════════════════════════════════════ */

function showWeaponForm(idx) {
  var c = loadCharacter();
  if (!c) return;
  var w = idx >= 0 ? (c.weapons[idx] || {}) : { name: '', ability: 'str', proficient: true, damage: '1d8', damageType: 'slashing', magicBonus: 0, notes: '' };
  var area = document.getElementById('weapon-form-area');
  if (!area) return;
  area.innerHTML = '<div class="equip-form">' +
    '<div class="ef-row"><div class="form-group"><label>Name</label>' +
    '<input type="text" id="wf-name" value="' + escapeHtml(w.name || '') + '" onclick="event.stopPropagation()"></div></div>' +
    '<div class="ef-row">' +
    '<div class="form-group"><label>Ability</label>' +
    '<select id="wf-ability" onclick="event.stopPropagation()">' +
    '<option value="str"' + (w.ability === 'str' ? ' selected' : '') + '>STR</option>' +
    '<option value="dex"' + (w.ability === 'dex' ? ' selected' : '') + '>DEX</option>' +
    '</select></div>' +
    '<div class="form-group"><label>Proficient</label>' +
    '<div style="padding-top:10px"><input type="checkbox" id="wf-prof"' + (w.proficient ? ' checked' : '') + ' onclick="event.stopPropagation()" style="width:20px;height:20px;accent-color:var(--accent)"></div></div>' +
    '<div class="form-group"><label>Magic Bonus</label>' +
    '<input type="number" id="wf-magic" value="' + (w.magicBonus || 0) + '" min="0" onclick="event.stopPropagation()"></div>' +
    '</div>' +
    '<div class="ef-row">' +
    '<div class="form-group"><label>Damage Dice</label>' +
    '<input type="text" id="wf-damage" value="' + escapeHtml(w.damage || '') + '" placeholder="e.g. 2d8" onclick="event.stopPropagation()"></div>' +
    '<div class="form-group"><label>Damage Type</label>' +
    '<input type="text" id="wf-dtype" value="' + escapeHtml(w.damageType || '') + '" placeholder="e.g. slashing" onclick="event.stopPropagation()"></div>' +
    '</div>' +
    '<div class="ef-row"><div class="form-group"><label>Notes</label>' +
    '<input type="text" id="wf-notes" value="' + escapeHtml(w.notes || '') + '" onclick="event.stopPropagation()"></div></div>' +
    '<div class="ef-actions">' +
    '<button class="btn btn-primary" onclick="saveWeaponItem(' + idx + ')" style="padding:10px 20px">Save</button>' +
    '<button class="btn btn-secondary" onclick="cancelWeaponForm()" style="padding:10px 20px">Cancel</button></div></div>';
}

function saveWeaponItem(idx) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.weapons) c.weapons = [];
  var name = document.getElementById('wf-name').value.trim();
  if (!name) return;
  var w = {
    name: name,
    ability: document.getElementById('wf-ability').value,
    proficient: document.getElementById('wf-prof').checked,
    damage: document.getElementById('wf-damage').value.trim() || '1d8',
    damageType: document.getElementById('wf-dtype').value.trim() || 'slashing',
    magicBonus: parseInt(document.getElementById('wf-magic').value) || 0,
    notes: document.getElementById('wf-notes').value.trim()
  };
  if (idx >= 0) c.weapons[idx] = w;
  else c.weapons.push(w);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function cancelWeaponForm() {
  var area = document.getElementById('weapon-form-area');
  if (area) area.innerHTML = '';
}

function confirmDeleteWeapon(idx) {
  var c = loadCharacter();
  if (!c || !c.weapons[idx]) return;
  showModal(
    '<h3>Delete Weapon?</h3><p>Remove ' + escapeHtml(c.weapons[idx].name) + '?</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" onclick="doDeleteWeapon(' + idx + ')">Delete</button></div>'
  );
}

function doDeleteWeapon(idx) {
  var c = loadCharacter();
  if (!c) return;
  c.weapons.splice(idx, 1);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   INLINE EDITING (Notes & Bulk Gear)
   ═══════════════════════════════════════════ */

function toggleBulkGearEdit() {
  var c = loadCharacter();
  if (!c) return;
  var area = document.getElementById('bulk-gear-area');
  if (!area) return;
  area.innerHTML = '<div class="inline-edit-area">' +
    '<textarea id="bulk-gear-edit" onclick="event.stopPropagation()">' + escapeHtml(c.bulkGear || '') + '</textarea>' +
    '<div class="inline-edit-actions">' +
    '<button class="btn btn-primary" onclick="saveBulkGear()" style="padding:8px 16px">Save</button>' +
    '<button class="btn btn-secondary" onclick="cancelInlineEdit()" style="padding:8px 16px">Cancel</button></div></div>';
}

function saveBulkGear() {
  var c = loadCharacter();
  if (!c) return;
  c.bulkGear = document.getElementById('bulk-gear-edit').value;
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function toggleNotesEdit() {
  var c = loadCharacter();
  if (!c) return;
  var area = document.getElementById('notes-area');
  if (!area) return;
  area.innerHTML = '<div class="inline-edit-area">' +
    '<textarea id="notes-edit" onclick="event.stopPropagation()">' + escapeHtml(c.notes || '') + '</textarea>' +
    '<div class="inline-edit-actions">' +
    '<button class="btn btn-primary" onclick="saveNotes()" style="padding:8px 16px">Save</button>' +
    '<button class="btn btn-secondary" onclick="cancelInlineEdit()" style="padding:8px 16px">Cancel</button></div></div>';
}

function saveNotes() {
  var c = loadCharacter();
  if (!c) return;
  c.notes = document.getElementById('notes-edit').value;
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function cancelInlineEdit() {
  var c = loadCharacter();
  if (c) showDashboard(c, true);
}

