/* ==========================================================================
   Mnet's World - Contact Messages Management
   ========================================================================== */

(async function() {
  buildSidebar('messages');
  await checkAuth();
  loadMessages();
})();

async function loadMessages() {
  var tbody = document.getElementById('messages-table');
  var unreadBadge = document.getElementById('unread-count');

  try {
    var data = await adminApi('GET', '/api/admin/contact');
    var submissions = data.submissions || [];

    // Count unread
    var unreadCount = submissions.filter(function(s) { return !s.is_read; }).length;
    if (unreadCount > 0) {
      unreadBadge.textContent = unreadCount + ' unread';
      unreadBadge.style.display = 'inline-flex';
    } else {
      unreadBadge.style.display = 'none';
    }

    if (submissions.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="table-empty">' +
          '<div class="empty-icon">&#128233;</div>' +
          '<p>No messages yet</p>' +
          '<small>Contact form submissions will appear here.</small>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = submissions.map(function(msg) {
      var rowClass = msg.is_read ? '' : 'unread';
      var dot = msg.is_read ? '' : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--color-pink-500);"></span>';

      var readBtn = msg.is_read
        ? ''
        : '<button class="btn btn-sm btn-outline" onclick="markAsRead(' + msg.id + ')" title="Mark as read">&#10003; Read</button>';

      return '<tr class="message-row ' + rowClass + '">' +
        '<td>' + dot + '</td>' +
        '<td>' + escapeHtml(msg.name) + '</td>' +
        '<td><a href="mailto:' + escapeHtml(msg.email) + '" style="color: var(--color-pink-500);">' + escapeHtml(msg.email) + '</a></td>' +
        '<td>' + escapeHtml(msg.subject || '(No subject)') + '</td>' +
        '<td><span class="message-preview">' + escapeHtml(msg.message) + '</span></td>' +
        '<td>' + formatDateTime(msg.created_at) + '</td>' +
        '<td>' +
          '<div class="action-btns">' +
            '<button class="btn btn-sm btn-outline" onclick=\'viewMessage(' + JSON.stringify({
              id: msg.id,
              name: msg.name,
              email: msg.email,
              subject: msg.subject || '(No subject)',
              message: msg.message,
              created_at: msg.created_at,
              is_read: msg.is_read
            }).replace(/'/g, '&#39;') + ')\' title="View">&#128065; View</button>' +
            readBtn +
            '<button class="btn btn-sm btn-danger" onclick="deleteMessage(' + msg.id + ', \'' + escapeHtml(msg.name).replace(/'/g, "\\'") + '\')" title="Delete">&#128465;</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="table-empty">' +
        '<p>Failed to load messages</p>' +
        '<small>' + escapeHtml(e.message) + '</small>' +
      '</td></tr>';
    console.error('Failed to load messages:', e);
  }
}

function viewMessage(msg) {
  document.getElementById('modal-subject').textContent = msg.subject;
  document.getElementById('modal-name').textContent = msg.name;
  document.getElementById('modal-email').textContent = msg.email;
  document.getElementById('modal-date').textContent = formatDateTime(msg.created_at);
  document.getElementById('modal-message').textContent = msg.message;
  document.getElementById('modal-reply').href = 'mailto:' + encodeURIComponent(msg.email) + '?subject=Re: ' + encodeURIComponent(msg.subject);

  document.getElementById('message-modal').classList.add('active');

  // Mark as read
  if (!msg.is_read) {
    markAsRead(msg.id);
  }
}

function closeMessageModal() {
  document.getElementById('message-modal').classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  var modal = document.getElementById('message-modal');
  if (e.target === modal) {
    closeMessageModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeMessageModal();
  }
});

async function markAsRead(id) {
  try {
    await adminApi('PUT', '/api/admin/contact/' + id + '/read');
    loadMessages();
  } catch (e) {
    showToast('Failed to update: ' + e.message, 'error');
  }
}

async function deleteMessage(id, name) {
  var confirmed = await confirmDelete('message from ' + name);
  if (!confirmed) return;

  try {
    await adminApi('DELETE', '/api/admin/contact/' + id);
    showToast('Message deleted successfully.', 'success');
    loadMessages();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}
