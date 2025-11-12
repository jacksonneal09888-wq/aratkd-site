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
};
