function hideGoogleBanner() {
  document.body.style.top = '0px';
  const frame = document.querySelector('iframe.goog-te-banner-frame');
  if (frame) {
    frame.style.display = 'none';
    const parent = frame.parentElement;
    if (parent) parent.style.display = 'none';
  }
  const tooltip = document.getElementById('goog-gt-tt');
  if (tooltip) tooltip.style.display = 'none';
}

function observeTranslateArtifacts() {
  hideGoogleBanner();
  const observer = new MutationObserver(hideGoogleBanner);
  observer.observe(document.body, { childList: true, subtree: true });
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
  }
}

function initLangToggle() {
  const buttons = document.querySelectorAll('.lang-toggle__btn');
  if (!buttons.length) return;

  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('googtrans=')) || '';
  if (cookie.includes('/es')) {
    buttons.forEach(btn => {
      const isEs = btn.dataset.lang === 'es';
      btn.classList.toggle('is-active', isEs);
      btn.setAttribute('aria-pressed', isEs ? 'true' : 'false');
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
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
};
