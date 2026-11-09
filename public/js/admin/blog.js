/* ==========================================================================
   Mnet's World - Blog Management
   Handles both the blog list page and the blog edit/create form.
   ========================================================================== */

(async function() {
  var isBlogListPage = !!document.getElementById('blog-table');
  var isBlogEditPage = !!document.getElementById('blog-form');

  buildSidebar('blog');
  await checkAuth();

  if (isBlogListPage) {
    loadPosts();
  }

  if (isBlogEditPage) {
    initBlogForm();
  }
})();

/* ── Blog List ──────────────────────────────────────────────────────────── */

async function loadPosts() {
  var tbody = document.getElementById('blog-table');

  try {
    var data = await adminApi('GET', '/api/admin/blog');
    var posts = data.posts || [];

    if (posts.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="table-empty">' +
          '<div class="empty-icon">&#128221;</div>' +
          '<p>No blog posts yet</p>' +
          '<small>Write your first blog post to get started.</small>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = posts.map(function(post) {
      var thumb = post.cover_image_url
        ? '<img src="' + escapeHtml(post.cover_image_url) + '" alt="' + escapeHtml(post.title) + '" class="table-thumb">'
        : '<div class="table-thumb-placeholder">&#128221;</div>';

      var statusBadge = post.is_published
        ? '<span class="badge badge-success">Published</span>'
        : '<span class="badge badge-warning">Draft</span>';

      var publishBtn = post.is_published
        ? '<button class="btn btn-sm btn-warning" onclick="togglePublish(' + post.id + ')" title="Unpublish">Unpublish</button>'
        : '<button class="btn btn-sm btn-success" onclick="togglePublish(' + post.id + ')" title="Publish">Publish</button>';

      var date = post.published_at ? formatDate(post.published_at) : formatDate(post.created_at);

      return '<tr>' +
        '<td>' + thumb + '</td>' +
        '<td><strong>' + escapeHtml(post.title) + '</strong></td>' +
        '<td>' + escapeHtml(post.category || '-') + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + date + '</td>' +
        '<td>' +
          '<div class="action-btns">' +
            '<a href="/admin/blog-edit.html?id=' + post.id + '" class="btn btn-sm btn-outline" title="Edit">&#9998; Edit</a>' +
            publishBtn +
            '<button class="btn btn-sm btn-danger" onclick="deletePost(' + post.id + ', \'' + escapeHtml(post.title).replace(/'/g, "\\'") + '\')" title="Delete">&#128465;</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty">' +
        '<p>Failed to load blog posts</p>' +
        '<small>' + escapeHtml(e.message) + '</small>' +
      '</td></tr>';
    console.error('Failed to load posts:', e);
  }
}

async function togglePublish(id) {
  try {
    var data = await adminApi('PUT', '/api/admin/blog/' + id + '/publish');
    var status = data.post && data.post.is_published ? 'published' : 'unpublished';
    showToast('Post ' + status + ' successfully!', 'success');
    loadPosts();
  } catch (e) {
    showToast('Failed to update: ' + e.message, 'error');
  }
}

async function deletePost(id, title) {
  var confirmed = await confirmDelete(title);
  if (!confirmed) return;

  try {
    await adminApi('DELETE', '/api/admin/blog/' + id);
    showToast('Post deleted successfully.', 'success');
    loadPosts();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

/* ── Blog Edit/Create Form ──────────────────────────────────────────────── */

var currentPostId = null;
var quillEditor = null;
var coverImageData = { url: null, key: null };

async function initBlogForm() {
  var editId = getQueryParam('id');
  currentPostId = editId ? parseInt(editId) : null;

  // Update page title
  if (currentPostId) {
    document.getElementById('page-title').textContent = 'Edit Post';
    document.title = 'Edit Post - Mnet\'s World Admin';
  }

  // Initialize Quill editor
  quillEditor = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Write your blog post content here...',
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

  // If editing, load post data
  if (currentPostId) {
    await loadPostData(currentPostId);
  }

  // Form submit handler
  var form = document.getElementById('blog-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    savePost();
  });
}

async function loadPostData(id) {
  try {
    var data = await adminApi('GET', '/api/admin/blog/' + id);
    var post = data.post;

    if (!post) {
      showToast('Post not found.', 'error');
      window.location.href = '/admin/blog.html';
      return;
    }

    document.getElementById('post-title').value = post.title || '';
    document.getElementById('post-category').value = post.category || '';
    document.getElementById('post-excerpt').value = post.excerpt || '';
    document.getElementById('post-redirect').value = post.redirect_url || '';
    document.getElementById('post-published').checked = !!post.is_published;

    // Set Quill content
    if (post.content && quillEditor) {
      quillEditor.root.innerHTML = post.content;
    }

    // Set cover image
    if (post.cover_image_url) {
      coverImageData = { url: post.cover_image_url, key: post.cover_image_key };
      setExistingImage('cover-upload', post.cover_image_url, post.cover_image_key);
    }

    // Set video
    if (post.video_url) {
      setExistingVideo('video-upload', post.video_url, post.video_key);
    }
  } catch (e) {
    showToast('Failed to load post: ' + e.message, 'error');
    console.error('Failed to load post:', e);
  }
}

async function savePost() {
  var btn = document.getElementById('save-btn');
  var title = document.getElementById('post-title').value.trim();
  var category = document.getElementById('post-category').value;
  var excerpt = document.getElementById('post-excerpt').value.trim();
  var redirectUrl = document.getElementById('post-redirect').value.trim();
  var isPublished = document.getElementById('post-published').checked;

  // Get Quill content
  var content = quillEditor ? quillEditor.root.innerHTML : '';

  // Validate
  if (!title) {
    showToast('Please enter a post title.', 'error');
    return;
  }

  // Check if content is empty (Quill adds <p><br></p> for empty)
  var textContent = quillEditor ? quillEditor.getText().trim() : '';
  if (!textContent) {
    showToast('Please write some content for your post.', 'error');
    return;
  }

  // Get cover image data
  var img = getImageData('cover-upload');
  var vid = getVideoData('video-upload');

  var payload = {
    title: title,
    content: content,
    excerpt: excerpt || null,
    category: category || null,
    redirect_url: redirectUrl || null,
    cover_image_url: img.url || null,
    cover_image_key: img.key || null,
    video_url: vid.url || null,
    video_key: vid.key || null,
  };

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (currentPostId) {
      await adminApi('PUT', '/api/admin/blog/' + currentPostId, payload);

      // Handle publish status separately if needed
      var currentData = await adminApi('GET', '/api/admin/blog/' + currentPostId);
      var currentlyPublished = !!currentData.post.is_published;
      if (currentlyPublished !== isPublished) {
        await adminApi('PUT', '/api/admin/blog/' + currentPostId + '/publish');
      }

      showToast('Post updated successfully!', 'success');
    } else {
      var result = await adminApi('POST', '/api/admin/blog', payload);

      // Publish if checkbox was checked
      if (isPublished && result.post && result.post.id) {
        await adminApi('PUT', '/api/admin/blog/' + result.post.id + '/publish');
      }

      showToast('Post created successfully!', 'success');
    }

    setTimeout(function() {
      window.location.href = '/admin/blog.html';
    }, 1000);
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Save Post';
  }
}
