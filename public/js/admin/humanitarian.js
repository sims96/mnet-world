/* ==========================================================================
   Mnet's World - Humanitarian Management
   Handles both the humanitarian list page and the entry edit/create form.
   ========================================================================== */

(async function() {
  var isListPage = !!document.getElementById('humanitarian-table');
  var isEditPage = !!document.getElementById('humanitarian-form');

  buildSidebar('humanitarian');
  await checkAuth();

  if (isListPage) {
    loadEntries();
  }

  if (isEditPage) {
    initHumanitarianForm();
  }
})();

/* ── Humanitarian List ──────────────────────────────────────────────────── */

async function loadEntries() {
  var tbody = document.getElementById('humanitarian-table');

  try {
    var data = await adminApi('GET', '/api/admin/humanitarian');
    var entries = data.entries || [];

    if (entries.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="table-empty">' +
          '<div class="empty-icon">&#10084;&#65039;</div>' +
          '<p>No humanitarian entries yet</p>' +
          '<small>Add your first humanitarian entry to get started.</small>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = entries.map(function(entry) {
      var thumb = entry.cover_image_url
        ? '<img src="' + escapeHtml(entry.cover_image_url) + '" alt="' + escapeHtml(entry.title) + '" class="table-thumb">'
        : '<div class="table-thumb-placeholder">&#10084;&#65039;</div>';

      var statusBadge = entry.is_published
        ? '<span class="badge badge-success">Published</span>'
        : '<span class="badge badge-warning">Draft</span>';

      return '<tr>' +
        '<td>' + thumb + '</td>' +
        '<td><strong>' + escapeHtml(entry.title) + '</strong></td>' +
        '<td>' + escapeHtml(entry.location || '-') + '</td>' +
        '<td>' + formatDate(entry.activity_date || entry.created_at) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' +
          '<div class="action-btns">' +
            '<a href="/admin/humanitarian-edit.html?id=' + entry.id + '" class="btn btn-sm btn-outline" title="Edit">&#9998; Edit</a>' +
            '<button class="btn btn-sm btn-danger" onclick="deleteEntry(' + entry.id + ', \'' + escapeHtml(entry.title).replace(/'/g, "\\'") + '\')" title="Delete">&#128465; Delete</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty">' +
        '<p>Failed to load entries</p>' +
        '<small>' + escapeHtml(e.message) + '</small>' +
      '</td></tr>';
    console.error('Failed to load entries:', e);
  }
}

async function deleteEntry(id, title) {
  var confirmed = await confirmDelete(title);
  if (!confirmed) return;

  try {
    await adminApi('DELETE', '/api/admin/humanitarian/' + id);
    showToast('Entry deleted successfully.', 'success');
    loadEntries();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

/* ── Humanitarian Edit/Create Form ──────────────────────────────────────── */

var currentEntryId = null;
var quillEditor = null;
var coverImageData = { url: null, key: null };

async function initHumanitarianForm() {
  var editId = getQueryParam('id');
  currentEntryId = editId ? parseInt(editId) : null;

  // Update page title
  if (currentEntryId) {
    document.getElementById('page-title').textContent = 'Edit Humanitarian Entry';
    document.title = 'Edit Entry - Mnet\'s World Admin';
  }

  // Initialize Quill editor
  quillEditor = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Describe the humanitarian activity...',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'link', 'image'],
        ['clean'],
      ],
    },
  });

  // Initialize cover image upload
  initImageUpload('cover-upload', function(data) {
    coverImageData = data;
  });

  // Initialize video upload
  initVideoUpload('video-upload', function(data) {
    // video data stored in zone._uploadState
  });

  // If editing, load entry data
  if (currentEntryId) {
    await loadEntryData(currentEntryId);
  }

  // Form submit handler
  var form = document.getElementById('humanitarian-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    saveEntry();
  });
}

async function loadEntryData(id) {
  try {
    var data = await adminApi('GET', '/api/admin/humanitarian/' + id);
    var entry = data.entry;

    if (!entry) {
      showToast('Entry not found.', 'error');
      window.location.href = '/admin/humanitarian.html';
      return;
    }

    document.getElementById('entry-title').value = entry.title || '';
    document.getElementById('entry-location').value = entry.location || '';
    document.getElementById('entry-published').checked = entry.is_published !== undefined ? !!entry.is_published : true;

    // Set date
    if (entry.activity_date) {
      // Handle different date formats - extract YYYY-MM-DD
      var dateStr = entry.activity_date;
      if (dateStr.length > 10) {
        dateStr = dateStr.substring(0, 10);
      }
      document.getElementById('entry-date').value = dateStr;
    }

    // Set Quill content
    if (entry.description && quillEditor) {
      quillEditor.root.innerHTML = entry.description;
    }

    // Set cover image
    if (entry.cover_image_url) {
      coverImageData = { url: entry.cover_image_url, key: entry.cover_image_key };
      setExistingImage('cover-upload', entry.cover_image_url, entry.cover_image_key);
    }

    // Set video
    if (entry.video_url) {
      setExistingVideo('video-upload', entry.video_url, entry.video_key);
    }
  } catch (e) {
    showToast('Failed to load entry: ' + e.message, 'error');
    console.error('Failed to load entry:', e);
  }
}

async function saveEntry() {
  var btn = document.getElementById('save-btn');
  var title = document.getElementById('entry-title').value.trim();
  var location = document.getElementById('entry-location').value.trim();
  var activityDate = document.getElementById('entry-date').value;
  var isPublished = document.getElementById('entry-published').checked;

  // Get Quill content
  var description = quillEditor ? quillEditor.root.innerHTML : '';

  // Validate
  if (!title) {
    showToast('Please enter a title.', 'error');
    return;
  }

  var textContent = quillEditor ? quillEditor.getText().trim() : '';
  if (!textContent) {
    showToast('Please write a description.', 'error');
    return;
  }

  // Get cover image data
  var img = getImageData('cover-upload');
  var vid = getVideoData('video-upload');

  var payload = {
    title: title,
    description: description,
    location: location || null,
    activity_date: activityDate || null,
    cover_image_url: img.url || null,
    cover_image_key: img.key || null,
    video_url: vid.url || null,
    video_key: vid.key || null,
    is_published: isPublished ? 1 : 0,
  };

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (currentEntryId) {
      await adminApi('PUT', '/api/admin/humanitarian/' + currentEntryId, payload);
      showToast('Entry updated successfully!', 'success');
    } else {
      await adminApi('POST', '/api/admin/humanitarian', payload);
      showToast('Entry created successfully!', 'success');
    }

    setTimeout(function() {
      window.location.href = '/admin/humanitarian.html';
    }, 1000);
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Save Entry';
  }
}
