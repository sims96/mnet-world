/* ==========================================================================
   Mnet's World - Shared JavaScript
   Navigation, utilities, card builders, API helpers.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     MOBILE NAVIGATION
     ======================================================================== */

  const hamburger = document.querySelector('.nav__hamburger');
  const mobileNav = document.querySelector('.nav__mobile');
  const overlay   = document.querySelector('.nav__overlay');
  const mobileLinks = document.querySelectorAll('.nav__mobile-link');

  function openNav() {
    hamburger?.classList.add('active');
    mobileNav?.classList.add('active');
    overlay?.classList.add('active');
    document.body.classList.add('nav-open');
  }

  function closeNav() {
    hamburger?.classList.remove('active');
    mobileNav?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.classList.remove('nav-open');
  }

  function toggleNav() {
    const isOpen = mobileNav?.classList.contains('active');
    isOpen ? closeNav() : openNav();
  }

  hamburger?.addEventListener('click', toggleNav);
  overlay?.addEventListener('click', closeNav);

  // Close when clicking a mobile link
  mobileLinks.forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  /* ========================================================================
     NAV SCROLL SHADOW
     ======================================================================== */

  const nav = document.querySelector('.nav');
  let lastScroll = 0;

  function handleNavScroll() {
    var scrollY = window.scrollY || window.pageYOffset;
    if (scrollY > 10) {
      nav?.classList.add('nav--scrolled');
    } else {
      nav?.classList.remove('nav--scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });

  /* ========================================================================
     ACTIVE NAV LINK
     ======================================================================== */

  function setActiveNavLink() {
    var path = window.location.pathname;

    // Normalize: remove trailing slash
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Map paths to nav link text
    var linkMap = {
      '/':              'HOME',
      '/index':         'HOME',
      '/shop':          'CAKES',
      '/blog':          'BLOG',
      '/humanitarian':  'HUMANITARIAN',
      '/about':         'ABOUT',
      '/contact':       'CONTACT'
    };

    var activeText = linkMap[path] || '';

    // Handle subpaths: /shop/{slug} → CAKES, /blog/{slug} → BLOG
    if (!activeText && path.indexOf('/shop/') === 0) activeText = 'CAKES';
    if (!activeText && path.indexOf('/blog/') === 0) activeText = 'BLOG';

    // Desktop links
    document.querySelectorAll('.nav__link').forEach(function (link) {
      link.classList.remove('active');
      if (link.textContent.trim().toUpperCase() === activeText) {
        link.classList.add('active');
      }
    });

    // Mobile links
    document.querySelectorAll('.nav__mobile-link').forEach(function (link) {
      link.classList.remove('active');
      if (link.textContent.trim().toUpperCase() === activeText) {
        link.classList.add('active');
      }
    });
  }

  setActiveNavLink();

  /* ========================================================================
     SCROLL TO TOP
     ======================================================================== */

  var scrollTopBtn = document.querySelector('.scroll-top');

  function handleScrollTop() {
    var scrollY = window.scrollY || window.pageYOffset;
    if (scrollY > 400) {
      scrollTopBtn?.classList.add('visible');
    } else {
      scrollTopBtn?.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', handleScrollTop, { passive: true });

  scrollTopBtn?.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /**
   * Smooth scroll to top of the page.
   */
  window.scrollToTop = function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ========================================================================
     UTILITY FUNCTIONS
     ======================================================================== */

  /**
   * Format a price in cents to USD string.
   * @param {number} cents - Price in cents (e.g., 4500 = $45.00)
   * @returns {string} Formatted price like "$45.00"
   */
  window.formatPrice = function formatPrice(cents) {
    if (cents == null || isNaN(cents)) return '$0.00';
    var dollars = (Number(cents) / 100).toFixed(2);
    return '$' + dollars;
  };

  /**
   * Convert a price in USD cents to FCFA and format.
   * @param {number} cents - Price in USD cents
   * @param {number} [rate=655.957] - Exchange rate (1 USD = rate FCFA)
   * @returns {string} Formatted price like "29,518 FCFA"
   */
  window.formatPriceFCFA = function formatPriceFCFA(cents, rate) {
    if (cents == null || isNaN(cents)) return '0 FCFA';
    var r = rate || 655.957;
    var usd = Number(cents) / 100;
    var fcfa = Math.round(usd * r);
    return fcfa.toLocaleString('en-US') + ' FCFA';
  };

  /**
   * Format an ISO date string to a readable date.
   * @param {string} isoString - ISO 8601 date string
   * @returns {string} Formatted date like "Jan 15, 2026"
   */
  window.formatDate = function formatDate(isoString) {
    if (!isoString) return '';
    try {
      var d = new Date(isoString);
      var months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    } catch (e) {
      return isoString;
    }
  };

  /**
   * Create an HTML string for a cake product card.
   * @param {Object} cake - Cake object
   * @param {number} cake.id
   * @param {string} cake.name
   * @param {number} cake.price_cents
   * @param {string} [cake.image_url]
   * @param {string} [cake.category_name]
   * @param {string} [cake.slug]
   * @returns {string} HTML string
   */
  window.createCakeCard = function createCakeCard(cake) {
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

    var priceHTML = cake.price_cents
      ? '<span class="card-cake__price">' + formatPrice(cake.price_cents) + '</span>'
      : '';

    var priceBadge = cake.price_cents
      ? '<span class="card-cake__price-badge">' + formatPrice(cake.price_cents) + '</span>'
      : '';

    var link = cake.slug ? '/shop/' + encodeURIComponent(cake.slug) : '/shop';

    return (
      '<a href="' + link + '" class="card card-cake" aria-label="View ' + escapeHTML(cake.name) + '">' +
        priceBadge +
        imageHTML +
        '<div class="card__body">' +
          categoryHTML +
          '<h3 class="card__title">' + escapeHTML(cake.name) + '</h3>' +
          priceHTML +
        '</div>' +
      '</a>'
    );
  };

  /**
   * Create an HTML string for a blog post card.
   * @param {Object} post - Blog post object
   * @param {number} post.id
   * @param {string} post.title
   * @param {string} [post.excerpt]
   * @param {string} [post.image_url]
   * @param {string} [post.category]
   * @param {string} [post.published_at]
   * @param {string} [post.slug]
   * @returns {string} HTML string
   */
  window.createBlogCard = function createBlogCard(post) {
    var imageHTML;
    var imgUrl = post.cover_image_url || post.image_url;
    if (imgUrl) {
      imageHTML =
        '<div class="card__image">' +
          '<img src="' + escapeHTML(imgUrl) + '" ' +
               'alt="' + escapeHTML(post.title) + '" ' +
               'loading="lazy" />' +
        '</div>';
    } else {
      imageHTML =
        '<div class="card-blog__placeholder">' +
          '<span class="card-blog__placeholder-icon" aria-hidden="true">' +
            SVG_BLOG +
          '</span>' +
        '</div>';
    }

    var categoryHTML = post.category
      ? '<span class="card-blog__category">' + escapeHTML(post.category) + '</span>'
      : '';

    var dateHTML = post.published_at
      ? '<span class="card-blog__date">' + formatDate(post.published_at) + '</span>'
      : '';

    var excerptHTML = post.excerpt
      ? '<p class="card__text">' + escapeHTML(post.excerpt) + '</p>'
      : '';

    var link = post.slug ? '/blog/' + encodeURIComponent(post.slug) : '/blog';

    return (
      '<article class="card card-blog">' +
        '<a href="' + link + '" aria-label="Read: ' + escapeHTML(post.title) + '">' +
          imageHTML +
        '</a>' +
        '<div class="card__body">' +
          '<div class="card-blog__meta">' +
            categoryHTML +
            dateHTML +
          '</div>' +
          '<h3 class="card__title"><a href="' + link + '">' + escapeHTML(post.title) + '</a></h3>' +
          excerptHTML +
          '<a href="' + link + '" class="card-blog__link">Read More <span class="arrow">&rarr;</span></a>' +
        '</div>' +
      '</article>'
    );
  };

  /* ========================================================================
     API HELPER
     ======================================================================== */

  /**
   * Fetch wrapper for public API calls.
   * @param {string} path - API path (e.g., "cakes?featured=1&limit=6")
   * @returns {Promise<any>} Parsed JSON response
   */
  window.api = async function api(path) {
    var url = '/api/public/' + path;
    var resp = await fetch(url);
    if (!resp.ok) {
      throw new Error('API error: ' + resp.status + ' ' + resp.statusText);
    }
    return resp.json();
  };

  /* ========================================================================
     INTERNAL HELPERS
     ======================================================================== */

  /**
   * Escape HTML special characters to prevent XSS.
   */
  function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ── Inline SVG icons for placeholders ────────────────────────────────── */

  var SVG_CAKE = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>' +
    '<path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/>' +
    '<path d="M2 21h20"/>' +
    '<path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/>' +
    '<path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>' +
  '</svg>';

  var SVG_BLOG = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' +
    '<line x1="8" y1="7" x2="16" y2="7"/>' +
    '<line x1="8" y1="11" x2="13" y2="11"/>' +
  '</svg>';

  // Make SVG icons available globally for other scripts
  window.__SVG_CAKE = SVG_CAKE;
  window.__SVG_BLOG = SVG_BLOG;

})();
