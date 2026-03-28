// cloud-sync.js — GitHub API integration for character cloud save/load
/* ═══════════════════════════════════════════
   GITHUB CLOUD SYNC
   ═══════════════════════════════════════════ */

function getGitHubHeaders() {
  return { 'Authorization': 'Bearer ' + GITHUB_CONFIG.token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
}

function ghApiUrl(path) {
  return 'https://api.github.com/repos/' + GITHUB_CONFIG.username + '/' + GITHUB_CONFIG.repo + '/contents/' + path;
}

function cloudFileName(c) {
  var slug = c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) slug = 'character';
  return slug;
}

function saveToCloud() {
  var c = loadCharacter();
  if (!c) { alert('No character loaded.'); return; }
  var headers = getGitHubHeaders();
  var slug = cloudFileName(c);
  var newFilename = 'characters/' + slug + '.json';
  // Check for duplicate names — list all files and see if another char uses same slug
  var dirUrl = ghApiUrl('characters/');
  fetch(dirUrl, { headers: headers }).then(function(res) {
    if (res.status === 404) return [];
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(files) {
    if (!Array.isArray(files)) files = [];
    // Find if another file with same slug exists (different char id)
    var dupeCheck = files.filter(function(f) {
      return f.name === slug + '.json' || f.name.indexOf(slug + '-') === 0;
    });
    // Download each to check id
    var fetchPromises = dupeCheck.map(function(f) {
      return fetch(ghApiUrl(f.path), { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).then(function(d) {
        if (!d) return null;
        try { var ch = JSON.parse(decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))))); return { file: f, char: ch }; }
        catch(e) { return null; }
      });
    });
    return Promise.all(fetchPromises).then(function(results) {
      // Check if our exact char already has a file (by id)
      var existingFile = null;
      var slugTaken = false;
      results.forEach(function(r) {
        if (!r) return;
        if (r.char.id === c.id) existingFile = r.file;
        else if (r.file.name === slug + '.json') slugTaken = true;
      });
      // Also check old-style id filename
      if (!existingFile) {
        var oldFile = files.find(function(f) { return f.name === c.id + '.json'; });
        if (oldFile) existingFile = oldFile;
      }
      var targetFilename = slugTaken ? slug + '-' + c.id.substring(0, 6) : slug;
      var targetPath = 'characters/' + targetFilename + '.json';
      var targetUrl = ghApiUrl(targetPath);
      // If existing file has a different path, we need to delete old + create new
      if (existingFile && existingFile.path !== targetPath) {
        // Save to new path, then delete old
        var body = { message: 'Save ' + c.name + ' \u2014 Level ' + c.level, content: btoa(unescape(encodeURIComponent(JSON.stringify(c, null, 2)))) };
        return fetch(targetUrl, { method: 'PUT', headers: headers, body: JSON.stringify(body) }).then(function(putRes) {
          if (!putRes.ok) throw new Error('Save failed');
          // Delete old file
          return fetch(ghApiUrl(existingFile.path), { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).then(function(old) {
            if (old && old.sha) {
              return fetch(ghApiUrl(existingFile.path), { method: 'DELETE', headers: headers, body: JSON.stringify({ message: 'Rename ' + existingFile.name + ' to ' + targetFilename + '.json', sha: old.sha }) });
            }
          });
        }).then(function() { alert('Character saved to cloud!'); });
      } else {
        // Save to same path (or new)
        var sha = existingFile ? existingFile.sha : null;
        // If we need the sha and don't have it, fetch it
        var shaPromise = sha ? Promise.resolve(sha) : fetch(targetUrl, { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).then(function(d) { return d ? d.sha : null; });
        return shaPromise.then(function(fileSha) {
          var body = { message: 'Save ' + c.name + ' \u2014 Level ' + c.level, content: btoa(unescape(encodeURIComponent(JSON.stringify(c, null, 2)))) };
          if (fileSha) body.sha = fileSha;
          return fetch(targetUrl, { method: 'PUT', headers: headers, body: JSON.stringify(body) });
        }).then(function(res) {
          if (res.ok) alert('Character saved to cloud!');
          else res.json().then(function(err) { alert('Save failed: ' + (err.message || 'Unknown error')); });
        });
      }
    });
  }).catch(function(err) { alert('Save failed: ' + err.message); });
}

function loadFromCloud() {
  var headers = getGitHubHeaders();
  var url = ghApiUrl('characters/');
  showModal('<h3>Loading from Cloud...</h3><p>Fetching character list...</p>');
  fetch(url, { headers: headers }).then(function(res) {
    if (res.status === 404) { closeModal(); alert('No characters found in cloud. Save a character first.'); return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(files) {
    if (!files) return;
    var jsonFiles = files.filter(function(f) { return f.name.endsWith('.json'); });
    if (jsonFiles.length === 0) { closeModal(); alert('No characters found in cloud.'); return; }
    // Fetch each file to get character details
    showModal('<h3>Loading from Cloud...</h3><p>Fetching character details...</p>');
    var fetchPromises = jsonFiles.map(function(f) {
      return fetch(ghApiUrl(f.path), { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
        if (!data) return { file: f, char: null, date: null };
        try {
          var json = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
          var ch = JSON.parse(json);
          return { file: f, char: ch, date: null };
        } catch(e) { return { file: f, char: null, date: null }; }
      }).catch(function() { return { file: f, char: null, date: null }; });
    });
    // Get commit dates for each file
    var commitPromises = jsonFiles.map(function(f) {
      var commitsUrl = 'https://api.github.com/repos/' + GITHUB_CONFIG.username + '/' + GITHUB_CONFIG.repo + '/commits?path=' + encodeURIComponent(f.path) + '&per_page=1';
      return fetch(commitsUrl, { headers: headers }).then(function(r) { return r.ok ? r.json() : []; }).then(function(commits) {
        if (commits && commits.length > 0 && commits[0].commit && commits[0].commit.committer) {
          return commits[0].commit.committer.date;
        }
        return null;
      }).catch(function() { return null; });
    });
    return Promise.all([Promise.all(fetchPromises), Promise.all(commitPromises)]).then(function(results) {
      var charResults = results[0];
      var dates = results[1];
      // Merge dates into results
      charResults.forEach(function(r, i) { r.date = dates[i]; });
      var html = '<h3>Load from Cloud</h3><ul class="cloud-char-list">';
      charResults.forEach(function(r) {
        var displayName, detail;
        if (r.char) {
          displayName = escapeHtml(r.char.name || 'Unknown');
          var race = r.char.subrace ? r.char.subrace : r.char.race;
          detail = escapeHtml((race || '') + ' ' + (r.char.class || '') + ' \u2014 Level ' + (r.char.level || '?'));
        } else {
          displayName = escapeHtml(r.file.name.replace('.json', '').replace(/-/g, ' '));
          detail = '';
        }
        var dateStr = '';
        if (r.date) {
          var d = new Date(r.date);
          var mm = String(d.getMonth() + 1).padStart(2, '0');
          var dd = String(d.getDate()).padStart(2, '0');
          var yy = String(d.getFullYear()).slice(-2);
          dateStr = ' <span style="color:var(--text-dim);font-size:0.78rem">' + mm + '-' + dd + '-' + yy + '</span>';
        }
        html += '<li class="cloud-char-item" onclick="downloadCloudChar(\'' + escapeHtml(r.file.path) + '\')">';
        html += '<div><span style="font-weight:bold">' + displayName + '</span>' + dateStr + '</div>';
        if (detail) html += '<div style="font-size:0.8rem;color:var(--text-dim)">' + detail + '</div>';
        html += '</li>';
      });
      html += '</ul><button class="btn btn-secondary" onclick="closeModal()" style="width:100%">Cancel</button>';
      closeModal(); showModal(html);
    });
  }).catch(function(err) { closeModal(); alert('Load failed: ' + err.message); });
}

function downloadCloudChar(path) {
  var headers = getGitHubHeaders();
  var url = ghApiUrl(path);
  fetch(url, { headers: headers }).then(function(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(data) {
    var json = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
    var c = JSON.parse(json);
    c = migrateCharacter(c);
    var chars = loadAllCharacters();
    var idx = chars.findIndex(function(ch) { return ch.id === c.id; });
    if (idx >= 0) chars[idx] = c; else chars.push(c);
    saveAllCharacters(chars);
    closeModal(); alert('Loaded: ' + c.name);
    showHomeScreen();
  }).catch(function(err) { closeModal(); alert('Download failed: ' + err.message); });
}

function deleteFromCloud(charId, charName) {
  var headers = getGitHubHeaders();
  if (!headers) return;
  // Try readable filename first, then fall back to id-based
  var filenames = [];
  if (charName) {
    var slug = charName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    filenames.push('characters/' + slug + '.json');
    filenames.push('characters/' + slug + '-' + charId.substring(0, 6) + '.json');
  }
  filenames.push('characters/' + charId + '.json');
  function tryDelete(idx) {
    if (idx >= filenames.length) return;
    var url = ghApiUrl(filenames[idx]);
    fetch(url, { headers: headers }).then(function(res) {
      if (!res.ok) { tryDelete(idx + 1); return; }
      return res.json();
    }).then(function(existing) {
      if (!existing || !existing.sha) { tryDelete(idx + 1); return; }
      fetch(url, { method: 'DELETE', headers: headers, body: JSON.stringify({ message: 'Delete ' + filenames[idx], sha: existing.sha }) });
    }).catch(function() { tryDelete(idx + 1); });
  }
  tryDelete(0);
}

