/* ==========================================================================
   Mnet's World - Category Management
   ========================================================================== */

(async function() {
  buildSidebar('categories');
  await checkAuth();
  loadCategories();
  initAddForm();
  initEditModal();
})();

var editingCategoryId = null;

/* ── Load and render categories ────────────────────────────────────────── */

async function loadCategories() {
  var tbody = document.getElementById('categories-table');

  try {
    var data = await adminApi('GET', '/api/admin/cakes/categories/list');
    var categories = data.categories || [];

    if (categories.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="table-empty">' +
          '<div style="padding: 2rem; text-align: center;">' +
            '<div style="font-size: 3rem; margin-bottom: 0.5rem;">&#128450;</div>' +
            '<p>No categories yet</p>' +
            '<small style="color: #999;">Add your first category using the form above.</small>' +
          '</div>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = categories.map(function(cat) {
      return '<tr>' +
        '<td>' + cat.display_order + '</td>' +
        '<td><strong>' + escapeHtml(cat.name) + '</strong></td>' +
        '<td><code style="font-size: 0.8em; background: #f3f3f3; padding: 2px 6px; border-radius: 4px;">' + escapeHtml(cat.slug) + '</code></td>' +
        '<td>' + escapeHtml(cat.description || '—') + '</td>' +
        '<td>' + formatDate(cat.created_at) + '</td>' +
        '<td>' +
          '<div class="action-btns">' +
            '<button class="btn btn-sm btn-outline" onclick="openEditModal(' + cat.id + ', this)" title="Edit">&#9998; Edit</button>' +
            '<button class="btn btn-sm btn-danger" onclick="deleteCategory(' + cat.id + ', this)" title="Delete">&#128465; Delete</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    // Store data on buttons for edit
    categories.forEach(function(cat) {
      window['_cat_' + cat.id] = cat;
    });
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty">' +
        '<div style="padding: 2rem; text-align: center;">' +
          '<p>Failed to load categories</p>' +
          '<small style="color: #999;">' + escapeHtml(e.message) + '</small>' +
        '</div>' +
      '</td></tr>';
  }
}

/* ── Add category ──────────────────────────────────────────────────────── */

function initAddForm() {
  var form = document.getElementById('add-category-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    addCategory();
  });
}

async function addCategory() {
  var nameInput = document.getElementById('new-cat-name');
  var descInput = document.getElementById('new-cat-desc');
  var orderInput = document.getElementById('new-cat-order');

  var name = nameInput.value.trim();
  if (!name) {
    showToast('Please enter a category name.', 'error');
    return;
  }

  try {
    await adminApi('POST', '/api/admin/cakes/categories', {
      name: name,
      description: descInput.value.trim() || null,
      display_order: parseInt(orderInput.value) || 0,
    });
    showToast('Category created!', 'success');
    nameInput.value = '';
    descInput.value = '';
    orderInput.value = '0';
    nameInput.focus();
    loadCategories();
  } catch (e) {
    showToast('Failed to create: ' + e.message, 'error');
  }
}

/* ── Edit modal ────────────────────────────────────────────────────────── */

function initEditModal() {
  var form = document.getElementById('edit-category-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    saveCategory();
  });

  document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);

  document.getElementById('edit-modal').addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });
}

function openEditModal(id) {
  var cat = window['_cat_' + id];
  if (!cat) return;

  editingCategoryId = id;
  document.getElementById('edit-cat-name').value = cat.name;
  document.getElementById('edit-cat-desc').value = cat.description || '';
  document.getElementById('edit-cat-order').value = cat.display_order;
  document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
  editingCategoryId = null;
  document.getElementById('edit-modal').classList.remove('active');
}

async function saveCategory() {
  if (!editingCategoryId) return;

  var name = document.getElementById('edit-cat-name').value.trim();
  if (!name) {
    showToast('Category name is required.', 'error');
    return;
  }

  try {
    await adminApi('PUT', '/api/admin/cakes/categories/' + editingCategoryId, {
      name: name,
      description: document.getElementById('edit-cat-desc').value.trim() || null,
      display_order: parseInt(document.getElementById('edit-cat-order').value) || 0,
    });
    showToast('Category updated!', 'success');
    closeEditModal();
    loadCategories();
  } catch (e) {
    showToast('Failed to update: ' + e.message, 'error');
  }
}

/* ── Delete ─────────────────────────────────────────────────────────────── */

async function deleteCategory(id) {
  var cat = window['_cat_' + id];
  var name = cat ? cat.name : 'this category';

  var confirmed = await confirmDelete(name);
  if (!confirmed) return;

  try {
    await adminApi('DELETE', '/api/admin/cakes/categories/' + id);
    showToast('Category deleted.', 'success');
    loadCategories();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}
