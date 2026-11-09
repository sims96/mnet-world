/* ==========================================================================
   Mnet's World - Product Detail Page JavaScript
   Fetches a single cake by slug, renders gallery with thumbnails,
   product details, share buttons, related cakes, and 404 state.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     DOM REFERENCES
     ======================================================================== */

  var pageTitleEl   = document.getElementById('page-title');
  var ogTitleEl     = document.getElementById('og-title');
  var ogDescEl      = document.getElementById('og-description');
  var ogUrlEl       = document.getElementById('og-url');
  var ogImageEl     = document.getElementById('og-image');

  var articleEl     = document.getElementById('product-article');
  var galleryMainEl = document.getElementById('product-gallery-main');
  var galleryPlaceholder = document.getElementById('product-gallery-placeholder');
  var galleryThumbsEl = document.getElementById('product-gallery-thumbs');
  var metaEl        = document.getElementById('product-meta');
  var titleEl       = document.getElementById('product-title');
  var descriptionEl = document.getElementById('product-description');
  var pricingEl     = document.getElementById('product-pricing');
  var priceUsdEl    = document.getElementById('product-price-usd');
  var priceFcfaEl   = document.getElementById('product-price-fcfa');
  var orderEl       = document.getElementById('product-order');
  var whatsappBtn   = document.getElementById('product-whatsapp-btn');
  var shareEl       = document.getElementById('product-share');

  var notFoundEl    = document.getElementById('product-not-found');
  var relatedSection = document.getElementById('related-section');
  var relatedGrid   = document.getElementById('related-grid');

  var shareFacebook = document.getElementById('share-facebook');
  var shareWhatsApp = document.getElementById('share-whatsapp');
  var shareCopy     = document.getElementById('share-copy');

  /* ========================================================================
     STATE
     ======================================================================== */

  var whatsappNumber = '';
  var fcfaRate = 655.957;
  var allImages = [];
  var currentImageIndex = 0;

  /* ========================================================================
     SLUG EXTRACTION
     ======================================================================== */

  function getSlugFromURL() {
    var path = window.location.pathname;
    if (path.endsWith('/')) path = path.slice(0, -1);

    var match = path.match(/^\/shop\/(.+)$/);
    if (match) return decodeURIComponent(match[1]);

    var params = new URLSearchParams(window.location.search);
    return params.get('slug') || '';
  }

  /* ========================================================================
     ESCAPE HELPER
     ======================================================================== */

  function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ========================================================================
     GALLERY
     ======================================================================== */

  function renderGallery(cake, images) {
    allImages = [];

    // Build media array: cover first, then gallery images/videos
    if (cake.image_url) {
      allImages.push({ url: cake.image_url, type: 'image', poster: null });
    }
    if (images && images.length > 0) {
      images.forEach(function (img) {
        if (img.image_url && img.image_url !== cake.image_url) {
          allImages.push({
            url: img.image_url,
            type: img.media_type === 'video' ? 'video' : 'image',
            poster: img.poster_url || null
          });
        }
      });
    }

    if (allImages.length === 0) {
      // Show placeholder
      return;
    }

    // Render main image
    setMainImage(0, cake.name);

    // Render thumbnails only if more than 1 image
    if (allImages.length > 1 && galleryThumbsEl) {
      var thumbsHTML = '';
      allImages.forEach(function (media, i) {
        var isVideo = media.type === 'video';
        var thumbInner;
        if (isVideo && media.poster) {
          thumbInner = '<img src="' + escapeHTML(media.poster) + '" alt="Play video ' + (i + 1) + '" loading="lazy" />';
        } else if (isVideo) {
          thumbInner = '<video src="' + escapeHTML(media.url) + '#t=0.5" muted playsinline preload="metadata" aria-hidden="true"></video>';
        } else {
          thumbInner = '<img src="' + escapeHTML(media.url) + '" alt="View image ' + (i + 1) + '" loading="lazy" />';
        }
        thumbsHTML +=
          '<button class="product-gallery__thumb' + (isVideo ? ' product-gallery__thumb--video' : '') + (i === 0 ? ' active' : '') + '" data-index="' + i + '"' +
            (isVideo ? ' aria-label="Play video ' + (i + 1) + '"' : '') + '>' +
            thumbInner +
          '</button>';
      });
      galleryThumbsEl.innerHTML = thumbsHTML;

      // Attach click handlers
      galleryThumbsEl.querySelectorAll('.product-gallery__thumb').forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-index'));
          setMainImage(idx, cake.name);
          updateActiveThumbnail(idx);
        });
      });
    }
  }

  function setMainImage(index, altText) {
    if (!galleryMainEl || !allImages[index]) return;
    currentImageIndex = index;

    var media = allImages[index];
    if (media.type === 'video') {
      galleryMainEl.innerHTML =
        '<video class="product-gallery__video" src="' + escapeHTML(media.url) + '"' +
          (media.poster ? ' poster="' + escapeHTML(media.poster) + '"' : '') +
          ' controls playsinline preload="metadata"></video>';
    } else {
      galleryMainEl.innerHTML =
        '<img src="' + escapeHTML(media.url) + '" alt="' + escapeHTML(altText || 'Cake') + '" />';
    }
  }

  function updateActiveThumbnail(index) {
    if (!galleryThumbsEl) return;
    galleryThumbsEl.querySelectorAll('.product-gallery__thumb').forEach(function (thumb, i) {
      if (i === index) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  }

  /* ========================================================================
     RENDER FUNCTIONS
     ======================================================================== */

  function renderProduct(cake, images) {
    var name = cake.name || 'Cake';

    // Update page title
    if (pageTitleEl) pageTitleEl.textContent = name + ' | Mnet\'s World';

    // Update OG tags
    if (ogTitleEl) ogTitleEl.setAttribute('content', name + ' | Mnet\'s World');
    if (ogDescEl) ogDescEl.setAttribute('content', cake.description || 'Handcrafted cake from Mnet\'s World');
    if (ogUrlEl) ogUrlEl.setAttribute('content', window.location.href);
    if (ogImageEl && cake.image_url) ogImageEl.setAttribute('content', cake.image_url);

    // Gallery
    renderGallery(cake, images);

    // Category badge
    if (metaEl) {
      if (cake.category_name) {
        metaEl.innerHTML = '<span class="card-cake__category">' + escapeHTML(cake.category_name) + '</span>';
      } else {
        metaEl.innerHTML = '';
      }
    }

    // Title
    if (titleEl) titleEl.textContent = name;

    // Description
    if (descriptionEl) {
      if (cake.description) {
        var paragraphs = cake.description.split(/\n\n+/);
        descriptionEl.innerHTML = paragraphs.map(function (p) {
          return '<p>' + escapeHTML(p.trim()) + '</p>';
        }).join('');
      } else {
        descriptionEl.innerHTML = '<p style="color:var(--color-text-muted);font-style:italic;">No description available for this cake.</p>';
      }
    }

    // Pricing
    if (pricingEl) {
      if (cake.price_cents) {
        priceUsdEl.textContent = window.formatPrice(cake.price_cents);
        priceFcfaEl.textContent = window.formatPriceFCFA(cake.price_cents, fcfaRate);
        pricingEl.style.display = 'block';
      } else {
        priceUsdEl.textContent = 'Price on request';
        priceFcfaEl.textContent = '';
        pricingEl.style.display = 'block';
      }
    }

    // WhatsApp order button
    if (orderEl && whatsappBtn) {
      var cakeName = cake.name || 'this cake';
      var waMessage = 'Hi Mnet! I\'d like to order the ' + cakeName + '.';
      var waURL = 'https://wa.me/' + (whatsappNumber || '') + '?text=' + encodeURIComponent(waMessage);
      whatsappBtn.href = waURL;
      orderEl.style.display = 'block';
    }

    // Share buttons
    setupShareButtons(cake);
    if (shareEl) shareEl.style.display = 'block';
  }

  function showNotFound() {
    if (articleEl) articleEl.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = 'flex';
    if (relatedSection) relatedSection.style.display = 'none';
  }

  function setupShareButtons(cake) {
    var pageURL = window.location.href;
    var title = cake.name || 'Check out this cake';

    if (shareFacebook) {
      shareFacebook.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageURL);
    }

    if (shareWhatsApp) {
      var waText = 'Check out this cake from Mnet\'s World: ' + title + ' - ' + pageURL;
      shareWhatsApp.href = 'https://wa.me/?text=' + encodeURIComponent(waText);
    }

    if (shareCopy) {
      shareCopy.addEventListener('click', function () {
        navigator.clipboard.writeText(pageURL).then(function () {
          shareCopy.classList.add('copied');
          var originalText = shareCopy.innerHTML;
          shareCopy.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="20 6 9 17 4 12"/>' +
            '</svg> Copied!';
          setTimeout(function () {
            shareCopy.classList.remove('copied');
            shareCopy.innerHTML = originalText;
          }, 2000);
        }).catch(function () {
          prompt('Copy this link:', pageURL);
        });
      });
    }
  }

  function renderRelatedCakes(cakes) {
    if (!relatedGrid || !relatedSection) return;

    if (!cakes || cakes.length === 0) {
      relatedSection.style.display = 'none';
      return;
    }

    var html = '';
    cakes.forEach(function (cake) {
      html += window.createCakeCard(cake);
    });
    relatedGrid.innerHTML = html;
    relatedSection.style.display = 'block';
  }

  /* ========================================================================
     KEYBOARD NAVIGATION
     ======================================================================== */

  document.addEventListener('keydown', function (e) {
    if (allImages.length <= 1) return;
    // Let a focused video player use arrow keys for seeking
    if (e.target && e.target.tagName === 'VIDEO') return;

    if (e.key === 'ArrowLeft') {
      var prevIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
      setMainImage(prevIndex, '');
      updateActiveThumbnail(prevIndex);
    } else if (e.key === 'ArrowRight') {
      var nextIndex = (currentImageIndex + 1) % allImages.length;
      setMainImage(nextIndex, '');
      updateActiveThumbnail(nextIndex);
    }
  });

  /* ========================================================================
     DATA FETCHING
     ======================================================================== */

  async function loadProduct(slug) {
    try {
      var data = await window.api('cakes/' + encodeURIComponent(slug));
      var cake = data.cake || data;
      var images = data.images || [];

      if (!cake || !cake.name) {
        showNotFound();
        return null;
      }

      renderProduct(cake, images);
      return cake;
    } catch (err) {
      console.warn('Could not fetch cake:', err.message);
      showNotFound();
      return null;
    }
  }

  async function loadRelatedCakes(categorySlug, excludeSlug) {
    if (!categorySlug) return;

    try {
      var path = 'cakes?category=' + encodeURIComponent(categorySlug) + '&limit=5';
      var data = await window.api(path);
      var cakes = data.cakes || data.data || data;

      if (Array.isArray(cakes)) {
        cakes = cakes.filter(function (c) {
          return c.slug !== excludeSlug;
        }).slice(0, 4);

        renderRelatedCakes(cakes);
      }
    } catch (err) {
      console.warn('Could not fetch related cakes:', err.message);
    }
  }

  async function loadSettings() {
    try {
      var data = await window.api('settings');
      var settings = data.settings || data;
      if (settings.whatsapp_number) {
        whatsappNumber = settings.whatsapp_number.replace(/[^0-9+]/g, '');
      }
      if (settings.fcfa_rate) {
        var rate = parseFloat(settings.fcfa_rate);
        if (!isNaN(rate) && rate > 0) fcfaRate = rate;
      }
    } catch (err) {
      console.warn('Could not fetch settings:', err.message);
    }
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', async function () {
    var slug = getSlugFromURL();

    if (!slug) {
      showNotFound();
      return;
    }

    // Load settings first (for pricing + WhatsApp)
    await loadSettings();

    var cake = await loadProduct(slug);

    if (cake) {
      loadRelatedCakes(cake.category_slug, slug);
    }
  });

})();
