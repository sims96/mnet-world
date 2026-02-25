/* ==========================================================================
   Mnet's World - Cake Management
   Handles both the cakes list page and the cake edit/create form.
   ========================================================================== */

(async function() {
  var isCakesListPage = !!document.getElementById('cakes-table');
  var isCakeEditPage = !!document.getElementById('cake-form');

  buildSidebar('cakes');
  await checkAuth();

  if (isCakesListPage) {
    loadCakes();
  }

  if (isCakeEditPage) {
    initCakeForm();
  }
})();

/* ── Cakes List ─────────────────────────────────────────────────────────── */

async function loadCakes() {
  var tbody = document.getElementById('cakes-table');

  try {
    var data = await adminApi('GET', '/api/admin/cakes');
    var cakes = data.cakes || [];

    if (cakes.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="table-empty">' +
          '<div class="empty-icon">&#127874;</div>' +
          '<p>No cakes yet</p>' +
          '<small>Add your first cake to get started.</small>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = cakes.map(function(cake) {
      var thumb = cake.image_url
        ? '<img src="' + escapeHtml(cake.image_url) + '" alt="' + escapeHtml(cake.name) + '" class="table-thumb">'
        : '<div class="table-thumb-placeholder">&#127874;</div>';

      var featuredChecked = cake.is_featured ? 'checked' : '';
      var availableChecked = cake.is_available ? 'checked' : '';

      return '<tr>' +
        '<td>' + thumb + '</td>' +
        '<td><strong>' + escapeHtml(cake.name) + '</strong></td>' +
        '<td>' + escapeHtml(cake.category_name || '-') + '</td>' +
        '<td>' + formatPrice(cake.price_cents) + '</td>' +
        '<td>' +
          '<label class="toggle-switch">' +
            '<input type="checkbox" ' + featuredChecked + ' onchange="toggleCake(' + cake.id + ', \'is_featured\', this.checked)">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</td>' +
        '<td>' +
          '<label class="toggle-switch">' +
            '<input type="checkbox" ' + availableChecked + ' onchange="toggleCake(' + cake.id + ', \'is_available\', this.checked)">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</td>' +
        '<td>' +
          '<div class="action-btns">' +
            '<a href="/admin/cake-edit.html?id=' + cake.id + '" class="btn btn-sm btn-outline" title="Edit">&#9998; Edit</a>' +
            '<button class="btn btn-sm btn-danger" onclick="deleteCake(' + cake.id + ', \'' + escapeHtml(cake.name).replace(/'/g, "\\'") + '\')" title="Delete">&#128465; Delete</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="table-empty">' +
        '<p>Failed to load cakes</p>' +
        '<small>' + escapeHtml(e.message) + '</small>' +
      '</td></tr>';
    console.error('Failed to load cakes:', e);
  }
}

async function toggleCake(id, field, value) {
  try {
    var body = {};
    body[field] = value ? 1 : 0;
    await adminApi('PUT', '/api/admin/cakes/' + id, body);
    showToast('Cake updated!', 'success');
  } catch (e) {
    showToast('Failed to update: ' + e.message, 'error');
    loadCakes(); // Reload to reset toggle state
  }
}

async function deleteCake(id, name) {
  var confirmed = await confirmDelete(name);
  if (!confirmed) return;

  try {
    await adminApi('DELETE', '/api/admin/cakes/' + id);
    showToast('Cake deleted successfully.', 'success');
    loadCakes();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

/* ── Cake Edit/Create Form ──────────────────────────────────────────────── */

var currentCakeId = null;
var imageData = { url: null, key: null };
var galleryImages = [];

async function initCakeForm() {
  var editId = getQueryParam('id');
  currentCakeId = editId ? parseInt(editId) : null;

  // Update page title
  if (currentCakeId) {
    document.getElementById('page-title').textContent = 'Edit Cake';
    document.title = 'Edit Cake - Mnet\'s World Admin';
  }

  // Initialize image upload
  initImageUpload('image-upload', function(data) {
    imageData = data;
  });

  // Load categories
  loadCategories();

  // If editing, load cake data and show gallery section
  if (currentCakeId) {
    await loadCakeData(currentCakeId);
    initGalleryUpload();
    document.getElementById('gallery-section').style.display = '';
  }

  // Form submit handler
  var form = document.getElementById('cake-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    saveCake();
  });
}

async function loadCategories() {
  try {
    var data = await adminApi('GET', '/api/admin/cakes/categories/list');
    var select = document.getElementById('cake-category');
    var categories = data.categories || [];

    categories.forEach(function(cat) {
      var opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to load categories:', e);
  }
}

async function loadCakeData(id) {
  try {
    var data = await adminApi('GET', '/api/admin/cakes/' + id);
    var cake = data.cake;

    if (!cake) {
      showToast('Cake not found.', 'error');
      window.location.href = '/admin/cakes.html';
      return;
    }

    document.getElementById('cake-name').value = cake.name || '';
    document.getElementById('cake-price').value = cake.price_cents ? (cake.price_cents / 100).toFixed(2) : '';
    document.getElementById('cake-description').value = cake.description || '';
    document.getElementById('cake-featured').checked = !!cake.is_featured;
    document.getElementById('cake-available').checked = !!cake.is_available;
    document.getElementById('cake-order').value = cake.display_order || 0;

    // Set category (wait for categories to load)
    setTimeout(function() {
      if (cake.category_id) {
        document.getElementById('cake-category').value = cake.category_id;
      }
    }, 500);

    // Set image
    if (cake.image_url) {
      imageData = { url: cake.image_url, key: cake.image_key };
      setExistingImage('image-upload', cake.image_url, cake.image_key);
    }

    // Load gallery images
    if (data.images && data.images.length > 0) {
      galleryImages = data.images;
      renderGalleryGrid();
    }
  } catch (e) {
    showToast('Failed to load cake: ' + e.message, 'error');
    console.error('Failed to load cake:', e);
  }
}

async function saveCake() {
  var btn = document.getElementById('save-btn');
  var name = document.getElementById('cake-name').value.trim();
  var priceStr = document.getElementById('cake-price').value;
  var categoryId = document.getElementById('cake-category').value;
  var description = document.getElementById('cake-description').value.trim();
  var isFeatured = document.getElementById('cake-featured').checked;
  var isAvailable = document.getElementById('cake-available').checked;
  var displayOrder = parseInt(document.getElementById('cake-order').value) || 0;

  // Validation
  if (!name) {
    showToast('Please enter a cake name.', 'error');
    return;
  }

  if (!priceStr || isNaN(parseFloat(priceStr))) {
    showToast('Please enter a valid price.', 'error');
    return;
  }

  var priceCents = Math.round(parseFloat(priceStr) * 100);

  // Get current image data
  var img = getImageData('image-upload');

  var payload = {
    name: name,
    price_cents: priceCents,
    description: description || null,
    category_id: categoryId ? parseInt(categoryId) : null,
    image_url: img.url || null,
    image_key: img.key || null,
    is_featured: isFeatured ? 1 : 0,
    is_available: isAvailable ? 1 : 0,
    display_order: displayOrder,
  };

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (currentCakeId) {
      await adminApi('PUT', '/api/admin/cakes/' + currentCakeId, payload);
      showToast('Cake updated successfully!', 'success');
    } else {
      await adminApi('POST', '/api/admin/cakes', payload);
      showToast('Cake created successfully!', 'success');
    }

    setTimeout(function() {
      window.location.href = '/admin/cakes.html';
    }, 1000);
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Save Cake';
  }
}

/* ── Gallery Image Management ──────────────────────────────────────────── */

function renderGalleryGrid() {
  var grid = document.getElementById('gallery-grid');
  if (!grid) return;

  if (galleryImages.length === 0) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = galleryImages.map(function(img) {
    return '<div class="gallery-thumb" data-id="' + img.id + '">' +
      '<img src="' + escapeHtml(img.image_url) + '" alt="Gallery image">' +
      '<button type="button" class="remove-image" title="Remove image" onclick="deleteGalleryImage(' + img.id + ')">&times;</button>' +
    '</div>';
  }).join('');
}

function initGalleryUpload() {
  var zone = document.getElementById('gallery-upload');
  var fileInput = document.getElementById('gallery-file');
  if (!zone || !fileInput) return;

  zone.addEventListener('click', function(e) {
    if (e.target.closest('.remove-image')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', function() {
    if (fileInput.files && fileInput.files.length > 0) {
      for (var i = 0; i < fileInput.files.length; i++) {
        uploadGalleryImage(fileInput.files[i]);
      }
      fileInput.value = '';
    }
  });

  // Drag events
  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('dragover');
    var files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (var i = 0; i < files.length; i++) {
        uploadGalleryImage(files[i]);
      }
    }
  });
}

async function uploadGalleryImage(file) {
  // Validate type
  var allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.indexOf(file.type) === -1) {
    showToast('Invalid file type: ' + file.name, 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large: ' + file.name, 'error');
    return;
  }

  try {
    // Upload to R2
    var formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'general');
    var uploadData = await adminUpload('/api/admin/media/upload', formData);

    // Save to cake_images
    var imgData = await adminApi('POST', '/api/admin/cakes/' + currentCakeId + '/images', {
      image_url: uploadData.url,
      image_key: uploadData.key,
      display_order: galleryImages.length,
    });

    galleryImages.push(imgData.image);
    renderGalleryGrid();
    showToast('Image added!', 'success');
  } catch (e) {
    showToast('Upload failed: ' + e.message, 'error');
  }
}

async function deleteGalleryImage(imageId) {
  if (!confirm('Remove this image?')) return;

  try {
    await adminApi('DELETE', '/api/admin/cakes/' + currentCakeId + '/images/' + imageId);
    galleryImages = galleryImages.filter(function(img) { return img.id !== imageId; });
    renderGalleryGrid();
    showToast('Image removed.', 'success');
  } catch (e) {
    showToast('Failed to remove: ' + e.message, 'error');
  }
}
