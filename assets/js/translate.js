function hideGoogleBanner() {
  document.body.style.top = '0px';
  const frame = document.querySelector('iframe.goog-te-banner-frame');
  if (frame) {
    frame.style.display = 'none';
    const parent = frame.parentElement;
    if (parent) {
      parent.style.display = 'none';
    }
  }
  const tooltip = document.getElementById('goog-gt-tt');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

function observeTranslateArtifacts() {
  hideGoogleBanner();
  const observer = new MutationObserver(hideGoogleBanner);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', hideGoogleBanner);
  document.addEventListener('click', hideGoogleBanner);
}

window.initAraTranslate = function () {
  if (typeof google === 'undefined' || !google.translate) {
    return;
  }
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
};
