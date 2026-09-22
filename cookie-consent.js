/* Furnes design Cookie Consent v3.0.0-rc.1
 * Requires the matching v3 GTM configuration. No vendor requests before consent.
 * Existing Webflow cc / cc-checkbox attributes are preserved.
 */
(function (window, document) {
  'use strict';
  if (window.CookieConsentV3) return;

  var VERSION = '3.0.0-rc.1';
  var config = window.CookieConsentConfig || {};
  var key = config.storageKey || 'fd_cookie_consent_v3';
  var policy = String(config.policyVersion || '3');
  var days = Number(config.maxAgeDays === undefined ? 180 : config.maxAgeDays);
  var ttl = isFinite(days) && days > 0 ? days * 86400000 : 180 * 86400000;
  var gtmId = String(config.gtmId || '');
  var categories = config.gtmCategories || ['analytics', 'marketing'];
  var gaIds = Array.isArray(config.ga4MeasurementIds) ? config.ga4MeasurementIds : [];
  var record = null;
  var store = null;
  var gtmRequested = false;
  var clarityRequested = false;
  var suspending = false;
  var expiryTimer;
  var reloadCallbacks = [];
  var lastFocus = null;
  var status = 'starting';
  var denied = { functional: false, marketing: false, analytics: false };
  var resetParam = '__cc_v3_reset';

  function cloneChoices(value) {
    return {
      functional: !!(value && value.functional === true),
      marketing: !!(value && value.marketing === true),
      analytics: !!(value && value.analytics === true)
    };
  }

  function valid(value) {
    var now = Date.now();
    return !!(value && value.schema === 3 && value.policyVersion === policy &&
      typeof value.updatedAt === 'number' && isFinite(value.updatedAt) &&
      typeof value.expiresAt === 'number' && isFinite(value.expiresAt) &&
      value.updatedAt <= now && value.expiresAt > now &&
      value.expiresAt > value.updatedAt && value.expiresAt - value.updatedAt <= ttl &&
      typeof value.functional === 'boolean' && typeof value.marketing === 'boolean' &&
      typeof value.analytics === 'boolean');
  }

  function getState() {
    var ok = !suspending && valid(record);
    var result = cloneChoices(ok ? record : denied);
    result.apiVersion = 3;
    result.valid = ok;
    return result;
  }

  function same(a, b) {
    return a.functional === b.functional && a.marketing === b.marketing &&
      a.analytics === b.analytics;
  }

  function readStored() {
    if (!store) return null;
    try {
      var value = JSON.parse(store.getItem(key));
      return valid(value) ? value : null;
    } catch (_) { return null; }
  }

  function saveStored(value) {
    if (!store) return false;
    try {
      // Removing the old grant first prevents quota errors retaining old consent.
      store.removeItem(key);
      store.setItem(key, JSON.stringify(value));
      return store.getItem(key) === JSON.stringify(value);
    } catch (_) { return false; }
  }

  function queryAll(selector) { return document.querySelectorAll(selector); }
  function forEach(nodes, fn) { Array.prototype.forEach.call(nodes, fn); }

  function syncCheckboxes() {
    var current = getState();
    ['functional', 'marketing', 'analytics'].forEach(function (category) {
      forEach(queryAll('[cc-checkbox="' + category + '"]'), function (element) {
        element.checked = current[category];
        // Webflow's custom checkbox has a separate visual indicator.
        var wrapper = element.closest && element.closest('.w-checkbox');
        var visual = wrapper && wrapper.querySelector('.w-checkbox-input');
        if (visual) visual.classList.toggle('w--redirected-checked', current[category]);
      });
    });
  }

  function openPreferences() {
    syncCheckboxes();
    lastFocus = document.activeElement;
    var modal = document.querySelector('[cc="preferences"]');
    if (!modal) return;
    modal.style.display = config.modalDisplay || 'flex';
    modal.setAttribute('aria-hidden', 'false');
    var first = modal.querySelector('button, [href], input, [tabindex="0"]');
    if (first) first.focus();
  }

  function closePreferences() {
    // Closing never saves unchecked/checked choices or grants consent.
    forEach(queryAll('[cc="preferences"]'), function (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    });
    if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus();
  }

  function disableGA(disable) {
    gaIds.forEach(function (id) {
      if (/^G-[A-Z0-9]+$/.test(id)) window['ga-disable-' + id] = disable;
    });
  }

  function clearDeniedCookies(choices) {
    // Best effort: only known, script-readable first-party cookies.
    var rules = [];
    if (!choices.analytics) rules.push(/^_ga(?:_|$)/, /^_gid$/, /^_gat(?:_|$)/, /^_clck$/, /^_clsk$/);
    if (!choices.marketing) rules.push(/^_fbp$/, /^_fbc$/, /^_gcl_/);
    if (!rules.length) return;
    try {
      var names = document.cookie.split(';').map(function (part) { return part.trim().split('=')[0]; });
      var domains = [''];
      var parts = window.location.hostname.split('.');
      for (var i = 0; i < parts.length - 1; i++) {
        var domain = parts.slice(i).join('.');
        domains.push(domain, '.' + domain);
      }
      var paths = ['/'];
      var pathParts = window.location.pathname.split('/');
      for (var j = 1; j < pathParts.length; j++) {
        var path = pathParts.slice(0, j + 1).join('/');
        paths.push(path, path + '/');
      }
      names.forEach(function (name) {
        if (!rules.some(function (rule) { return rule.test(name); })) return;
        domains.forEach(function (domain) {
          paths.forEach(function (path) {
            document.cookie = name + '=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=' +
              path + (domain ? '; Domain=' + domain : '') + '; SameSite=Lax' +
              (window.location.protocol === 'https:' ? '; Secure' : '');
          });
        });
      });
    } catch (_) { /* Cookie access is optional. */ }
  }

  function stopAndReload(persisted) {
    if (suspending) return;
    suspending = true;
    status = 'reloading';
    disableGA(true);
    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push(cloneChoices(denied));
    }
    try { if (typeof window.fbq === 'function') window.fbq('consent', 'revoke'); } catch (_) {}
    // stop() ends Clarity recording; a vendor may flush previously collected data.
    try { if (clarityRequested && typeof window.clarity === 'function') window.clarity('stop'); } catch (_) {}
    reloadCallbacks.forEach(function (callback) { try { callback(); } catch (_) {} });
    clearDeniedCookies(record && valid(record) ? record : denied);
    if (!persisted) {
      // If storage becomes unwritable, an old grant must not win after reload.
      // This marker carries no consent values and forces a fresh choice.
      var url = new URL(window.location.href);
      url.searchParams.set(resetParam, '1');
      window.location.replace(url.href);
    } else {
      window.location.reload();
    }
  }

  function armExpiry() {
    window.clearTimeout(expiryTimer);
    if (record && valid(record)) {
      expiryTimer = window.setTimeout(checkCurrent, Math.min(record.expiresAt - Date.now() + 1, 2147483647));
    }
  }

  function checkCurrent() {
    if (suspending) return;
    if (record && !valid(record)) {
      record = null;
      var cleared = false;
      try { if (store) { store.removeItem(key); cleared = true; } } catch (_) {}
      if (gtmRequested) { stopAndReload(cleared); return; }
      disableGA(true);
      clearDeniedCookies(denied);
      openPreferences();
    }
    armExpiry();
  }

  function loadGTM() {
    var state = getState();
    if (suspending || gtmRequested || !state.valid) return;
    if (!Array.isArray(categories) || !categories.some(function (category) { return state[category] === true; })) return;
    if (!/^GTM-[A-Z0-9]+$/.test(gtmId)) { status = 'invalid-gtm-id'; return; }
    // A second loader defeats the timing guarantee; fail closed and flag setup.
    if (window.google_tag_manager || document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
      status = 'duplicate-gtm';
      return;
    }
    gtmRequested = true;
    status = 'gtm-requested';
    disableGA(!state.analytics);
    // Drop pre-consent queued events. This v3 installation owns GTM bootstrap.
    // No pre-consent clicks/ecommerce events are replayed after acceptance.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.length = 0;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(gtmId);
    script.onerror = function () { status = 'gtm-load-error'; };
    script.onload = function () { if (!suspending) status = 'gtm-loaded'; };
    (document.head || document.documentElement).appendChild(script);
  }

  function loadClarity(projectId) {
    var state = getState();
    if (!state.valid || !state.analytics || !gtmRequested || clarityRequested || !/^[a-zA-Z0-9]+$/.test(projectId)) return false;
    clarityRequested = true;
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    // Queue the exact permission values before the external script is inserted.
    window.clarity('consentv2', {
      analytics_Storage: 'granted',
      ad_Storage: state.marketing ? 'granted' : 'denied'
    });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.clarity.ms/tag/' + encodeURIComponent(projectId);
    (document.head || document.documentElement).appendChild(script);
    return true;
  }

  function saveChoices(choices) {
    if (suspending) return;
    var previous = getState();
    var next = cloneChoices(choices);
    var now = Date.now();
    record = {
      schema: 3, policyVersion: policy, updatedAt: now, expiresAt: now + ttl,
      functional: next.functional, marketing: next.marketing, analytics: next.analytics
    };
    var persisted = saveStored(record);
    syncCheckboxes();
    closePreferences();
    if (gtmRequested && !same(previous, next)) {
      stopAndReload(persisted);
      return;
    }
    disableGA(!next.analytics);
    clearDeniedCookies(next);
    armExpiry();
    loadGTM();
  }

  function bindUI() {
    // Delegation supports multiple open/close/allow buttons and nested icons.
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('[cc]') : null;
      if (!target) return;
      var action = target.getAttribute('cc');
      if (['allow', 'deny', 'submit', 'close', 'open-preferences'].indexOf(action) < 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === 'open-preferences') { openPreferences(); return; }
      if (action === 'close') { closePreferences(); return; }
      if (action === 'allow') { saveChoices({ functional: true, marketing: true, analytics: true }); return; }
      if (action === 'deny') { saveChoices(denied); return; }
      var scope = target.closest('[cc="preferences"]') || document;
      var choices = {};
      ['functional', 'marketing', 'analytics'].forEach(function (category) {
        var input = scope.querySelector('[cc-checkbox="' + category + '"]');
        choices[category] = !!(input && input.checked);
      });
      saveChoices(choices);
    }, true);
    document.addEventListener('change', function (event) {
      var input = event.target;
      var category = input && input.getAttribute && input.getAttribute('cc-checkbox');
      if (['functional', 'marketing', 'analytics'].indexOf(category) < 0) return;
      forEach(queryAll('[cc-checkbox="' + category + '"]'), function (other) {
        other.checked = input.checked;
        var wrapper = other.closest && other.closest('.w-checkbox');
        var visual = wrapper && wrapper.querySelector('.w-checkbox-input');
        if (visual) visual.classList.toggle('w--redirected-checked', input.checked);
      });
    });
    document.addEventListener('keydown', function (event) {
      var modal = document.querySelector('[cc="preferences"]');
      if (!modal || modal.style.display === 'none' || modal.getAttribute('aria-hidden') !== 'false') return;
      if (event.key === 'Escape') { event.preventDefault(); closePreferences(); return; }
      if (event.key !== 'Tab') return;
      var focusable = Array.prototype.filter.call(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]'), function (el) {
        return !el.disabled && el.getClientRects().length > 0;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function init() {
    try {
      var candidate = window.localStorage;
      var probe = key + '_probe';
      candidate.setItem(probe, '1');
      candidate.removeItem(probe);
      store = candidate;
    } catch (_) { store = null; }
    var url = new URL(window.location.href);
    if (url.searchParams.has(resetParam)) {
      try { if (store) store.removeItem(key); } catch (_) {}
      url.searchParams.delete(resetParam);
      try { window.history.replaceState(window.history.state, '', url.href); } catch (_) {}
      record = null;
    } else {
      record = readStored();
    }
    bindUI();
    syncCheckboxes();
    var state = getState();
    disableGA(!state.analytics);
    clearDeniedCookies(state);
    if (state.valid) closePreferences(); else openPreferences();
    status = 'waiting-for-consent';
    armExpiry();
    loadGTM();
    window.addEventListener('storage', function (event) {
      if (event.key !== key && event.key !== null) return;
      var previous = getState();
      var next = readStored();
      record = next;
      if (gtmRequested && (!next || !same(previous, next))) { stopAndReload(true); return; }
      syncCheckboxes();
      if (next) closePreferences(); else openPreferences();
      disableGA(!getState().analytics);
      clearDeniedCookies(getState());
      armExpiry();
      loadGTM();
    });
    window.addEventListener('pageshow', function (event) {
      // Re-read consent when a browser restores a page from the back/forward cache.
      if (event.persisted && store) {
        var previous = getState();
        var latest = readStored();
        record = latest;
        if (gtmRequested && (!latest || !same(previous, latest))) { stopAndReload(true); return; }
        syncCheckboxes();
        if (!latest) openPreferences();
        loadGTM();
      }
      checkCurrent();
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkCurrent(); });
  }

  window.CookieConsentV3 = Object.freeze({
    version: VERSION,
    getState: getState,
    open: openPreferences,
    save: saveChoices,
    loadClarity: loadClarity,
    onBeforeReload: function (callback) { if (typeof callback === 'function') reloadCallbacks.push(callback); },
    getStatus: function () { return status; }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window, document);
