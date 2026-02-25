/* ==========================================================================
   Mnet's World - Shop Page JavaScript
   Fetches categories and cakes from the API, renders product grid with
   category filtering, WhatsApp order buttons, and dual USD/FCFA pricing.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     STATE
     ======================================================================== */

  var currentCategory = '';
  var whatsappNumber  = '';
  var fcfaRate        = 655.957;
  var categories      = [];

  /* ========================================================================
     DOM REFERENCES
     ======================================================================== */

  var tabsContainer = document.getElementById('category-tabs');
  var gridContainer = document.getElementById('shop-grid');
  var emptyState    = document.getElementById('shop-empty');

  /* ========================================================================
     SVG ICONS
     ======================================================================== */

  var SVG_WHATSAPP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
  '</svg>';

  var SVG_CAKE = window.__SVG_CAKE || '';

  /* ========================================================================
     SKELETON LOADERS
     ======================================================================== */

  function showSkeletons() {
    if (!gridContainer) return;
    var html = '';
    for (var i = 0; i < 8; i++) {
      html +=
        '<div class="card card-cake shop-skeleton" style="pointer-events:none;">' +
          '<div class="skeleton skeleton--image"></div>' +
          '<div class="card__body">' +
            '<div class="skeleton skeleton--text" style="width:50%;"></div>' +
            '<div class="skeleton skeleton--title"></div>' +
            '<div class="skeleton skeleton--text" style="width:40%;"></div>' +
            '<div class="skeleton skeleton--text" style="width:70%; margin-top:var(--space-3);height:36px;"></div>' +
          '</div>' +
        '</div>';
    }
    gridContainer.innerHTML = html;
    if (emptyState) emptyState.style.display = 'none';
  }

  /* ========================================================================
     RENDER FUNCTIONS
     ======================================================================== */

  /**
   * Build a shop-specific cake card with WhatsApp button and FCFA price.
   */
  function createShopCakeCard(cake) {
    var imageHTML;
    if (cake.image_url) {
      imageHTML =
        '<div class="card__image">' +
          '<img src="' + escapeHTML(cake.image_url) + '" ' +
               'alt="' + escapeHTML(cake.name) + '" ' +
               'loading="lazy" />' +
        '</div>';
    } else {
      imageHTML =
        '<div class="card-cake__placeholder">' +
          '<span class="card-cake__placeholder-icon" aria-hidden="true">' +
            SVG_CAKE +
          '</span>' +
          '<span class="card-cake__placeholder-text">Mnet\'s World</span>' +
        '</div>';
    }

    var categoryHTML = cake.category_name
      ? '<span class="card-cake__category">' + escapeHTML(cake.category_name) + '</span>'
      : '';

    var priceBadge = cake.price_cents
      ? '<span class="card-cake__price-badge">' + window.formatPrice(cake.price_cents) + '</span>'
      : '';

    var pricesHTML =
      '<div class="shop-card__prices">' +
        (cake.price_cents
          ? '<span class="shop-card__price-usd">' + window.formatPrice(cake.price_cents) + '</span>'
          : '<span class="shop-card__price-usd">Price on request</span>') +
        (cake.price_cents
          ? '<span class="shop-card__price-fcfa">' + window.formatPriceFCFA(cake.price_cents, fcfaRate) + '</span>'
          : '') +
      '</div>';

    var cakeName = cake.name || 'this cake';
    var waMessage = 'Hi Mnet! I\'d like to order the ' + cakeName + '.';
    var waURL = 'https://wa.me/' + (whatsappNumber || '') + '?text=' + encodeURIComponent(waMessage);

    var whatsappBtn =
      '<div class="shop-card__order">' +
        '<a href="' + waURL + '" class="btn btn-whatsapp" target="_blank" rel="noopener noreferrer" aria-label="Order ' + escapeHTML(cake.name) + ' via WhatsApp">' +
          SVG_WHATSAPP +
          ' Order via WhatsApp' +
        '</a>' +
      '</div>';

    var detailLink = cake.slug ? '/shop/' + encodeURIComponent(cake.slug) : '/shop';

    return (
      '<div class="card card-cake">' +
        priceBadge +
        '<a href="' + detailLink + '" aria-label="View ' + escapeHTML(cake.name) + '">' +
          imageHTML +
        '</a>' +
        '<div class="card__body">' +
          categoryHTML +
          '<h3 class="card__title"><a href="' + detailLink + '">' + escapeHTML(cake.name) + '</a></h3>' +
          pricesHTML +
          whatsappBtn +
        '</div>' +
      '</div>'
    );
  }

  /**
   * Render cakes into the product grid.
   */
  function renderCakes(cakes) {
    if (!gridContainer) return;

    if (!cakes || cakes.length === 0) {
      gridContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    var html = '';
    cakes.forEach(function (cake) {
      html += createShopCakeCard(cake);
    });
    gridContainer.innerHTML = html;
  }

  /**
   * Render category tabs.
   */
  function renderTabs() {
    if (!tabsContainer) return;

    var html = '<button class="tab' + (currentCategory === '' ? ' active' : '') + '" data-category="" role="tab" aria-selected="' + (currentCategory === '' ? 'true' : 'false') + '">All</button>';

    categories.forEach(function (cat) {
      var slug = cat.slug || '';
      var name = cat.name || slug;
      var isActive = currentCategory === slug;
      html += '<button class="tab' + (isActive ? ' active' : '') + '" data-category="' + escapeHTML(slug) + '" role="tab" aria-selected="' + (isActive ? 'true' : 'false') + '">' + escapeHTML(name) + '</button>';
    });

    tabsContainer.innerHTML = html;

    // Attach click handlers
    tabsContainer.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var cat = this.getAttribute('data-category') || '';
        if (cat !== currentCategory) {
          currentCategory = cat;
          updateURLParam(cat);
          renderTabs();
          loadCakes();
        }
      });
    });
  }

  /* ========================================================================
     URL MANAGEMENT
     ======================================================================== */

  function getURLCategory() {
    var params = new URLSearchParams(window.location.search);
    return params.get('category') || '';
  }

  function updateURLParam(category) {
    var url = new URL(window.location);
    if (category) {
      url.searchParams.set('category', category);
    } else {
      url.searchParams.delete('category');
    }
    window.history.replaceState({}, '', url);
  }

  /* ========================================================================
     ESCAPE HELPER (local copy since main.js escapeHTML is scoped)
     ======================================================================== */

  function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ========================================================================
     DATA FETCHING
     ======================================================================== */

  /**
   * Fetch cakes from API with optional category filter.
   */
  async function loadCakes() {
    showSkeletons();

    try {
      var path = 'cakes?featured=0&limit=50';
      if (currentCategory) {
        path += '&category=' + encodeURIComponent(currentCategory);
      }
      var data = await window.api(path);
      var cakes = data.cakes || data.data || data;
      if (Array.isArray(cakes)) {
        renderCakes(cakes);
      } else {
        renderCakes([]);
      }
    } catch (err) {
      console.warn('Could not fetch cakes:', err.message);
      renderCakes([]);
    }
  }

  /**
   * Fetch categories from API.
   */
  async function loadCategories() {
    try {
      var data = await window.api('categories');
      var cats = data.categories || data.data || data;
      if (Array.isArray(cats)) {
        categories = cats;
      }
    } catch (err) {
      console.warn('Could not fetch categories:', err.message);
      categories = [];
    }
    renderTabs();
  }

  /**
   * Fetch settings for WhatsApp number and FCFA rate.
   */
  async function loadSettings() {
    try {
      var data = await window.api('settings');
      var settings = data.settings || data;
      if (settings.whatsapp_number) {
        whatsappNumber = settings.whatsapp_number.replace(/[^0-9+]/g, '');
      }
      if (settings.fcfa_rate) {
        var rate = parseFloat(settings.fcfa_rate);
        if (!isNaN(rate) && rate > 0) {
          fcfaRate = rate;
        }
      }
    } catch (err) {
      console.warn('Could not fetch settings, using defaults:', err.message);
    }
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', async function () {
    // Read category from URL
    currentCategory = getURLCategory();

    // Show skeletons immediately
    showSkeletons();

    // Load settings first (needed for prices/WhatsApp), then cakes and categories
    await loadSettings();

    // Load categories and cakes in parallel
    await Promise.all([
      loadCategories(),
      loadCakes()
    ]);
  });

})();
