// rolls.js — Dice engine, roll display, weapon rolls, ability checks, skill rolls
/* ═══════════════════════════════════════════
   DICE ENGINE
   ═══════════════════════════════════════════ */

let rollTimeout = null;

function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

// Collect and roll applicable buff bonuses for a roll type ('attacks', 'saves', 'checks')
function rollBuffBonuses(char, rollType) {
  var results = []; // { name, dice, roll, subtract }
  var totalBonus = 0;
  if (!char || !char.externalBuffs) return { results: results, totalBonus: totalBonus };
  char.externalBuffs.forEach(function(buff) {
    (buff.effects || []).forEach(function(eff) {
      if (eff.rollBonus && eff.rollBonus.dice) {
        var applies = eff.rollBonus.appliesTo || ['attacks', 'saves', 'checks'];
        if (applies.indexOf(rollType) >= 0) {
          var parsed = parseDice(eff.rollBonus.dice);
          if (parsed) {
            var diceResults = rollDice(parsed.count, parsed.sides);
            var diceTotal = diceResults.reduce(function(a, b) { return a + b; }, 0);
            var subtract = eff.rollBonus.subtract || false;
            results.push({ name: buff.spellName, dice: eff.rollBonus.dice, roll: diceTotal, subtract: subtract });
            totalBonus += subtract ? -diceTotal : diceTotal;
          }
        }
      }
    });
  });
  return { results: results, totalBonus: totalBonus };
}

function rollDice(count, sides) {
  const results = [];
  for (let i = 0; i < count; i++) results.push(rollDie(sides));
  return results;
}

function parseDice(notation) {
  // Parse "2d8", "1d4", "4d6", etc.
  const m = notation.match(/^(\d+)d(\d+)$/i);
  if (!m) return null;
  return { count: parseInt(m[1]), sides: parseInt(m[2]) };
}

function getCritRange(char) {
  if (!char || char.class !== 'Fighter' || char.subclass !== 'Champion') return 20;
  if (char.level >= 15) return 18;
  if (char.level >= 3) return 19;
  return 20;
}

function showRollResult(label, diceResults, modifier, modLabel, total, extra, rollContext) {
  var el = document.getElementById('roll-result');
  var ctx = rollContext || {};
  // Log the roll
  logEvent(label + ': ' + total);
  // Live-update session log DOM without full re-render
  var logContainer = document.querySelector('.session-log');
  if (logContainer) {
    var now = new Date();
    var _h = now.getHours(), _m = now.getMinutes();
    var _ampm = _h >= 12 ? 'PM' : 'AM';
    _h = _h % 12 || 12;
    var _timeStr = _h + ':' + (_m < 10 ? '0' : '') + _m + ' ' + _ampm;
    var _entry = document.createElement('div');
    _entry.className = 'slog-entry';
    _entry.innerHTML = '<span class="slog-time">' + _timeStr + '</span><span class="slog-text">' + escapeHtml(label + ': ' + total) + '</span>';
    logContainer.prepend(_entry);
  }
  // Update session log count in summary
  var _logSummaries = document.querySelectorAll('details.dice-rolls-outer > summary');
  _logSummaries.forEach(function(s) {
    if (s.textContent.indexOf('Session Log') >= 0) {
      var _countSpan = s.querySelector('.text-dim');
      if (_countSpan) {
        var _cur = parseInt(_countSpan.textContent.match(/\d+/)) || 0;
        _countSpan.textContent = '(' + (_cur + 1) + ')';
      }
    }
  });
  // Add to roll history
  addToRollHistory(label, total);
  // Determine CSS class
  var rollClass = '';
  var callout = '';
  if (ctx.nat20) { rollClass = 'roll-nat20'; callout = 'NAT 20!'; }
  else if (ctx.crit) { rollClass = 'roll-crit'; callout = 'CRITICAL HIT!'; }
  else if (ctx.nat1) { rollClass = 'roll-nat1'; callout = 'NAT 1\u2026'; }
  else if (ctx.healing) { rollClass = 'roll-healing'; callout = '+' + total; }
  else if (ctx.damage) { rollClass = 'roll-damage'; }

  var diceStr = diceResults.length > 0
    ? diceResults.map(function(d) { return '<span style="display:inline-block;background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 6px;margin:0 2px;font-weight:bold">' + d + '</span>'; }).join(' + ')
    : '';
  var modStrVal = modifier !== 0 ? ' ' + (modifier > 0 ? '+' : '') + modifier : '';
  var modLbl = modLabel ? ' <span style="color:var(--text-dim)">(' + modLabel + ')</span>' : '';

  el.className = 'roll-result ' + rollClass;
  el.innerHTML =
    '<button class="roll-dismiss" onclick="hideRollResult()">&times;</button>' +
    '<div class="roll-label">' + label + '</div>' +
    (callout && !ctx.healing ? '<div class="roll-callout">' + callout + '</div>' : '') +
    '<div class="roll-total">' + total + '</div>' +
    (ctx.healing ? '<div class="roll-callout">' + callout + '</div>' : '') +
    '<div class="roll-breakdown">' + diceStr + (modStrVal ? ' ' + modStrVal : '') + modLbl + (extra ? '<br>' + extra : '') + '</div>' +
    renderRollHistoryHTML() +
    '<div class="roll-actions">' +
    '<button class="btn btn-secondary" style="font-size:0.8rem;padding:6px 14px;min-height:36px" onclick="hideRollResult()">Dismiss</button></div>';
  el.classList.remove('hidden');

  // No auto-dismiss — stays until dismissed, new roll, or tap outside
  clearTimeout(rollTimeout);
}

function hideRollResult() {
  var el = document.getElementById('roll-result');
  el.classList.add('hidden');
  el.className = 'roll-result hidden';
  clearTimeout(rollTimeout);
}

function doSpellRoll(spellName, rollType) {
  const char = loadCharacter();
  if (!char) return;
  const spell = getSpell(spellName);
  if (!spell) return;

  var cd = CLASS_DATA[char.class] || CLASS_DATA.Cleric;
  const castMod = getEffectiveMod(char, cd.spellcastingAbility || 'wis');
  const profBonus = char.proficiencyBonus;
  const isSupremeHealing = char.class === 'Cleric' && char.subclass === 'Life Domain' && char.level >= 17;

  if (rollType === 'attack') {
    const atkBonus = profBonus + castMod;
    const d20 = rollDie(20);
    const total = d20 + atkBonus;
    var ctx = {};
    if (d20 === 20) ctx.nat20 = true;
    else if (d20 === 1) ctx.nat1 = true;
    showRollResult(spellName + ' — Attack', [d20], atkBonus, 'prof+' + ABILITY_NAMES[cd.spellcastingAbility], total, '', ctx);
    return;
  }

  if (rollType === 'damage' || rollType === 'damage-alt') {
    let diceNotation = spell.damage ? spell.damage.dice : null;
    if (!diceNotation) return;

    // Handle cantrip scaling
    if (spell.level === 0 && spell.scaling) {
      const lvls = Object.keys(spell.scaling).map(Number).sort((a,b) => b - a);
      for (const l of lvls) { if (char.level >= l) { diceNotation = spell.scaling[l]; break; } }
    }
    // Handle alt dice (Toll the Dead d12 variant)
    if (rollType === 'damage-alt' && spell.damage.altDice) {
      diceNotation = spell.damage.altDice;
      if (spell.altScaling) {
        const lvls = Object.keys(spell.altScaling).map(Number).sort((a,b) => b - a);
        for (const l of lvls) { if (char.level >= l) { diceNotation = spell.altScaling[l]; break; } }
      }
    }

    const parsed = parseDice(diceNotation);
    if (!parsed) return;
    const results = rollDice(parsed.count, parsed.sides);
    const diceTotal = results.reduce((a,b) => a+b, 0);
    const dmgMod = spell.damage.type === 'force' && spell.name === 'Spiritual Weapon' ? castMod : 0;
    const total = diceTotal + dmgMod;
    const modLbl = dmgMod ? ABILITY_NAMES[cd.spellcastingAbility] : '';
    showRollResult(spellName + ' — ' + (spell.damage.type || 'Damage'), results, dmgMod, modLbl, total, '', { damage: true });
    return;
  }

  if (rollType === 'healing') {
    if (!spell.healing) return;
    const slotLevel = spell.level;
    const isClericLife = char.class === 'Cleric' && char.subclass === 'Life Domain';
    const dolBonus = isClericLife && slotLevel >= 1 ? 2 + slotLevel : 0;
    let healMod = (spell.healing.mod ? castMod : 0) + dolBonus;
    let extraNote = dolBonus > 0 ? `Includes +${dolBonus} Disciple of Life` : '';

    if (spell.healing.flat) {
      const flatAmount = spell.healing.flat + dolBonus;
      showRollResult(spellName + ' — Healing', [], 0, '', flatAmount, extraNote, { healing: true });
      return;
    }

    const parsed = parseDice(spell.healing.dice);
    if (!parsed) return;

    if (isSupremeHealing) {
      const maxDice = parsed.count * parsed.sides;
      const total = maxDice + healMod;
      extraNote += (extraNote ? '. ' : '') + 'Supreme Healing: dice maximized';
      showRollResult(spellName + ' — Healing', [], 0, '', total, extraNote, { healing: true });
      return;
    }

    const results = rollDice(parsed.count, parsed.sides);
    const diceTotal = results.reduce((a,b) => a+b, 0);
    const total = diceTotal + healMod;
    const modParts = [];
    if (spell.healing.mod) modParts.push(ABILITY_NAMES[cd.spellcastingAbility]);
    if (dolBonus > 0) modParts.push('DoL');
    showRollResult(spellName + ' — Healing', results, healMod, modParts.join('+'), total, extraNote, { healing: true });
  }
}

function doWeaponRoll(idx, rollType) {
  const char = loadCharacter();
  if (!char || !char.weapons || !char.weapons[idx]) return;
  const w = char.weapons[idx];
  const abilMod = getEffectiveMod(char, w.ability || 'str');
  const profBonus = w.proficient ? char.proficiencyBonus : 0;
  const magB = w.magicBonus || 0;
  const critMin = getCritRange(char);

  // Fighter Fighting Style bonuses
  var fsAtkBonus = 0, fsDmgBonus = 0, fsNote = '';
  if (char.class === 'Fighter') {
    var styles = [char.fightingStyle, char.fightingStyle2].filter(Boolean);
    var isRanged = w.ability === 'dex' && w.range && w.range !== 'melee';
    // Archery: +2 to attack rolls with ranged weapons
    if (styles.indexOf('Archery') >= 0 && isRanged) {
      fsAtkBonus += 2;
    }
    // Dueling: +2 damage with one-handed melee (no other weapon in other hand)
    // We approximate: if weapon uses STR and not marked two-handed/versatile
    if (styles.indexOf('Dueling') >= 0 && !isRanged && !(w.properties && w.properties.indexOf('two-handed') >= 0)) {
      fsDmgBonus += 2;
    }
    // Great Weapon Fighting: note about rerolling 1s and 2s
    if (styles.indexOf('Great Weapon Fighting') >= 0 && w.properties && (w.properties.indexOf('two-handed') >= 0 || w.properties.indexOf('versatile') >= 0)) {
      fsNote = ' (GWF: may reroll 1s and 2s)';
    }
  }

  if (rollType === 'attack') {
    const atkBonus = abilMod + profBonus + magB + fsAtkBonus;
    const d20 = rollDie(20);
    var total = d20 + atkBonus;
    var ctx = {};
    if (d20 === 20) ctx.nat20 = true;
    else if (d20 >= critMin && critMin < 20) ctx.crit = true;
    else if (d20 === 1) ctx.nat1 = true;
    var critNote = '';
    if (critMin < 20) critNote = ' (crit range ' + critMin + '-20)';
    var modLabel = ABILITY_NAMES[w.ability] + '+prof' + (magB ? '+' + magB + ' magic' : '') + (fsAtkBonus ? '+' + fsAtkBonus + ' style' : '');
    var buffInfo = rollBuffBonuses(char, 'attacks');
    if (buffInfo.totalBonus !== 0) {
      total += buffInfo.totalBonus;
      buffInfo.results.forEach(function(r) { modLabel += (r.subtract ? '-' : '+') + r.dice + '[' + r.roll + '] ' + r.name; });
    }
    showRollResult(w.name + ' \u2014 Attack', [d20], atkBonus + buffInfo.totalBonus, modLabel, total, critNote, ctx);
  } else {
    const parsed = parseDice(w.damage);
    if (!parsed) return;
    const results = rollDice(parsed.count, parsed.sides);
    const diceTotal = results.reduce((a,b) => a+b, 0);
    const dmgMod = abilMod + magB + fsDmgBonus;
    var modLabel = ABILITY_NAMES[w.ability] + (magB ? '+' + magB + ' magic' : '') + (fsDmgBonus ? '+' + fsDmgBonus + ' style' : '');
    const total = diceTotal + dmgMod;
    showRollResult(w.name + ' — ' + (w.damageType || 'Damage'), results, dmgMod, modLabel, total, fsNote, { damage: true });
    // Rogue: Add Sneak Attack button after damage roll
    if (char.class === 'Rogue') {
      var saDice = getSneakAttackDice(char.level);
      var el = document.getElementById('roll-result');
      if (el) {
        var actionsDiv = el.querySelector('.roll-actions');
        if (actionsDiv) {
          var saBtn = document.createElement('button');
          saBtn.className = 'btn btn-primary';
          saBtn.style.cssText = 'font-size:0.8rem;padding:6px 14px;min-height:36px';
          saBtn.textContent = '+ Sneak Attack (' + saDice + 'd6)';
          saBtn.onclick = function() {
            var saResults = rollDice(saDice, 6);
            var saTotal = saResults.reduce(function(a, b) { return a + b; }, 0);
            var newTotal = total + saTotal;
            var saDiceStr = saResults.map(function(d) { return '<span style="display:inline-block;background:var(--surface);border:1px solid var(--accent);border-radius:4px;padding:2px 6px;margin:0 2px;font-weight:bold;color:var(--accent)">' + d + '</span>'; }).join(' + ');
            // Update display
            var totalEl = el.querySelector('.roll-total');
            if (totalEl) totalEl.textContent = newTotal;
            var breakdownEl = el.querySelector('.roll-breakdown');
            if (breakdownEl) breakdownEl.innerHTML += '<br><span style="color:var(--accent)">+ Sneak Attack: </span>' + saDiceStr + ' = <strong>' + saTotal + '</strong>';
            saBtn.disabled = true;
            saBtn.textContent = 'Sneak Attack added (+' + saTotal + ')';
            saBtn.style.opacity = '0.5';
            logEvent('Sneak Attack: +' + saTotal + ' (' + saDice + 'd6). Total: ' + newTotal);
            addToRollHistory('+ Sneak Attack', saTotal);
          };
          actionsDiv.insertBefore(saBtn, actionsDiv.firstChild);
        }
      }
    }
  }
}

function doAbilityRoll(ability, isProficient, isSave) {
  isSave = isSave !== undefined ? isSave : isProficient;
  const char = loadCharacter();
  if (!char) return;
  const abilMod = getEffectiveMod(char, ability);
  var extraBonus = 0;
  var extraLabel = '';
  // Remarkable Athlete: Champion 7+ adds half prof to unproficient STR/DEX/CON checks (not saves)
  if (!isProficient && !isSave && char.class === 'Fighter' && char.subclass === 'Champion' && char.level >= 7) {
    var physAbilities = ['str', 'dex', 'con'];
    if (physAbilities.indexOf(ability) >= 0) {
      extraBonus = Math.ceil(char.proficiencyBonus / 2);
      extraLabel = '+' + extraBonus + ' RA';
    }
  }
  // Equipment save bonuses (saves only, not checks)
  var equipSaveB = isSave ? getEquipSaveBonus(char, ability) : 0;
  if (equipSaveB > 0) extraLabel += '+' + equipSaveB + ' equip';
  const bonus = abilMod + (isProficient ? char.proficiencyBonus : 0) + extraBonus + equipSaveB;
  const d20 = rollDie(20);
  var total = d20 + bonus;
  const label = ABILITY_NAMES[ability] + (isSave ? ' Save' : ' Check');
  var ctx = {};
  if (d20 === 20) ctx.nat20 = true;
  else if (d20 === 1) ctx.nat1 = true;
  var modLabel = isProficient ? ABILITY_NAMES[ability] + '+prof' : ABILITY_NAMES[ability];
  if (extraLabel) modLabel += extraLabel;
  var buffType = isSave ? 'saves' : 'checks';
  var buffInfo = rollBuffBonuses(char, buffType);
  if (buffInfo.totalBonus !== 0) {
    total += buffInfo.totalBonus;
    buffInfo.results.forEach(function(r) { modLabel += (r.subtract ? '-' : '+') + r.dice + '[' + r.roll + '] ' + r.name; });
  }
  showRollResult(label, [d20], bonus + buffInfo.totalBonus, modLabel, total, '', ctx);
}

function doSkillRoll(skillName) {
  const char = loadCharacter();
  if (!char) return;
  const skill = SKILLS.find(s => s.name === skillName);
  if (!skill) return;
  const isProficient = char.skillProficiencies.some(s => s.toLowerCase() === skillName.toLowerCase());
  const isExpertise = (char.expertiseSkills || []).some(s => s.toLowerCase() === skillName.toLowerCase());
  const abilMod = getEffectiveMod(char, skill.ability);
  var extraBonus = 0;
  var extraLabel = '';
  // Remarkable Athlete: Champion 7+ adds half prof (round up) to unproficient STR/DEX/CON checks
  if (!isProficient && !isExpertise && char.class === 'Fighter' && char.subclass === 'Champion' && char.level >= 7) {
    var physAbilities = ['str', 'dex', 'con'];
    if (physAbilities.indexOf(skill.ability) >= 0) {
      extraBonus = Math.ceil(char.proficiencyBonus / 2);
      extraLabel = '+' + extraBonus + ' RA';
    }
  }
  var profMult = isExpertise ? 2 : (isProficient ? 1 : 0);
  const bonus = abilMod + char.proficiencyBonus * profMult + extraBonus;
  // Stealth disadvantage from equipment
  // TODO: if buff system adds structured advantage tracking, check for cancellation here
  var hasStealthDisadv = false;
  if (skillName.toLowerCase() === 'stealth') {
    (char.equippedItems || []).forEach(function(item) {
      if (isItemActive(item) && item.stealthDisadvantage) hasStealthDisadv = true;
    });
  }
  var d20, d20b, diceArr;
  if (hasStealthDisadv) {
    var r1 = rollDie(20), r2 = rollDie(20);
    d20 = Math.min(r1, r2);
    diceArr = [r1, r2];
  } else {
    d20 = rollDie(20);
    diceArr = [d20];
  }
  var reliableTalentNote = '';
  // Reliable Talent: Rogue 11+, proficient skills, treat d20 below 10 as 10
  if ((isProficient || isExpertise) && char.class === 'Rogue' && char.level >= 11 && d20 < 10) {
    reliableTalentNote = 'd20: ' + d20 + ' \u2192 10 (Reliable Talent)';
    d20 = 10;
  }
  var disadvNote = hasStealthDisadv ? 'Disadvantage (equipment)' : '';
  var total = d20 + bonus;
  var ctx = {};
  if (d20 === 20) ctx.nat20 = true;
  else if (d20 === 1 && !reliableTalentNote) ctx.nat1 = true;
  var modLabel = isExpertise ? ABILITY_NAMES[skill.ability] + '+Expertise' : (isProficient ? ABILITY_NAMES[skill.ability] + '+prof' : ABILITY_NAMES[skill.ability]);
  if (extraLabel) modLabel += extraLabel;
  var buffInfo = rollBuffBonuses(char, 'checks');
  if (buffInfo.totalBonus !== 0) {
    total += buffInfo.totalBonus;
    buffInfo.results.forEach(function(r) { modLabel += (r.subtract ? '-' : '+') + r.dice + '[' + r.roll + '] ' + r.name; });
  }
  var extraNote = [reliableTalentNote, disadvNote].filter(Boolean).join(' | ');
  showRollResult(skillName, diceArr, bonus + buffInfo.totalBonus, modLabel, total, extraNote, ctx);
}

function rollSneakAttack() {
  var char = loadCharacter();
  if (!char) return;
  var dice = getSneakAttackDice(char.level);
  var results = rollDice(dice, 6);
  var total = results.reduce(function(a, b) { return a + b; }, 0);
  showRollResult('Sneak Attack', results, 0, dice + 'd6', total, '', { damage: true });
}

function doGeneralRoll() {
  const countEl = document.getElementById('gr-count');
  const sidesEl = document.getElementById('gr-sides');
  const modEl = document.getElementById('gr-mod');
  const count = parseInt(countEl.value) || 1;
  const sides = parseInt(sidesEl.value) || 20;
  const modifier = parseInt(modEl.value) || 0;
  const results = rollDice(count, sides);
  const diceTotal = results.reduce((a,b) => a+b, 0);
  const total = diceTotal + modifier;
  // Detect nat 20 / nat 1 for single d20 rolls
  var ctx = {};
  if (count === 1 && sides === 20) {
    if (results[0] === 20) ctx.nat20 = true;
    else if (results[0] === 1) ctx.nat1 = true;
  }
  showRollResult(count + 'd' + sides + (modifier ? (modifier > 0 ? '+' : '') + modifier : ''), results, modifier, '', total, '', ctx);
}

/* ═══════════════════════════════════════════
   WEAPON FORM HELPERS
   ═══════════════════════════════════════════ */

let weaponCounter = 0;

function addWeaponRow(data) {
  const container = document.getElementById('weapon-list');
  const id = weaponCounter++;
  const d = data || {};
  const row = document.createElement('div');
  row.className = 'weapon-row';
  row.id = 'weapon-row-' + id;
  row.innerHTML = `
    <div class="wf-group"><label>Name</label><input type="text" class="wf-name" value="${d.name || ''}" placeholder="Weapon name"></div>
    <div class="wf-group"><label>Ability</label><select class="wf-ability">
      <option value="str" ${d.ability === 'str' || !d.ability ? 'selected' : ''}>STR</option>
      <option value="dex" ${d.ability === 'dex' ? 'selected' : ''}>DEX</option>
    </select></div>
    <div class="wf-group"><label>Prof?</label><select class="wf-prof">
      <option value="yes" ${d.proficient !== false ? 'selected' : ''}>Yes</option>
      <option value="no" ${d.proficient === false ? 'selected' : ''}>No</option>
    </select></div>
    <div class="wf-group"><label>Damage</label><input type="text" class="wf-damage" value="${d.damage || ''}" placeholder="e.g. 1d8"></div>
    <div class="wf-group"><label>Type</label><input type="text" class="wf-dtype" value="${d.damageType || ''}" placeholder="e.g. slashing" style="width:80px"></div>
    <button class="wf-remove" onclick="this.closest('.weapon-row').remove()" title="Remove">&times;</button>
    <div class="wf-group" style="grid-column:1/-1"><label>Notes</label><input type="text" class="wf-notes" value="${d.notes || ''}" placeholder="Special properties..."></div>`;
  container.appendChild(row);
}

function populateWeapons(weapons) {
  const container = document.getElementById('weapon-list');
  container.innerHTML = '';
  weaponCounter = 0;
  (weapons || []).forEach(w => addWeaponRow(w));
}

function collectWeapons() {
  const rows = document.querySelectorAll('.weapon-row');
  const weapons = [];
  rows.forEach(row => {
    const name = row.querySelector('.wf-name').value.trim();
    if (!name) return;
    weapons.push({
      name,
      ability: row.querySelector('.wf-ability').value,
      proficient: row.querySelector('.wf-prof').value === 'yes',
      damage: row.querySelector('.wf-damage').value.trim(),
      damageType: row.querySelector('.wf-dtype').value.trim(),
      notes: row.querySelector('.wf-notes').value.trim()
    });
  });
  return weapons;
}

