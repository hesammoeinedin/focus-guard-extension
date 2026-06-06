// Focus Guard - Content Script
(async () => {
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:') return;

  let data;
  try {
    data = await chrome.storage.local.get(['apiKey', 'focusActive', 'subjects', 'relevantDomains', 'blockedDomains']);
  } catch(e) { return; }

  if (!data.focusActive) return;
  if (!data.apiKey) return;
  if (!data.subjects || data.subjects.length === 0) return;

  const currentDomain = window.location.hostname.replace('www.', '');
  const relevantDomains = data.relevantDomains || [];
  const blockedDomains = data.blockedDomains || [];

  // Already whitelisted
  if (relevantDomains.includes(currentDomain)) return;

  // Already blocked — show instantly
  if (blockedDomains.includes(currentDomain)) {
    showBlocker(currentDomain);
    return;
  }

  // New domain — show loading screen while calling AI
  const loadingOverlay = showLoadingBlocker();

  const subjectSummary = data.subjects
    .map(s => `- ${s.title}: ${s.description}`)
    .join('\n');

  // Only send the domain — saves ~90% tokens
  const prompt = `You are a strict focus assistant. The user is working on:
${subjectSummary}

They are visiting the website: ${currentDomain}

Is this website RELEVANT to their focus subjects?
Answer with ONLY one word: RELEVANT or IRRELEVANT.
Entertainment, movies, TV, social media, news unrelated to work = IRRELEVANT.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${data.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (response.status === 429) {
      loadingOverlay.remove();
      document.body.style.overflow = '';
      return;
    }

    const result = await response.json();
    const answer = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();

    if (answer && answer.includes('IRRELEVANT')) {
      const updatedBlocked = [...blockedDomains, currentDomain];
      await chrome.storage.local.set({ blockedDomains: updatedBlocked });
      loadingOverlay.remove();
      showBlocker(currentDomain);
    } else {
      const updatedRelevant = [...relevantDomains, currentDomain];
      await chrome.storage.local.set({ relevantDomains: updatedRelevant });
      loadingOverlay.remove();
      document.body.style.overflow = '';
    }
  } catch (err) {
    loadingOverlay.remove();
    document.body.style.overflow = '';
  }
})();

function showLoadingBlocker() {
  document.body.style.overflow = 'hidden';
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: #000; z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Segoe UI', sans-serif;
  `;
  overlay.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">🛡️</div>
      <p style="color:#555;font-size:14px;">Checking relevance...</p>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function showBlocker(domain) {
  document.body.style.overflow = 'hidden';
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: #000; z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Segoe UI', sans-serif;
  `;
  overlay.innerHTML = `
    <div style="text-align:center;max-width:480px;padding:40px 20px;">
      <div style="font-size:64px;margin-bottom:24px;">🛡️</div>
      <h1 style="color:#fff;font-size:26px;font-weight:700;margin-bottom:12px;">This website is not allowed</h1>
      <p style="color:#888;font-size:15px;margin-bottom:10px;line-height:1.6;">
        <strong style="color:#aaa">${domain}</strong> is not relevant to your current focus session.
      </p>
      <p style="color:#666;font-size:13px;margin-bottom:40px;">Stay focused. You're doing great.</p>
      <button id="fg-goback" style="
        display:block;width:100%;max-width:300px;margin:0 auto 16px auto;
        background:#fff;color:#000;border:none;border-radius:10px;
        font-size:16px;font-weight:700;padding:16px;cursor:pointer;">← Go Back</button>
      <button id="fg-relevant" style="
        display:block;width:100%;max-width:300px;margin:0 auto;
        background:transparent;color:#555;border:1px solid #333;
        border-radius:10px;font-size:12px;padding:9px;cursor:pointer;">
        This is relevant to my work</button>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('fg-goback').addEventListener('click', () => history.back());
  document.getElementById('fg-relevant').addEventListener('click', async () => {
    const saved = await chrome.storage.local.get(['relevantDomains', 'blockedDomains']);
    const whitelist = saved.relevantDomains || [];
    if (!whitelist.includes(domain)) whitelist.push(domain);
    const blocked = (saved.blockedDomains || []).filter(d => d !== domain);
    await chrome.storage.local.set({ relevantDomains: whitelist, blockedDomains: blocked });
    document.body.style.overflow = '';
    overlay.remove();
  });
}
