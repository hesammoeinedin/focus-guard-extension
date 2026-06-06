// ── Provider detection ─────────────────────────────────────
const PROVIDERS = {
  anthropic: {
    name: '🟣 Anthropic (Claude)',
    detect: k => k.startsWith('sk-ant-'),
    defaultModel: 'claude-haiku-4-5-20251001',
    hint: 'Free tier via console.anthropic.com'
  },
  openrouter: {
    name: '🟡 OpenRouter',
    detect: k => k.startsWith('sk-or-'),
    defaultModel: 'openrouter/auto',
    hint: 'Free models available → openrouter.ai'
  },
  openai: {
    name: '🟢 OpenAI',
    detect: k => k.startsWith('sk-') && !k.startsWith('sk-ant-') && !k.startsWith('sk-or-'),
    defaultModel: 'gpt-4o-mini',
    hint: 'Get key at platform.openai.com'
  },
  gemini: {
    name: '🔵 Google Gemini',
    detect: k => true, // fallback
    defaultModel: 'gemini-2.5-flash',
    hint: 'Free tier at aistudio.google.com'
  }
};

function detectProvider(key) {
  if (!key) return null;
  for (const [id, p] of Object.entries(PROVIDERS)) {
    if (id !== 'gemini' && p.detect(key)) return id;
  }
  return 'gemini';
}

// ── Tab switching ──────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'sites') renderBlockedList();
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

// ── API key live detection ─────────────────────────────────
document.getElementById('apiKey').addEventListener('input', e => {
  const key = e.target.value.trim();
  const providerId = detectProvider(key);
  const badge = document.getElementById('detectedProvider');
  const modelInput = document.getElementById('modelName');
  const hint = document.getElementById('modelHint');

  if (!key) {
    badge.textContent = 'Paste a key to detect provider';
    badge.className = 'detected-badge unknown';
    modelInput.placeholder = 'Auto-filled based on your key';
    modelInput.value = '';
    hint.textContent = '';
    return;
  }

  const provider = PROVIDERS[providerId];
  badge.textContent = '✓ ' + provider.name;
  badge.className = 'detected-badge';

  // Only auto-fill model if user hasn't typed one
  if (!modelInput.dataset.userEdited) {
    modelInput.value = provider.defaultModel;
  }
  hint.textContent = provider.hint;
});

// Track if user manually edited the model field
document.getElementById('modelName').addEventListener('input', e => {
  e.target.dataset.userEdited = e.target.value ? 'true' : '';
});

// ── Advanced toggle ────────────────────────────────────────
document.getElementById('advancedToggle').addEventListener('click', () => {
  const section = document.getElementById('advancedSection');
  const btn = document.getElementById('advancedToggle');
  const visible = section.classList.toggle('visible');
  btn.textContent = visible ? '▾ Advanced: Custom endpoint' : '▸ Advanced: Custom endpoint';
});

// ── Save API settings ──────────────────────────────────────
document.getElementById('saveApiBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('modelName').value.trim();
  const customEndpoint = document.getElementById('customEndpoint').value.trim();

  if (!apiKey) { showStatus('settingsStatus', 'Please enter an API key.', true); return; }

  chrome.storage.local.set({ apiKey, model, customEndpoint }, () =>
    showStatus('settingsStatus', '✓ API settings saved!'));
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

document.getElementById('saveBtn').addEventListener('click', () => {
  const focusActive = document.getElementById('focusToggle').checked;
  const validSubjects = subjects.filter(s => s.title.trim() || s.description.trim());
  if (focusActive && validSubjects.length === 0) {
    showStatus('status', 'Please add at least one subject.', true); return;
  }
  chrome.storage.local.set({ focusActive, subjects: validSubjects }, () =>
    showStatus('status', '✓ Settings saved!'));
});

// ── Blocked sites ──────────────────────────────────────────
function renderBlockedList() {
  chrome.storage.local.get(['blockedDomains'], data => {
    const blocked = data.blockedDomains || [];
    document.getElementById('blockedCount').textContent = blocked.length;
    const container = document.getElementById('blockedList');
    container.innerHTML = '';
    if (blocked.length === 0) {
      container.innerHTML = `<div class="empty-list">No blocked sites yet — they'll appear here automatically.</div>`;
      return;
    }
    blocked.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'domain-item';
      item.innerHTML = `<span>${domain}</span><button class="remove-domain" data-domain="${domain}">×</button>`;
      container.appendChild(item);
    });
    container.querySelectorAll('.remove-domain').forEach(btn => {
      btn.addEventListener('click', async () => {
        const d = btn.dataset.domain;
        const saved = await chrome.storage.local.get(['blockedDomains', 'checkedDomains']);
        const blocked = (saved.blockedDomains || []).filter(x => x !== d);
        const checked = (saved.checkedDomains || []).filter(x => x !== d);
        await chrome.storage.local.set({ blockedDomains: blocked, checkedDomains: checked });
        renderBlockedList();
      });
    });
  });
}

document.getElementById('addBlockedBtn').addEventListener('click', async () => {
  const input = document.getElementById('addBlockedInput');
  const domain = input.value.trim().replace('www.', '').replace(/https?:\/\//,'').replace(/\/.*/,'');
  if (!domain) return;
  const saved = await chrome.storage.local.get(['blockedDomains']);
  const list = saved.blockedDomains || [];
  if (!list.includes(domain)) list.push(domain);
  await chrome.storage.local.set({ blockedDomains: list });
  input.value = '';
  renderBlockedList();
});

// ── Danger zone ────────────────────────────────────────────
document.getElementById('clearCacheBtn').addEventListener('click', () => {
  chrome.storage.local.set({ checkedDomains: [], blockedDomains: [] }, () =>
    showStatus('settingsStatus', '✓ Site cache cleared!'));
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
  chrome.storage.local.clear(() => {
    showStatus('settingsStatus', '✓ Everything reset!');
    subjects = [{ title: '', description: '' }];
    renderSubjects();
    document.getElementById('focusToggle').checked = false;
    document.getElementById('apiKey').value = '';
    document.getElementById('modelName').value = '';
    document.getElementById('detectedProvider').textContent = 'Paste a key to detect provider';
    document.getElementById('detectedProvider').className = 'detected-badge unknown';
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
chrome.storage.local.get(['apiKey', 'model', 'customEndpoint', 'focusActive', 'subjects'], data => {
  if (data.apiKey) {
    document.getElementById('apiKey').value = data.apiKey;
    // Trigger detection display
    const providerId = detectProvider(data.apiKey);
    const provider = PROVIDERS[providerId];
    const badge = document.getElementById('detectedProvider');
    badge.textContent = '✓ ' + provider.name;
    badge.className = 'detected-badge';
    document.getElementById('modelHint').textContent = provider.hint;
  }
  if (data.model) {
    document.getElementById('modelName').value = data.model;
    document.getElementById('modelName').dataset.userEdited = 'true';
  }
  if (data.customEndpoint) {
    document.getElementById('customEndpoint').value = data.customEndpoint;
    document.getElementById('advancedSection').classList.add('visible');
    document.getElementById('advancedToggle').textContent = '▾ Advanced: Custom endpoint';
  }
  if (data.focusActive !== undefined) document.getElementById('focusToggle').checked = data.focusActive;
  subjects = (data.subjects && data.subjects.length > 0) ? data.subjects : [{ title: '', description: '' }];
  renderSubjects();
});
