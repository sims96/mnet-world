/* ==========================================================================
   Mnet's World - Reusable Image Upload Component
   ========================================================================== */

/**
 * Initialize a drag-and-drop image upload zone.
 * @param {string} containerId - The ID of the .upload-zone element.
 * @param {function} onUpload - Callback with { url, key } on successful upload.
 */
function initImageUpload(containerId, onUpload) {
  var zone = document.getElementById(containerId);
  if (!zone) return;

  var fileInput = zone.querySelector('input[type="file"]');

  // Store state on the zone element
  zone._uploadState = {
    url: null,
    key: null,
    onUpload: onUpload || function() {},
  };

  // Click to open file picker
  zone.addEventListener('click', function(e) {
    if (e.target.closest('.remove-image')) return;
    if (fileInput) fileInput.click();
  });

  // File input change
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (fileInput.files && fileInput.files[0]) {
        handleFile(zone, fileInput.files[0]);
      }
    });
  }

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
    if (files && files[0]) {
      handleFile(zone, files[0]);
    }
  });
}

/**
 * Handle a selected file - validate, upload, and show preview.
 */
function handleFile(zone, file) {
  // Validate type
  var allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.indexOf(file.type) === -1) {
    showToast('Invalid file type. Please use JPEG, PNG, or WebP.', 'error');
    return;
  }

  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large. Maximum size is 5MB.', 'error');
    return;
  }

  // Show loading state
  zone.innerHTML =
    '<div class="upload-loading">' +
      '<div class="upload-spinner"></div>' +
      '<span style="font-size: 0.875rem; color: #6B6B6B;">Uploading image...</span>' +
    '</div>';
  zone.classList.add('has-image');

  // Upload
  var formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'general');

  adminUpload('/api/admin/media/upload', formData)
    .then(function(data) {
      zone._uploadState.url = data.url;
      zone._uploadState.key = data.key;
      showPreview(zone, data.url);
      zone._uploadState.onUpload({ url: data.url, key: data.key });
      showToast('Image uploaded successfully!', 'success');
    })
    .catch(function(err) {
      showToast('Upload failed: ' + err.message, 'error');
      resetUploadZone(zone);
    });
}

/**
 * Show the image preview in the upload zone.
 */
function showPreview(zone, url) {
  zone.innerHTML =
    '<div class="upload-preview">' +
      '<img src="' + escapeHtml(url) + '" alt="Upload preview">' +
      '<button type="button" class="remove-image" title="Remove image">&times;</button>' +
    '</div>';
  zone.classList.add('has-image');

  // Remove button handler
  var removeBtn = zone.querySelector('.remove-image');
  if (removeBtn) {
    removeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      clearImage(zone.id);
    });
  }
}

/**
 * Reset the upload zone to its default empty state.
 */
function resetUploadZone(zone) {
  zone.innerHTML =
    '<div class="upload-icon">&#128247;</div>' +
    '<div class="upload-text"><strong>Click to upload</strong> or drag and drop</div>' +
    '<div class="upload-hint">JPEG, PNG or WebP (max 5MB)</div>' +
    '<input type="file" accept="image/jpeg,image/png,image/webp">';
  zone.classList.remove('has-image');

  // Re-bind the file input
  var fileInput = zone.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (fileInput.files && fileInput.files[0]) {
        handleFile(zone, fileInput.files[0]);
      }
    });
  }
}

/**
 * Pre-populate the upload zone with an existing image (for edit mode).
 * @param {string} containerId - The upload zone element ID.
 * @param {string} url - The image URL.
 * @param {string} key - The image storage key.
 */
function setExistingImage(containerId, url, key) {
  var zone = document.getElementById(containerId);
  if (!zone || !url) return;

  if (!zone._uploadState) {
    zone._uploadState = { url: null, key: null, onUpload: function() {} };
  }

  zone._uploadState.url = url;
  zone._uploadState.key = key || null;
  showPreview(zone, url);
}

/**
 * Clear the image from the upload zone.
 * @param {string} containerId - The upload zone element ID.
 */
function clearImage(containerId) {
  var zone = document.getElementById(containerId);
  if (!zone) return;

  if (zone._uploadState) {
    zone._uploadState.url = null;
    zone._uploadState.key = null;
  }

  resetUploadZone(zone);
}

/**
 * Get the current image data from an upload zone.
 * @param {string} containerId - The upload zone element ID.
 * @returns {{ url: string|null, key: string|null }}
 */
function getImageData(containerId) {
  var zone = document.getElementById(containerId);
  if (!zone || !zone._uploadState) return { url: null, key: null };
  return {
    url: zone._uploadState.url,
    key: zone._uploadState.key,
  };
}
