/* ==========================================================================
   Mnet's World - Chat Widget
   Self-contained floating chat for visitor-to-admin messaging
   ========================================================================== */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  var POLL_INTERVAL = 3000;
  var POLL_INTERVAL_CLOSED = 15000;
  var MAX_MSG_LENGTH = 2000;
  var SESSION_KEY = 'mnet_chat_session';

  // ── State ─────────────────────────────────────────────────────────────────
  var sessionToken = null;
  var sessionId = null;
  var isOpen = false;
  var pollTimer = null;
  var lastMessageTime = null;
  var unreadCount = 0;
  var sessionStatus = 'active';

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var bubble, badge, panel, messagesEl, inputEl, sendBtn, inputArea;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso + (iso.indexOf('Z') === -1 && iso.indexOf('+') === -1 ? 'Z' : ''));
      var h = d.getHours();
      var m = d.getMinutes();
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
    } catch (e) {
      return '';
    }
  }

  async function chatApi(method, path, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    var res = await fetch('/api/chat' + path, opts);
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  }

  // ── Session Management ────────────────────────────────────────────────────

  function getStoredSession() {
    try {
      var data = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (data && data.session_token) return data;
    } catch (e) { /* ignore */ }
    return null;
  }

  function storeSession(token, id) {
    sessionToken = token;
    sessionId = id;
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      session_token: token,
      session_id: id,
    }));
  }

  async function createOrResumeSession() {
    var stored = getStoredSession();
    try {
      var data = await chatApi('POST', '/session', {
        session_token: stored ? stored.session_token : undefined,
      });
      if (data.session) {
        storeSession(data.session.session_token, data.session.id);
        sessionStatus = data.session.status;
        return data.session;
      }
    } catch (e) {
      // If resume failed, try creating fresh
      if (stored) {
        localStorage.removeItem(SESSION_KEY);
        var fresh = await chatApi('POST', '/session', {});
        if (fresh.session) {
          storeSession(fresh.session.session_token, fresh.session.id);
          sessionStatus = fresh.session.status;
          return fresh.session;
        }
      }
    }
    return null;
  }

  // ── Messaging ─────────────────────────────────────────────────────────────

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;
    if (text.length > MAX_MSG_LENGTH) text = text.slice(0, MAX_MSG_LENGTH);

    // Ensure session exists
    if (!sessionToken || !sessionId) {
      await createOrResumeSession();
      if (!sessionToken || !sessionId) return;
    }

    // Optimistic UI
    inputEl.value = '';
    inputEl.style.height = 'auto';
    var now = new Date().toISOString();
    appendMessage('visitor', text, now);

    try {
      await chatApi('POST', '/message', {
        session_token: sessionToken,
        message: text,
      });
    } catch (e) {
      appendSystemMessage('Failed to send. Please try again.');
    }
  }

  async function pollMessages() {
    if (!sessionToken) return;
    try {
      var url = '/messages?session_token=' + encodeURIComponent(sessionToken);
      if (lastMessageTime) url += '&after=' + encodeURIComponent(lastMessageTime);
      var data = await chatApi('GET', url);

      if (data.session_status) {
        sessionStatus = data.session_status;
        updateInputState();
      }

      var messages = data.messages || [];
      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        // Only render messages we haven't shown yet
        if (msg.sender_type === 'admin') {
          appendMessage('admin', msg.message, msg.created_at);
          if (!isOpen) {
            unreadCount++;
            updateBadge();
          }
        } else if (!lastMessageTime) {
          // On initial load, also show visitor messages
          appendMessage('visitor', msg.message, msg.created_at);
        }
        lastMessageTime = msg.created_at;
      }
    } catch (e) {
      // Silent fail on poll
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(pollMessages, isOpen ? POLL_INTERVAL : POLL_INTERVAL_CLOSED);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // ── UI Rendering ──────────────────────────────────────────────────────────

  function appendMessage(type, text, time) {
    var div = document.createElement('div');
    div.className = 'chat-widget__msg chat-widget__msg--' + type;
    div.innerHTML = escapeHtml(text) +
      '<span class="chat-widget__msg-time">' + formatTime(time) + '</span>';
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function appendSystemMessage(text) {
    var div = document.createElement('div');
    div.className = 'chat-widget__closed';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function updateBadge() {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  }

  function updateInputState() {
    if (sessionStatus === 'closed') {
      inputArea.style.display = 'none';
      // Check if we already have a closed notice
      if (!messagesEl.querySelector('.chat-widget__closed')) {
        appendSystemMessage('This conversation has been closed. Start a new one by refreshing the page.');
      }
    }
  }

  // ── Toggle ────────────────────────────────────────────────────────────────

  async function toggleChat() {
    isOpen = !isOpen;

    if (isOpen) {
      panel.classList.add('open');
      bubble.style.display = 'none';
      unreadCount = 0;
      updateBadge();

      if (!sessionId) {
        // Restore session + load history
        var stored = getStoredSession();
        if (stored) {
          sessionToken = stored.session_token;
          sessionId = stored.session_id;
          await loadHistory();
        }
      }

      startPolling();
      inputEl.focus();
    } else {
      panel.classList.remove('open');
      bubble.style.display = 'flex';
      startPolling(); // Switch to slow polling
    }
  }

  async function loadHistory() {
    if (!sessionToken) return;
    try {
      var data = await chatApi('GET', '/messages?session_token=' + encodeURIComponent(sessionToken));
      sessionStatus = data.session_status || 'active';
      var messages = data.messages || [];

      // Clear existing messages (keep welcome)
      var existing = messagesEl.querySelectorAll('.chat-widget__msg, .chat-widget__closed');
      for (var i = 0; i < existing.length; i++) existing[i].remove();

      for (var j = 0; j < messages.length; j++) {
        appendMessage(messages[j].sender_type, messages[j].message, messages[j].created_at);
        lastMessageTime = messages[j].created_at;
      }

      updateInputState();
    } catch (e) { /* ignore */ }
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────

  function buildWidget() {
    // Bubble
    bubble = document.createElement('button');
    bubble.className = 'chat-widget__bubble';
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>';

    badge = document.createElement('span');
    badge.className = 'chat-widget__badge';
    bubble.appendChild(badge);

    // Panel
    panel = document.createElement('div');
    panel.className = 'chat-widget__panel';
    panel.innerHTML =
      '<div class="chat-widget__header">' +
        '<div class="chat-widget__header-info">' +
          '<h3>Mnet\'s World</h3>' +
          '<p>We typically reply within minutes</p>' +
        '</div>' +
        '<button class="chat-widget__close" aria-label="Close chat">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="chat-widget__messages">' +
        '<div class="chat-widget__welcome">' +
          'Hi there! Welcome to <strong>Mnet\'s World</strong>. How can we help you today?' +
        '</div>' +
      '</div>' +
      '<div class="chat-widget__input-area">' +
        '<textarea class="chat-widget__input" placeholder="Type a message..." rows="1"></textarea>' +
        '<button class="chat-widget__send" aria-label="Send message">' +
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
        '</button>' +
      '</div>';

    messagesEl = panel.querySelector('.chat-widget__messages');
    inputEl = panel.querySelector('.chat-widget__input');
    sendBtn = panel.querySelector('.chat-widget__send');
    inputArea = panel.querySelector('.chat-widget__input-area');
    var closeBtn = panel.querySelector('.chat-widget__close');

    // Events
    bubble.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', sendMessage);

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });

    // Escape to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) toggleChat();
    });

    document.body.appendChild(panel);
    document.body.appendChild(bubble);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    // Don't load widget on admin pages
    if (window.location.pathname.indexOf('/admin') === 0) return;

    buildWidget();

    // Check for existing session + unread
    var stored = getStoredSession();
    if (stored) {
      sessionToken = stored.session_token;
      sessionId = stored.session_id;
      // Start slow polling for unread badge
      startPolling();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
