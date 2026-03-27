// combat.js — Death saves, initiative, concentration, conditions, buffs, combat mode, tooltips, spell casting, party view
/* ═══════════════════════════════════════════
   DEATH SAVE TRACKER
   ═══════════════════════════════════════════ */

var _lastCantripIdx = -1;
function toggleCantripDetail(idx) {
  var area = document.getElementById('cantrip-detail-area');
  if (!area) return;
  if (_lastCantripIdx === idx) { area.innerHTML = ''; _lastCantripIdx = -1; return; }
  _lastCantripIdx = idx;
  var c = loadCharacter();
  if (!c) return;
  var displayCantrips = (c.cantripsKnown || []).slice();
  if (c.race === 'Aasimar' && displayCantrips.indexOf('Light') < 0) displayCantrips.push('Light');
  var name = displayCantrips[idx];
  if (!name) return;
  var sp = getSpell(name);
  if (sp) {
    area.innerHTML = '<div class="cantrip-chip-detail">' + renderSpellCard(sp, c) + '</div>';
  } else {
    area.innerHTML = '<div class="cantrip-chip-detail"><strong>' + escapeHtml(name) + '</strong></div>';
  }
}

function renderInspiration(c) {
  var active = c.inspiration ? ' active' : '';
  return '<div class="inspiration-toggle' + active + '" onclick="toggleInspiration()">' +
    '<span class="insp-star">\u2B50</span>' +
    '<span class="insp-label">Inspiration' + (c.inspiration ? ' (Active)' : '') + '</span></div>';
}

function toggleInspiration() {
  var c = loadCharacter();
  if (!c) return;
  c.inspiration = !c.inspiration;
  logEvent(c.inspiration ? 'Gained Inspiration' : 'Used Inspiration');
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function buildQuickActions(c) {
  var actions = [];
  // Add all weapons
  (c.weapons || []).forEach(function(w, i) {
    var abilMod = mod(c.abilityScores[w.ability] || 10);
    var profB = w.proficient ? c.proficiencyBonus : 0;
    var magB = w.magicBonus || 0;
    var atkB = abilMod + profB + magB;
    var dmgMod = abilMod + magB;
    actions.push({
      type: 'weapon', index: i, name: w.name,
      atkBonus: atkB, damage: w.damage, dmgMod: dmgMod, damageType: w.damageType
    });
  });
  // Add rollable cantrips (damage, attack, or healing — not utility)
  (c.cantripsKnown || []).forEach(function(name) {
    var sp = getSpell(name);
    if (sp && (sp.damage || sp.attack || sp.healing)) {
      actions.push({ type: 'cantrip', name: name, spell: sp });
    }
  });
  return actions;
}

function renderQuickAction(c) {
  var actions = buildQuickActions(c);
  if (actions.length === 0) {
    return '<div class="hud-right"><div class="text-dim" style="font-size:0.8rem;text-align:center;padding:8px 0">No weapons or attack cantrips</div></div>';
  }
  var selectedIdx = parseInt(localStorage.getItem('dnd_quickAction_' + (c.id || '')) || '0');
  if (selectedIdx >= actions.length) selectedIdx = 0;
  var current = actions[selectedIdx];
  var html = '<div class="hud-right">';
  // Current action info
  html += '<div class="hud-qa-name">\u2694 ' + escapeHtml(current.name) + '</div>';
  if (current.type === 'weapon') {
    html += '<div class="hud-qa-stats">+' + current.atkBonus + ' to hit \u00b7 ' + current.damage + (current.dmgMod >= 0 ? '+' : '') + current.dmgMod + ' ' + current.damageType + '</div>';
    html += '<div class="hud-qa-btns">';
    html += '<button class="btn btn-primary" onclick="doWeaponRoll(' + current.index + ',\'attack\')">Attack</button>';
    html += '<button class="btn btn-secondary" onclick="doWeaponRoll(' + current.index + ',\'damage\')">Damage</button>';
    html += '</div>';
  } else if (current.type === 'cantrip') {
    var sp = current.spell;
    var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
    var castMod = mod(c.abilityScores[cd.spellcastingAbility] || c.abilityScores.wis);
    var spellDC = 8 + c.proficiencyBonus + castMod;
    // Build stats line
    var statsLine = '';
    if (sp.attack) {
      statsLine = '+' + (c.proficiencyBonus + castMod) + ' to hit';
    } else if (sp.save) {
      statsLine = sp.save + ' save DC ' + spellDC;
    }
    if (sp.damage) {
      var dmgDice = sp.damage.dice || '';
      if (sp.damage.scaleCantrip && c.level >= 5) {
        // Simplified cantrip scaling display
        var numDice = c.level >= 17 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1;
        dmgDice = numDice + dmgDice.substring(1);
      }
      if (statsLine) statsLine += ' \u00b7 ';
      statsLine += dmgDice + ' ' + (sp.damage.type || '');
    }
    if (sp.healing) {
      var healDice = sp.healing.dice || '';
      if (statsLine) statsLine += ' \u00b7 ';
      statsLine += healDice + ' healing';
    }
    html += '<div class="hud-qa-stats">' + statsLine + '</div>';
    html += '<div class="hud-qa-btns">';
    if (sp.attack && sp.damage) {
      html += '<button class="btn btn-primary" onclick="doSpellRoll(\'' + escapeHtml(sp.name) + '\',\'attack\')">Attack</button>';
      html += '<button class="btn btn-secondary" onclick="doSpellRoll(\'' + escapeHtml(sp.name) + '\',\'damage\')">Damage</button>';
    } else if (sp.damage && !sp.attack) {
      html += '<button class="btn btn-primary" onclick="doSpellRoll(\'' + escapeHtml(sp.name) + '\',\'damage\')">Damage</button>';
      if (sp.damage.altDice) {
        html += '<button class="btn btn-secondary" onclick="doSpellRoll(\'' + escapeHtml(sp.name) + '\',\'damage-alt\')">Alt Dmg</button>';
      }
    }
    if (sp.healing) {
      html += '<button class="btn btn-primary" onclick="doSpellRoll(\'' + escapeHtml(sp.name) + '\',\'healing\')" style="border-color:var(--success);color:var(--success)">Heal</button>';
    }
    html += '</div>';
  }
  // Roll reminders from active buffs (externalBuffs only)
  var rollReminders = [];
  if (c.externalBuffs) {
    c.externalBuffs.forEach(function(buff) { (buff.effects || []).forEach(function(eff) { if (eff.type === 'rollReminder') rollReminders.push(eff.text); }); });
  }
  if (rollReminders.length > 0) {
    html += '<div style="font-size:0.65rem;color:var(--accent);margin-top:2px">' + rollReminders.join(' \u00b7 ') + '</div>';
  }
  // Switch dropdown (only if more than 1 action)
  if (actions.length > 1) {
    html += '<select class="hud-qa-switch" onchange="switchQuickAction(this.value)">';
    actions.forEach(function(a, i) {
      var label = (a.type === 'weapon' ? '\u2694 ' : '\u2728 ') + a.name;
      html += '<option value="' + i + '"' + (i === selectedIdx ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
    });
    html += '</select>';
  }
  html += '</div>';
  return html;
}

function switchQuickAction(idx) {
  var c = loadCharacter();
  if (!c) return;
  localStorage.setItem('dnd_quickAction_' + (c.id || ''), idx);
  var rightEl = document.querySelector('.hud-right');
  if (rightEl) {
    var tmp = document.createElement('div');
    tmp.innerHTML = renderQuickAction(c);
    var newRight = tmp.querySelector('.hud-right');
    if (newRight) rightEl.innerHTML = newRight.innerHTML;
  }
}

function renderResourceStrip(c) {
  var html = '<div class="hud-strip">';
  // Spell slots as read-only dots
  var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  var isCaster = cd.isCaster;
  // Also handle EK spell slots
  var slotsObj = null;
  var slotsUsed = null;
  if (isCaster && c.spellSlots && Object.keys(c.spellSlots).length > 0) {
    slotsObj = c.spellSlots;
    slotsUsed = c.spellSlotsUsed || {};
  } else if (c.class === 'Fighter' && c.subclass === 'Eldritch Knight' && c.ekSpellSlots) {
    slotsObj = c.ekSpellSlots;
    slotsUsed = c.ekSlotsUsed || {};
  }
  if (slotsObj) {
    Object.entries(slotsObj).forEach(function(entry) {
      var level = entry[0], count = entry[1];
      if (count <= 0) return;
      var used = (slotsUsed && slotsUsed[level]) || 0;
      html += '<span class="slot-summary">';
      for (var i = 0; i < count; i++) {
        html += '<span class="slot-pip' + (i < used ? ' spent' : '') + '"></span>';
      }
      html += ' ' + ordinal(parseInt(level)) + '</span>';
    });
  }
  // Concentration badge
  if (c.concentration && c.concentration.active) {
    html += '<span class="strip-badge conc">\u27E1 ' + escapeHtml(c.concentration.spellName) + '</span>';
  }
  // Condition badges (tappable for popover)
  if (c.activeConditions && c.activeConditions.length > 0) {
    c.activeConditions.forEach(function(cn) {
      var safeName = cn.replace(/'/g, "\\'");
      var safeDesc = getConditionDesc(cn).replace(/'/g, "\\'");
      html += '<span class="strip-badge cond" style="cursor:pointer" onclick="event.stopPropagation();showBadgePopover(\'' + safeName + '\',\'' + safeDesc + '\',event)">\u26A0 ' + escapeHtml(cn) + '</span>';
    });
  }
  // External buff badges in strip
  if (c.externalBuffs && c.externalBuffs.length > 0) {
    c.externalBuffs.forEach(function(buff) {
      var safeName = buff.spellName.replace(/'/g, "\\'");
      var desc = (buff.effects || []).map(function(e) {
        if (e.type === 'acBonus') return '+' + e.value + ' AC';
        if (e.type === 'rollReminder') return e.text;
        if (e.type === 'reminder') return e.text;
        return '';
      }).filter(Boolean).join(', ');
      var safeDesc = desc.replace(/'/g, "\\'");
      html += '<span class="strip-badge conc" style="cursor:pointer" onclick="event.stopPropagation();showBadgePopover(\'' + safeName + '\',\'' + safeDesc + '\',event)">\u2728 ' + escapeHtml(buff.spellName) + '</span>';
    });
  }
  html += '</div>';
  return html;
}

function updateHudStrip(c) {
  var stripEl = document.querySelector('.hud-strip');
  if (!stripEl) return;
  // Re-render strip contents by building fresh HTML
  var tmp = document.createElement('div');
  tmp.innerHTML = renderResourceStrip(c);
  var newStrip = tmp.querySelector('.hud-strip');
  if (newStrip) stripEl.innerHTML = newStrip.innerHTML;
}

function showBadgePopover(name, text, evt) {
  dismissBadgePopover();
  var el = evt.target.closest('.cond-badge, .strip-badge, .ext-buff-badge');
  if (!el) return;
  var rect = el.getBoundingClientRect();
  var pop = document.createElement('div');
  pop.id = 'badge-popover';
  pop.style.cssText = 'position:fixed;z-index:200;background:var(--surface-raised);border:1px solid var(--border);border-radius:8px;padding:10px 14px;max-width:260px;font-size:0.82rem;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
  pop.style.top = (rect.bottom + 6) + 'px';
  pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 270)) + 'px';
  pop.innerHTML = '<strong style="color:var(--accent)">' + escapeHtml(name) + '</strong><div style="color:var(--text-dim);margin-top:4px">' + escapeHtml(text) + '</div>';
  document.body.appendChild(pop);
  setTimeout(function() { document.addEventListener('click', dismissBadgePopover, { once: true }); }, 10);
}

function dismissBadgePopover() {
  var el = document.getElementById('badge-popover');
  if (el) el.remove();
}

function renderDeathSaves(c) {
  if (c.currentHp > 0 && c.deathSaves.successes === 0 && c.deathSaves.failures === 0) return '';
  if (c.currentHp > 0) return '';
  var ds = c.deathSaves || { successes: 0, failures: 0 };
  var html = '<div class="death-saves">';
  html += '<h2>&#9760; Death Saves</h2>';
  // Successes
  html += '<div class="ds-row"><span class="ds-label">Successes</span>';
  for (var s = 0; s < 3; s++) {
    html += '<div class="ds-box success' + (s < ds.successes ? ' filled' : '') + '" onclick="toggleDeathSave(\'successes\',' + s + ')">&#10003;</div>';
  }
  html += '</div>';
  // Failures
  html += '<div class="ds-row"><span class="ds-label">Failures</span>';
  for (var f = 0; f < 3; f++) {
    html += '<div class="ds-box failure' + (f < ds.failures ? ' filled' : '') + '" onclick="toggleDeathSave(\'failures\',' + f + ')">&#10007;</div>';
  }
  html += '</div>';
  // Roll button
  html += '<div style="text-align:center;margin-top:10px"><button class="btn btn-primary" onclick="rollDeathSave()" style="padding:10px 20px">Roll Death Save</button></div>';
  // Resolution
  if (ds.successes >= 3) {
    html += '<div class="ds-result stabilized">Stabilized \u2014 unconscious but no longer dying. You need healing to wake up (or you regain 1 HP in 1d4 hours).</div>';
  }
  if (ds.failures >= 3) {
    html += '<div class="ds-result dead">&#9760; Dead</div>';
  }
  // Rules reminder
  html += '<div class="ds-rules">';
  html += '\u2022 Taking damage at 0 HP = 1 death save failure<br>';
  html += '\u2022 A critical hit at 0 HP = 2 failures<br>';
  html += '\u2022 Being healed clears all death saves';
  html += '</div></div>';
  return html;
}

function toggleDeathSave(type, idx) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.deathSaves) c.deathSaves = { successes: 0, failures: 0 };
  var current = c.deathSaves[type] || 0;
  c.deathSaves[type] = idx < current ? idx : idx + 1;
  saveCurrentCharacter(c);
  showDashboard(c);
}

function rollDeathSave() {
  var c = loadCharacter();
  if (!c) return;
  if (!c.deathSaves) c.deathSaves = { successes: 0, failures: 0 };
  var d20 = rollDie(20);
  var msg = '';

  if (d20 === 20) {
    // Nat 20: regain 1 HP, conscious
    c.currentHp = 1;
    c.deathSaves = { successes: 0, failures: 0 };
    msg = 'Death save: NAT 20! Regained 1 HP';
    saveCurrentCharacter(c);
    logEvent(msg);
    showRollResult('Death Save', [d20], 0, '', d20, 'NAT 20! You regain 1 HP!', { nat20: true });
    setTimeout(function() { showDashboard(loadCharacter()); }, 1500);
    return;
  }
  if (d20 === 1) {
    // Nat 1: TWO failures
    c.deathSaves.failures = Math.min(3, c.deathSaves.failures + 2);
    msg = 'Death save: NAT 1 (2 failures, ' + c.deathSaves.failures + '/3)';
  } else if (d20 >= 10) {
    c.deathSaves.successes = Math.min(3, c.deathSaves.successes + 1);
    msg = 'Death save: ' + d20 + ' — success (' + c.deathSaves.successes + '/3)';
  } else {
    c.deathSaves.failures = Math.min(3, c.deathSaves.failures + 1);
    msg = 'Death save: ' + d20 + ' — failure (' + c.deathSaves.failures + '/3)';
  }
  logEvent(msg);
  saveCurrentCharacter(c);
  var ctx = {};
  if (d20 === 1) ctx.nat1 = true;
  var extra = d20 >= 10 ? 'Success (' + c.deathSaves.successes + '/3)' : 'Failure (' + c.deathSaves.failures + '/3)';
  showRollResult('Death Save', [d20], 0, '', d20, extra, ctx);
  showDashboard(c);
}

function clearDeathSaves(c) {
  c.deathSaves = { successes: 0, failures: 0 };
}

/* ═══════════════════════════════════════════
   INITIATIVE ROLLER
   ═══════════════════════════════════════════ */

var lastInitiative = null;

function rollInitiative() {
  var c = loadCharacter();
  if (!c) return;
  var dexMod = mod(c.abilityScores.dex);
  var bonus = dexMod;
  var extraLabel = 'DEX';
  var extra = '';
  // Remarkable Athlete: Champion 7+ half prof (round up) on initiative (DEX check)
  if (c.class === 'Fighter' && c.subclass === 'Champion' && c.level >= 7) {
    var raBonus = Math.ceil(c.proficiencyBonus / 2);
    bonus += raBonus;
    extraLabel += '+' + raBonus + ' RA';
  }
  // Barbarian Feral Instinct: advantage at level 7+
  var d20, d20b, usedAdvantage = false;
  if (c.class === 'Barbarian' && c.level >= 7) {
    d20 = rollDie(20);
    d20b = rollDie(20);
    usedAdvantage = true;
    extra = 'Advantage (Feral Instinct): ' + d20 + ' / ' + d20b;
    d20 = Math.max(d20, d20b);
  } else {
    d20 = rollDie(20);
  }
  var total = d20 + bonus;
  lastInitiative = total;
  logEvent('Initiative: ' + total);
  var ctx = {};
  if (d20 === 20) ctx.nat20 = true;
  else if (d20 === 1) ctx.nat1 = true;
  showRollResult('Initiative', usedAdvantage ? [d20, d20b] : [d20], bonus, extraLabel, total, extra, ctx);
  // Update the initiative display
  var initEl = document.getElementById('init-display');
  if (initEl) initEl.textContent = 'Initiative: ' + total;
}

/* ═══════════════════════════════════════════
   CONCENTRATION TRACKER
   ═══════════════════════════════════════════ */

function setConcentration(spellName) {
  var c = loadCharacter();
  if (!c) return;
  // If already concentrating, remove old linked buffs and log
  if (c.concentration && c.concentration.active && c.concentration.spellName !== spellName) {
    removeLinkedBuffs(c, c.concentration.spellName);
    logEvent('Lost concentration on ' + c.concentration.spellName);
  }
  c.concentration = { active: true, spellName: spellName };
  logEvent('Began concentrating on ' + spellName);
  saveCurrentCharacter(c);
  // If spell has buff effects, ask if player is a target
  var buffEffects = SPELL_BUFF_EFFECTS[spellName];
  if (buffEffects && buffEffects.length > 0) {
    var desc = buffEffects.map(function(e) {
      if (e.type === 'acBonus') return '+' + e.value + ' AC';
      if (e.type === 'acMinimum') return 'Min AC ' + e.value;
      if (e.type === 'rollReminder') return e.text;
      if (e.type === 'reminder') return e.text;
      return '';
    }).filter(Boolean).join(', ');
    var safeName = spellName.replace(/'/g, "\\'");
    showModal(
      '<h3>Are you a target of ' + escapeHtml(spellName) + '?</h3>' +
      '<p class="text-dim" style="font-size:0.85rem">' + escapeHtml(desc) + '</p>' +
      '<div class="confirm-actions">' +
      '<button class="btn btn-primary" onclick="closeModal();addLinkedBuff(\'' + safeName + '\')">Yes, I\'m a target</button>' +
      '<button class="btn btn-secondary" onclick="closeModal();showDashboard(loadCharacter(),true)">No</button></div>'
    );
  } else {
    showDashboard(c, true);
  }
}

function addLinkedBuff(spellName) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.externalBuffs) c.externalBuffs = [];
  // Don't duplicate
  var already = c.externalBuffs.some(function(b) { return b.linkedToConcentration && b.spellName === spellName; });
  if (already) { showDashboard(c, true); return; }
  if (c.externalBuffs.length >= 5) { showDashboard(c, true); return; }
  var effects = SPELL_BUFF_EFFECTS[spellName] || [];
  c.externalBuffs.push({ spellName: spellName, effects: effects, linkedToConcentration: true });
  var desc = effects.map(function(e) {
    if (e.type === 'acBonus') return '+' + e.value + ' AC';
    if (e.type === 'rollReminder') return e.text;
    return '';
  }).filter(Boolean).join(', ');
  logEvent('Added buff: ' + spellName + (desc ? ' (' + desc + ')' : ''));
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function removeLinkedBuffs(c, spellName) {
  if (!c.externalBuffs) return;
  var removed = [];
  c.externalBuffs = c.externalBuffs.filter(function(b) {
    if (b.linkedToConcentration && b.spellName === spellName) {
      removed.push(b);
      return false;
    }
    return true;
  });
  removed.forEach(function(b) {
    var desc = (b.effects || []).map(function(e) {
      if (e.type === 'acBonus') return '-' + e.value + ' AC';
      if (e.type === 'rollReminder') return e.text;
      return '';
    }).filter(Boolean).join(', ');
    logEvent('Removed buff: ' + b.spellName + (desc ? ' (' + desc + ')' : ''));
  });
}

function dropConcentration() {
  var c = loadCharacter();
  if (!c) return;
  if (c.concentration && c.concentration.active) {
    removeLinkedBuffs(c, c.concentration.spellName);
    logEvent('Dropped concentration on ' + c.concentration.spellName);
  }
  c.concentration = { active: false, spellName: '' };
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function showSetConcentration() {
  var c = loadCharacter();
  var html = '<h3>Set Concentration</h3>';
  // Show known concentration spells as quick-pick buttons
  if (c) {
    var concSpells = [];
    var allSpells = (c.currentPreparedSpells || []).concat(c.cantripsKnown || []);
    if (c.class === 'Cleric') {
      var domainList = getDomainSpellList(c.level);
      allSpells = allSpells.concat(domainList);
    }
    if (c.class === 'Fighter' && c.subclass === 'Eldritch Knight') {
      allSpells = allSpells.concat(c.ekSpellsKnown || []);
    }
    // Deduplicate
    var seen = {};
    allSpells.forEach(function(name) {
      if (seen[name]) return;
      seen[name] = true;
      var sp = getSpell(name);
      if (sp && sp.duration && sp.duration.toLowerCase().indexOf('concentration') >= 0) {
        concSpells.push(name);
      }
    });
    if (concSpells.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">';
      concSpells.forEach(function(name) {
        var safeName = name.replace(/'/g, "\\'");
        html += '<button class="btn btn-secondary" style="font-size:0.85rem;padding:6px 12px" onclick="closeModal();setConcentration(\'' + safeName + '\')">' + escapeHtml(name) + '</button>';
      });
      html += '</div>';
      html += '<div class="text-dim" style="font-size:0.8rem;margin-bottom:8px">Or type a custom spell:</div>';
    }
  }
  html += '<input type="text" id="conc-spell-input" placeholder="Spell name..." onclick="event.stopPropagation()">';
  html += '<div class="confirm-actions">';
  html += '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="var v=document.getElementById(\'conc-spell-input\').value.trim();if(v){closeModal();setConcentration(v);}">Set</button></div>';
  showModal(html);
  setTimeout(function() { var el = document.getElementById('conc-spell-input'); if (el) el.focus(); }, 100);
}

function renderConcentrationBanner(c) {
  if (!c.concentration || !c.concentration.active) return '';
  var html = '<div class="conc-banner">';
  html += '<div class="conc-icon">&#10022;</div>';
  html += '<div class="conc-info">';
  html += '<div class="conc-name">Concentrating: ' + escapeHtml(c.concentration.spellName) + '</div>';
  html += '<div class="conc-hint">CON save to maintain if you take damage (DC = max of 10 or half damage taken)</div>';
  html += '<div class="conc-actions">';
  html += '<button class="btn btn-secondary" onclick="dropConcentration()">Drop</button>';
  html += '<button class="btn btn-secondary" onclick="showSetConcentration()">Change</button>';
  html += '</div></div></div>';
  return html;
}

/* ═══════════════════════════════════════════
   CONDITIONS TRACKER
   ═══════════════════════════════════════════ */

var CONDITIONS = [
  { name: 'Blinded', desc: "Can't see. Auto-fail sight checks. Attacks have disadvantage. Attacks against you have advantage." },
  { name: 'Charmed', desc: "Can't attack the charmer. Charmer has advantage on social checks against you." },
  { name: 'Deafened', desc: "Can't hear. Auto-fail hearing checks." },
  { name: 'Frightened', desc: "Disadvantage on ability checks and attacks while source is in line of sight. Can't willingly move closer." },
  { name: 'Grappled', desc: "Speed becomes 0. Ends if grappler is incapacitated or you're moved out of reach." },
  { name: 'Incapacitated', desc: "Can't take actions or reactions." },
  { name: 'Invisible', desc: "Impossible to see without magic. Advantage on attacks. Attacks against you have disadvantage." },
  { name: 'Paralyzed', desc: "Incapacitated. Can't move or speak. Auto-fail STR/DEX saves. Attacks have advantage. Hits within 5ft are auto-crits." },
  { name: 'Petrified', desc: "Turned to stone. Incapacitated. Unaware. Weight \u00d710. Auto-fail STR/DEX saves. Resistance to all damage." },
  { name: 'Poisoned', desc: "Disadvantage on attack rolls and ability checks." },
  { name: 'Prone', desc: "Disadvantage on attacks. Melee within 5ft has advantage against you. Ranged beyond 5ft has disadvantage. Stand up costs half movement." },
  { name: 'Restrained', desc: "Speed 0. Attacks have disadvantage. Attacks against you have advantage. Disadvantage on DEX saves." },
  { name: 'Stunned', desc: "Incapacitated. Can't move. Speak only falteringly. Auto-fail STR/DEX saves. Attacks against you have advantage." },
  { name: 'Unconscious', desc: "Incapacitated. Can't move or speak. Unaware. Drop held items. Fall prone. Auto-fail STR/DEX saves. Attacks have advantage. Hits within 5ft are auto-crits." }
];

function getConditionDesc(name) {
  var found = CONDITIONS.find(function(c) { return c.name === name; });
  return found ? found.desc : '';
}

function renderActiveConditions(c) {
  var conds = c.activeConditions || [];
  if (conds.length === 0) return '';
  var html = '<div class="cond-badges">';
  conds.forEach(function(cn) {
    var safeName = cn.replace(/'/g, "\\'");
    var safeDesc = getConditionDesc(cn).replace(/'/g, "\\'");
    html += '<span class="cond-badge" onclick="event.stopPropagation();showBadgePopover(\'' + safeName + '\',\'' + safeDesc + '\',event)">' + escapeHtml(cn) + ' <span class="cb-x" onclick="event.stopPropagation();removeCondition(\'' + safeName + '\')">\u00d7</span></span>';
  });
  html += '</div>';
  return html;
}

function showConditionsPanel() {
  var c = loadCharacter();
  if (!c) return;
  var active = c.activeConditions || [];
  var html = '<h3>Conditions</h3>';
  html += '<div class="cond-panel-grid">';
  CONDITIONS.forEach(function(cond) {
    var isActive = active.indexOf(cond.name) >= 0;
    html += '<label class="cond-toggle' + (isActive ? ' active' : '') + '">';
    html += '<input type="checkbox"' + (isActive ? ' checked' : '') + ' onchange="toggleConditionFromPanel(\'' + escapeHtml(cond.name) + '\',this.checked)">';
    html += '<div><strong>' + escapeHtml(cond.name) + '</strong><br><span class="text-dim" style="font-size:0.75rem">' + escapeHtml(cond.desc) + '</span></div>';
    html += '</label>';
  });
  html += '</div>';
  html += '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>';
  showModal(html);
}

function toggleConditionFromPanel(name, checked) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.activeConditions) c.activeConditions = [];
  if (checked && c.activeConditions.indexOf(name) < 0) {
    c.activeConditions.push(name);
    logEvent('Condition added: ' + name);
  } else if (!checked) {
    c.activeConditions = c.activeConditions.filter(function(cn) { return cn !== name; });
    logEvent('Condition removed: ' + name);
  }
  saveCurrentCharacter(c);
  // Don't close modal - let them toggle multiple
  // Surgically update the HUD strip badges
  updateHudStrip(c);
}

function removeCondition(name) {
  var c = loadCharacter();
  if (!c) return;
  c.activeConditions = (c.activeConditions || []).filter(function(cn) { return cn !== name; });
  logEvent('Condition removed: ' + name);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   EXTERNAL BUFFS
   ═══════════════════════════════════════════ */

function showAddBuff() {
  var html = '<h3>Add Buff</h3>';
  html += '<p class="text-dim" style="font-size:0.85rem;margin-bottom:12px">Preset spells:</p>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">';
  Object.keys(SPELL_BUFF_EFFECTS).forEach(function(name) {
    var safeName = name.replace(/'/g, "\\'");
    html += '<button class="btn btn-secondary" style="font-size:0.8rem;padding:5px 10px" onclick="addExternalBuff(\'' + safeName + '\')">' + escapeHtml(name) + '</button>';
  });
  html += '</div>';
  html += '<div class="text-dim" style="font-size:0.8rem;margin-bottom:6px">Or add a custom buff:</div>';
  html += '<div style="text-align:left">';
  html += '<input type="text" id="cb-name" placeholder="Name (e.g., Bardic Inspiration)" onclick="event.stopPropagation()" style="width:100%;margin-bottom:6px;box-sizing:border-box">';
  html += '<div style="display:flex;gap:8px;margin-bottom:6px">';
  html += '<div style="flex:1"><label style="font-size:0.7rem;color:var(--text-dim)">AC Bonus</label><input type="number" id="cb-ac" value="0" min="0" onclick="event.stopPropagation()" style="width:100%;box-sizing:border-box"></div>';
  html += '<div style="flex:1"><label style="font-size:0.7rem;color:var(--text-dim)">Roll Bonus Dice</label><input type="text" id="cb-dice" placeholder="e.g., 1d4" onclick="event.stopPropagation()" style="width:100%;box-sizing:border-box"></div>';
  html += '</div>';
  html += '<div id="cb-applies-row" style="display:none;margin-bottom:6px"><label style="font-size:0.7rem;color:var(--text-dim)">Applies to:</label><div style="display:flex;gap:8px;margin-top:2px">';
  html += '<label style="font-size:0.8rem"><input type="checkbox" id="cb-atk" checked> Attacks</label>';
  html += '<label style="font-size:0.8rem"><input type="checkbox" id="cb-sav" checked> Saves</label>';
  html += '<label style="font-size:0.8rem"><input type="checkbox" id="cb-chk" checked> Checks</label>';
  html += '</div></div>';
  html += '<input type="text" id="cb-reminder" placeholder="Reminder text (optional)" onclick="event.stopPropagation()" style="width:100%;margin-bottom:6px;box-sizing:border-box">';
  html += '</div>';
  html += '<div class="confirm-actions" style="margin-top:10px">';
  html += '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="addCustomBuff()">Add Custom</button></div>';
  showModal(html);
  // Show appliesTo row when dice is entered
  setTimeout(function() {
    var diceEl = document.getElementById('cb-dice');
    if (diceEl) diceEl.addEventListener('input', function() {
      var row = document.getElementById('cb-applies-row');
      if (row) row.style.display = this.value.trim() ? '' : 'none';
    });
  }, 50);
}

function addCustomBuff() {
  var name = (document.getElementById('cb-name').value || '').trim();
  if (!name) return;
  var acBonus = parseInt(document.getElementById('cb-ac').value) || 0;
  var dice = (document.getElementById('cb-dice').value || '').trim();
  var reminder = (document.getElementById('cb-reminder').value || '').trim();
  var effects = [];
  if (acBonus > 0) effects.push({ type: 'acBonus', value: acBonus });
  if (dice) {
    var appliesTo = [];
    if (document.getElementById('cb-atk').checked) appliesTo.push('attacks');
    if (document.getElementById('cb-sav').checked) appliesTo.push('saves');
    if (document.getElementById('cb-chk').checked) appliesTo.push('checks');
    effects.push({ type: 'rollReminder', text: '+' + dice, rollBonus: { dice: dice, appliesTo: appliesTo } });
  }
  if (reminder) effects.push({ type: 'reminder', text: reminder });
  if (effects.length === 0) effects.push({ type: 'reminder', text: name });
  var c = loadCharacter();
  if (!c) return;
  if (!c.externalBuffs) c.externalBuffs = [];
  if (c.externalBuffs.length >= 5) {
    closeModal();
    showModal('<h3>Max Buffs</h3><p>Remove a buff first (max 5).</p><div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">OK</button></div>');
    return;
  }
  c.externalBuffs.push({ spellName: name, effects: effects, custom: true });
  var desc = effects.map(function(e) {
    if (e.type === 'acBonus') return '+' + e.value + ' AC';
    if (e.type === 'rollReminder') return e.text;
    if (e.type === 'reminder') return e.text;
    return '';
  }).filter(Boolean).join(', ');
  logEvent('Added custom buff: ' + name + (desc ? ' (' + desc + ')' : ''));
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function addExternalBuff(spellName) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.externalBuffs) c.externalBuffs = [];
  if (c.externalBuffs.length >= 5) {
    closeModal();
    showModal('<h3>Max Buffs Reached</h3><p>Remove an existing buff before adding more (max 5).</p><div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">OK</button></div>');
    return;
  }
  var effects = SPELL_BUFF_EFFECTS[spellName] || [{ type: 'reminder', text: spellName }];
  c.externalBuffs.push({ spellName: spellName, effects: effects });
  var desc = effects.map(function(e) {
    if (e.type === 'acBonus') return '+' + e.value + ' AC';
    if (e.type === 'rollReminder') return e.text;
    if (e.type === 'reminder') return e.text;
    return '';
  }).filter(Boolean).join(', ');
  logEvent('Added external buff: ' + spellName + (desc ? ' (' + desc + ')' : ''));
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function removeExternalBuff(idx) {
  var c = loadCharacter();
  if (!c || !c.externalBuffs) return;
  var removed = c.externalBuffs[idx];
  if (removed) logEvent('Removed external buff: ' + removed.spellName);
  c.externalBuffs.splice(idx, 1);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function renderExternalBuffBadges(c) {
  var buffs = c.externalBuffs || [];
  if (buffs.length === 0) return '';
  var html = '<div class="ext-buff-row">';
  buffs.forEach(function(buff, idx) {
    var desc = (buff.effects || []).map(function(e) {
      if (e.type === 'acBonus') return '+' + e.value + ' AC';
      if (e.type === 'acMinimum') return 'Min AC ' + e.value;
      if (e.type === 'rollReminder') return e.text;
      if (e.type === 'reminder') return e.text;
      return '';
    }).filter(Boolean).join(', ');
    var safeName = buff.spellName.replace(/'/g, "\\'");
    var safeDesc = desc.replace(/'/g, "\\'");
    html += '<span class="ext-buff-badge" onclick="event.stopPropagation();showBadgePopover(\'' + safeName + '\',\'' + safeDesc + '\',event)">';
    html += '\u2728 ' + escapeHtml(buff.spellName);
    html += ' <span class="eb-x" onclick="event.stopPropagation();removeExternalBuff(' + idx + ')">\u00d7</span></span>';
  });
  html += '</div>';
  return html;
}

/* ═══════════════════════════════════════════
   COMBAT MODE
   ═══════════════════════════════════════════ */

var combatModeOn = false;

function toggleCombatMode() {
  combatModeOn = !combatModeOn;
  localStorage.setItem('dnd_combatMode', combatModeOn ? '1' : '0');
  applyCombatMode();
}

function applyCombatMode() {
  var container = document.getElementById('dashboard-content');
  if (!container) return;
  if (combatModeOn) {
    container.classList.add('combat-mode-on');
    container.querySelectorAll('.combat-hide').forEach(function(el) { el.classList.add('combat-hidden'); });
    container.querySelectorAll('.combat-show').forEach(function(el) { el.classList.remove('combat-hidden'); });
  } else {
    container.classList.remove('combat-mode-on');
    container.querySelectorAll('.combat-hide').forEach(function(el) { el.classList.remove('combat-hidden'); });
  }
  // Auto-expand session log in combat mode (dice rollers replaced by HUD quick actions)
  var combatDetails = container.querySelectorAll('.combat-show .dice-rolls-outer');
  combatDetails.forEach(function(d) { if (combatModeOn) d.open = true; });
  var btn = document.getElementById('combat-mode-btn');
  if (btn) btn.classList.toggle('active', combatModeOn);
}

/* ═══════════════════════════════════════════
   LONG PRESS QUICK INFO (TOOLTIPS)
   ═══════════════════════════════════════════ */

var lpTimer = null;
var activeTooltip = null;

var ABILITY_TIPS = {
  str: 'Strength \u2014 Athletics, melee attacks, carrying capacity, grappling, breaking objects.',
  dex: 'Dexterity \u2014 Acrobatics, Stealth, Sleight of Hand, initiative, AC, ranged attacks, finesse weapons, DEX saves.',
  con: 'Constitution \u2014 Hit points, CON saves (concentration, poison, endurance). No skills use CON.',
  int: 'Intelligence \u2014 Arcana, History, Investigation, Nature, Religion. Wizard/AT spellcasting.',
  wis: 'Wisdom \u2014 Insight, Medicine, Perception, Survival, Animal Handling. Cleric/Monk spellcasting.',
  cha: 'Charisma \u2014 Deception, Intimidation, Performance, Persuasion. Paladin/Bard/Sorcerer/Warlock spellcasting.'
};

var SAVE_TIPS = {
  str: 'STR Save \u2014 Resist being pushed, grappled, or physically restrained.',
  dex: 'DEX Save \u2014 Dodge fireballs, lightning bolts, traps. Evasion makes this even better.',
  con: 'CON Save \u2014 Maintain concentration, resist poison, endure harsh conditions.',
  int: 'INT Save \u2014 Resist mind-altering magic, illusions, psychic attacks. Rare but devastating.',
  wis: 'WIS Save \u2014 Resist charm, fear, and enchantment effects. Very common save target.',
  cha: 'CHA Save \u2014 Resist banishment, possession, and force of personality effects.'
};

function showTooltip(text, x, y) {
  hideTooltip();
  var tip = document.createElement('div');
  tip.className = 'lp-tooltip';
  tip.innerHTML = text;
  document.body.appendChild(tip);
  // Position
  var rect = tip.getBoundingClientRect();
  var left = Math.min(x, window.innerWidth - rect.width - 10);
  var top = y - rect.height - 10;
  if (top < 10) top = y + 20;
  tip.style.left = Math.max(10, left) + 'px';
  tip.style.top = top + 'px';
  activeTooltip = tip;
  // Dismiss on tap anywhere
  setTimeout(function() {
    document.addEventListener('touchstart', hideTooltip, { once: true });
    document.addEventListener('click', hideTooltip, { once: true });
  }, 50);
}

function hideTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

function setupLongPress() {
  // Ability cards
  document.querySelectorAll('.ability-card').forEach(function(el) {
    var abName = el.querySelector('.ab-name');
    if (!abName) return;
    var ab = abName.textContent.trim().toLowerCase();
    if (!ABILITY_TIPS[ab]) return;
    addLongPressHandler(el, ABILITY_TIPS[ab]);
  });
  // Save buttons
  document.querySelectorAll('.save-check-btn').forEach(function(el) {
    var abEl = el.querySelector('.sc-ab');
    if (!abEl) return;
    var ab = abEl.textContent.trim().replace(' *', '').toLowerCase();
    if (!SAVE_TIPS[ab]) return;
    addLongPressHandler(el, SAVE_TIPS[ab]);
  });
  // Slot rows
  document.querySelectorAll('.slot-row').forEach(function(el) {
    var label = el.querySelector('.slot-label');
    if (!label) return;
    addLongPressHandler(el, '<div class="tt-title">' + escapeHtml(label.textContent) + ' Slots</div>Used to cast spells of this level or upcast lower-level spells. Restored on a long rest.');
  });
}

function addLongPressHandler(el, tipText) {
  var timer;
  el.addEventListener('touchstart', function(e) {
    timer = setTimeout(function() {
      var touch = e.touches[0];
      showTooltip(tipText, touch.clientX, touch.clientY);
    }, 500);
  }, { passive: true });
  el.addEventListener('touchend', function() { clearTimeout(timer); }, { passive: true });
  el.addEventListener('touchmove', function() { clearTimeout(timer); }, { passive: true });
  // Desktop hover
  el.title = tipText.replace(/<[^>]+>/g, '');
}

/* ═══════════════════════════════════════════
   QUICK RULES REFERENCE
   ═══════════════════════════════════════════ */

function renderQuickRules() {
  var html = '<div class="dash-section combat-hide"><details class="dice-rolls-outer"><summary>Quick Rules Reference</summary>';

  html += '<details class="rules-card"><summary>Actions in Combat</summary><div class="rules-card-body"><ul>';
  html += '<li><strong>Attack:</strong> Make one melee or ranged attack (or more with Extra Attack)</li>';
  html += '<li><strong>Cast a Spell:</strong> Cast with casting time of 1 action</li>';
  html += '<li><strong>Dash:</strong> Double your movement speed for the turn</li>';
  html += '<li><strong>Disengage:</strong> Movement doesn\u2019t provoke opportunity attacks</li>';
  html += '<li><strong>Dodge:</strong> Attacks against you have disadvantage. Advantage on DEX saves.</li>';
  html += '<li><strong>Help:</strong> Give ally advantage on next check or attack</li>';
  html += '<li><strong>Hide:</strong> Make a Stealth check to become hidden</li>';
  html += '<li><strong>Ready:</strong> Set a trigger and reaction</li>';
  html += '<li><strong>Search:</strong> Make Perception or Investigation check</li>';
  html += '<li><strong>Use an Object:</strong> Interact with a second object (first is free)</li>';
  html += '</ul></div></details>';

  html += '<details class="rules-card"><summary>Bonus Actions</summary><div class="rules-card-body">';
  html += '<p>You get one per turn \u2014 it\u2019s NOT a second action. Only specific features/spells grant bonus actions.</p>';
  html += '<p><strong>Common:</strong> Offhand attack (TWF), Cunning Action (Rogue), Martial Arts strike (Monk), Spiritual Weapon attack, Healing Word.</p>';
  html += '</div></details>';

  html += '<details class="rules-card"><summary>Reactions</summary><div class="rules-card-body">';
  html += '<p>One per round (resets at start of your turn).</p>';
  html += '<p><strong>Common:</strong> Opportunity Attack, Shield, Uncanny Dodge, Counterspell.</p>';
  html += '</div></details>';

  html += '<details class="rules-card"><summary>Cover</summary><div class="rules-card-body"><ul>';
  html += '<li><strong>Half cover:</strong> +2 AC and DEX saves (low wall, furniture, creature)</li>';
  html += '<li><strong>Three-quarters:</strong> +5 AC and DEX saves (portcullis, arrow slit, thick tree)</li>';
  html += '<li><strong>Full cover:</strong> Can\u2019t be targeted directly</li>';
  html += '</ul></div></details>';

  html += '<details class="rules-card"><summary>Falling Damage</summary><div class="rules-card-body">';
  html += '<p>1d6 bludgeoning per 10 feet fallen. Maximum 20d6 (200 feet).</p>';
  html += '</div></details>';

  html += '<details class="rules-card"><summary>Grappling</summary><div class="rules-card-body"><ul>';
  html += '<li>Action: Athletics check vs target\u2019s Athletics or Acrobatics (their choice)</li>';
  html += '<li>Target must be no more than one size larger</li>';
  html += '<li>Success: target\u2019s speed becomes 0</li>';
  html += '<li>Escape: target uses action, Athletics or Acrobatics vs your Athletics</li>';
  html += '</ul></div></details>';

  html += '<details class="rules-card"><summary>Shoving</summary><div class="rules-card-body"><ul>';
  html += '<li>Action: Athletics check vs target\u2019s Athletics or Acrobatics</li>';
  html += '<li>Target must be no more than one size larger</li>';
  html += '<li>Success: knock prone OR push 5 feet away</li>';
  html += '</ul></div></details>';

  html += '<details class="rules-card"><summary>Two-Weapon Fighting</summary><div class="rules-card-body"><ul>';
  html += '<li>Must hold a light weapon in each hand</li>';
  html += '<li>Attack action with one \u2192 bonus action attack with the other</li>';
  html += '<li>Don\u2019t add ability mod to bonus attack damage (unless TWF style)</li>';
  html += '</ul></div></details>';

  html += '<details class="rules-card"><summary>Opportunity Attacks</summary><div class="rules-card-body"><ul>';
  html += '<li>Reaction when hostile creature moves out of your reach</li>';
  html += '<li>One melee attack</li>';
  html += '<li>Disengage prevents opportunity attacks</li>';
  html += '</ul></div></details>';

  html += '<details class="rules-card"><summary>Difficult Terrain</summary><div class="rules-card-body">';
  html += '<p>Every foot costs 2 feet of movement. Examples: rubble, mud, heavy undergrowth, stairs, snow, shallow water.</p>';
  html += '</div></details>';

  html += '</details></div>';
  return html;
}

/* ═══════════════════════════════════════════
   SPELL SLOT SPENDING FROM SPELL CARDS
   ═══════════════════════════════════════════ */

function showCastSpellPrompt(spellName, rollType) {
  var c = loadCharacter();
  if (!c) return;
  var spell = getSpell(spellName);
  if (!spell) { doSpellRoll(spellName, rollType); return; }
  // Cantrips: no slot needed
  if (spell.level === 0) { doSpellRoll(spellName, rollType); return; }
  // Get available slots
  var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  var slots = c.spellSlots || {};
  if (c.class === 'Fighter' && c.subclass === 'Eldritch Knight') slots = c.ekSpellSlots || {};
  var html = '<h3>Cast ' + escapeHtml(spellName) + '</h3>';
  html += '<p class="text-dim" style="font-size:0.85rem;margin-bottom:12px">Cast at what level?</p>';
  var hasSlot = false;
  for (var lvl = spell.level; lvl <= 9; lvl++) {
    var total = slots[lvl] || 0;
    if (total === 0) continue;
    var used = 0;
    if (c.class === 'Fighter' && c.subclass === 'Eldritch Knight') {
      used = (c.ekSlotsUsed && c.ekSlotsUsed[lvl]) || 0;
    } else {
      used = (c.spellSlotsUsed && c.spellSlotsUsed[lvl]) || 0;
    }
    var remaining = total - used;
    var disabled = remaining <= 0 ? ' disabled style="opacity:0.4"' : '';
    html += '<button class="btn btn-primary" style="width:100%;margin-bottom:6px;padding:12px"' + disabled + ' onclick="castSpellAtLevel(\'' + escapeHtml(spellName) + '\',\'' + rollType + '\',' + lvl + ')">';
    html += ordinal(lvl) + ' Level \u2014 ' + remaining + '/' + total + ' slots';
    html += '</button>';
    if (remaining > 0) hasSlot = true;
  }
  if (!hasSlot) html += '<p class="text-dim" style="text-align:center">No spell slots remaining!</p>';
  html += '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>';
  showModal(html);
}

function castSpellAtLevel(spellName, rollType, castLevel) {
  var c = loadCharacter();
  if (!c) return;
  // Spend the slot
  if (c.class === 'Fighter' && c.subclass === 'Eldritch Knight') {
    if (!c.ekSlotsUsed) c.ekSlotsUsed = {};
    c.ekSlotsUsed[castLevel] = (c.ekSlotsUsed[castLevel] || 0) + 1;
  } else {
    if (!c.spellSlotsUsed) c.spellSlotsUsed = {};
    c.spellSlotsUsed[castLevel] = (c.spellSlotsUsed[castLevel] || 0) + 1;
  }
  // Check if concentration spell
  var spell = getSpell(spellName);
  var _castIsConc = false;
  if (spell && spell.duration && spell.duration.toLowerCase().indexOf('concentration') >= 0) {
    if (c.concentration && c.concentration.active) {
      removeLinkedBuffs(c, c.concentration.spellName);
      logEvent('Lost concentration on ' + c.concentration.spellName);
    }
    c.concentration = { active: true, spellName: spellName };
    logEvent('Began concentrating on ' + spellName);
    _castIsConc = true;
  }
  var slotsObj = (c.class === 'Fighter' && c.subclass === 'Eldritch Knight') ? c.ekSpellSlots : c.spellSlots;
  var remaining = (slotsObj[castLevel] || 0) - ((c.class === 'Fighter' && c.subclass === 'Eldritch Knight' ? c.ekSlotsUsed : c.spellSlotsUsed)[castLevel] || 0);
  logEvent('Cast ' + spellName + ' at ' + ordinal(castLevel) + ' level (' + remaining + ' slots remaining)');
  saveCurrentCharacter(c);
  closeModal();
  // Now roll — pass castLevel for upcast damage
  doSpellRollAtLevel(spellName, rollType, castLevel);
  // Refresh dashboard after a moment, then prompt for target if concentration spell with buffs
  var _castSpellName = spellName;
  var _castWasConc = _castIsConc;
  setTimeout(function() {
    var cc = loadCharacter();
    if (cc) showDashboard(cc, true);
    if (_castWasConc) {
      var buffEffects = SPELL_BUFF_EFFECTS[_castSpellName];
      if (buffEffects && buffEffects.length > 0) {
        var safeName = _castSpellName.replace(/'/g, "\\'");
        var desc = buffEffects.map(function(e) {
          if (e.type === 'acBonus') return '+' + e.value + ' AC';
          if (e.type === 'rollReminder') return e.text;
          if (e.type === 'reminder') return e.text;
          return '';
        }).filter(Boolean).join(', ');
        showModal(
          '<h3>Are you a target of ' + escapeHtml(_castSpellName) + '?</h3>' +
          '<p class="text-dim" style="font-size:0.85rem">' + escapeHtml(desc) + '</p>' +
          '<div class="confirm-actions">' +
          '<button class="btn btn-primary" onclick="closeModal();addLinkedBuff(\'' + safeName + '\')">Yes</button>' +
          '<button class="btn btn-secondary" onclick="closeModal()">No</button></div>'
        );
      }
    }
  }, 200);
}

function doSpellRollAtLevel(spellName, rollType, castLevel) {
  // Modified version of doSpellRoll that accounts for upcast
  var char = loadCharacter();
  if (!char) return;
  var spell = getSpell(spellName);
  if (!spell) return;
  var cd = CLASS_DATA[char.class] || CLASS_DATA.Cleric;
  var castMod = mod(char.abilityScores[cd.spellcastingAbility] || char.abilityScores.wis);
  var profBonus = char.proficiencyBonus;

  if (rollType === 'attack') {
    var atkBonus = profBonus + castMod;
    var d20 = rollDie(20);
    var total = d20 + atkBonus;
    var ctx = {};
    if (d20 === 20) ctx.nat20 = true;
    else if (d20 === 1) ctx.nat1 = true;
    var spModLabel = 'prof+' + ABILITY_NAMES[cd.spellcastingAbility];
    var buffInfo = rollBuffBonuses(char, 'attacks');
    if (buffInfo.totalBonus !== 0) {
      total += buffInfo.totalBonus;
      buffInfo.results.forEach(function(r) { spModLabel += (r.subtract ? '-' : '+') + r.dice + '[' + r.roll + '] ' + r.name; });
    }
    showRollResult(spellName + ' \u2014 Attack', [d20], atkBonus + buffInfo.totalBonus, spModLabel, total, '', ctx);
    return;
  }

  if (rollType === 'damage' || rollType === 'damage-alt') {
    var diceNotation = spell.damage ? spell.damage.dice : null;
    if (!diceNotation) return;
    // Upcast: add extra dice if applicable
    if (spell.upcast && spell.upcast.dicePerLevel && castLevel > spell.level) {
      var baseParsed = parseDice(diceNotation);
      var extraParsed = parseDice(spell.upcast.dicePerLevel);
      if (baseParsed && extraParsed) {
        var extraCount = extraParsed.count * (castLevel - spell.level);
        diceNotation = (baseParsed.count + extraCount) + 'd' + baseParsed.sides;
      }
    }
    var parsed = parseDice(diceNotation);
    if (!parsed) return;
    var results = rollDice(parsed.count, parsed.sides);
    var diceTotal = results.reduce(function(a,b) { return a+b; }, 0);
    var dmgMod = spell.damage.type === 'force' && spell.name === 'Spiritual Weapon' ? castMod : 0;
    var total = diceTotal + dmgMod;
    showRollResult(spellName + ' \u2014 ' + (spell.damage.type || 'Damage'), results, dmgMod, '', total, castLevel > spell.level ? 'Upcast at ' + ordinal(castLevel) + ' level' : '', { damage: true });
    return;
  }

  if (rollType === 'healing') {
    if (!spell.healing) return;
    var isClericLife = char.class === 'Cleric' && char.subclass === 'Life Domain';
    var dolBonus = isClericLife && castLevel >= 1 ? 2 + castLevel : 0;
    var healMod = (spell.healing.mod === 'wis' ? castMod : 0) + dolBonus;
    var extraNote = dolBonus > 0 ? 'Includes +' + dolBonus + ' Disciple of Life' : '';

    // Upcast healing
    var healDice = spell.healing.dice;
    if (spell.upcast && spell.upcast.healDicePerLevel && castLevel > spell.level) {
      var hBaseParsed = parseDice(healDice);
      var hExtraParsed = parseDice(spell.upcast.healDicePerLevel);
      if (hBaseParsed && hExtraParsed) {
        var hExtra = hExtraParsed.count * (castLevel - spell.level);
        healDice = (hBaseParsed.count + hExtra) + 'd' + hBaseParsed.sides;
      }
    }

    if (spell.healing.flat) {
      var flatAmount = spell.healing.flat + dolBonus;
      showRollResult(spellName + ' \u2014 Healing', [], 0, '', flatAmount, extraNote, { healing: true });
      return;
    }
    var parsed = parseDice(healDice);
    if (!parsed) return;
    var isSupreme = char.level >= 17;
    if (isSupreme) {
      var maxDice = parsed.count * parsed.sides;
      var total = maxDice + healMod;
      extraNote += (extraNote ? '. ' : '') + 'Supreme Healing: dice maximized';
      showRollResult(spellName + ' \u2014 Healing', [], 0, '', total, extraNote, { healing: true });
      return;
    }
    var results = rollDice(parsed.count, parsed.sides);
    var diceTotal = results.reduce(function(a,b) { return a+b; }, 0);
    var total = diceTotal + healMod;
    showRollResult(spellName + ' \u2014 Healing', results, healMod, '', total, extraNote + (castLevel > spell.level ? '. Upcast at ' + ordinal(castLevel) + ' level' : ''), { healing: true });
  }
}

/* ═══════════════════════════════════════════
   PARTY VIEW
   ═══════════════════════════════════════════ */

var _partyChars = [];
var _partyPollInterval = null;
var _partyLastFetched = null;

function showPartyView() {
  showView('homescreen');
  clearPartyPoll();
  var container = document.getElementById('homescreen-content');
  container.innerHTML = '<div class="home-screen"><h1 style="color:var(--accent)">Party View</h1><p class="text-dim">Loading from cloud...</p></div>';

  var headers = getGitHubHeaders();
  if (!headers || GITHUB_CONFIG.token === '1AAP39VV4N4V5KNVKYFXO1G8FZn6PMh8PQQaulZ8qj7DB4Zv0XkbFHbxip4_Gw7qoMQWs5Mo0IT7QH2B11_tap_buhtig') {
    container.innerHTML = '<div class="home-screen"><h1 style="color:var(--accent)">Party View</h1><p class="text-dim">Connect to GitHub to see your party.</p><button class="btn btn-secondary" onclick="showHomeScreen()" style="margin-top:16px">Back</button></div>';
    return;
  }

  fetchPartyChars(headers).then(function(chars) {
    _partyChars = chars;
    _partyLastFetched = Date.now();
    renderPartyGrid(container);
    // Auto-poll every 60s
    _partyPollInterval = setInterval(function() {
      fetchPartyChars(headers).then(function(chars) {
        _partyChars = chars;
        _partyLastFetched = Date.now();
        // Only re-render if we're still on party grid (not detail)
        var el = document.getElementById('pv-grid-view');
        if (el) renderPartyGrid(container);
      }).catch(function() {});
    }, 60000);
  }).catch(function(err) {
    container.innerHTML = '<div class="home-screen"><h1 style="color:var(--accent)">Party View</h1><p class="text-dim">Failed to load: ' + escapeHtml(err.message) + '</p><button class="btn btn-secondary" onclick="showHomeScreen()" style="margin-top:16px">Back</button></div>';
  });
}

function fetchPartyChars(headers) {
  return fetch(ghApiUrl('characters'), { headers: headers })
    .then(function(res) { return res.json(); })
    .then(function(files) {
      if (!Array.isArray(files)) throw new Error('Not an array');
      var promises = files.filter(function(f) { return f.name.endsWith('.json'); }).map(function(f) {
        return fetch(ghApiUrl('characters/' + f.name), { headers: headers })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            try {
              var json = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
              return JSON.parse(json);
            } catch(e) { return null; }
          }).catch(function() { return null; });
      });
      return Promise.all(promises);
    })
    .then(function(chars) { return chars.filter(Boolean).map(migrateCharacter); });
}

function renderPartyGrid(container) {
  var chars = _partyChars;
  var html = '<div class="home-screen" id="pv-grid-view"><h1 style="color:var(--accent)">Party View</h1>';
  var agoText = _partyLastFetched ? getTimeAgo(_partyLastFetched) : '';
  html += '<p class="text-dim" style="margin-bottom:16px">' + chars.length + ' character(s)' + (agoText ? ' \u2022 Last updated: ' + agoText : '') + '</p>';
  html += '<div class="pv-grid">';
  chars.forEach(function(c, idx) {
    var pvEffMax = getEffectiveMaxHp(c);
    var hpPct = pvEffMax > 0 ? (c.currentHp / pvEffMax) * 100 : 100;
    var hpClass = hpPct > 50 ? 'hp-green' : hpPct > 25 ? 'hp-yellow' : 'hp-red';
    var ac = (c.equippedItems && c.equippedItems.length > 0) ? calculateAC(c) : c.ac;
    html += '<div class="pv-card" onclick="showPartyCharDetail(' + idx + ')">';
    html += '<div class="pv-name">' + escapeHtml(c.name) + '</div>';
    var pvRace = c.subrace ? c.subrace + ' ' + c.race : c.race;
    html += '<div class="pv-detail">' + pvRace + ' ' + c.class + (c.subclass ? ' (' + c.subclass + ')' : '') + ' \u2014 Level ' + c.level + '</div>';
    var pvEffective = c.currentHp + (c.tempHp || 0);
    var pvHpText = 'HP: ' + pvEffective + ' / ' + pvEffMax;
    if (c.tempHp > 0) pvHpText += ' (' + c.currentHp + '+' + c.tempHp + ' temp)';
    var pvAcBuff = 0;
    if (c.externalBuffs) { c.externalBuffs.forEach(function(b) { (b.effects||[]).forEach(function(e) { if (e.type==='acBonus') pvAcBuff+=e.value; }); }); }
    var pvAcNote = pvAcBuff > 0 ? '(+' + pvAcBuff + ')' : '';
    html += '<div class="pv-hp ' + hpClass + '">' + pvHpText + '  \u2022  AC: ' + (ac || '?') + pvAcNote + '</div>';
    var statuses = [];
    if (c.activeConditions && c.activeConditions.length > 0) statuses = statuses.concat(c.activeConditions);
    if (c.concentration && c.concentration.active) statuses.push('Concentrating: ' + c.concentration.spellName);
    if (statuses.length > 0) html += '<div class="pv-status">' + statuses.map(function(s) { return escapeHtml(s); }).join(' \u2022 ') + '</div>';
    html += '</div>';
  });
  html += '</div>';
  html += '<div style="margin-top:20px;display:flex;gap:10px">';
  html += '<button class="btn btn-secondary" onclick="showPartyView()">Refresh</button>';
  html += '<button class="btn btn-secondary" onclick="clearPartyPoll();showHomeScreen()">Back</button>';
  html += '</div></div>';
  container.innerHTML = html;
}

function getTimeAgo(timestamp) {
  var secs = Math.floor((Date.now() - timestamp) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return secs + 's ago';
  return Math.floor(secs / 60) + 'm ago';
}

function clearPartyPoll() {
  if (_partyPollInterval) { clearInterval(_partyPollInterval); _partyPollInterval = null; }
}

function showPartyCharDetail(idx) {
  var c = _partyChars[idx];
  if (!c) return;
  var container = document.getElementById('homescreen-content');
  var ac = (c.equippedItems && c.equippedItems.length > 0) ? calculateAC(c) : c.ac;
  var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  var isCaster = cd.isCaster;
  var spellDC = isCaster ? 8 + c.proficiencyBonus + mod(c.abilityScores[cd.spellcastingAbility]) : 0;
  var spellAtk = isCaster ? c.proficiencyBonus + mod(c.abilityScores[cd.spellcastingAbility]) : 0;

  var html = '<div class="home-screen">';
  html += '<button class="btn btn-secondary" onclick="renderPartyGrid(document.getElementById(\'homescreen-content\'))" style="margin-bottom:12px">\u2190 Back to Party</button>';

  // Header
  var raceDisplay = c.subrace ? c.subrace + ' ' + c.race : c.race;
  html += '<h1 style="color:var(--accent)">' + escapeHtml(c.name) + '</h1>';
  html += '<div class="text-dim">' + raceDisplay + ' ' + c.class + (c.subclass ? ' (' + c.subclass + ')' : '') + ' \u2014 Level ' + c.level + '</div>';
  html += '<div class="text-dim" style="font-size:0.85rem">' + escapeHtml(c.background || '') + (c.alignment ? ' \u2022 ' + c.alignment : '') + '</div>';

  // HP
  var detEffMax = getEffectiveMaxHp(c);
  var effectiveHp = c.currentHp + (c.tempHp || 0);
  var hpPct = detEffMax > 0 ? (c.currentHp / detEffMax) * 100 : 100;
  var hpColor = hpPct > 50 ? 'var(--success)' : hpPct > 25 ? '#f9a825' : 'var(--error)';
  html += '<div style="text-align:center;margin:16px 0;padding:16px;background:var(--surface);border-radius:var(--radius);border:2px solid ' + hpColor + '">';
  html += '<div style="font-size:2.5rem;font-weight:bold;color:' + hpColor + '">' + effectiveHp + ' / ' + detEffMax + '</div>';
  if (c.tempHp > 0) html += '<div style="color:var(--accent);font-size:0.9rem">+' + c.tempHp + ' temp HP (' + c.currentHp + ' real + ' + c.tempHp + ' temp)</div>';
  var detailAcBuff = 0;
  if (c.externalBuffs) { c.externalBuffs.forEach(function(b) { (b.effects||[]).forEach(function(e) { if (e.type==='acBonus') detailAcBuff+=e.value; }); }); }
  var detailAcNote = detailAcBuff > 0 ? ' <span style="color:var(--accent)">(+' + detailAcBuff + ')</span>' : '';
  html += '<div style="font-size:0.85rem;color:var(--text-dim);margin-top:4px">AC: ' + (ac || '?') + detailAcNote + '</div>';
  html += '</div>';

  // Concentration & conditions
  if (c.concentration && c.concentration.active) {
    html += '<div style="padding:6px 10px;background:var(--accent-dim);border-radius:var(--radius);margin-bottom:8px;font-size:0.85rem">Concentrating: ' + escapeHtml(c.concentration.spellName) + '</div>';
  }
  if (c.activeConditions && c.activeConditions.length > 0) {
    html += '<div style="margin-bottom:8px">' + c.activeConditions.map(function(cn) { return '<span class="tag" style="font-size:0.8rem">' + escapeHtml(cn) + '</span>'; }).join(' ') + '</div>';
  }

  // Inspiration
  if (c.inspiration) html += '<div style="margin-bottom:8px"><span class="tag accent">\u2B50 Inspired</span></div>';

  // Stat grid
  html += '<div class="stat-grid">';
  html += '<div class="stat-card"><div class="stat-value">' + (ac || '?') + '</div><div class="stat-label">AC</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + (c.speed || 30) + ' ft</div><div class="stat-label">Speed</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + (c.initiative >= 0 ? '+' : '') + c.initiative + '</div><div class="stat-label">Initiative</div></div>';
  html += '<div class="stat-card"><div class="stat-value">+' + c.proficiencyBonus + '</div><div class="stat-label">Prof.</div></div>';
  if (isCaster) {
    html += '<div class="stat-card"><div class="stat-value">' + spellDC + '</div><div class="stat-label">Spell DC</div></div>';
    html += '<div class="stat-card"><div class="stat-value">+' + spellAtk + '</div><div class="stat-label">Spell Atk</div></div>';
  }
  html += '</div>';

  // Ability Scores
  html += '<h3 style="margin-top:16px">Ability Scores</h3><div class="ability-row-dash">';
  ABILITIES.forEach(function(ab) {
    html += '<div class="ability-card"><div class="ab-name">' + ABILITY_NAMES[ab] + '</div>';
    html += '<div class="ab-mod">' + modStr(c.abilityScores[ab]) + '</div>';
    html += '<div class="ab-score">' + c.abilityScores[ab] + '</div></div>';
  });
  html += '</div>';

  // Saving Throws
  html += '<h3 style="margin-top:12px">Saving Throws</h3><div>';
  (c.savingThrows || []).forEach(function(st) {
    var bonus = mod(c.abilityScores[st]) + c.proficiencyBonus;
    html += '<span class="tag accent">' + ABILITY_NAMES[st] + ' +' + bonus + '</span> ';
  });
  html += '</div>';

  // Skills
  html += '<h3 style="margin-top:12px">Skills</h3><div style="display:flex;flex-wrap:wrap;gap:4px">';
  (c.skillProficiencies || []).forEach(function(sk) {
    var skill = SKILLS.find(function(s) { return s.name.toLowerCase() === sk.toLowerCase(); });
    if (!skill) return;
    var isExp = c.expertiseSkills && c.expertiseSkills.indexOf(sk.toLowerCase()) >= 0;
    var bonus = mod(c.abilityScores[skill.ability]) + c.proficiencyBonus * (isExp ? 2 : 1);
    html += '<span class="tag accent">' + skill.name + ' +' + bonus + (isExp ? ' (E)' : '') + '</span>';
  });
  html += '</div>';

  // Class resources
  if (c.class === 'Cleric') {
    var cdMax = c.channelDivinityUses || 1;
    var cdUsed = c.channelDivinityUsed || 0;
    html += '<h3 style="margin-top:12px">Channel Divinity</h3><div class="text-dim" style="font-size:0.85rem">' + (cdMax - cdUsed) + '/' + cdMax + ' remaining</div>';
  }
  if (c.resources) {
    Object.keys(c.resources).forEach(function(key) {
      var r = c.resources[key];
      var remaining = (r.max || 0) - (r.used || 0);
      var displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, function(s) { return s.toUpperCase(); });
      html += '<div class="text-dim" style="font-size:0.85rem;margin-top:4px">' + displayName + ': ' + remaining + '/' + r.max + '</div>';
    });
  }

  // Spell Slots
  if (isCaster && c.spellSlots && Object.keys(c.spellSlots).length > 0) {
    html += '<h3 style="margin-top:12px">Spell Slots</h3>';
    Object.entries(c.spellSlots).forEach(function(entry) {
      var level = entry[0], count = entry[1];
      var used = (c.spellSlotsUsed && c.spellSlotsUsed[level]) || 0;
      html += '<div style="font-size:0.85rem;color:var(--text-dim)">' + ordinal(parseInt(level)) + ': ' + (count - used) + '/' + count + '</div>';
    });
  }

  // Cantrips
  if (c.cantripsKnown && c.cantripsKnown.length > 0) {
    html += '<h3 style="margin-top:12px">Cantrips</h3><div style="display:flex;flex-wrap:wrap;gap:4px">';
    c.cantripsKnown.forEach(function(name) { html += '<span class="tag">' + escapeHtml(name) + '</span>'; });
    html += '</div>';
  }

  // Prepared / Known Spells
  var spellList = c.currentPreparedSpells || c.ekSpellsKnown || [];
  if (spellList.length > 0) {
    var spellLabel = c.currentPreparedSpells ? 'Prepared Spells' : 'Known Spells';
    html += '<h3 style="margin-top:12px">' + spellLabel + '</h3><div style="display:flex;flex-wrap:wrap;gap:4px">';
    spellList.forEach(function(name) {
      var sp = getSpell(name);
      var lvl = sp ? sp.level : '?';
      html += '<span class="tag">' + escapeHtml(name) + ' <span class="text-dim">(L' + lvl + ')</span></span>';
    });
    html += '</div>';
  }

  // Domain Spells
  if (c.class === 'Cleric') {
    var domainList = getDomainSpellList(c.level);
    if (domainList.length > 0) {
      html += '<h3 style="margin-top:12px">Domain Spells</h3><div style="display:flex;flex-wrap:wrap;gap:4px">';
      domainList.forEach(function(name) { html += '<span class="tag accent">' + escapeHtml(name) + '</span>'; });
      html += '</div>';
    }
  }

  // Weapons
  if (c.weapons && c.weapons.length > 0) {
    html += '<h3 style="margin-top:12px">Weapons</h3>';
    c.weapons.forEach(function(w) {
      var abilMod = mod(c.abilityScores[w.ability] || 10);
      var profB = w.proficient ? c.proficiencyBonus : 0;
      var magB = w.magicBonus || 0;
      var atkTotal = abilMod + profB + magB;
      var dmgTotal = abilMod + magB;
      html += '<div style="font-size:0.85rem;margin-bottom:4px"><strong>' + escapeHtml(w.name) + '</strong> +' + atkTotal + ' to hit, ' + w.damage + (dmgTotal >= 0 ? '+' : '') + dmgTotal + ' ' + w.damageType + '</div>';
    });
  }

  // Features
  if (c.features && c.features.length > 0) {
    html += '<h3 style="margin-top:12px">Features</h3><ul class="feature-list">';
    c.features.forEach(function(f) { html += '<li>' + f + '</li>'; });
    html += '</ul>';
  }

  html += '<button class="btn btn-secondary" onclick="renderPartyGrid(document.getElementById(\'homescreen-content\'))" style="margin-top:20px">\u2190 Back to Party</button>';
  html += '</div>';
  container.innerHTML = html;
}

