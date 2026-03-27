// utils.js — Core utility functions, AC calculation, theme system, character storage
/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */

function mod(score) { return Math.floor((score - 10) / 2); }
function modStr(score) { const m = mod(score); return m >= 0 ? '+' + m : '' + m; }

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function migrateCharacter(c) {
  if (!c.id) c.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  if (c.currentHp === undefined) c.currentHp = c.hp ? c.hp.max : 10;
  if (c.tempHp === undefined) c.tempHp = 0;
  if (!c.spellSlotsUsed) c.spellSlotsUsed = {};
  if (c.channelDivinityUsed === undefined) c.channelDivinityUsed = 0;
  if (!c.currency) c.currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  if (!c.equippedItems) c.equippedItems = [];
  if (!c.quickItems) c.quickItems = [];
  if (c.bulkGear === undefined) c.bulkGear = c.equipment || '';
  if (!c.weapons) c.weapons = [];
  if (!c.levelHistory) c.levelHistory = [];
  if (!c.class) c.class = 'Cleric';
  if (c.subrace === undefined) c.subrace = '';
  if (!c.colorTheme) {
    var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
    c.colorTheme = Object.assign({}, COLOR_THEMES[cd.defaultTheme]);
  }
  if (!c.resources) c.resources = {};
  if (!c.expertiseSkills) c.expertiseSkills = [];
  if (!c.deathSaves) c.deathSaves = { successes: 0, failures: 0 };
  if (!c.concentration) c.concentration = { active: false, spellName: '' };
  // Migration: move concentration.effects into externalBuffs as linked buffs
  if (c.concentration && c.concentration.active && c.concentration.effects && c.concentration.effects.length) {
    if (!c.externalBuffs) c.externalBuffs = [];
    var alreadyLinked = c.externalBuffs.some(function(b) { return b.linkedToConcentration && b.spellName === c.concentration.spellName; });
    if (!alreadyLinked) {
      c.externalBuffs.push({ spellName: c.concentration.spellName, effects: c.concentration.effects, linkedToConcentration: true });
    }
    delete c.concentration.effects;
  }
  if (!c.activeConditions) c.activeConditions = [];
  if (!c.sessionLog) c.sessionLog = [];
  if (c.inspiration === undefined) c.inspiration = false;
  if (!c.journal) c.journal = [];
  if (!c.externalBuffs) c.externalBuffs = [];
  if (!c.maxHpBoost) c.maxHpBoost = { value: 0, source: '' };
  // Fighter-specific fields
  if (c.class === 'Fighter') {
    if (!c.maneuversKnown) c.maneuversKnown = [];
    if (!c.ekSpellsKnown) c.ekSpellsKnown = [];
    if (!c.ekSpellSlots && c.subclass === 'Eldritch Knight') c.ekSpellSlots = getEkSpellSlots(c.level);
    if (!c.fightingStyle) c.fightingStyle = null;
    if (c.features && c.features.length === 0) c.features = getFighterFeatures(c.level, c.subclass);
  }
  // Paladin-specific fields
  if (c.class === 'Paladin') {
    if (!c.fightingStyle) c.fightingStyle = null;
    if (c.features && c.features.length === 0) c.features = getPaladinFeatures(c.level, c.subclass);
    if (!c.spellSlots || Object.keys(c.spellSlots).length === 0) c.spellSlots = getPaladinSpellSlots(c.level);
    if (!c.domainSpells) c.domainSpells = getDomainSpells(c.level, 'Paladin', c.subclass);
  }
  return c;
}

function getEffectiveMaxHp(c) {
  return (c.hp ? c.hp.max : 10) + (c.maxHpBoost ? c.maxHpBoost.value : 0);
}

function calculateAC(c) {
  if (!c.equippedItems || c.equippedItems.length === 0) return c.ac || 10;
  var armor = null, shieldBonus = 0;
  c.equippedItems.forEach(function(item) {
    if (item.slot === 'armor') armor = item;
    if (item.slot === 'shield') shieldBonus += ((item.stats && item.stats.acBonus) || 2) + (item.magicBonus || 0);
  });
  var dexMod = mod(c.abilityScores.dex);
  var ac;
  if (!armor) {
    var classDef = CLASS_DATA[c.class];
    if (classDef && classDef.unarmoredDefense) {
      if (classDef.unarmoredNoShield && shieldBonus > 0) {
        ac = 10 + dexMod;
      } else {
        ac = 10 + dexMod + mod(c.abilityScores[classDef.unarmoredDefense]);
      }
    } else {
      ac = 10 + dexMod;
    }
  } else if (armor.armorType === 'heavy') {
    ac = (armor.stats && armor.stats.ac) || 16;
  } else if (armor.armorType === 'medium') {
    ac = ((armor.stats && armor.stats.ac) || 14) + Math.min(dexMod, 2);
  } else if (armor.armorType === 'light') {
    ac = ((armor.stats && armor.stats.ac) || 11) + dexMod;
  } else {
    ac = 10 + dexMod;
  }
  ac += (armor && armor.magicBonus) ? armor.magicBonus : 0;
  // Defense fighting style adds +1 AC while wearing armor (Fighter or Paladin)
  if (armor && (c.class === 'Fighter' || c.class === 'Paladin') && (c.fightingStyle === 'Defense' || c.fightingStyle2 === 'Defense')) {
    ac += 1;
  }
  ac += shieldBonus;
  // Apply buff AC bonuses (from externalBuffs only — single source of truth)
  if (c.externalBuffs) {
    c.externalBuffs.forEach(function(buff) {
      (buff.effects || []).forEach(function(eff) {
        if (eff.type === 'acBonus') ac += eff.value;
        if (eff.type === 'acMinimum' && ac < eff.value) ac = eff.value;
      });
    });
  }
  return ac;
}

function showView(viewId) {
  ['homescreen', 'onboarding', 'dashboard', 'levelup'].forEach(function(id) {
    document.getElementById(id).classList.toggle('hidden', id !== viewId);
  });
}

function showModal(html) {
  closeModal();
  var el = document.createElement('div');
  el.id = 'dynamic-modal';
  el.innerHTML = '<div class="confirm-overlay" onclick="closeModal()">' +
    '<div class="confirm-box" onclick="event.stopPropagation()">' + html + '</div></div>';
  document.body.appendChild(el);
}

function closeModal() {
  var el = document.getElementById('dynamic-modal');
  if (el) el.remove();
}

/* ── Theme System ── */
function applyTheme(theme) {
  if (!theme) return;
  var root = document.documentElement;
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-hover', theme.accentHover);
  root.style.setProperty('--accent-dim', theme.accentDim);
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-raised', theme.surfaceRaised);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--text-dim', theme.textDim);
  root.style.setProperty('--error', theme.error);
  root.style.setProperty('--success', theme.success);
  root.style.setProperty('--input-bg', theme.inputBg);
  document.documentElement.style.background = theme.bg;
  document.body.style.background = theme.bg;
}

function resetThemeToDefault() {
  applyTheme(COLOR_THEMES.clericGold);
}

function lightenColor(hex, amount) {
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

function darkenColor(hex, amount) {
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

function blendColors(hex1, hex2, ratio) {
  var r1 = parseInt(hex1.slice(1,3), 16), g1 = parseInt(hex1.slice(3,5), 16), b1 = parseInt(hex1.slice(5,7), 16);
  var r2 = parseInt(hex2.slice(1,3), 16), g2 = parseInt(hex2.slice(3,5), 16), b2 = parseInt(hex2.slice(5,7), 16);
  var r = Math.round(r1 + (r2 - r1) * ratio);
  var g = Math.round(g1 + (g2 - g1) * ratio);
  var b = Math.round(b1 + (b2 - b1) * ratio);
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

function buildThemeFromColors(accent, bg, surface, text) {
  return {
    name: 'Custom',
    accent: accent,
    accentHover: lightenColor(accent, 16),
    accentDim: darkenColor(accent, 40),
    bg: bg,
    surface: surface,
    surfaceRaised: lightenColor(surface, 10),
    border: lightenColor(surface, 25),
    text: text,
    textDim: blendColors(text, bg, 0.4),
    error: '#c45a5a',
    success: '#6aaa5a',
    inputBg: blendColors(bg, surface, 0.3)
  };
}

function showThemeEditor() {
  var c = loadCharacter();
  if (!c) return;
  var current = c.colorTheme || COLOR_THEMES.clericGold;
  var html = '<h3>Theme Editor</h3>';

  // Preset buttons
  html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">';
  var themeKeys = Object.keys(COLOR_THEMES);
  themeKeys.forEach(function(key) {
    var t = COLOR_THEMES[key];
    html += '<button class="btn btn-secondary" onclick="applyPresetTheme(\'' + key + '\')" style="display:flex;align-items:center;gap:6px;padding:8px 12px">';
    html += '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + t.accent + ';border:1px solid rgba(255,255,255,0.2)"></span>';
    html += t.name + '</button>';
  });
  html += '</div>';

  // Custom color pickers
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';
  html += '<div><label style="font-size:0.85rem;color:var(--text-dim)">Accent</label><br><input type="color" id="theme-accent" value="' + current.accent + '" onchange="onThemeColorChange()"></div>';
  html += '<div><label style="font-size:0.85rem;color:var(--text-dim)">Background</label><br><input type="color" id="theme-bg" value="' + current.bg + '" onchange="onThemeColorChange()"></div>';
  html += '<div><label style="font-size:0.85rem;color:var(--text-dim)">Surface</label><br><input type="color" id="theme-surface" value="' + current.surface + '" onchange="onThemeColorChange()"></div>';
  html += '<div><label style="font-size:0.85rem;color:var(--text-dim)">Text</label><br><input type="color" id="theme-text" value="' + current.text + '" onchange="onThemeColorChange()"></div>';
  html += '</div>';

  // Reset and close buttons
  html += '<div class="confirm-actions">';
  html += '<button class="btn btn-secondary" onclick="resetThemeToClassDefault()">Reset to Class Default</button>';
  html += '<button class="btn btn-primary" onclick="closeModal()">Done</button>';
  html += '</div>';

  showModal(html);
}

function applyPresetTheme(key) {
  var theme = Object.assign({}, COLOR_THEMES[key]);
  applyTheme(theme);
  var c = loadCharacter();
  if (!c) return;
  c.colorTheme = theme;
  saveCurrentCharacter(c);
  // Update pickers in modal
  var el;
  el = document.getElementById('theme-accent'); if (el) el.value = theme.accent;
  el = document.getElementById('theme-bg'); if (el) el.value = theme.bg;
  el = document.getElementById('theme-surface'); if (el) el.value = theme.surface;
  el = document.getElementById('theme-text'); if (el) el.value = theme.text;
}

function onThemeColorChange() {
  var accent = document.getElementById('theme-accent').value;
  var bg = document.getElementById('theme-bg').value;
  var surface = document.getElementById('theme-surface').value;
  var text = document.getElementById('theme-text').value;
  var theme = buildThemeFromColors(accent, bg, surface, text);
  applyTheme(theme);
  var c = loadCharacter();
  if (!c) return;
  c.colorTheme = theme;
  saveCurrentCharacter(c);
}

function resetThemeToClassDefault() {
  var c = loadCharacter();
  if (!c) return;
  var cd = CLASS_DATA[c.class] || CLASS_DATA.Cleric;
  var theme = Object.assign({}, COLOR_THEMES[cd.defaultTheme]);
  applyTheme(theme);
  c.colorTheme = theme;
  saveCurrentCharacter(c);
  // Update pickers
  var el;
  el = document.getElementById('theme-accent'); if (el) el.value = theme.accent;
  el = document.getElementById('theme-bg'); if (el) el.value = theme.bg;
  el = document.getElementById('theme-surface'); if (el) el.value = theme.surface;
  el = document.getElementById('theme-text'); if (el) el.value = theme.text;
}

/* ── Password Hashing ── */
function simpleHash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash = hash & hash; // Convert to 32-bit int
  }
  // Second pass with different seed for more spread
  var hash2 = 5381;
  for (var j = 0; j < str.length; j++) {
    hash2 = ((hash2 << 5) + hash2) + str.charCodeAt(j);
    hash2 = hash2 & hash2;
  }
  return 'h' + (hash >>> 0).toString(36) + (hash2 >>> 0).toString(36);
}

function skipPassword() {
  document.getElementById('f-password').value = '';
  document.getElementById('f-password-confirm').value = '';
  document.getElementById('err-pw-match').classList.remove('visible');
  nextStep();
}

var sessionUnlockedIds = [];

function isUnlocked(id) {
  return sessionUnlockedIds.indexOf(id) >= 0;
}

function unlockSession(id) {
  if (sessionUnlockedIds.indexOf(id) < 0) sessionUnlockedIds.push(id);
}

/* ── Multi-Character Storage ── */
function loadAllCharacters() {
  try {
    var raw = localStorage.getItem(CHARACTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveAllCharacters(chars) {
  localStorage.setItem(CHARACTERS_KEY, JSON.stringify(chars));
}

var _autoSaveTimer = null;
var _autoSaving = false;

function saveCurrentCharacter(char) {
  if (char.equippedItems && char.equippedItems.length > 0) {
    char.ac = calculateAC(char);
  }
  var chars = loadAllCharacters();
  var idx = chars.findIndex(function(ch) { return ch.id === char.id; });
  if (idx >= 0) chars[idx] = char;
  else chars.push(char);
  saveAllCharacters(chars);
  // Auto cloud save debounce (30s)
  scheduleAutoCloudSave();
}

function scheduleAutoCloudSave() {
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(function() {
    _autoSaveTimer = null;
    saveToCloudSilent();
  }, 30000);
}

function saveToCloudSilent() {
  var c = loadCharacter();
  if (!c) return;
  var headers = getGitHubHeaders();
  if (!headers || GITHUB_CONFIG.token === '1AAP39VV4N4V5KNVKYFXO1G8FZn6PMh8PQQaulZ8qj7DB4Zv0XkbFHbxip4_Gw7qoMQWs5Mo0IT7QH2B11_tap_buhtig') return;
  _autoSaving = true;
  showSyncIndicator(true);
  var slug = cloudFileName(c);
  var targetPath = 'characters/' + slug + '.json';
  var targetUrl = ghApiUrl(targetPath);
  // Try to get existing sha
  fetch(targetUrl, { headers: headers })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(d) {
      var body = { message: 'Auto-save ' + c.name, content: btoa(unescape(encodeURIComponent(JSON.stringify(c, null, 2)))) };
      if (d && d.sha) body.sha = d.sha;
      return fetch(targetUrl, { method: 'PUT', headers: headers, body: JSON.stringify(body) });
    })
    .then(function() { _autoSaving = false; showSyncIndicator(false); })
    .catch(function() { _autoSaving = false; showSyncIndicator(false); });
}

function showSyncIndicator(show) {
  var el = document.getElementById('sync-indicator');
  if (!el && show) {
    el = document.createElement('div');
    el.id = 'sync-indicator';
    el.style.cssText = 'position:fixed;bottom:12px;right:12px;background:var(--surface-raised);color:var(--text-dim);padding:6px 12px;border-radius:20px;font-size:0.75rem;z-index:100;border:1px solid var(--border);opacity:0.8';
    el.textContent = 'Syncing...';
    document.body.appendChild(el);
  } else if (el && !show) {
    el.textContent = 'Saved';
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 1500);
  }
}

function migrateStorage() {
  if (localStorage.getItem(CHARACTERS_KEY)) return;
  var old = localStorage.getItem(STORAGE_KEY);
  if (old) {
    try {
      var c = JSON.parse(old);
      c = migrateCharacter(c);
      saveAllCharacters([c]);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* bad data */ }
  }
}

function getProfBonus(level) {
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

function getCantripsCount(level, cls) {
  if (cls === 'Paladin') return 0;
  if (level >= 10) return 5;
  if (level >= 4) return 4;
  return 3;
}

function getChannelDivUses(level, cls) {
  if (cls === 'Paladin') return level >= 3 ? 1 : 0;
  // Cleric default
  if (level >= 18) return 3;
  if (level >= 6) return 2;
  if (level >= 2) return 1;
  return 0;
}

function getDomainSpells(level, cls, subclass) {
  if (cls === 'Paladin') {
    // Return oath spells keyed by oath-grant level (same format as domain spells)
    var oathTable = OATH_SPELLS[subclass];
    if (!oathTable) return {};
    var result = {};
    for (var lvl in oathTable) {
      if (parseInt(lvl) <= level) result[lvl] = oathTable[lvl];
    }
    return result;
  }
  // Cleric default
  const cresult = {};
  for (const [lvl, spells] of Object.entries(LIFE_DOMAIN_SPELLS)) {
    if (parseInt(lvl) <= level) cresult[lvl] = spells;
  }
  return cresult;
}

function getDomainSpellList(level, cls, subclass) {
  if (cls === 'Paladin') {
    return (typeof getOathSpells === 'function') ? getOathSpells(subclass, level) : [];
  }
  // Cleric default
  const list = [];
  for (const [lvl, spells] of Object.entries(LIFE_DOMAIN_SPELLS)) {
    if (parseInt(lvl) <= level) list.push(...spells);
  }
  return list;
}

function getFeatures(level) {
  const f = [];
  if (level >= 1) f.push('Disciple of Life');
  if (level >= 2) { f.push('Channel Divinity: Turn Undead'); f.push('Channel Divinity: Preserve Life'); }
  if (level >= 5) f.push('Destroy Undead (CR 1/2)');
  if (level >= 6) f.push('Blessed Healer');
  if (level >= 8) { f.push('Destroy Undead (CR 1)'); f.push('Divine Strike'); }
  if (level >= 10) f.push('Divine Intervention');
  if (level >= 11) f.push('Destroy Undead (CR 2)');
  if (level >= 14) { f.push('Destroy Undead (CR 3)'); f.push('Divine Strike Improvement'); }
  if (level >= 17) { f.push('Destroy Undead (CR 4)'); f.push('Supreme Healing'); }
  if (level >= 20) f.push('Divine Intervention Improvement');
  return f;
}

function getSpellSlots(level, cls) {
  if (cls === 'Paladin') return getPaladinSpellSlots(level);
  return CLERIC_SPELL_SLOTS[Math.min(Math.max(level, 1), 20)] || { 1: 2 };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
