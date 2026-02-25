/* ==========================================================================
   Mnet's World - Admin Authentication
   Global utilities for all admin pages.
   ========================================================================== */

/**
 * API wrapper for admin requests. Includes credentials (cookies) automatically.
 * Throws an error with the server's message on non-2xx responses.
 */
async function adminApi(method, path, body) {
  const opts = {
    method: method,
    credentials: 'include',
    headers: {},
  };

  if (body !== undefined && body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(path, opts);
  const data = await res.json();

  if (!res.ok) {
    const errMsg = data.error || data.message || 'Something went wrong';
    throw new Error(errMsg);
  }

  return data;
}

/**
 * Upload a file using multipart/form-data (for media uploads).
 */
async function adminUpload(path, formData) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data.error || data.message || 'Upload failed';
    throw new Error(errMsg);
  }

  return data;
}

/**
 * Check if the current user is authenticated.
 * Redirects to login page if not.
 * Returns the user object on success.
 */
async function checkAuth() {
  try {
    const data = await adminApi('GET', '/api/auth/me');
    if (data.user) {
      // Update sidebar user info if present
      const nameEl = document.querySelector('.user-name');
      const avatarEl = document.querySelector('.user-avatar');
      if (nameEl) nameEl.textContent = data.user.username;
      if (avatarEl) avatarEl.textContent = data.user.username.charAt(0).toUpperCase();
      return data.user;
    }
    throw new Error('No user');
  } catch (e) {
    window.location.href = '/admin/index.html';
    return null;
  }
}

/**
 * Log out and redirect to login page.
 */
async function logout() {
  try {
    await adminApi('POST', '/api/auth/logout');
  } catch (e) {
    // Ignore errors - still redirect
  }
  window.location.href = '/admin/index.html';
}

/**
 * Show a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'|'warning'} type - Toast type.
 * @param {number} duration - Auto-dismiss time in ms (default 4000).
 */
function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || 4000;

  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  var icons = {
    success: '\u2713',
    error: '\u2717',
    info: '\u2139',
    warning: '\u26A0',
  };

  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML =
    '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
    '<span class="toast-message">' + escapeHtml(message) + '</span>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">&times;</button>';

  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(function() {
    toast.classList.add('hiding');
    setTimeout(function() {
      if (toast.parentElement) toast.remove();
    }, 300);
  }, duration);
}

/**
 * Escape HTML entities to prevent XSS.
 */
function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Format a date string to a human-readable format.
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time.
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format price from cents to dollars.
 */
function formatPrice(cents) {
  if (cents === null || cents === undefined) return '$0.00';
  return '$' + (cents / 100).toFixed(2);
}

/**
 * Get query parameter from URL.
 */
function getQueryParam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Confirm delete modal - reusable.
 * Shows a delete confirmation modal and returns a promise.
 * @param {string} itemName - Name of the item being deleted.
 * @returns {Promise<boolean>}
 */
function confirmDelete(itemName) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById('delete-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'delete-modal';
      overlay.innerHTML =
        '<div class="modal">' +
          '<div class="modal-icon danger">\u26A0</div>' +
          '<h3>Delete Confirmation</h3>' +
          '<p id="delete-modal-text">Are you sure you want to delete this item? This action cannot be undone.</p>' +
          '<div class="modal-actions">' +
            '<button class="btn btn-secondary" id="delete-modal-cancel">Cancel</button>' +
            '<button class="btn btn-danger" id="delete-modal-confirm">Delete</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
    }

    var textEl = document.getElementById('delete-modal-text');
    textEl.textContent = 'Are you sure you want to delete "' + itemName + '"? This action cannot be undone.';

    overlay.classList.add('active');

    var cancelBtn = document.getElementById('delete-modal-cancel');
    var confirmBtn = document.getElementById('delete-modal-confirm');

    function cleanup() {
      overlay.classList.remove('active');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      overlay.removeEventListener('click', onOverlayClick);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function onConfirm() {
      cleanup();
      resolve(true);
    }

    function onOverlayClick(e) {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    overlay.addEventListener('click', onOverlayClick);
  });
}

/**
 * Build the standard admin sidebar HTML.
 * @param {string} activePage - The current page identifier for highlighting.
 */
function buildSidebar(activePage) {
  var navItems = [
    { id: 'dashboard',    href: '/admin/dashboard.html',       icon: '\uD83D\uDCCA', label: 'Dashboard' },
    { id: 'cakes',        href: '/admin/cakes.html',           icon: '\uD83C\uDF82', label: 'Cakes' },
    { id: 'blog',         href: '/admin/blog.html',            icon: '\uD83D\uDCDD', label: 'Blog' },
    { id: 'humanitarian', href: '/admin/humanitarian.html',    icon: '\u2764\uFE0F',  label: 'Humanitarian' },
    { id: 'messages',     href: '/admin/messages.html',        icon: '\uD83D\uDCE9', label: 'Messages' },
  ];

  var navHtml = navItems.map(function(item) {
    var cls = item.id === activePage ? 'active' : '';
    return '<a href="' + item.href + '" class="' + cls + '">' +
      '<span class="nav-icon">' + item.icon + '</span>' + item.label + '</a>';
  }).join('');

  var sidebarHtml =
    '<div class="sidebar-logo">' +
      '<h2>Mnet\'s World</h2>' +
      '<small>Admin Panel</small>' +
    '</div>' +
    '<nav class="sidebar-nav">' +
      navHtml +
      '<div class="nav-divider"></div>' +
      '<a href="#" onclick="logout(); return false;">' +
        '<span class="nav-icon">\uD83D\uDEAA</span>Logout' +
      '</a>' +
    '</nav>' +
    '<div class="sidebar-user">' +
      '<div class="user-avatar">A</div>' +
      '<div class="user-info">' +
        '<div class="user-name">Admin</div>' +
        '<div class="user-role">Administrator</div>' +
      '</div>' +
    '</div>';

  // Build sidebar element
  var sidebar = document.querySelector('.admin-sidebar');
  if (sidebar) {
    sidebar.innerHTML = sidebarHtml;
  }

  // Build mobile header
  var mobileHeader = document.querySelector('.mobile-header');
  if (mobileHeader) {
    mobileHeader.innerHTML =
      '<button class="hamburger-btn" id="hamburger-btn">\u2630</button>' +
      '<span class="mobile-title">Mnet\'s World</span>';
  }

  // Sidebar toggle for mobile
  initSidebarToggle();
}

/**
 * Initialize mobile sidebar toggle functionality.
 */
function initSidebarToggle() {
  var hamburger = document.getElementById('hamburger-btn');
  var sidebar = document.querySelector('.admin-sidebar');
  var overlay = document.querySelector('.sidebar-overlay');

  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  });

  if (overlay) {
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}
