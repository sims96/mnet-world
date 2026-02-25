/* ==========================================================================
   Mnet's World - Admin Dashboard
   ========================================================================== */

(async function() {
  // Build sidebar and check auth
  buildSidebar('dashboard');
  await checkAuth();

  // Fetch all stats in parallel
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

    // Unread messages count
    var msgEl = document.getElementById('stat-messages');
    if (results[3].status === 'fulfilled' && results[3].value.submissions) {
      var unread = results[3].value.submissions.filter(function(s) {
        return !s.is_read;
      }).length;
      msgEl.textContent = unread;
    } else {
      msgEl.textContent = '0';
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

async function loadRecentMessages() {
  var tbody = document.getElementById('recent-messages');

  try {
    var data = await adminApi('GET', '/api/admin/contact');
    var submissions = data.submissions || [];

    if (submissions.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="table-empty">' +
          '<div class="empty-icon">&#128233;</div>' +
          '<p>No messages yet</p>' +
          '<small>Messages from your contact form will appear here.</small>' +
        '</td></tr>';
      return;
    }

    // Show last 5
    var recent = submissions.slice(0, 5);
    tbody.innerHTML = recent.map(function(msg) {
      var rowClass = msg.is_read ? '' : 'unread';
      var badge = msg.is_read
        ? '<span class="badge badge-muted">Read</span>'
        : '<span class="badge badge-warning">Unread</span>';

      return '<tr class="message-row ' + rowClass + '">' +
        '<td>' + escapeHtml(msg.name) + '</td>' +
        '<td>' + escapeHtml(msg.email) + '</td>' +
        '<td>' + escapeHtml(msg.subject || '(No subject)') + '</td>' +
        '<td>' + formatDate(msg.created_at) + '</td>' +
        '<td>' + badge + '</td>' +
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
