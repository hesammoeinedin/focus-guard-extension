// Focus Guard - Content Script
(async () => {
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:') return;

  let data;
  try {
    data = await chrome.storage.local.get(['apiKey', 'model', 'customEndpoint', 'focusActive', 'subjects', 'checkedDomains', 'blockedDomains']);
  } catch(e) { return; }

  if (!data.focusActive) return;
  if (!data.apiKey) return;
  if (!data.subjects || data.subjects.length === 0) return;

  const currentDomain = window.location.hostname.replace('www.', '');
  const blockedDomains = data.blockedDomains || [];
  const checkedDomains = data.checkedDomains || [];

  // Already blocked — show instantly
  if (blockedDomains.includes(currentDomain)) { showBlocker(currentDomain); return; }

  // Already checked and approved — let through instantly
  if (checkedDomains.includes(currentDomain)) return;

  // New domain — show loading screen while calling AI
  const loadingOverlay = showLoadingBlocker();

  const subjectSummary = data.subjects.map(s => `- ${s.title}: ${s.description}`).join('\n');
  const prompt = `You are a strict focus assistant. The user is working on:\n${subjectSummary}\n\nThey are visiting: ${currentDomain}\n\nIs this RELEVANT to their focus subjects?\nAnswer ONLY: RELEVANT or IRRELEVANT.\nEntertainment, movies, TV, social media, unrelated news = IRRELEVANT.`;

  try {
    const apiKey = data.apiKey.trim();
    const model = data.model || detectDefaultModel(apiKey);
    const provider = detectProvider(apiKey, data.customEndpoint);

    const response = await callAI(provider, apiKey, model, prompt, data.customEndpoint);

    if (response.status === 429) {
      loadingOverlay.remove();
      document.body.style.overflow = '';
      return;
    }

    const rawText = await response.clone().text();
    console.log('[Focus Guard] Status:', response.status, 'Body:', rawText.slice(0, 300));
    const answer = await extractAnswer(provider, response);

    if (answer && answer.includes('IRRELEVANT')) {
      await chrome.storage.local.set({ blockedDomains: [...blockedDomains, currentDomain] });
      loadingOverlay.remove();
      showBlocker(currentDomain);
    } else {
      await chrome.storage.local.set({ checkedDomains: [...checkedDomains, currentDomain] });
      loadingOverlay.remove();
      document.body.style.overflow = '';
    }
  } catch (err) {
    loadingOverlay.remove();
    document.body.style.overflow = '';
  }
})();

// ── Detect provider from API key format ──────────────────
function detectProvider(apiKey, customEndpoint) {
  if (customEndpoint) return 'custom';
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-or-')) return 'openrouter';
  if (apiKey.startsWith('sk-')) return 'openai';
  return 'gemini';
}

// ── Default model per provider ───────────────────────────
function detectDefaultModel(apiKey) {
  const provider = detectProvider(apiKey, null);
  const defaults = {
    anthropic: 'claude-haiku-4-5-20251001',
    openrouter: 'openrouter/auto',
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.5-flash'
  };
  return defaults[provider] || 'gemini-2.5-flash';
}

// ── Call the right AI API ────────────────────────────────
async function callAI(provider, apiKey, model, prompt, customEndpoint) {
  if (provider === 'gemini') {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
  }

  if (provider === 'anthropic') {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  }

  if (provider === 'openai' || provider === 'openrouter') {
    const baseUrl = provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1'
      : 'https://api.openai.com/v1';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/hesammoeinedin/focus-guard-extension';
      headers['X-Title'] = 'Focus Guard';
    }
    return fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  }

  if (provider === 'custom') {
    return fetch(customEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  }
}

// ── Extract answer from response ─────────────────────────
async function extractAnswer(provider, response) {
  const result = await response.json();
  if (provider === 'gemini') {
    return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
  }
  if (provider === 'anthropic') {
    return result?.content?.[0]?.text?.trim().toUpperCase();
  }
  // openai, openrouter, custom
  return result?.choices?.[0]?.message?.content?.trim().toUpperCase();
}

// ── UI ───────────────────────────────────────────────────
function showLoadingBlocker() {
  document.body.style.overflow = 'hidden';
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;`;
  overlay.innerHTML = `<div style="text-align:center;"><div style="font-size:48px;margin-bottom:16px;">🛡️</div><p style="color:#555;font-size:14px;">Checking relevance...</p></div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function showBlocker(domain) {
  document.body.style.overflow = 'hidden';
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;`;
  overlay.innerHTML = `
    <div style="text-align:center;max-width:480px;padding:40px 20px;">
      <div style="font-size:64px;margin-bottom:24px;">🛡️</div>
      <h1 style="color:#fff;font-size:26px;font-weight:700;margin-bottom:12px;">This website is not allowed</h1>
      <p style="color:#888;font-size:15px;margin-bottom:10px;line-height:1.6;"><strong style="color:#aaa">${domain}</strong> is not relevant to your current focus session.</p>
      <p style="color:#666;font-size:13px;margin-bottom:40px;">Stay focused. You're doing great.</p>
      <button id="fg-goback" style="display:block;width:100%;max-width:300px;margin:0 auto 16px auto;background:#fff;color:#000;border:none;border-radius:10px;font-size:16px;font-weight:700;padding:16px;cursor:pointer;">← Go Back</button>
      <button id="fg-relevant" style="display:block;width:100%;max-width:300px;margin:0 auto;background:transparent;color:#555;border:1px solid #333;border-radius:10px;font-size:12px;padding:9px;cursor:pointer;">This is relevant to my work</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('fg-goback').addEventListener('click', () => history.back());
  document.getElementById('fg-relevant').addEventListener('click', async () => {
    const saved = await chrome.storage.local.get(['checkedDomains', 'blockedDomains']);
    const checked = saved.checkedDomains || [];
    if (!checked.includes(domain)) checked.push(domain);
    const blocked = (saved.blockedDomains || []).filter(d => d !== domain);
    await chrome.storage.local.set({ checkedDomains: checked, blockedDomains: blocked });
    document.body.style.overflow = '';
    overlay.remove();
  });
}
