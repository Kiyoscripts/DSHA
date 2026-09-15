(function () {
  'use strict';
  var root = document.documentElement;
  var navigation = document.querySelector('[data-navigation]');
  var navButton = document.querySelector('[data-nav-toggle]');
  if (navigation && navButton) {
    function closeNavigation() { navigation.removeAttribute('data-open'); navButton.setAttribute('aria-expanded', 'false'); }
    navButton.addEventListener('click', function () {
      var open = navButton.getAttribute('aria-expanded') !== 'true';
      navButton.setAttribute('aria-expanded', String(open));
      if (open) navigation.setAttribute('data-open', ''); else closeNavigation();
    });
    navigation.addEventListener('click', function (event) { if (event.target.closest('a')) closeNavigation(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && navButton.getAttribute('aria-expanded') === 'true') { closeNavigation(); navButton.focus(); } });
  }
  var toast = document.querySelector('[data-toast]'), toastTimer;
  function announce(message) {
    if (!toast) return;
    toast.textContent = message; toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.hidden = true; }, 4500);
  }
  function readQuery() {
    var result = {}, parts = location.search.slice(1).split('&');
    parts.forEach(function (part) {
      var pair = part.split('='), key, value;
      try { key = decodeURIComponent(pair.shift().replace(/\+/g, ' ')); value = decodeURIComponent(pair.join('=').replace(/\+/g, ' ')); } catch (e) { return; }
      if (['q','kind','category','view','plugin'].indexOf(key) !== -1) result[key] = value;
    });
    return result;
  }
  var themeButton = document.querySelector('[data-theme-toggle]'), sessionTheme = null;
  function themeLabel() {
    var dark = root.getAttribute('data-theme') === 'dark';
    if (themeButton) {
      themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      themeButton.setAttribute('aria-pressed', String(dark));
      themeButton.setAttribute('title', dark ? 'Dark mode is on. Tap to switch to light mode.' : 'Light mode is on. Tap to switch to dark mode.');
      var label = document.querySelector('[data-theme-label]');
      if (label) label.textContent = dark ? 'Dark' : 'Light'; else themeButton.textContent = dark ? '☾ Dark' : '☀ Light';
    }
    var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', dark ? '#070c14' : '#edf3fc');
  }
  themeLabel();
  if (themeButton) themeButton.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; sessionTheme = next; root.setAttribute('data-theme', next);
    try { localStorage.setItem('dsha-theme', next); } catch (e) {} themeLabel();
  });
  if (window.matchMedia) {
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    function systemTheme(event) { var saved = sessionTheme; if (!saved) { try { saved = localStorage.getItem('dsha-theme'); } catch (e) {} } if (saved !== 'dark' && saved !== 'light') { root.setAttribute('data-theme', event.matches ? 'dark' : 'light'); themeLabel(); } }
    if (media.addEventListener) media.addEventListener('change', systemTheme); else if (media.addListener) media.addListener(systemTheme);
  }
  function fallbackCopy(value, source) {
    var input = source && source.tagName === 'INPUT' ? source : document.createElement('textarea');
    var temporary = input !== source;
    if (temporary) { input.value = value; input.setAttribute('aria-label','Content to copy'); input.style.position = 'fixed'; input.style.left = '-9999px'; document.body.appendChild(input); }
    if (!temporary) input.hidden = false;
    input.focus(); input.select(); var copied = false;
    try { copied = document.execCommand('copy'); } catch (e) {}
    if (temporary) document.body.removeChild(input);
    if (copied) announce('Copied'); else { if (source) { source.focus(); source.select(); } announce('Automatic copy is unavailable. Select the content on the page and copy it manually.'); }
  }
  function copy(value, source) {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(function () { announce('Copied'); },function () { fallbackCopy(value, source); });
    else fallbackCopy(value, source);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy-target]'), function (button) {
    button.addEventListener('click', function () { var target = document.getElementById(button.getAttribute('data-copy-target')); if (!target) return; copy(target.value || target.textContent, target.tagName === 'INPUT' ? target : null); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-share]'), function (button) {
    button.addEventListener('click', function () { var canonical = document.querySelector('link[rel=canonical]'); var source = document.getElementById('share-url'); copy(canonical ? canonical.href : location.href, source); });
  });
  var catalog = document.querySelector('[data-catalog]');
  if (catalog) {
    var cards = Array.prototype.slice.call(catalog.querySelectorAll('[data-entry]'));
    var search = document.querySelector('[data-search]'), kind = document.querySelector('[data-kind]'), category = document.querySelector('[data-category]');
    var summary = document.querySelector('[data-results]'), empty = document.querySelector('[data-empty]');
    var viewButtons = Array.prototype.slice.call(document.querySelectorAll('[data-view-button]'));
    function allowed(value, values, fallback) { return values.indexOf(value) !== -1 ? value : fallback; }
    function loadFilters() {
      var q = readQuery(); search.value = (q.q || '').slice(0,200);
      kind.value = allowed(q.kind, ['all','builtin','skill','plugin'], 'all'); category.value = allowed(q.category,['all','device','workflow'],'all');
      var view = q.view;
      if (!view) { try { view = localStorage.getItem('dsha-view'); } catch (e) {} }
      setView(allowed(view,['list','grid'],'grid'), false);
      if (q.plugin && cards.some(function (card) { return card.getAttribute('data-entry') === q.plugin; })) location.replace('/plugins/' + encodeURIComponent(q.plugin) + '/');
      render(false);
    }
    function setView(view, save) {
      catalog.setAttribute('data-view', view);
      viewButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-view-button') === view)); });
      if (save) { try { localStorage.setItem('dsha-view', view); } catch (e) {} }
    }
    function updateUrl() {
      var pairs = [], values = {q:search.value.trim(),kind:kind.value,category:category.value,view:catalog.getAttribute('data-view')};
      Object.keys(values).forEach(function (key) { if (values[key] && values[key] !== 'all' && !(key === 'view' && values[key] === 'grid')) pairs.push(key + '=' + encodeURIComponent(values[key])); });
      if (history.replaceState) history.replaceState(null, '', location.pathname + (pairs.length ? '?' + pairs.join('&') : '') + location.hash);
    }
    function render(sync) {
      var terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean), count = 0;
      cards.forEach(function (card) {
        var content = card.getAttribute('data-search-text').toLowerCase();
        var matches = (kind.value === 'all' || kind.value === card.getAttribute('data-kind')) && (category.value === 'all' || category.value === card.getAttribute('data-category')) && terms.every(function (term) { return content.indexOf(term) !== -1; });
        card.hidden = !matches; if (matches) count++;
      });
      summary.textContent = 'Showing ' + count + ' / ' + cards.length + ' entries'; empty.hidden = count !== 0;
      if (sync) updateUrl();
    }
    var timer;
    search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { render(true); },120); });
    kind.addEventListener('change', function () { render(true); }); category.addEventListener('change', function () { render(true); });
    viewButtons.forEach(function (button) { button.addEventListener('click', function () { setView(button.getAttribute('data-view-button'), true); updateUrl(); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-reset]'),function (button) { button.addEventListener('click',function () { clearTimeout(timer); search.value='';kind.value='all';category.value='all';render(true);search.focus(); }); });
    window.addEventListener('popstate',loadFilters); loadFilters();
  }
  var form = document.querySelector('[data-submit-form]');
  if (form) form.addEventListener('submit', function (event) {
    event.preventDefault(); if (!form.checkValidity()) { if (form.reportValidity) form.reportValidity(); return; }
    var value = function (name) { return form.elements[name].value.trim(); };
    var required = ['name','source','version','license','description','permissions','tested'];
    for (var i = 0; i < required.length; i++) {
      if (!value(required[i])) { announce('Please complete every required field. Values cannot be only spaces.'); form.elements[required[i]].focus(); return; }
    }
    var lines = ['## Marketplace listing request','', '- Name: ' + value('name'), '- Type: ' + value('kind'), '- Source: ' + value('source'), '- Release version: ' + value('version'), '- Release package: ' + (value('artifact') || 'See the source notes'), '- License: ' + value('license'), '', '### What it does',value('description'), '', '### Dependencies, data, and permissions',value('permissions'), '', '### DSHA test record',value('tested'), '', 'Please review this request before listing it. Submitting does not mean the plugin has been approved.'];
    var body = lines.join('\n'), preview = document.querySelector('[data-submission-preview]'); preview.textContent = body;
    var link = document.querySelector('[data-submit-link]');
    var base = 'https://github.com/qiannianhuanxiang/DSHA/issues/new?title=' + encodeURIComponent('[Marketplace listing] ' + value('name'));
    var complete = base + '&body=' + encodeURIComponent(body), longBody = complete.length > 6500;
    link.href = longBody ? base : complete;
    link.textContent = longBody ? 'Open GitHub (copy the body first)' : 'Open GitHub to submit';
    var result = document.querySelector('[data-submit-result]'); result.hidden = false; result.focus(); announce(longBody ? 'This submission is long. Copy the body, then paste it on GitHub.' : 'The submission draft is ready. Review it, then submit on GitHub.');
  });
  root.className += ' js';
})();
