// equipment.js — Selection cards, spell card rendering, dashboard roller sections
/* ═══════════════════════════════════════════
   REUSABLE SELECTION CARD
   ═══════════════════════════════════════════ */

/**
 * Render an expandable selection card with checkbox.
 * options: { inputName, value, onchange, readonly, checked, badge, summary, bodyHtml }
 */
function renderSelectionCard(name, options) {
  var opts = options || {};
  var inputName = opts.inputName || 'selection';
  var value = opts.value || name;
  var onchangeAttr = opts.onchange ? ' onchange="' + opts.onchange + '"' : '';
  var readonlyClass = opts.readonly ? ' readonly' : '';
  var checkedAttr = opts.checked ? ' checked' : '';
  var disabledAttr = opts.readonly ? ' disabled' : '';
  var badge = opts.badge ? ' <span class="badge">' + opts.badge + '</span>' : '';
  var summary = opts.summary || '';
  var bodyHtml = opts.bodyHtml || '';
  var uid = 'sel-' + inputName + '-' + value.replace(/[^a-zA-Z0-9]/g, '');

  var html = '<div class="sel-card' + readonlyClass + '" id="' + uid + '">';
  html += '<div class="sel-card-header">';
  if (!opts.readonly) {
    html += '<input type="checkbox" name="' + inputName + '" value="' + escapeHtml(value) + '"' + checkedAttr + disabledAttr + onchangeAttr + ' onclick="event.stopPropagation()">';
  }
  html += '<span class="sel-name">' + escapeHtml(name) + badge + '</span>';
  html += '<span class="sel-summary">' + summary + '</span>';
  if (bodyHtml) html += '<span class="sel-expand" onclick="this.closest(\'.sel-card\').classList.toggle(\'expanded\');event.stopPropagation()">&#9654;</span>';
  html += '</div>';
  if (bodyHtml) html += '<div class="sel-card-body">' + bodyHtml + '</div>';
  html += '</div>';
  return html;
}

/**
 * Build the body HTML for a spell in selection context (no roll buttons, computed values)
 */
function buildSpellSelectionBody(spell, char) {
  var cd = CLASS_DATA[char.class] || CLASS_DATA.Cleric;
  var castAbility = cd.spellcastingAbility || 'wis';
  var abilMod = mod(char.abilityScores[castAbility] || 10);
  var profBonus = char.proficiencyBonus || getProfBonus(char.level || 1);
  var dc = 8 + profBonus + abilMod;
  var atkBonus = profBonus + abilMod;

  var html = '<div class="sc-meta">';
  html += '<span class="sc-meta-tag">' + spell.school + '</span>';
  html += '<span class="sc-meta-tag">' + spell.castingTime + '</span>';
  html += '<span class="sc-meta-tag">' + spell.range + '</span>';
  html += '<span class="sc-meta-tag">' + spell.components + '</span>';
  html += '<span class="sc-meta-tag">' + spell.duration + '</span>';
  if (spell.save) html += '<span class="sc-meta-tag">' + ABILITY_NAMES[spell.save] + ' save DC ' + dc + '</span>';
  if (spell.attack) html += '<span class="sc-meta-tag">+' + atkBonus + ' spell attack</span>';
  html += '</div>';
  html += '<div class="sc-desc">' + spell.description + '</div>';
  if (spell.upcast) html += '<div class="sc-note">Upcast: ' + spell.upcast.note + '</div>';
  return html;
}

/**
 * Build summary line for spell selection (shorter than dashboard version)
 */
function getSpellSelectionSummary(spell, char) {
  var parts = [];
  if (spell.damage) {
    var dice = spell.damage.dice;
    if (spell.level === 0 && spell.scaling) {
      var lvls = Object.keys(spell.scaling).map(Number).sort(function(a,b){return b-a;});
      for (var i = 0; i < lvls.length; i++) {
        if ((char.level || 1) >= lvls[i]) { dice = spell.scaling[lvls[i]]; break; }
      }
    }
    parts.push(dice + ' ' + spell.damage.type);
  }
  if (spell.healing) {
    if (spell.healing.dice) parts.push(spell.healing.dice + ' HP');
    else if (spell.healing.flat) parts.push(spell.healing.flat + ' HP');
  }
  parts.push(spell.castingTime);
  if (spell.range !== 'Self') parts.push(spell.range);
  return parts.join(' · ');
}

/**
 * Reusable selection limit enforcer
 * name: checkbox name attribute
 * max: maximum allowed selections
 * countElId: optional element ID to update count display
 */
function enforceSelectionLimit(name, max, countElId) {
  var checked = document.querySelectorAll('input[name="' + name + '"]:checked');
  var unchecked = document.querySelectorAll('input[name="' + name + '"]:not(:checked)');
  var atLimit = checked.length >= max;
  unchecked.forEach(function(cb) { cb.disabled = atLimit; });
  checked.forEach(function(cb) { cb.disabled = false; });
  // Update count display
  if (countElId) {
    var el = document.getElementById(countElId);
    if (el) {
      el.innerHTML = 'Selected: <span class="current' + (checked.length > max ? ' text-error' : '') + '">' + checked.length + '</span> / <span>' + max + '</span>';
    }
  }
  // Update card visual state
  document.querySelectorAll('input[name="' + name + '"]').forEach(function(cb) {
    var card = cb.closest('.sel-card');
    if (card) card.classList.toggle('selected', cb.checked);
  });
}

/* ═══════════════════════════════════════════
   SPELL CARD RENDERING
   ═══════════════════════════════════════════ */

function getSpellSummaryLine(spell, char) {
  var cd = CLASS_DATA[char.class] || CLASS_DATA.Cleric;
  var castAbility = cd.spellcastingAbility || 'wis';
  var castMod = mod(char.abilityScores[castAbility] || 10);
  const profBonus = char.proficiencyBonus;
  const dc = 8 + profBonus + castMod;
  const atkBonus = profBonus + castMod;
  var isClericLife = char.class === 'Cleric' && char.subclass === 'Life Domain';
  const isSupreme = isClericLife && char.level >= 17;
  const parts = [];

  // Damage
  if (spell.damage) {
    let dice = spell.damage.dice;
    if (spell.level === 0 && spell.scaling) {
      const lvls = Object.keys(spell.scaling).map(Number).sort((a,b) => b - a);
      for (const l of lvls) { if (char.level >= l) { dice = spell.scaling[l]; break; } }
    }
    let altStr = '';
    if (spell.damage.altDice) {
      let altDice = spell.damage.altDice;
      if (spell.altScaling) {
        const lvls = Object.keys(spell.altScaling).map(Number).sort((a,b) => b - a);
        for (const l of lvls) { if (char.level >= l) { altDice = spell.altScaling[l]; break; } }
      }
      altStr = ' or ' + altDice + ' (damaged)';
    }
    // Special: Spiritual Weapon adds spellcasting mod
    if (spell.name === 'Spiritual Weapon') {
      parts.push(dice + '+' + castMod + ' force');
    } else {
      parts.push(dice + altStr + ' ' + spell.damage.type);
    }
  }

  // Healing
  if (spell.healing) {
    var dolBonus = isClericLife && spell.level >= 1 ? 2 + spell.level : 0;
    if (spell.healing.flat) {
      parts.push((spell.healing.flat + dolBonus) + ' HP');
    } else if (isSupreme) {
      const parsed = parseDice(spell.healing.dice);
      if (parsed) {
        const maxVal = parsed.count * parsed.sides + castMod + dolBonus;
        parts.push(maxVal + ' HP (max)');
      }
    } else {
      const modPart = spell.healing.mod ? '+' + castMod : '';
      const dolPart = dolBonus > 0 ? '+' + dolBonus : '';
      parts.push(spell.healing.dice + modPart + dolPart + ' HP');
    }
  }

  // Action type
  parts.push(spell.castingTime);

  // Range
  if (spell.range !== 'Self') parts.push(spell.range);

  // Attack or save
  if (spell.attack) parts.push('+' + atkBonus + ' attack');
  if (spell.save) parts.push(ABILITY_NAMES[spell.save] + ' DC ' + dc);

  return parts.join(' · ');
}

function renderSpellCard(spell, char, options) {
  const opts = options || {};
  var cd = CLASS_DATA[char.class] || CLASS_DATA.Cleric;
  var castAbility = cd.spellcastingAbility || 'wis';
  var castMod = mod(char.abilityScores[castAbility] || 10);
  const profBonus = char.proficiencyBonus;
  const dc = 8 + profBonus + castMod;
  const atkBonus = profBonus + castMod;
  var isLifeDomain = char.class === 'Cleric' && char.subclass === 'Life Domain';
  const isBlessed = isLifeDomain && char.level >= 6;
  const isSupreme = isLifeDomain && char.level >= 17;
  const summary = getSpellSummaryLine(spell, char);
  var badgeText = opts.domain ? 'Always Prepared' : (opts.innateLabel || '');
  const domainLabel = badgeText ? ' <span class="badge">' + badgeText + '</span>' : '';

  let bodyHtml = '';
  // Meta tags
  bodyHtml += '<div class="sc-meta">';
  bodyHtml += `<span class="sc-meta-tag">${spell.school}</span>`;
  bodyHtml += `<span class="sc-meta-tag">${spell.castingTime}</span>`;
  bodyHtml += `<span class="sc-meta-tag">${spell.range}</span>`;
  bodyHtml += `<span class="sc-meta-tag">${spell.components}</span>`;
  bodyHtml += `<span class="sc-meta-tag">${spell.duration}</span>`;
  if (spell.save) bodyHtml += `<span class="sc-meta-tag">${ABILITY_NAMES[spell.save]} save DC ${dc}</span>`;
  if (spell.attack) bodyHtml += `<span class="sc-meta-tag">+${atkBonus} spell attack</span>`;
  bodyHtml += '</div>';

  // Description
  bodyHtml += `<div class="sc-desc">${spell.description}</div>`;

  // Upcast
  if (spell.upcast) bodyHtml += `<div class="sc-note">Upcast: ${spell.upcast.note}</div>`;

  // Blessed Healer note for healing spells
  if (isBlessed && spell.healing && spell.level >= 1) {
    bodyHtml += `<div class="sc-note">Blessed Healer: You also heal ${2 + spell.level} HP when cast on another creature.</div>`;
  }

  // Supreme Healing note
  if (isSupreme && spell.healing && spell.healing.dice) {
    bodyHtml += `<div class="sc-note">Supreme Healing: All healing dice are maximized.</div>`;
  }

  // Roll buttons
  const rollBtns = [];
  // Route leveled spells through slot spending prompt; cantrips roll directly
  var rollFn = spell.level >= 1 ? 'showCastSpellPrompt' : 'doSpellRoll';
  if (spell.attack) rollBtns.push('<button class="sc-roll-btn" onclick="event.stopPropagation();' + rollFn + '(\'' + spell.name.replace(/'/g, "\\'") + '\',\'attack\')">Roll Attack</button>');
  if (spell.damage) {
    rollBtns.push('<button class="sc-roll-btn' + (spell.attack ? ' secondary' : '') + '" onclick="event.stopPropagation();' + rollFn + '(\'' + spell.name.replace(/'/g, "\\'") + '\',\'damage\')">Roll Damage</button>');
    if (spell.damage.altDice) {
      rollBtns.push('<button class="sc-roll-btn secondary" onclick="event.stopPropagation();' + rollFn + '(\'' + spell.name.replace(/'/g, "\\'") + '\',\'damage-alt\')">Roll Damage (' + (spell.damage.altNote || 'alt') + ')</button>');
    }
  }
  if (spell.healing && (spell.healing.dice || spell.healing.flat)) {
    rollBtns.push('<button class="sc-roll-btn" onclick="event.stopPropagation();' + rollFn + '(\'' + spell.name.replace(/'/g, "\\'") + '\',\'healing\')">Roll Healing</button>');
  }
  // Concentration tag
  if (spell.duration && spell.duration.toLowerCase().indexOf('concentration') >= 0) {
    bodyHtml = '<span style="display:inline-block;background:rgba(196,163,90,0.2);color:var(--accent);border-radius:4px;padding:2px 6px;font-size:0.7rem;font-weight:bold;margin-bottom:6px">Concentration</span>' + bodyHtml;
  }
  if (rollBtns.length > 0) bodyHtml += '<div style="margin-top:8px">' + rollBtns.join(' ') + '</div>';

  return `<div class="spell-card" onclick="this.classList.toggle('expanded')">
    <div class="spell-card-header">
      <span class="sc-name">${spell.name}${domainLabel}</span>
      <span class="sc-summary">${summary}</span>
      <span class="sc-expand">▸</span>
    </div>
    <div class="spell-card-body">${bodyHtml}</div>
  </div>`;
}

/* ═══════════════════════════════════════════
   DASHBOARD ROLLER SECTIONS
   ═══════════════════════════════════════════ */

function renderDiceRollers(c) {
  let html = '<div class="dash-section"><details class="dice-rolls-outer"><summary>All Rolls &amp; Checks</summary>';

  // General Purpose Roller
  html += `<details class="roller-section">
    <summary>General Dice Roller</summary>
    <div class="roller-controls">
      <div class="form-group"><label style="font-size:0.75rem;color:var(--text-dim)">Count</label><input type="number" id="gr-count" value="1" min="1" max="10"></div>
      <div class="form-group"><label style="font-size:0.75rem;color:var(--text-dim)">Die</label>
        <select id="gr-sides"><option value="4">d4</option><option value="6">d6</option><option value="8">d8</option><option value="10">d10</option><option value="12">d12</option><option value="20" selected>d20</option><option value="100">d100</option></select></div>
      <div class="form-group"><label style="font-size:0.75rem;color:var(--text-dim)">Modifier</label><input type="number" id="gr-mod" value="0"></div>
      <button class="btn btn-primary" onclick="doGeneralRoll()" style="padding:10px 20px;min-height:44px;align-self:end">Roll</button>
    </div>
  </details>`;

  // Attack Roller (Weapons)
  if (c.weapons && c.weapons.length > 0) {
    html += '<details class="roller-section"><summary>Weapon Attacks</summary>';
    c.weapons.forEach((w, i) => {
      const abilMod = mod(c.abilityScores[w.ability] || 10);
      const profB = w.proficient ? c.proficiencyBonus : 0;
      const magB = w.magicBonus || 0;
      const atkB = abilMod + profB + magB;
      const dmgMod = abilMod + magB;
      html += `<div class="attack-weapon">
        <div>
          <div class="aw-name">${w.name}${magB ? ' <span style="color:var(--accent);font-size:0.8rem">+' + magB + '</span>' : ''}</div>
          <div class="aw-stats">+${atkB} to hit · ${w.damage}${dmgMod >= 0 ? '+' : ''}${dmgMod} ${w.damageType}${w.notes ? ' · ' + w.notes : ''}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary aw-btn" onclick="doWeaponRoll(${i},'attack')">Attack</button>
          <button class="btn btn-secondary aw-btn" onclick="doWeaponRoll(${i},'damage')">Damage</button>
        </div>
      </div>`;
    });
    html += '</details>';
  }

  // Saving Throw & Ability Check Roller
  html += '<details class="roller-section"><summary>Saving Throws &amp; Ability Checks</summary>';
  // Roll reminders from active buffs (externalBuffs only)
  var saveReminders = [];
  if (c.externalBuffs) {
    c.externalBuffs.forEach(function(buff) { (buff.effects || []).forEach(function(eff) { if (eff.type === 'rollReminder') saveReminders.push(eff.text); }); });
  }
  if (saveReminders.length > 0) {
    html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:6px">Active: ' + saveReminders.join(' \u00b7 ') + '</div>';
  }
  html += '<h4 style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px">SAVING THROWS</h4>';
  html += '<div class="save-check-grid">';
  ABILITIES.forEach(ab => {
    const isProficient = c.savingThrows.includes(ab);
    const bonus = mod(c.abilityScores[ab]) + (isProficient ? c.proficiencyBonus : 0);
    html += `<button class="save-check-btn ${isProficient ? 'proficient' : ''}" onclick="doAbilityRoll('${ab}',${isProficient})">
      <span class="sc-ab">${ABILITY_NAMES[ab]}${isProficient ? ' *' : ''}</span>
      <span class="sc-bonus">${bonus >= 0 ? '+' : ''}${bonus}</span>
    </button>`;
  });
  html += '</div>';

  html += '<h4 style="font-size:0.8rem;color:var(--text-dim);margin:12px 0 8px">SKILL CHECKS</h4>';
  const grouped = {};
  SKILLS.forEach(s => { if (!grouped[s.ability]) grouped[s.ability] = []; grouped[s.ability].push(s); });
  for (const ab of ABILITIES) {
    if (!grouped[ab]) continue;
    html += `<div class="skill-roller-section"><h4>${ABILITY_NAMES[ab]}</h4><div class="skill-roller-list">`;
    grouped[ab].forEach(sk => {
      const isProficient = c.skillProficiencies.some(s => s.toLowerCase() === sk.name.toLowerCase());
      const bonus = mod(c.abilityScores[sk.ability]) + (isProficient ? c.proficiencyBonus : 0);
      html += `<button class="skill-roll-btn ${isProficient ? 'proficient' : ''}" onclick="doSkillRoll('${sk.name}')">
        ${sk.name} ${bonus >= 0 ? '+' : ''}${bonus}</button>`;
    });
    html += '</div></div>';
  }
  html += '</details>';

  html += '</details></div>';
  return html;
}


