/* ---- ARA UI helpers: Toast + Confirm/Prompt modals ---- */

// ---------- Toast ----------
(function () {
  var container = null;
  var ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'ara-toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }
    return container;
  }

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function dismiss(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('is-out');
    setTimeout(function () { toast.parentNode && toast.parentNode.removeChild(toast); }, 230);
  }

  window.araToast = function (message, type, duration) {
    type = type || 'info';
    if (duration === undefined) duration = 4200;
    var c = getContainer();
    var toast = document.createElement('div');
    toast.className = 'ara-toast ara-toast--' + type;
    toast.setAttribute('role', 'status');
    toast.innerHTML =
      '<span class="ara-toast__icon" aria-hidden="true">' + (ICONS[type] || ICONS.info) + '</span>' +
      '<span class="ara-toast__body">' + esc(message) + '</span>' +
      '<button class="ara-toast__close" aria-label="Dismiss" type="button">✕</button>';
    toast.querySelector('.ara-toast__close').addEventListener('click', function () { dismiss(toast); });
    c.appendChild(toast);
    if (duration > 0) setTimeout(function () { dismiss(toast); }, duration);
    return toast;
  };
})();

// ---------- Confirm / Prompt modals ----------
(function () {
  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function buildModal(opts) {
    var bd = document.createElement('div');
    bd.className = 'ara-confirm-backdrop';
    bd.setAttribute('role', 'dialog');
    bd.setAttribute('aria-modal', 'true');
    bd.setAttribute('aria-labelledby', 'ara-confirm-title');

    var dialog = document.createElement('div');
    dialog.className = 'ara-confirm-dialog';

    var html = '';
    if (opts.icon) html += '<span class="ara-confirm-icon" aria-hidden="true">' + opts.icon + '</span>';
    html += '<h3 class="ara-confirm-title" id="ara-confirm-title">' + esc(opts.title || 'Confirm') + '</h3>';
    if (opts.body) html += '<p class="ara-confirm-body">' + esc(opts.body) + '</p>';
    if (opts.hasInput) {
      html += '<input class="ara-confirm-input" type="text" placeholder="' + esc(opts.inputPlaceholder || '') + '" value="' + esc(opts.inputDefault || '') + '" aria-label="' + esc(opts.title || 'Input') + '">';
    }
    html += '<div class="ara-confirm-actions">';
    html += '<button class="btn-ghost" data-ara-action="cancel" type="button">' + esc(opts.cancelLabel || 'Cancel') + '</button>';
    var confirmClass = opts.danger ? 'btn-danger' : 'btn-primary';
    html += '<button class="' + confirmClass + '" data-ara-action="confirm" type="button">' + esc(opts.confirmLabel || 'Confirm') + '</button>';
    html += '</div>';

    dialog.innerHTML = html;
    bd.appendChild(dialog);
    document.body.appendChild(bd);

    setTimeout(function () {
      var input = dialog.querySelector('.ara-confirm-input');
      if (input) { input.focus(); input.select(); }
      else {
        var btn = dialog.querySelector('[data-ara-action="confirm"]');
        if (btn) btn.focus();
      }
    }, 40);

    return { backdrop: bd, dialog: dialog };
  }

  window.araConfirm = function (opts) {
    return new Promise(function (resolve) {
      var m = buildModal(opts || {});

      function close(result) {
        if (m.backdrop.parentNode) m.backdrop.parentNode.removeChild(m.backdrop);
        resolve(result);
      }

      m.backdrop.addEventListener('click', function (e) { if (e.target === m.backdrop) close(false); });
      m.dialog.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-ara-action]');
        if (btn) close(btn.dataset.araAction === 'confirm');
      });
      m.backdrop.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(false); });
    });
  };

  window.araPrompt = function (opts) {
    var mergedOpts = Object.assign({ hasInput: true }, opts || {});
    return new Promise(function (resolve) {
      var m = buildModal(mergedOpts);
      var input = m.dialog.querySelector('.ara-confirm-input');

      function close(value) {
        if (m.backdrop.parentNode) m.backdrop.parentNode.removeChild(m.backdrop);
        resolve(value);
      }

      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') close(input.value);
        });
      }

      m.backdrop.addEventListener('click', function (e) { if (e.target === m.backdrop) close(null); });
      m.dialog.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-ara-action]');
        if (!btn) return;
        if (btn.dataset.araAction === 'confirm') close(input ? input.value : '');
        else close(null);
      });
      m.backdrop.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(null); });
    });
  };
})();

// ---------- Belt pill colour helper ----------
window.araBeltPillClass = (function () {
  var map = [
    ['black',  'belt-pill--black'],
    ['red',    'belt-pill--red'],
    ['brown',  'belt-pill--brown'],
    ['blue',   'belt-pill--blue'],
    ['purple', 'belt-pill--purple'],
    ['green',  'belt-pill--green'],
    ['orange', 'belt-pill--orange'],
    ['yellow', 'belt-pill--yellow'],
    ['white',  'belt-pill--white']
  ];
  return function (beltName) {
    if (!beltName) return '';
    var lower = beltName.toLowerCase();
    for (var i = 0; i < map.length; i++) {
      if (lower.includes(map[i][0])) return map[i][1];
    }
    return '';
  };
})();
