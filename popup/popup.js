let currentLang = 'en';

const state = {
  user: null,
  sessionId: null,
  tempToken: null,
  currentTab: 'create',
  mode: 'basic',
  linksPage: 1,
  linksLoading: false,
  hasMoreLinks: true,
  linksLoaded: false,
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  currentLang = await getSavedLanguage();
  applyTranslations();

  const data = await browser.storage.local.get('session');
  if (data.session && data.session.session_id) {
    state.sessionId = data.session.session_id;
    state.user = data.session.user;
    showView('main');
    fillCurrentTabUrl();
  } else {
    showView('login');
  }
  bindEvents();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById('terms-notice').innerHTML = t('service-disclaimer');
}

// ---- API (via background script) ----

function api(path, options = {}) {
  return new Promise((resolve) => {
    browser.runtime.sendMessage({
      api: true,
      path,
      method: options.method,
      body: options.body,
    }, resolve);
  });
}

// ---- Views ----

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const view = document.getElementById('view-' + name);
  if (view) view.classList.remove('hidden');

  const actions = document.getElementById('header-actions');
  if (name === 'main' && state.user) {
    const display = state.user.username || state.user.email || '';
    let langItems = '';
    for (const [code, langName] of Object.entries(LANGUAGES)) {
      langItems += '<div class="lang-item' + (code === currentLang ? ' active' : '') + '" data-lang="' + code + '">' +
        '<span class="lang-item-code">' + code.toUpperCase() + '</span>' +
        '<span class="lang-item-name">' + langName + '</span>' +
      '</div>';
    }
    actions.innerHTML =
      '<div class="header-lang-wrapper" id="lang-dropdown">' +
        '<button class="header-lang-btn" id="lang-btn">' + currentLang.toUpperCase() +
          '<svg viewBox="0 0 12 12" class="header-lang-arrow"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>' +
        '</button>' +
        '<div class="lang-menu hidden" id="lang-menu">' + langItems + '</div>' +
      '</div>' +
      '<span class="header-username">' + escapeHtml(display) + '</span>' +
      '<button id="btn-settings" class="btn-icon-header" title="' + t('settings') + '">' +
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<button id="btn-logout" class="btn-icon-header" title="' + t('logout') + '">' +
        '<svg viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>';
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-settings').addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });
    document.getElementById('lang-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('lang-menu').classList.toggle('hidden');
    });
    document.querySelectorAll('.lang-item').forEach(item => {
      item.addEventListener('click', async () => {
        currentLang = item.dataset.lang;
        await saveLanguage(currentLang);
        document.getElementById('lang-btn').innerHTML = currentLang.toUpperCase() +
          '<svg viewBox="0 0 12 12" class="header-lang-arrow"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
        document.querySelectorAll('.lang-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('lang-menu').classList.add('hidden');
        applyTranslations();
      });
    });
    document.addEventListener('click', () => {
      const menu = document.getElementById('lang-menu');
      if (menu) menu.classList.add('hidden');
    });
  } else {
    actions.innerHTML = '';
  }
}

// ---- Events ----

function bindEvents() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('twofa-form').addEventListener('submit', handle2FA);
  document.getElementById('twofa-back').addEventListener('click', () => showView('login'));

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  document.getElementById('create-btn').addEventListener('click', handleCreateLink);
  document.getElementById('create-another-btn').addEventListener('click', resetCreateForm);
  document.getElementById('result-copy-btn').addEventListener('click', handleCopyResult);

  const accessCode = document.getElementById('access-code');
  accessCode.addEventListener('focus', () => { accessCode.type = 'text'; });
  accessCode.addEventListener('blur', () => { accessCode.type = 'password'; });

  setupOpeningsInput();
  setupDateInput();
  setupInfiniteScroll();
}

function setupOpeningsInput() {
  const input = document.getElementById('max-openings');
  input.addEventListener('focus', () => {
    if (input.value === '∞') input.value = '';
    input.type = 'number';
    input.min = '1';
  });
  input.addEventListener('blur', () => {
    input.type = 'text';
    const v = input.value.replace(/[^0-9]/g, '');
    input.value = (v === '' || parseInt(v) < 1) ? '∞' : parseInt(v).toString();
  });
}

function setupDateInput() {
  const input = document.getElementById('expiry-date');
  input.addEventListener('focus', () => {
    if (input.value === '∞') input.value = '';
    input.type = 'date';
    input.min = new Date().toISOString().split('T')[0];
  });
  input.addEventListener('blur', () => {
    const v = input.value;
    input.type = 'text';
    if (!v || isNaN(Date.parse(v))) {
      input.value = '∞';
    }
  });
}

function setupInfiniteScroll() {
  const sentinel = document.getElementById('links-sentinel');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && state.hasMoreLinks && !state.linksLoading) {
        loadLinks();
      }
    });
  }, { threshold: 0.1 });
  observer.observe(sentinel);
}

// ---- Tab switching ----

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab[data-tab="' + tabName + '"]').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('tab-' + tabName).classList.remove('hidden');

  if (tabName === 'links' && !state.linksLoaded) {
    loadLinks(true);
  }
}

function switchMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.mode-btn[data-mode="' + mode + '"]').classList.add('active');

  const advanced = document.getElementById('advanced-options');
  if (mode === 'advanced') {
    advanced.classList.remove('hidden');
  } else {
    advanced.classList.add('hidden');
  }
}

// ---- Auth handlers ----

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return;

  hideError('login-error');
  setButtonLoading('login-submit', true);

  const data = await api('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setButtonLoading('login-submit', false);

  if (data.code === '200') {
    if (data.data && data.data.requires_2fa) {
      state.tempToken = data.data.temp_token;
      showView('2fa');
      return;
    }
    await saveSession(data.data.session_id, data.data.user);
    showView('main');
    fillCurrentTabUrl();
  } else if (data.code === '403' && data.data && data.data.email_not_verified) {
    showError('login-error', t('email-not-verified'));
  } else {
    showError('login-error', data.description || t('login-failed'));
  }
}

async function handle2FA(e) {
  e.preventDefault();
  const code = document.getElementById('twofa-code').value.trim();
  if (!code) return;

  hideError('twofa-error');
  setButtonLoading('twofa-submit', true);

  const data = await api('/auth/verify-2fa/', {
    method: 'POST',
    body: JSON.stringify({ temp_token: state.tempToken, code }),
  });

  setButtonLoading('twofa-submit', false);

  if (data.code === '200') {
    await saveSession(data.data.session_id, data.data.user);
    showView('main');
    fillCurrentTabUrl();
  } else {
    showError('twofa-error', data.description || t('verification-failed'));
  }
}

async function handleLogout() {
  try {
    await api('/auth/logout/', { method: 'POST' });
  } catch {}
  state.sessionId = null;
  state.user = null;
  state.linksLoaded = false;
  state.linksPage = 1;
  state.hasMoreLinks = true;
  await browser.storage.local.remove('session');
  showView('login');
}

async function saveSession(sessionId, user) {
  state.sessionId = sessionId;
  state.user = user;
  await browser.storage.local.set({ session: { session_id: sessionId, user } });
}

// ---- Create link ----

async function handleCreateLink() {
  const urlInput = document.getElementById('link-url');
  const url = urlInput.value.trim();
  if (!url) {
    urlInput.focus();
    return;
  }

  try {
    new URL(url);
  } catch {
    showError('create-error', t('invalid-url'));
    return;
  }

  hideError('create-error');
  setButtonLoading('create-btn', true);

  const body = { link: url };

  if (state.mode === 'advanced') {
    const name = document.getElementById('custom-name').value.trim();
    const openings = document.getElementById('max-openings').value;
    const date = document.getElementById('expiry-date').value;
    const accessCode = document.getElementById('access-code').value;
    const delay = document.getElementById('redirect-delay').value;

    if (name) body.name = name;
    if (openings && openings !== '∞') body.openings = parseInt(openings);
    if (date && date !== '∞') body.date = date;
    if (accessCode) body.access_code = accessCode;
    if (delay && parseInt(delay) >= 5) body.redirect_seconds = parseInt(delay);
  }

  const data = await api('/link/create/', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  setButtonLoading('create-btn', false);

  if (data.code === '201') {
    showCreateResult(data.data);
    state.linksLoaded = false;
  } else if (data.code === '403' || data.code === '401') {
    await handleSessionExpired();
  } else {
    showError('create-error', data.description || t('create-failed'));
  }
}

function showCreateResult(linkData) {
  document.getElementById('create-form-container').classList.add('hidden');

  const resultCard = document.getElementById('create-result');
  resultCard.classList.remove('hidden');

  document.getElementById('result-url').textContent = linkData.short_url;

  const dest = document.getElementById('result-dest');
  if (linkData.has_access_code) {
    dest.textContent = t('encrypted-dest');
  } else {
    const original = linkData.original_url;
    dest.textContent = original.length > 60 ? original.substring(0, 60) + '...' : original;
  }
}

function resetCreateForm() {
  document.getElementById('create-result').classList.add('hidden');
  document.getElementById('create-form-container').classList.remove('hidden');

  document.getElementById('link-url').value = '';
  document.getElementById('custom-name').value = '';
  document.getElementById('max-openings').value = '∞';
  document.getElementById('expiry-date').value = '∞';
  document.getElementById('access-code').value = '';
  document.getElementById('redirect-delay').value = '';
  hideError('create-error');

  fillCurrentTabUrl();
}

function handleCopyResult() {
  const url = document.getElementById('result-url').textContent;
  copyToClipboard(url, document.getElementById('result-copy-btn'));
}

// ---- Links list ----

async function loadLinks(reset) {
  if (state.linksLoading) return;
  if (!state.hasMoreLinks && !reset) return;

  if (reset) {
    state.linksPage = 1;
    state.hasMoreLinks = true;
    document.getElementById('links-list').innerHTML = '';
    document.getElementById('links-empty').classList.add('hidden');
  }

  state.linksLoading = true;
  document.getElementById('links-loading').classList.remove('hidden');

  const data = await api('/user/links/?page=' + state.linksPage + '&per_page=20');

  document.getElementById('links-loading').classList.add('hidden');
  state.linksLoading = false;

  if (data.code === '200') {
    state.linksLoaded = true;
    const links = data.data.links;
    const total = data.data.total;

    if (links.length === 0 && state.linksPage === 1) {
      document.getElementById('links-empty').classList.remove('hidden');
      return;
    }

    appendLinkCards(links);

    if (state.linksPage * 20 >= total) {
      state.hasMoreLinks = false;
    }
    state.linksPage++;
  } else if (data.code === '401') {
    await handleSessionExpired();
  }
}

function appendLinkCards(links) {
  const list = document.getElementById('links-list');
  links.forEach(link => {
    const card = document.createElement('div');
    card.className = 'link-card';

    const hasAccessCode = link.has_access_code;
    const destText = hasAccessCode ? t('encrypted') : (link.original_url.length > 40 ? link.original_url.substring(0, 40) + '...' : link.original_url);
    const destClass = hasAccessCode ? 'link-card-dest encrypted' : 'link-card-dest';

    card.innerHTML =
      '<div class="link-card-info">' +
        '<div class="link-card-name">' + escapeHtml(link.name) + '</div>' +
        '<div class="' + destClass + '">' + escapeHtml(destText) + '</div>' +
      '</div>' +
      '<button class="link-card-copy" title="Copy short link" data-url="' + escapeHtml(link.short_url) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" class="icon-copy"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5"/></svg>' +
        '<svg viewBox="0 0 24 24" fill="none" class="icon-check hidden"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>';

    const copyBtn = card.querySelector('.link-card-copy');
    copyBtn.addEventListener('click', () => {
      copyToClipboard(copyBtn.dataset.url, copyBtn);
    });

    list.appendChild(card);
  });
}

// ---- Helpers ----

async function fillCurrentTabUrl() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      const url = tabs[0].url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        document.getElementById('link-url').value = url;
      }
    }
  } catch {}
}

function copyToClipboard(text, buttonEl) {
  navigator.clipboard.writeText(text).then(() => {
    if (buttonEl) {
      const copyIcon = buttonEl.querySelector('.icon-copy');
      const checkIcon = buttonEl.querySelector('.icon-check');
      if (copyIcon) copyIcon.classList.add('hidden');
      if (checkIcon) checkIcon.classList.remove('hidden');
      setTimeout(() => {
        if (copyIcon) copyIcon.classList.remove('hidden');
        if (checkIcon) checkIcon.classList.add('hidden');
      }, 1500);
    }
    showToast(t('copied'));
  }).catch(() => {
    showToast(t('copy-failed'));
  });
}

function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError(id) {
  document.getElementById(id).classList.add('hidden');
}

function setButtonLoading(id, loading) {
  const btn = document.getElementById(id);
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  if (text) text.classList.toggle('hidden', loading);
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toast-text');
  text.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

async function handleSessionExpired() {
  state.sessionId = null;
  state.user = null;
  await browser.storage.local.remove('session');
  showView('login');
  showError('login-error', t('session-expired'));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
