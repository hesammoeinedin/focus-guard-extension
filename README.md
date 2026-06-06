# 🛡️ Focus Guard

> An AI-powered Chrome extension that blocks distracting websites and keeps you focused on what matters.

---

## What is Focus Guard?

Focus Guard uses Google's Gemini AI to intelligently judge whether a website is relevant to your current work. If it's not — it blocks it instantly with a full-screen overlay.

No more accidentally ending up on Netflix or IMDb when you're supposed to be applying for jobs.

---

## ✨ Features

- 🤖 **AI-powered blocking** — Gemini AI judges each website based on your focus subjects
- 🎯 **Custom focus subjects** — define what you're working on with a title and description
- ⚡ **Instant blocking** — previously checked sites are cached, no API call needed
- 🌐 **Manage your sites** — view, add, or remove allowed and blocked domains manually
- 🔄 **Override option** — mark a blocked site as relevant if needed
- 💸 **Token efficient** — only sends the domain name to AI, minimizing API usage
- ⚙️ **Clean three-tab UI** — Focus, Sites, and Settings tabs

---

## 📸 Screenshots

> <img width="1326" height="722" alt="image" src="https://github.com/user-attachments/assets/68268f76-74b7-4367-a4bf-f4a6e52ac5fd" />
<img width="353" height="442" alt="image" src="https://github.com/user-attachments/assets/db62629a-afa8-4d8f-831b-c5ad0b1f476e" />
<img width="355" height="267" alt="image" src="https://github.com/user-attachments/assets/53ef6590-0475-4b72-8072-91cbce0dd73f" />
<img width="352" height="518" alt="image" src="https://github.com/user-attachments/assets/3caffcbf-6d51-40af-9e01-ef43817bbf2b" />


---

## 🚀 Installation

Since this extension is not yet on the Chrome Web Store, you can install it manually in a few steps:

**1. Download the extension**
- Click the green **"Code"** button on this page
- Select **"Download ZIP"**
- Unzip the downloaded file on your computer

**2. Load it in Chrome**
- Open Chrome and go to: `chrome://extensions`
- Enable **Developer Mode** (toggle in the top right)
- Click **"Load unpacked"**
- Select the unzipped `focus-guard-extension` folder

**3. Get your free Gemini API key**
Go to openrouter.ai → sign up free → create an API key
Paste it in the extension → model will auto-set to openrouter/auto
No credit card needed


**4. Set up the extension**
- Click the 🛡️ Focus Guard icon in your Chrome toolbar
- Go to the **⚙️ Settings** tab and paste your API key → Save
- Go to the **🎯 Focus** tab
- Add a subject — give it a title and description of what you're working on
- Turn on **Focus Mode**
- Click **Save Settings**

You're protected! 💪

---

## 🧠 How it works

1. You define your focus session — e.g. *"Job Search: Applying for Product Manager roles in the Netherlands"*
2. When you visit any website, Focus Guard checks the domain against your subjects using Gemini AI
3. If the site is **relevant** → you're let in, domain is cached as allowed
4. If the site is **irrelevant** → a full black screen blocks the page with two options:
   - **← Go Back** — leave the page
   - **This is relevant to my work** — override the block and whitelist the domain

All decisions are cached locally so the AI is only called once per domain, keeping API usage minimal.

---

## 🌐 Managing your sites

Click the **🌐 Sites** tab in the popup to:
- See all **allowed** and **blocked** domains
- **Remove** any domain to have it re-evaluated
- **Manually add** domains to either list without waiting for AI

---

## 🔑 API Key & Cost

Focus Guard uses the **Google Gemini API** (free tier).

- Get your free key at [aistudio.google.com](https://aistudio.google.com)
- No credit card required for the free tier
- Focus Guard only sends the **domain name** to the AI (e.g. `netflix.com`), keeping token usage extremely low
- Expected cost for daily use: virtually free

---

## 🛠️ Tech Stack

- Chrome Extension (Manifest V3)
- Vanilla JavaScript
- Google Gemini AI API (gemini-2.5-flash)

---

## 📄 License

MIT License — feel free to use, modify, and share.

---

*Built with the help of Claude (Anthropic) — designed for job seekers, students, and anyone who needs to stay focused.*
