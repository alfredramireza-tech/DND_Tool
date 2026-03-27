// session.js — Event logging, session journal, roll history, dice animation
/* ═══════════════════════════════════════════
   SESSION LOG
   ═══════════════════════════════════════════ */

function logEvent(text) {
  var c = loadCharacter();
  if (!c) return;
  if (!c.sessionLog) c.sessionLog = [];
  var now = new Date();
  var h = now.getHours(), m = now.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  var timeStr = h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  c.sessionLog.unshift({ time: timeStr, text: text });
  if (c.sessionLog.length > 100) c.sessionLog = c.sessionLog.slice(0, 100);
  saveCurrentCharacter(c);
}

function renderSessionLog(c) {
  var log = c.sessionLog || [];
  var html = '<div class="dash-section combat-show"><details class="dice-rolls-outer"><summary>Session Log <span class="text-dim" style="font-size:0.8rem;font-weight:normal">(' + log.length + ')</span></summary>';
  if (log.length > 0) {
    html += '<div style="display:flex;gap:6px;margin-bottom:8px">';
    html += '<button class="btn btn-secondary" onclick="logNewSession()" style="font-size:0.75rem;padding:4px 10px">New Session</button>';
    html += '<button class="btn btn-secondary" onclick="clearSessionLog()" style="font-size:0.75rem;padding:4px 10px">Clear Log</button>';
    html += '</div>';
    html += '<div class="session-log">';
    log.slice(0, 50).forEach(function(e) {
      html += '<div class="slog-entry"><span class="slog-time">' + escapeHtml(e.time) + '</span><span class="slog-text">' + escapeHtml(e.text) + '</span></div>';
    });
    html += '</div>';
  } else {
    html += '<p class="text-dim" style="font-size:0.85rem">No events logged yet</p>';
  }
  html += '</details></div>';
  return html;
}

function clearSessionLog() {
  var c = loadCharacter();
  if (!c) return;
  c.sessionLog = [];
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function renderJournal(c) {
  var entries = c.journal || [];
  var html = '<div class="dash-section combat-hide"><details><summary><h2 style="display:inline">Journal</h2> <span class="text-dim" style="font-size:0.85rem">(' + entries.length + ')</span></summary>';
  // Inline add form
  html += '<div class="journal-add-form">';
  html += '<input type="text" id="journal-title" placeholder="Title" maxlength="100">';
  html += '<textarea id="journal-body" placeholder="Write your entry..."></textarea>';
  html += '<button class="btn btn-primary" onclick="addJournalEntry()" style="align-self:flex-start;font-size:0.8rem;padding:6px 14px">Add Entry</button>';
  html += '</div>';
  // Entries (reverse chronological, max 50 shown)
  entries.slice(0, 50).forEach(function(entry, idx) {
    var preview = (entry.body || '').substring(0, 80).replace(/\n/g, ' ');
    html += '<details class="journal-entry"><summary>';
    html += '<span class="je-date">' + escapeHtml(entry.date || '') + '</span>';
    html += '<strong>' + escapeHtml(entry.title || 'Untitled') + '</strong>';
    html += '<span class="je-preview">' + escapeHtml(preview) + '</span>';
    html += '</summary><div class="journal-entry-body">';
    html += escapeHtml(entry.body || '');
    html += '<br><button class="je-delete" onclick="confirmDeleteJournal(' + idx + ')">Delete entry</button>';
    html += '</div></details>';
  });
  if (entries.length === 0) html += '<p class="text-dim" style="font-size:0.85rem">No journal entries yet</p>';
  html += '</details></div>';
  return html;
}

function addJournalEntry() {
  var titleEl = document.getElementById('journal-title');
  var bodyEl = document.getElementById('journal-body');
  if (!titleEl || !bodyEl) return;
  var title = titleEl.value.trim();
  var body = bodyEl.value.trim();
  if (!title && !body) return;
  var c = loadCharacter();
  if (!c) return;
  if (!c.journal) c.journal = [];
  var now = new Date();
  var dateStr = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
  c.journal.unshift({ title: title || 'Untitled', body: body, date: dateStr });
  if (c.journal.length > 50) c.journal = c.journal.slice(0, 50);
  saveCurrentCharacter(c);
  showDashboard(c, true);
}

function confirmDeleteJournal(idx) {
  var c = loadCharacter();
  if (!c || !c.journal || !c.journal[idx]) return;
  showModal(
    '<h3>Delete Journal Entry?</h3>' +
    '<p>"' + escapeHtml(c.journal[idx].title) + '"</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" onclick="deleteJournalEntry(' + idx + ')">Delete</button></div>'
  );
}

function deleteJournalEntry(idx) {
  var c = loadCharacter();
  if (!c || !c.journal) return;
  c.journal.splice(idx, 1);
  saveCurrentCharacter(c);
  closeModal();
  showDashboard(c, true);
}

function logNewSession() {
  logEvent('\u2550\u2550\u2550 New Session \u2550\u2550\u2550');
  var c = loadCharacter();
  if (c) showDashboard(c, true);
}

/* ═══════════════════════════════════════════
   ROLL HISTORY
   ═══════════════════════════════════════════ */

var rollHistory = [];

function addToRollHistory(label, total) {
  rollHistory.unshift({ label: label, total: total });
  if (rollHistory.length > 5) rollHistory = rollHistory.slice(0, 5);
}

function renderRollHistoryHTML() {
  if (rollHistory.length <= 1) return '';
  var html = '<div class="roll-history">';
  rollHistory.slice(1).forEach(function(r) {
    html += '<div class="rh-entry">' + escapeHtml(r.label) + ': <strong>' + r.total + '</strong></div>';
  });
  html += '</div>';
  return html;
}

/* ═══════════════════════════════════════════
   DICE TUMBLE ANIMATION
   ═══════════════════════════════════════════ */

var DICE_SHAPES = {
  4: '<polygon points="28,4 4,52 52,52" fill="none" stroke="currentColor" stroke-width="2"/>',
  6: '<rect x="8" y="8" width="40" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>',
  8: '<polygon points="28,2 52,28 28,54 4,28" fill="none" stroke="currentColor" stroke-width="2"/>',
  10: '<polygon points="28,2 50,20 44,50 12,50 6,20" fill="none" stroke="currentColor" stroke-width="2"/>',
  12: '<polygon points="28,2 48,12 54,34 40,52 16,52 2,34 8,12" fill="none" stroke="currentColor" stroke-width="2"/>',
  20: '<polygon points="28,2 50,16 50,40 28,54 6,40 6,16" fill="none" stroke="currentColor" stroke-width="2"/>',
  100: '<circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" stroke-width="2"/>'
};

function getDiceShape(sides) {
  return DICE_SHAPES[sides] || DICE_SHAPES[20];
}

function animateDiceTumble(diceArray, callback) {
  // diceArray: [{sides, finalValue}]
  // Reduced motion check
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    callback();
    return;
  }
  var el = document.getElementById('roll-result');
  el.className = 'roll-result';
  el.classList.remove('hidden');
  var tumbleHtml = '<div class="dice-tumble-container">';
  diceArray.forEach(function(d, i) {
    tumbleHtml += '<div class="dice-tumble" id="dt-' + i + '" style="animation-delay:' + (i * 100) + 'ms">';
    tumbleHtml += '<svg viewBox="0 0 56 56" style="color:var(--accent)">' + getDiceShape(d.sides) + '</svg>';
    tumbleHtml += '<span class="dt-num" id="dtn-' + i + '" style="animation-delay:' + (600 + i * 100) + 'ms">-</span>';
    tumbleHtml += '</div>';
  });
  tumbleHtml += '</div>';
  el.innerHTML = tumbleHtml;

  // Tumble numbers
  var totalDuration = 600;
  diceArray.forEach(function(d, i) {
    var numEl = document.getElementById('dtn-' + i);
    if (!numEl) return;
    var elapsed = 0;
    var interval = 50;
    var offset = i * 100;
    setTimeout(function() {
      var timer = setInterval(function() {
        elapsed += interval;
        numEl.textContent = Math.floor(Math.random() * d.sides) + 1;
        // Decelerate
        if (elapsed > totalDuration * 0.5) interval = 100;
        if (elapsed > totalDuration * 0.75) interval = 150;
        if (elapsed >= totalDuration) {
          clearInterval(timer);
          numEl.textContent = d.finalValue;
        }
      }, interval);
    }, offset);
  });

  // After animation, show full result
  var maxDelay = (diceArray.length - 1) * 100 + totalDuration + 200;
  setTimeout(callback, Math.min(maxDelay, 1200));
}

