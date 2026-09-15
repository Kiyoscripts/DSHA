export function installLink(entry) {
  const params = entry.kind === 'builtin' ? {builtin:entry.packageName} : {
    url:entry.installSource || entry.download.url, sha256:entry.download.sha256, name:entry.packageName, version:entry.version
  };
  return '/install/?' + new URLSearchParams(params).toString();
}

export const installPage = `<div class="prose"><header class="page-head"><p class="eyebrow">INSTALL WITH DSHA</p><h1>Confirm and install the plugin on your phone.</h1><p class="lede">DSHA reads the actual plugin package and shows the name, author, version, and compatibility range. After you confirm, it prepares dependencies. Restart Web when it finishes.</p></header>
<section class="panel" data-install-page><h2>Continue in DSHA</h2><p data-install-status role="status">Paste a plugin link, then choose Open in DSHA. This needs DSHA rc1.3 or later.</p>
<form data-install-form class="js-only"><label for="plugin-source">Plugin link or npm package name</label><input id="plugin-source" name="url" type="text" maxlength="6000" autocomplete="off" placeholder="https://github.com/author/plugin or @author/plugin" required>
<div class="actions"><button class="button primary" type="submit">Create install entry</button></div></form>
<div class="actions" data-install-actions hidden><a class="button primary" data-open-app>Open in DSHA</a><a class="button" data-open-scheme>Fallback launch</a></div>
<div class="install-sharing" data-install-sharing hidden><p class="small-text muted" data-install-qr-note></p><div class="install-qr" data-install-qr></div><label for="install-share-url">Full install link</label><div class="copy-row"><input id="install-share-url" readonly><button class="button" type="button" data-copy-target="install-share-url">Copy to phone</button></div></div>
<p class="small-text muted" data-install-note></p><noscript><p>Enable JavaScript to generate the launch link, or paste the plugin link into the app marketplace.</p></noscript></section>
<section class="panel"><h2>DSHA is not installed yet?</h2><p>Download the APK that matches your phone, finish first-run setup, then return here to open the plugin. If the browser does not launch the app, tap Fallback launch or paste the original link in the app.</p><div class="actions"><a class="button primary" href="/download/">Download DSHA</a><a class="button" href="/guide/#plugin">Install guide</a></div></section></div>`;
