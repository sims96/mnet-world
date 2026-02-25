/* ==========================================================================
   Mnet's World - Admin Dashboard
   ========================================================================== */

(async function() {
  buildSidebar('dashboard');
  await checkAuth();

  loadStats();
  loadRecentMessages();
})();

async function loadStats() {
  try {
    var results = await Promise.allSettled([
      adminApi('GET', '/api/admin/cakes'),
      adminApi('GET', '/api/admin/blog'),
      adminApi('GET', '/api/admin/humanitarian'),
      adminApi('GET', '/api/admin/contact'),
      adminApi('GET', '/api/admin/chat/sessions'),
    ]);

    // Cakes count
    var cakesEl = document.getElementById('stat-cakes');
    if (results[0].status === 'fulfilled' && results[0].value.cakes) {
      cakesEl.textContent = results[0].value.cakes.length;
    } else {
      cakesEl.textContent = '0';
    }

    // Blog posts count
    var blogEl = document.getElementById('stat-blog');
    if (results[1].status === 'fulfilled' && results[1].value.posts) {
      blogEl.textContent = results[1].value.posts.length;
    } else {
      blogEl.textContent = '0';
    }

    // Humanitarian entries count
    var humanEl = document.getElementById('stat-humanitarian');
    if (results[2].status === 'fulfilled' && results[2].value.entries) {
      humanEl.textContent = results[2].value.entries.length;
    } else {
      humanEl.textContent = '0';
    }

    // Combined unread: contact submissions + chat unread
    var msgEl = document.getElementById('stat-messages');
    var totalUnread = 0;

    if (results[3].status === 'fulfilled' && results[3].value.submissions) {
      totalUnread += results[3].value.submissions.filter(function(s) {
        return !s.is_read;
      }).length;
    }

    if (results[4].status === 'fulfilled' && results[4].value.sessions) {
      results[4].value.sessions.forEach(function(s) {
        totalUnread += (s.unread_count || 0);
      });
    }

    msgEl.textContent = totalUnread;
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

async function loadRecentMessages() {
  var tbody = document.getElementById('recent-messages');

  try {
    var results = await Promise.allSettled([
      adminApi('GET', '/api/admin/contact'),
      adminApi('GET', '/api/admin/chat/sessions'),
    ]);

    var items = [];

    // Contact form submissions
    if (results[0].status === 'fulfilled') {
      var submissions = results[0].value.submissions || [];
      submissions.forEach(function(s) {
        items.push({
          type: 'contact',
          name: s.name,
          preview: s.subject || s.message.substring(0, 50),
          date: s.created_at,
          isRead: !!s.is_read,
        });
      });
    }

    // Chat sessions
    if (results[1].status === 'fulfilled') {
      var sessions = results[1].value.sessions || [];
      sessions.forEach(function(s) {
        items.push({
          type: 'chat',
          name: s.visitor_name,
          preview: s.last_message ? s.last_message.substring(0, 50) : 'New conversation',
          date: s.last_message_at || s.created_at,
          isRead: (s.unread_count || 0) === 0,
        });
      });
    }

    if (items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="table-empty">' +
          '<div class="empty-icon">&#128172;</div>' +
          '<p>No messages yet</p>' +
          '<small>Messages from chat and contact form will appear here.</small>' +
        '</td></tr>';
      return;
    }

    // Sort by date descending, show last 5
    items.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    var recent = items.slice(0, 5);
    tbody.innerHTML = recent.map(function(item) {
      var rowClass = item.isRead ? '' : ' class="unread"';
      var typeBadge = item.type === 'chat'
        ? '<span class="badge badge-info" style="font-size:10px;">Chat</span>'
        : '<span class="badge badge-muted" style="font-size:10px;">Form</span>';
      var statusBadge = item.isRead
        ? '<span class="badge badge-muted">Read</span>'
        : '<span class="badge badge-warning">Unread</span>';

      return '<tr' + rowClass + '>' +
        '<td>' + typeBadge + '</td>' +
        '<td>' + escapeHtml(item.name) + '</td>' +
        '<td>' + escapeHtml(item.preview) + '</td>' +
        '<td>' + formatDate(item.date) + '</td>' +
        '<td>' + statusBadge + '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="table-empty">' +
        '<p>Failed to load messages</p>' +
      '</td></tr>';
    console.error('Failed to load messages:', e);
  }
}
