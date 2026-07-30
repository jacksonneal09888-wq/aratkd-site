(function injectTranslateHideStyles() {
  const style = document.createElement('style');
  style.textContent =
    '.goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame, ' +
    '.goog-tooltip, .goog-tooltip-content, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, ' +
    '.VIpgJd-ZVi9od-aZ2wEe-OiiCO, .skiptranslate > iframe, ' +
    '.goog-te-menu-frame { display: none !important; visibility: hidden !important; }' +
    'body { top: 0 !important; position: static !important; }' +
    '.goog-te-spinner-pos { display: none !important; }';
  document.head.appendChild(style);
})();

function hideGoogleBanner() {
  document.body.style.top = '0px';
  document.body.style.removeProperty('padding-top');
  const frames = document.querySelectorAll('iframe.goog-te-banner-frame, iframe[src*="translate.google"]');
  frames.forEach(function(f) {
    f.style.setProperty('display', 'none', 'important');
    if (f.parentElement) f.parentElement.style.setProperty('display', 'none', 'important');
  });
  const tt = document.getElementById('goog-gt-tt');
  if (tt) tt.style.setProperty('display', 'none', 'important');
  const spinner = document.querySelector('.goog-te-spinner-pos');
  if (spinner) spinner.style.setProperty('display', 'none', 'important');
}

function observeTranslateArtifacts() {
  hideGoogleBanner();
  const observer = new MutationObserver(hideGoogleBanner);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  window.addEventListener('resize', hideGoogleBanner);
  document.addEventListener('click', hideGoogleBanner);
}

function switchLanguage(lang) {
  if (lang === 'en') {
    const exp = new Date(0).toUTCString();
    document.cookie = 'googtrans=; path=/; expires=' + exp;
    document.cookie = 'googtrans=; path=/; domain=.' + location.hostname + '; expires=' + exp;
    window.location.reload();
    return;
  }
  const sel = document.querySelector('.goog-te-combo');
  if (sel) {
    sel.value = lang;
    const evt = document.createEvent('HTMLEvents');
    evt.initEvent('change', false, true);
    sel.dispatchEvent(evt);
    setTimeout(hideGoogleBanner, 400);
    setTimeout(hideGoogleBanner, 1200);
  }
}

function initLangToggle() {
  const buttons = document.querySelectorAll('.lang-toggle__btn');
  if (!buttons.length) return;

  const cookie = document.cookie.split(';').find(function(c) { return c.trim().startsWith('googtrans='); }) || '';
  if (cookie.includes('/es')) {
    buttons.forEach(function(btn) {
      const isEs = btn.dataset.lang === 'es';
      btn.classList.toggle('is-active', isEs);
      btn.setAttribute('aria-pressed', isEs ? 'true' : 'false');
    });
  }

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      buttons.forEach(function(b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      switchLanguage(btn.dataset.lang);
    });
  });
}

window.initAraTranslate = function () {
  if (typeof google === 'undefined' || !google.translate) return;
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      includedLanguages: 'en,es',
      layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL,
      autoDisplay: false
    },
    'google_translate_element'
  );
  observeTranslateArtifacts();
  setTimeout(initLangToggle, 900);
  setTimeout(hideGoogleBanner, 300);
  setTimeout(hideGoogleBanner, 800);
  setTimeout(hideGoogleBanner, 2000);
};
