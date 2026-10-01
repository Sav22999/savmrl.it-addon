let currentLang = 'en';

document.addEventListener('DOMContentLoaded', async () => {
  currentLang = await getSavedLanguage();
  applyTranslations();
  buildLangSelect();

  const data = await browser.storage.local.get(['buttonBehavior', 'session']);

  const behavior = data.buttonBehavior || 'popup';
  const radio = document.querySelector('input[name="buttonBehavior"][value="' + behavior + '"]');
  if (radio) radio.checked = true;

  document.querySelectorAll('input[name="buttonBehavior"]').forEach(input => {
    input.addEventListener('change', async () => {
      await browser.storage.local.set({ buttonBehavior: input.value });
    });
  });

  const accountInfo = document.getElementById('account-info');
  if (data.session && data.session.user) {
    const user = data.session.user;
    accountInfo.innerHTML =
      '<div class="account-logged-in">' +
        '<div class="account-user">' +
          '<span class="account-username">' + escapeHtml(user.username || '') + '</span>' +
          '<span class="account-email">' + escapeHtml(user.email || '') + '</span>' +
        '</div>' +
        '<button id="btn-logout" class="btn-logout">' + t('logout') + '</button>' +
      '</div>';

    document.getElementById('btn-logout').addEventListener('click', async () => {
      try {
        await new Promise((resolve) => {
          browser.runtime.sendMessage({
            api: true,
            path: '/auth/logout/',
            method: 'POST',
          }, resolve);
        });
      } catch {}
      await browser.storage.local.remove('session');
      accountInfo.innerHTML = '<p class="account-not-logged">' + t('not-logged-in') + '</p>';
    });
  } else {
    accountInfo.innerHTML = '<p class="account-not-logged">' + t('not-logged-in') + '</p>';
  }
});

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

function buildLangSelect() {
  const select = document.getElementById('lang-select');
  for (const [code, name] of Object.entries(LANGUAGES)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = code.toUpperCase() + ' — ' + name;
    if (code === currentLang) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener('change', async () => {
    currentLang = select.value;
    await saveLanguage(currentLang);
    applyTranslations();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
