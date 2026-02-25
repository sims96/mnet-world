/* ==========================================================================
   Mnet's World - Admin Messages Panel
   Manage live chat sessions and contact form submissions
   ========================================================================== */

(async function () {
  buildSidebar('chat');
  await checkAuth();

  // ── Tab switching ───────────────────────────────────────────────────────
  var tabs = document.querySelectorAll('.chat-admin__tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = this.getAttribute('data-tab');
      tabs.forEach(function (t) { t.classList.remove('active'); });
      this.classList.add('active');
      document.querySelectorAll('.chat-admin__tab-content').forEach(function (c) {
        c.classList.remove('active');
      });
      document.getElementById('tab-' + target).classList.add('active');

      if (target === 'contact') {
        loadContactSubmissions();
      }
    });
  });

  // ── Live Chat ───────────────────────────────────────────────────────────
  loadSessions();
  startSessionPolling();

  document.getElementById('btn-send-reply').addEventListener('click', sendReply);
  document.getElementById('btn-close-session').addEventListener('click', closeSession);
  document.getElementById('btn-back').addEventListener('click', goBack);

  document.getElementById('reply-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  });
})();

// ── State ────────────────────────────────────────────────────────────────────

var currentSessionId = null;
var sessionPollTimer = null;
var messagePollTimer = null;

// ==========================================================================
//  LIVE CHAT TAB
// ==========================================================================

// ── Session List ─────────────────────────────────────────────────────────────

async function loadSessions() {
  try {
    var data = await adminApi('GET', '/api/admin/chat/sessions');
    var sessions = data.sessions || [];
    renderSessionList(sessions);
  } catch (e) {
    console.error('Failed to load sessions:', e);
  }
}

function renderSessionList(sessions) {
  var container = document.getElementById('sessions-list');
  var countBadge = document.getElementById('active-count');

  if (sessions.length === 0) {
    container.innerHTML =
      '<div class="chat-admin__sessions-empty">' +
        '<div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.3;">&#128172;</div>' +
        '<p>No conversations yet</p>' +
        '<small>When visitors start chatting, their messages will appear here.</small>' +
      '</div>';
    countBadge.style.display = 'none';
    return;
  }

  var activeCount = sessions.filter(function (s) { return s.status === 'active'; }).length;
  if (activeCount > 0) {
    countBadge.textContent = activeCount + ' active';
    countBadge.style.display = 'inline-block';
  } else {
    countBadge.style.display = 'none';
  }

  container.innerHTML = sessions.map(function (s) {
    var isSelected = s.id === currentSessionId ? ' selected' : '';
    var isClosed = s.status === 'closed' ? ' closed' : '';
    var unreadHtml = (s.unread_count > 0)
      ? '<span class="chat-admin__session-badge">' + s.unread_count + '</span>'
      : '';
    var preview = s.last_message
      ? escapeHtml(s.last_message).substring(0, 50)
      : '<em>No messages</em>';
    var timeAgo = formatRelativeTime(s.last_message_at);

    return '<div class="chat-admin__session-item' + isSelected + isClosed + '" onclick="selectSession(' + s.id + ')">' +
      '<div class="chat-admin__session-top">' +
        '<span class="chat-admin__session-name">' + escapeHtml(s.visitor_name) + '</span>' +
        '<span class="chat-admin__session-time">' + timeAgo + '</span>' +
      '</div>' +
      '<div class="chat-admin__session-bottom">' +
        '<span class="chat-admin__session-preview">' + preview + '</span>' +
        unreadHtml +
      '</div>' +
    '</div>';
  }).join('');
}

// ── Select Session ───────────────────────────────────────────────────────────

async function selectSession(id) {
  currentSessionId = id;

  document.getElementById('no-session').style.display = 'none';
  document.getElementById('active-conversation').style.display = 'flex';
  document.querySelector('.chat-admin').classList.add('conv-active');

  var items = document.querySelectorAll('.chat-admin__session-item');
  items.forEach(function (item) { item.classList.remove('selected'); });

  await loadMessages(id);
  markAsRead(id);
  startMessagePolling();
}

// ── Messages ─────────────────────────────────────────────────────────────────

async function loadMessages(sessionId) {
  try {
    var data = await adminApi('GET', '/api/admin/chat/sessions/' + sessionId + '/messages');
    var session = data.session;
    var messages = data.messages || [];

    document.getElementById('conv-visitor-name').textContent = session.visitor_name;
    var statusBadge = document.getElementById('conv-status');
    if (session.status === 'active') {
      statusBadge.className = 'badge badge-success';
      statusBadge.textContent = 'Active';
      document.getElementById('conv-input').style.display = 'flex';
      document.getElementById('btn-close-session').style.display = 'inline-block';
    } else {
      statusBadge.className = 'badge badge-muted';
      statusBadge.textContent = 'Closed';
      document.getElementById('conv-input').style.display = 'none';
      document.getElementById('btn-close-session').style.display = 'none';
    }

    var container = document.getElementById('conv-messages');
    container.innerHTML = messages.map(function (msg) {
      var cls = msg.sender_type === 'admin' ? 'chat-admin__msg--admin' : 'chat-admin__msg--visitor';
      return '<div class="chat-admin__msg ' + cls + '">' +
        escapeHtml(msg.message) +
        '<span class="chat-admin__msg-time">' + formatDateTime(msg.created_at) + '</span>' +
      '</div>';
    }).join('');

    container.scrollTop = container.scrollHeight;
  } catch (e) {
    console.error('Failed to load messages:', e);
  }
}

async function sendReply() {
  var input = document.getElementById('reply-input');
  var text = input.value.trim();
  if (!text || !currentSessionId) return;

  input.value = '';
  input.style.height = 'auto';

  var container = document.getElementById('conv-messages');
  var div = document.createElement('div');
  div.className = 'chat-admin__msg chat-admin__msg--admin';
  div.innerHTML = escapeHtml(text) +
    '<span class="chat-admin__msg-time">Just now</span>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  try {
    await adminApi('POST', '/api/admin/chat/sessions/' + currentSessionId + '/message', {
      message: text,
    });
    loadSessions();
  } catch (e) {
    showToast('Failed to send reply', 'error');
  }
}

async function markAsRead(sessionId) {
  try {
    await adminApi('PUT', '/api/admin/chat/sessions/' + sessionId + '/read');
    loadSessions();
  } catch (e) { /* silent */ }
}

async function closeSession() {
  if (!currentSessionId) return;
  if (!confirm('Close this conversation? The visitor won\'t be able to send more messages in this session.')) return;

  try {
    await adminApi('PUT', '/api/admin/chat/sessions/' + currentSessionId + '/close');
    showToast('Conversation closed', 'success');
    loadMessages(currentSessionId);
    loadSessions();
  } catch (e) {
    showToast('Failed to close conversation', 'error');
  }
}

function goBack() {
  currentSessionId = null;
  document.querySelector('.chat-admin').classList.remove('conv-active');
  document.getElementById('active-conversation').style.display = 'none';
  document.getElementById('no-session').style.display = 'flex';
  stopMessagePolling();
}

// ── Polling ──────────────────────────────────────────────────────────────────

function startSessionPolling() {
  if (sessionPollTimer) clearInterval(sessionPollTimer);
  sessionPollTimer = setInterval(loadSessions, 3000);
}

function startMessagePolling() {
  stopMessagePolling();
  messagePollTimer = setInterval(function () {
    if (currentSessionId) loadMessages(currentSessionId);
  }, 3000);
}

function stopMessagePolling() {
  if (messagePollTimer) {
    clearInterval(messagePollTimer);
    messagePollTimer = null;
  }
}

// ==========================================================================
//  CONTACT FORM TAB
// ==========================================================================

async function loadContactSubmissions() {
  var tbody = document.getElementById('contact-table');
  var countBadge = document.getElementById('contact-unread-count');

  try {
    var data = await adminApi('GET', '/api/admin/contact');
    var submissions = data.submissions || [];

    // Update unread count badge
    var unread = submissions.filter(function (s) { return !s.is_read; }).length;
    if (unread > 0) {
      countBadge.textContent = unread + ' unread';
      countBadge.style.display = 'inline-block';
    } else {
      countBadge.style.display = 'none';
    }

    if (submissions.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="table-empty">' +
          '<div class="empty-icon">&#128233;</div>' +
          '<p>No contact submissions yet</p>' +
          '<small>Messages from your contact form will appear here.</small>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = submissions.map(function (s) {
      var rowClass = s.is_read ? '' : ' class="unread"';
      var dot = s.is_read
        ? '<span style="width:8px;height:8px;border-radius:50%;background:#D1D5DB;display:inline-block;"></span>'
        : '<span style="width:8px;height:8px;border-radius:50%;background:var(--color-pink-500);display:inline-block;" title="Unread"></span>';
      var preview = s.message.length > 60 ? escapeHtml(s.message.substring(0, 60)) + '...' : escapeHtml(s.message);

      return '<tr' + rowClass + '>' +
        '<td>' + dot + '</td>' +
        '<td>' + escapeHtml(s.name) + '</td>' +
        '<td>' + escapeHtml(s.email) + '</td>' +
        '<td>' + escapeHtml(s.subject || '(No subject)') + '</td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + preview + '</td>' +
        '<td>' + formatDate(s.created_at) + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline" onclick="viewContact(' + s.id + ')" style="margin-right:4px;">View</button>' +
          '<button class="btn btn-sm btn-danger" onclick="deleteContact(' + s.id + ', \'' + escapeHtml(s.name).replace(/'/g, "\\'") + '\')">Delete</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="table-empty">' +
        '<p>Failed to load submissions</p>' +
      '</td></tr>';
    console.error('Failed to load contact submissions:', e);
  }
}

async function viewContact(id) {
  try {
    var data = await adminApi('GET', '/api/admin/contact');
    var submission = (data.submissions || []).find(function (s) { return s.id === id; });
    if (!submission) {
      showToast('Submission not found', 'error');
      return;
    }

    document.getElementById('modal-subject').textContent = submission.subject || '(No subject)';
    document.getElementById('modal-name').textContent = submission.name;
    document.getElementById('modal-email').textContent = submission.email;
    document.getElementById('modal-date').textContent = formatDateTime(submission.created_at);
    document.getElementById('modal-message').textContent = submission.message;
    document.getElementById('modal-reply').href = 'mailto:' + encodeURIComponent(submission.email) +
      '?subject=Re: ' + encodeURIComponent(submission.subject || 'Your message to Mnet\'s World');

    document.getElementById('contact-modal').classList.add('active');

    // Mark as read if unread
    if (!submission.is_read) {
      await adminApi('PUT', '/api/admin/contact/' + id + '/read');
      loadContactSubmissions();
    }
  } catch (e) {
    showToast('Failed to load submission', 'error');
  }
}

function closeContactModal() {
  document.getElementById('contact-modal').classList.remove('active');
}

async function deleteContact(id, name) {
  var confirmed = await confirmDelete(name + '\'s message');
  if (!confirmed) return;

  try {
    await adminApi('DELETE', '/api/admin/contact/' + id);
    showToast('Submission deleted', 'success');
    loadContactSubmissions();
  } catch (e) {
    showToast('Failed to delete submission', 'error');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso + (iso.indexOf('Z') === -1 && iso.indexOf('+') === -1 ? 'Z' : ''));
    var now = new Date();
    var diffMs = now - d;
    var diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return diffMin + 'm ago';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return formatDate(iso);
  } catch (e) {
    return '';
  }
}
