/* ============================================================
   Master Ara Bot — Floating Chat Widget
   ============================================================ */
(function () {
  'use strict';

  var API_URL = 'https://portal-api.jacksonneal09888.workers.dev/api/chat';
  var messages = [];
  var isOpen = false;
  var isTyping = false;

  /* ---------- Starter prompts shown in empty state ---------- */
  var STARTERS = [
    { label: 'What programs do you offer?', text: 'What programs do you offer?' },
    { label: 'How does the belt system work?', text: 'How does the belt system work?' },
    { label: 'How do I sign into the Student Portal?', text: 'How do I sign into the Student Portal?' },
    { label: 'When are classes held?', text: 'When are classes held?' }
  ];

  /* ---------- Parse [ACTION:type:target] from bot response ---------- */
  function parseActions(text) {
    var actions = [];
    var clean = text.replace(/\[ACTION:(scroll|open):([^\]]+)\]/g, function (_, type, target) {
      actions.push({ type: type.trim(), target: target.trim() });
      return '';
    });
    return { text: clean.trim(), actions: actions };
  }

  /* ---------- Execute a navigation action ---------- */
  function runAction(type, target) {
    if (type === 'scroll') {
      var el = document.querySelector(target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeChat();
      } else {
        window.location.href = '/' + target;
      }
    } else if (type === 'open') {
      window.location.href = target;
    }
  }

  /* ---------- Sanitize text to safe HTML ---------- */
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Simple markdown-lite: **bold**, *italic*, \n→<br> */
  function renderText(str) {
    return esc(str)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  /* ---------- Build the widget DOM ---------- */
  function buildWidget() {
    /* Inject label CSS so the button accommodates the "MASTER ARA" text */
    var style = document.createElement('style');
    style.textContent =
      '#ara-chat-btn{width:auto;min-width:78px;height:auto;padding:10px 14px 9px;border-radius:40px;flex-direction:column;gap:4px;}' +
      '#ara-chat-btn .ara-chat-btn__icon svg{width:40px;height:40px;}' +
      '#ara-chat-btn .ara-chat-btn__label{font-size:8.5px;font-weight:800;letter-spacing:1.2px;line-height:1;font-family:system-ui,sans-serif;text-transform:uppercase;opacity:.95;}' +
      '#ara-chat-btn.is-open .ara-chat-btn__label{display:none;}' +
      '#ara-chat-btn.is-open{padding:14px;min-width:unset;border-radius:50%;}';
    document.head.appendChild(style);

    var wrapper = document.createElement('div');
    wrapper.id = 'ara-chat-widget';
    wrapper.setAttribute('aria-label', 'Master Ara Chat Bot');

    wrapper.innerHTML =
      /* Floating trigger button */
      '<button id="ara-chat-btn" aria-expanded="false" aria-controls="ara-chat-panel" title="Chat with Master Ara Bot">' +
        '<span class="ara-chat-btn__icon" aria-hidden="true">' +
          /* Master Ara — chibi sensei with black belt */
          '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
            /* Head — large chibi proportions */
            '<circle cx="14" cy="5" r="4" stroke="none"/>' +
            /* Upper torso */
            '<line x1="14" y1="9" x2="14" y2="13" stroke-width="2.5" fill="none"/>' +
            /* Dobok V-collar */
            '<path d="M12.5 9.5 L14 11.5 L15.5 9.5" stroke-width="1" fill="none"/>' +
            /* === BLACK BELT — explicit dark color so it reads as black === */
            /* Belt band across waist */
            '<rect x="10" y="12.5" width="8" height="3" rx="0.5" fill="#111" stroke="none"/>' +
            /* Belt knot (center rectangle, white outline to show the tie) */
            '<rect x="12.5" y="11.8" width="3" height="4.4" rx="0.5" fill="#111" stroke="white" stroke-width="0.7"/>' +
            /* === END BELT === */
            /* Lower hips below belt */
            '<line x1="14" y1="15.5" x2="13.5" y2="17.5" stroke-width="2.5" fill="none"/>' +
            /* Commanding arm extended forward (teaching gesture) */
            '<line x1="14" y1="11.5" x2="3" y2="10.5" stroke-width="2" fill="none"/>' +
            /* Other arm chambered at side */
            '<line x1="14" y1="11.5" x2="19.5" y2="13" stroke-width="2" fill="none"/>' +
            /* Wide power stance — left leg */
            '<line x1="13.5" y1="17.5" x2="10" y2="23" stroke-width="2.5" fill="none"/>' +
            /* Wide power stance — right leg */
            '<line x1="13.5" y1="17.5" x2="17.5" y2="23" stroke-width="2.5" fill="none"/>' +
          '</svg>' +
        '</span>' +
        '<span class="ara-chat-btn__label" aria-hidden="true">MASTER ARA</span>' +
        '<span class="ara-chat-btn__close" aria-hidden="true">✕</span>' +
      '</button>' +

      /* Chat panel */
      '<div id="ara-chat-panel" role="dialog" aria-modal="false" aria-label="Master Ara Chat" hidden>' +
        '<div class="ara-chat__header">' +
          '<div class="ara-chat__avatar" aria-hidden="true">A</div>' +
          '<div>' +
            '<p class="ara-chat__name">Master Ara Bot</p>' +
            '<p class="ara-chat__status">AI Guide · Ara\'s Martial Arts</p>' +
          '</div>' +
          '<button class="ara-chat__close-btn" id="ara-chat-close" aria-label="Close chat">✕</button>' +
        '</div>' +
        '<div class="ara-chat__messages" id="ara-chat-messages" role="log" aria-live="polite" aria-label="Chat messages">' +
          '<div class="ara-chat__empty" id="ara-chat-empty">' +
            '<p class="ara-chat__empty-title">How can I help?</p>' +
            '<p class="ara-chat__empty-sub">Ask about programs, belts, schedule, or student portal.</p>' +
            '<div class="ara-chat__starters" id="ara-chat-starters"></div>' +
          '</div>' +
        '</div>' +
        '<form class="ara-chat__form" id="ara-chat-form" autocomplete="off">' +
          '<input class="ara-chat__input" id="ara-chat-input" type="text" placeholder="Ask anything…" maxlength="400" aria-label="Message">' +
          '<button class="ara-chat__send" type="submit" aria-label="Send">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="22" y1="2" x2="11" y2="13"/>' +
              '<polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
            '</svg>' +
          '</button>' +
        '</form>' +
      '</div>';

    document.body.appendChild(wrapper);

    /* Populate quick-start chips */
    var startersEl = document.getElementById('ara-chat-starters');
    STARTERS.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ara-chat__starter-btn';
      btn.textContent = s.label;
      btn.addEventListener('click', function () { sendMessage(s.text); });
      startersEl.appendChild(btn);
    });

    /* Wire events */
    document.getElementById('ara-chat-btn').addEventListener('click', toggleChat);
    document.getElementById('ara-chat-close').addEventListener('click', closeChat);
    document.getElementById('ara-chat-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('ara-chat-input');
      var text = (input.value || '').trim();
      if (text) {
        input.value = '';
        sendMessage(text);
      }
    });
  }

  /* ---------- Toggle / open / close ---------- */
  function toggleChat() {
    if (isOpen) closeChat(); else openChat();
  }

  function openChat() {
    isOpen = true;
    var panel = document.getElementById('ara-chat-panel');
    var btn = document.getElementById('ara-chat-btn');
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    setTimeout(function () {
      document.getElementById('ara-chat-input').focus();
    }, 60);
  }

  function closeChat() {
    isOpen = false;
    var panel = document.getElementById('ara-chat-panel');
    var btn = document.getElementById('ara-chat-btn');
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('is-open');
  }

  /* ---------- Message rendering ---------- */
  function appendMessage(role, text, actions) {
    var messagesEl = document.getElementById('ara-chat-messages');

    /* Hide empty state on first message */
    var emptyEl = document.getElementById('ara-chat-empty');
    if (emptyEl) emptyEl.remove();

    var bubble = document.createElement('div');
    bubble.className = 'ara-chat__bubble ara-chat__bubble--' + role;

    var content = document.createElement('div');
    content.className = 'ara-chat__bubble-text';
    content.innerHTML = renderText(text);
    bubble.appendChild(content);

    if (actions && actions.length) {
      var chips = document.createElement('div');
      chips.className = 'ara-chat__action-chips';
      actions.forEach(function (a) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ara-chat__chip';
        chip.textContent = labelForAction(a);
        chip.addEventListener('click', function () { runAction(a.type, a.target); });
        chips.appendChild(chip);
      });
      bubble.appendChild(chips);
    }

    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function labelForAction(a) {
    if (a.type === 'open') return 'Open ' + a.target.replace(/\.html$/, '').replace(/-/g, ' ');
    var map = {
      '#programs': 'View Programs',
      '#instructors': 'Meet the Instructors',
      '#belt-journey': 'Belt Journey',
      '#schedule': 'Class Schedule',
      '#contact': 'Contact Us',
      '#parents-group': 'Parents Group',
      '#faq': 'Read FAQ'
    };
    return map[a.target] || ('Go to ' + a.target.replace('#', '').replace(/-/g, ' '));
  }

  function showTypingIndicator() {
    var messagesEl = document.getElementById('ara-chat-messages');
    var emptyEl = document.getElementById('ara-chat-empty');
    if (emptyEl) emptyEl.remove();

    var indicator = document.createElement('div');
    indicator.className = 'ara-chat__bubble ara-chat__bubble--bot ara-chat__typing';
    indicator.id = 'ara-typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(indicator);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTypingIndicator() {
    var el = document.getElementById('ara-typing-indicator');
    if (el) el.remove();
  }

  /* ---------- API call ---------- */
  function sendMessage(text) {
    if (isTyping) return;

    if (!isOpen) openChat();
    appendMessage('user', text, null);
    messages.push({ role: 'user', content: text });

    isTyping = true;
    showTypingIndicator();

    var payload = { messages: messages.slice(-20) };

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        removeTypingIndicator();
        isTyping = false;
        var raw = data.content || 'I\'m sorry, I didn\'t catch that. Try again or call (919) 799-7500.';
        var parsed = parseActions(raw);
        messages.push({ role: 'assistant', content: raw });
        appendMessage('bot', parsed.text, parsed.actions);
      })
      .catch(function () {
        removeTypingIndicator();
        isTyping = false;
        appendMessage('bot', 'I\'m having trouble connecting right now. Please call or text us at (919) 799-7500 — we\'re happy to help!', null);
      });
  }

  /* ---------- Init ---------- */
  function init() {
    if (document.getElementById('ara-chat-widget')) return;
    buildWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
