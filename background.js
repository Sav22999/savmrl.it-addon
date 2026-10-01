if (typeof browser === 'undefined') {
  globalThis.browser = chrome;
}

const API_BASE = 'https://www.savmrl.it/api/v2';

// ---- API proxy: popup/options send messages, background does the fetch ----

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.api) {
    apiCall(message.path, message.body, message.method).then(sendResponse);
    return true;
  }
});

async function apiCall(path, body, method) {
  const data = await browser.storage.local.get('session');
  const sessionId = data.session?.session_id;

  const request = {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json' },
  };

  if (sessionId) {
    request.headers['Authorization'] = 'Bearer ' + sessionId;
  }

  if (body !== undefined && body !== null) {
    request.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(API_BASE + path, request);
    const json = await response.json();
    return json;
  } catch {
    return { code: '0', status: 'Error', description: 'Connection error' };
  }
}

// ---- Button behavior ----

browser.storage.local.get('buttonBehavior').then(data => {
  applyButtonBehavior(data.buttonBehavior || 'popup');
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.buttonBehavior) {
    applyButtonBehavior(changes.buttonBehavior.newValue || 'popup');
  }
});

function applyButtonBehavior(behavior) {
  if (behavior === 'quick-create') {
    browser.action.setPopup({ popup: '' });
  } else {
    browser.action.setPopup({ popup: 'popup/popup.html' });
  }
}

// ---- Quick-create on button click ----

browser.action.onClicked.addListener(async (tab) => {
  const data = await browser.storage.local.get('session');
  const session = data.session;

  if (!session || !session.session_id) {
    browser.tabs.create({ url: browser.runtime.getURL('popup/popup.html') });
    return;
  }

  if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('/images/icon.png'),
      title: 'savmrl.it',
      message: 'Cannot shorten this page.',
    });
    return;
  }

  try {
    const result = await apiCall('/link/create/', { link: tab.url }, 'POST');

    if (result.code === '201') {
      const shortUrl = result.data.short_url;

      try {
        await navigator.clipboard.writeText(shortUrl);
      } catch {}

      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('/images/icon.png'),
        title: 'Link created!',
        message: shortUrl + ' — copied to clipboard',
      });
    } else if (result.code === '403' || result.code === '401') {
      await browser.storage.local.remove('session');
      browser.tabs.create({ url: browser.runtime.getURL('popup/popup.html') });
    } else {
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('/images/icon.png'),
        title: 'savmrl.it',
        message: result.description || 'Failed to create link',
      });
    }
  } catch {
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('/images/icon.png'),
      title: 'savmrl.it',
      message: 'Connection error. Please try again.',
    });
  }
});
