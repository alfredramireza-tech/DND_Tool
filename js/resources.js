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
  logEvent('Max HP boosted by ' + amount + (source ? ' (' + source + ')' : '') + ' \u2014 HP max ' + oldMax + ' \u2192 ' + newMax);
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
  logEvent('Max HP boost removed' + (source ? ' (' + source + ')' : '') + ' \u2014 HP max ' + oldMax + ' \u2192 ' + newMax);
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
    logEvent('Took ' + actualDmg + ' damage \u2014 HP ' + oldHp + '\u2192' + c.currentHp);
    // Death save failure if at 0 HP and took damage while already at 0
    if (oldHp === 0 && c.currentHp === 0 && val > 0) {
      if (!c.deathSaves) c.deathSaves = { successes: 0, failures: 0 };
      c.deathSaves.failures = Math.min(3, c.deathSaves.failures + 1);
      logEvent('Damage at 0 HP: +1 death save failure');
    }
    // Concentration save prompt
    if (c.concentration && c.concentration.active && actualDmg > 0) {
      var concDC = Math.max(10, Math.floor(actualDmg / 2));
      var conBonus = mod(c.abilityScores.con) + (c.savingThrows.indexOf('con') >= 0 ? c.proficiencyBonus : 0);
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
    logEvent('Healed ' + val + ' HP \u2014 HP ' + oldHp + '\u2192' + c.currentHp);
    // Clear death saves when healed above 0
    if (oldHp === 0 && c.currentHp > 0) {
      clearDeathSaves(c);
    }
  } else if (mode === 'temp') {
    c.tempHp = val;
    logEvent('Set temp HP to ' + val);
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
  var key = 'spellSlotsUsed';
  if (c.class === 'Fighter' && c.subclass === 'Eldritch Knight') key = 'ekSlotsUsed';
  if (c.class === 'Rogue' && c.subclass === 'Arcane Trickster') key = 'atSlotsUsed';
  if (!c[key]) c[key] = {};
  var used = c[key][level] || 0;
  if (idx < used) c[key][level] = idx;
  else c[key][level] = idx + 1;
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
  logEvent('Channel Divinity: ' + remaining + '/' + cdMax + ' remaining');
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
  logEvent('Used ' + displayName + ' (' + remaining + '/' + max + ' remaining)');
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
  logEvent('Lay on Hands: healed ' + amount + ' HP (' + (lohRemaining - amount) + '/' + lohMax + ' remaining)');
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
  logEvent('Lay on Hands: cured disease/poison (' + (lohRemaining - 5) + '/' + lohMax + ' remaining)');
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
        c.resources[key].used = 0;
      }
    });
  }
  logEvent('Short Rest \u2014 ' + getShortRestDescription(c.class, c.subclass, c.level));
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c);
}

function doLongRest() {
  var c = loadCharacter();
  if (!c) return;
  var cdInfo = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  // Clear max HP boost first (before healing)
  if (c.maxHpBoost && c.maxHpBoost.value > 0) {
    logEvent('Max HP boost expired' + (c.maxHpBoost.source ? ' (' + c.maxHpBoost.source + ')' : ''));
    c.maxHpBoost = { value: 0, source: '' };
  }
  c.currentHp = c.hp.max; // Heal to base max (boost is gone)
  c.tempHp = 0;
  if (cdInfo.isCaster || (c.class === 'Fighter' && c.subclass === 'Eldritch Knight') || (c.class === 'Rogue' && c.subclass === 'Arcane Trickster')) c.spellSlotsUsed = {};
  if (c.class === 'Fighter' && c.subclass === 'Eldritch Knight') c.ekSlotsUsed = {};
  if (c.class === 'Rogue' && c.subclass === 'Arcane Trickster') c.atSlotsUsed = {};
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
  logEvent('Long Rest \u2014 all resources restored, HP full');
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c);
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
  if (idx >= 0) c.equippedItems[idx] = item;
  else c.equippedItems.push(item);
  saveCurrentCharacter(c);
  showDashboard(c);
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
  showDashboard(c);
}

function unequipItem(idx) {
  var c = loadCharacter();
  if (!c) return;
  var item = c.equippedItems[idx];
  if (!item) return;
  c.equippedItems.splice(idx, 1);
  if (!c.quickItems) c.quickItems = [];
  c.quickItems.push(item.name);
  saveCurrentCharacter(c);
  showDashboard(c);
}

function addQuickItem() {
  var input = document.getElementById('quick-item-input');
  if (!input || !input.value.trim()) return;
  var c = loadCharacter();
  if (!c) return;
  if (!c.quickItems) c.quickItems = [];
  c.quickItems.push(input.value.trim());
  saveCurrentCharacter(c);
  showDashboard(c);
}

function removeQuickItem(idx) {
  var c = loadCharacter();
  if (!c) return;
  c.quickItems.splice(idx, 1);
  saveCurrentCharacter(c);
  showDashboard(c);
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
  showDashboard(c);
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
  showDashboard(c);
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
  showDashboard(c);
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
  showDashboard(c);
}

function cancelInlineEdit() {
  var c = loadCharacter();
  if (c) showDashboard(c);
}

