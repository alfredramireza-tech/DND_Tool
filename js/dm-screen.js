// dm-screen.js — DM Screen: home, persistence, encounter management
/* ═══════════════════════════════════════════
   DM SCREEN — PERSISTENCE
   ═══════════════════════════════════════════ */

var _dmUnlocked = false;
var _dmSkipNextCloudLoad = false;

function loadDmData() {
  var data;
  try {
    var raw = localStorage.getItem('dnd_dm_screen');
    if (raw) data = JSON.parse(raw);
  } catch (e) {}
  if (!data) data = { encounters: [], quickMonsters: [], sessionNotes: '' };
  // Ensure password hash exists (default: 'dm')
  if (data.passwordHash === undefined) {
    data.passwordHash = simpleHash('dm');
    localStorage.setItem('dnd_dm_screen', JSON.stringify(data));
  }
  return data;
}

function saveDmData(data, skipCloud) {
  localStorage.setItem('dnd_dm_screen', JSON.stringify(data));
  if (!skipCloud) scheduleDmCloudSave();
}

function showDmChangePassword() {
  showModal(
    '<h3>Change DM Password</h3>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' +
    '<input type="password" id="dm-pw-cur" placeholder="Current password" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem">' +
    '<input type="password" id="dm-pw-new" placeholder="New password" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem">' +
    '<input type="password" id="dm-pw-conf" placeholder="Confirm new password" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem">' +
    '</div>' +
    '<div id="dm-pw-chg-err" style="color:var(--error);font-size:0.85rem;min-height:20px;margin-top:4px"></div>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="applyDmPasswordChange()">Change</button></div>'
  );
  setTimeout(function() { var el = document.getElementById('dm-pw-cur'); if (el) el.focus(); }, 100);
}

function applyDmPasswordChange() {
  var cur = document.getElementById('dm-pw-cur').value;
  var nw = document.getElementById('dm-pw-new').value;
  var conf = document.getElementById('dm-pw-conf').value;
  var err = document.getElementById('dm-pw-chg-err');
  var data = loadDmData();
  if (simpleHash(cur) !== data.passwordHash) { if (err) err.textContent = 'Current password is wrong.'; return; }
  if (!nw) { if (err) err.textContent = 'New password cannot be empty.'; return; }
  if (nw !== conf) { if (err) err.textContent = "Passwords don't match."; return; }
  data.passwordHash = simpleHash(nw);
  saveDmData(data);
  closeModal();
  showDmRollResult('Done', 'Password changed.');
}

var _dmCloudSaveTimer = null;
function scheduleDmCloudSave() {
  if (_dmCloudSaveTimer) clearTimeout(_dmCloudSaveTimer);
  _dmCloudSaveTimer = setTimeout(function() { _dmCloudSaveTimer = null; dmCloudSave(); }, 30000);
}

function isDmCloudConfigured() {
  var headers = getGitHubHeaders();
  return headers && GITHUB_CONFIG.token !== '1AAP39VV4N4V5KNVKYFXO1G8FZn6PMh8PQQaulZ8qj7DB4Zv0XkbFHbxip4_Gw7qoMQWs5Mo0IT7QH2B11_tap_buhtig';
}

function dmCloudSave() {
  if (!isDmCloudConfigured()) return;
  var headers = getGitHubHeaders();
  var data = loadDmData();
  data.lastModified = new Date().toISOString();
  var url = ghApiUrl('dm/dm-screen.json');
  var content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  fetch(url, { headers: headers })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(existing) {
      var body = { message: 'DM Screen update', content: content };
      if (existing && existing.sha) body.sha = existing.sha;
      return fetch(url, { method: 'PUT', headers: headers, body: JSON.stringify(body) });
    })
    .catch(function(e) { console.log('DM cloud save failed:', e); });
}

function dmCloudLoad() {
  if (!isDmCloudConfigured()) return Promise.resolve(null);
  var headers = getGitHubHeaders();
  var url = ghApiUrl('dm/dm-screen.json');
  return fetch(url, { headers: headers })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(d) {
      if (!d || !d.content) return null;
      try {
        var json = decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))));
        return JSON.parse(json);
      } catch(e) { return null; }
    })
    .catch(function() { return null; });
}

/* ═══════════════════════════════════════════
   DM SCREEN — HOME
   ═══════════════════════════════════════════ */

function showDmScreen() {
  stopDmPcSync();
  applyTheme(DM_THEME);
  showView('dm-screen');

  if (!_dmUnlocked) {
    renderDmPasswordPrompt();
    return;
  }

  var localData = loadDmData();
  if (_dmSkipNextCloudLoad) {
    _dmSkipNextCloudLoad = false;
    renderDmHome();
  } else if (localData.encounters.length === 0 && localData.quickMonsters.length === 0 && !localData.sessionNotes) {
    renderDmHome();
    dmCloudLoad().then(function(cloudData) {
      if (cloudData && (cloudData.encounters.length > 0 || cloudData.quickMonsters.length > 0 || cloudData.sessionNotes)) {
        saveDmData(cloudData, true);
        renderDmHome();
      }
    });
  } else {
    renderDmHome();
  }
}

function renderDmPasswordPrompt() {
  var container = document.getElementById('dm-screen-content');
  var html = '<div class="home-screen" style="max-width:320px;margin:0 auto;padding-top:60px">';
  html += '<h2 style="color:var(--accent);text-align:center">\u2694 DM Screen</h2>';
  html += '<input type="password" id="dm-pw-input" placeholder="Enter DM password" style="width:100%;box-sizing:border-box;min-height:48px;padding:10px 14px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem;margin:16px 0 8px" onkeydown="if(event.key===\'Enter\')checkDmPassword()">';
  html += '<div id="dm-pw-error" style="color:var(--error);font-size:0.85rem;min-height:20px;text-align:center"></div>';
  html += '<button class="btn btn-primary" style="width:100%;min-height:48px;margin-top:4px" onclick="checkDmPassword()">Unlock</button>';
  html += '<button class="btn btn-secondary" style="width:100%;margin-top:12px" onclick="_dmUnlocked=false;showHomeScreen()">\u2190 Back to Home</button>';
  html += '</div>';
  container.innerHTML = html;
  setTimeout(function() { var el = document.getElementById('dm-pw-input'); if (el) el.focus(); }, 100);
}

function checkDmPassword() {
  var input = document.getElementById('dm-pw-input');
  var val = input ? input.value : '';
  var data = loadDmData();
  if (simpleHash(val) === data.passwordHash) {
    _dmUnlocked = true;
    showDmScreen();
  } else {
    var err = document.getElementById('dm-pw-error');
    if (err) err.textContent = 'Wrong password';
    if (input) { input.value = ''; input.focus(); }
  }
}

function showDmScreenHome() { showDmScreen(); }

function renderDmHome() {
  var data = loadDmData();
  var container = document.getElementById('dm-screen-content');
  var html = '<div class="home-screen">';

  // Header
  html += '<h1 style="color:var(--accent)">\u2694 DM Screen</h1>';

  // Active encounter banner
  var active = data.encounters.find(function(e) { return e.active; });
  if (active) {
    html += '<div style="margin:16px 0;padding:16px;background:var(--surface-raised);border:2px solid var(--accent);border-radius:var(--radius);text-align:center;cursor:pointer" onclick="resumeEncounter()">';
    html += '<div style="font-size:1.2rem;font-weight:bold;color:var(--accent)">\u25b6 Resume: ' + escapeHtml(active.name || 'Unnamed Encounter') + '</div>';
    html += '<div class="text-dim" style="font-size:0.9rem">Round ' + (active.round || 1) + '</div>';
    html += '</div>';
  } else {
    html += '<button class="btn btn-primary btn-large" style="width:100%;margin:16px 0" onclick="newEncounter()">+ New Encounter</button>';
  }

  // Monster Library
  html += '<h2 style="margin-top:24px">Monster Library</h2>';
  if (data.quickMonsters.length > 0) {
    data.quickMonsters.forEach(function(m, idx) {
      html += '<div class="dm-library-row">';
      html += '<div><strong>' + escapeHtml(m.name || 'Monster') + '</strong>';
      html += ' <span class="dm-library-stats">AC ' + (m.ac || '?') + ' \u2022 HP ' + (m.hpFormula || m.maxHp || '?') + ' \u2022 Atk ' + (m.attackBonus ? '+' + m.attackBonus : '\u2014') + (m.damageDice ? ' \u2022 ' + m.damageDice + (m.damageType ? ' ' + m.damageType : '') : '') + '</span></div>';
      html += '<div class="dm-library-actions">';
      html += '<button class="btn btn-secondary" style="font-size:0.75rem;padding:4px 8px" onclick="showEditMonsterTemplate(' + idx + ')">Edit</button>';
      html += '<button class="btn btn-secondary" style="font-size:0.75rem;padding:4px 8px;color:var(--error)" onclick="confirmDeleteMonsterTemplate(' + idx + ')">\u00d7</button>';
      html += '</div></div>';
    });
  } else {
    html += '<p class="text-dim">No saved monsters yet.</p>';
  }
  html += '<button class="btn btn-secondary" style="margin-top:8px" onclick="showAddMonsterTemplateForm()">+ Add Monster Template</button>';

  // Session Notes
  html += '<h2 style="margin-top:24px">Session Notes</h2>';
  html += '<textarea id="dm-session-notes" style="width:100%;box-sizing:border-box;min-height:200px;padding:12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-family:inherit;font-size:0.9rem;resize:vertical" onblur="saveDmSessionNotes()">' + escapeHtml(data.sessionNotes || '') + '</textarea>';

  // Past Encounters
  var past = data.encounters.filter(function(e) { return !e.active; }).sort(function(a, b) { return (b.created || 0) - (a.created || 0); });
  if (past.length > 0) {
    html += '<h2 style="margin-top:24px">Past Encounters</h2>';
    past.forEach(function(enc) {
      var ago = enc.created ? getRelativeTime(enc.created) : '';
      html += '<div style="padding:8px 12px;background:var(--surface);border-radius:var(--radius);margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="viewPastEncounter(\'' + enc.id + '\')">';
      html += '<div><strong>' + escapeHtml(enc.name || 'Unnamed') + '</strong>';
      html += ' <span class="text-dim" style="font-size:0.85rem">' + (enc.round || 0) + ' rounds' + (ago ? ' \u2022 ' + ago : '') + '</span></div>';
      html += '<button class="btn btn-secondary" style="padding:2px 8px;font-size:0.8rem;color:var(--error);min-height:28px" onclick="event.stopPropagation();deletePastEncounter(\'' + enc.id + '\')">\u00d7</button>';
      html += '</div>';
    });
  }

  // Back button
  html += '<div style="margin-top:24px">';
  html += '<button class="btn btn-secondary" onclick="showDmChangePassword()" style="width:100%;margin-bottom:8px">Change DM Password</button>';
  html += '<button class="btn btn-secondary" onclick="_dmUnlocked=false;showHomeScreen()" style="width:100%">\u2190 Back to Home</button>';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;
}

function saveDmSessionNotes() {
  var el = document.getElementById('dm-session-notes');
  if (!el) return;
  var data = loadDmData();
  data.sessionNotes = el.value;
  saveDmData(data);
}

function getRelativeTime(timestamp) {
  var now = Date.now();
  var diff = now - timestamp;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
  var days = Math.floor(hours / 24);
  return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}

/* ═══════════════════════════════════════════
   DM SCREEN — ENCOUNTER LIFECYCLE
   ═══════════════════════════════════════════ */

function newEncounter() {
  showModal(
    '<h3>New Encounter</h3>' +
    '<input type="text" id="dm-enc-name" placeholder="Encounter 1" style="width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem;margin-bottom:12px">' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="createEncounter()">Create</button></div>'
  );
  setTimeout(function() { var el = document.getElementById('dm-enc-name'); if (el) el.focus(); }, 100);
}

function createEncounter() {
  var nameEl = document.getElementById('dm-enc-name');
  var name = nameEl ? nameEl.value.trim() : '';
  var data = loadDmData();
  // Deactivate any existing active encounter
  data.encounters.forEach(function(e) { e.active = false; });
  var enc = {
    id: 'enc_' + Date.now(),
    name: name || 'Encounter 1',
    created: Date.now(),
    initiative: [],
    currentTurn: 0,
    round: 0,
    notes: '',
    log: [],
    active: true
  };
  data.encounters.push(enc);
  saveDmData(data);
  closeModal();
  showDmEncounter();
  // Auto-import PCs from Party View
  if (isDmCloudConfigured()) {
    var headers = getGitHubHeaders();
    fetchPartyChars(headers).then(function(chars) {
      if (!chars || chars.length === 0) return;
      var freshEnc = getActiveEncounter();
      if (!freshEnc) return;
      chars.forEach(function(ch) {
        freshEnc.initiative.push({
          id: 'init_pc_' + ch.id,
          name: ch.name,
          type: 'pc',
          charId: ch.id,
          initiative: null,
          ac: (ch.equippedItems && ch.equippedItems.length > 0) ? calculateAC(ch) : ch.ac,
          maxHp: getEffectiveMaxHp(ch),
          currentHp: ch.currentHp !== undefined ? ch.currentHp : getEffectiveMaxHp(ch),
          conditions: (ch.activeConditions || []).slice(),
          concentration: ch.concentration && ch.concentration.active ? ch.concentration.spellName : null,
          attack: '', notes: '', dexMod: null
        });
      });
      saveActiveEncounter(freshEnc);
      showDmRollResult('Imported', chars.length + ' PCs from Party View');
      showDmEncounter();
    }).catch(function() {
      // Cloud not available — DM adds PCs manually
    });
  }
}

function resumeEncounter() {
  showDmEncounter();
}

function getActiveEncounter() {
  var data = loadDmData();
  return data.encounters.find(function(e) { return e.active; });
}

function saveActiveEncounter(enc) {
  var data = loadDmData();
  var idx = data.encounters.findIndex(function(e) { return e.id === enc.id; });
  if (idx >= 0) data.encounters[idx] = enc;
  saveDmData(data);
}

/* ═══════════════════════════════════════════
   DM SCREEN — ENCOUNTER VIEW
   ═══════════════════════════════════════════ */

function showDmEncounter() {
  var enc = getActiveEncounter();
  if (!enc) { showDmScreen(); return; }
  applyTheme(DM_THEME);
  showView('dm-screen');
  var container = document.getElementById('dm-screen-content');

  if (enc.round === 0) {
    renderEncounterSetup(container, enc);
  } else {
    renderEncounterBattle(container, enc);
  }
}

function renderEncounterSetup(container, enc) {
  var html = '<div style="padding:0 8px">';
  html += '<h1 style="color:var(--accent);margin-bottom:16px">' + escapeHtml(enc.name) + ' — Setup</h1>';

  // Combatant list
  if (enc.initiative.length > 0) {
    enc.initiative.forEach(function(entry, i) {
      var rowClass = entry.type === 'pc' ? 'dm-row dm-row-pc' : 'dm-row dm-row-npc';
      html += '<div class="' + rowClass + '" id="dm-init-' + i + '">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">';
      html += '<div><strong>' + escapeHtml(entry.name) + '</strong> <span class="text-dim" style="font-size:0.8rem">(' + entry.type.toUpperCase() + ')</span></div>';
      html += '<div style="display:flex;align-items:center;gap:8px">';
      html += '<label style="font-size:0.8rem;color:var(--text-dim)">Init:</label>';
      html += '<input type="number" class="dm-initiative-input" id="dm-init-val-' + i + '" value="' + (entry.initiative !== null && entry.initiative !== undefined ? entry.initiative : '') + '" placeholder="—">';
      html += '<span class="text-dim" style="font-size:0.85rem">AC ' + (entry.ac || '?') + '</span>';
      html += '<span class="text-dim" style="font-size:0.85rem">HP ' + entry.currentHp + '/' + entry.maxHp + '</span>';
      if (entry.type === 'npc') html += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:0.75rem;min-height:32px" onclick="showDuplicateMonsterModal(\'' + entry.id + '\')">Dup</button>';
      html += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:0.75rem;min-height:32px;color:var(--error)" onclick="removeInitEntry(' + i + ')">\u00d7</button>';
      html += '</div></div></div>';
    });
  } else {
    html += '<p class="text-dim" style="text-align:center;margin:24px 0">Add combatants to begin</p>';
  }

  // Action buttons
  html += '<div style="display:flex;gap:8px;margin:16px 0;flex-wrap:wrap">';
  html += '<button class="btn btn-secondary" style="flex:1;min-height:44px" onclick="showAddMonsterForm()">+ Add Monster</button>';
  html += '<button class="btn btn-secondary" style="flex:1;min-height:44px" onclick="showAddPcForm()">+ Add PC</button>';
  html += '</div>';

  // Auto-roll NPC initiative
  var hasNpcWithDex = enc.initiative.some(function(e) { return e.type === 'npc' && e.dexMod !== null; });
  if (hasNpcWithDex) {
    html += '<button class="btn btn-secondary" style="width:100%;min-height:44px;margin-bottom:8px" onclick="rollAllNpcInitiative()">Roll All NPC Initiative</button>';
  }

  // Start Combat button — always enabled, validates on click
  html += '<button class="btn btn-primary btn-large" style="width:100%;min-height:48px;margin-bottom:12px" onclick="startCombat()">Start Combat</button>';

  html += '<button class="btn btn-secondary" style="width:100%;margin-bottom:8px" onclick="showDmScreen()">\u2190 Back to DM Screen</button>';
  html += '<button class="btn btn-secondary" style="width:100%;color:var(--error)" onclick="abandonEncounter()">Abandon Encounter</button>';
  html += '</div>';
  container.innerHTML = html;
}

function abandonEncounter() {
  showModal(
    '<h3>Abandon Encounter?</h3>' +
    '<p>It will be deleted. This cannot be undone.</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" style="background:var(--error)" onclick="confirmAbandonEncounter()">Abandon</button></div>'
  );
}

function confirmAbandonEncounter() {
  var enc = getActiveEncounter();
  if (!enc) { closeModal(); showDmScreen(); return; }
  var data = loadDmData();
  data.encounters = data.encounters.filter(function(e) { return e.id !== enc.id; });
  saveDmData(data);
  dmCloudSave();
  closeModal();
  _dmSkipNextCloudLoad = true;
  showDmScreen();
}

function renderEncounterBattle(container, enc) {
  var html = '<div class="dm-combat" style="padding:0 8px;padding-bottom:80px">';

  // Header bar
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  html += '<div><h2 style="margin:0;color:var(--accent)">Round ' + enc.round + '</h2>';
  if (_dmPcSyncInterval) {
    var syncAgo = _dmLastSyncTime ? getRelativeTime(_dmLastSyncTime) : '';
    html += '<span id="dm-sync-time" class="text-dim" style="font-size:0.75rem">' + (syncAgo ? 'Synced ' + syncAgo : '') + '</span>';
  }
  html += '</div>';
  html += '<button class="btn btn-secondary" style="font-size:0.85rem;padding:6px 14px" onclick="endEncounter()">End Combat</button>';
  html += '</div>';

  // Roll result banner
  html += '<div id="dm-roll-result" class="dm-roll-result" style="display:none"></div>';

  // Initiative list
  enc.initiative.forEach(function(entry, i) {
    html += renderInitiativeRow(entry, i, enc);
  });

  // Multi-target controls
  if (dmMultiSelectMode) {
    var selCount = dmSelectedIds.length;
    html += '<div style="display:flex;gap:8px;margin:8px 0">';
    html += '<button class="btn btn-primary" style="flex:2;min-height:44px"' + (selCount > 0 ? ' onclick="showDealDamageToSelectedModal()"' : ' disabled style="opacity:0.4"') + '>Deal Damage to Selected (' + selCount + ')</button>';
    html += '<button class="btn btn-secondary" style="flex:1;min-height:44px" onclick="toggleDmMultiSelect()">Cancel</button>';
    html += '</div>';
  } else {
    html += '<div style="margin:8px 0"><button class="btn btn-secondary" style="min-height:44px" onclick="toggleDmMultiSelect()">Select Multiple</button></div>';
  }

  // Encounter log
  html += renderEncounterLog(enc);

  // Per-encounter notes
  html += '<details style="margin:8px 0"><summary class="text-dim" style="cursor:pointer;font-size:0.9rem">Encounter Notes</summary>';
  html += '<textarea id="dm-enc-notes" style="width:100%;box-sizing:border-box;min-height:100px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:0.85rem;margin-top:4px;resize:vertical" onblur="saveDmEncNotes()">' + escapeHtml(enc.notes || '') + '</textarea>';
  html += '</details>';

  // Turn controls (sticky bottom)
  var nextName = peekNextLiving(enc);
  html += '<div class="dm-turn-controls">';
  html += '<button class="btn btn-secondary" style="flex:1;min-height:48px" onclick="prevTurn()">\u2190 Prev</button>';
  html += '<button class="btn btn-primary" style="flex:2;min-height:48px" onclick="nextTurn()">Next \u2192 ' + escapeHtml(nextName) + '</button>';
  html += '</div>';

  html += '<button class="btn btn-secondary" style="width:100%;margin-top:12px" onclick="showDmScreen()">\u2190 Back to DM Screen</button>';
  html += '</div>';
  container.innerHTML = html;

  // Auto-scroll to active row
  var activeRow = document.getElementById('dm-init-' + enc.currentTurn);
  if (activeRow) activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderInitiativeRow(entry, index, encounter) {
  var isActive = index === encounter.currentTurn;
  var isDead = entry.type === 'npc' && entry.currentHp <= 0;

  // Dead NPC — collapsed
  if (isDead) {
    return '<div class="dm-row dm-row-npc dm-row-dead" id="dm-init-' + index + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<span>' + escapeHtml(entry.name) + ' — <strong style="color:var(--error)">DEAD</strong></span>' +
      '<button class="btn btn-secondary" style="padding:4px 8px;font-size:0.75rem;min-height:32px" onclick="undoKill(' + index + ')">Undo</button>' +
      '</div></div>';
  }

  var rowClass = entry.type === 'pc' ? 'dm-row dm-row-pc' : 'dm-row dm-row-npc';
  if (isActive) rowClass += ' dm-row-active';

  var html = '<div class="' + rowClass + '" id="dm-init-' + index + '">';

  // Multi-select checkbox
  if (dmMultiSelectMode && entry.type === 'npc') {
    var checked = dmSelectedIds.indexOf(entry.id) >= 0 ? ' checked' : '';
    html += '<label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;cursor:pointer"><input type="checkbox"' + checked + ' onclick="toggleDmSelectTarget(\'' + entry.id + '\')"> Select</label>';
  }

  // Top line: name, init, AC, Move button
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
  html += '<div><strong>' + escapeHtml(entry.name) + '</strong>';
  if (entry.type === 'pc') html += ' <span style="font-size:0.75rem;background:#4a6a9a;color:#fff;padding:1px 6px;border-radius:4px">PC</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:6px">';
  html += '<span class="text-dim" style="font-size:0.85rem">Init ' + (entry.initiative !== null && entry.initiative !== '' ? entry.initiative : '?') + ' \u2022 AC ' + (entry.ac || '?') + '</span>';
  html += '<button class="btn btn-secondary" style="padding:2px 6px;font-size:0.7rem;min-height:28px" onclick="showMoveAfter(\'' + entry.id + '\')">Move</button>';
  html += '</div></div>';

  // HP
  if (entry.type === 'pc') {
    html += '<div style="font-size:0.9rem;color:var(--text-dim)">HP ' + entry.currentHp + '/' + entry.maxHp;
    if (entry.currentHp <= 0) html += ' <span style="color:var(--error);font-weight:bold">— Unconscious</span>';
    html += '</div>';
  } else {
    // NPC HP bar
    var pct = entry.maxHp > 0 ? (entry.currentHp / entry.maxHp * 100) : 0;
    var barColor = pct > 50 ? 'var(--success)' : pct > 25 ? '#f9a825' : 'var(--error)';
    html += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0">';
    html += '<div class="dm-hp-bar"><div class="dm-hp-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>';
    html += '<span style="font-size:0.85rem;min-width:60px">' + entry.currentHp + '/' + entry.maxHp + '</span>';
    html += '</div>';

    // NPC action buttons
    html += '<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">';
    html += '<button class="btn btn-secondary" style="min-height:44px;padding:6px 12px;font-size:0.85rem" onclick="showDealDamageModal(\'' + entry.id + '\')">Deal Dmg</button>';
    html += '<button class="btn btn-secondary" style="min-height:44px;padding:6px 12px;font-size:0.85rem" onclick="showHealModal(\'' + entry.id + '\')">Heal</button>';
    if (entry.attackBonus !== null && entry.attackBonus !== undefined) {
      html += '<button class="btn btn-secondary" style="min-height:44px;padding:6px 12px;font-size:0.85rem" onclick="rollDmAttack(\'' + entry.id + '\')">Roll Atk</button>';
    }
    if (entry.damageDice) {
      html += '<button class="btn btn-secondary" style="min-height:44px;padding:6px 12px;font-size:0.85rem" onclick="rollDmDamage(\'' + entry.id + '\')">Roll Dmg</button>';
    }
    html += '<button class="btn btn-secondary" style="min-height:44px;padding:6px 8px;font-size:0.75rem" onclick="showDmConditionPicker(\'' + entry.id + '\')">+Cond</button>';
    html += '<button class="btn btn-secondary" style="min-height:44px;padding:6px 8px;font-size:0.75rem" onclick="showSetDmConcentration(\'' + entry.id + '\')">Conc</button>';
    html += '<button class="btn btn-secondary" style="min-height:44px;padding:6px 8px;font-size:0.75rem" onclick="saveMonsterToLibrary(\'' + entry.id + '\')">Save</button>';
    html += '</div>';

    // Attack text (if no roll buttons)
    if ((entry.attackBonus === null || entry.attackBonus === undefined) && entry.attack) {
      html += '<div class="text-dim" style="font-size:0.8rem;margin-top:4px">\u2694 ' + escapeHtml(entry.attack) + '</div>';
    }
  }

  // Concentration badge
  if (entry.concentration) {
    html += '<div style="margin-top:4px"><span class="dm-conc-badge" onclick="showSetDmConcentration(\'' + entry.id + '\')">\u27e1 ' + escapeHtml(entry.concentration) + '</span></div>';
  }

  // Condition badges
  if (entry.conditions && entry.conditions.length > 0) {
    html += '<div style="margin-top:4px">';
    entry.conditions.forEach(function(cond) {
      html += '<span class="dm-cond-badge" onclick="removeDmCondition(\'' + entry.id + '\',\'' + cond.replace(/'/g, "\\'") + '\')">' + escapeHtml(cond) + ' \u00d7</span>';
    });
    html += '</div>';
    // Condition reminders on active turn
    if (isActive) {
      html += '<details open class="dm-cond-reminder"><summary style="font-size:0.8rem;color:var(--accent);cursor:pointer">Condition Reminders</summary>';
      entry.conditions.forEach(function(cond) {
        var desc = (typeof getConditionDesc === 'function') ? getConditionDesc(cond) : '';
        html += '<div style="padding:2px 0;font-size:0.8rem"><strong>' + escapeHtml(cond) + ':</strong> ' + escapeHtml(desc) + '</div>';
      });
      html += '</details>';
    }
  }

  // PC condition badges (read-only display)
  if (entry.type === 'pc' && entry.conditions && entry.conditions.length > 0) {
    // Already rendered above
  }

  // Notes (inline editable for NPCs)
  if (entry.type === 'npc') {
    html += '<details style="margin-top:4px"><summary class="text-dim" style="font-size:0.8rem;cursor:pointer">' + (entry.notes ? 'Notes: ' + escapeHtml(entry.notes.substring(0, 40)) + (entry.notes.length > 40 ? '...' : '') : 'Notes') + '</summary>';
    html += '<textarea class="dm-notes-inline" onblur="saveDmMonsterNote(\'' + entry.id + '\',this.value)">' + escapeHtml(entry.notes || '') + '</textarea>';
    html += '</details>';
  } else if (entry.notes) {
    html += '<div class="text-dim" style="font-size:0.8rem;margin-top:2px;font-style:italic">' + escapeHtml(entry.notes) + '</div>';
  }

  html += '</div>';
  return html;
}

/* ═══════════════════════════════════════════
   DM SCREEN — ADD COMBATANTS
   ═══════════════════════════════════════════ */

var _dmMonHpFormula = null; // Module-level: tracks if HP field is a dice formula

function showAddMonsterForm(template) {
  var t = template || {};
  _dmMonHpFormula = t.hpFormula || null;
  var data = loadDmData();
  var html = '<h3>Add Monster</h3>';

  // Library quick-add section
  if (data.quickMonsters.length > 0) {
    html += '<div style="margin-bottom:12px"><div class="text-dim" style="font-size:0.8rem;margin-bottom:4px">From Library:</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    data.quickMonsters.forEach(function(m, idx) {
      html += '<button class="btn btn-secondary" style="font-size:0.8rem;padding:4px 8px" onclick="fillFromLibrary(' + idx + ')">' + escapeHtml(m.name) + '</button>';
    });
    html += '</div></div>';
  }

  html += '<div style="display:flex;flex-direction:column;gap:8px;max-height:350px;overflow-y:auto">';
  html += '<input type="text" id="dm-mon-name" placeholder="Name (required)" value="' + escapeHtml(t.name || '') + '" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<div style="display:flex;gap:8px;align-items:center">';
  html += '<input type="number" id="dm-mon-ac" placeholder="AC" value="' + (t.ac || '') + '" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<input type="text" id="dm-mon-hp" placeholder="HP or dice (2d8+4)" value="' + escapeHtml(t.hpFormula || (t.maxHp ? '' + t.maxHp : '')) + '" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)" oninput="clearDmHpRollResult()">';
  html += '<button class="btn btn-secondary" style="min-height:44px;padding:8px 10px;white-space:nowrap" onclick="previewHpRoll()" title="Roll HP">🎲</button>';
  html += '</div>';
  html += '<div id="dm-hp-roll-result" style="font-size:0.85rem;color:var(--accent);min-height:18px;margin-top:-4px;padding-left:4px"></div>';
  html += '<div style="display:flex;gap:8px">';
  html += '<input type="number" id="dm-mon-atk" placeholder="Atk Bonus" value="' + (t.attackBonus || '') + '" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<input type="number" id="dm-mon-dex" placeholder="DEX Mod" value="' + (t.dexMod || '') + '" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<div style="display:flex;gap:8px">';
  html += '<input type="text" id="dm-mon-dmg" placeholder="Damage (e.g. 1d6+2)" value="' + escapeHtml(t.damageDice || '') + '" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<input type="text" id="dm-mon-dtype" placeholder="Type (slashing)" value="' + escapeHtml(t.damageType || '') + '" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<input type="text" id="dm-mon-notes" placeholder="Notes (optional)" value="' + escapeHtml(t.notes || '') + '" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<div class="confirm-actions" style="margin-top:12px">';
  html += '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  var enc = getActiveEncounter();
  if (enc) {
    html += '<button class="btn btn-secondary" onclick="confirmAddMonster(true)">Save & Add</button>';
    html += '<button class="btn btn-primary" onclick="confirmAddMonster(false)">Add</button>';
  } else {
    html += '<button class="btn btn-primary" onclick="confirmSaveTemplateOnly()">Save to Library</button>';
  }
  html += '</div>';
  showModal(html);
  setTimeout(function() { var el = document.getElementById('dm-mon-name'); if (el) el.focus(); }, 100);
}

function fillFromLibrary(idx) {
  var data = loadDmData();
  var t = data.quickMonsters[idx];
  if (!t) return;
  document.getElementById('dm-mon-name').value = t.name || '';
  document.getElementById('dm-mon-ac').value = t.ac || '';
  document.getElementById('dm-mon-hp').value = t.hpFormula || t.maxHp || '';
  document.getElementById('dm-mon-atk').value = t.attackBonus || '';
  document.getElementById('dm-mon-dex').value = t.dexMod || '';
  document.getElementById('dm-mon-dmg').value = t.damageDice || '';
  document.getElementById('dm-mon-dtype').value = t.damageType || '';
  document.getElementById('dm-mon-notes').value = t.notes || '';
  _dmMonHpFormula = t.hpFormula || null;
}

function rollHpFormula(formula) {
  var parsed = parseDmDice(formula);
  if (!parsed) return Math.max(1, parseInt(formula) || 1);
  var results = [];
  for (var i = 0; i < parsed.count; i++) results.push(rollDie(parsed.sides));
  var total = results.reduce(function(a, b) { return a + b; }, 0) + parsed.modifier;
  return Math.max(1, total);
}

function confirmAddMonster(alsoSaveToLibrary) {
  var name = (document.getElementById('dm-mon-name').value || '').trim();
  if (!name) { alert('Name is required.'); return; }
  var ac = parseInt(document.getElementById('dm-mon-ac').value) || 10;
  var hpRaw = (document.getElementById('dm-mon-hp').value || '').trim();
  var hpFormula = parseDmDice(hpRaw) ? hpRaw : null;
  var hp = hpFormula ? rollHpFormula(hpFormula) : (parseInt(hpRaw) || 1);
  var atkBonus = parseInt(document.getElementById('dm-mon-atk').value) || null;
  var dmgDice = (document.getElementById('dm-mon-dmg').value || '').trim();
  var dmgType = (document.getElementById('dm-mon-dtype').value || '').trim();
  var dexMod = parseInt(document.getElementById('dm-mon-dex').value) || null;
  var notes = (document.getElementById('dm-mon-notes').value || '').trim();

  var enc = getActiveEncounter();
  if (!enc) { alert('No active encounter. Use "Save to Library" instead.'); return; }
  var entry = {
    id: 'init_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: name, type: 'npc', initiative: null,
    ac: ac, maxHp: hp, currentHp: hp,
    conditions: [], concentration: null,
    attackBonus: atkBonus,
    damageDice: dmgDice,
    damageType: dmgType,
    attack: (atkBonus ? '+' + atkBonus : '') + (dmgDice ? (atkBonus ? ', ' : '') + dmgDice : '') + (dmgType ? ' ' + dmgType : ''),
    notes: notes,
    dexMod: dexMod,
    hpFormula: hpFormula
  };
  enc.initiative.push(entry);
  saveActiveEncounter(enc);

  if (alsoSaveToLibrary) {
    saveMonsterTemplate(entry);
  }

  closeModal();
  showDmEncounter();
}

function confirmSaveTemplateOnly() {
  var name = (document.getElementById('dm-mon-name').value || '').trim();
  if (!name) { alert('Name is required.'); return; }
  var ac = parseInt(document.getElementById('dm-mon-ac').value) || 10;
  var hpRaw = (document.getElementById('dm-mon-hp').value || '').trim();
  var hpFormula = parseDmDice(hpRaw) ? hpRaw : null;
  var hp = hpFormula ? rollHpFormula(hpFormula) : (parseInt(hpRaw) || 1);
  var atkBonus = parseInt(document.getElementById('dm-mon-atk').value) || null;
  var dmgDice = (document.getElementById('dm-mon-dmg').value || '').trim();
  var dmgType = (document.getElementById('dm-mon-dtype').value || '').trim();
  var dexMod = parseInt(document.getElementById('dm-mon-dex').value) || null;
  var notes = (document.getElementById('dm-mon-notes').value || '').trim();
  saveMonsterTemplate({ name: name, ac: ac, maxHp: hp, hpFormula: hpFormula, attackBonus: atkBonus, damageDice: dmgDice, damageType: dmgType, dexMod: dexMod, notes: notes });
  closeModal();
  showDmScreen();
}

function previewHpRoll() {
  var hpRaw = (document.getElementById('dm-mon-hp').value || '').trim();
  if (!hpRaw) { showDmHpRollResult('Enter a dice formula first'); return; }
  var formula = parseDmDice(hpRaw) ? hpRaw : null;
  if (!formula) { showDmHpRollResult('Not a dice formula — using ' + (parseInt(hpRaw) || 1) + ' HP'); return; }
  var result = rollHpFormula(formula);
  showDmHpRollResult('→ ' + result + ' HP');
}

function showDmHpRollResult(msg) {
  var el = document.getElementById('dm-hp-roll-result');
  if (el) el.textContent = msg;
}

function clearDmHpRollResult() {
  var el = document.getElementById('dm-hp-roll-result');
  if (el) el.textContent = '';
}

function showAddPcForm() {
  var html = '<h3>Add PC</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:8px">';
  html += '<input type="text" id="dm-pc-name" placeholder="Name (required)" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<div style="display:flex;gap:8px">';
  html += '<input type="number" id="dm-pc-ac" placeholder="AC" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<input type="number" id="dm-pc-maxhp" placeholder="Max HP" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<input type="number" id="dm-pc-curhp" placeholder="Current HP (defaults to Max)" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<div class="confirm-actions" style="margin-top:12px">';
  html += '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="confirmAddPc()">Add</button></div>';
  showModal(html);
  setTimeout(function() { var el = document.getElementById('dm-pc-name'); if (el) el.focus(); }, 100);
}

function confirmAddPc() {
  var name = (document.getElementById('dm-pc-name').value || '').trim();
  if (!name) { alert('Name is required.'); return; }
  var ac = parseInt(document.getElementById('dm-pc-ac').value) || 10;
  var maxHp = parseInt(document.getElementById('dm-pc-maxhp').value) || 1;
  var curHp = parseInt(document.getElementById('dm-pc-curhp').value) || maxHp;

  var enc = getActiveEncounter();
  if (!enc) return;
  enc.initiative.push({
    id: 'init_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: name, type: 'pc', initiative: null,
    ac: ac, maxHp: maxHp, currentHp: curHp,
    conditions: [], concentration: null,
    attack: '', notes: '', dexMod: null
  });
  saveActiveEncounter(enc);
  closeModal();
  showDmEncounter();
}

function removeInitEntry(index) {
  var enc = getActiveEncounter();
  if (!enc) return;
  enc.initiative.splice(index, 1);
  saveActiveEncounter(enc);
  showDmEncounter();
}

/* ═══════════════════════════════════════════
   DM SCREEN — COMBAT MANAGEMENT
   ═══════════════════════════════════════════ */

function startCombat() {
  var enc = getActiveEncounter();
  if (!enc) return;
  // Read initiative values from inputs
  enc.initiative.forEach(function(entry, i) {
    var el = document.getElementById('dm-init-val-' + i);
    if (el) {
      var parsed = parseFloat(el.value);
      entry.initiative = isNaN(parsed) ? null : parsed;
    }
  });
  // Validate: at least 1 PC and 1 NPC with initiative entered, at least 2 combatants
  var hasPc = enc.initiative.some(function(e) { return e.type === 'pc' && e.initiative !== null; });
  var hasNpc = enc.initiative.some(function(e) { return e.type === 'npc' && e.initiative !== null; });
  if (enc.initiative.length < 2 || !hasPc || !hasNpc) {
    showDmRollResult('Cannot Start', 'Enter initiative for at least 1 PC and 1 NPC');
    return;
  }
  // Sort by initiative descending (ties: higher DEX mod wins, else keep order)
  enc.initiative.sort(function(a, b) {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return (b.dexMod || 0) - (a.dexMod || 0);
  });
  enc.round = 1;
  enc.currentTurn = 0;
  logEncounterEvent('Combat started — ' + enc.initiative.length + ' combatants');
  saveActiveEncounter(enc);
  startDmPcSync();
  showDmEncounter();
}

function nextTurn() {
  var enc = getActiveEncounter();
  if (!enc) return;
  var len = enc.initiative.length;
  if (len === 0) return;
  var start = enc.currentTurn;
  var idx = start;
  for (var i = 0; i < len; i++) {
    idx = (idx + 1) % len;
    if (idx === 0 && i > 0) enc.round++;
    var e = enc.initiative[idx];
    if (e.type === 'pc' || e.currentHp > 0) {
      enc.currentTurn = idx;
      logEncounterEvent('Round ' + enc.round + ' — ' + e.name + "'s turn");
      break;
    }
  }
  saveActiveEncounter(enc);
  showDmEncounter();
}

function prevTurn() {
  var enc = getActiveEncounter();
  if (!enc) return;
  var len = enc.initiative.length;
  if (len === 0) return;
  var start = enc.currentTurn;
  var idx = start;
  for (var i = 0; i < len; i++) {
    idx = (idx - 1 + len) % len;
    if (idx === len - 1 && i > 0) enc.round = Math.max(1, enc.round - 1);
    var e = enc.initiative[idx];
    if (e.type === 'pc' || e.currentHp > 0) { enc.currentTurn = idx; break; }
  }
  saveActiveEncounter(enc);
  showDmEncounter();
}

function peekNextLiving(enc) {
  var len = enc.initiative.length;
  if (len === 0) return '?';
  var idx = enc.currentTurn;
  for (var i = 0; i < len; i++) {
    idx = (idx + 1) % len;
    var e = enc.initiative[idx];
    if (e.type === 'pc' || e.currentHp > 0) return e.name;
  }
  return '?';
}

function endEncounter() {
  showModal(
    '<h3>End Combat?</h3><p>This encounter will be saved to history.</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="confirmEndEncounter()">End Combat</button></div>'
  );
}

function confirmEndEncounter() {
  stopDmPcSync();
  var enc = getActiveEncounter();
  if (!enc) { closeModal(); showDmScreen(); return; }
  logEncounterEvent('Combat ended — Round ' + enc.round);
  enc.active = false;
  saveActiveEncounter(enc);
  closeModal();
  showDmScreen();
}

function undoKill(index) {
  var enc = getActiveEncounter();
  if (!enc || !enc.initiative[index]) return;
  enc.initiative[index].currentHp = 1;
  logEncounterEvent(enc.initiative[index].name + ' revived (Undo)');
  saveActiveEncounter(enc);
  showDmEncounter();
}

/* ═══════════════════════════════════════════
   DM SCREEN — HP MODIFICATION
   ═══════════════════════════════════════════ */

function showDealDamageModal(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  showModal(
    '<h3>Deal Damage to ' + escapeHtml(entry.name) + '</h3>' +
    '<p class="text-dim" style="font-size:0.85rem">Current HP: ' + entry.currentHp + '/' + entry.maxHp + '</p>' +
    '<input type="number" id="dm-dmg-val" min="0" style="width:100%;box-sizing:border-box;min-height:48px;padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1.2rem;text-align:center" onkeydown="if(event.key===\'Enter\')dealDamage(\'' + entryId + '\')">' +
    '<div class="confirm-actions" style="margin-top:12px">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" style="min-height:44px" onclick="dealDamage(\'' + entryId + '\')">Apply Damage</button></div>'
  );
  setTimeout(function() { var el = document.getElementById('dm-dmg-val'); if (el) el.focus(); }, 100);
}

function applyDamage(enc, entryId, amount) {
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return null;
  var oldHp = entry.currentHp;
  entry.currentHp = Math.max(0, entry.currentHp - amount);
  var dead = entry.currentHp <= 0;
  var hadConcentration = !!entry.concentration;
  var concDC = Math.max(10, Math.floor(amount / 2));
  var concSpell = entry.concentration;
  logEncounterEvent(entry.name + ' took ' + amount + ' damage (' + oldHp + '\u2192' + entry.currentHp + ')');
  if (dead) logEncounterEvent(entry.name + ' killed (Round ' + (enc.round || '?') + ')');
  return { entry: entry, oldHp: oldHp, dead: dead, hadConcentration: hadConcentration, concDC: concDC, concSpell: concSpell };
}

function dealDamage(entryId) {
  var val = parseInt(document.getElementById('dm-dmg-val').value) || 0;
  if (val <= 0) { closeModal(); return; }
  var enc = getActiveEncounter();
  if (!enc) return;
  var result = applyDamage(enc, entryId, val);
  saveActiveEncounter(enc);
  closeModal();
  showDmEncounter();
  // Concentration reminder
  if (result && result.hadConcentration && !result.dead) {
    showModal(
      '<h3>Concentration Check</h3>' +
      '<p><strong>' + escapeHtml(result.entry.name) + '</strong> is concentrating on <strong>' + escapeHtml(result.concSpell) + '</strong></p>' +
      '<p>CON save DC <strong>' + result.concDC + '</strong></p>' +
      '<div class="confirm-actions">' +
      '<button class="btn btn-primary" onclick="closeModal()">Maintained</button>' +
      '<button class="btn btn-secondary" style="color:var(--error)" onclick="clearDmConcentration(\'' + result.entry.id + '\')">Lost</button></div>'
    );
  }
}

function showHealModal(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  showModal(
    '<h3>Heal ' + escapeHtml(entry.name) + '</h3>' +
    '<p class="text-dim" style="font-size:0.85rem">Current HP: ' + entry.currentHp + '/' + entry.maxHp + '</p>' +
    '<input type="number" id="dm-heal-val" min="0" style="width:100%;box-sizing:border-box;min-height:48px;padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1.2rem;text-align:center" onkeydown="if(event.key===\'Enter\')healNpc(\'' + entryId + '\')">' +
    '<div class="confirm-actions" style="margin-top:12px">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" style="min-height:44px" onclick="healNpc(\'' + entryId + '\')">Apply Healing</button></div>'
  );
  setTimeout(function() { var el = document.getElementById('dm-heal-val'); if (el) el.focus(); }, 100);
}

function healNpc(entryId) {
  var val = parseInt(document.getElementById('dm-heal-val').value) || 0;
  if (val <= 0) { closeModal(); return; }
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  var oldHp = entry.currentHp;
  entry.currentHp = Math.min(entry.maxHp, entry.currentHp + val);
  logEncounterEvent(entry.name + ' healed ' + val + ' (' + oldHp + '\u2192' + entry.currentHp + ')');
  saveActiveEncounter(enc);
  closeModal();
  showDmEncounter();
}

/* ═══════════════════════════════════════════
   DM SCREEN — ENCOUNTER LOG
   ═══════════════════════════════════════════ */

function logEncounterEvent(text) {
  var enc = getActiveEncounter();
  if (!enc) return;
  if (!enc.log) enc.log = [];
  enc.log.push({ time: new Date().toISOString(), text: text });
  saveActiveEncounter(enc);
}

function renderEncounterLog(encounter) {
  var log = encounter.log || [];
  var html = '<details style="margin:8px 0"><summary class="text-dim" style="cursor:pointer;font-size:0.9rem">Encounter Log (' + log.length + ' events)</summary>';
  html += '<button class="btn btn-secondary" style="margin:4px 0;font-size:0.8rem;padding:4px 10px" onclick="addEncounterLogNote()">+ Add Note</button>';
  if (log.length > 0) {
    var reversed = log.slice().reverse();
    reversed.forEach(function(entry) {
      var t = new Date(entry.time);
      var timeStr = (t.getHours() < 10 ? '0' : '') + t.getHours() + ':' + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes();
      html += '<div class="dm-log-entry"><span class="dm-log-time">' + timeStr + '</span>' + escapeHtml(entry.text) + '</div>';
    });
  } else {
    html += '<p class="text-dim" style="font-size:0.8rem">No events yet.</p>';
  }
  html += '</details>';
  return html;
}

function addEncounterLogNote() {
  showModal(
    '<h3>Add Note to Log</h3>' +
    '<input type="text" id="dm-log-note" placeholder="Enter note..." style="width:100%;box-sizing:border-box;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">' +
    '<div class="confirm-actions" style="margin-top:8px">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="confirmAddLogNote()">Add</button></div>'
  );
  setTimeout(function() { var el = document.getElementById('dm-log-note'); if (el) el.focus(); }, 100);
}

function confirmAddLogNote() {
  var el = document.getElementById('dm-log-note');
  var text = el ? el.value.trim() : '';
  if (!text) { closeModal(); return; }
  logEncounterEvent('Note: ' + text);
  closeModal();
  showDmEncounter();
}

function saveDmEncNotes() {
  var el = document.getElementById('dm-enc-notes');
  if (!el) return;
  var enc = getActiveEncounter();
  if (!enc) return;
  enc.notes = el.value;
  saveActiveEncounter(enc);
}

/* ═══════════════════════════════════════════
   DM SCREEN — NPC ATTACK & DAMAGE ROLLS
   ═══════════════════════════════════════════ */

function parseDmDice(notation) {
  if (!notation) return null;
  var m = notation.trim().match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) return null;
  return { count: parseInt(m[1]), sides: parseInt(m[2]), modifier: m[3] ? parseInt(m[3].replace(/\s/g, '')) : 0 };
}

function rollDmAttack(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry || entry.attackBonus === null || entry.attackBonus === undefined) return;
  var d20 = rollDie(20);
  var total = d20 + entry.attackBonus;
  var label = entry.name + ' Attack';
  var text = 'd20 [' + d20 + '] + ' + entry.attackBonus + ' = ' + total;
  if (d20 === 20) text += ' — NAT 20!';
  else if (d20 === 1) text += ' — NAT 1';
  showDmRollResult(label, text);
  logEncounterEvent(entry.name + ' attack: d20[' + d20 + '] + ' + entry.attackBonus + ' = ' + total);
}

function rollDmDamage(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry || !entry.damageDice) return;
  var parsed = parseDmDice(entry.damageDice);
  if (!parsed) return;
  var results = [];
  for (var i = 0; i < parsed.count; i++) results.push(rollDie(parsed.sides));
  var diceTotal = results.reduce(function(a, b) { return a + b; }, 0);
  var total = diceTotal + parsed.modifier;
  var text = entry.damageDice + ' [' + results.join(', ') + ']' + (parsed.modifier ? (parsed.modifier > 0 ? ' + ' : ' - ') + Math.abs(parsed.modifier) : '') + ' = ' + total + (entry.damageType ? ' ' + entry.damageType : '');
  showDmRollResult(entry.name + ' Damage', text);
  logEncounterEvent(entry.name + ' damage: ' + total + (entry.damageType ? ' ' + entry.damageType : ''));
}

var _dmRollTimeout = null;
function showDmRollResult(label, text) {
  var el = document.getElementById('dm-roll-result');
  if (!el) return;
  el.style.display = 'block';
  el.style.opacity = '1';
  el.innerHTML = '<div style="font-size:0.8rem;color:var(--text-dim)">' + escapeHtml(label) + '</div><div>' + escapeHtml(text) + '</div>';
  clearTimeout(_dmRollTimeout);
  _dmRollTimeout = setTimeout(function() { el.style.opacity = '0'; setTimeout(function() { el.style.display = 'none'; }, 500); }, 4000);
}

/* ═══════════════════════════════════════════
   DM SCREEN — CONDITIONS & CONCENTRATION
   ═══════════════════════════════════════════ */

function showDmConditionPicker(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  var current = entry.conditions || [];
  var html = '<h3>Conditions: ' + escapeHtml(entry.name) + '</h3>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">';
  CONDITIONS.forEach(function(cond) {
    var active = current.indexOf(cond.name) >= 0;
    html += '<button class="btn ' + (active ? 'btn-primary' : 'btn-secondary') + '" style="font-size:0.85rem;padding:6px 10px;min-height:36px" onclick="toggleDmCondition(\'' + entryId + '\',\'' + cond.name + '\')">' + cond.name + '</button>';
  });
  html += '</div>';
  html += '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal();showDmEncounter()">Done</button></div>';
  showModal(html);
}

function toggleDmCondition(entryId, condName) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  if (!entry.conditions) entry.conditions = [];
  var idx = entry.conditions.indexOf(condName);
  if (idx >= 0) {
    entry.conditions.splice(idx, 1);
    logEncounterEvent(entry.name + ': ' + condName + ' removed');
  } else {
    entry.conditions.push(condName);
    logEncounterEvent(entry.name + ': ' + condName + ' added');
  }
  saveActiveEncounter(enc);
  // Re-render the picker to show updated state
  showDmConditionPicker(entryId);
}

function removeDmCondition(entryId, condName) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry || !entry.conditions) return;
  var idx = entry.conditions.indexOf(condName);
  if (idx >= 0) {
    entry.conditions.splice(idx, 1);
    logEncounterEvent(entry.name + ': ' + condName + ' removed');
    saveActiveEncounter(enc);
    showDmEncounter();
  }
}

function showSetDmConcentration(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  var html = '<h3>Concentration: ' + escapeHtml(entry.name) + '</h3>';
  if (entry.concentration) {
    html += '<p>Currently concentrating on: <strong>' + escapeHtml(entry.concentration) + '</strong></p>';
  }
  html += '<input type="text" id="dm-conc-spell" placeholder="Spell name" value="' + escapeHtml(entry.concentration || '') + '" style="width:100%;box-sizing:border-box;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px">';
  html += '<div class="confirm-actions">';
  if (entry.concentration) {
    html += '<button class="btn btn-secondary" style="color:var(--error)" onclick="clearDmConcentration(\'' + entryId + '\')">Drop Concentration</button>';
  }
  html += '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="setDmConcentration(\'' + entryId + '\')">Set</button></div>';
  showModal(html);
  setTimeout(function() { var el = document.getElementById('dm-conc-spell'); if (el) el.focus(); }, 100);
}

function setDmConcentration(entryId) {
  var el = document.getElementById('dm-conc-spell');
  var spell = el ? el.value.trim() : '';
  if (!spell) return;
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  entry.concentration = spell;
  logEncounterEvent(entry.name + ': concentrating on ' + spell);
  saveActiveEncounter(enc);
  closeModal();
  showDmEncounter();
}

function clearDmConcentration(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  var old = entry.concentration;
  entry.concentration = null;
  if (old) logEncounterEvent(entry.name + ': lost concentration on ' + old);
  saveActiveEncounter(enc);
  closeModal();
  showDmEncounter();
}

/* ═══════════════════════════════════════════
   DM SCREEN — MULTI-TARGET DAMAGE
   ═══════════════════════════════════════════ */

var dmMultiSelectMode = false;
var dmSelectedIds = [];

function toggleDmMultiSelect() {
  dmMultiSelectMode = !dmMultiSelectMode;
  dmSelectedIds = [];
  showDmEncounter();
}

function toggleDmSelectTarget(entryId) {
  var idx = dmSelectedIds.indexOf(entryId);
  if (idx >= 0) dmSelectedIds.splice(idx, 1);
  else dmSelectedIds.push(entryId);
  showDmEncounter();
}

function showDealDamageToSelectedModal() {
  if (dmSelectedIds.length === 0) return;
  showModal(
    '<h3>Deal Damage to ' + dmSelectedIds.length + ' Targets</h3>' +
    '<input type="number" id="dm-multi-dmg-val" min="0" style="width:100%;box-sizing:border-box;min-height:48px;padding:8px 12px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1.2rem;text-align:center" onkeydown="if(event.key===\'Enter\')dealDamageToSelected()">' +
    '<div class="confirm-actions" style="margin-top:12px">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" style="min-height:44px" onclick="dealDamageToSelected()">Apply to All</button></div>'
  );
  setTimeout(function() { var el = document.getElementById('dm-multi-dmg-val'); if (el) el.focus(); }, 100);
}

function dealDamageToSelected() {
  var val = parseInt(document.getElementById('dm-multi-dmg-val').value) || 0;
  if (val <= 0) { closeModal(); return; }
  var enc = getActiveEncounter();
  if (!enc) return;
  var concSaves = [];
  dmSelectedIds.forEach(function(id) {
    var result = applyDamage(enc, id, val);
    if (result && result.hadConcentration && !result.dead) {
      concSaves.push(result);
    }
  });
  saveActiveEncounter(enc);
  closeModal();
  dmMultiSelectMode = false;
  dmSelectedIds = [];
  showDmEncounter();
  // Show concentration saves summary if any
  if (concSaves.length > 0) {
    var html = '<h3>Concentration Saves Needed</h3>';
    concSaves.forEach(function(r) {
      html += '<div style="padding:6px 0;border-bottom:1px solid var(--border)">';
      html += '<strong>' + escapeHtml(r.entry.name) + '</strong>: CON save DC ' + r.concDC + ' for ' + escapeHtml(r.concSpell);
      html += ' <button class="btn btn-secondary" style="font-size:0.75rem;padding:2px 8px;margin-left:8px" onclick="clearDmConcentration(\'' + r.entry.id + '\');this.parentElement.style.opacity=0.3;this.textContent=\'Lost\'">Lost</button>';
      html += '</div>';
    });
    html += '<div class="confirm-actions" style="margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Done</button></div>';
    showModal(html);
  }
}

/* ═══════════════════════════════════════════
   DM SCREEN — INITIATIVE REORDERING
   ═══════════════════════════════════════════ */

function showMoveAfter(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  var html = '<h3>Move ' + escapeHtml(entry.name) + ' after...</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:6px">';
  html += '<button class="btn btn-secondary" style="min-height:44px" onclick="moveToTop(\'' + entryId + '\')">Move to Top</button>';
  enc.initiative.forEach(function(other) {
    if (other.id === entryId) return;
    html += '<button class="btn btn-secondary" style="min-height:44px" onclick="moveAfter(\'' + entryId + '\',\'' + other.id + '\')">' + escapeHtml(other.name) + '</button>';
  });
  html += '</div>';
  html += '<div class="confirm-actions" style="margin-top:12px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>';
  showModal(html);
}

function moveAfter(entryId, targetId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var oldIndex = enc.initiative.findIndex(function(e) { return e.id === entryId; });
  if (oldIndex < 0) return;
  var isCurrentEntry = oldIndex === enc.currentTurn;
  var entry = enc.initiative.splice(oldIndex, 1)[0];
  if (oldIndex < enc.currentTurn) enc.currentTurn--;
  var targetIndex = enc.initiative.findIndex(function(e) { return e.id === targetId; });
  var insertAt = targetIndex + 1;
  enc.initiative.splice(insertAt, 0, entry);
  if (insertAt <= enc.currentTurn) enc.currentTurn++;
  if (isCurrentEntry) enc.currentTurn = insertAt;
  saveActiveEncounter(enc);
  closeModal();
  showDmEncounter();
}

function moveToTop(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var oldIndex = enc.initiative.findIndex(function(e) { return e.id === entryId; });
  if (oldIndex < 0) return;
  var isCurrentEntry = oldIndex === enc.currentTurn;
  var entry = enc.initiative.splice(oldIndex, 1)[0];
  if (oldIndex < enc.currentTurn) enc.currentTurn--;
  enc.initiative.unshift(entry);
  if (0 <= enc.currentTurn) enc.currentTurn++;
  if (isCurrentEntry) enc.currentTurn = 0;
  saveActiveEncounter(enc);
  closeModal();
  showDmEncounter();
}

/* ═══════════════════════════════════════════
   DM SCREEN — MONSTER LIBRARY CRUD
   ═══════════════════════════════════════════ */

function saveMonsterTemplate(entry) {
  var data = loadDmData();
  data.quickMonsters.push({
    name: entry.name, ac: entry.ac, maxHp: entry.maxHp,
    hpFormula: entry.hpFormula || null,
    attackBonus: entry.attackBonus, damageDice: entry.damageDice,
    damageType: entry.damageType, dexMod: entry.dexMod, notes: entry.notes || ''
  });
  saveDmData(data);
  showDmRollResult('Saved', entry.name + ' added to library');
}

function saveMonsterToLibrary(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  saveMonsterTemplate(entry);
}

function showAddMonsterTemplateForm() {
  showAddMonsterForm({});
}

function showEditMonsterTemplate(index) {
  var data = loadDmData();
  var t = data.quickMonsters[index];
  if (!t) return;
  var html = '<h3>Edit Monster Template</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:8px;max-height:350px;overflow-y:auto">';
  html += '<input type="text" id="dm-edit-mon-name" value="' + escapeHtml(t.name || '') + '" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<div style="display:flex;gap:8px">';
  html += '<input type="number" id="dm-edit-mon-ac" value="' + (t.ac || '') + '" placeholder="AC" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<input type="text" id="dm-edit-mon-hp" value="' + escapeHtml(t.hpFormula || (t.maxHp ? '' + t.maxHp : '')) + '" placeholder="HP or dice" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<div style="display:flex;gap:8px">';
  html += '<input type="number" id="dm-edit-mon-atk" value="' + (t.attackBonus || '') + '" placeholder="Atk Bonus" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<input type="number" id="dm-edit-mon-dex" value="' + (t.dexMod || '') + '" placeholder="DEX Mod" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<div style="display:flex;gap:8px">';
  html += '<input type="text" id="dm-edit-mon-dmg" value="' + escapeHtml(t.damageDice || '') + '" placeholder="Damage" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '<input type="text" id="dm-edit-mon-dtype" value="' + escapeHtml(t.damageType || '') + '" placeholder="Type" style="flex:1;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<input type="text" id="dm-edit-mon-notes" value="' + escapeHtml(t.notes || '') + '" placeholder="Notes" style="min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius)">';
  html += '</div>';
  html += '<div class="confirm-actions" style="margin-top:12px">';
  html += '<button class="btn btn-secondary" onclick="closeModal();showDmScreen()">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="confirmEditMonsterTemplate(' + index + ')">Save</button></div>';
  showModal(html);
}

function confirmEditMonsterTemplate(index) {
  var data = loadDmData();
  if (!data.quickMonsters[index]) return;
  var hpRaw = (document.getElementById('dm-edit-mon-hp').value || '').trim();
  data.quickMonsters[index] = {
    name: (document.getElementById('dm-edit-mon-name').value || '').trim() || 'Monster',
    ac: parseInt(document.getElementById('dm-edit-mon-ac').value) || 10,
    maxHp: parseDmDice(hpRaw) ? rollHpFormula(hpRaw) : (parseInt(hpRaw) || 1),
    hpFormula: parseDmDice(hpRaw) ? hpRaw : null,
    attackBonus: parseInt(document.getElementById('dm-edit-mon-atk').value) || null,
    damageDice: (document.getElementById('dm-edit-mon-dmg').value || '').trim(),
    damageType: (document.getElementById('dm-edit-mon-dtype').value || '').trim(),
    dexMod: parseInt(document.getElementById('dm-edit-mon-dex').value) || null,
    notes: (document.getElementById('dm-edit-mon-notes').value || '').trim()
  };
  saveDmData(data);
  closeModal();
  showDmScreen();
}

function confirmDeleteMonsterTemplate(index) {
  var data = loadDmData();
  var name = data.quickMonsters[index] ? data.quickMonsters[index].name : 'Monster';
  showModal(
    '<h3>Delete Template?</h3><p>Remove <strong>' + escapeHtml(name) + '</strong> from library?</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal();showDmScreen()">Cancel</button>' +
    '<button class="btn btn-primary" style="color:var(--error)" onclick="deleteMonsterTemplate(' + index + ')">Delete</button></div>'
  );
}

function deleteMonsterTemplate(index) {
  var data = loadDmData();
  data.quickMonsters.splice(index, 1);
  saveDmData(data);
  closeModal();
  showDmScreen();
}

/* ═══════════════════════════════════════════
   DM SCREEN — DUPLICATE MONSTER
   ═══════════════════════════════════════════ */

function showDuplicateMonsterModal(entryId) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  showModal(
    '<h3>Duplicate ' + escapeHtml(entry.name) + '</h3>' +
    '<p class="text-dim" style="font-size:0.85rem">How many copies?</p>' +
    '<input type="number" id="dm-dup-count" value="1" min="1" max="20" style="width:100%;box-sizing:border-box;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem;text-align:center">' +
    '<div class="confirm-actions" style="margin-top:12px">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="duplicateMonster(\'' + entryId + '\')">Duplicate</button></div>'
  );
}

function duplicateMonster(entryId) {
  var count = parseInt(document.getElementById('dm-dup-count').value) || 1;
  count = Math.min(20, Math.max(1, count));
  var enc = getActiveEncounter();
  if (!enc) return;
  var source = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!source) return;

  // Determine base name and highest existing number
  var baseName = source.name.replace(/\s+\d+$/, '');
  var highestNum = 0;
  var sourceHasNumber = /\s+\d+$/.test(source.name);
  enc.initiative.forEach(function(e) {
    var match = e.name.match(new RegExp('^' + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(\\d+)$'));
    if (match) highestNum = Math.max(highestNum, parseInt(match[1]));
  });

  // Rename source if no number suffix yet
  if (!sourceHasNumber) {
    if (highestNum === 0) highestNum = 0;
    source.name = baseName + ' 1';
    highestNum = Math.max(highestNum, 1);
  }

  // Create copies
  for (var i = 0; i < count; i++) {
    highestNum++;
    var hp = source.hpFormula ? rollHpFormula(source.hpFormula) : source.maxHp;
    enc.initiative.push({
      id: 'init_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: baseName + ' ' + highestNum,
      type: 'npc', initiative: null,
      ac: source.ac, maxHp: hp, currentHp: hp,
      conditions: [], concentration: null,
      attackBonus: source.attackBonus,
      damageDice: source.damageDice,
      damageType: source.damageType,
      attack: source.attack,
      notes: '', dexMod: source.dexMod,
      hpFormula: source.hpFormula
    });
  }

  logEncounterEvent('Added ' + count + 'x ' + baseName);
  saveActiveEncounter(enc);
  closeModal();
  showDmEncounter();
}

/* ═══════════════════════════════════════════
   DM SCREEN — AUTO-ROLL INITIATIVE
   ═══════════════════════════════════════════ */

function rollAllNpcInitiative() {
  var enc = getActiveEncounter();
  if (!enc) return;
  enc.initiative.forEach(function(entry) {
    if (entry.type === 'npc' && entry.dexMod !== null) {
      entry.initiative = rollDie(20) + entry.dexMod;
    }
  });
  logEncounterEvent('Auto-rolled NPC initiative');
  saveActiveEncounter(enc);
  showDmEncounter();
}

/* ═══════════════════════════════════════════
   DM SCREEN — INLINE NOTES
   ═══════════════════════════════════════════ */

function saveDmMonsterNote(entryId, text) {
  var enc = getActiveEncounter();
  if (!enc) return;
  var entry = enc.initiative.find(function(e) { return e.id === entryId; });
  if (!entry) return;
  entry.notes = text;
  saveActiveEncounter(enc);
}

/* ═══════════════════════════════════════════
   DM SCREEN — PAST ENCOUNTER VIEWER
   ═══════════════════════════════════════════ */

function viewPastEncounter(encId) {
  var data = loadDmData();
  var enc = data.encounters.find(function(e) { return e.id === encId; });
  if (!enc) return;
  applyTheme(DM_THEME);
  showView('dm-screen');
  var container = document.getElementById('dm-screen-content');
  var html = '<div style="padding:0 8px">';
  html += '<h1 style="color:var(--accent)">' + escapeHtml(enc.name || 'Encounter') + '</h1>';
  var dateStr = enc.created ? new Date(enc.created).toLocaleDateString() : '';
  html += '<p class="text-dim">' + (enc.round || 0) + ' rounds' + (dateStr ? ' \u2022 ' + dateStr : '') + '</p>';

  // Final initiative list
  html += '<h2 style="margin-top:16px">Final State</h2>';
  (enc.initiative || []).forEach(function(entry) {
    var dead = entry.type === 'npc' && entry.currentHp <= 0;
    var rowClass = entry.type === 'pc' ? 'dm-row dm-row-pc' : 'dm-row dm-row-npc';
    if (dead) rowClass += ' dm-row-dead';
    html += '<div class="' + rowClass + '">';
    html += '<strong>' + escapeHtml(entry.name) + '</strong>';
    html += ' <span class="text-dim" style="font-size:0.85rem">HP ' + entry.currentHp + '/' + entry.maxHp + (dead ? ' — DEAD' : '') + '</span>';
    if (entry.conditions && entry.conditions.length > 0) {
      entry.conditions.forEach(function(c) { html += ' <span class="dm-cond-badge">' + escapeHtml(c) + '</span>'; });
    }
    html += '</div>';
  });

  // Encounter log
  html += renderEncounterLog(enc);

  // Encounter notes
  if (enc.notes) {
    html += '<h2 style="margin-top:16px">Notes</h2>';
    html += '<div class="text-dim" style="font-size:0.9rem;white-space:pre-wrap">' + escapeHtml(enc.notes) + '</div>';
  }

  html += '<div style="margin-top:24px">';
  html += '<button class="btn btn-secondary" style="width:100%;margin-bottom:8px;color:var(--error)" onclick="deletePastEncounter(\'' + enc.id + '\')">Delete Encounter</button>';
  html += '<button class="btn btn-secondary" style="width:100%" onclick="showDmScreen()">\u2190 Back to DM Screen</button>';
  html += '</div>';
  html += '</div>';
  container.innerHTML = html;
}

function deletePastEncounter(encId) {
  var data = loadDmData();
  var active = data.encounters.find(function(e) { return e.active; });
  if (active && active.id === encId) {
    showDmRollResult('Cannot Delete', 'End the encounter first.');
    return;
  }
  showModal(
    '<h3>Delete Encounter?</h3>' +
    '<p>This cannot be undone.</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" style="background:var(--error)" onclick="confirmDeleteEncounter(\'' + encId + '\')">Delete</button></div>'
  );
}

function confirmDeleteEncounter(encId) {
  var data = loadDmData();
  data.encounters = data.encounters.filter(function(e) { return e.id !== encId; });
  saveDmData(data);
  dmCloudSave();
  closeModal();
  _dmSkipNextCloudLoad = true;
  showDmScreen();
}

/* ═══════════════════════════════════════════
   DM SCREEN — PC LIVE SYNC
   ═══════════════════════════════════════════ */

var _dmPcSyncInterval = null;
var _dmLastSyncTime = null;

function startDmPcSync() {
  stopDmPcSync();
  if (!isDmCloudConfigured()) return;
  _dmLastSyncTime = Date.now();
  _dmPcSyncInterval = setInterval(dmPcSyncTick, 60000);
}

function stopDmPcSync() {
  if (_dmPcSyncInterval) { clearInterval(_dmPcSyncInterval); _dmPcSyncInterval = null; }
}

function dmPcSyncTick() {
  if (!isDmCloudConfigured()) return;
  var headers = getGitHubHeaders();
  fetchPartyChars(headers).then(function(chars) {
    if (!chars || chars.length === 0) return;
    var enc = getActiveEncounter();
    if (!enc) return;
    var changed = false;
    enc.initiative.forEach(function(entry, idx) {
      if (entry.type !== 'pc' || !entry.charId) return;
      var fresh = chars.find(function(ch) { return ch.id === entry.charId; });
      if (!fresh) return;
      var newHp = fresh.currentHp !== undefined ? fresh.currentHp : getEffectiveMaxHp(fresh);
      var newMaxHp = getEffectiveMaxHp(fresh);
      var newAc = (fresh.equippedItems && fresh.equippedItems.length > 0) ? calculateAC(fresh) : fresh.ac;
      var newConds = (fresh.activeConditions || []).slice();
      var newConc = fresh.concentration && fresh.concentration.active ? fresh.concentration.spellName : null;
      // Update data
      if (entry.currentHp !== newHp || entry.maxHp !== newMaxHp || entry.ac !== newAc) changed = true;
      entry.currentHp = newHp;
      entry.maxHp = newMaxHp;
      entry.ac = newAc;
      entry.conditions = newConds;
      entry.concentration = newConc;
      // Targeted DOM update (no full re-render)
      var row = document.getElementById('dm-init-' + idx);
      if (row) {
        // Update HP text
        var hpSpan = row.querySelector('[data-hp]');
        if (!hpSpan) {
          // Fallback: look for HP text pattern
          var textNodes = row.querySelectorAll('div');
          textNodes.forEach(function(div) {
            if (div.textContent.indexOf('HP ') >= 0 && div.textContent.indexOf('/') >= 0) {
              div.innerHTML = 'HP ' + newHp + '/' + newMaxHp + (newHp <= 0 ? ' <span style="color:var(--error);font-weight:bold">\u2014 Unconscious</span>' : '');
            }
          });
        }
      }
    });
    if (changed) saveActiveEncounter(enc);
    _dmLastSyncTime = Date.now();
    // Update sync timestamp display
    var tsEl = document.getElementById('dm-sync-time');
    if (tsEl) tsEl.textContent = 'Synced just now';
  }).catch(function() {
    var tsEl = document.getElementById('dm-sync-time');
    if (tsEl) tsEl.textContent = '\u26a0 Sync failed';
  });
}
