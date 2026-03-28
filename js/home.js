// home.js — Home screen rendering, character loading, password protection, deletion
/* ═══════════════════════════════════════════
   HOME SCREEN
   ═══════════════════════════════════════════ */

function renderHomeScreen() {
  var chars = loadAllCharacters();
  var html = '<div class="home-screen">';
  html += '<h1 style="color:var(--accent)">D&D Level-Up Wizard</h1>';
  html += '<p class="home-subtitle">Choose a character or create a new one</p>';
  if (chars.length > 0) {
    html += '<ul class="char-list">';
    chars.forEach(function(c) {
      c = migrateCharacter(c);
      var lockIcon = c.passwordHash ? '<span class="cli-lock">&#128274;</span>' : '';
      var classColor = (c.colorTheme && c.colorTheme.accent) || '#c4a35a';
      html += '<li class="char-list-item" onclick="loadCharFromHome(\'' + c.id + '\')">';
      html += '<div class="cli-info"><div class="cli-name"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + classColor + ';margin-right:6px;vertical-align:middle"></span>' + escapeHtml(c.name) + lockIcon + '</div>';
      var homeRace = c.subrace ? c.subrace + ' ' + c.race : c.race;
      html += '<div class="cli-detail">' + homeRace + ' ' + c.class + ' — Level ' + c.level + '</div></div>';
      html += '<button class="cli-delete" onclick="event.stopPropagation();deleteCharFromHome(\'' + c.id + '\')" title="Delete">×</button>';
      html += '</li>';
    });
    html += '</ul>';
  } else {
    html += '<p class="text-dim" style="margin-bottom:20px">No saved characters</p>';
  }
  html += '<div style="display:flex;flex-direction:column;gap:10px">';
  html += '<button class="btn btn-primary btn-large" onclick="startNewCharacter()">New Character</button>';
  html += '<button class="btn btn-secondary btn-large" onclick="loadSampleCharacter()">Load Sample (Thorin)</button>';
  html += '<button class="btn btn-secondary btn-large" onclick="loadFromCloud()">Load from Cloud</button>';
  html += '<button class="btn btn-secondary btn-large" onclick="showPartyView()">Party View</button>';
  html += '<button class="btn btn-secondary btn-large" onclick="showDmScreen()">\u2694 DM Screen</button>';
  html += '</div>';
  html += '<div style="margin-top:40px;padding-top:20px;border-top:1px solid var(--border)">';
  html += '<button class="btn" onclick="confirmClearAllData()" style="width:100%;background:transparent;color:var(--error);border:1px solid var(--error);font-size:0.85rem;padding:10px">Clear All Data</button>';
  html += '<button onclick="showAdminPanel()" style="background:none;border:none;color:var(--text-dim);font-size:0.75rem;margin-top:12px;cursor:pointer;padding:4px;width:100%;text-align:center">Admin</button>';
  html += '</div></div>';
  document.getElementById('homescreen-content').innerHTML = html;
}

function goHome() { showHomeScreen(); }

function confirmClearAllData() {
  showModal(
    '<h3 style="color:var(--error)">Clear All Data</h3>' +
    '<p>This will delete <strong>ALL</strong> saved characters, settings, and session data from this browser.</p>' +
    '<p style="color:var(--text-dim);font-size:0.85rem;margin-top:8px">Characters saved to cloud are not affected.</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn" onclick="doClearAllData()" style="background:var(--error);color:#fff">Delete Everything</button></div>'
  );
}

function doClearAllData() {
  closeModal();
  var keysToRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && (key.indexOf('dnd_') === 0 || key === 'dnd_characters' || key === 'dnd_github_settings')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
  sessionUnlockedIds = [];
  activeCharId = null;
  location.reload();
}

var ADMIN_HASH = simpleHash('tis');

function showAdminPanel() {
  showModal(
    '<h3>Admin Access</h3>' +
    '<input type="password" id="admin-pw-input" placeholder="Admin password" style="width:100%;box-sizing:border-box;min-height:44px;padding:8px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-size:1rem;margin-bottom:8px" onkeydown="if(event.key===\'Enter\')checkAdminPassword()">' +
    '<div id="admin-pw-error" style="color:var(--error);font-size:0.85rem;min-height:20px"></div>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="checkAdminPassword()">Unlock</button></div>'
  );
  setTimeout(function() { var el = document.getElementById('admin-pw-input'); if (el) el.focus(); }, 100);
}

function checkAdminPassword() {
  var input = document.getElementById('admin-pw-input');
  var val = input ? input.value : '';
  if (simpleHash(val) === ADMIN_HASH) {
    showAdminOptions();
  } else {
    var err = document.getElementById('admin-pw-error');
    if (err) err.textContent = 'Wrong admin password.';
    if (input) { input.value = ''; input.focus(); }
  }
}

function showAdminOptions() {
  showModal(
    '<h3>Admin Panel</h3>' +
    '<button class="btn btn-secondary" style="width:100%;margin-bottom:8px;min-height:44px" onclick="resetDmPassword()">Reset DM Password</button>' +
    '<div class="confirm-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
  );
}

function resetDmPassword() {
  var data = loadDmData();
  data.passwordHash = simpleHash('dm');
  saveDmData(data);
  closeModal();
  alert('DM password reset to default.');
}

function loadCharFromHome(id) {
  var chars = loadAllCharacters();
  var c = chars.find(function(ch) { return ch.id === id; });
  if (!c) return;
  c = migrateCharacter(c);
  if (c.passwordHash && !isUnlocked(id)) {
    showPasswordPrompt(id, function() {
      activeCharId = id;
      unlockSession(id);
      showDashboard(c);
    });
  } else {
    activeCharId = id;
    showDashboard(c);
  }
}

function showPasswordPrompt(id, onSuccess) {
  showModal(
    '<h3>Enter Password</h3>' +
    '<div class="pw-field"><input type="password" id="modal-pw-input" placeholder="Password" onkeydown="if(event.key===\'Enter\')checkModalPassword(\'' + id + '\')"></div>' +
    '<div class="pw-error" id="modal-pw-error">Wrong password</div>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="checkModalPassword(\'' + id + '\')">Unlock</button></div>'
  );
  window._pwCallback = onSuccess;
  setTimeout(function() { var el = document.getElementById('modal-pw-input'); if (el) el.focus(); }, 100);
}

function checkModalPassword(id) {
  var input = document.getElementById('modal-pw-input');
  if (!input) return;
  var chars = loadAllCharacters();
  var c = chars.find(function(ch) { return ch.id === id; });
  if (!c || !c.passwordHash) { closeModal(); return; }
  if (simpleHash(input.value) === c.passwordHash) {
    closeModal();
    if (window._pwCallback) { window._pwCallback(); window._pwCallback = null; }
  } else {
    document.getElementById('modal-pw-error').classList.add('visible');
    input.value = '';
    input.focus();
  }
}

function showChangePassword() {
  var c = loadCharacter();
  if (!c) return;
  var hasPassword = !!c.passwordHash;
  var html = '<h3>Change Password</h3>';
  if (hasPassword) {
    html += '<div class="pw-field"><label>Current Password</label><input type="password" id="modal-cur-pw" placeholder="Enter current password"></div>';
  }
  html += '<div class="pw-field"><label>New Password</label><input type="password" id="modal-new-pw" placeholder="' + (hasPassword ? 'New password' : 'Set a password') + '"></div>';
  html += '<div class="pw-field"><label>Confirm New Password</label><input type="password" id="modal-new-pw2" placeholder="Confirm password"></div>';
  html += '<div class="pw-error" id="modal-cpw-error"></div>';
  html += '<div class="confirm-actions">';
  html += '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
  if (hasPassword) {
    html += '<button class="btn btn-danger" onclick="removePassword()">Remove Password</button>';
  }
  html += '<button class="btn btn-primary" onclick="applyChangePassword()">Save</button></div>';
  showModal(html);
}

function applyChangePassword() {
  var c = loadCharacter();
  if (!c) return;
  var errEl = document.getElementById('modal-cpw-error');
  // Verify current password if exists
  if (c.passwordHash) {
    var curPw = document.getElementById('modal-cur-pw').value;
    if (simpleHash(curPw) !== c.passwordHash) {
      errEl.textContent = 'Current password is incorrect';
      errEl.classList.add('visible');
      return;
    }
  }
  var newPw = document.getElementById('modal-new-pw').value;
  var newPw2 = document.getElementById('modal-new-pw2').value;
  if (!newPw) {
    errEl.textContent = 'Enter a new password';
    errEl.classList.add('visible');
    return;
  }
  if (newPw !== newPw2) {
    errEl.textContent = 'Passwords do not match';
    errEl.classList.add('visible');
    return;
  }
  c.passwordHash = simpleHash(newPw);
  saveCurrentCharacter(c);
  unlockSession(c.id);
  closeModal();
  showDashboard(c);
}

function removePassword() {
  var c = loadCharacter();
  if (!c) return;
  var errEl = document.getElementById('modal-cpw-error');
  if (c.passwordHash) {
    var curPw = document.getElementById('modal-cur-pw').value;
    if (simpleHash(curPw) !== c.passwordHash) {
      errEl.textContent = 'Current password is incorrect';
      errEl.classList.add('visible');
      return;
    }
  }
  c.passwordHash = null;
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c);
}

function deleteCharFromHome(id) {
  var chars = loadAllCharacters();
  var c = chars.find(function(ch) { return ch.id === id; });
  if (!c) return;
  c = migrateCharacter(c);
  if (c.passwordHash && !isUnlocked(id)) {
    showPasswordPrompt(id, function() {
      unlockSession(id);
      showDeleteConfirm(id, c.name);
    });
  } else {
    showDeleteConfirm(id, c.name);
  }
}

function showDeleteConfirm(id, name) {
  showModal(
    '<h3>Delete Character?</h3><p>Permanently delete ' + escapeHtml(name) + '?</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" onclick="doDeleteChar(\'' + id + '\',false)">Delete Local</button>' +
    '<button class="btn btn-danger" onclick="doDeleteChar(\'' + id + '\',true)">Delete + Cloud</button></div>'
  );
}

function doDeleteChar(id, alsoCloud) {
  var chars = loadAllCharacters();
  var charToDelete = chars.find(function(ch) { return ch.id === id; });
  chars = chars.filter(function(ch) { return ch.id !== id; });
  saveAllCharacters(chars);
  if (alsoCloud && charToDelete) deleteFromCloud(id, charToDelete.name);
  closeModal();
  renderHomeScreen();
}

function startNewCharacter() {
  activeCharId = null;
  isEditing = false;
  document.getElementById('onboarding-subtitle').textContent = 'Enter your current character details';
  populateForm(BLANK_DEFAULTS);
  showOnboarding();
}

function loadSampleCharacter() {
  activeCharId = null;
  isEditing = false;
  document.getElementById('onboarding-subtitle').textContent = 'Sample character — edit as needed';
  populateForm(SAMPLE_CHARACTER);
  showOnboarding();
}

