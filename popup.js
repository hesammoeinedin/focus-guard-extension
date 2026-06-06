// ── Tab switching ──────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'sites') renderSiteLists();
  });
});

// ── Info modal ─────────────────────────────────────────────
document.getElementById('infoBtn').addEventListener('click', () =>
  document.getElementById('infoModal').classList.add('visible'));
document.getElementById('closeModal').addEventListener('click', () =>
  document.getElementById('infoModal').classList.remove('visible'));
document.getElementById('infoModal').addEventListener('click', e => {
  if (e.target === document.getElementById('infoModal'))
    document.getElementById('infoModal').classList.remove('visible');
});

// ── Subjects ───────────────────────────────────────────────
let subjects = [];

function renderSubjects() {
  const list = document.getElementById('subjectsList');
  list.innerHTML = '';
  subjects.forEach((subject, index) => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <input type="text" placeholder="Title (e.g. Job Search)" value="${subject.title}" data-index="${index}" data-field="title"/>
      <textarea rows="2" placeholder="Description (e.g. Applying for PM roles in the Netherlands)" data-index="${index}" data-field="description">${subject.description}</textarea>
      <button class="delete-btn" data-index="${index}">×</button>`;
    list.appendChild(card);
  });
  list.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', e => {
      subjects[+e.target.dataset.index][e.target.dataset.field] = e.target.value;
    });
  });
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      subjects.splice(+e.target.dataset.index, 1);
      renderSubjects();
    });
  });
}

document.getElementById('addSubjectBtn').addEventListener('click', () => {
  subjects.push({ title: '', description: '' });
  renderSubjects();
  const inputs = document.querySelectorAll('#subjectsList input[data-field="title"]');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

// ── Save focus settings ────────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', () => {
  const focusActive = document.getElementById('focusToggle').checked;
  const validSubjects = subjects.filter(s => s.title.trim() || s.description.trim());
  if (focusActive && validSubjects.length === 0) {
    showStatus('status', 'Please add at least one subject.', true); return;
  }
  chrome.storage.local.set({ focusActive, subjects: validSubjects }, () =>
    showStatus('status', '✓ Settings saved!'));
});

// ── Save API key ───────────────────────────────────────────
document.getElementById('saveApiBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) { showStatus('settingsStatus', 'Please enter an API key.', true); return; }
  chrome.storage.local.set({ apiKey }, () =>
    showStatus('settingsStatus', '✓ API key saved!'));
});

// ── Sites tab ──────────────────────────────────────────────
function renderSiteLists() {
  chrome.storage.local.get(['relevantDomains', 'blockedDomains'], data => {
    const relevant = data.relevantDomains || [];
    const blocked = data.blockedDomains || [];

    document.getElementById('relevantCount').textContent = relevant.length;
    document.getElementById('blockedCount').textContent = blocked.length;

    renderDomainList('relevantList', relevant, 'relevant');
    renderDomainList('blockedList', blocked, 'blocked');
  });
}

function renderDomainList(containerId, domains, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (domains.length === 0) {
    container.innerHTML = `<div class="empty-list">No sites yet</div>`;
    return;
  }
  domains.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'domain-item';
    item.innerHTML = `
      <span>${domain}</span>
      <button class="remove-domain" data-domain="${domain}" data-type="${type}">×</button>`;
    container.appendChild(item);
  });
  container.querySelectorAll('.remove-domain').forEach(btn => {
    btn.addEventListener('click', async () => {
      const d = btn.dataset.domain;
      const t = btn.dataset.type;
      const key = t === 'relevant' ? 'relevantDomains' : 'blockedDomains';
      const saved = await chrome.storage.local.get([key]);
      const updated = (saved[key] || []).filter(x => x !== d);
      await chrome.storage.local.set({ [key]: updated });
      renderSiteLists();
    });
  });
}

// Add domain manually
document.getElementById('addRelevantBtn').addEventListener('click', async () => {
  const input = document.getElementById('addRelevantInput');
  const domain = input.value.trim().replace('www.', '').replace(/https?:\/\//,'');
  if (!domain) return;
  const saved = await chrome.storage.local.get(['relevantDomains']);
  const list = saved.relevantDomains || [];
  if (!list.includes(domain)) list.push(domain);
  await chrome.storage.local.set({ relevantDomains: list });
  input.value = '';
  renderSiteLists();
});

document.getElementById('addBlockedBtn').addEventListener('click', async () => {
  const input = document.getElementById('addBlockedInput');
  const domain = input.value.trim().replace('www.', '').replace(/https?:\/\//,'');
  if (!domain) return;
  const saved = await chrome.storage.local.get(['blockedDomains']);
  const list = saved.blockedDomains || [];
  if (!list.includes(domain)) list.push(domain);
  await chrome.storage.local.set({ blockedDomains: list });
  input.value = '';
  renderSiteLists();
});

// ── Danger zone ────────────────────────────────────────────
document.getElementById('clearCacheBtn').addEventListener('click', () => {
  chrome.storage.local.set({ relevantDomains: [], blockedDomains: [] }, () =>
    showStatus('settingsStatus', '✓ Site cache cleared!'));
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
  chrome.storage.local.clear(() => {
    showStatus('settingsStatus', '✓ Everything reset!');
    subjects = [{ title: '', description: '' }];
    renderSubjects();
    document.getElementById('focusToggle').checked = false;
    document.getElementById('apiKey').value = '';
  });
});

// ── Helpers ────────────────────────────────────────────────
function showStatus(id, msg, isError = false) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'status' + (isError ? ' error' : '');
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ── Load saved data on open ────────────────────────────────
chrome.storage.local.get(['apiKey', 'focusActive', 'subjects'], data => {
  if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
  if (data.focusActive !== undefined) document.getElementById('focusToggle').checked = data.focusActive;
  subjects = (data.subjects && data.subjects.length > 0) ? data.subjects : [{ title: '', description: '' }];
  renderSubjects();
});
