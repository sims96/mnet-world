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

/* ==========================================================================
   Video Upload Component
   ========================================================================== */

function initVideoUpload(containerId, onUpload) {
  var zone = document.getElementById(containerId);
  if (!zone) return;

  var fileInput = zone.querySelector('input[type="file"]');

  zone._uploadState = {
    url: null,
    key: null,
    onUpload: onUpload || function() {},
  };

  zone.addEventListener('click', function(e) {
    if (e.target.closest('.remove-video')) return;
    if (fileInput) fileInput.click();
  });

  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (fileInput.files && fileInput.files[0]) {
        handleVideoFile(zone, fileInput.files[0]);
      }
    });
  }

  zone.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', function(e) { e.preventDefault(); e.stopPropagation(); zone.classList.remove('dragover'); });
  zone.addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation(); zone.classList.remove('dragover');
    var files = e.dataTransfer.files;
    if (files && files[0]) handleVideoFile(zone, files[0]);
  });
}

function handleVideoFile(zone, file) {
  var allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (allowedTypes.indexOf(file.type) === -1) {
    showToast('Invalid video type. Please use MP4, WebM, or MOV.', 'error');
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    showToast('Video too large. Maximum size is 100MB.', 'error');
    return;
  }

  zone.innerHTML =
    '<div class="upload-loading">' +
      '<div class="upload-spinner"></div>' +
      '<span style="font-size: 0.875rem; color: #6B6B6B;">Uploading video...</span>' +
    '</div>';
  zone.classList.add('has-image');

  var formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'general');

  adminUpload('/api/admin/media/upload', formData)
    .then(function(data) {
      zone._uploadState.url = data.url;
      zone._uploadState.key = data.key;
      showVideoPreview(zone, data.url);
      zone._uploadState.onUpload({ url: data.url, key: data.key });
      showToast('Video uploaded successfully!', 'success');
    })
    .catch(function(err) {
      showToast('Upload failed: ' + err.message, 'error');
      resetVideoZone(zone);
    });
}

function showVideoPreview(zone, url) {
  zone.innerHTML =
    '<div class="upload-preview">' +
      '<video src="' + escapeHtml(url) + '" controls style="max-width:100%;max-height:200px;border-radius:8px;"></video>' +
      '<button type="button" class="remove-video remove-image" title="Remove video">&times;</button>' +
    '</div>';
  zone.classList.add('has-image');

  var removeBtn = zone.querySelector('.remove-video');
  if (removeBtn) {
    removeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      clearVideo(zone.id);
    });
  }
}

function resetVideoZone(zone) {
  zone.innerHTML =
    '<div class="upload-icon">&#127909;</div>' +
    '<div class="upload-text"><strong>Click to upload</strong> or drag and drop</div>' +
    '<div class="upload-hint">MP4, WebM or MOV (max 100MB)</div>' +
    '<input type="file" accept="video/mp4,video/webm,video/quicktime">';
  zone.classList.remove('has-image');

  var fileInput = zone.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (fileInput.files && fileInput.files[0]) {
        handleVideoFile(zone, fileInput.files[0]);
      }
    });
  }
}

function setExistingVideo(containerId, url, key) {
  var zone = document.getElementById(containerId);
  if (!zone || !url) return;
  if (!zone._uploadState) {
    zone._uploadState = { url: null, key: null, onUpload: function() {} };
  }
  zone._uploadState.url = url;
  zone._uploadState.key = key || null;
  showVideoPreview(zone, url);
}

function clearVideo(containerId) {
  var zone = document.getElementById(containerId);
  if (!zone) return;
  if (zone._uploadState) {
    zone._uploadState.url = null;
    zone._uploadState.key = null;
  }
  resetVideoZone(zone);
}

function getVideoData(containerId) {
  var zone = document.getElementById(containerId);
  if (!zone || !zone._uploadState) return { url: null, key: null };
  return { url: zone._uploadState.url, key: zone._uploadState.key };
}
