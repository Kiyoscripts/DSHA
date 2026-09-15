(function () {
  'use strict';
  var page = document.querySelector('[data-install-page]');
  if (!page) return;
  var status = page.querySelector('[data-install-status]');
  var actions = page.querySelector('[data-install-actions]');
  var source = document.getElementById('plugin-source');
  var note = page.querySelector('[data-install-note]');
  var sharing = page.querySelector('[data-install-sharing]');
  var share = document.getElementById('install-share-url');
  var qr = page.querySelector('[data-install-qr]');
  var qrNote = page.querySelector('[data-install-qr-note]');
  var original = null;
  function invalidate(message) {
    actions.hidden = true; sharing.hidden = true;
    page.querySelector('[data-open-app]').removeAttribute('href');
    page.querySelector('[data-open-scheme]').removeAttribute('href');
    share.value = ''; qr.textContent = ''; note.textContent = '';
    if (message) status.textContent = message;
  }
  function parse(query) {
    var values = {};
    if (!query) return values;
    query.replace(/^\?/, '').split('&').forEach(function (part) {
      var pair = part.split('='), key = decodeURIComponent(pair.shift().replace(/\+/g, ' '));
      var value = decodeURIComponent(pair.join('=').replace(/\+/g, ' '));
      if (['url','sha256','name','version','builtin'].indexOf(key) < 0 || Object.prototype.hasOwnProperty.call(values,key) || /[\x00-\x1f\x7f]/.test(value)) throw new Error('This install link has invalid or duplicate parameters. Choose the plugin again.');
      values[key] = value;
    });
    return values;
  }
  function encode(values) {
    return Object.keys(values).map(function (key) { return key + '=' + encodeURIComponent(values[key]); }).join('&');
  }
  function render(values) {
    invalidate();
    Object.keys(values).forEach(function (key) {
      if (/[\x00-\x1f\x7f]/.test(values[key])) throw new Error('The install details contain invalid characters.');
    });
    var name = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
    if (values.builtin) {
      if (values.url || !name.test(values.builtin) || values.builtin.length > 214) throw new Error('This bundled plugin link is invalid.');
    } else {
      if (!values.url || values.url.length > 6000) throw new Error('Enter a plugin link or npm package name.');
      var parsed = document.createElement('a'); parsed.href = values.url;
      var https = /^https:\/\//i.test(values.url) && parsed.hostname && !parsed.username && !parsed.password;
      var npm = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:@[a-zA-Z0-9.^~*+_-]+)?$/.test(values.url);
      if (!https && !npm) throw new Error('Use an HTTPS plugin link or an npm package name.');
      if (values.sha256 && !/^[a-f0-9]{64}$/i.test(values.sha256)) throw new Error('The plugin digest is invalid.');
      if (values.name && (!name.test(values.name) || values.name.length > 214)) throw new Error('The plugin name is invalid.');
      if (values.version && values.version.length > 100) throw new Error('The plugin version is invalid.');
      source.value = values.url;
    }
    var query = encode(values), scheme = 'dsha://install?' + query;
    var fallback = 'https://dsha.cc/install/?' + query;
    var android = /Android/i.test(navigator.userAgent);
    page.querySelector('[data-open-app]').href = android ? 'intent://install?' + query + '#Intent;scheme=dsha;package=com.dsh.client;S.browser_fallback_url=' + encodeURIComponent(fallback) + ';end' : scheme;
    page.querySelector('[data-open-scheme]').href = scheme;
    actions.hidden = false;
    status.textContent = values.builtin ? 'Open plugin management to check the status of ' + values.builtin + '.' : 'The link is ready. Review the actual package details in DSHA and confirm install.';
    note.textContent = values.sha256 ? 'The app will check the SHA-256 digest from the catalog. The downloaded package is the source of truth.' : 'This link was provided by you or the person who shared it. Confirm the plugin source, version, and compatibility in the app.';
    share.value = fallback; sharing.hidden = false;
    try {
      // Keep QR density phone-friendly. Long sources stay fully copyable and are not truncated.
      if (fallback.length > 1200 || typeof qrcode !== 'function') throw new Error();
      var code = qrcode(0, 'M'); code.addData(fallback, 'Byte'); code.make();
      var size = code.getModuleCount(), ns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + (size + 8) + ' ' + (size + 8));
      svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Scan this QR code for the full plugin install link');
      var background = document.createElementNS(ns, 'rect');
      background.setAttribute('width', String(size + 8)); background.setAttribute('height', String(size + 8)); background.setAttribute('fill', '#fff'); svg.appendChild(background);
      var dots = document.createElementNS(ns, 'path'), path = [];
      for (var row = 0; row < size; row++) for (var col = 0; col < size; col++) if (code.isDark(row, col)) path.push('M' + (col + 4) + ',' + (row + 4) + 'h1v1h-1z');
      dots.setAttribute('d', path.join('')); dots.setAttribute('fill', '#000'); svg.appendChild(dots); qr.appendChild(svg);
      qrNote.textContent = 'Browsing on a computer? Scan with your phone, then confirm in DSHA. The QR code and the link below contain the same full install details.';
    } catch (error) {
      qrNote.textContent = 'A clear QR code cannot be generated for this link. Copy the full link below and open it on your phone.';
    }
  }
  source.addEventListener('input', function () {
    invalidate('The source changed. Generate the install entry again.');
    history.replaceState(null, '', '/install/');
  });
  page.querySelector('[data-install-form]').addEventListener('submit', function (event) {
    event.preventDefault();
    try { var url = source.value.trim(), values = original && original.url === url ? original : {url:url}; render(values); history.replaceState(null, '', '/install/?' + encode(values)); }
    catch (error) { status.textContent = error.message; }
  });
  if (location.search) try { var initial = parse(location.search); render(initial); original = initial; } catch (error) { invalidate('Could not open this install link: ' + error.message); }
})();
