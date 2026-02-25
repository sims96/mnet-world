/* ==========================================================================
   Mnet's World - Home Page JavaScript
   Fetches featured cakes, blog posts, and settings from the API.
   Falls back gracefully to placeholder content when the API is unavailable.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     PLACEHOLDER / FALLBACK DATA
     ======================================================================== */

  var placeholderCakes = [
    { id: 1, name: 'Raspberry Dream',       price_cents: 4500, category_name: 'Custom Cakes', slug: 'raspberry-dream',       image_url: '' },
    { id: 2, name: 'Vanilla Bliss',         price_cents: 3800, category_name: 'Custom Cakes', slug: 'vanilla-bliss',         image_url: '' },
    { id: 3, name: 'Chocolate Indulgence',  price_cents: 5200, category_name: 'Custom Cakes', slug: 'chocolate-indulgence',  image_url: '' },
    { id: 4, name: 'Strawberry Macarons',   price_cents: 2400, category_name: 'Macarons',     slug: 'strawberry-macarons',   image_url: '' },
    { id: 5, name: 'Red Velvet Cupcakes',   price_cents: 1800, category_name: 'Cupcakes',     slug: 'red-velvet-cupcakes',   image_url: '' },
    { id: 6, name: 'Lemon Zest Cake',       price_cents: 4000, category_name: 'Custom Cakes', slug: 'lemon-zest-cake',       image_url: '' }
  ];

  var placeholderPosts = [
    {
      id: 1,
      title: '5 Tips for the Perfect Buttercream',
      excerpt: 'Learn the secrets to silky, smooth buttercream frosting that will elevate every cake you make.',
      category: 'Baking Tips',
      published_at: '2026-02-10T10:00:00Z',
      slug: '5-tips-perfect-buttercream',
      image_url: ''
    },
    {
      id: 2,
      title: 'My Journey from Cameroon to the USA',
      excerpt: 'A personal story about following my passion for baking across continents and building a community.',
      category: 'Lifestyle',
      published_at: '2026-01-28T14:00:00Z',
      slug: 'journey-cameroon-usa',
      image_url: ''
    },
    {
      id: 3,
      title: 'Giving Back: Our Humanitarian Mission',
      excerpt: 'How Mnet\'s World is making a difference through food donations and community support in Cameroon.',
      category: 'Humanitarian',
      published_at: '2026-01-15T09:00:00Z',
      slug: 'giving-back-humanitarian-mission',
      image_url: ''
    }
  ];

  /* ========================================================================
     DOM REFERENCES
     ======================================================================== */

  var cakesContainer = document.getElementById('featured-cakes-grid');
  var blogContainer  = document.getElementById('blog-grid');
  var heroTitle      = document.getElementById('hero-title');
  var heroSubtitle   = document.getElementById('hero-subtitle');
  var aboutText      = document.getElementById('about-text');

  /* ========================================================================
     RENDER FUNCTIONS
     ======================================================================== */

  /**
   * Render cake cards into the featured cakes container.
   */
  function renderCakes(cakes) {
    if (!cakesContainer) return;

    if (!cakes || cakes.length === 0) {
      cakesContainer.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state__icon" aria-hidden="true">' + (window.__SVG_CAKE || '') + '</div>' +
          '<h3 class="empty-state__title">Coming Soon</h3>' +
          '<p class="empty-state__text">Our delicious cakes are being prepared. Check back soon!</p>' +
        '</div>';
      return;
    }

    var html = '';
    cakes.forEach(function (cake) {
      html += window.createCakeCard(cake);
    });
    cakesContainer.innerHTML = html;
  }

  /**
   * Render blog post cards into the latest blog container.
   */
  function renderBlogPosts(posts) {
    if (!blogContainer) return;

    if (!posts || posts.length === 0) {
      blogContainer.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state__icon" aria-hidden="true">' + (window.__SVG_BLOG || '') + '</div>' +
          '<h3 class="empty-state__title">No Posts Yet</h3>' +
          '<p class="empty-state__text">Blog posts are on the way. Stay tuned!</p>' +
        '</div>';
      return;
    }

    var html = '';
    posts.forEach(function (post) {
      html += window.createBlogCard(post);
    });
    blogContainer.innerHTML = html;
  }

  /**
   * Show skeleton loading placeholders for cakes.
   */
  function showCakeSkeletons() {
    if (!cakesContainer) return;
    var html = '';
    for (var i = 0; i < 4; i++) {
      html +=
        '<div class="card card-cake" style="pointer-events:none;">' +
          '<div class="skeleton skeleton--image"></div>' +
          '<div class="card__body">' +
            '<div class="skeleton skeleton--title"></div>' +
            '<div class="skeleton skeleton--text" style="width:40%;"></div>' +
          '</div>' +
        '</div>';
    }
    cakesContainer.innerHTML = html;
  }

  /**
   * Show skeleton loading placeholders for blog posts.
   */
  function showBlogSkeletons() {
    if (!blogContainer) return;
    var html = '';
    for (var i = 0; i < 3; i++) {
      html +=
        '<div class="card card-blog" style="pointer-events:none;">' +
          '<div class="skeleton" style="aspect-ratio:16/10;width:100%;"></div>' +
          '<div class="card__body">' +
            '<div class="skeleton skeleton--text" style="width:30%;"></div>' +
            '<div class="skeleton skeleton--title"></div>' +
            '<div class="skeleton skeleton--text"></div>' +
            '<div class="skeleton skeleton--text" style="width:60%;"></div>' +
          '</div>' +
        '</div>';
    }
    blogContainer.innerHTML = html;
  }

  /* ========================================================================
     DATA FETCHING
     ======================================================================== */

  /**
   * Fetch featured cakes from the API.
   */
  async function loadFeaturedCakes() {
    showCakeSkeletons();

    try {
      var data = await window.api('cakes?featured=1&limit=6');
      var cakes = data.cakes || data.data || data;
      if (Array.isArray(cakes) && cakes.length > 0) {
        renderCakes(cakes);
      } else {
        renderCakes(placeholderCakes);
      }
    } catch (err) {
      console.warn('Could not fetch featured cakes, using placeholders:', err.message);
      renderCakes(placeholderCakes);
    }
  }

  /**
   * Fetch latest blog posts from the API.
   */
  async function loadLatestBlog() {
    showBlogSkeletons();

    try {
      var data = await window.api('blog?limit=3');
      var posts = data.posts || data.data || data;
      if (Array.isArray(posts) && posts.length > 0) {
        renderBlogPosts(posts);
      } else {
        renderBlogPosts(placeholderPosts);
      }
    } catch (err) {
      console.warn('Could not fetch blog posts, using placeholders:', err.message);
      renderBlogPosts(placeholderPosts);
    }
  }

  /**
   * Fetch site settings for hero and about content.
   */
  async function loadSettings() {
    try {
      var data = await window.api('settings');
      var settings = data.settings || data;

      if (settings.hero_title && heroTitle) {
        heroTitle.innerHTML = settings.hero_title;
      }
      if (settings.hero_subtitle && heroSubtitle) {
        heroSubtitle.textContent = settings.hero_subtitle;
      }
      if (settings.about_text && aboutText) {
        aboutText.textContent = settings.about_text;
      }
    } catch (err) {
      // Settings are optional; fallback to hardcoded HTML content
      console.warn('Could not fetch settings, using defaults:', err.message);
    }
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    loadFeaturedCakes();
    loadLatestBlog();
    loadSettings();
  });

})();
