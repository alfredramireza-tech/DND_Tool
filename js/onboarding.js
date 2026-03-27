// onboarding.js — Character creation wizard, form handling, step navigation
/* ═══════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════ */

let currentStep = 1;
let isEditing = false;

/* ═══════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════ */

function init() {
  buildProgressBar();
  buildAbilityGrid();
  updateScoreModeStatus();
  buildSkillChecks('');
  buildCantripList();
  migrateStorage();
  showHomeScreen();
}

function buildProgressBar() {
  const bar = document.getElementById('progress-bar');
  bar.innerHTML = STEP_LABELS.map((label, i) =>
    `<div class="progress-step${i === 0 ? ' active' : ''}" data-step="${i + 1}">
       <div class="progress-dot">${i + 1}</div>
       <div class="progress-label">${label}</div>
     </div>`
  ).join('');
}

function buildAbilityGrid() {
  const grid = document.getElementById('ability-grid');
  grid.innerHTML = ABILITIES.map(ab =>
    `<div class="ability-item">
       <div class="ability-label">${ABILITY_NAMES[ab]}</div>
       <input type="number" id="score-${ab}" min="1" max="30" oninput="onAbilityChange()">
       <div class="ability-mod" id="mod-${ab}">+0</div>
     </div>`
  ).join('');
}

function buildSkillChecks(className) {
  var cd = CLASS_DATA[className];
  var container = document.getElementById('skill-checks');
  if (!cd) {
    container.innerHTML = '<p class="text-dim">Select a class to see available skills</p>';
    document.getElementById('save-throws-display').innerHTML = '';
    document.getElementById('save-throws-subtitle').textContent = 'Set by class';
    document.getElementById('skill-subtitle').textContent = 'Select a class first';
    document.getElementById('expertise-section').innerHTML = '';
    return;
  }

  var allowedSkills = cd.skillChoices;

  // Class skills section
  var classGrouped = {};
  var otherGrouped = {};
  SKILLS.forEach(function(s) {
    var key = s.name.toLowerCase();
    if (allowedSkills.indexOf(key) >= 0) {
      if (!classGrouped[s.ability]) classGrouped[s.ability] = [];
      classGrouped[s.ability].push(s);
    } else {
      if (!otherGrouped[s.ability]) otherGrouped[s.ability] = [];
      otherGrouped[s.ability].push(s);
    }
  });

  var html = '<h4 style="margin-bottom:6px;color:var(--accent)">Class Skills (pick ' + cd.skillCount + ')</h4>';
  ABILITIES.forEach(function(ab) {
    if (!classGrouped[ab]) return;
    html += '<div class="skill-section"><h4>' + ABILITY_NAMES[ab] + '</h4><div class="skill-list">';
    classGrouped[ab].forEach(function(s) {
      html += '<label class="check-item"><input type="checkbox" name="skill-class" value="' + s.name.toLowerCase() + '" onchange="onSkillCheckChange()">';
      html += '<span>' + s.name + '</span></label>';
    });
    html += '</div></div>';
  });

  // Other proficiencies section
  html += '<h4 style="margin:16px 0 4px;color:var(--text-dim);font-size:0.9rem">Other Proficiencies (background, race, etc.)</h4>';
  html += '<p class="text-dim" style="font-size:0.78rem;margin-bottom:8px">Check any additional skills granted by your background or race.</p>';
  ABILITIES.forEach(function(ab) {
    if (!otherGrouped[ab]) return;
    html += '<div class="skill-section"><h4>' + ABILITY_NAMES[ab] + '</h4><div class="skill-list">';
    otherGrouped[ab].forEach(function(s) {
      html += '<label class="check-item"><input type="checkbox" name="skill-other" value="' + s.name.toLowerCase() + '" onchange="onSkillCheckChange()">';
      html += '<span>' + s.name + '</span></label>';
    });
    html += '</div></div>';
  });
  container.innerHTML = html;

  // Skill count subtitle
  document.getElementById('skill-subtitle').textContent = 'Choose ' + cd.skillCount + ' class skills, plus any from background/race';

  // Saving throws display (read-only)
  var stDisplay = document.getElementById('save-throws-display');
  stDisplay.innerHTML = ABILITIES.map(function(ab) {
    return '<label class="check-item" style="pointer-events:none"><input type="checkbox" ' + (cd.savingThrows.indexOf(ab) >= 0 ? 'checked' : '') + ' disabled><span>' + ABILITY_NAMES[ab] + '</span></label>';
  }).join('');

  var stNames = cd.savingThrows.map(function(st) { return ABILITY_NAMES[st]; }).join(' and ');
  document.getElementById('save-throws-subtitle').textContent = className + ': ' + stNames + ' (set by class)';

  // Expertise section (Rogue only)
  buildExpertiseSection(className);
}

function onRaceChange() {
  var race = document.getElementById('f-race').value;
  var subraceRow = document.getElementById('subrace-row');
  var subraceSelect = document.getElementById('f-subrace');
  var subraceHint = document.getElementById('subrace-hint');
  if (race === 'Aasimar') {
    subraceRow.style.display = '';
    subraceSelect.innerHTML = '<option value="">— Select Subrace —</option>';
    Object.keys(AASIMAR_SUBRACES).forEach(function(sr) {
      subraceSelect.innerHTML += '<option>' + sr + '</option>';
    });
    subraceHint.textContent = 'CHA +2, Darkvision 60ft, Light cantrip';
  } else {
    subraceRow.style.display = 'none';
    subraceSelect.innerHTML = '<option value="">— Select Subrace —</option>';
    subraceHint.textContent = '';
  }
}

function onSubraceChange() {
  var subrace = document.getElementById('f-subrace').value;
  var hint = document.getElementById('subrace-hint');
  if (subrace && AASIMAR_SUBRACES[subrace]) {
    var sr = AASIMAR_SUBRACES[subrace];
    hint.textContent = 'CHA +2, ' + sr.abilityBonus + ', Darkvision 60ft, Light cantrip';
  } else {
    hint.textContent = 'CHA +2, Darkvision 60ft, Light cantrip';
  }
}

function onClassChange() {
  var cls = document.getElementById('f-class').value;
  var cd = CLASS_DATA[cls];
  var subclassSelect = document.getElementById('f-subclass');
  var subclassLabel = document.getElementById('subclass-label');

  // Clear and rebuild subclass dropdown
  subclassSelect.innerHTML = '';
  if (cd) {
    subclassLabel.textContent = cd.subclassLabel;
    subclassSelect.innerHTML = '<option value="">— Select ' + cd.subclassLabel + ' —</option>';
    cd.subclasses.forEach(function(sc) {
      subclassSelect.innerHTML += '<option>' + sc + '</option>';
    });
  } else {
    subclassLabel.textContent = 'Subclass';
    subclassSelect.innerHTML = '<option value="">— Select Class First —</option>';
  }

  // Rebuild skills and saving throws
  buildSkillChecks(cls);

  // Update recommended stats button
  updateRecommendedStatsButton(cls);

  // Show/hide Fighting Style picker (Fighter or Paladin)
  var fsSection = document.getElementById('fighting-style-section');
  if (cls === 'Fighter' || cls === 'Paladin') {
    fsSection.classList.remove('hidden');
    var fsSelect = document.getElementById('f-fighting-style');
    fsSelect.innerHTML = '<option value="">— Select Fighting Style —</option>';
    var styleSource = (cls === 'Paladin') ? PALADIN_FIGHTING_STYLES : FIGHTING_STYLES;
    Object.keys(styleSource).forEach(function(style) {
      fsSelect.innerHTML += '<option value="' + style + '">' + style + '</option>';
    });
    fsSelect.onchange = function() {
      var desc = document.getElementById('fighting-style-desc');
      var data = styleSource[this.value];
      desc.textContent = data ? data.effect : '';
    };
    // For Paladin, add note about level 2 requirement
    if (cls === 'Paladin') {
      var desc = document.getElementById('fighting-style-desc');
      desc.textContent = 'Fighting Style is gained at level 2.';
    }
  } else {
    fsSection.classList.add('hidden');
  }
}

function updateRecommendedStatsButton(cls) {
  var area = document.getElementById('recommended-stats-area');
  var cd = CLASS_DATA[cls];
  if (!cd || !cd.recommendedStats) {
    area.innerHTML = '';
    return;
  }
  var statsPreview = ABILITIES.map(function(ab) {
    return ABILITY_NAMES[ab] + ' ' + cd.recommendedStats[ab];
  }).join(', ');
  area.innerHTML = '<button class="btn btn-secondary" onclick="applyRecommendedStats()" style="margin-bottom:12px;width:100%">Use Recommended Stats for ' + cls + '</button>' +
    '<div class="field-hint" style="margin-bottom:8px;margin-top:-8px">Standard Array: ' + statsPreview + '</div>';
}

function applyRecommendedStats() {
  var cls = document.getElementById('f-class').value;
  var cd = CLASS_DATA[cls];
  if (!cd || !cd.recommendedStats) return;

  // Check if any scores are already filled
  var hasValues = false;
  ABILITIES.forEach(function(ab) {
    if (document.getElementById('score-' + ab).value) hasValues = true;
  });

  if (hasValues) {
    showModal(
      '<h3>Replace Scores?</h3><p>This will replace your current ability scores and skill selections. Continue?</p>' +
      '<div class="confirm-actions">' +
      '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="doApplyRecommendedStats();closeModal()">Replace</button></div>'
    );
  } else {
    doApplyRecommendedStats();
  }
}

function doApplyRecommendedStats() {
  var cls = document.getElementById('f-class').value;
  var cd = CLASS_DATA[cls];
  if (!cd) return;

  // Fill ability scores and switch to Standard Array mode
  ABILITIES.forEach(function(ab) {
    document.getElementById('score-' + ab).value = cd.recommendedStats[ab];
  });
  setScoreMode('standard');
  onAbilityChange();

  // Fill class skill proficiencies only (not background/other)
  document.querySelectorAll('input[name="skill-class"]').forEach(function(cb) {
    cb.checked = cd.recommendedSkills.indexOf(cb.value) >= 0;
    cb.disabled = false;
  });
  // Clear other skills — background varies by player choice
  document.querySelectorAll('input[name="skill-other"]').forEach(function(cb) {
    cb.checked = false;
  });
  onSkillCheckChange();

  // Fill expertise (Rogue)
  if (cd.expertiseCount > 0 && cd.recommendedExpertise.length > 0) {
    // Rebuild expertise section first (needs proficient skills)
    buildExpertiseSection(cls);
    document.querySelectorAll('input[name="expertise"]').forEach(function(cb) {
      cb.checked = cd.recommendedExpertise.indexOf(cb.value) >= 0;
      cb.disabled = false;
    });
    onExpertiseChange();
  }
}

function onSkillCheckChange() {
  var cls = document.getElementById('f-class').value;
  var cd = CLASS_DATA[cls];
  if (!cd) return;
  // Enforce count only on class skills
  var classChecked = document.querySelectorAll('input[name="skill-class"]:checked');
  var classUnchecked = document.querySelectorAll('input[name="skill-class"]:not(:checked)');
  if (classChecked.length >= cd.skillCount) {
    classUnchecked.forEach(function(cb) { cb.disabled = true; });
  } else {
    classUnchecked.forEach(function(cb) { cb.disabled = false; });
  }
  classChecked.forEach(function(cb) { cb.disabled = false; });
  // Other skills have no limit — always enabled

  // Rebuild expertise if Rogue
  if (cd.expertiseCount > 0) buildExpertiseSection(cls);
}

function buildExpertiseSection(className) {
  var section = document.getElementById('expertise-section');
  var cd = CLASS_DATA[className];
  if (!cd || cd.expertiseCount === 0) {
    section.innerHTML = '';
    return;
  }
  var checked = [];
  document.querySelectorAll('input[name="skill-class"]:checked, input[name="skill-other"]:checked').forEach(function(cb) { checked.push(cb.value); });
  if (checked.length === 0) {
    section.innerHTML = '<h3 class="mt-16">Expertise</h3><p class="text-dim" style="font-size:0.85rem">Select proficient skills first, then choose ' + cd.expertiseCount + ' for expertise</p>';
    return;
  }
  var html = '<h3 class="mt-16">Expertise</h3>';
  html += '<p class="subtitle">Choose ' + cd.expertiseCount + ' proficient skills for double proficiency bonus</p>';
  html += '<div class="check-list">';
  checked.forEach(function(sk) {
    var name = sk.charAt(0).toUpperCase() + sk.slice(1);
    html += '<label class="check-item"><input type="checkbox" name="expertise" value="' + sk + '" onchange="onExpertiseChange()"><span>' + name + '</span></label>';
  });
  html += '</div>';
  section.innerHTML = html;
}

function onExpertiseChange() {
  var cls = document.getElementById('f-class').value;
  var cd = CLASS_DATA[cls];
  if (!cd) return;
  var checked = document.querySelectorAll('input[name="expertise"]:checked');
  var unchecked = document.querySelectorAll('input[name="expertise"]:not(:checked)');
  if (checked.length >= cd.expertiseCount) {
    unchecked.forEach(function(cb) { cb.disabled = true; });
  } else {
    unchecked.forEach(function(cb) { cb.disabled = false; });
  }
  checked.forEach(function(cb) { cb.disabled = false; });
}

function collectExpertiseSkills() {
  var skills = [];
  document.querySelectorAll('input[name="expertise"]:checked').forEach(function(cb) {
    skills.push(cb.value);
  });
  return skills;
}

function getOnboardingCharProxy() {
  var level = parseInt(document.getElementById('f-level').value) || 1;
  var abilityScores = {};
  ABILITIES.forEach(function(ab) {
    abilityScores[ab] = parseInt(document.getElementById('score-' + ab).value) || 10;
  });
  var cls = document.getElementById('f-class').value || 'Cleric';
  return {
    level: level,
    class: cls,
    abilityScores: abilityScores,
    proficiencyBonus: getProfBonus(level)
  };
}

function buildCantripList() {
  const container = document.getElementById('cantrip-list');
  var proxy = getOnboardingCharProxy();
  container.innerHTML = CLERIC_CANTRIPS.map(function(name) {
    var spell = getSpell(name);
    if (!spell) return '<label class="check-item"><input type="checkbox" name="cantrip" value="' + name + '" onchange="onCantripChange()"><span>' + name + '</span></label>';
    var summary = getSpellSelectionSummary(spell, proxy);
    var body = buildSpellSelectionBody(spell, proxy);
    return renderSelectionCard(name, {
      inputName: 'cantrip',
      value: name,
      onchange: 'onCantripChange()',
      summary: summary,
      bodyHtml: body
    });
  }).join('');
}

function buildPreparedSpellList(level) {
  const container = document.getElementById('prepared-spell-list');
  var cls = document.getElementById('f-class').value || 'Cleric';
  var subclass = document.getElementById('f-subclass').value || '';
  const domainList = getDomainSpellList(level, cls, subclass);
  const slots = getSpellSlots(level, cls);
  var slotKeys = Object.keys(slots).map(Number);
  if (slotKeys.length === 0) { container.innerHTML = ''; return; }
  const maxSpellLevel = Math.max(...slotKeys);
  var spellSource = (cls === 'Paladin') ? PALADIN_SPELLS : CLERIC_SPELLS;
  var proxy = getOnboardingCharProxy();
  let html = '';
  for (let sl = 1; sl <= maxSpellLevel; sl++) {
    const spells = (spellSource[sl] || []).filter(s => !domainList.includes(s));
    if (spells.length === 0) continue;
    html += `<h4 class="text-dim mt-8 mb-8" style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em">${ordinal(sl)}-Level Spells</h4>`;
    spells.forEach(function(name) {
      var spell = getSpell(name);
      if (!spell) {
        html += '<label class="check-item"><input type="checkbox" name="prepared" value="' + name + '" onchange="onPreparedChange()"><span>' + name + '</span></label>';
        return;
      }
      var summary = getSpellSelectionSummary(spell, proxy);
      var body = buildSpellSelectionBody(spell, proxy);
      html += renderSelectionCard(name, {
        inputName: 'prepared',
        value: name,
        onchange: 'onPreparedChange()',
        summary: summary,
        bodyHtml: body
      });
    });
  }
  container.innerHTML = html;
}

function buildDomainSpellsDisplay(level) {
  const container = document.getElementById('domain-spells-display');
  var cls = document.getElementById('f-class').value || 'Cleric';
  var subclass = document.getElementById('f-subclass').value || '';
  const ds = getDomainSpells(level, cls, subclass);
  const entries = Object.entries(ds);
  var sectionLabel = (cls === 'Paladin') ? 'Oath Spells' : 'Domain Spells';
  if (entries.length === 0) {
    container.innerHTML = '<h3>' + sectionLabel + ' <span class="badge">Always Prepared</span></h3><p class="text-dim">None at this level</p>';
    return;
  }
  var proxy = getOnboardingCharProxy();
  let html = '<h3>' + sectionLabel + ' <span class="badge">Always Prepared</span></h3>';
  var paladinOathLevelMap = { 3: 1, 5: 2, 9: 3, 13: 4, 17: 5 };
  for (const [lvl, spells] of entries) {
    const spellLevel = (cls === 'Paladin') ? (paladinOathLevelMap[parseInt(lvl)] || 1) : (CLERIC_LEVEL_TO_SPELL_LEVEL[parseInt(lvl)] || 1);
    html += '<h4 class="text-dim mt-8 mb-8" style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em">' + ordinal(spellLevel) + '-Level</h4>';
    spells.forEach(function(name) {
      var spell = getSpell(name);
      if (!spell) {
        html += '<div class="sel-card readonly"><div class="sel-card-header"><span class="sel-name">' + escapeHtml(name) + ' <span class="badge">Always Prepared</span></span></div></div>';
        return;
      }
      var summary = getSpellSelectionSummary(spell, proxy);
      var body = buildSpellSelectionBody(spell, proxy);
      html += renderSelectionCard(name, {
        readonly: true,
        checked: true,
        badge: 'Always Prepared',
        summary: summary,
        bodyHtml: body
      });
    });
  }
  container.innerHTML = html;
}

function buildHpHistoryFields(level, history) {
  const container = document.getElementById('hp-history-fields');
  let html = '';
  for (let i = 1; i <= level; i++) {
    const h = (history && history[i - 1]) || {};
    html += `<div class="hp-row">
      <span class="level-num">Lvl ${i}</span>
      <input type="number" id="hp-gained-${i}" min="1" placeholder="HP" value="${h.gained || ''}">
      <input type="text" id="hp-notes-${i}" placeholder="Notes (e.g. 5 + 2 CON + 1 Dwarf)" value="${h.notes || ''}">
    </div>`;
  }
  container.innerHTML = html;
}

/* ═══════════════════════════════════════════
   VIEW SWITCHING
   ═══════════════════════════════════════════ */

function showHomeScreen() {
  showView('homescreen');
  clearPartyPoll();
  activeCharId = null;
  resetThemeToDefault();
  renderHomeScreen();
}

function showOnboarding() {
  showView('onboarding');
  currentStep = 1;
  showStep(1);
}

function showDashboard(character, preserveScroll) {
  var savedScroll = preserveScroll ? window.scrollY : 0;
  showView('dashboard');
  applyTheme(character.colorTheme);
  renderDashboard(character, preserveScroll);
  if (preserveScroll) {
    window.scrollTo(0, savedScroll);
  }
}

function showStep(n) {
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById('step-' + i);
    el.classList.toggle('active', i === n);
  }
  updateProgressBar(n);

  // Rebuild dynamic content when entering certain steps
  if (n === 3) {
    updateInitiativeDisplay();
    const level = parseInt(document.getElementById('f-level').value) || 3;
    // Preserve any user edits to HP history when navigating back
    const prevHistory = [];
    for (let i = 1; i <= 20; i++) {
      const gainedEl = document.getElementById('hp-gained-' + i);
      if (!gainedEl) break;
      prevHistory.push({ level: i, gained: gainedEl.value, notes: document.getElementById('hp-notes-' + i)?.value || '' });
    }
    const source = prevHistory.length > 0 ? prevHistory :
      ((isEditing ? loadCharacter() : null)?.hp?.hpHistory || []);
    buildHpHistoryFields(level, source);
  }
  if (n === 4) {
    var cls4 = document.getElementById('f-class').value;
    var cd4 = CLASS_DATA[cls4];
    if (cd4 && !cd4.isCaster) return; // non-casters skip this step
    if (cls4 === 'Paladin' && (parseInt(document.getElementById('f-level').value) || 1) < 2) return; // Paladin has no spellcasting until level 2
    const level = parseInt(document.getElementById('f-level').value) || 3;
    var castAbil4 = cd4.spellcastingAbility || 'wis';
    var abilScore4 = parseInt(document.getElementById('score-' + castAbil4).value) || 10;
    var abilMod4 = mod(abilScore4);
    var prepCount, prepLabel;
    if (cls4 === 'Paladin') {
      prepCount = Math.max(1, abilMod4 + Math.floor(level / 2));
      prepLabel = `CHA modifier ${abilMod4 >= 0 ? '+' : ''}${abilMod4} + half paladin level ${Math.floor(level / 2)}`;
    } else {
      prepCount = Math.max(1, level + abilMod4);
      prepLabel = `level ${level} + WIS modifier ${abilMod4 >= 0 ? '+' : ''}${abilMod4}`;
    }
    const cantripCount = getCantripsCount(level, cls4);

    // Hide cantrip section for Paladin (no cantrips)
    var cantripHeader = document.querySelector('#step-4 > h3');
    var cantripCountEl = document.getElementById('cantrip-count');
    var cantripListEl = document.getElementById('cantrip-list');
    var cantripErr = document.getElementById('err-cantrips');
    if (cls4 === 'Paladin') {
      if (cantripHeader) cantripHeader.style.display = 'none';
      cantripCountEl.style.display = 'none';
      cantripListEl.style.display = 'none';
      cantripErr.style.display = 'none';
      // Update step title
      document.querySelector('#step-4 > h2').textContent = 'Spells';
    } else {
      if (cantripHeader) cantripHeader.style.display = '';
      cantripCountEl.style.display = '';
      cantripListEl.style.display = '';
      cantripErr.style.display = '';
      document.querySelector('#step-4 > h2').textContent = 'Spells & Cantrips';
    }

    document.getElementById('cantrip-max').textContent = cantripCount;
    document.getElementById('prepared-max').textContent = prepCount;
    document.getElementById('prepared-info').innerHTML =
      `You can prepare <span class="current">${prepCount}</span> spells (${prepLabel})`;

    // Update subtitle text for oath vs domain spells
    var subtitleEl = document.querySelector('#step-4 .subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = cls4 === 'Paladin'
        ? 'These are in addition to your oath spells above. Selection is optional.'
        : 'These are in addition to your domain spells above. Selection is optional.';
    }

    // Preserve user's prepared spell selections before rebuilding the list
    const prevPrepared = [];
    document.querySelectorAll('input[name="prepared"]:checked').forEach(cb => prevPrepared.push(cb.value));

    buildDomainSpellsDisplay(level);
    buildPreparedSpellList(level);

    // Restore: use previous user selections if any, otherwise fall back to source data
    const spellsToCheck = prevPrepared.length > 0 ? prevPrepared :
      ((isEditing ? loadCharacter() : null)?.currentPreparedSpells || []);
    document.querySelectorAll('input[name="prepared"]').forEach(cb => {
      cb.checked = spellsToCheck.includes(cb.value);
    });
    if (cls4 !== 'Paladin') onCantripChange();
    onPreparedChange();
  }
  if (n === 6) {
    // Password step — pre-fill fields when editing a character that already has a password
    if (isEditing) {
      var existing = loadCharacter();
      if (existing && existing.passwordHash) {
        document.getElementById('f-password').placeholder = 'Enter new password (leave blank to keep current)';
        document.getElementById('f-password-confirm').placeholder = 'Confirm new password';
      } else {
        document.getElementById('f-password').placeholder = 'Enter a password';
        document.getElementById('f-password-confirm').placeholder = 'Re-enter password';
      }
    }
  }
  if (n === 7) {
    renderReview();
  }

  window.scrollTo(0, 0);
}

function updateProgressBar(step) {
  document.querySelectorAll('.progress-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === step) el.classList.add('active');
    else if (s < step) el.classList.add('done');
  });
}

/* ═══════════════════════════════════════════
   FORM POPULATION
   ═══════════════════════════════════════════ */

function populateForm(data) {
  document.getElementById('f-name').value = data.name || '';
  document.getElementById('f-race').value = data.race || '';
  onRaceChange(); // rebuild subrace dropdown if Aasimar
  if (data.subrace) document.getElementById('f-subrace').value = data.subrace;
  document.getElementById('f-class').value = data.class || '';
  onClassChange(); // rebuild subclass/skills for selected class
  document.getElementById('f-subclass').value = data.subclass || '';
  document.getElementById('f-background').value = data.background || '';
  document.getElementById('f-alignment').value = data.alignment || '';
  document.getElementById('f-level').value = data.level || 1;

  ABILITIES.forEach(ab => {
    const score = data.abilityScores && data.abilityScores[ab];
    document.getElementById('score-' + ab).value = (score !== undefined && score !== '') ? score : '';
  });
  onAbilityChange();
  // Clear password fields
  document.getElementById('f-password').value = '';
  document.getElementById('f-password-confirm').value = '';

  // Skill proficiencies — restore after class skills are built
  const skills = (data.skillProficiencies || []).map(s => s.toLowerCase());
  document.querySelectorAll('input[name="skill-class"], input[name="skill-other"]').forEach(cb => {
    cb.checked = skills.includes(cb.value.toLowerCase());
  });
  onSkillCheckChange();

  // Expertise — restore if present
  if (data.expertiseSkills && data.expertiseSkills.length > 0) {
    document.querySelectorAll('input[name="expertise"]').forEach(cb => {
      cb.checked = data.expertiseSkills.indexOf(cb.value) >= 0;
    });
    onExpertiseChange();
  }

  document.getElementById('f-hp').value = data.hp ? data.hp.max : '';
  document.getElementById('f-ac').value = data.ac || '';
  document.getElementById('f-speed').value = data.speed || 25;

  // Cantrips
  const cantrips = data.cantripsKnown || [];
  document.querySelectorAll('input[name="cantrip"]').forEach(cb => {
    cb.checked = cantrips.includes(cb.value);
  });
  onCantripChange();

  // Currency
  var cur = data.currency || {};
  document.getElementById('f-currency-cp').value = cur.cp || 0;
  document.getElementById('f-currency-sp').value = cur.sp || 0;
  document.getElementById('f-currency-ep').value = cur.ep || 0;
  document.getElementById('f-currency-gp').value = cur.gp || 0;
  document.getElementById('f-currency-pp').value = cur.pp || 0;

  // Equipment, Weapons & Notes
  document.getElementById('f-equipment').value = data.bulkGear || data.equipment || '';
  document.getElementById('f-notes').value = data.notes || '';
  populateWeapons(data.weapons || []);

  // Fighter/Paladin: restore fighting style
  if ((data.class === 'Fighter' || data.class === 'Paladin') && data.fightingStyle) {
    var fsEl = document.getElementById('f-fighting-style');
    if (fsEl) fsEl.value = data.fightingStyle;
  }
}

/* ═══════════════════════════════════════════
   STEP NAVIGATION & VALIDATION
   ═══════════════════════════════════════════ */

function nextStep() {
  if (!validateStep(currentStep)) return;
  if (currentStep < 7) {
    currentStep++;
    var cls = document.getElementById('f-class').value;
    var cd = CLASS_DATA[cls];
    var level = parseInt(document.getElementById('f-level').value) || 1;
    if (currentStep === 4 && ((cd && !cd.isCaster) || (cls === 'Paladin' && level < 2))) currentStep = 5;
    showStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    var cls = document.getElementById('f-class').value;
    var cd = CLASS_DATA[cls];
    var level = parseInt(document.getElementById('f-level').value) || 1;
    if (currentStep === 4 && ((cd && !cd.isCaster) || (cls === 'Paladin' && level < 2))) currentStep = 3;
    showStep(currentStep);
  }
}

function validateStep(n) {
  clearErrors();
  switch (n) {
    case 1:
      if (!document.getElementById('f-name').value.trim()) {
        showError('err-name'); return false;
      }
      if (!document.getElementById('f-class').value) {
        showError('err-class'); return false;
      }
      return true;
    case 2:
      for (const ab of ABILITIES) {
        const v = parseInt(document.getElementById('score-' + ab).value);
        if (!v || v < 1 || v > 30) { showError('err-abilities'); return false; }
      }
      return true;
    case 3: {
      let ok3 = true;
      var hpVal3 = parseInt(document.getElementById('f-hp').value);
      if (!hpVal3 || hpVal3 <= 0) { showError('err-hp'); ok3 = false; }
      if (!parseInt(document.getElementById('f-ac').value)) { showError('err-ac'); ok3 = false; }
      return ok3;
    }
    case 4: {
      const cls = document.getElementById('f-class').value;
      const cd = CLASS_DATA[cls];
      if (cd && !cd.isCaster) return true;
      if (cls === 'Paladin' && (parseInt(document.getElementById('f-level').value) || 1) < 2) return true;
      // Paladin has no cantrips — skip cantrip validation
      if (cls !== 'Paladin') {
        const level = parseInt(document.getElementById('f-level').value) || 3;
        const needed = getCantripsCount(level, cls);
        const selected = document.querySelectorAll('input[name="cantrip"]:checked').length;
        if (selected !== needed) { showError('err-cantrips'); return false; }
      }
      return true;
    }
    case 6:
      var pw = document.getElementById('f-password').value;
      var pwc = document.getElementById('f-password-confirm').value;
      if (pw && pw !== pwc) {
        document.getElementById('err-pw-match').classList.add('visible');
        return false;
      }
      document.getElementById('err-pw-match').classList.remove('visible');
      return true;
    default:
      return true;
  }
}

function showError(id) { document.getElementById(id).classList.add('visible'); }
function clearErrors() { document.querySelectorAll('.field-error').forEach(e => e.classList.remove('visible')); }

/* ═══════════════════════════════════════════
   EVENT HANDLERS
   ═══════════════════════════════════════════ */

function onAbilityChange() {
  ABILITIES.forEach(ab => {
    const score = parseInt(document.getElementById('score-' + ab).value) || 10;
    document.getElementById('mod-' + ab).textContent = modStr(score);
  });
  updateInitiativeDisplay();
  detectScoreMode();
}

function updateInitiativeDisplay() {
  const dexScore = parseInt(document.getElementById('score-dex').value) || 10;
  const init = mod(dexScore);
  const el = document.getElementById('initiative-display');
  if (el) el.textContent = (init >= 0 ? '+' : '') + init;
}

function validateHpRange() {
  var warn = document.getElementById('hp-range-warning');
  if (!warn) return;
  var hpVal = parseInt(document.getElementById('f-hp').value);
  if (!hpVal || hpVal <= 0) { warn.style.display = 'none'; return; }
  var cls = document.getElementById('f-class').value;
  var cd = CLASS_DATA[cls];
  if (!cd) { warn.style.display = 'none'; return; }
  var level = parseInt(document.getElementById('f-level').value) || 1;
  var conScore = parseInt(document.getElementById('score-con').value) || 10;
  var conMod = mod(conScore);
  var hitDie = cd.hitDice;
  var race = document.getElementById('f-race').value;
  var racialHpPerLevel = (race === 'Hill Dwarf') ? 1 : 0;
  // Level 1: max die + CON mod + racial
  // Levels 2+: min = 1+CON mod+racial per level, max = hitDie+CON mod+racial per level
  var lvl1Hp = hitDie + conMod + racialHpPerLevel;
  var minHp, maxHp;
  if (level === 1) {
    minHp = lvl1Hp;
    maxHp = lvl1Hp;
  } else {
    var minPerLevel = Math.max(1, 1 + conMod) + racialHpPerLevel;
    var maxPerLevel = hitDie + conMod + racialHpPerLevel;
    minHp = lvl1Hp + minPerLevel * (level - 1);
    maxHp = lvl1Hp + maxPerLevel * (level - 1);
  }
  if (hpVal < minHp) {
    warn.style.display = 'block';
    warn.textContent = 'This HP seems low for a level ' + level + ' ' + cls + '. Expected range: ' + minHp + '\u2013' + maxHp + '. You can continue if this is intentional.';
  } else if (hpVal > maxHp) {
    warn.style.display = 'block';
    warn.textContent = 'This HP seems high for a level ' + level + ' ' + cls + '. Expected range: ' + minHp + '\u2013' + maxHp + '. You can continue if this is intentional.';
  } else {
    warn.style.display = 'none';
  }
}

/* ── Ability Score Mode System ── */
var currentScoreMode = 'standard';
var STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
var POINT_BUY_COSTS = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };

function setScoreMode(mode) {
  currentScoreMode = mode;
  document.querySelectorAll('.score-mode-tab').forEach(function(t, i) {
    t.classList.toggle('active', (i === 0 && mode === 'standard') || (i === 1 && mode === 'pointbuy') || (i === 2 && mode === 'custom'));
  });
  updateScoreModeStatus();
}

function getEnteredScores() {
  var scores = [];
  ABILITIES.forEach(function(ab) {
    var v = parseInt(document.getElementById('score-' + ab).value);
    if (v) scores.push(v);
  });
  return scores;
}

function updateScoreModeStatus() {
  var el = document.getElementById('score-mode-status');
  if (!el) return;
  var scores = getEnteredScores();

  if (currentScoreMode === 'standard') {
    // Track which standard array values are used
    var remaining = STANDARD_ARRAY.slice();
    scores.forEach(function(s) {
      var idx = remaining.indexOf(s);
      if (idx >= 0) remaining.splice(idx, 1);
    });
    if (remaining.length === 0 && scores.length === 6) {
      el.innerHTML = '<span class="score-val">Standard Array complete!</span>';
    } else if (remaining.length === 6) {
      el.innerHTML = 'Standard Array: <span class="score-val">' + STANDARD_ARRAY.join(', ') + '</span>';
    } else {
      el.innerHTML = 'Remaining: <span class="score-val">' + remaining.join(', ') + '</span>';
    }
  } else if (currentScoreMode === 'pointbuy') {
    var spent = 0;
    var valid = true;
    scores.forEach(function(s) {
      if (s < 8 || s > 15) valid = false;
      else spent += (POINT_BUY_COSTS[s] || 0);
    });
    var left = 27 - spent;
    if (!valid) {
      el.innerHTML = '<span class="score-warn">Point Buy scores must be 8\u201315 (before racial modifiers)</span>';
    } else if (left < 0) {
      el.innerHTML = 'Points: <span class="score-warn">' + spent + ' / 27 (over budget by ' + (-left) + ')</span>';
    } else {
      el.innerHTML = 'Points: <span class="score-val">' + spent + ' / 27</span> \u2014 <span class="score-val">' + left + ' remaining</span>';
    }
  } else {
    var total = 0;
    scores.forEach(function(s) { total += s; });
    el.innerHTML = 'Custom Scores \u2014 total: <span class="score-val">' + total + '</span>';
  }
}

function detectScoreMode() {
  var scores = getEnteredScores();
  if (scores.length === 0) return;
  // Check if all values are in standard array
  var remaining = STANDARD_ARRAY.slice();
  var isStandard = true;
  scores.forEach(function(s) {
    var idx = remaining.indexOf(s);
    if (idx >= 0) remaining.splice(idx, 1);
    else isStandard = false;
  });
  if (isStandard && currentScoreMode === 'standard') {
    updateScoreModeStatus();
    return;
  }
  // Check if it could be point buy
  var couldBePointBuy = true;
  scores.forEach(function(s) {
    if (s < 8 || s > 15) couldBePointBuy = false;
  });
  if (!isStandard && currentScoreMode === 'standard') {
    // Auto-switch to point buy or custom
    if (couldBePointBuy) setScoreMode('pointbuy');
    else setScoreMode('custom');
    return;
  }
  updateScoreModeStatus();
}

function onCantripChange() {
  const level = parseInt(document.getElementById('f-level').value) || 3;
  const maxCantrips = getCantripsCount(level);

  // Use reusable enforcer
  enforceSelectionLimit('cantrip', maxCantrips);

  // Update the cantrip count display
  const checked = document.querySelectorAll('input[name="cantrip"]:checked');
  document.querySelector('#cantrip-count .current').textContent = checked.length;
}

function onPreparedChange() {
  const level = parseInt(document.getElementById('f-level').value) || 3;
  var cls = document.getElementById('f-class').value || 'Cleric';
  var cdPrep = CLASS_DATA[cls] || CLASS_DATA.Cleric;
  var castAbil = cdPrep.spellcastingAbility || 'wis';
  const abilScore = parseInt(document.getElementById('score-' + castAbil).value) || 10;
  var maxPrep;
  if (cls === 'Paladin') {
    maxPrep = Math.max(1, mod(abilScore) + Math.floor(level / 2));
  } else {
    maxPrep = Math.max(1, level + mod(abilScore));
  }

  // Use reusable enforcer — strict disable at limit
  enforceSelectionLimit('prepared', maxPrep, 'prepared-count');
}

/* ═══════════════════════════════════════════
   DATA COLLECTION & SAVE
   ═══════════════════════════════════════════ */

function collectFormData() {
  const level = parseInt(document.getElementById('f-level').value) || 3;
  const abilityScores = {};
  ABILITIES.forEach(ab => {
    abilityScores[ab] = parseInt(document.getElementById('score-' + ab).value) || 10;
  });

  const skillProfs = [];
  document.querySelectorAll('input[name="skill-class"]:checked, input[name="skill-other"]:checked').forEach(cb => {
    skillProfs.push(cb.value.toLowerCase());
  });

  const cantrips = [];
  document.querySelectorAll('input[name="cantrip"]:checked').forEach(cb => cantrips.push(cb.value));

  const prepared = [];
  document.querySelectorAll('input[name="prepared"]:checked').forEach(cb => prepared.push(cb.value));

  // HP history
  const hpHistory = [];
  for (let i = 1; i <= level; i++) {
    const gained = parseInt(document.getElementById('hp-gained-' + i)?.value);
    const notes = document.getElementById('hp-notes-' + i)?.value || '';
    if (gained) {
      hpHistory.push({ level: i, gained, method: i === 1 ? 'base' : 'roll', notes });
    }
  }

  const cls = document.getElementById('f-class').value;
  const cd = CLASS_DATA[cls] || CLASS_DATA.Cleric;
  const isCaster = cd.isCaster;

  var result = {
    name: document.getElementById('f-name').value.trim(),
    race: document.getElementById('f-race').value,
    subrace: document.getElementById('f-subrace').value || '',
    class: cls,
    subclass: document.getElementById('f-subclass').value,
    background: document.getElementById('f-background').value.trim(),
    alignment: document.getElementById('f-alignment').value,
    level,
    abilityScores,
    hp: {
      max: parseInt(document.getElementById('f-hp').value) || 0,
      hitDiceType: cd.hitDice,
      hitDiceCount: level,
      hpHistory
    },
    proficiencyBonus: getProfBonus(level),
    ac: parseInt(document.getElementById('f-ac').value) || 0,
    speed: parseInt(document.getElementById('f-speed').value) || 25,
    initiative: mod(abilityScores.dex),
    savingThrows: cd.savingThrows,
    skillProficiencies: skillProfs,
    cantripsKnown: (isCaster && cls !== 'Paladin') ? cantrips : [],
    spellSlots: isCaster ? getSpellSlots(level, cls) : {},
    preparedSpellCount: isCaster ? (cls === 'Paladin' ? Math.max(1, mod(abilityScores[cd.spellcastingAbility]) + Math.floor(level / 2)) : Math.max(1, level + mod(abilityScores[cd.spellcastingAbility]))) : 0,
    currentPreparedSpells: isCaster ? prepared : [],
    domainSpells: (cls === 'Cleric' || cls === 'Paladin') ? getDomainSpells(level, cls, document.getElementById('f-subclass').value) : [],
    features: (cls === 'Cleric') ? getFeatures(level) : (cls === 'Fighter') ? getFighterFeatures(level, document.getElementById('f-subclass').value) : (cls === 'Paladin') ? getPaladinFeatures(level, document.getElementById('f-subclass').value) : (cls === 'Rogue') ? getRogueFeatures(level, document.getElementById('f-subclass').value) : [],
    channelDivinityUses: (cls === 'Cleric' || cls === 'Paladin') ? getChannelDivUses(level, cls) : 0,
    equipment: document.getElementById('f-equipment').value,
    notes: document.getElementById('f-notes').value,
    weapons: collectWeapons(),
    levelHistory: [],
    expertiseSkills: collectExpertiseSkills(),
    resources: {},
    currency: {
      cp: parseInt(document.getElementById('f-currency-cp').value) || 0,
      sp: parseInt(document.getElementById('f-currency-sp').value) || 0,
      ep: parseInt(document.getElementById('f-currency-ep').value) || 0,
      gp: parseInt(document.getElementById('f-currency-gp').value) || 0,
      pp: parseInt(document.getElementById('f-currency-pp').value) || 0
    }
  };

  // Fighter-specific fields
  if (cls === 'Fighter') {
    result.fightingStyle = document.getElementById('f-fighting-style').value || null;
    result.maneuversKnown = [];
    result.spellsKnown = [];
    result.spellSlots = {};
    var sub = document.getElementById('f-subclass').value;
    if (sub === 'Eldritch Knight' && level >= 3) {
      result.spellSlots = getThirdCasterSlots(level);
    }
  }

  // Paladin-specific fields
  if (cls === 'Paladin') {
    result.fightingStyle = (level >= 2) ? (document.getElementById('f-fighting-style').value || null) : null;
    // Level 1 Paladin has no spellcasting
    if (level < 2) {
      result.spellSlots = {};
      result.preparedSpellCount = 0;
      result.currentPreparedSpells = [];
    }
  }

  // Rogue Arcane Trickster fields
  if (cls === 'Rogue') {
    var rogueSub = document.getElementById('f-subclass').value;
    if (rogueSub === 'Arcane Trickster' && level >= 3) {
      result.spellSlots = getThirdCasterSlots(level);
      result.spellsKnown = [];
      // Auto-add Mage Hand
      if (!result.cantripsKnown) result.cantripsKnown = [];
      if (result.cantripsKnown.indexOf('Mage Hand') < 0) {
        result.cantripsKnown.push('Mage Hand');
      }
    }
  }

  return result;
}

function saveCharacter() {
  var character = collectFormData();
  // Handle password
  var pw = document.getElementById('f-password').value;
  if (isEditing && activeCharId) {
    var existing = loadCharacter();
    if (existing) {
      character.id = activeCharId;
      character.levelHistory = existing.levelHistory || [];
      character.currentHp = existing.currentHp !== undefined ? existing.currentHp : character.hp.max;
      character.tempHp = existing.tempHp || 0;
      character.spellSlotsUsed = existing.spellSlotsUsed || {};
      character.channelDivinityUsed = existing.channelDivinityUsed || 0;
      character.currency = character.currency || existing.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
      character.equippedItems = existing.equippedItems || [];
      character.quickItems = existing.quickItems || [];
      character.bulkGear = document.getElementById('f-equipment').value;
      // Preserve Phase 4+ fields
      character.colorTheme = existing.colorTheme || null;
      character.resources = existing.resources || {};
      // Preserve Fighter-specific fields
      if (existing.class === 'Fighter') {
        character.maneuversKnown = existing.maneuversKnown || [];
        character.spellsKnown = existing.spellsKnown || [];
        character.spellSlots = existing.spellSlots || {};
        character.fightingStyle2 = existing.fightingStyle2 || null;
      }
      // Preserve Paladin-specific fields
      if (existing.class === 'Paladin') {
        character.fightingStyle = existing.fightingStyle || character.fightingStyle || null;
      }
      // Password: update if new value entered, keep existing if blank
      character.passwordHash = pw ? simpleHash(pw) : (existing.passwordHash || null);
    }
  } else {
    character = migrateCharacter(character);
    character.currentHp = character.hp.max;
    character.passwordHash = pw ? simpleHash(pw) : null;
    // Set default color theme for new characters
    if (!character.colorTheme) {
      var cdSave = CLASS_DATA[character.class] || CLASS_DATA.Cleric;
      character.colorTheme = Object.assign({}, COLOR_THEMES[cdSave.defaultTheme]);
    }
  }
  activeCharId = character.id;
  unlockSession(character.id);
  saveCurrentCharacter(character);
  isEditing = false;
  // Clear password fields
  document.getElementById('f-password').value = '';
  document.getElementById('f-password-confirm').value = '';
  showDashboard(character);
}

function loadCharacter() {
  if (!activeCharId) return null;
  var chars = loadAllCharacters();
  var c = chars.find(function(ch) { return ch.id === activeCharId; });
  return c ? migrateCharacter(c) : null;
}

/* ═══════════════════════════════════════════
   REVIEW RENDERING
   ═══════════════════════════════════════════ */

function renderReview() {
  const d = collectFormData();
  const container = document.getElementById('review-content');
  const cdRev = CLASS_DATA[d.class] || CLASS_DATA.Cleric;
  const isCasterRev = cdRev.isCaster;
  const spellDC = isCasterRev ? 8 + d.proficiencyBonus + mod(d.abilityScores[cdRev.spellcastingAbility]) : 0;
  const spellAtk = isCasterRev ? d.proficiencyBonus + mod(d.abilityScores[cdRev.spellcastingAbility]) : 0;

  let html = '';

  // Identity
  html += `<div class="review-block">
    <h3>Identity</h3>
    <div class="review-row"><span class="rlabel">Name</span><span class="rvalue">${d.name}</span></div>
    <div class="review-row"><span class="rlabel">Race</span><span class="rvalue">${d.subrace ? d.subrace + ' ' : ''}${d.race}</span></div>
    <div class="review-row"><span class="rlabel">Class</span><span class="rvalue">${d.class}${d.subclass ? ' (' + d.subclass + ')' : ''}</span></div>
    <div class="review-row"><span class="rlabel">Background</span><span class="rvalue">${d.background}</span></div>
    <div class="review-row"><span class="rlabel">Alignment</span><span class="rvalue">${d.alignment}</span></div>
    <div class="review-row"><span class="rlabel">Level</span><span class="rvalue">${d.level}</span></div>
  </div>`;

  // Abilities
  html += `<div class="review-block">
    <h3>Ability Scores</h3>
    <div class="review-abilities">
      ${ABILITIES.map(ab => `<div class="review-ab">
        <div class="ab-name">${ABILITY_NAMES[ab]}</div>
        <div class="ab-val">${d.abilityScores[ab]} (${modStr(d.abilityScores[ab])})</div>
      </div>`).join('')}
    </div>
  </div>`;

  // Combat
  html += `<div class="review-block">
    <h3>Combat</h3>
    <div class="review-row"><span class="rlabel">HP</span><span class="rvalue">${d.hp.max}</span></div>
    <div class="review-row"><span class="rlabel">AC</span><span class="rvalue">${d.ac}</span></div>
    <div class="review-row"><span class="rlabel">Speed</span><span class="rvalue">${d.speed} ft</span></div>
    <div class="review-row"><span class="rlabel">Initiative</span><span class="rvalue">${d.initiative >= 0 ? '+' : ''}${d.initiative}</span></div>
    <div class="review-row"><span class="rlabel">Prof. Bonus</span><span class="rvalue">+${d.proficiencyBonus}</span></div>`;
  if (isCasterRev) {
    html += `<div class="review-row"><span class="rlabel">Spell Save DC</span><span class="rvalue">${spellDC}</span></div>
    <div class="review-row"><span class="rlabel">Spell Attack</span><span class="rvalue">+${spellAtk}</span></div>`;
  }
  // EK/AT: show spell stats even though isCaster is false
  if ((d.class === 'Fighter' && d.subclass === 'Eldritch Knight') || (d.class === 'Rogue' && d.subclass === 'Arcane Trickster')) {
    var ekDC = 8 + d.proficiencyBonus + mod(d.abilityScores.int);
    var ekAtk = d.proficiencyBonus + mod(d.abilityScores.int);
    html += `<div class="review-row"><span class="rlabel">Spell Save DC</span><span class="rvalue">${ekDC}</span></div>
    <div class="review-row"><span class="rlabel">Spell Attack</span><span class="rvalue">+${ekAtk}</span></div>`;
  }
  if ((d.class === 'Fighter' || d.class === 'Paladin') && d.fightingStyle) {
    html += `<div class="review-row"><span class="rlabel">Fighting Style</span><span class="rvalue">${d.fightingStyle}</span></div>`;
  }
  html += `</div>`;

  // Skills & Proficiencies
  const stNames = d.savingThrows.map(st => ABILITY_NAMES[st]).join(', ');
  if (d.skillProficiencies.length > 0 || d.savingThrows.length > 0) {
    const skillNames = d.skillProficiencies.map(s => s.charAt(0).toUpperCase() + s.slice(1));
    html += `<div class="review-block">
      <h3>Proficiencies</h3>
      <div class="review-row"><span class="rlabel">Saving Throws</span><span class="rvalue">${stNames}</span></div>
      <div class="review-row"><span class="rlabel">Skills</span><span class="rvalue">${skillNames.join(', ') || '—'}</span></div>`;
    if (d.expertiseSkills && d.expertiseSkills.length > 0) {
      const expNames = d.expertiseSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1));
      html += `<div class="review-row"><span class="rlabel">Expertise</span><span class="rvalue">${expNames.join(', ')}</span></div>`;
    }
    html += `</div>`;
  }

  // Spells (casters only)
  if (isCasterRev && !(d.class === 'Paladin' && d.level < 2)) {
    const domainList = getDomainSpellList(d.level, d.class, d.subclass);
    const slotEntries = Object.entries(d.spellSlots);
    html += `<div class="review-block">
      <h3>Spells</h3>`;
    if (d.class !== 'Paladin') {
      html += `<div class="review-row"><span class="rlabel">Cantrips</span><span class="rvalue">${d.cantripsKnown.join(', ')}</span></div>`;
    }
    html += `<div class="review-row"><span class="rlabel">Spell Slots</span><span class="rvalue">${slotEntries.map(([l,c]) => `${ordinal(parseInt(l))}: ${c}`).join(' | ')}</span></div>`;
    if (d.class === 'Cleric') {
      html += `<div class="review-row"><span class="rlabel">Domain Spells</span><span class="rvalue">${domainList.join(', ')}</span></div>`;
    }
    if (d.class === 'Paladin' && domainList.length > 0) {
      html += `<div class="review-row"><span class="rlabel">Oath Spells</span><span class="rvalue">${domainList.join(', ')}</span></div>`;
    }
    html += `<div class="review-row"><span class="rlabel">Prepared (${d.currentPreparedSpells.length}/${d.preparedSpellCount})</span><span class="rvalue">${d.currentPreparedSpells.join(', ') || '—'}</span></div>
    </div>`;
  }

  // Features
  if (d.features && d.features.length > 0) {
    html += `<div class="review-block">
      <h3>Features</h3>
      ${d.features.map(f => `<div style="padding:2px 0;font-size:0.9rem">${f}</div>`).join('')}
    </div>`;
  }

  // Weapons
  if (d.weapons && d.weapons.length > 0) {
    html += '<div class="review-block"><h3>Weapons</h3>';
    d.weapons.forEach(w => {
      const abilMod = mod(d.abilityScores[w.ability] || 10);
      const profB = w.proficient ? d.proficiencyBonus : 0;
      html += `<div class="review-row"><span class="rlabel">${w.name}</span><span class="rvalue">+${abilMod + profB} · ${w.damage}+${abilMod} ${w.damageType}${w.notes ? ' · ' + w.notes : ''}</span></div>`;
    });
    html += '</div>';
  }

  // Equipment & Notes (condensed)
  if (d.equipment) {
    html += `<div class="review-block">
      <h3>Equipment</h3>
      <div class="dash-text" style="font-size:0.85rem;max-height:120px;overflow-y:auto">${d.equipment}</div>
    </div>`;
  }
  if (d.notes) {
    html += `<div class="review-block">
      <h3>Notes</h3>
      <div class="dash-text" style="font-size:0.85rem">${d.notes}</div>
    </div>`;
  }

  container.innerHTML = html;
}

